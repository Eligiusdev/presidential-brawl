import { PRESIDENTS_DATA } from '../data/presidents';
import { arenaGeometry, STAGES_DATA, type RoomCapacity } from '../data/stages';
import type { RenderFighterState, RenderUltEffect, WorldRenderContext } from '../engine/pixelRenderer';
import { stageStartsAtNight } from '../engine/stageAtmosphere';
import type { PlayerAction } from '../types/game';

export interface RoomPlayer {
  slot: number;
  fighterId: string | null;
  color: string;
  ready: boolean;
  connected: boolean;
  ping: number;
}
export interface RoomState {
  type: 'room';
  code: string;
  hostSlot: number;
  stage: number;
  maxPlayers: RoomCapacity;
  mode?: 'ffa' | 'champion' | 'tournament';
  teamSize?: number;
  stocks?: number;
  playing: boolean;
  standings: number[] | null;
  championNext?: number;
  championSize?: number;
  players: Array<RoomPlayer | null>;
}
type WireFighter = Omit<RenderFighterState, 'd' | 'afterimages' | 'cx' | 'pi' | 'face' | 'pct' | 'vote'> & {
  id: number; slot: number; fighterId: string; facing: number; state: string;
  frame: number; damage: number; stocks: number; ultCharge: number; hitstop: number;
};
type WireUltimate = Omit<RenderUltEffect, 'f' | 'o'> & { f: number; o: number };

export interface MatchSnapshot {
  type: 'snapshot';
  tick: number;
  ack: number[];
  stage: number;
  players: WireFighter[];
  zones: WireUltimate[];
  projectiles: Array<WorldRenderContext['projectiles'][number] & { id: number }>;
  world: Omit<WorldRenderContext, 'stage' | 'fighters' | 'ults' | 'projectiles' | 'cine'>;
  cine: (Omit<NonNullable<WorldRenderContext['cine']>, 'f'> & { f: number }) | null;
}

export type ServerRoomMessage = RoomState | MatchSnapshot
  | { type: 'seat'; code: string; slot: number; token: string; seq: number }
  | { type: 'error'; code: string; message: string }
  | { type: 'hello'; protocol?: number } | { type: 'pong' };

const projectileIds = new WeakMap<object, number>();
let nextProjectile = 0;
const q = (value: number) => Math.round(value * 16) / 16;
export function packMatch(world: WorldRenderContext, tick: number, stage: number, hitstop: number): Omit<MatchSnapshot, 'ack' | 'type'> {
  const { fighters, ults, projectiles, cine, stage: _stage, ...rest } = world;
  return {
    tick, stage,
    players: fighters.map(f => {
      const { pi, x, y, w, h, vx, vy, face, on, wall, dead, inv, stun, maxStun, jumpTick, koVisual, dashT,
        dashCD, vote, pct, combo, jabStep, floating, fastFall, winning, winT, moveKind, pickupT, wpn, wk,
        ammo, maxAmmo, reloadT, reloadDur, shootRecoil, landT, crouch, boss, hitFlash, squashX, squashY, atk } = f;
      const source = f as RenderFighterState & { stocks: number; field?: unknown; rage?: number };
      const attack = atk ? { t: atk.t, armor: atk.armor, spec: {
        k: atk.spec.k, individual: atk.spec.individual, downSpecial: atk.spec.downSpecial,
        effect: atk.spec.effect, moveKind: atk.spec.moveKind, dur: atk.spec.dur,
        animationTiming: atk.spec.animationTiming, frames: atk.spec.frames, heavy: atk.spec.heavy,
        ph: atk.spec.ph.map(({ a, hb, fx, armor }) => ({ a, hb, fx, armor })),
      }} : null;
      return { id: pi, slot: pi, fighterId: f.d.id, facing: face, state: moveKind || (on ? 'idle' : 'air'),
        frame: atk?.t ?? world.T, damage: q(pct), stocks: source.stocks, ultCharge: q(vote), hitstop,
        x: q(x), y: q(y), w, h, vx: q(vx), vy: q(vy), on, wall, dead, inv, stun, maxStun, jumpTick,
        koVisual, dashT, dashCD, combo, jabStep, floating, fastFall, winning, winT,
        moveKind, pickupT, wpn, wk, ammo, maxAmmo, reloadT, reloadDur, shootRecoil, landT, crouch, boss, hitFlash,
        squashX: q(squashX), squashY: q(squashY), atk: attack, field: source.field, rage: source.rage };
    }),
    projectiles: projectiles.slice(-80).map(p => {
      let id = projectileIds.get(p);
      if (id === undefined) { id = ++nextProjectile; projectileIds.set(p, id); }
      return { id, x: q(p.x), y: q(p.y), w: p.w, h: p.h, vx: q(p.vx), vy: q(p.vy), kind: p.kind,
        w2: p.w2, dir: p.dir, life: p.life, ownerColor: p.ownerColor, ownerHighlight: p.ownerHighlight };
    }),
    zones: ults.map(u => ({ ...u, f: u.f.pi, o: u.o.pi })),
    cine: cine ? { ...cine, f: cine.f.pi } : null,
    world: { ...rest, particles: rest.particles.slice(-16), crowdParticles: rest.crowdParticles.slice(-8), hitboxes: [] },
  };
}

