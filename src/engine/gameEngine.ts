import { movesFor } from '../combat/roster.js';
import { activate, tickEffects, heel, shotTouches, strikeBox } from '../combat/effects.js';
import { sound } from '../audio/soundEngine';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import {
  CampaignState,
  GameConfig,
  GameMode,
  HudSnapshot,
  MatchReplayData,
  MatchSummary,
  PlatformDef,
  PlayerAction,
  PresidentData,
  ReplayKeyframe,
  StageDef,
} from '../types/game';
import {
  CrowdMood,
  CrowdParticle,
  CrowdState,
  LegacyFighterGeometry,
  PixelRenderer,
  RenderFighterState,
  RenderItem,
  RenderParticle,
  RenderProjectile,
  RenderUltEffect,
  WorldRenderContext,
} from './pixelRenderer';

const W = 1440;
const H = 810;
const BZ = { l: -180, r: W + 180, t: -260, b: H + 180 };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ov = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

interface InputFrame {
  left: boolean;
  right: boolean;
  jump: boolean;
  down: boolean;
  light: boolean;
  heavy: boolean;
  dash: boolean;
  ult: boolean;
  reload: boolean;
}

const EMPTY_INPUT: InputFrame = {
  left: false,
  right: false,
  jump: false,
  down: false,
  light: false,
  heavy: false,
  dash: false,
  ult: false,
  reload: false,
};

const ACTIONS_ORDER: PlayerAction[] = ['left', 'right', 'jump', 'down', 'light', 'heavy', 'dash', 'ult', 'reload'];

function inputToActions(inp: InputFrame): PlayerAction[] {
  const out: PlayerAction[] = [];
  for (const act of ACTIONS_ORDER) {
    if (inp[act]) out.push(act);
  }
  return out;
}

function actionsToInput(acts: PlayerAction[]): InputFrame {
  const inp: InputFrame = { ...EMPTY_INPUT };
  for (const act of acts) {
    inp[act] = true;
  }
  return inp;
}

interface ProjectileInternal extends RenderProjectile {
  owner: FighterSim | null;
  d: { dmg: number; bk: number; ks: number; ang: number; heavy?: boolean; hold?: number };
  hit: number;
  done?: FighterSim[];
  bounces?: number;
}

interface ItemInternal extends RenderItem {
  vy: number;
}

class FighterSim implements RenderFighterState {
  pi: number;
  d: PresidentData;
  S: PresidentData['stats'];
  ai: boolean;
  moves: ReturnType<typeof movesFor>;
  field: {kind:string;x:number;y:number;w:number;h:number;life:number;floor?:PlatformDef} | null = null;
  heelBox?: {x:number;y:number;w:number;h:number};
  rage = 0;
  speedTime = 0;
  trainingDummy = false;
  dif = 1;
  boss = false;

  w = 38;
  h = 92;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  face = 1;
  pct = 0;
  stocks = 3;
  maxStocks = 3;
  vote = 0;
  inv = 0;
  stun = 0;
  dashT = 0;
  dashCD = 0;
  pickupT = 0;
  wpn = 0;
  wk: string | null = null;
  ammo = 0;
  maxAmmo = 0;
  reloadT = 0;
  reloadDur = 45;
  shootRecoil = 0;
  landT = 0;
  crouch = false;
  gunCD = 0;
  airJ = 2;
  dropT = 0;
  jumpTick = -30;
  koVisual?: { x: number; tick: number };
  dead = 0;
  wall = 0;
  on = false;
  pl: PlatformDef | null = null;
  combo = 0;
  maxCombo = 0;
  jabStep = 0;
  cT = 0;
  cMax = 110;
  maxStun = 1;
  lastAttacker: FighterSim | null = null;
  floatT = 115;
  floatMax = 115;
  floating = false;
  fastFall = false;
  dashDanceT = 0;
  upSpecUsed = false;
  moveKind = '';
  hitFlash = 0;
  squashX = 1;
  squashY = 1;
  winning = false;
  winT = 0;
  pend: { vx: number; vy: number } | null = null;
  afterimages: Array<{ x: number; y: number; face: number; alpha: number }> = [];

  atk: {
    spec: {
      k: string;
      individual?: boolean; downSpecial?: boolean; effect?: string; pierce?: boolean;
      moveKind?: string;
      dur: number;
      heavy?: boolean;
      hop?: { t: number; vy: number };
      ph: Array<{
        a: [number, number];
        hb?: { fx: number; y: number; w: number; h: number };
        dmg?: number;
        bk?: number;
        ks?: number;
        ang?: number;
        mv?: number;
        rear?: boolean;
        every?: number;
        armor?: boolean;
        fx?: string;
      }>;
      sp: Array<{
        t: number;
        p: {
          fx: number;
          y: number;
          w: number;
          h: number;
          vx: number;
          vy?: number;
          bounces?: number;
          life: number;
          kind: string;
          dmg: number;
          bk: number;
          ks: number;
          ang: number;
          hold?: number;
          back?: boolean;
        };
      }>;
    };
    t: number;
    hits: Record<string, boolean>;
    armor: boolean;
    ar: number;
    whiffChecked?: boolean;
  } | null = null;

  prevIn: InputFrame = { ...EMPTY_INPUT };
  curIn: InputFrame = { ...EMPTY_INPUT };
  justIn: InputFrame = { ...EMPTY_INPUT };

  damageDealt = 0;
  kosDelivered = 0;
  perfectDodges = 0;

  constructor(pi: number, d: PresidentData, isAI: boolean, matchCfg: GameConfig['match']) {
    this.moves = movesFor(d);
    this.pi = pi;
    this.d = d;
    this.S = { ...d.stats };
    this.ai = isAI;
    this.stocks = matchCfg.stocks;
    this.maxStocks = matchCfg.stocks;
    this.spawn(true, matchCfg, 400, 590, 640);
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get isFloatZoner() {
    return this.d.signatureType === 'pulse' || this.d.anatomy.weaponType === 'staff';
  }

  get isAgileSwordsman() {
    return this.d.signatureType === 'fencing' || this.d.signatureType === 'uppercut' || this.d.anatomy.weaponType === 'saber';
  }

  spawn(first: boolean, matchCfg: GameConfig['match'], mainX = 400, mainY = 590, mainW = 640) {
    this.x = first ? (this.pi ? mainX + mainW * 0.74 : mainX + mainW * 0.21) : W / 2 - this.w / 2;
    this.y = first ? mainY - this.h : -110;
    this.vx = 0;
    this.vy = 0;
    this.face = this.pi ? -1 : 1;
    this.field = null; this.rage = 0; this.speedTime = 0;
    this.pct = 0;
    this.inv = first ? 0 : 120;
    this.stun = 0;
    this.maxStun = 1;
    this.lastAttacker = null;
    this.atk = null;
    this.dashT = 0;
    this.dashCD = 0;
    this.dashDanceT = 0;
    this.wpn = 0;
    this.wk = null;
    this.ammo = 0;
    this.maxAmmo = 0;
    this.reloadT = 0;
    this.pickupT = 0;
    this.shootRecoil = 0;
    this.landT = 0;
    this.crouch = false;
    this.gunCD = 0;
    this.airJ = 2;
    this.floatT = this.floatMax;
    this.floating = false;
    this.fastFall = false;
    this.upSpecUsed = false;
    this.moveKind = '';
    this.dropT = 0;
    this.koVisual = undefined;
    this.jumpTick = -30;
    this.dead = 0;
    this.wall = 0;
    this.on = first;
    this.pl = null;
    this.combo = 0;
    this.jabStep = 0;
    this.cT = 0;
    this.pend = null;
    this.squashX = 1;
    this.squashY = 1;
    this.winning = false;
    this.winT = 0;
    if (first && matchCfg.startFullVote) this.vote = 100;
    else if (this.dif > 0) this.vote = Math.min(100, this.vote + 15);
  }

  rect(hb: { fx: number; y: number; w: number; h: number }, boost: boolean) {
    const k = boost ? 1.35 : 1;
    const w = hb.w * k;
    const fx = hb.fx > 0 ? hb.fx * k : hb.fx;
    const x = this.face > 0 ? this.cx + fx : this.cx - fx - w;
    return { x, y: this.y + this.h + hb.y - (boost ? hb.h * 0.2 : 0), w, h: hb.h * k };
  }
}

export class GameEngine {
  private collision = new LegacyFighterGeometry();
  private renderer = new PixelRenderer();
  private keys: Record<string, boolean> = {};
  private remoteKeys: Partial<Record<PlayerAction, boolean>> = {};
  private touchKeys: Partial<Record<PlayerAction, boolean>> = {};
  private gpState = [false, false];

  config: GameConfig;
  roster: PresidentData[] = [...PRESIDENTS_DATA];
  stageIdx = 0;
  stage: StageDef = STAGES_DATA[0];
  main = { ...STAGES_DATA[0].main };
  plats: PlatformDef[] = [];
  gravityFactor = 1;
  hazardCycle = 1200;

  T = 0;
  freeze = 0;
  slowMo = 0;
  shake = 0;
  fighters: FighterSim[] = [];
  projectiles: ProjectileInternal[] = [];
  items: ItemInternal[] = [];
  particles: RenderParticle[] = [];
  ults: RenderUltEffect[] = [];
  cine: { t: number; f: FighterSim; o: FighterSim } | null = null;
  telegraph: { f: FighterSim; o: FighterSim; t: number; zones: Array<{ x: number; y: number; w: number; h: number }> } | null = null;
  winner: FighterSim | null = null;
  endT = 0;

  bannerMsg = { t: '', l: 0, m: 1 };
  floatTexts: Array<{ t: string; x: number; y: number; l: number; m: number }> = [];
  strikes: Array<{x:number;y:number;w:number;h:number;color:string;weapon:string;direction:number}> = [];
  debugHitboxes: Array<{ x: number; y: number; w: number; h: number; kind: string }> = [];

  mode: GameMode = 'versus';
  campaign: CampaignState | null = null;

  isReplaying = false;
  replayEnded = false;
  replayTotalFrames = 0;
  private replayData: MatchReplayData | null = null;
  private replayCursor = 0;
  private replayCurrentP1: InputFrame = { ...EMPTY_INPUT };
  private replayCurrentP2: InputFrame = { ...EMPTY_INPUT };
  private matchCfgOverride: GameConfig['match'] | null = null;

  private rngState = 1337;
  private visRngState = 7331;
  crowd: CrowdState = {
    excitement: 0.12,
    cheerTimer: 0,
    mood: 'calm',
    accentColor: '#ffcc33',
    accentHighlight: '#fff3a0',
    seed: 1337,
  };
  crowdParticles: CrowdParticle[] = [];
  private recordedKeyframes: ReplayKeyframe[] = [];
  private lastRecP1Key = '';
  private lastRecP2Key = '';
  private currentMatchMeta: {
    seed: number;
    stageIdx: number;
    vsAI: boolean;
    p1Id: string;
    p2Id: string;
    campaignRound?: number;
    matchConfig: GameConfig['match'];
  } | null = null;

  private onMatchEnd?: (summary: MatchSummary) => void;
  private onPauseToggle?: () => void;
  private onReplaySaved?: (replay: MatchReplayData) => void;
  private onReplayEnd?: () => void;

  constructor(cfg: GameConfig) {
    this.config = cfg;
    this.setStage(0);
  }

  private get activeMatchCfg(): GameConfig['match'] {
    return this.matchCfgOverride ?? this.config.match;
  }

