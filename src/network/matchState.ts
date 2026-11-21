import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA, type RoomCapacity } from '../data/stages';
import type { RenderFighterState, RenderUltEffect, WorldRenderContext } from '../engine/pixelRenderer';
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
  playing: boolean;
  standings: number[] | null;
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

export function renderMatchState(previous: MatchSnapshot, latest: MatchSnapshot, blend: number,
  localSlot: number, input: ReadonlySet<PlayerAction>, predictionFrames: number, jumpSequence = -1): WorldRenderContext {
  const fighters = latest.players.map(p => {
    const last = previous.players[p.slot];
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
    return { ...p, pi: p.slot, face, pct: p.damage, vote: p.ultCharge, x, y, cx: x + p.w / 2, d: fightersById.get(p.fighterId)!, afterimages: [] };
  });
  const oldProjectiles = new Map(previous.projectiles.map(p => [p.id, p]));
  const projectiles = latest.projectiles.map(p => {
    const old = oldProjectiles.get(p.id);
    return old ? { ...p, x: lerp(old.x, p.x, blend), y: lerp(old.y, p.y, blend) } : p;
  });
  const camTarget = fighters[localSlot] ?? fighters.find(f => f.slot === localSlot);
  const camera = camTarget
    ? { x: camTarget.cx, y: camTarget.y + camTarget.h * 0.45, zoom: 1.45 }
    : latest.world.camera ?? { x: 720, y: 405, zoom: 1 };
  return {
    ...latest.world,
    T: Math.floor(lerp(previous.world.T, latest.world.T, blend)),
    camera,
    stage: STAGES_DATA[latest.stage], fighters,
    projectiles,
    ults: latest.zones.map(z => ({ ...z, f: fighters[z.f], o: fighters[z.o] })),
    cine: latest.cine && { ...latest.cine, f: fighters[latest.cine.f] },
  };
}
