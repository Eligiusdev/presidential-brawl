import { combatBalance } from '../data/combatBalance';
import type { PresidentData } from '../types/game';

type FrameRange = readonly [number, number];
type Slot = 'jab' | 'neutral' | 'up' | 'down';

export interface FrameData {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
}

interface Phase {
  a: number[];
  hb?: { fx: number; y: number; w: number; h: number };
  dmg?: number;
  bk?: number;
  ks?: number;
  ang?: number;
  armor?: boolean;
}

interface Shot {
  t: number;
  p: { dmg: number; bk: number; ks: number; ang: number };
}

const ranges: Record<Slot, readonly [FrameRange, FrameRange, FrameRange, FrameRange]> = {
  jab: [[4,6], [3,4], [7,10], [5,7]],
  neutral: [[10,14], [6,14], [14,18], [9,12]],
  up: [[8,11], [8,12], [16,22], [10,13]],
  down: [[7,15], [6,18], [15,20], [8,14]],
};

// Multipliers are applied to the authored contact boxes, never to atlas frames.
const renewed: Record<string, readonly [reach: number, height: number, drop: number] | undefined> = {
  abelardo: [.88, 1.36, 2], biden: [1.22, .84, 8], bukele: [.94, 1.14, -4],
  duque: [1.12, .72, 5], elcid: [1.24, 1.12, -3], espartaco: [1.08, 1.3, 1],
  juana: [.91, 1.42, -8], kast: [.83, 1.21, 4], macron: [1.14, .85, -2],
  milei: [1.06, 1.26, -2], musashi: [1.19, .74, -6], noboa: [1.08, .88, 3],
  petro: [.96, 1.28, 5], policarpa: [.79, .86, 7], ricaurte: [.85, 1.44, 6],
  santos: [1.13, 1.02, 4], sheinbaum: [1.17, .65, -5], simo: [1.26, .62, 7],
  trump: [.89, 1.31, 7], uribe: [1.21, .97, 6], wallace: [1.16, 1.21, -3],
};

function sample([min, max]: FrameRange, value: number) {
  return min + value % (max - min + 1);
}

export function balanceMove<T extends { ph: Phase[]; sp: Shot[]; dur: number; effect?: string }>(
  move: T, fighter: PresidentData, slot: Slot, duelBalance = false,
) {
  const seed = [...fighter.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  const [startupRange, activeRange, recoveryRange, damageRange] = ranges[slot];
  const startup = duelBalance && slot === 'neutral' ? (fighter.id === 'bolivar' ? 13 : 15) : sample(startupRange, seed >>> 2);
  const active = sample(activeRange, seed >>> 8);
  const recovery = duelBalance && slot === 'neutral' ? (fighter.id === 'bolivar' ? 21 : 24) : sample(recoveryRange, seed >>> 12);
  const damage = sample(damageRange, seed >>> 17);
  const frames: FrameData = { startup, active, recovery, damage };
  const first = startup + 1;
  const last = startup + active;
  const oldStart = Math.min(...move.ph.map(p => p.a[0]), ...move.sp.map(s => s.t));
  const oldEnd = Math.max(...move.ph.map(p => p.a[1]), ...move.sp.map(s => s.t));
  const duration = Math.max(1, oldEnd - oldStart);
  const frame = (t: number) => first + Math.round((t - oldStart) * (active - 1) / duration);
  const rawDamage = move.ph.reduce((sum, p) => sum + (p.hb ? p.dmg ?? 0 : 0), 0) +
    move.sp.reduce((sum, s) => sum + s.p.dmg, 0);
  const scale = damage / Math.max(1, rawDamage);
  const shieldCharge = duelBalance && fighter.id === 'aquiles' && slot === 'neutral';
  const tank = shieldCharge || combatBalance(fighter.id)?.archetype === 'tank' && (slot === 'neutral' || slot === 'down');

  const geometry = renewed[fighter.id];
  const ph: Phase[] = move.ph.map(p => ({
    ...p,
    a: [frame(p.a[0]), frame(p.a[1])] as [number, number],
    hb: geometry && p.hb ? { ...p.hb, w: p.hb.w * geometry[0], h: p.hb.h * geometry[1],
      y: p.hb.y + (slot === 'up' ? -Math.abs(geometry[2]) : geometry[2]) } : p.hb,
    dmg: p.hb ? (p.dmg ?? 0) * scale : p.dmg,
    bk: slot === 'jab' ? Math.min(p.bk ?? 2, 2.6) : slot === 'up' ? Math.max(p.bk ?? 5, 8) : p.bk,
    ks: slot === 'jab' ? Math.min(p.ks ?? .1, .075) : p.ks,
    ang: slot === 'up' ? -76 : p.ang,
    armor: tank && (!shieldCharge || p === move.ph[0]),
  }));
  if (!rawDamage) ph.push({
    a: [first, last], hb: { fx: 6, y: slot === 'up' ? -118 : -58, w: 44, h: 48 },
    dmg: damage, ang: slot === 'up' ? -76 : -42, bk: slot === 'up' ? 8 : 5,
  });
  // The window also covers projectile-only and defensive moves with no melee box.
  if (tank && !shieldCharge) ph.push({ a: [first, last], dmg: undefined, bk: undefined, ks: undefined, ang: undefined, armor: true });
  const sp = move.sp.map(shot => ({
    ...shot,
    t: frame(shot.t),
    p: { ...shot.p, dmg: shot.p.dmg * scale, ang: slot === 'up' ? -76 : shot.p.ang,
      bk: slot === 'up' ? Math.max(shot.p.bk, 8) : shot.p.bk },
  }));
  const atlasDuration = move.effect === 'hover' ? 120 : move.dur;
  const animationTiming = {
    from: [0, first, last, last + recovery],
    to: [0, Number.isFinite(oldStart) ? oldStart : atlasDuration / 3,
      Number.isFinite(oldEnd) ? oldEnd : atlasDuration * 2 / 3, atlasDuration],
  };
  return { ...move, ph, sp, dur: last + recovery, frames, animationTiming, balanced: true, renewed: Boolean(geometry), tank };
}