  private rand(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private vRand(): number {
    this.visRngState = (this.visRngState + 0x6d2b79f5) | 0;
    let t = Math.imul(this.visRngState ^ (this.visRngState >>> 15), 1 | this.visRngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  setCallbacks(cbs: {
    onMatchEnd?: (s: MatchSummary) => void;
    onPauseToggle?: () => void;
    onReplaySaved?: (replay: MatchReplayData) => void;
    onReplayEnd?: () => void;
  }) {
    this.onMatchEnd = cbs.onMatchEnd;
    this.onPauseToggle = cbs.onPauseToggle;
    this.onReplaySaved = cbs.onReplaySaved;
    this.onReplayEnd = cbs.onReplayEnd;
  }

  updateConfig(cfg: GameConfig) {
    this.config = cfg;
    sound.applyConfig(cfg.audio);
  }

  setRoster(roster: PresidentData[]) {
    this.roster = roster.length > 0 ? roster : [...PRESIDENTS_DATA];
  }

  handleKeyDown(code: string, repeat: boolean) {
    this.keys[code] = true;
    sound.init();
    if (!repeat && (code === 'Escape' || code === 'KeyP')) {
      this.onPauseToggle?.();
    }
  }

  handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  clearAllInputs() {
    this.keys = {};
    this.touchKeys = {};
    this.remoteKeys = {};
  }

  setRemoteActions(actions: PlayerAction[]) {
    for (const action of ACTIONS_ORDER) this.remoteKeys[action] = actions.includes(action);
  }

  setTouchAction(action: PlayerAction, active: boolean) {
    this.touchKeys[action] = active;
  }

  setStage(idx: number) {
    const safeIdx = ((idx % STAGES_DATA.length) + STAGES_DATA.length) % STAGES_DATA.length;
    this.stageIdx = safeIdx;
    this.stage = STAGES_DATA[safeIdx];
    this.main = { ...this.stage.main };
    this.plats = this.stage.plats.map((p) => ({ ...p, by: p.y }));
  }

  switchStageLive(idx: number) {
    this.setStage(idx);
    this.crowd.accentColor = this.stage.palette.platformTrim;
    for (const f of this.fighters) {
      f.field=null;
      if (f.dead > 0) continue;
      if (f.pl) {
        f.pl = null;
        f.on = false;
      }
      if (f.x + f.w > this.main.x && f.x < this.main.x + this.main.w && f.y + f.h > this.main.y) {
        f.y = this.main.y - f.h;
        f.vy = 0;
        f.on = true;
      }
    }
    this.burst(W / 2, this.main.y - 60, this.stage.palette.platformTrim, 16, 7, 26, 'diamond');
    this.triggerCrowdReaction('hype', W / 2, 18, this.stage.palette.platformTrim, '#ffffff', 42);
    this.popMsg(`${this.stage.name.toUpperCase()} · ${this.stage.country.toUpperCase()}`, 68);
    sound.tone(660, 0.16, 'triangle', 180, 0.06);
  }

  startAttractScene() {
    this.strikes = [];
    this.isReplaying = false;
    this.replayEnded = false;
    this.replayData = null;
    this.matchCfgOverride = null;
    this.setStage(0);
    const hero1 = PRESIDENTS_DATA.find((p) => p.id === 'bolivar') || PRESIDENTS_DATA[0];
    const hero2 = PRESIDENTS_DATA.find((p) => p.id === 'robinson') || PRESIDENTS_DATA[1];
    this.fighters = [
      new FighterSim(0, hero1, true, this.activeMatchCfg),
      new FighterSim(1, hero2, true, this.activeMatchCfg),
    ];
    this.fighters[0].dif = 1;
    this.fighters[1].dif = 1;
    this.projectiles = [];
    this.items = [];
    this.particles = [];
    this.crowdParticles = [];
    this.crowd = {
      excitement: 0.14,
      cheerTimer: 0,
      mood: 'calm',
      accentColor: this.stage.palette.platformTrim,
      accentHighlight: '#fff3a0',
      seed: 1337,
    };
    this.ults = [];
    this.cine = null;
    this.telegraph = null;
    this.winner = null;
    this.T = 0;
  }

  startMatch(p1Idx: number, p2Idx: number, stageIdx: number, vsAI: boolean, mode: GameMode, campaignRound?: number) {
    this.strikes = [];
    this.isReplaying = false;
    this.replayEnded = false;
    this.replayData = null;
    this.matchCfgOverride = null;
    this.mode = mode;

    const seed = (Math.floor(Math.random() * 0x7fffffff) || 1) >>> 0;
    this.rngState = seed;
    this.visRngState = (seed ^ 0x9e3779b9) >>> 0;

    const chosenStage = stageIdx >= STAGES_DATA.length ? Math.floor(this.rand() * STAGES_DATA.length) : stageIdx;
    this.setStage(chosenStage);

    const hzMap = { off: 9999999, normal: 1200, frenetic: 620 };
    this.hazardCycle = campaignRound === 6 ? 600 : hzMap[this.activeMatchCfg.hazardFrequency];

    const f1Data = this.roster[p1Idx] || this.roster[0];
    const f2Data = this.roster[p2Idx] || this.roster[1] || this.roster[0];
    const f1 = new FighterSim(0, f1Data, false, this.activeMatchCfg);
    const f2 = new FighterSim(1, f2Data, mode === 'training' ? false : vsAI, this.activeMatchCfg);
    f2.trainingDummy = mode === 'training';
    if (mode === 'training') {
      f1.stocks = 99;
      f2.stocks = 99;
      f1.maxStocks = 99;
      f2.maxStocks = 99;
    }

    if (campaignRound !== undefined) {
      const boss = campaignRound === 6;
      f2.dif = boss ? 3 : campaignRound >= 3 ? 2 : 1;
      if (boss) {
        f2.boss = true;
        f2.S = { ...f2.S, weight: f2.S.weight * 1.18 };
      }
    } else {
      f2.dif = this.activeMatchCfg.aiDifficulty;
    }

    this.strikes = [];
    this.fighters = [f1, f2];
    this.projectiles = [];
    this.items = [];
    this.particles = [];
    this.crowdParticles = [];
    this.crowd = {
      excitement: 0.12,
      cheerTimer: 0,
      mood: 'calm',
      accentColor: this.stage.palette.platformTrim,
      accentHighlight: '#fff3a0',
      seed,
    };
    this.ults = [];
    this.cine = null;
    this.telegraph = null;
    this.winner = null;
    this.endT = 0;
    this.T = 0;
    this.freeze = 0;
    this.slowMo = 0;
    this.shake = 0;
    this.floatTexts = [];
    this.bannerMsg = { t: '', l: 0, m: 1 };
    this.recordedKeyframes = [];
    this.lastRecP1Key = '';
    this.lastRecP2Key = '';
    this.currentMatchMeta = {
      seed,
      stageIdx: chosenStage,
      vsAI: mode === 'training' ? false : vsAI,
      p1Id: f1Data.id,
      p2Id: f2Data.id,
      campaignRound,
      matchConfig: { ...this.config.match },
    };
    sound.resetMusic();
  }

  startReplay(replay: MatchReplayData) {
    this.isReplaying = true;
    this.replayEnded = false;
    this.replayData = replay;
    this.replayTotalFrames = replay.totalFrames;
    this.replayCursor = 0;
    this.replayCurrentP1 = { ...EMPTY_INPUT };
    this.replayCurrentP2 = { ...EMPTY_INPUT };
    this.matchCfgOverride = { ...replay.matchConfig };
    this.mode = replay.mode;

    this.rngState = replay.seed >>> 0;
    this.visRngState = (replay.seed ^ 0x9e3779b9) >>> 0;

    this.setStage(replay.stageIdx);
    const hzMap = { off: 9999999, normal: 1200, frenetic: 620 };
    this.hazardCycle = replay.campaignRound === 6 ? 600 : hzMap[replay.matchConfig.hazardFrequency];

    const f1Data = this.roster.find((p) => p.id === replay.p1Id) || this.roster[0];
    const f2Data = this.roster.find((p) => p.id === replay.p2Id) || this.roster[1] || this.roster[0];
    const f1 = new FighterSim(0, f1Data, false, replay.matchConfig);
    const f2 = new FighterSim(1, f2Data, replay.vsAI, replay.matchConfig);
    if (replay.campaignRound != null) {
      const boss = replay.campaignRound === 6;
      f2.dif = boss ? 3 : replay.campaignRound >= 3 ? 2 : 1;
      if (boss) {
        f2.boss = true;
        f2.S = { ...f2.S, weight: f2.S.weight * 1.18 };
      }
    } else {
      f2.dif = replay.matchConfig.aiDifficulty;
    }

    if (replay.version === 1) { f1.moves = null; f2.moves = null; }
    this.strikes = [];
    this.fighters = [f1, f2];
    this.projectiles = [];
    this.items = [];
    this.particles = [];
    this.crowdParticles = [];
    this.crowd = {
      excitement: 0.12,
      cheerTimer: 0,
      mood: 'calm',
      accentColor: this.stage.palette.platformTrim,
      accentHighlight: '#fff3a0',
      seed: replay.seed >>> 0,
    };
    this.ults = [];
    this.cine = null;
    this.telegraph = null;
    this.winner = null;
    this.endT = 0;
    this.T = 0;
    this.freeze = 0;
    this.slowMo = 0;
    this.shake = 0;
    this.floatTexts = [];
    this.bannerMsg = { t: '', l: 0, m: 1 };
    sound.resetMusic();
  }

  private pollGamepads(allowPlayPause: boolean) {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p): p is Gamepad => Boolean(p && p.connected)) : [];
    for (let n = 0; n < 2; n++) {
      const p = pads[n];
      const prefix = `GP${n}_`;
      if (!p) {
        ACTIONS_ORDER.forEach((a) => {
          this.keys[prefix + a] = false;
        });
        this.gpState[n] = false;
        continue;
      }
      const b = (idx: number) => Boolean(p.buttons[idx]?.pressed);
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      const dz = 0.25;
      this.keys[prefix + 'left'] = ax < -dz || b(14);
      this.keys[prefix + 'right'] = ax > dz || b(15);
      this.keys[prefix + 'jump'] = ay < -0.7 || b(12) || b(0) || b(3);
      this.keys[prefix + 'down'] = ay > dz || b(13);
      this.keys[prefix + 'light'] = b(2);
      this.keys[prefix + 'heavy'] = b(1);
      this.keys[prefix + 'dash'] = b(4) || b(5);
      this.keys[prefix + 'ult'] = b(6) || b(7);

      const startPressed = b(9);
      if (allowPlayPause && startPressed && !this.gpState[n]) {
        this.onPauseToggle?.();
      }
      this.gpState[n] = startPressed;
    }
  }

  private vibrate(pi: number, dur: number, weak: number, strong: number) {
    if (!this.config.controls.gamepadVibration) return;
    try {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p): p is Gamepad => Boolean(p && p.connected)) : [];
      const act = pads[pi]?.vibrationActuator;
      if (act?.playEffect) {
        act.playEffect('dual-rumble', { startDelay: 0, duration: dur, weakMagnitude: weak, strongMagnitude: strong });
      }
    } catch {
      // ignore unsupported vibration APIs
    }
  }

  private readHumanInput(pi: number): InputFrame {
    const map = pi === 0 ? this.config.controls.p1 : this.config.controls.p2;
    const prefix = `GP${pi}_`;
    const check = (action: PlayerAction) =>
      map[action].some((c) => Boolean(this.keys[c])) ||
      Boolean(this.keys[prefix + action]) ||
      (pi === 0 && Boolean(this.touchKeys[action])) ||
      (pi === 1 && Boolean(this.remoteKeys[action]));

    return {
      left: check('left'),
      right: check('right'),
      jump: check('jump'),
      down: check('down'),
      light: check('light'),
      heavy: check('heavy'),
      dash: check('dash'),
      ult: check('ult'),
      reload: check('reload'),
    };
  }

  private hasFloorAt(x: number, feetY: number): boolean {
    if (x >= this.main.x + 14 && x <= this.main.x + this.main.w - 14 && feetY <= this.main.y + 18) {
      return true;
    }
    return this.plats.some((p) => x >= p.x + 12 && x <= p.x + p.w - 12 && feetY <= p.y + 18);
  }

  private isSafeStep(f: FighterSim, dir: number, lookAhead = 48): boolean {
    if (dir === 0) return true;
    const nextX = f.cx + dir * lookAhead;
    const overMain = nextX >= this.main.x + 36 && nextX <= this.main.x + this.main.w - 36;
    if (overMain) return true;
    if (this.hasFloorAt(nextX, f.y + f.h + 14)) return true;
    // Always allow steering back toward center stage
    return Math.abs(nextX - W / 2) < Math.abs(f.cx - W / 2);
  }

  private readRecoveryInput(f: FighterSim): InputFrame {
    const i: InputFrame = { ...EMPTY_INPUT };
    const safeTargetX = clamp(f.cx, this.main.x + 95, this.main.x + this.main.w - 95);
    const toSafe = Math.abs(f.cx - safeTargetX) > 10 ? Math.sign(safeTargetX - f.cx) : Math.sign(W / 2 - f.cx);
    if (toSafe > 0) i.right = true;
    else if (toSafe < 0) i.left = true;

    const feetY = f.y + f.h;
    // Wall jump immediately if clinging to stage wall
    if (f.wall !== 0 && !f.on) {
      i.jump = !f.prevIn.jump;
      return i;
    }

    // Pulse air jumps cleanly so `just.jump` actually triggers!
    if (f.airJ > 0 && (f.vy > 1.1 || feetY > this.main.y - 22)) {
      i.jump = !f.prevIn.jump;
      return i;
    }

    // Hover float after air jumps if still near deck level
    if (f.isFloatZoner && f.airJ === 0 && f.floatT > 0 && f.vy > 0.15 && feetY < this.main.y + 14) {
      i.jump = true;
      return i;
    }

    // Trigger Up-Special recovery reliably when out of jumps or below deck
    if (!f.upSpecUsed && !f.atk && ((f.airJ <= 0 && (f.vy > 0.6 || feetY > this.main.y - 10)) || feetY > this.main.y + 24)) {
      i.jump = true;
      i.heavy = !f.prevIn.heavy;
      return i;
    }

    // Horizontal recovery dash when far outside main stage
    const farOut = f.cx < this.main.x - 10 || f.cx > this.main.x + this.main.w + 10;
    if (farOut && f.dashCD <= 0 && feetY < this.main.y + 55 && f.vy > -2.5) {
      i.dash = !f.prevIn.dash;
    }
    return i;
  }

