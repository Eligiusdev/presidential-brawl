import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(640, 360) };
const { GameEngine } = await import('../src/engine/gameEngine.ts');
const { DEFAULT_CONFIG } = await import('../src/config/defaultConfig.ts');
const { arenaGeometry, ARENA_SCALE, STAGES_DATA } = await import('../src/data/stages.ts');
const { packMatch, renderMatchState } = await import('../src/network/matchState.ts');

const cfg = structuredClone(DEFAULT_CONFIG);
cfg.audio.muted = true;
cfg.video.hitstopEnabled = false;
const game = new GameEngine(cfg);
const ids = ['lincoln', 'robinson', 'bolivar', 'kennedy', 'macron', 'uribe', 'aquiles', 'simo'];

for (const stage of STAGES_DATA) {
  for (const size of [2, 4, 6, 8]) {
    const geometry = arenaGeometry(stage, size);
    assert.equal(geometry.main.w, stage.main.w * ARENA_SCALE[size].width);
    assert.equal(new Set(geometry.spawns.map(p => `${p.x}:${p.y}`)).size, size);
    assert.equal(geometry.plats.length, size === 2 ? stage.plats.length : size === 4 ? stage.plats.length + 1 : size === 6 ? 4 : 6);
    for (const spawn of geometry.spawns) {
      assert.ok([geometry.main, ...geometry.plats].some(p => p.y === spawn.y && spawn.x > p.x && spawn.x < p.x + p.w));
    }
  }
}

game.startOnline(ids, 0, 123);
const [caster, ...rivals] = game.fighters;
caster.face = 1;
game.fireUlt(caster, rivals[0]);
const ultimate = game.ults[0];
for (const rival of rivals) {
  rival.x = game.main.x + 250 - rival.w / 2;
  rival.y = game.main.y - rival.h;
}
rivals[0].dashT = 12;
for (let t = 0; t < ultimate.dur; t++) game.updateUltEffects();
assert.equal(rivals[0].pct, 0);
assert.ok(rivals.slice(1).every(f => f.pct > 0), 'La locomotora golpea a varios rivales y respeta la esquiva');

const before = { type: 'snapshot', ack: Array(8).fill(0), ...packMatch(game.worldSnapshot(), 30, 0, 0) };
game.fighters[7].x += 30;
const after = { type: 'snapshot', ack: Array(8).fill(0), ...packMatch(game.worldSnapshot(), 32, 0, 0) };
const world = renderMatchState(before, after, .5, 0, new Set(['right']), 2);
assert.equal(world.fighters[7].x, before.players[7].x + 15);
assert.ok(world.fighters[0].x > before.players[0].x);
assert.equal(world.fighters[0].d.id, ids[0]);
const canvas = createCanvas(1280, 720);
game.renderer.renderWorld(canvas, world, cfg);
assert.ok(canvas.getContext('2d').getImageData(640, 360, 1, 1).data[3] > 0);

console.log('Geometría de arenas, impactos múltiples, interpolación, predicción y render local verificados.');

const local = new GameEngine(cfg);
local.startMatch(0, 1, 0, false, 'versus');
local.setTouchAction('light', true);
local.setTouchAction('light', false);
assert.equal(local.readHumanInput(1).light, false, 'El toque corresponde al jugador 1');
assert.equal(local.readHumanInput(0).light, true, 'Un toque breve llega al próximo paso');
assert.equal(local.readHumanInput(0).light, false, 'El toque breve se consume una sola vez');
local.setTouchAction('right', true);
assert.equal(local.readHumanInput(0).right, true);
local.setTouchAction('right', false);
assert.equal(local.readHumanInput(0).right, false, 'La dirección se libera de inmediato');
local.setTouchAction('jump', true);
local.clearAllInputs();
assert.equal(local.readHumanInput(0).jump, false, 'La pausa cancela pulsaciones pendientes');
console.log('Entrada táctil: pulsos breves, liberación de dirección y limpieza al pausar.');

const { AdaptiveRenderQuality, onlineCanvasWidth } = await import('../src/engine/renderPerformance.ts');
const quality = new AdaptiveRenderQuality(true, true);
assert.equal(quality.quality.scale, .8);
for (let i = 0; i < 45; i++) quality.record(33, 14);
assert.deepEqual(quality.quality, { scale: .65, particleStep: 3, lights: false });
for (let i = 0; i < 90; i++) quality.record(16.7, 5);
assert.equal(quality.quality.scale, .65, 'La resolución no oscila por una mejora breve');
for (let i = 0; i < 45; i++) quality.record(16.7, 5);
assert.equal(quality.quality.scale, .8);
const fixed = new AdaptiveRenderQuality(false, true);
for (let i = 0; i < 100; i++) fixed.record(33, 14);
assert.equal(fixed.quality.scale, 1);
assert.equal(onlineCanvasWidth(320, 3, 1.5, fixed.quality), 480);
assert.equal(onlineCanvasWidth(2200, 3, 2, fixed.quality), 1920);
assert.equal(onlineCanvasWidth(0, 3, 2, fixed.quality), 0);
console.log('Calidad adaptativa, recuperación gradual y límite de resolución verificados.');