const fightersById = new Map(PRESIDENTS_DATA.map(f => [f.id, f]));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Los snapshots binarios (protobuf) no transportan la geometría estática del escenario. */
type PartialWorld = Partial<WorldRenderContext> & { banner?: WorldRenderContext['bannerMsg']; seed?: number };

// El KO visual necesita el frame exacto en que se produjo; el server solo envía un contador.
const koState = new Map<number, { dead: number; tick: number; x: number }>();

export function renderMatchState(previous: MatchSnapshot, latest: MatchSnapshot, blend: number,
  localSlot: number, input: ReadonlySet<PlayerAction>, predictionFrames: number, jumpSequence = -1): WorldRenderContext {
  const stage = STAGES_DATA[latest.stage] ?? STAGES_DATA[0];
  const w = latest.world as PartialWorld;
  const capacityRaw = Number(w.online);
  const capacity: RoomCapacity = ([2, 4, 6, 8] as ReadonlyArray<number>).includes(capacityRaw)
    ? capacityRaw as RoomCapacity : 2;
  const geometry = arenaGeometry(stage, capacity);
  const seed = w.seed ?? 0;
  const T = Math.floor(lerp(previous.world.T, latest.world.T, blend));

  const fighters = latest.players.map(p => {
    const last = previous.players[p.slot];
    if (p.dead > 0) {
      if (!koState.has(p.slot)) koState.set(p.slot, { dead: p.dead, tick: T, x: p.x + p.w / 2 });
    } else if (koState.has(p.slot)) {
      koState.delete(p.slot);
    }
    const ko = koState.get(p.slot);
    const koVisual = ko ? { x: ko.x, tick: ko.tick } : p.koVisual;
    const continuous = last?.stocks === p.stocks && Boolean(last?.dead) === Boolean(p.dead);
    let x = continuous ? lerp(last.x, p.x, blend) : p.x;
    let y = continuous ? lerp(last.y, p.y, blend) : p.y;
    let face = p.facing;
    const own = p.slot === localSlot && !p.dead && !p.stun && !p.hitstop && !p.atk && !p.dashT && !latest.cine;
    if (own) {
      // Extrapolate local fighter from latest server state for immediate response.
      x = continuous ? p.x : x;
      y = continuous ? p.y : y;
      const direction = Number(input.has('right')) - Number(input.has('left'));
      if (direction) {
        const speed = fightersById.get(p.fighterId)!.stats.speed;
        face = direction;
        x += lerp(p.vx, direction * speed, .65) * predictionFrames;
      }
      if (!p.on) y += p.vy * predictionFrames;
      else if (input.has('jump') && jumpSequence > (latest.ack[p.slot] ?? -1)) {
        y -= fightersById.get(p.fighterId)!.stats.jumpForce * predictionFrames;
      }
    }
    return { ...p, pi: p.slot, face, pct: p.damage, vote: p.ultCharge, x, y, cx: x + p.w / 2,
      koVisual, d: fightersById.get(p.fighterId)!, afterimages: [] };
  });
  const alive = fighters.filter(f => ((f as { stocks?: number }).stocks ?? 3) > 0 && f.dead <= 0);
  const winnerPi = w.winnerPi ?? (fighters.length > 1 && alive.length === 1 ? alive[0].pi : null);
  const oldProjectiles = new Map(previous.projectiles.map(p => [p.id, p]));
  const projectiles = latest.projectiles.map(p => {
    const old = oldProjectiles.get(p.id);
    return old ? { ...p, x: lerp(old.x, p.x, blend), y: lerp(old.y, p.y, blend) } : p;
  });
  // Sin cámara forzada el renderer usa el mismo encuadre dinámico que en local.
  const camera: WorldRenderContext['camera'] = undefined;
  return {
    ...w,
    T,
    W: w.W ?? 1440,
    H: w.H ?? 810,
    camera,
    stage,
    stageNightStart: w.stageNightStart ?? stageStartsAtNight(seed),
    // Geometría estática: la del snapshot (JSON) o la derivada del escenario (protobuf).
    main: w.main ?? geometry.main,
    plats: w.plats ?? geometry.plats,
    hzPhase: w.hzPhase ?? 0,
    hzMod: w.hzMod ?? T % stage.hazardDur,
    hzDur: w.hzDur ?? stage.hazardDur,
    items: w.items ?? [],
    particles: w.particles ?? [],
    crowd: {
      excitement: 0.12, cheerTimer: 0, mood: 'calm', accentHighlight: '#fff3a0',
      ...w.crowd,
      seed: w.crowd?.seed || seed || 1337,
      accentColor: w.crowd?.accentColor === '#f5d76e' ? stage.palette.platformTrim : (w.crowd?.accentColor ?? stage.palette.platformTrim),
    },
    crowdParticles: w.crowdParticles ?? [],
    floatTexts: w.floatTexts ?? [],
    strikes: w.strikes ?? [],
    hitboxes: w.hitboxes ?? [],
    bannerMsg: w.bannerMsg ?? w.banner ?? { t: '', l: 0, m: 1 },
    telegraph: w.telegraph ?? null,
    winnerPi,
    shake: w.shake ?? 0,
    fighters,
    projectiles,
    ults: latest.zones.map(z => ({ ...z, f: fighters[z.f], o: fighters[z.o] })),
    cine: latest.cine && { ...latest.cine, f: fighters[latest.cine.f] },
  } as WorldRenderContext;
}
