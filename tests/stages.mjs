import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { DEFAULT_CONFIG } from '../frontend/src/config/defaultConfig.ts';
import { STAGES_DATA } from '../frontend/src/data/stages.ts';
import { stageArtUrl, stageHazardColumns, stageNightMix, stageStartsAtNight, STAGE_LIGHT_PERIOD } from '../frontend/src/engine/stageAtmosphere.ts';

globalThis.document = { createElement: () => createCanvas(640, 360) };
globalThis.window = {};
const { GameEngine } = await import('../frontend/src/engine/gameEngine.ts');
const config = structuredClone(DEFAULT_CONFIG);
config.audio.muted = true;
config.match.itemSpawnRate = 'off';
const engine = new GameEngine(config);
const start = id => {
  engine.startMatch(0, 1, STAGES_DATA.findIndex(s => s.id === id), false, 'versus');
  engine.T = engine.hazardCycle;
};
assert.equal(new Set(STAGES_DATA.map(s => s.hazard)).size, STAGES_DATA.length);
assert.equal(stageNightMix('night', 0), 1);
assert.equal(stageNightMix('day', 2100), 0);
assert.equal(stageNightMix('cycle', 0), 0);
assert.equal(stageStartsAtNight(2), false);
assert.equal(stageStartsAtNight(3), true);
assert.equal(stageNightMix('cycle', STAGE_LIGHT_PERIOD - 1, true), 1);
assert.equal(stageNightMix('cycle', STAGE_LIGHT_PERIOD + 180, true), 0.5);
assert.equal(stageNightMix('cycle', STAGE_LIGHT_PERIOD + 360, true), 0);
assert.equal(stageNightMix('cycle', STAGE_LIGHT_PERIOD + 360, false), 1);
assert.equal(stageNightMix('cycle', STAGE_LIGHT_PERIOD * 2 + 360, false), 0);

for (const [id, directions] of [['narino', [1, -1]], ['miraflores', [1]], ['pizarro', [1, 1]], ['mexico', [1, -1]]]) {
  start(id);
  engine.updateStageHazards();
  assert.deepEqual(engine.projectiles.map(p => p.dir), directions, id);
  if (id === 'mexico') assert.ok(engine.projectiles.every(p => Math.abs(p.x - 720) < 60));
}
start('planalto');
engine.T += 60;
const first = engine.plats[0], last = engine.plats.at(-1);
engine.updateStageHazards();
assert.ok(first.y < first.by && last.y > last.by);
engine.T = engine.hazardCycle + engine.stage.hazardDur;
engine.updateStageHazards();
assert.equal(first.y, first.by);
assert.equal(last.y, last.by);

start('rosada');
engine.updateStageHazards();
assert.equal(engine.gravityFactor, 0.58);
start('eliseo');
const [fighter, rival] = engine.fighters;
fighter.x = 720 - fighter.w / 2;
rival.x = 360 - rival.w / 2;
fighter.on = rival.on = false;
fighter.vy = rival.vy = 0;
engine.updateStageHazards();
assert.ok(fighter.vy < 0);
assert.equal(rival.vy, 0);
assert.equal(stageHazardColumns('thermal-columns', 0, 0, 1440).length, 2);
assert.notEqual(stageHazardColumns('street-lamps', 0, 0, 1440)[0].x,
  stageHazardColumns('street-lamps', 0, 70, 1440)[0].x);

for (const id of ['blanca', 'moneda']) {
  start(id);
  const [left, right] = engine.fighters;
  const initial = [left.x, right.x];
  engine.updateStageHazards();
  assert.equal(Math.sign(left.x - initial[0]), id === 'blanca' ? -1 : 1);
  assert.ok(right.x > initial[1]);
}
config.match.hazardFrequency = 'off';
start('narino');
engine.updateStageHazards();
assert.equal(engine.projectiles.length, 0);
config.match.hazardFrequency = 'normal';

const playHazardReplay = version => {
  engine.startReplay({ version, seed: 1, mode: 'versus', p1Id: 'aquiles', p2Id: 'cesar',
    stageIdx: STAGES_DATA.findIndex(s => s.id === 'mexico'), vsAI: false, matchConfig: config.match,
    totalFrames: 1500, keyframes: [] });
  engine.T = engine.hazardCycle;
  engine.updateStageHazards();
  return engine.projectiles.map(p => p.x);
};
assert.deepEqual(playHazardReplay(4), [20, 1382]);
assert.deepEqual(playHazardReplay(5), [744, 666]);

for (const stage of STAGES_DATA) {
  const assets = await Promise.all(['day', 'night'].map(time =>
    readFile(new URL('../public' + stageArtUrl(stage.id, time), import.meta.url))));
  assert.notDeepEqual(...assets, stage.id);
  for (const asset of assets) {
    const image = await loadImage(asset);
    assert.ok(image.width >= 700 && image.height >= 380, stage.id);
  }
}
console.log('12 peligros distintos y 24 fondos verificados. Ciclo, salvas, corrientes y ascensores correctos.');
