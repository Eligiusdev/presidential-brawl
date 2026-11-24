import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import type { WorldRenderContext } from '../engine/pixelRenderer';

/**
 * El motor Go (WASM en local, servidor en online) emite un snapshot con la
 * misma forma que WorldRenderContext. Este puente solo decora los luchadores
 * con sus datos de roster y aplica interpolación entre snapshots.
 */
export interface RichSnapshot {
  type: string;
  tick: number;
  stage: number;
  ack: number[];
  players: any[];
  world: any;
  zones: any[];
  projectiles: any[];
  cine: any;
  telegraph: any;
  winnerPi: number | null;
}

const byId = new Map(PRESIDENTS_DATA.map(f => [f.id, f]));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function decorate(p: any, index: number, previous: any[] | undefined, blend: number) {
  const last = previous?.find(q => (q.slot ?? q.pi) === (p.slot ?? p.pi));
  const continuous = last && last.stocks === p.stocks && Boolean(last.dead) === Boolean(p.dead);
  const x = continuous ? lerp(last.x, p.x, blend) : p.x;
  const y = continuous ? lerp(last.y, p.y, blend) : p.y;
  const d = byId.get(p.fighterId) ?? PRESIDENTS_DATA[0];
  return {
    ...p,
    id: p.id ?? p.slot ?? index,
    pi: p.pi ?? p.slot ?? index,
    face: p.face ?? p.facing ?? 1,
    pct: p.pct ?? p.damage ?? 0,
    vote: p.vote ?? p.ultCharge ?? 0,
    x, y, cx: x + (p.w ?? 38) / 2,
    afterimages: p.afterimages ?? [],
    d,
  };
}

export function worldFromRich(snap: RichSnapshot, previous?: RichSnapshot, blend = 1): WorldRenderContext {
  const w = snap.world ?? {};
  const players = snap.players ?? w.fighters ?? [];
  const prevPlayers = previous?.players ?? previous?.world?.fighters;
  const fighters = players.map((p: any, i: number) => decorate(p, i, prevPlayers, blend));
  const oldProjs = new Map((previous?.projectiles ?? []).map((p: any) => [p.id, p]));
  const projectiles = (snap.projectiles ?? []).map((p: any) => {
    const old = oldProjs.get(p.id);
    return old ? { ...p, x: lerp(old.x, p.x, blend), y: lerp(old.y, p.y, blend) } : p;
  });
  const zones = (snap.zones ?? []).map((u: any) => ({
    ...u, f: fighters[u.f ?? u.F] ?? fighters.find((f: any) => f.pi === u.F),
    o: fighters[u.o ?? u.O] ?? fighters.find((f: any) => f.pi === u.O),
  }));
  const cine = snap.cine ? {
    ...snap.cine,
    f: fighters[snap.cine.f] ?? fighters.find((f: any) => f.pi === snap.cine.f),
    name: snap.cine.name ?? byId.get(fighters[snap.cine.f]?.fighterId)?.name,
  } : null;
  return {
    ...w,
    T: snap.tick,
    stage: STAGES_DATA[snap.stage] ?? STAGES_DATA[0],
    stageNightStart: w.stageNightStart ?? false,
    main: w.main ?? STAGES_DATA[snap.stage]?.main ?? STAGES_DATA[0].main,
    plats: w.plats ?? STAGES_DATA[snap.stage]?.plats ?? [],
    fighters,
    projectiles,
    items: w.items ?? [],
    particles: w.particles ?? [],
    crowd: w.crowd ?? { excitement: .12, cheerTimer: 0, mood: 'calm', accentColor: '#f5d76e', accentHighlight: '#fff3a0', seed: 1337 },
    crowdParticles: w.crowdParticles ?? [],
    ults: zones,
    cine,
    telegraph: snap.telegraph ?? null,
    bannerMsg: w.bannerMsg ?? { t: '', l: 0, m: 1 },
    floatTexts: w.floatTexts ?? [],
    winnerPi: snap.winnerPi ?? w.winnerPi ?? null,
    strikes: w.strikes ?? [],
    hitboxes: w.hitboxes ?? [],
    shake: w.shake ?? 0,
    hzPhase: w.hzPhase ?? 0,
    hzMod: w.hzMod ?? 0,
    hzDur: w.hzDur ?? 240,
    W: w.W ?? 1440,
    H: w.H ?? 810,
  } as WorldRenderContext;
}
