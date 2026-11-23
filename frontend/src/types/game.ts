export type GameScreenState =
  | 'TITLE'
  | 'SELECT'
  | 'VS'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'REPLAY'
  | 'CENSURE'
  | 'CHAMPION';

export type GameMode = 'versus' | 'campaign' | 'training';

export type PixelResolutionPreset = 'retro' | 'modern' | 'ultra';
export type CrtFilterPreset = 'none' | 'scanlines' | 'pvm';
export type ParticleDensity = 'low' | 'high' | 'extreme';
export type StageTime = 'cycle' | 'day' | 'night';
export type HazardFrequency = 'off' | 'normal' | 'frenetic';
export type ItemSpawnRate = 'off' | 'normal' | 'chaos';
export type TouchMode = 'auto' | 'on' | 'off';

export type PlayerAction = 'left' | 'right' | 'jump' | 'down' | 'light' | 'heavy' | 'dash' | 'ult' | 'reload';

export type KeyBindings = Record<PlayerAction, string[]>;

export interface GameConfig {
  video: {
    pixelPreset: PixelResolutionPreset;
    adaptiveQuality?: boolean;
    maxDpr?: 1 | 1.5 | 2;
    stageTime?: StageTime;
    crtFilter: CrtFilterPreset;
    dynamicLighting: boolean;
    pixelOutlines: boolean;
    particleDensity: ParticleDensity;
    shakeIntensity: number; // 0 to 1.5
    hitstopEnabled: boolean;
    showHitboxes: boolean;
  };
  match: {
    stocks: number; // 1 to 5
    knockbackMultiplier: number; // 0.7 to 2.0
    gravityMultiplier: number; // 0.7 to 1.3
    hazardFrequency: HazardFrequency;
    itemSpawnRate: ItemSpawnRate;
    voteGainMultiplier: number; // 0.5 to 2.0
    startFullVote: boolean;
    aiDifficulty: 0 | 1 | 2 | 3;
  };
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
  };
  controls: {
    p1: KeyBindings;
    p2: KeyBindings;
    touchMode: TouchMode;
    touchScale: number;
    touchLayout?: Partial<Record<'jump' | 'light' | 'heavy' | 'dash' | 'ult' | 'reload', { x: number; y: number; scale?: number }>>;
    touchJoystick?: { x: number; y: number; scale?: number };
    gamepadVibration: boolean;
  };
}

export interface ColorRamp {
  base: string;
  shadow: string;
  highlight: string;
  outline: string;
}

export type BodyBuild = 'athletic' | 'heavy' | 'lean' | 'titan';
export type FaceShape = 'square' | 'oval' | 'angular' | 'broad';
export type EyeStyle = 'determined' | 'sharp' | 'wide' | 'shades' | 'visor';
export type NoseStyle = 'straight' | 'aquiline' | 'broad' | 'small';
export type MouthStyle = 'serious' | 'smirk' | 'fierce' | 'calm';
export type FacialHairStyle = 'none' | 'stubble' | 'mustache' | 'goatee' | 'full_beard';
export type OutfitStyle = 'suit' | 'tactical' | 'gala' | 'leather' | 'robe' | 'armored';
export type HatOrHairStyle =
  | 'combover'
  | 'wild'
  | 'cap'
  | 'ponytail'
  | 'fedora'
  | 'tophat'
  | 'bicorne_hair'
  | 'grey_short'
  | 'beret'
  | 'helmet';
export type TieOrSashStyle =
  | 'red_tie'
  | 'yellow_tie'
  | 'tactical'
  | 'tricolor_sash'
  | 'bowtie'
  | 'black_tie'
  | 'gold_sash'
  | 'medal_sash';
export type WeaponType = 'gavel' | 'chainsaw' | 'baton' | 'staff' | 'claws' | 'axe' | 'saber' | 'gloves';

export interface FacialProfile {
  faceShape: FaceShape;
  eyeStyle: EyeStyle;
  eyeColor: string;
  noseStyle: NoseStyle;
  mouthStyle: MouthStyle;
  facialHair: FacialHairStyle;
}

export interface AnatomicalProfile {
  bodyBuild: BodyBuild;
  heightScale: number;
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  armThickness: number;
  legThickness: number;
  headRadius: number;
  outfitStyle: OutfitStyle;
  hasCapeOrCoat: boolean;
  capeColor?: string;
  capeShadow?: string;
  weaponType: WeaponType;
  hatOrHair: HatOrHairStyle;
  tieOrSash: TieOrSashStyle;
  glasses: boolean;
  holster: boolean;
  kneepads: boolean;
  face: FacialProfile;
}

