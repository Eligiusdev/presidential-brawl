import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { combatBalance, COMBAT_LIMITS, ultimateCategory, ULTIMATE_BUDGETS } from '../src/data/combatBalance.ts';
import { PRESIDENTS_DATA } from '../src/data/presidents.ts';
import { movesFor } from '../src/combat/roster.js';
globalThis.document = { createElement: () => createCanvas(640, 360) };
globalThis.window = {};
const { GameEngine } = await import('../src/engine/gameEngine.ts');
const { DEFAULT_CONFIG } = await import('../src/config/defaultConfig.ts');
const cfg = structuredClone(DEFAULT_CONFIG);
cfg.audio.muted = true;
cfg.video.hitstopEnabled = false;
cfg.match.itemSpawnRate = 'off';
cfg.match.hazardFrequency = 'off';
const game = new GameEngine(cfg);
const index = id => game.roster.findIndex(f => f.id === id);
function match(id, other = 'robinson') {
  game.clearAllInputs();
  game.startMatch(index(id), index(other), 0, false, 'versus');
  return game.fighters;
}
const bounds = [
  [[4,6],[3,4],[7,10],[5,7]], [[10,14],[6,14],[14,18],[9,12]],
  [[8,11],[8,12],[16,22],[10,13]], [[7,15],[6,18],[15,20],[8,14]],
];
const counts = new Map();
for (const fighter of PRESIDENTS_DATA) {
  assert.equal(fighter.ultimateId, 'ult_' + fighter.id);
  const balance = combatBalance(fighter.id);
  assert.ok(balance, fighter.id);
  counts.set(balance.archetype, (counts.get(balance.archetype) ?? 0) + 1);
  const moves = movesFor(fighter);
  const book = [moves.neutralAttack(), moves.specialNeutral(), moves.specialUp(), moves.specialDown()];
  for (const [slot, move] of book.entries()) {
    const { startup, active, recovery, damage } = move.frames;
    for (const [i, value] of [startup, active, recovery, damage].entries()) {
      const [min,max] = bounds[slot][i];
      assert.ok(value >= min && value <= max, fighter.id);
    }
    assert.equal(move.dur, startup + active + recovery);
    assert.ok(move.ph.every(p => p.a[0] > startup && p.a[1] <= startup + active));
    assert.ok(move.sp.every(p => p.t > startup && p.t <= startup + active));
    assert.ok(Math.abs(move.ph.reduce((n,p) => n + (p.hb ? p.dmg : 0), 0) +
      move.sp.reduce((n,p) => n + p.p.dmg, 0) - damage) < 1e-8, fighter.id);
  }
  const [f] = match(fighter.id);
  const { spec } = game.specializedUltimate(f);
  const budget = ULTIMATE_BUDGETS[ultimateCategory(fighter.id)];
  assert.ok(spec.damage >= budget.minDamage && spec.damage <= budget.maxDamage);
  assert.ok(spec.rangePx >= budget.minRange && spec.rangePx <= budget.maxRange);
}
assert.deepEqual(Object.fromEntries(counts), { vanguard: 13, tank: 10, controller: 13, artillery: 9, assassin: 9, specialist: 7 });
assert.equal(COMBAT_LIMITS.projectileCooldown, 66);

