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
assert.equal(ids.length, 70);
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
  routes.add(JSON.stringify(ultimateFor(president, false, false).profile.route));

  game.startMatch(index, (index + 1) % ids.length, 0, false, 'versus');
  const [f, o] = game.fighters;
  const balanced = game.specializedUltimate(f);
  game.fireUlt(f, o);
  assert.equal(game.ults[0].kind, ultimate.spec.id);
  const duration = game.ults[0].dur;
  assert.ok(duration <= ultimateDuration(balanced.spec), president.id);
  assert.ok(ultimate.profile.tempo || ultimate.profile.travel, president.id + ' tiene un perfil dinámico');
  if (ultimate.profile.tempo && !ultimate.profile.tempo.fixed) assert.ok(duration <= 67, president.id);
  const state = game.ults[0].specialized;

  if (ultimate.spec.primitive === 'counterStance' && president.id !== 'macron') {
    assert.equal(state.triggered, false);
    const pct = f.pct;
    game.hurt(f, o, { dmg: 8, bk: 3, ks: 0, ang: -35 }, -1);
    assert.equal(f.pct, pct);
    assert.equal(state.triggered, true);
  }

  for (let tick = 1; game.ults.length; tick++) {
    assert.ok(tick <= duration, president.id);
    const point = ultimatePoint(balanced, state.origin, tick / duration);
    o.x = (ultimate.spec.primitive === 'dashStrike' ? f.cx : point.x) - o.w / 2;
    o.y = (ultimate.spec.primitive === 'dashStrike' ? f.y + f.h / 2 : point.y) - o.h / 2;
    game.updateUltEffects();
    if (tick === 12) game.render(canvas);
  }
  assert.ok(o.pct > 0, president.id + ' produce daño al conectar');
}
assert.equal(names.size, ids.length);
assert.equal(routes.size, ids.length);
assert.equal(ultimateFor({ ...PRESIDENTS_DATA[0], isCustom: true }), undefined);

for (const version of [5, 6, 7, 8, 9]) {
  game.startReplay({ version, seed: 617, mode: 'versus', p1Id: 'bolivar', p2Id: 'cesar',
    vsAI: false, stageIdx: 0, matchConfig: config.match, totalFrames: 216, keyframes: [] });
  game.fireUlt(...game.fighters);
  assert.equal(game.ults[0].kind, version === 5 ? 'libertador' : 'ult_bolivar');
  assert.equal(game.ults[0].specialized?.ultimate.profile.travel, version >= 8 ? 'cavalry' : undefined);
}
console.log('70 definitivas, 280 nombres, activación, contacto, render y compatibilidad de repeticiones.');

for (const id of ['lincoln', 'robinson', 'bolivar']) {
  for (const face of [-1, 1]) {
    const index = PRESIDENTS_DATA.findIndex(f => f.id === id);
    game.startMatch(index, (index + 1) % ids.length, 0, false, 'versus');
    const [f, o] = game.fighters;
    f.x = game.main.x + game.main.w / 2 - f.w / 2;
    f.y = game.main.y - f.h;
    f.face = face;
    const start = f.cx;
    o.x = start + face * 200 - o.w / 2;
    o.y = game.main.y - o.h;
    game.fireUlt(f, o);
    const u = game.ults[0];
    const marked = game.getUltZones(f, o, u.specialized.origin);
    assert.equal(marked.length, 1);
    assert.ok(u.dur <= 54, id);
    for (let t = 0; t < u.dur; t++) game.updateUltEffects();
    assert.ok(o.pct > 0, id + ' conecta al cruzar al rival');
    if (id === 'bolivar') {
      assert.ok((f.cx - start) * face >= 200, 'dash en ambos sentidos');
      assert.ok(Math.abs(f.cx - u.specialized.origin.endX) < 1, 'el dash termina dentro de la plataforma');
    }
    else assert.ok((u.specialized.point.x - u.specialized.origin.x) * face >= game.main.w, id);
  }
}
console.log('Tren, tornado y caballería cruzan y golpean en ambos sentidos.');

for (const version of [8, 9]) {
  game.startReplay({ version, seed: 617, mode: 'versus', p1Id: 'biden', p2Id: 'cesar',
    vsAI: false, stageIdx: 0, matchConfig: config.match, totalFrames: 216, keyframes: [] });
  game.fireUlt(...game.fighters);
  const state = game.ults[0].specialized;
  assert.equal(state.ultimate.profile.travel, version === 9 ? 'lane' : undefined);
}

for (const id of ['noboa', 'washington', 'uribe', 'espartaco', 'biden', 'kast', 'alfaro']) {
  const index = PRESIDENTS_DATA.findIndex(f => f.id === id);
  for (const face of [-1, 1]) {
    game.startMatch(index, (index + 1) % ids.length, 0, false, 'versus');
    const [f, o] = game.fighters;
    f.face = face;
    game.fireUlt(...game.fighters);
    const u = game.ults[0];
    const { ultimate, origin } = u.specialized;
    const start = ultimatePoint(ultimate, origin, 0);
    const end = ultimatePoint(ultimate, origin, 1);
    assert.ok((end.x - start.x) * face >= game.main.w, id + ' cubre toda la plataforma');
    assert.ok(u.dur <= 67, id + ' barrido rápido');
    const point = ultimatePoint(ultimate, origin, .62);
    o.x = point.x - o.w / 2;
    o.y = point.y - o.h / 2;
    for (let t = 0; t < u.dur; t++) game.updateUltEffects();
    assert.ok(o.pct > 0, id + ' conecta al atravesar un objetivo fijo');
  }
}
console.log('Siete barridos adicionales recorren la plataforma en ambos sentidos y las repeticiones v8 conservan sus rutas.');