  private readAIInput(f: FighterSim, o: FighterSim): InputFrame {
    if (f.trainingDummy) return { ...EMPTY_INPUT };

    const feetY = f.y + f.h;
    const hasFloorBelow = this.hasFloorAt(f.cx, feetY);

    // 1. Priority: Recover safely whenever off-stage or falling below the main deck
    if ((!f.on && !hasFloorBelow) || feetY > this.main.y + 18) {
      return this.readRecoveryInput(f);
    }

    const i: InputFrame = { ...EMPTY_INPUT };
    const dx = o.cx - f.cx;
    const dy = o.y - f.y;
    const ad = Math.abs(dx);
    const dirToOpp = dx >= 0 ? 1 : -1;
    const aggro = [0.72, 1.05, 1.45, 1.95][f.dif] || 1.05;

    const tryMove = (dir: number, lookAhead = 48) => {
      if (dir === 0) return;
      if (this.isSafeStep(f, dir, lookAhead)) {
        if (dir > 0) i.right = true;
        else i.left = true;
      }
    };

    const pulseLight = () => {
      i.light = !f.prevIn.light;
    };
    const pulseHeavy = () => {
      i.heavy = !f.prevIn.heavy;
    };
    const pulseJump = () => {
      i.jump = !f.prevIn.jump;
    };

    // 2. Ultimate attack when ready & in range
    if (f.vote >= 100 && o.dead <= 0 && ad < 480 && Math.abs(dy) < 220 && f.dif >= 1) {
      i.ult = !f.prevIn.ult;
      return i;
    }

    // 3. Reload firearm when empty
    if (f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && f.ammo <= 0 && f.reloadT <= 0) {
      i.reload = !f.prevIn.reload;
    }

    // 4. If opponent is KO'd / respawning, hold safe center-stage position
    if (o.dead > 0) {
      if (f.cx < this.main.x + 130) i.right = true;
      else if (f.cx > this.main.x + this.main.w - 130) i.left = true;
      if (f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && f.ammo < f.maxAmmo && f.reloadT <= 0) {
        i.reload = !f.prevIn.reload;
      }
      return i;
    }

    // 5. If opponent is off-stage, edge-guard safely from inside the ledge (NEVER walk into the pit!)
    const oppOffStage = !this.hasFloorAt(o.cx, o.y + o.h) && (o.cx < this.main.x + 18 || o.cx > this.main.x + this.main.w - 18);
    if (oppOffStage) {
      const ledgeX = clamp(o.cx, this.main.x + 58, this.main.x + this.main.w - 58);
      const toLedge = ledgeX - f.cx;
      if (Math.abs(toLedge) > 18) {
        tryMove(Math.sign(toLedge), 44);
      } else {
        // Face opponent safely without stepping forward
        if (f.face !== dirToOpp && this.isSafeStep(f, dirToOpp, 36)) {
          tryMove(dirToOpp, 36);
        }
        if (f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && Math.abs(dy) < 95 && ad < 520) {
          if (f.wk === 'mg') i.light = true;
          else pulseLight();
        } else if (f.isFloatZoner && ad < 380 && Math.abs(dy) < 120 && this.rand() < 0.06 * aggro) {
          pulseHeavy();
        } else if (ad < 92 && Math.abs(dy) < 70 && this.rand() < 0.14 * aggro) {
          pulseLight();
        }
      }
      return i;
    }

    // 6. Pick up nearby stage weapons/briefcases
    if (f.dif >= 1 && !f.wpn && this.items.length > 0) {
      const nearest = this.items.find(
        (it) => it.x >= this.main.x + 28 && it.x <= this.main.x + this.main.w - 28
      );
      if (nearest && Math.abs(nearest.x - f.cx) < 230 && Math.abs(nearest.y - f.y) < 120 && ad > 85) {
        tryMove(nearest.x >= f.cx ? 1 : -1, 40);
        if (Math.abs(nearest.x - f.cx) < 28) pulseLight();
        return i;
      }
    }

    if (f.moves && f.on && !f.atk && !f.stun && !f.prevIn.heavy) {
      const effect=f.moves.specialDown().effect;
      const threatened = this.projectiles.some(p=>p.owner!==f && (f.cx-p.x)*p.vx>0 && Math.abs(f.cx-p.x)<160);
      const useDown = effect==='barrier' ? threatened && !f.field
        : effect==='testudo' ? ad<95 && Boolean(o.atk)
        : effect==='rage' ? !f.rage && ad<240
        : effect==='seal' ? !f.field && ad>120
        : ad<75 && o.on;
      if (useDown && this.rand()<0.065*aggro) return {...i,down:true,heavy:true};
    }

    // 7. Spacing & Platform Navigation
    const desiredDist = f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') ? 210 : f.isFloatZoner ? 215 : 46;
    if (ad > desiredDist) {
      tryMove(dirToOpp, 48);
    } else if (f.isFloatZoner && ad < 105 && f.dif >= 1) {
      // Zoner backpedal ONLY if there is solid floor behind!
      if (this.isSafeStep(f, -dirToOpp, 56)) {
        tryMove(-dirToOpp, 56);
      } else {
        // Cornered at ledge: jump inward over opponent instead of backing off the cliff!
        if (f.on) pulseJump();
        tryMove(dirToOpp, 40);
      }
      if (f.on && this.rand() < 0.06 * aggro) pulseJump();
    } else if (ad <= desiredDist && f.face !== dirToOpp) {
      // Turn to face opponent in close quarters
      tryMove(dirToOpp, 24);
    }

    // Chase opponent onto floating platforms or drop down through platforms
    if (dy < -75 && f.on && (ad < 220 || f.pl !== null)) {
      if (this.T % 18 < 2) pulseJump();
    } else if (dy > 78 && f.on && f.pl && ad < 240) {
      i.down = !f.prevIn.down;
    }

    // Zoner short hover over safe main deck
    if (
      f.isFloatZoner &&
      !f.on &&
      f.floatT > 25 &&
      ad > 125 &&
      ad < 360 &&
      f.cx > this.main.x + 70 &&
      f.cx < this.main.x + this.main.w - 70
    ) {
      i.jump = true;
    }

    // 8. Combat Attacks, Jab Combos, Aerials & Signatures (with Ledge Safety)
    const canLungingHeavy =
      this.isSafeStep(f, dirToOpp, 145) ||
      f.isFloatZoner ||
      f.d.signatureType === 'muralla' ||
      f.d.signatureType === 'barrotes' ||
      f.d.signatureType === 'sabio';

    if (f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && Math.abs(dy) < 75 && ad < 520) {
      if (f.face !== dirToOpp) tryMove(dirToOpp, 24);
      if (this.rand() < 0.34 * aggro) {
        if (f.wk === 'mg') i.light = true;
        else pulseLight();
      }
    } else if (ad < 94 && Math.abs(dy) < 76) {
      // Continue jab string combo!
      if (f.atk && f.atk.spec.k === 'l' && f.atk.t >= f.atk.spec.dur * 0.52 && this.rand() < 0.45 * aggro) {
        pulseLight();
      } else if (!f.atk) {
        if (!f.on && dy > 24 && ad < 80 && this.hasFloorAt(f.cx, this.main.y)) {
          // Safe down-air spike over main stage
          i.down = true;
          pulseLight();
        } else if (dy < -36 && this.rand() < 0.24 * aggro) {
          // Up-tilt / Up-air anti-air
          i.jump = true;
          pulseLight();
        } else if (this.rand() < 0.22 * aggro) {
          pulseLight();
        } else if (canLungingHeavy && this.rand() < (f.dif >= 2 ? 0.11 : f.dif >= 1 ? 0.075 : 0.04)) {
          pulseHeavy();
        }
      }
      // Defensive/evasive dash ONLY when safe from pits
      if (
        f.dashCD <= 0 &&
        o.atk &&
        ad < 105 &&
        this.isSafeStep(f, -dirToOpp, 150) &&
        this.rand() < 0.08 * aggro
      ) {
        tryMove(-dirToOpp, 150);
        i.dash = !f.prevIn.dash;
      }
    } else if (ad >= 135 && ad < 430 && Math.abs(dy) < 110 && canLungingHeavy) {
      // Mid/Long-range signatures (Pulse orbs, Muralla, Barrotes, Sabio, or safe rushdown)
      const rangedSig = f.isFloatZoner || f.d.signatureType === 'muralla' || f.d.signatureType === 'barrotes' || f.d.signatureType === 'sabio';
      if (rangedSig && this.rand() < 0.045 * aggro) {
        if (f.face !== dirToOpp) tryMove(dirToOpp, 24);
        pulseHeavy();
      } else if (!rangedSig && f.dif >= 2 && f.dashCD <= 0 && ad < 250 && this.isSafeStep(f, dirToOpp, 155) && this.rand() < 0.035) {
        tryMove(dirToOpp, 155);
        i.dash = !f.prevIn.dash;
      }
    }

    return i;
  }

