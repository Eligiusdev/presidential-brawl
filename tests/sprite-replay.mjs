import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(640, 360) };
globalThis.window = {};
const { GameEngine } = await import('../frontend/src/engine/gameEngine.ts');
const { DEFAULT_CONFIG } = await import('../frontend/src/config/defaultConfig.ts');
const cfg = structuredClone(DEFAULT_CONFIG);
cfg.audio.muted = true;
cfg.match.itemSpawnRate = 'off';
cfg.match.hazardFrequency = 'off';
const e = new GameEngine(cfg);
const keyframes = [
  [0, ['right'], ['left']], [32, [], []], [49, ['light'], []], [50, [], []],
  [82, ['heavy'], ['light']], [83, [], []], [115, ['jump','heavy'], []],
  [116, [], []], [158, ['down','heavy'], []], [159, [], []], [190, ['left'], []],
].map(([f,p1,p2]) => ({f,p1,p2}));
for (const version of [1,2]) {
  e.startReplay({version, seed: 617, mode:'versus', p1Id:'aquiles', p2Id:'cesar',
    vsAI:false, stageIdx:0, matchConfig:cfg.match, totalFrames:216, keyframes});
  const hash = createHash('sha256');
  const geometry = e.collision;
  while (e.T < 216) {
    e.step();
    for (const f of e.fighters) {
      const masks = [];
      for (const dx of [-22,-2,18]) for (const dy of [7,33,64,89]) {
        masks.push(geometry.bodyTouches(f,e.T,{x:f.cx+dx,y:f.y+dy,w:4,h:4}));
      }
      hash.update(JSON.stringify([e.T,f.x,f.y,f.face,f.vx,f.vy,f.pct,f.stocks,
        f.atk?.t,f.rage,geometry.rearHeel(f,e.T),masks]));
    }
  }
  const fingerprint = hash.digest('hex');
  // Golden trajectories and mask samples from the unmodified Apex v2 archive.
  const original = ['e4045feedb2027449585ae4a1b3ee6a74bd3189e7e98c78e8465d2bb1e4660a4',
    '74a062874874ade54db046c75b78a8198c50353ba0ca6492454cfe3b4b792af2'];
  assert.equal(fingerprint, original[version - 1]);
  console.log('Repetición v'+version+': trayectoria, daño, talón y máscara coinciden.');
}

for (const version of [3, 4]) {
  e.startReplay({ version, seed: 617, mode: 'versus', p1Id: 'petro', p2Id: 'cesar',
    vsAI: false, stageIdx: 0, matchConfig: cfg.match, totalFrames: 216, keyframes });
  const neutral = e.fighters[0].moves.specialNeutral();
  assert.equal(neutral.sp[0].p.kind, version === 3 ? 'suelo' : 'orb');
}
console.log('Repeticiones v3 y v4 seleccionan los especiales de su versión.');

for (const [p1Id, p2Id] of [['bolivar', 'lincoln'], ['gengis', 'bolivar']]) {
  e.startReplay({ version: 10, seed: 617, mode: 'versus', p1Id, p2Id,
    vsAI: false, stageIdx: 0, matchConfig: cfg.match, totalFrames: 90, keyframes: [] });
  const [first, second] = e.fighters;
  for (const [index, fighter] of e.fighters.entries()) {
    fighter.x = e.main.x + e.main.w / 2 - fighter.w / 2;
    fighter.y = e.main.y - fighter.h;
    fighter.face = index ? -1 : 1;
    fighter.inv = 0;
    const move = fighter.moves.neutralAttack();
    const phase = move.ph.find(p => p.hb);
    assert.ok(phase);
    fighter.atk = { spec: { ...move, individual: true }, t: phase.a[0] - 1, hits: {}, armor: false, ar: 0 };
  }
  e.resolveIndividualStrikes();
  assert.ok(first.pct === 0 && second.pct === 0, 'sin daño antes del cuadro activo');
  for (const fighter of e.fighters) fighter.atk.t++;
  e.resolveIndividualStrikes();
  assert.ok(first.pct > 0 && second.pct > 0, `intercambio simultáneo con cuerpos superpuestos: ${p1Id} ${first.pct} / ${p2Id} ${second.pct}`);
}
