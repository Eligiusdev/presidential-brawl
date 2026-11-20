import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { movesFor } from '../src/combat/roster.js';
import { MOVE_NAMES } from '../src/combat/moveNames.ts';
import { PRESIDENTS_DATA } from '../src/data/presidents.ts';
import { PRESIDENT_ULTIMATES } from '../src/data/presidentUltimates.ts';
import { ultimateDuration, ultimateFor, ultimatePoint } from '../src/engine/presidentUltimates.ts';

globalThis.document = { createElement: () => createCanvas(640, 360) };
globalThis.window = {};
const { GameEngine } = await import('../src/engine/gameEngine.ts');
const { DEFAULT_CONFIG } = await import('../src/config/defaultConfig.ts');
const config = structuredClone(DEFAULT_CONFIG);
config.audio.muted = true;
config.video.hitstopEnabled = false;
config.match.itemSpawnRate = 'off';
config.match.hazardFrequency = 'off';
const game = new GameEngine(config);
const canvas = createCanvas(640, 360);
const ids = PRESIDENTS_DATA.map(f => f.id).sort();
assert.equal(ids.length, 61);
assert.deepEqual(Object.keys(MOVE_NAMES).sort(), ids);
assert.deepEqual(Object.keys(PRESIDENT_ULTIMATES).sort(), ids);
const routes = new Set();
const names = new Set();

for (const [index, president] of PRESIDENTS_DATA.entries()) {
  const kit = movesFor(president);
  assert.deepEqual([kit.neutralAttack(), kit.specialNeutral(), kit.specialUp(), kit.specialDown()]
    .map(move => move.name), MOVE_NAMES[president.id]);

  const ultimate = ultimateFor(president);
  assert.ok(ultimate, president.id);
  assert.equal(ultimate.spec.id, 'ult_' + president.id);
  names.add(ultimate.spec.name);
  routes.add(JSON.stringify(ultimate.profile.route));

  game.startMatch(index, (index + 1) % ids.length, 0, false, 'versus');
  const [f, o] = game.fighters;
  const balanced = game.specializedUltimate(f);
  game.fireUlt(f, o);
  assert.equal(game.ults[0].kind, ultimate.spec.id);
  assert.equal(game.ults[0].dur, ultimateDuration(balanced.spec));
  const state = game.ults[0].specialized;

  if (ultimate.spec.primitive === 'counterStance' && president.id !== 'macron') {
    assert.equal(state.triggered, false);
    const pct = f.pct;
    game.hurt(f, o, { dmg: 8, bk: 3, ks: 0, ang: -35 }, -1);
    assert.equal(f.pct, pct);
    assert.equal(state.triggered, true);
  }

  for (let tick = 1; game.ults.length; tick++) {
    assert.ok(tick <= ultimateDuration(balanced.spec), president.id);
    const point = ultimatePoint(ultimate, state.origin, tick / ultimateDuration(balanced.spec));
    o.x = (ultimate.spec.primitive === 'dashStrike' ? f.cx : point.x) - o.w / 2;
    o.y = (ultimate.spec.primitive === 'dashStrike' ? f.y + f.h / 2 : point.y) - o.h / 2;
    game.updateUltEffects();
    if (tick === 12) game.render(canvas);
  }
  assert.ok(o.pct > 0, president.id + ' produce daño al conectar');
}
assert.equal(names.size, 61);
assert.equal(routes.size, 61);
assert.equal(ultimateFor({ ...PRESIDENTS_DATA[0], isCustom: true }), undefined);

for (const version of [5, 6, 7]) {
  game.startReplay({ version, seed: 617, mode: 'versus', p1Id: 'bolivar', p2Id: 'cesar',
    vsAI: false, stageIdx: 0, matchConfig: config.match, totalFrames: 216, keyframes: [] });
  game.fireUlt(...game.fighters);
  assert.equal(game.ults[0].kind, version === 5 ? 'libertador' : 'ult_bolivar');
}
console.log('61 definitivas, 244 nombres, activación, contacto, render y compatibilidad de repeticiones.');