  private burst(
    x: number,
    y: number,
    col: string,
    count: number,
    spd = 5,
    life = 24,
    shape?: RenderParticle['shape']
  ) {
    const scaleMap = { low: 0.45, high: 1.0, extreme: 1.7 };
    const mult = scaleMap[this.config.video.particleDensity];
    const n = Math.max(1, Math.round(count * mult));
    const big = count >= 12 && !shape;
    for (let k = 0; k < n; k++) {
      const a = this.vRand() * Math.PI * 2;
      const v = (0.35 + this.vRand() * 0.85) * spd;
      const m = big ? life * (1.35 + this.vRand() * 0.7) : life * (0.75 + this.vRand() * 0.5);
      const chosenShape: RenderParticle['shape'] =
        shape ?? (k % 3 === 0 ? 'streak' : k % 4 === 1 ? 'diamond' : 'spark');
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (big ? 0.7 : 0),
        l: m,
        m,
        col,
        z: big ? 6 + this.vRand() * 12 : 2 + this.vRand() * 4.2,
        ex: big ? 1 : 0,
        shape: big ? undefined : chosenShape,
      });
    }
  }

  private popMsg(t: string, l: number) {
    this.bannerMsg = { t, l, m: l };
  }

  private triggerCrowdReaction(
    mood: CrowdMood,
    xCenter: number,
    count: number,
    accent?: string,
    highlight?: string,
    cheerFrames = 40
  ) {
    const boostMap: Record<CrowdMood, number> = {
      calm: 0.05,
      hype: 0.28,
      heavy: 0.56,
      ult: 0.85,
      win: 1.0,
    };
    this.crowd.excitement = Math.min(1, Math.max(this.crowd.excitement, boostMap[mood]) + (mood === 'hype' ? 0.1 : 0));
    this.crowd.cheerTimer = Math.max(this.crowd.cheerTimer, cheerFrames);
    const priority: Record<CrowdMood, number> = { calm: 0, hype: 1, heavy: 2, ult: 3, win: 4 };
    if (priority[mood] >= priority[this.crowd.mood] || this.crowd.cheerTimer <= cheerFrames) {
      this.crowd.mood = mood;
    }
    if (accent) this.crowd.accentColor = accent;
    if (highlight) this.crowd.accentHighlight = highlight;

    const scaleMap = { low: 0.45, high: 1.0, extreme: 1.7 };
    const mult = scaleMap[this.config.video.particleDensity];
    const n = Math.max(1, Math.round(count * mult));
    const minX = this.main.x + 22;
    const maxX = this.main.x + this.main.w - 22;
    const spread = mood === 'ult' || mood === 'win' ? this.main.w * 0.92 : 240;
    const palette = [
      this.crowd.accentColor,
      this.crowd.accentHighlight,
      this.stage.palette.platformTrim,
      '#ffd23f',
      '#ffffff',
      '#38bdf8',
    ];

    for (let k = 0; k < n; k++) {
      const px = clamp(xCenter + (this.vRand() - 0.5) * spread, minX, maxX);
      const py = this.main.y - 14 - this.vRand() * 18;
      const roll = this.vRand();
      if ((mood === 'heavy' || mood === 'ult' || mood === 'win' || mood === 'hype') && roll < 0.2) {
        // Press camera shutter flash along the balustrade
        const life = 10 + Math.floor(this.vRand() * 8);
        this.crowdParticles.push({
          x: px,
          y: this.main.y - 12 - this.vRand() * 12,
          vx: 0,
          vy: 0,
          l: life,
          m: life,
          col: '#fff7a0',
          size: mood === 'ult' || mood === 'win' ? 5.5 : 4.2,
          kind: 'flash',
          phase: 0,
          spin: 0,
        });
      } else if (roll < 0.42) {
        // Rising celebratory cheer sparkle
        const life = 26 + Math.floor(this.vRand() * 16);
        this.crowdParticles.push({
          x: px,
          y: py,
          vx: (this.vRand() - 0.5) * 1.6,
          vy: -1.8 - this.vRand() * 2.4,
          l: life,
          m: life,
          col: palette[k % palette.length],
          size: 3.5 + this.vRand() * 2.2,
          kind: 'cheer',
          phase: this.vRand() * Math.PI * 2,
          spin: 0.25,
        });
      } else if ((mood === 'ult' || mood === 'win') && roll < 0.55) {
        // Celebratory fluttering pennant ribbon
        const life = 54 + Math.floor(this.vRand() * 24);
        this.crowdParticles.push({
          x: px,
          y: py,
          vx: (this.vRand() - 0.5) * 3.8,
          vy: -4.2 - this.vRand() * 3.0,
          l: life,
          m: life,
          col: palette[k % palette.length],
          size: 5.5 + this.vRand() * 2.5,
          kind: 'pennant',
          phase: this.vRand() * Math.PI * 2,
          spin: 0.35,
        });
      } else {
        // Spinning fluttering confetti
        const life = 44 + Math.floor(this.vRand() * 26);
        this.crowdParticles.push({
          x: px,
          y: py,
          vx: (this.vRand() - 0.5) * (mood === 'win' ? 4.4 : 3.0),
          vy: -2.8 - this.vRand() * (mood === 'win' || mood === 'ult' ? 4.4 : 2.8),
          l: life,
          m: life,
          col: palette[k % palette.length],
          size: 3.6 + this.vRand() * 2.4,
          kind: 'confetti',
          phase: this.vRand() * Math.PI * 2,
          spin: 0.2 + this.vRand() * 0.28,
        });
      }
    }
    if (this.crowdParticles.length > 260) {
      this.crowdParticles.splice(0, this.crowdParticles.length - 260);
    }
  }

  getComboMultiplier(comboCount: number): number {
    return 1 + Math.min(0.6, Math.max(0, comboCount - 1) * 0.08);
  }

  private hurt(
    f: FighterSim,
    o: FighterSim | null,
    d: { dmg: number; bk: number; ks: number; ang: number; heavy?: boolean; every?: number; hold?: number; ult?: boolean },
    dir: number, source = 'other', contact?: {x:number;y:number;w:number;h:number}, pierce = false
  ): boolean {
    if (f.inv > 0 || f.dead > 0) return false;
    if (f.atk?.spec.effect === 'hover' && !d.ult && !pierce) return false;
    if (f.atk?.spec.effect === 'testudo' && source === 'melee' && o && !pierce) {
      f.atk=null;
      this.hurt(o,f,{dmg:8,bk:6,ks:.14,ang:-38},-dir);
      return true;
    }
    if (f.rage && contact && dir===f.face && shotTouches(contact,heel(f))) d={...d,dmg:d.dmg*2};
    const voteMult = this.activeMatchCfg.voteGainMultiplier;
    const kbMult = this.activeMatchCfg.knockbackMultiplier;

    if (!pierce && f.atk && f.atk.armor && !f.atk.ar && !d.ult) {
      f.atk.ar = 1;
      f.pct += d.dmg * 0.5;
      f.hitFlash = 10;
      sound.heavy();
      this.shake = Math.max(this.shake, 6);
      this.burst(f.cx, f.y + f.h * 0.46, '#ffd700', 14);
      return true;
    }

    // Sequential Combo Tracking & Damage Multiplier Calculation
    let appliedDmg = d.dmg;
    if (o) {
      if (o.cT <= 0 && f.stun <= 0) o.combo = 0;
      o.combo += 1;
      o.cT = o.cMax;
      o.maxCombo = Math.max(o.maxCombo, o.combo);
      f.lastAttacker = o;
      const comboMult = this.getComboMultiplier(o.combo);
      appliedDmg = d.dmg * comboMult;
      o.damageDealt += appliedDmg;
      this.vibrate(o.pi, d.ult ? 380 : d.heavy ? 200 : 65, d.ult ? 1 : d.heavy ? 0.7 : 0.3, d.ult ? 1 : d.heavy ? 0.85 : 0.15);

      if (o.combo >= 2) {
        this.floatTexts.push({
          t: `${o.combo} HITS! ×${comboMult.toFixed(2)}`,
          x: f.cx,
          y: f.y - 16,
          l: 52,
          m: 52,
        });
      }
    }

    if (!d.ult) {
      f.vote = Math.min(100, f.vote + 5 * voteMult);
      if (o) o.vote = Math.min(100, o.vote + (d.heavy ? 15 : d.every ? 3 : 8) * voteMult);
    }

    f.pct += appliedDmg;
    f.hitFlash = 14;
    f.squashX = 1.28;
    f.squashY = 0.76;
    f.floating = false;
    f.fastFall = false;

    const kb = (d.bk + (f.pct * d.ks) / f.S.weight) * kbMult * (o?.rage ? 1.55 : 1);
    const rad = (d.ang * Math.PI) / 180;
    const vx = Math.cos(rad) * kb * dir;
    const vy = Math.sin(rad) * kb;

    f.atk = null;
    f.dashT = 0;
    // Smash-style Hit-Stun scaling with knockback
    f.stun = Math.min(58, Math.max(10, Math.round(10 + kb * 1.85)));
    f.maxStun = f.stun;
    f.face = -dir;
    if (vy < 0) f.on = false;
    if (d.hold) {
      f.stun = d.hold;
      f.maxStun = d.hold;
      f.pend = { vx, vy };
      f.vx = 0;
      f.vy = 0;
    } else {
      f.vx = vx;
      f.vy = vy;
    }

    if (this.config.video.hitstopEnabled) {
      this.freeze = d.heavy ? 4 : 2;
    }
    this.shake = Math.max(this.shake, d.heavy ? 10 : 3.5);
    if (d.heavy) sound.heavy();
    else sound.hit();

    this.burst(f.cx, f.y + f.h * 0.46, d.heavy ? '#ffb030' : '#ffffff', d.heavy ? 16 : 8, d.heavy ? 7 : 4);
    if (d.ult) {
      this.triggerCrowdReaction('ult', f.cx, 26, o?.d.palette.accent.base, o?.d.palette.accent.highlight, 78);
    } else if (d.heavy) {
      this.triggerCrowdReaction('heavy', f.cx, 18, o?.d.palette.accent.base, o?.d.palette.accent.highlight, 52);
    } else if (o && o.combo >= 2) {
      this.triggerCrowdReaction('hype', f.cx, Math.min(16, 5 + o.combo * 2), o.d.palette.accent.base, o.d.palette.accent.highlight, 32);
    } else {
      this.crowd.excitement = Math.min(1, this.crowd.excitement + 0.08);
      if (o && this.vRand() < 0.45) {
        this.triggerCrowdReaction('calm', f.cx, 2, o.d.palette.accent.base, o.d.palette.accent.highlight, 12);
      }
    }
    return true;
  }

  private getUltZones(f: FighterSim, o: FighterSim): Array<{ x: number; y: number; w: number; h: number }> {
    const powerId = f.d.powerSourceId || f.d.id;
    switch (powerId) {
      case 'muralla':
        return [
          { x: W / 2 - 220, y: this.main.y - 180, w: 440, h: 180 },
          { x: W / 2 - 80, y: 0, w: 160, h: this.main.y - 180 },
        ];
      case 'libertario':
        return [
          {
            x: Math.min(f.cx, o.cx) - 30,
            y: Math.min(f.y, o.y) - 15,
            w: Math.abs(o.cx - f.cx) + 60,
            h: Math.abs(o.y - f.y) + 110,
          },
        ];
      case 'barrotes':
        return [{ x: o.cx - 140, y: o.y + o.h - 240, w: 280, h: 240 }];
      case 'pulso':
        return [{ x: 0, y: 0, w: 120, h: H }];
      case 'tigre':
        return [{ x: 0, y: this.main.y - 190, w: W, h: 200 }];
      case 'lenador':
        return [{ x: 0, y: this.main.y - 120, w: W, h: 126 }];
      case 'libertador':
        return [{ x: f.face > 0 ? f.cx : 0, y: 80, w: f.face > 0 ? W - f.cx : f.cx, h: 520 }];
      case 'sabio':
        return [{ x: f.cx - 280, y: f.y + f.h * 0.48 - 280, w: 560, h: 560 }];
      default:
        return [];
    }
  }

  private perfectDodge(o: FighterSim) {
    o.vote = Math.min(100, o.vote + 20);
    o.perfectDodges++;
    this.slowMo = 12;
    this.floatTexts.push({ t: '¡ESQUIVE PERFECTO!', x: o.cx, y: o.y - 12, l: 70, m: 70 });
    sound.tone(1200, 0.24, 'triangle', 600, 0.08);
    this.burst(o.cx, o.y + o.h * 0.48, '#7cf', 12, 5);
    this.triggerCrowdReaction('hype', o.cx, 16, o.d.palette.accent.base, '#7dd3fc', 44);
    this.vibrate(o.pi, 120, 0.4, 0.2);
  }

  private ultHit(
    u: RenderUltEffect & { dg?: number },
    ang: number,
    dir: number,
    override?: { dmg?: number; bk?: number }
  ): boolean {
    const o = u.o as FighterSim;
    if (u.dg) return true;
    if (o.dashT > 0 && o.dead <= 0) {
      u.dg = 1;
      this.perfectDodge(o);
      return true;
    }
    return this.hurt(
      o,
      u.f as FighterSim,
      { dmg: override?.dmg ?? 36, bk: override?.bk ?? 15, ks: 0.5, ang, heavy: true, ult: true },
      dir
    );
  }

  private fireUlt(f: FighterSim, o: FighterSim) {
    const powerId = f.d.powerSourceId || f.d.id;
    const durMap: Record<string, number> = {
      muralla: 90,
      libertario: 120,
      barrotes: 110,
      pulso: 115,
      tigre: 95,
      lenador: 80,
      libertador: 130,
      sabio: 55,
    };
    if (powerId === 'libertario' || powerId === 'libertador') f.inv = 120;
    if (powerId === 'pulso') f.inv = 70;
    if (powerId === 'sabio') {
      f.inv = 45;
      sound.heavy();
    }
    if (powerId === 'lenador') sound.tone(260, 0.6, 'sawtooth', -40, 0.1);

    this.ults.push({
      t: 0,
      dur: durMap[powerId] || 90,
      f,
      o,
      kind: powerId,
      cx: f.cx,
      cy: f.y + f.h * 0.48,
      ux: f.face > 0 ? 11 : -11,
    });
  }

  private updateUltEffects() {
    for (const u of this.ults as Array<RenderUltEffect & { h?: number; hh?: boolean[]; dg?: number; vvx?: number; vvy?: number; sy?: number }>) {
      u.t++;
      const f = u.f as FighterSim;
      const o = u.o as FighterSim;
      const dir = o.cx >= f.cx ? 1 : -1;

      if (u.kind === 'muralla') {
        const X0 = W / 2 - 80;
        const y0 = -640;
        const y1 = this.main.y - 540;
        const p = Math.min(1, u.t / 30);
        u.ty = y0 + (y1 - y0) * p * p;
        if (!u.h && u.t <= 34 && ov({ x: X0, y: u.ty, w: 160, h: 540 }, o) && this.ultHit(u, -65, dir)) u.h = 1;
        if (u.t === 30) {
          this.shake = 24;
          sound.explosion();
          this.burst(W / 2, this.main.y, '#ffd700', 42, 10);
          if (!u.h && Math.abs(o.cx - W / 2) < 220 && o.y + o.h > this.main.y - 180 && this.ultHit(u, -70, o.cx >= W / 2 ? 1 : -1)) u.h = 1;
        }
      } else if (u.kind === 'libertario') {
        if (f.dead > 0) {
          u.t = u.dur;
          continue;
        }
        if (u.vvx === undefined) {
          u.vvx = dir * 13;
          u.vvy = -9;
        }
        if (u.t % 35 === 0) {
          const dx = o.cx - f.cx;
          const dy = o.y - f.y;
          const dist = Math.hypot(dx, dy) || 1;
          u.vvx = (dx / dist) * 15;
          u.vvy = (dy / dist) * 15;
        }
        f.x += u.vvx!;
        f.y += u.vvy!;
        if (f.x < 20 || f.x > W - 60) u.vvx = -u.vvx!;
        if (f.y < 40 || f.y > H - 140) u.vvy = -u.vvy!;
        f.x = clamp(f.x, 20, W - 60);
        f.y = clamp(f.y, 40, H - 140);
        f.vx = 0;
        f.vy = 0;
        f.stun = 0;
        f.atk = null;
        f.dashT = 0;
        f.airJ = 2;
        f.inv = Math.max(f.inv, 4);
        u.tr = u.tr || [];
        u.tr.push({ x: f.cx, y: f.y + f.h * 0.48 });
        if (u.tr.length > 18) u.tr.shift();
        if (u.t % 9 === 0 && ov({ x: f.x - 8, y: f.y - 8, w: f.w + 16, h: f.h + 16 }, o)) {
          sound.saw();
          this.ultHit(u, -25, dir, { dmg: 8, bk: 3 });
        }
        if (u.t === u.dur - 1) {
          if (ov({ x: f.x - 18, y: f.y - 18, w: f.w + 36, h: f.h + 36 }, o)) this.ultHit(u, -30, dir, { dmg: 14, bk: 17 });
          if (ov(f, this.main)) f.y = this.main.y - f.h;
        }
      } else if (u.kind === 'barrotes') {
        if (u.t < 36) {
          u.lx = o.cx;
          u.ly = o.y + o.h;
        }
        if (u.t === 40) sound.tone(900, 0.25, 'square', -500, 0.08);
        if (u.t >= 45 && !u.ex && u.lx != null && u.ly != null) {
          u.cy = -220 + (u.t - 45) * 30;
          const cage = { x: u.lx - 65, y: u.cy, w: 130, h: 160 };
          if (cage.y + 160 >= u.ly || cage.y > H - 80 || ov(cage, o)) {
            u.ex = 1;
            u.et = u.t;
            this.shake = 26;
            sound.explosion();
            this.burst(u.lx, u.ly, '#ffb030', 44, 11);
            if (Math.hypot(o.cx - u.lx, o.y + o.h * 0.48 - u.ly) < 145) this.ultHit(u, -72, o.cx >= u.lx ? 1 : -1);
          }
        }
      } else if (u.kind === 'pulso') {
        const x0 = -120 + (u.t * (W + 680)) / 100;
        u.bx = [0, 1, 2].map((k) => x0 - k * 240);
        u.hh = u.hh || [false, false, false];
        u.bx.forEach((bx, k) => {
          if (!u.hh![k] && ov({ x: bx - 40, y: -60, w: 80, h: H + 120 }, o) && this.ultHit(u, -55, 1, k ? { dmg: 14, bk: 8 } : {})) {
            u.hh![k] = true;
          }
          if (u.t % 3 === 0 && bx > 0 && bx < W) this.burst(bx, this.main.y - 50 + this.vRand() * 80, '#fff7a0', 3, 5, 14);
        });
        if (u.t % 10 === 0) sound.tone(300 + this.vRand() * 400, 0.14, 'sawtooth', 300, 0.06);
      } else if (u.kind === 'tigre') {
        const d = f.face;
        const p = Math.min(1, u.t / 70);
        u.tx = d > 0 ? -380 + p * (W + 760) : W + 380 - p * (W + 760);
        if (!u.h && u.t < 75 && ov({ x: u.tx - 130, y: this.main.y - 180, w: 260, h: 190 }, o) && this.ultHit(u, -28, d)) {
          u.h = 1;
          this.burst(o.cx, o.y + o.h * 0.48, '#ffd700', 36, 10);
        }
      } else if (u.kind === 'lenador') {
        const d = f.face;
        const p = Math.min(1, u.t / 55);
        u.tx = d > 0 ? -420 + p * (W + 840) : W + 420 - p * (W + 840);
        if (!u.h && u.t < 60 && ov({ x: u.tx - 200, y: this.main.y - 120, w: 400, h: 126 }, o) && this.ultHit(u, -38, d)) u.h = 1;
        if (u.t % 2 === 0) {
          this.particles.push({ x: u.tx - d * 150, y: this.main.y - 130, vx: -d, vy: -1.5, l: 40, m: 40, col: '#bbb', z: 12 + this.vRand() * 8 });
        }
      } else if (u.kind === 'libertador') {
        if (f.dead > 0) {
          u.t = u.dur;
          continue;
        }
        if (u.sy === undefined) u.sy = f.y;
        const d = f.face;
        f.vx = 0;
        f.vy = 0;
        f.stun = 0;
        f.atk = null;
        f.dashT = 0;
        f.airJ = 2;
        f.y = u.t <= 18 ? u.sy - 140 * Math.sin((u.t / 18) * (Math.PI / 2)) : u.sy - 140;
        u.m = u.m || [];
        if (u.t >= 20 && u.t < 80 && (u.t - 20) % 6 === 0) {
          sound.sword();
          u.m.push({ x: f.cx + d * 36, y: 110 + ((u.t - 20) / 6) * 52, k: (u.t - 20) / 6 });
        }
        for (const m of u.m) {
          m.x += d * 17;
          if (!u.h && ov({ x: d > 0 ? m.x - 14 : m.x - 100, y: m.y - 84, w: 114, h: 168 }, o) && this.ultHit(u, -35, d)) {
            u.h = 1;
          }
        }
      } else if (u.kind === 'sabio') {
        u.r = Math.min(280, u.t * 11);
        u.cx = f.cx;
        u.cy = f.y + f.h * 0.48;
        if (!u.h && Math.hypot(o.cx - u.cx, o.y + o.h * 0.48 - u.cy) < u.r + 14 && this.ultHit(u, -18, dir, { bk: 20 })) {
          u.h = 1;
        }
      }
    }
    this.ults = this.ults.filter((u) => u.t < u.dur);
  }

  private updateFighter(f: FighterSim, o: FighterSim) {
    if (f.dead > 0) {
      if (--f.dead === 0 && f.stocks > 0) {
        f.spawn(false, this.activeMatchCfg, this.main.x, this.main.y, this.main.w);
      }
      return;
    }

    const isMatchWinner = this.winner === f;
    let i: InputFrame;
    if (isMatchWinner) {
      f.inv = 999;
      f.stun = 0;
      f.pend = null;
      f.floating = false;
      f.fastFall = false;
      f.crouch = false;
      const safeAboveMain =
        f.on ||
        (f.cx >= this.main.x + 22 && f.cx <= this.main.x + this.main.w - 22 && f.y + f.h <= this.main.y + 8);
      if (safeAboveMain) {
        f.atk = null;
        f.dashT = 0;
        f.moveKind = '';
        f.vx *= 0.72;
        if (Math.abs(f.vx) < 0.08) f.vx = 0;
        i = { ...EMPTY_INPUT };
      } else {
        i = this.readRecoveryInput(f);
      }
    } else {
      i = this.isReplaying
        ? f.pi === 0
          ? { ...this.replayCurrentP1 }
          : { ...this.replayCurrentP2 }
        : f.ai
          ? this.readAIInput(f, o)
          : f.trainingDummy
            ? { ...EMPTY_INPUT }
            : this.readHumanInput(f.pi);
    }
    const just: InputFrame = {
      left: i.left && !f.prevIn.left,
      right: i.right && !f.prevIn.right,
      jump: i.jump && !f.prevIn.jump,
      down: i.down && !f.prevIn.down,
      light: i.light && !f.prevIn.light,
      heavy: i.heavy && !f.prevIn.heavy,
      dash: i.dash && !f.prevIn.dash,
      ult: i.ult && !f.prevIn.ult,
      reload: i.reload && !f.prevIn.reload,
    };
    f.prevIn = i;
    f.curIn = i;
    f.justIn = just;

    if (f.atk?.spec.individual && f.atk.t >= f.atk.spec.dur) {
      f.atk=null; f.moveKind='';
    }
    tickEffects(f);
    if (f.on && f.pl) f.y = f.pl.y - f.h;
    if (f.boss && this.T % 30 === 0) f.vote = Math.min(100, f.vote + 1);
    if (f.inv > 0) f.inv--;
    if (f.dashCD > 0) f.dashCD--;
    if (f.dashDanceT > 0) f.dashDanceT--;
    if (f.wpn > 0) {
      f.wpn--;
      if (f.wpn === 0) {
        f.wk = null;
        f.ammo = 0;
        f.reloadT = 0;
      }
    }
    if (f.pickupT > 0) f.pickupT--;
    if (f.gunCD > 0) f.gunCD--;
    if (f.shootRecoil > 0) f.shootRecoil--;
    if (f.landT > 0) f.landT--;
    if (f.reloadT > 0) {
      f.reloadT--;
      if (f.reloadT === 0) {
        f.ammo = f.maxAmmo;
        sound.reloadClick();
        this.floatTexts.push({ t: 'RECARGADO', x: f.cx, y: f.y - 10, l: 38, m: 38 });
      }
    }
    if (f.dropT > 0) f.dropT--;
    // Keep attacker's combo timer alive while victim is in active hit-stun!
    if (f.stun > 0 && f.lastAttacker && f.lastAttacker.combo > 0) {
      f.lastAttacker.cT = Math.max(f.lastAttacker.cT, 34);
    }
    if (f.cT > 0 && --f.cT === 0) {
      f.combo = 0;
      f.jabStep = 0;
    }
    if (f.hitFlash > 0) f.hitFlash--;
    if (f.trainingDummy && f.stun <= 0 && f.pct > 0 && this.T % 90 === 0) {
      f.pct = Math.max(0, f.pct - 15);
    }

    // Smooth squash & stretch spring recovery
    f.squashX += (1 - f.squashX) * 0.22;
    f.squashY += (1 - f.squashY) * 0.22;

    // Fade afterimages
    f.afterimages.forEach((a) => (a.alpha -= 0.14));
    f.afterimages = f.afterimages.filter((a) => a.alpha > 0);
    if ((f.dashT > 0 || f.moveKind === 'upSpec') && this.T % 2 === 0) {
      f.afterimages.push({ x: f.cx, y: f.y + f.h, face: f.face, alpha: 0.9 });
    }

    const free = f.stun <= 0;
    if (!free) {
      f.stun--;
      f.floating = false;
      f.fastFall = false;
      if (f.pend) {
        f.vx = 0;
        f.vy = 0;
        if (f.stun <= 0) {
          f.vx = f.pend.vx;
          f.vy = f.pend.vy;
          f.pend = null;
        }
      } else {
        f.vx *= 0.985;
        if (Math.hypot(f.vx, f.vy) > 5.5 && this.T % 2 === 0) {
          this.particles.push({
            x: f.cx,
            y: f.y + f.h * 0.48,
            vx: -f.vx * 0.12,
            vy: -0.35,
            l: 22,
            m: 22,
            col: Math.hypot(f.vx, f.vy) > 10 ? '#ffd43b' : '#cbd5e1',
            z: Math.hypot(f.vx, f.vy) > 10 ? 9 : 6,
          });
        }
      }
    } else {
      const a = f.atk;
      const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);

      // Ultimate trigger
      if (f.vote >= 100 && !this.cine && !this.telegraph && (just.ult || (i.light && i.heavy && (just.light || just.heavy)))) {
        this.cine = { t: 0, f, o };
        f.vote = 0;
        f.floating = false;
        sound.siren();
        this.triggerCrowdReaction('ult', f.cx, 24, f.d.palette.accent.base, f.d.palette.accent.highlight, 85);
        this.vibrate(f.pi, 500, 1, 1);
        just.light = false;
        just.heavy = false;
        just.dash = false;
      } else if (just.light && i.dash && f.wpn > 0) {
        // Throw weapon
        this.projectiles.push({
          x: f.cx - 8,
          y: f.y + 26,
          w: 18,
          h: 18,
          vx: f.face * 10.5,
          vy: -2.2,
          life: 60,
          kind: 'throw',
          w2: f.wk || 'case',
          owner: f,
          dir: f.face,
          d: { dmg: 10, bk: 5.5, ks: 0.16, ang: -25, heavy: true },
          hit: 0,
        });
        f.wpn = 0;
        f.wk = null;
        sound.sword();
      } else if (just.dash && f.dashCD <= 0 && f.dashT <= 0) {
        f.dashT = 12;
        f.inv = Math.max(f.inv, 12);
        f.dashCD = 82;
        f.floating = false;
        const dashSpd = f.isAgileSwordsman ? 12.2 : 10.5;
        f.vx = (dir || f.face) * dashSpd;
        f.vy = 0;
        f.atk = null;
        f.moveKind = '';
        f.squashX = 1.28;
        f.squashY = 0.78;
        sound.dash();
      }

      if (f.dashT > 0) {
        f.dashT--;
        f.vy = 0;
        // Momentum slide exit from dash!
        if (f.dashT === 0) f.vx *= 0.62;
      } else {
        // Grounded Dash-Dancing + Air Acceleration & Friction
        if (dir !== 0) {
          if (f.on && !a && Math.sign(f.vx) !== 0 && Math.sign(f.vx) !== dir && Math.abs(f.vx) > 1.6) {
            // Snappy dash-dance turnaround burst with ground dust
            f.dashDanceT = 8;
            f.vx = dir * f.S.speed * (f.speedTime ? 1.45 : 1) * (f.isAgileSwordsman ? 1.24 : 1.12);
            this.burst(f.cx, f.y + f.h - 2, '#cbd5e1', 5, 3.0, 14, 'puff');
          } else {
            const airBonus = f.floating ? 1.24 : 1.0;
            const accel = f.on ? (f.isAgileSwordsman ? 0.31 : 0.27) : f.floating ? 0.16 : 0.125;
            const targetVx = dir * f.S.speed * (f.speedTime ? 1.45 : 1) * airBonus * (a ? 0.42 : 1);
            f.vx += (targetVx - f.vx) * accel;
          }
          if (!a) f.face = dir;
        } else if (f.on) {
          // Momentum slide when landing fast or dash-dancing
          const groundFriction = f.dashDanceT > 0 || Math.abs(f.vx) > f.S.speed * 1.12 ? 0.90 : 0.80;
          f.vx *= groundFriction;
          if (Math.abs(f.vx) < 0.08) f.vx = 0;
        } else {
          f.vx *= 0.986;
        }

        if (just.jump && !(f.moves && just.heavy)) {
          if (f.on) {
            f.jumpTick = this.T;
            f.vy = -f.S.jumpForce;
            f.on = false;
            f.fastFall = false;
            f.squashX = 0.78;
            f.squashY = 1.26;
            sound.jump();
          } else if (f.wall !== 0 && !f.on) {
            f.jumpTick = this.T;
            f.vy = -f.S.jumpForce * 0.95;
            f.vx = -f.wall * 7.8;
            f.face = -f.wall;
            f.fastFall = false;
            f.squashX = 0.8;
            f.squashY = 1.24;
            sound.jump();
            this.burst(f.cx, f.y + f.h * 0.48, '#fff', 6);
          } else if (f.airJ > 0) {
            f.airJ--;
            f.jumpTick = this.T;
            f.vy = -f.S.jumpForce * 0.92;
            f.fastFall = false;
            f.squashX = 0.84;
            f.squashY = 1.2;
            sound.jump();
            this.burst(f.cx, f.y + f.h, '#fff', 6, 3);
          }
        }

        // Doctora Pulso / Staff Zoner Hover (Float) Mechanic
        if (!f.on && f.isFloatZoner && i.jump && f.vy >= -0.8 && f.floatT > 0 && !a) {
          f.floating = true;
          f.fastFall = false;
          f.floatT--;
          f.vy = Math.sin(this.T * 0.22) * 0.42;
          if (this.T % 4 === 0) {
            this.particles.push({
              x: f.cx + (this.vRand() - 0.5) * 22,
              y: f.y + f.h - 2,
              vx: (this.vRand() - 0.5) * 0.9,
              vy: 0.9 + this.vRand() * 0.8,
              l: 16,
              m: 16,
              col: f.d.palette.accent.highlight || '#98ffe0',
              z: 2.6 + this.vRand() * 1.4,
              shape: 'diamond',
            });
          }
        } else {
          f.floating = false;
        }

        if (just.down && !(f.moves && just.heavy) && f.on && f.y + f.h < this.main.y - 1) {
          f.dropT = 14;
          f.y += 2;
          f.on = false;
        }
        f.crouch = f.on && i.down && f.y + f.h >= this.main.y - 1 && !a;
        if (!(f.moves && just.heavy) && !f.on && !f.floating && !a && f.vy > -1.0 && (just.down || (i.down && f.fastFall))) {
          if (!f.fastFall) {
            f.fastFall = true;
            f.squashX = 0.82;
            f.squashY = 1.22;
            this.particles.push({
              x: f.cx,
              y: f.y + 8,
              vx: 0,
              vy: -3.5,
              l: 12,
              m: 12,
              col: '#e2e8f0',
              z: 4,
            });
          }
          f.vy = Math.max(f.vy, 15.8);
        }

        // Manual Reload trigger
        if (just.reload && f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && f.reloadT <= 0 && f.ammo < f.maxAmmo) {
          f.reloadDur = f.wk === 'rocket' ? 54 : 42;
          f.reloadT = f.reloadDur;
          sound.reloadStart();
          this.particles.push({
            x: f.cx + f.face * 4,
            y: f.y + 42,
            vx: -f.face * 1.4,
            vy: -2.2,
            l: 36,
            m: 36,
            col: '#38bdf8',
            z: 4,
            mag: true,
          });
        }

        // Pickup Item
        if (just.light && !f.wpn) {
          const itemIdx = this.items.findIndex((it) => ov(it, f));
          if (itemIdx >= 0) {
            const it = this.items[itemIdx];
            this.items.splice(itemIdx, 1);
            if (!this.replayData || this.replayData.version >= 3) {
              f.pickupT = 14;
              f.gunCD = 14;
            }
            f.wpn = 950;
            f.wk = it.kind;
            f.maxAmmo = it.kind === 'mg' ? 30 : it.kind === 'rocket' ? 4 : 0;
            f.ammo = f.maxAmmo;
            f.reloadT = 0;
            const label =
              it.kind === 'mg'
                ? 'AMETRALLADORA PESADA!'
                : it.kind === 'rocket'
                  ? 'LANZACOHETES!'
                  : 'MALETÍN TÁCTICO!';
            this.popMsg(label, 70);
            sound.tone(700, 0.15, 'triangle', 400);
            this.burst(f.cx, f.y, '#ffd700', 16);
          }
        }

        // Firearm Shooting (with Ammo, Recoil, Auto-Reload & Shell Ejection)
        if ((just.light || (i.light && f.wk === 'mg')) && f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket') && f.gunCD <= 0 && f.reloadT <= 0) {
          if (f.ammo <= 0) {
            f.reloadDur = f.wk === 'rocket' ? 54 : 42;
            f.reloadT = f.reloadDur;
            sound.reloadStart();
            this.particles.push({
              x: f.cx + f.face * 4,
              y: f.y + 42,
              vx: -f.face * 1.4,
              vy: -2.2,
              l: 36,
              m: 36,
              col: '#38bdf8',
              z: 4,
              mag: true,
            });
          } else if (f.wk === 'mg') {
            f.gunCD = 8;
            f.ammo--;
            f.shootRecoil = 5;
            sound.gunshot();
            const muzzleX = f.cx + f.face * 28;
            const muzzleY = f.y + 38;
            this.projectiles.push({
              x: muzzleX,
              y: muzzleY,
              w: 12,
              h: 5,
              vx: f.face * 15.5,
              vy: (this.rand() - 0.5) * 0.85,
              life: 40,
              kind: 'bullet',
              owner: f,
              dir: f.face,
              d: { dmg: 3.4, bk: 2.1, ks: 0.05, ang: -12, heavy: false },
              hit: 0,
            });
            this.burst(muzzleX, muzzleY, '#fff3a0', 4, 4, 8);
            this.particles.push({
              x: f.cx + f.face * 6,
              y: f.y + 38,
              vx: -f.face * (1.8 + this.vRand() * 1.5),
              vy: -3 - this.vRand() * 2,
              l: 34,
              m: 34,
              col: '#ffd43b',
              z: 3,
              shell: true,
            });
            f.vx -= f.face * 0.65;
            if (f.ammo === 0) {
              f.reloadDur = 42;
              f.reloadT = 42;
              sound.reloadStart();
            }
          } else if (f.wk === 'rocket') {
            f.gunCD = 32;
            f.ammo--;
            f.shootRecoil = 9;
            sound.rocket();
            const muzzleX = f.cx + f.face * 28;
            const muzzleY = f.y + 36;
            this.projectiles.push({
              x: muzzleX,
              y: muzzleY,
              w: 18,
              h: 8,
              vx: f.face * 9.8,
              vy: 0,
              life: 75,
              kind: 'rocket',
              owner: f,
              dir: f.face,
              d: { dmg: 14.5, bk: 8.2, ks: 0.25, ang: -42, heavy: true },
              hit: 0,
            });
            this.burst(muzzleX, muzzleY, '#ffb030', 8, 5, 14);
            f.vx -= f.face * 2.6;
            if (f.ammo === 0) {
              f.reloadDur = 54;
              f.reloadT = 54;
              sound.reloadStart();
            }
          }
        } else if (!f.pickupT && (!a || (a.spec.k === 'l' && a.t >= a.spec.dur * 0.55))) {
          const neutralJab = just.light && !i.dash && !i.down && !i.jump && dir === 0;
          if (f.moves && ((neutralJab && !a) || (just.heavy && !a))) {
            const up = just.heavy && i.jump && !i.down;
            if (!up || !f.upSpecUsed) {
              const m = just.heavy
                ? i.down ? f.moves.specialDown() : up ? f.moves.specialUp() : f.moves.specialNeutral()
                : f.moves.neutralAttack();
              const mk = up ? 'upSpec' : just.heavy ? 'sig' : 'jab';
              activate(f, m, this);
              f.moveKind = mk;
              f.atk = {spec:{...m, individual:true, downSpecial:just.heavy && i.down, moveKind:mk, k:just.heavy?'h':'l',
                heavy:just.heavy, dur:m.effect==='hover'?120:m.dur}, t:0,hits:{},ar:0,armor:false};
              sound.tone(just.heavy?330:480,0.09,'triangle',80,0.06);
              if (just.heavy) this.floatTexts.push({t:m.name,x:f.cx,y:f.y-12,l:45,m:45});
            }
          } else if (just.light && !i.dash && !(f.moves && neutralJab)) {
            const air = !f.on;
            const P = f.S.power;
            const isSaber = f.d.anatomy.weaponType === 'saber' && f.wpn <= 0;
            let p;
            let mk = 'jab';

            if (air) {
              if (i.jump) {
                mk = 'uair';
                p = { a: [4, 12] as [number, number], hb: { fx: -22, y: -124, w: 56, h: 54 }, dmg: 6.2, bk: 4.5, ks: 0.12, ang: -82, dur: 22 };
              } else if (i.down) {
                mk = 'dair';
                p = { a: [5, 16] as [number, number], hb: { fx: -20, y: -6, w: 44, h: 40 }, dmg: 7.4, bk: 4.6, ks: 0.14, ang: 78, dur: 25 };
              } else if (dir !== 0 && dir !== f.face) {
                mk = 'bair';
                p = { a: [5, 13] as [number, number], hb: { fx: -62, y: -82, w: 54, h: 38 }, dmg: 6.8, bk: 4.8, ks: 0.13, ang: -158, dur: 23 };
              } else if (dir !== 0 && dir === f.face) {
                mk = 'fair';
                p = { a: [4, 13] as [number, number], hb: { fx: 12, y: -84, w: isSaber ? 64 : 50, h: 40 }, dmg: 5.8, bk: 4.0, ks: 0.11, ang: -28, dur: 20 };
              } else {
                mk = 'nair';
                p = { a: [4, 14] as [number, number], hb: { fx: -28, y: -88, w: 56, h: 56 }, dmg: 5.0, bk: 3.4, ks: 0.09, ang: -38, dur: 21 };
              }
            } else {
              if (i.jump) {
                mk = 'utilt';
                p = { a: [4, 12] as [number, number], hb: { fx: -12, y: -122, w: 56, h: 66 }, dmg: 5.4, bk: 4.0, ks: 0.1, ang: -84, dur: 20 };
              } else if (i.down) {
                mk = 'dtilt';
                p = { a: [4, 11] as [number, number], hb: { fx: 10, y: -36, w: isSaber ? 60 : 50, h: 32 }, dmg: 4.6, bk: 3.6, ks: 0.08, ang: -68, dur: 18 };
              } else if (dir !== 0) {
                mk = 'ftilt';
                p = { a: [4, 12] as [number, number], hb: { fx: 10, y: -78, w: isSaber ? 66 : 50, h: 36 }, dmg: 5.2, bk: 3.4, ks: 0.11, ang: -24, dur: 19 };
              } else {
                mk = 'jab';
                const fin = f.jabStep % 3 === 2;
                p = {
                  a: [3, 10] as [number, number],
                  hb: { fx: 10, y: -76, w: isSaber ? 58 : 46, h: 36 },
                  dmg: fin ? 5.6 : 3.8,
                  bk: fin ? 4.8 : 2.3,
                  ks: fin ? 0.14 : 0.07,
                  ang: fin ? -30 : -18,
                  dur: fin ? 22 : 16,
                };
                f.jabStep++;
              }
            }

            p.dmg *= P;
            f.moveKind = mk;
            sound.tone(420 + (f.jabStep % 3) * 70, 0.07, 'square', -120, 0.05);
            const { dur, ...phase } = p;
            f.atk = { spec: { k: 'l', moveKind: mk, dur, ph: [phase], sp: [] }, t: 0, hits: {}, armor: false, ar: 0 };
          } else if (just.heavy && !a) {
            // Up-Special Recovery Move (Up + Heavy)
            if (i.jump && !f.upSpecUsed) {
              f.upSpecUsed = true;
              f.floating = false;
              f.fastFall = false;
              f.vy = f.isFloatZoner ? -14.8 : -14.5;
              if (dir !== 0) f.vx = dir * 5.2;
              f.on = false;
              f.moveKind = 'upSpec';
              f.squashX = 0.78;
              f.squashY = 1.28;
              if (f.isFloatZoner) {
                sound.tone(540, 0.25, 'triangle', 420, 0.07);
                this.burst(f.cx, f.y + f.h, f.d.palette.accent.highlight || '#98ffe0', 14, 5, 18);
                f.atk = {
                  spec: {
                    k: 'h',
                    moveKind: 'upSpec',
                    dur: 32,
                    heavy: true,
                    ph: [{ a: [2, 18], hb: { fx: -34, y: -110, w: 68, h: 98 }, dmg: 8.5 * f.S.power, bk: 5.8, ks: 0.18, ang: -75, fx: 'gold' }],
                    sp: [],
                  },
                  t: 0,
                  hits: {},
                  armor: false,
                  ar: 0,
                };
              } else {
                sound.sword();
                this.burst(f.cx, f.y + f.h, '#ffd43b', 12, 5, 16);
                f.atk = {
                  spec: {
                    k: 'h',
                    moveKind: 'upSpec',
                    dur: 34,
                    heavy: true,
                    ph: [{ a: [3, 20], hb: { fx: -6, y: -120, w: 64, h: 94 }, dmg: 9.8 * f.S.power, bk: 6.4, ks: 0.22, ang: -78, fx: 'sword' }],
                    sp: [],
                  },
                  t: 0,
                  hits: {},
                  armor: false,
                  ar: 0,
                };
              }
            } else {
              const s = f.d.sig;
              f.moveKind = 'sig';
              f.atk = {
                spec: {
                  k: 'h',
                  moveKind: 'sig',
                  dur: s.dur,
                  heavy: true,
                  hop: s.hop,
                  ph: s.ph.map((p) => ({ ...p, dmg: p.dmg ? p.dmg * f.S.power : 0 })),
                  sp: s.sp,
                },
                t: 0,
                hits: {},
                armor: false,
                ar: 0,
              };
              if (f.d.signatureType === 'uppercut' || f.d.signatureType === 'tiger' || f.d.signatureType === 'fencing') sound.sword();
              else if (f.d.signatureType === 'chainsaw') sound.saw();
              else sound.tone(160, 0.18, 'sawtooth', 100, 0.07);
            }
          }
        }
      }
    }

    // Active attack processing
    if (f.atk && free) {
      const a = f.atk;
      const sp = a.spec;
      const t = ++a.t;
      a.armor = sp.ph.some((p) => Boolean(p.armor) && t >= p.a[0] && t <= p.a[1]);
      if (sp.hop && t === sp.hop.t) {
        f.vy = sp.hop.vy;
        f.on = false;
      }
      for (const s of sp.sp) {
        if (s.t === t) {
          const p = s.p;
          const travelDir = p.back ? -f.face : f.face;
          const spawnDir = sp.individual ? travelDir : f.face;
          const x = spawnDir > 0 ? f.cx + p.fx : f.cx - p.fx - p.w;
          this.projectiles.push({
            x,
            y: f.y + f.h + p.y,
            w: p.w,
            h: p.h,
            vx: p.vx * travelDir,
            vy: p.vy ?? 0,
            bounces: p.bounces ?? 0,
            life: p.life,
            kind: p.kind,
            owner: f,
            dir: p.back ? -f.face : f.face,
            d: { ...p, dmg: p.dmg * f.S.power, heavy: true },
            hit: 0,
            ownerColor: f.d.palette.accent.base,
            ownerHighlight: f.d.palette.accent.highlight,
          });
          if (p.kind === 'wall') sound.heavy();
          if (p.kind === 'pulse') sound.tone(600, 0.2, 'sawtooth', 300, 0.06);
          if (p.kind === 'bars') sound.tone(180, 0.2, 'square', -80, 0.08);
        }
      }

      sp.ph.forEach((p, idx) => {
        if (t < p.a[0] || t > p.a[1]) return;
        if (p.mv != null && p.mv >= 0 && p.hb) f.vx = f.face * p.mv;
        if (p.fx === 'saw' && t % 3 === 0) {
          this.particles.push({
            x: f.cx + f.face * 38,
            y: f.y + f.h * 0.48,
            vx: f.face * 3.5 + this.vRand() * 3 - 1,
            vy: -this.vRand() * 3.2,
            l: 16,
            m: 16,
            col: '#ffb020',
            z: 3.5,
            shape: 'streak',
          });
          if (t % 6 === 0) sound.saw();
        }
        // Luminous Saber Light Trails (Bolívar & Agile Swordsmen)
        if ((p.fx === 'sword' || (f.d.anatomy.weaponType === 'saber' && f.wpn <= 0)) && t % 2 === 0) {
          this.particles.push({
            x: f.cx + f.face * (26 + this.vRand() * 24),
            y: f.y + f.h * (0.28 + this.vRand() * 0.34),
            vx: f.face * (2.6 + this.vRand() * 2.2),
            vy: (this.vRand() - 0.5) * 2.4,
            l: 14,
            m: 14,
            col: t % 4 === 0 ? f.d.palette.accent.highlight || '#fff3a0' : '#7dd3fc',
            z: 3.2 + this.vRand() * 2,
            shape: t % 4 === 0 ? 'streak' : 'diamond',
          });
        }
        if (!p.hb || sp.individual) return;
        const r = f.rect(p.hb, f.wpn > 0 && f.wk === 'case' && sp.k === 'l');
        this.debugHitboxes.push({ ...r, kind: sp.k });
        const key = `${idx}:${p.every ? Math.floor((t - p.a[0]) / p.every) : 0}`;
        if (a.hits[key]) return;
        if (ov(r, o)) {
          const dmgBoost = f.wpn > 0 && f.wk === 'case' && sp.k === 'l' ? 1.35 : 1;
          const hitSpec = {
            dmg: (p.dmg || 4) * dmgBoost,
            bk: p.bk || 3,
            ks: p.ks || 0.1,
            ang: p.ang ?? -25,
            heavy: Boolean(sp.heavy && !p.every),
            every: p.every,
          };
          const hitDir = sp.moveKind === 'bair' ? -f.face : f.face;
          if (this.hurt(o, f, hitSpec, hitDir, 'melee', r)) a.hits[key] = true;
        }
      });

      // Agile Swordsman whiff recovery frames (risk-reward spacing!)
      if (!a.whiffChecked && f.isAgileSwordsman && sp.k === 'h' && sp.moveKind === 'sig' && t === sp.dur - 6) {
        a.whiffChecked = true;
        if (Object.keys(a.hits).length === 0) {
          sp.dur += 6;
        }
      }

      if (!sp.individual && t >= sp.dur) {
        f.atk = null;
        f.moveKind = '';
      }
    }

    if (f.atk?.spec.effect === 'hover') {
      f.vy = i.down ? 1 : i.jump ? -3 : -1.5;
      f.vx = (Number(i.right)-Number(i.left))*4;
    }
    // Physics & Stage Collisions
    const wasOn = f.on;
    if (f.dashT <= 0 && !f.pend) {
      f.vy = Math.min(f.vy + 0.55 * this.gravityFactor * this.activeMatchCfg.gravityMultiplier, 14.5);
    }
    if (free && !f.on && f.wall !== 0 && f.vy > 2.2 && ((f.wall === 1 && i.right) || (f.wall === -1 && i.left))) {
      f.vy = 2.2;
    }

    const M = this.main;
    f.x += f.vx;
    if (f.x + f.w > M.x && f.x < M.x + M.w && f.y + f.h > M.y && f.y < M.y + M.h) {
      if (f.vx > 0) f.x = M.x - f.w;
      else if (f.vx < 0) f.x = M.x + M.w;
      f.vx = 0;
    }
    f.wall = 0;
    if (f.y + f.h > M.y + 3 && f.y < M.y + M.h) {
      if (Math.abs(f.x + f.w - M.x) < 2) f.wall = 1;
      else if (Math.abs(f.x - (M.x + M.w)) < 2) f.wall = -1;
    }

    const pb = f.y + f.h;
    f.y += f.vy;
    f.on = false;
    if (f.x + f.w > M.x && f.x < M.x + M.w && f.y + f.h > M.y && f.y < M.y + M.h) {
      if (f.vy >= 0 && pb <= M.y + 2) {
        f.y = M.y - f.h;
        f.vy = 0;
        f.on = true;
        f.pl = null;
      } else if (f.vy < 0) {
        f.y = M.y + M.h;
        f.vy = 0;
      }
    }
    if (!f.on) {
      for (const p of this.plats) {
        if (f.vy >= 0 && f.dropT <= 0 && pb <= p.y + 2 && f.y + f.h >= p.y && f.x + f.w > p.x && f.x < p.x + p.w) {
          f.y = p.y - f.h;
          f.vy = 0;
          f.on = true;
          f.pl = p;
          break;
        }
      }
    }
    if (f.atk?.spec.effect === 'ledge' && !f.on && f.vy >= -5) {
      const edge = [M,...this.plats].find(p => Math.abs(f.y + 16 - p.y) <= 13 &&
        (f.face > 0 ? Math.abs(f.x+f.w-p.x) : Math.abs(f.x-p.x-p.w)) < 14);
      if (edge) {
        f.x=f.face>0?edge.x+1:edge.x+edge.w-f.w-1; f.y=edge.y-f.h;
        f.on=true; f.vy=0; f.vx=0; f.atk=null; f.moveKind='';
        f.pl=edge===M?null:edge;
      }
    }
    if (f.on) {
      f.airJ = 2;
      f.floatT = f.floatMax;
      f.floating = false;
      f.fastFall = false;
      f.upSpecUsed = false;
      if (!wasOn) {
        f.squashX = 1.3;
        f.squashY = 0.74;
        f.landT = 7;
        sound.land();
        for (let k = -1; k <= 1; k += 2) {
          this.particles.push({
            x: f.cx + k * 6,
            y: f.y + f.h - 2,
            vx: k * (1.4 + this.vRand()),
            vy: -0.6 - this.vRand() * 0.6,
            l: 16,
            m: 16,
            col: '#cbd5e1',
            z: 5,
            dust: true,
          });
        }
      } else if (Math.abs(f.vx) > 3.2 && this.T % 10 === 0) {
        // Sprint footstep dust & subtle step sound
        sound.footstep();
        this.particles.push({
          x: f.cx - f.face * 6,
          y: f.y + f.h - 2,
          vx: -f.face * 0.9,
          vy: -0.5,
          l: 14,
          m: 14,
          col: '#94a3b8',
          z: 4,
          dust: true,
        });
      }
    } else {
      f.crouch = false;
    }

    // Victory Pose progression once winner stands safely on stage
    if (isMatchWinner && f.on) {
      f.winning = true;
      f.winT++;
      f.vx *= 0.72;
      if (Math.abs(f.vx) < 0.08) f.vx = 0;
      if (this.T % 7 === 0) {
        this.particles.push({
          x: f.cx + (this.vRand() - 0.5) * 44,
          y: f.y + f.h * (0.2 + this.vRand() * 0.65),
          vx: (this.vRand() - 0.5) * 1.4,
          vy: -1.4 - this.vRand() * 1.6,
          l: 24,
          m: 24,
          col: this.vRand() < 0.5 ? '#ffd23f' : f.d.palette.accent.highlight || '#ffffff',
          z: 3.5,
        });
      }
    }

    // Blast zone KO check (skip if match already decided so winner cannot die during victory pose)
    if (!this.winner && (f.cx < BZ.l || f.cx > BZ.r || f.y < BZ.t || f.y > BZ.b)) {
      this.triggerKO(f, o);
    }
  }

  private triggerKO(f: FighterSim, attacker: FighterSim) {
    const px = clamp(f.cx, 0, W);
    const py = clamp(f.y + f.h * 0.48, 0, H);
    const a0 = Math.atan2(H / 2 - py, W / 2 - px);
    for (let k = 0; k < 56; k++) {
      const a = a0 + (this.vRand() - 0.5) * 1.4;
      const v = 2 + this.vRand() * 9;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        l: 50,
        m: 50,
        col: [f.d.palette.accent.base, '#fff', f.d.palette.suit.base, '#ffb030'][k % 4],
        z: 3 + this.vRand() * 5,
      });
    }
    sound.ko();
    this.burst(px, py, '#fff', 26, 10, 30);
    this.triggerCrowdReaction(
      'win',
      clamp(f.cx, this.main.x + 60, this.main.x + this.main.w - 60),
      38,
      attacker.d.palette.accent.base,
      attacker.d.palette.accent.highlight,
      96
    );
    this.popMsg('KO!', 48);
    this.shake = 22;
    this.freeze = this.config.video.hitstopEnabled ? 6 : 0;

    if (this.mode !== 'training') {
      f.stocks--;
    } else {
      f.stocks = 99;
    }
    attacker.kosDelivered++;
    if (this.campaign && !this.isReplaying && f.pi === 1) this.campaign.kos++;
    this.vibrate(0, 500, 1, 1);
    this.vibrate(1, 500, 1, 1);
    f.field=null; f.rage=0; f.speedTime=0;
    f.koVisual = { x: clamp(f.cx, this.main.x + 50, this.main.x + this.main.w - 50), tick: this.T };
    f.dead = f.stocks > 0 ? 75 : 9999;
    f.atk = null;
    f.x = -999;
    f.y = -999;
    f.pend = null;
  }

  private getHazardPhase(): number {
    if (this.activeMatchCfg.hazardFrequency === 'off') return 0;
    const m = this.T % this.hazardCycle;
    return m >= this.hazardCycle - 120 ? 1 : this.T >= this.hazardCycle && m < this.stage.hazardDur ? 2 : 0;
  }

  private updateStageHazards() {
    for (const p of this.plats) {
      if (p.amp && p.by !== undefined && p.ph !== undefined) {
        p.y = p.by + Math.sin(this.T / 50 + p.ph) * p.amp;
      }
    }
    const ph = this.getHazardPhase();
    if (ph === 0) return;
    const m = this.T % this.hazardCycle;
    if (m === this.hazardCycle - 120) sound.tone(880, 0.3, 'square', 0, 0.07);

    const nudge = (f: FighterSim, dx: number) => {
      if (!ov({ x: f.x + dx, y: f.y, w: f.w, h: f.h }, this.main)) f.x += dx;
    };

    if (['blanca', 'moneda', 'eliseo', 'moncloa'].includes(this.stage.id) && ph === 2) {
      const windDir = this.stage.id === 'moneda' ? (Math.sin(this.T * 0.02) >= 0 ? 1 : -1) : 0;
      this.fighters.forEach((f) => {
        if (f.dead <= 0) nudge(f, windDir !== 0 ? windDir * 1.15 : (f.cx < W / 2 ? -1 : 1) * 1.35);
      });
      if (m % 2 === 0) {
        const x = this.vRand() * W;
        this.particles.push({
          x,
          y: this.vRand() * H,
          vx: (windDir !== 0 ? windDir : x < W / 2 ? -1 : 1) * (7 + this.vRand() * 5),
          vy: 0,
          l: 28,
          m: 28,
          col: '#dfe8f5',
          z: 3,
          shape: 'streak',
        });
      }
    } else if (['narino', 'mexico', 'pizarro', 'miraflores'].includes(this.stage.id) && ph === 2 && m % 80 === 0) {
      [
        [20, 8.5, 1],
        [W - 58, -8.5, -1],
      ].forEach(([x, vx, dir]) => {
        this.projectiles.push({
          x,
          y: this.main.y - 36,
          w: 36,
          h: 36,
          vx,
          vy: 0,
          life: 160,
          kind: 'sonic',
          owner: null,
          dir,
          d: { dmg: 9, bk: 5.5, ks: 0.18, ang: -55, heavy: true },
          hit: 0,
          done: [],
        });
        this.burst(x + (dir > 0 ? 44 : -6), this.main.y - 18, '#ffcf6a', 14, 6);
      });
      sound.heavy();
      this.shake = Math.max(this.shake, 5);
    } else if (['rosada', 'planalto'].includes(this.stage.id) && ph === 2) {
      this.gravityFactor = 0.62;
      this.fighters.forEach((f) => {
        if (f.dead <= 0) nudge(f, (f.cx < W / 2 ? -1 : 1) * 0.9);
      });
      if (m % 90 === 0) sound.tone(200, 0.35, 'sawtooth', 300, 0.08);
      for (let k = 0; k < 2; k++) {
        this.particles.push({ x: this.vRand() * W, y: -10, vx: this.vRand() * 2 - 1, vy: 1.2 + this.vRand(), l: 220, m: 220, col: '#f6f2e0', z: 6 });
      }
    } else if (['kantei', 'downing'].includes(this.stage.id) && ph === 2 && m % 35 === 0) {
      const lx = W / 2 + Math.sin(this.T * 0.04) * 460;
      for (const f of this.fighters) {
        if (f.dead <= 0 && Math.abs(f.cx - lx) < 34) {
          this.hurt(f, null, { dmg: 5, bk: 4.5, ks: 0.12, ang: -70, heavy: true }, f.cx >= lx ? 1 : -1);
        }
      }
    }
  }

  // Ambas físicas ya avanzaron. Estas mismas cajas quedan disponibles para Canvas
  // incluso durante hitstop. Reunirlas primero permite intercambios simultáneos.
  private resolveIndividualStrikes() {
    const contacts: Array<() => void> = [];
    for (const f of this.fighters) {
      const a = f.atk;
      if (!a?.spec.individual || f.dead > 0) continue;
      const o = this.fighters[1-f.pi];
      a.spec.ph.forEach((p,idx) => {
        if (!p.hb || a.t<p.a[0] || a.t>p.a[1]) return;
        const boosted = a.spec.k==='l' && f.wpn>0 && f.wk==='case';
        const box=strikeBox(f,p,a.t,boosted);
        this.strikes.push({...box, color:f.d.palette.accent.base,
          weapon:f.d.id==='alejandro'?'sarissa':f.d.anatomy.weaponType,
          direction:p.rear?-f.face:f.face});
        this.debugHitboxes.push({...box,kind:a.spec.k});
        if (a.hits[idx] || o.dead || !this.collision.bodyTouches(o,this.T,box)) return;
        const dir = p.rear ? -f.face : f.face;
        const hit = {dmg:(p.dmg ?? 4)*f.S.power*(boosted?1.35:1),bk:p.bk ?? 3,ks:p.ks ?? .12,ang:p.ang ?? -30,heavy:a.spec.heavy};
        contacts.push(() => {
          if(this.hurt(o,f,hit,dir,'melee',box,a.spec.pierce)) a.hits[idx]=true;
        });
      });
    }
    contacts.forEach(resolve=>resolve());
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const prevY = p.y;
      p.x += p.vx;
      p.y += p.vy || 0;
      if (p.kind === 'orb' && !p.bounces) p.vy += 0.24;
      if (p.kind === 'arco') p.vy += 0.18;
      if (p.kind === 'throw') p.vy += 0.35;
      if ((p.kind === 'pulse' || p.kind === 'orb') && p.bounces && p.bounces > 0) {
        p.vy += 0.24;
        const hitMain = p.vy >= 0 && p.y + p.h >= this.main.y && prevY + p.h <= this.main.y + 8 && p.x + p.w > this.main.x && p.x < this.main.x + this.main.w;
        const hitPlat =
          !hitMain && p.vy >= 0
            ? this.plats.find((pl) => p.y + p.h >= pl.y && prevY + p.h <= pl.y + 8 && p.x + p.w > pl.x && p.x < pl.x + pl.w)
            : undefined;
        if (hitMain || hitPlat) {
          const platY = hitMain ? this.main.y : hitPlat!.y;
          p.y = platY - p.h;
          p.vy = -5.8;
          p.bounces--;
          this.burst(p.x + p.w / 2, platY, p.ownerHighlight || '#98ffe0', 6, 3, 12);
          sound.tone(720, 0.08, 'sine', 240, 0.04);
        }
      }
      if (p.kind === 'rocket' && this.T % 2 === 0) {
        this.particles.push({ x: p.x, y: p.y + 4, vx: -p.vx * 0.15, vy: -0.4, l: 16, m: 16, col: '#cbd5e1', z: 5, shape: 'puff' });
      }
      p.life--;

      const targets = this.fighters.filter((f) => f !== p.owner && f.dead <= 0);
      if (targets.some(o => (o.field?.kind==='barrier' && shotTouches(p,o.field)) ||
          (o.atk?.spec.effect==='testudo' && shotTouches(p,o)))) {
        this.projectiles.splice(i,1);
        continue;
      }
      if (!p.hit) {
        for (const o of targets) {
          if (p.done?.includes(o)) continue;
          if ((p.owner?.moves ? this.collision.bodyTouches(o,this.T,p) : shotTouches(p,o)) && this.hurt(o, p.owner, p.d, p.dir, 'projectile', p)) {
            if (p.kind === 'rocket') {
              sound.explosion();
              this.burst(p.x, p.y, '#ffb030', 26, 8, 28);
              this.shake = Math.max(this.shake, 14);
            }
            if (p.done) p.done.push(o);
            else {
              p.hit = 1;
              if (p.kind !== 'wall' && p.kind !== 'bars') p.life = 0;
            }
            break;
          }
        }
      }
      if (p.kind === 'pulse' && this.T % 2 === 0) {
        this.particles.push({
          x: p.x + p.w / 2 + (this.vRand() - 0.5) * 6,
          y: p.y + p.h / 2 + (this.vRand() - 0.5) * 6,
          vx: -p.vx * 0.18,
          vy: (this.vRand() - 0.5) * 0.9,
          l: 14,
          m: 14,
          col: p.ownerHighlight || p.ownerColor || '#25d999',
          z: 3.4,
          shape: 'diamond',
        });
      }
      if (p.life <= 0 || p.x < -120 || p.x > W + 120 || p.y > H + 120) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateItems() {
    const rateMap = { off: 0, normal: 660, chaos: 260 };
    const interval = rateMap[this.activeMatchCfg.itemSpawnRate];
    if (interval > 0 && this.T > 0 && this.T % interval === 0 && this.items.length < 3) {
      const kinds = ['mg', 'rocket', 'case'];
      const kind = kinds[Math.floor(this.rand() * kinds.length)];
      this.items.push({ x: this.main.x + 80 + this.rand() * (this.main.w - 160), y: -30, w: 26, h: 20, vy: 0, kind });
    }
    for (const it of this.items) {
      if (it.y + it.h < this.main.y) {
        it.vy = Math.min(it.vy + 0.3, 5);
        it.y += it.vy;
        if (it.y + it.h >= this.main.y) it.y = this.main.y - it.h;
      }
    }
  }

  step(isAttract = false) {
    if (!isAttract && !this.isReplaying) this.pollGamepads(true);

    // Particles & Floating text
    for (const pt of this.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.96;
      if (pt.shell || pt.mag) {
        pt.vy += 0.25;
        if (pt.y >= this.main.y - 2 && pt.x > this.main.x && pt.x < this.main.x + this.main.w && pt.vy > 0) {
          pt.vy *= -0.45;
        }
      } else if (pt.ex) {
        pt.vy = pt.vy * 0.96 - 0.03;
      }
      pt.l--;
    }
    this.particles = this.particles.filter((p) => p.l > 0);
    // Crowd particles & excitement simulation
    for (const cp of this.crowdParticles) {
      cp.x += cp.vx;
      cp.y += cp.vy;
      if (cp.kind === 'confetti' || cp.kind === 'pennant') {
        cp.vx = cp.vx * 0.97 + Math.sin(this.T * 0.16 + cp.phase) * 0.06;
        cp.vy = Math.min(cp.vy + 0.065, 1.8);
      } else if (cp.kind === 'cheer') {
        cp.vx *= 0.96;
        cp.vy *= 0.96;
      }
      cp.l--;
    }
    this.crowdParticles = this.crowdParticles.filter((cp) => cp.l > 0);
    if (this.crowd.cheerTimer > 0) {
      this.crowd.cheerTimer--;
      if (this.crowd.cheerTimer === 0 && !this.winner) {
        this.crowd.mood = this.crowd.excitement > 0.35 ? 'hype' : 'calm';
      }
    }
    this.crowd.excitement = Math.max(0.08, this.crowd.excitement * 0.992);
    if (this.crowd.cheerTimer <= 0 && this.crowd.excitement < 0.25) {
      this.crowd.mood = 'calm';
    }
    // Occasional ambient press flash when calm
    if (this.T % 75 === 0 && this.vRand() < 0.55) {
      this.triggerCrowdReaction('calm', this.main.x + this.vRand() * this.main.w, 1);
    }

    this.floatTexts.forEach((ft) => ft.l--);
    this.floatTexts = this.floatTexts.filter((ft) => ft.l > 0);
    if (this.shake > 0) this.shake *= 0.88;
    if (this.shake < 0.3) this.shake = 0;

    if (this.cine) {
      if (++this.cine.t >= 34) {
        const c = this.cine;
        this.cine = null;
        this.telegraph = { f: c.f, o: c.o, t: 0, zones: this.getUltZones(c.f, c.o) };
        c.f.inv = Math.max(c.f.inv, 24);
        this.shake = 12;
      }
      return;
    }

    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (this.slowMo > 0) {
      this.slowMo--;
      if (this.slowMo % 3 !== 0) return;
    }

    this.T++;

    // Advance deterministic replay input keyframes for frame T
    if (this.isReplaying && this.replayData) {
      while (
        this.replayCursor < this.replayData.keyframes.length &&
        this.replayData.keyframes[this.replayCursor].f <= this.T
      ) {
        const kf = this.replayData.keyframes[this.replayCursor++];
        this.replayCurrentP1 = actionsToInput(kf.p1);
        this.replayCurrentP2 = actionsToInput(kf.p2);
      }
    }

    if (!isAttract && this.T === 1) {
      this.popMsg(
        this.isReplaying ? 'REPETICIÓN' : this.mode === 'training' ? 'ENTRENAMIENTO' : 'MISSION START',
        85
      );
    }
    if (this.bannerMsg.l > 0) this.bannerMsg.l--;

    this.strikes = [];
    this.debugHitboxes = [];
    this.gravityFactor = 1;
    this.updateStageHazards();
    if (this.fighters.length >= 2) {
      this.updateFighter(this.fighters[0], this.fighters[1]);
      this.updateFighter(this.fighters[1], this.fighters[0]);
      for (const f of this.fighters) if (f.rage) f.heelBox=this.collision.rearHeel(f,this.T);
      this.resolveIndividualStrikes();

      if (!isAttract && !this.isReplaying && this.mode !== 'training') {
        const p1Acts = inputToActions(this.fighters[0].curIn);
        const p2Acts = inputToActions(this.fighters[1].curIn);
        const p1Key = p1Acts.join(',');
        const p2Key = p2Acts.join(',');
        if (this.T === 1 || p1Key !== this.lastRecP1Key || p2Key !== this.lastRecP2Key) {
          this.recordedKeyframes.push({ f: this.T, p1: p1Acts, p2: p2Acts });
          this.lastRecP1Key = p1Key;
          this.lastRecP2Key = p2Key;
        }
      }
    }
    this.updateProjectiles();
    if (!isAttract) this.updateItems();
    this.updateUltEffects();

    if (this.telegraph && ++this.telegraph.t >= 20) {
      const q = this.telegraph;
      this.telegraph = null;
      this.fireUlt(q.f, q.o);
      this.shake = 10;
    }

    if (isAttract) {
      // Auto-respawn in attract mode
      this.fighters.forEach((f) => {
        if (f.stocks <= 0) {
          f.stocks = 3;
          f.spawn(false, this.activeMatchCfg, this.main.x, this.main.y, this.main.w);
        }
      });
      return;
    }

    // Music tick
    const danger = this.fighters.some((f) => f.stocks === 1 || f.pct > 150);
    sound.tickMusic(danger);

    // Win check
    if (this.mode !== 'training') {
      const dead = this.fighters.find((f) => f.stocks <= 0);
      if (dead && !this.winner) {
        this.winner = this.fighters.find((f) => f !== dead) || null;
        this.endT = 135;
        sound.win();
        if (this.winner) {
          this.triggerCrowdReaction(
            'win',
            this.main.x + this.main.w / 2,
            46,
            this.winner.d.palette.accent.base,
            this.winner.d.palette.accent.highlight,
            120
          );
        }
      }
      if (this.winner && this.T % 8 === 0) {
        this.triggerCrowdReaction(
          'win',
          this.main.x + 40 + this.vRand() * (this.main.w - 80),
          10,
          this.winner.d.palette.accent.base,
          this.winner.d.palette.accent.highlight,
          24
        );
      }

      if (this.isReplaying) {
        if (
          !this.replayEnded &&
          ((this.winner && --this.endT <= 0) || (this.replayData && this.T >= this.replayData.totalFrames))
        ) {
          this.replayEnded = true;
          this.onReplayEnd?.();
        }
        return;
      }

      if (this.winner && --this.endT <= 0) {
        const w = this.winner;
        const loser = this.fighters.find((f) => f !== w)!;
        const summary: MatchSummary = {
          winnerPi: w.pi,
          winnerId: w.d.id,
          winnerName: w.d.name,
          loserName: loser.d.name,
          durationSec: Math.round(this.T / 60),
          kosDelivered: w.kosDelivered,
          damageDealt: Math.round(w.damageDealt),
          perfectDodges: w.perfectDodges,
          maxCombo: w.maxCombo,
        };
        if (this.currentMatchMeta) {
          const replay: MatchReplayData = {
            version: 3,
            recordedAt: new Date().toISOString(),
            seed: this.currentMatchMeta.seed,
            mode: this.mode,
            p1Id: this.currentMatchMeta.p1Id,
            p2Id: this.currentMatchMeta.p2Id,
            stageIdx: this.currentMatchMeta.stageIdx,
            vsAI: this.currentMatchMeta.vsAI,
            campaignRound: this.currentMatchMeta.campaignRound,
            matchConfig: this.currentMatchMeta.matchConfig,
            totalFrames: this.T,
            summary,
            keyframes: this.recordedKeyframes,
          };
          this.onReplaySaved?.(replay);
        }
        this.onMatchEnd?.(summary);
      }
    }
  }

  render(targetCanvas: HTMLCanvasElement) {
    const world: WorldRenderContext = {
      T: this.T,
      W,
      H,
      stage: this.stage,
      main: this.main,
      plats: this.plats,
      hzPhase: this.getHazardPhase(),
      hzMod: this.T % this.hazardCycle,
      hzDur: this.stage.hazardDur,
      fighters: this.fighters,
      projectiles: this.projectiles,
      items: this.items,
      particles: this.particles,
      crowd: this.crowd,
      crowdParticles: this.crowdParticles,
      ults: this.ults,
      cine: this.cine ? { t: this.cine.t, f: this.cine.f } : null,
      telegraph: this.telegraph ? { t: this.telegraph.t, zones: this.telegraph.zones } : null,
      shake: this.shake,
      bannerMsg: this.bannerMsg,
      floatTexts: this.floatTexts,
      winnerPi: this.winner ? this.winner.pi : null,
      hitboxes: this.debugHitboxes, strikes:this.strikes,
    };
    this.renderer.renderWorld(targetCanvas, world, this.config);
  }

  getHudSnapshot(): HudSnapshot {
    const ph = this.getHazardPhase();
    const m = this.T % this.hazardCycle;
    return {
      fighters: this.fighters.map((f) => ({
        pi: f.pi,
        id: f.d.id,
        name: f.d.name,
        accent: f.d.palette.accent.base,
        pct: Math.floor(f.pct),
        stocks: f.stocks,
        maxStocks: f.maxStocks,
        vote: Math.floor(f.vote),
        dashReady: f.dashCD <= 0,
        weaponKind: f.wpn > 0 ? f.wk : null,
        weaponTimer: Math.ceil(f.wpn / 60),
        ammo: f.ammo,
        maxAmmo: f.maxAmmo,
        reloading: f.reloadT > 0,
        reloadProgress: f.reloadT > 0 ? 1 - f.reloadT / Math.max(1, f.reloadDur) : 0,
        combo: f.combo,
        comboMultiplier: this.getComboMultiplier(f.combo),
        comboTimer: f.cT > 0 ? f.cT / f.cMax : 0,
        maxCombo: f.maxCombo,
        hitStun: f.stun,
        floating: f.floating,
        isAI: f.ai,
        isBoss: f.boss,
        hitFlash: f.hitFlash,
      })),
      roundTimeSec: Math.floor(this.T / 60),
      stageIdx: this.stageIdx,
      stageName: this.stage.name,
      stageCountry: this.stage.country,
      hazardWarning: ph === 1 ? `${this.stage.hazardName.toUpperCase()} en ${Math.ceil((this.hazardCycle - m) / 60)}s` : null,
      hazardActive: ph === 2 ? this.stage.hazardMsg : null,
      bannerText: null,
      campaignRound: this.campaign ? this.campaign.round + 1 : null,
      campaignScore: this.campaign ? this.campaign.score : 0,
      winnerPi: this.winner ? this.winner.pi : null,
    };
  }
}
