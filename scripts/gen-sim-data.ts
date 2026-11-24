/**
 * Genera engine/data/simdata.json desde las fuentes TypeScript del juego.
 * El motor Go (servidor + WASM) consume exactamente los mismos datos que el
 * motor TS, de modo que no puede haber divergencia de balance ni de movimientos.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESIDENTS_DATA } from '../frontend/src/data/presidents';
import { movesFor } from '../frontend/src/combat/roster';
import { ultimateFor, pacedUltimateDuration } from '../frontend/src/engine/presidentUltimates';
import { COMBAT_LIMITS, ULTIMATE_BUDGETS, combatBalance, ultimateCategory } from '../frontend/src/data/combatBalance';
import { STAGES_DATA, ARENA_SCALE } from '../frontend/src/data/stages';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../engine/data/simdata.json');

function moveWire(m: any) {
  return {
    name: m.name ?? '', k: m.k ?? '', dur: m.dur ?? 0,
    effect: m.effect ?? '', launch: m.launch ?? null, hop: m.hop ?? null,
    balanced: Boolean(m.balanced), renewed: Boolean(m.renewed), tank: Boolean(m.tank),
    individual: Boolean(m.individual), downSpecial: Boolean(m.downSpecial), heavy: Boolean(m.heavy),
    frames: m.frames ?? null, animationTiming: m.animationTiming ?? null,
    ph: (m.ph ?? []).map((p: any) => ({
      a: p.a, hb: p.hb ?? null, dmg: p.dmg ?? 0, bk: p.bk ?? 0, ks: p.ks ?? 0,
      ang: p.ang ?? 0, mv: p.mv ?? null, rear: Boolean(p.rear),
      every: p.every ?? 0, armor: Boolean(p.armor), fx: p.fx ?? '',
      pierce: Boolean(p.pierce),
    })),
    sp: (m.sp ?? []).map((s: any) => ({
      t: s.t, p: {
        fx: s.p.fx ?? 0, y: s.p.y ?? 0, w: s.p.w ?? 10, h: s.p.h ?? 10,
        vx: s.p.vx ?? 0, vy: s.p.vy ?? 0, bounces: s.p.bounces ?? 0,
        life: s.p.life ?? 60, kind: s.p.kind ?? 'orb', dmg: s.p.dmg ?? 4,
        bk: s.p.bk ?? 3, ks: s.p.ks ?? 0.1, ang: s.p.ang ?? -25,
        hold: s.p.hold ?? 0, back: Boolean(s.p.back),
      },
    })),
  };
}

const presidents: Record<string, any> = {};
for (const p of PRESIDENTS_DATA) {
  const moves = movesFor(p as any, false, false, true);
  const ultimate = ultimateFor(p as any, true, true);
  const bal = combatBalance(p.id);
  presidents[p.id] = {
    id: p.id, name: p.name,
    stats: { speed: p.stats.speed, weight: p.stats.weight, jumpForce: p.stats.jumpForce, power: p.stats.power },
    signatureType: p.signatureType ?? '', weaponType: p.anatomy?.weaponType ?? '',
    ultimateId: p.ultimateId ?? '', powerSourceId: p.powerSourceId ?? p.id,
    palette: {
      base: p.palette?.accent?.base ?? '#ffffff',
      highlight: p.palette?.accent?.highlight ?? '#ffffff',
      trim: p.palette?.accent?.base ?? '#ffffff',
    },
    balance: { weight: bal?.weight ?? 1, speed: bal?.speed ?? 1, vote: bal?.vote ?? 1, archetype: bal?.archetype ?? 'vanguard' },
    category: ultimateCategory(p.id),
    moves: moves ? {
      jab: moveWire(moves.book.jab), neutral: moveWire(moves.book.neutral),
      up: moveWire(moves.book.up), down: moveWire(moves.book.down),
    } : null,
    ultimate: ultimate ? {
      spec: ultimate.spec,
      profile: ultimate.profile,
      duration: pacedUltimateDuration(ultimate, {
        x: 0, y: 0, face: 1,
        endX: ultimate.profile.travel && ultimate.profile.travel !== 'lane' ? 1440 : undefined,
      } as any),
    } : null,
  };
}

const stages = STAGES_DATA.map(s => ({
  id: s.id, name: s.name, main: s.main, plats: s.plats,
  hazard: s.hazard ?? '', hazardDur: s.hazardDur ?? 240,
  palette: s.palette,
}));

const payload = {
  version: 1,
  world: { W: 1440, H: 810, blast: { l: -180, r: 1620, t: -260, b: 990 } },
  limits: COMBAT_LIMITS,
  budgets: ULTIMATE_BUDGETS,
  arenaScale: ARENA_SCALE,
  presidents,
  stages,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(payload));
console.log(`simdata.json: ${Object.keys(presidents).length} fighters, ${stages.length} stages -> ${out}`);