export interface HitboxSpec {
  fx: number;
  y: number;
  w: number;
  h: number;
}

export interface AttackPhase {
  a: [number, number];
  hb?: HitboxSpec;
  dmg?: number;
  bk?: number;
  ks?: number;
  ang?: number;
  mv?: number;
  every?: number;
  armor?: boolean;
  fx?: string;
  dur?: number;
}

export interface ProjectileSpawnSpec {
  t: number;
  p: {
    fx: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    life: number;
    kind: 'wall' | 'bars' | 'pulse' | 'shock' | 'bullet' | 'rocket';
    dmg: number;
    bk: number;
    ks: number;
    ang: number;
    hold?: number;
    back?: boolean;
    vy?: number;
    bounces?: number;
  };
}

export interface SignatureSpec {
  dur: number;
  hop?: { t: number; vy: number };
  ph: AttackPhase[];
  sp: ProjectileSpawnSpec[];
}

export type PresidentRegion = 'na' | 'latam' | 'eu' | 'af_as';

export interface PresidentData {
  id: string;
  rosterGroup?: 'mythic' | 'current' | 'former';
  termStart?: number;
  ultimateId?: string;
  legacyUltimateName?: string;
  powerSourceId?: string;
  region?: PresidentRegion;
  name: string;
  title: string;
  era: string;
  role: string;
  taunt: string;
  stats: {
    speed: number;
    weight: number;
    jumpForce: number;
    power: number;
  };
  palette: {
    skin: ColorRamp;
    suit: ColorRamp;
    accent: ColorRamp;
    hair: string;
    hairShadow: string;
    boots: string;
  };
  anatomy: AnatomicalProfile;
  signatureType: string;
  sigName: string;
  legacySignatureName?: string;
  sig: SignatureSpec;
  ult: {
    name: string;
    cry: string;
    sigDesc: string;
    ultDesc: string;
    dodgeTip: string;
  };
}

export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  by?: number;
  amp?: number;
  ph?: number;
}

export type StageHazard =
  | 'edge-volley' | 'crosswind' | 'alternating-salvo' | 'low-gravity'
  | 'lifts' | 'bell' | 'mountain-gust' | 'guard-march'
  | 'central-updraft' | 'street-lamps' | 'thermal-columns' | 'scanner';

export interface StageDef {
  id: string;
  name: string;
  country: string;
  main: { x: number; y: number; w: number; h: number };
  plats: PlatformDef[];
  palette: {
    skyTop: string;
    skyBottom: string;
    platformMain: string;
    platformTop: string;
    platformTrim: string;
    floatMain: string;
    floatTop: string;
    ambientTint: string;
  };
  city: string;
  hazard: StageHazard;
  hazardName: string;
  hazardMsg: string;
  hazardDur: number;
}

export interface HudFighterSnapshot {
  pi: number;
  id: string;
  name: string;
  accent: string;
  pct: number;
  stocks: number;
  maxStocks: number;
  vote: number;
  dashReady: boolean;
  weaponKind: string | null;
  weaponTimer: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadProgress: number;
  combo: number;
  comboMultiplier: number;
  comboTimer: number;
  maxCombo: number;
  hitStun: number;
  floating?: boolean;
  isAI: boolean;
  isBoss: boolean;
  hitFlash: number;
}

export interface HudSnapshot {
  fighters: HudFighterSnapshot[];
  roundTimeSec: number;
  stageIdx: number;
  stageName: string;
  stageCountry: string;
  hazardWarning: string | null;
  hazardActive: string | null;
  bannerText: string | null;
  campaignRound: number | null;
  campaignScore: number;
  winnerPi: number | null;
}

export interface CampaignState {
  hero: number;
  ladder: number[];
  round: number;
  score: number;
  kos: number;
  timeFrames: number;
  continues: number;
  lastRoundScore: number;
}

export interface MatchSummary {
  winnerPi: number;
  winnerId: string;
  winnerName: string;
  loserName: string;
  durationSec: number;
  kosDelivered: number;
  damageDealt: number;
  perfectDodges: number;
  maxCombo?: number;
}

export interface ReplayKeyframe {
  f: number;
  p1: PlayerAction[];
  p2: PlayerAction[];
}

export interface MatchReplayData {
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  recordedAt: string;
  seed: number;
  mode: GameMode;
  p1Id: string;
  p2Id: string;
  stageIdx: number;
  vsAI: boolean;
  campaignRound?: number;
  matchConfig: GameConfig['match'];
  totalFrames: number;
  summary: MatchSummary;
  keyframes: ReplayKeyframe[];
}