for (const [distance, damage] of [[110, 28], [285, 22]]) {
  const [f, o] = match('simo');
  o.x = f.x + distance;
  o.y = f.y;
  f.face = 1;
  game.fireUlt(f, o);
  game.updateUltEffects();
  assert.equal(o.pct, damage);
}
{
  const [f, o] = match('ricaurte');
  game.cine = { f, o, t: 0 };
  for (let i = 0; i < 10; i++) game.step();
  assert.equal(game.telegraph.duration, 39);
  assert.equal(f.inv, 15);
  for (let i = 0; i < 39; i++) game.step();
  assert.equal(game.ults[0].kind, 'ult_ricaurte');
  for (let i = 0; i < 6; i++) game.updateUltEffects();
  assert.equal(f.ultimateRecovery, 24);
}
{
  const [f, o] = match('kennedy');
  f.airJ = 1;
  o.airJ = 1;
  f.y -= 80;
  o.y -= 80;
  f.on = o.on = false;
  game.fireUlt(f, o);
  assert.equal(game.ults[0].dur, 180);
  game.step();
  assert.equal(game.gravityFactor, .5);
  assert.equal(f.airJ, 1);
  assert.equal(o.airJ, 1);
}
{
  const [f, o] = match('mandela');
  f.pct = 40;
  game.fireUlt(f, o);
  assert.equal(f.pct, 40);
  const u = game.ults[0];
  for (let phase = 0; phase < 2; phase++) {
    const time = Math.ceil(u.dur * (phase + .4) / u.specialized.ultimate.spec.hits);
    u.t = time;
    game.advanceSpecializedUltimate(u, f, o);
    const { point } = u.specialized;
    o.x = point.x - o.w / 2;
    o.y = point.y - o.h / 2;
    game.advanceSpecializedUltimate(u, f, o);
    assert.equal(f.pct, 32);
  }
}
{
  const [f, o] = match('macron');
  game.fireUlt(f, o);
  assert.equal(game.ults[0].dur, 72);
  const p = { x: f.cx, y: f.y + f.h / 2, w: 5, h: 5, vx: 0, vy: 0, life: 30,
    kind: 'bullet', owner: o, dir: -1, d: { dmg: 6, bk: 3, ks: .1, ang: -30 }, hit: 0 };
  game.projectiles.push(p);
  game.updateProjectiles();
  assert.equal(game.projectiles.length, 0);
  assert.ok(game.hurt(f, o, p.d, -1, 'melee'));
  assert.equal(f.pct, 6);
}
{
  const [f, o] = match('nyerere');
  game.fireUlt(f, o);
  assert.equal(game.hurt(f, o, { dmg: 4, bk: 1, ks: 0, ang: 0 }, 1), false);
  const u = game.ults[0];
  u.t = u.dur - 1;
  game.advanceSpecializedUltimate(u, f, o);
  o.x = u.specialized.point.x - o.w / 2;
  o.y = u.specialized.point.y - o.h / 2;
  game.advanceSpecializedUltimate(u, f, o);
  assert.ok(Math.abs(o.pct - (u.specialized.ultimate.spec.damage / 3 + 9)) < 1e-8);
}
{
  const [f, o] = match('bolivar');
  o.x = f.x + 420;
  const keys = ['KeyK'];
  const press = () => {
    for (const key of keys) game.handleKeyDown(key, false);
    game.step();
    for (const key of keys) game.handleKeyUp(key);
  };
  press();
  const duration = f.atk.spec.dur;
  let launched = false;
  for (let i = 0; i < duration; i++) {
    game.step();
    launched ||= game.projectiles.some(p => p.owner === f);
  }
  assert.ok(f.projectileCD > 0);
  assert.ok(launched);
  press();
  assert.equal(f.atk.spec.sp.length, 0);
}
for (const id of ['kalam', 'eisenhower', 'cesar', 'bukele']) {
  const simulate = () => {
    game.startReplay({ version: 7, seed: 123, mode: 'versus', p1Id: id, p2Id: 'robinson',
      vsAI: false, stageIdx: 0, matchConfig: cfg.match, totalFrames: 200, keyframes: [] });
    game.fireUlt(...game.fighters);
    return Array.from({ length: 90 }, () => {
      game.step();
      const u = game.ults[0];
      return [u?.specialized.point, u?.specialized.active, ...game.fighters.map(f => [f.x, f.y, f.pct])];
    });
  };
  assert.deepEqual(simulate(), simulate(), id + ' trayectoria determinista');
}
console.log('Balance de 61 kits y seis reglas antiabuso verificados.');
