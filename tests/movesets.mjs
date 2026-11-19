import { createCanvas } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(640, 360) };
globalThis.window = {};

const { GameEngine } = await import('../src/engine/gameEngine.ts');
const { DEFAULT_CONFIG } = await import('../src/config/defaultConfig.ts');
const cfg = structuredClone(DEFAULT_CONFIG);
cfg.video.hitstopEnabled = false;
cfg.match.itemSpawnRate = 'off';
cfg.match.hazardFrequency = 'off';
cfg.audio.muted = true;
const e = new GameEngine(cfg);
const canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 360;
const check = (cond, label) => {
  if (!cond) throw Error(label);
};
function setup(id, id2 = 'robinson') {
  e.clearAllInputs();
  e.startMatch(
    e.roster.findIndex((d) => d.id === id),
    e.roster.findIndex((d) => d.id === id2),
    0,
    false,
    'versus',
  );
  const [f, o] = e.fighters;
  f.x = e.main.x + 120;
  o.x = f.x + 65;
  f.y = o.y = e.main.y - f.h;
  f.on = o.on = true;
  f.inv = o.inv = 0;
  return [f, o];
}
function press(keys) {
  keys.forEach((k) => e.handleKeyDown(k, false));
  e.step();
  keys.forEach((k) => e.handleKeyUp(k));
}
function step(n) {
  for (let i = 0; i < n; i++) e.step();
}
const keys = [['KeyJ'], ['KeyK'], ['KeyW', 'KeyK'], ['KeyS', 'KeyK']];
let activated = 0;
const signatures = [new Set(), new Set(), new Set(), new Set()];
for (const d of e.roster)
  for (let k = 0; k < 4; k++) {
    const [f] = setup(d.id);
    press(keys[k]);
    const a = f.atk;
    check(a?.spec.individual, d.id + ' slot ' + k);
    activated++;
    const { name, ...spec } = a.spec;
    const fingerprint = JSON.stringify(spec);
    check(!signatures[k].has(fingerprint), 'clone ' + d.id + ' ' + k);
    signatures[k].add(fingerprint);
    step(5);
    e.render(canvas);
  }
const [b, bot] = setup('bolivar');
press(keys[0]);
step(25);
check(b.combo === 3, 'tres estocadas ' + b.combo);
setup('robinson');
press(keys[2]);
step(118);
check(e.fighters[0].atk?.t === 119, 'hover 119');
step(1);
check(e.fighters[0].atk?.t === 120, 'hover 120');
step(1);
check(!e.fighters[0].atk, 'hover expired');
const [a] = setup('aquiles');
press(keys[3]);
step(299);
check(a.rage === 1, 'rage last');
step(1);
check(!a.rage, 'rage expired');
const [caster, target] = setup('bolivar', 'robinson');
target.x = caster.x + 112;
press(['ArrowDown', 'KeyI']);
press(keys[1]);
step(28);
check(!target.pct && e.projectiles.length === 0, 'barrier');
const [r, def] = setup('cesar', 'cesar');
press(['ArrowDown', 'KeyI']);
press(keys[1]);
step(7);
check(def.pct > 0 && !r.pct, 'guard break');
const [att, guard] = setup('bolivar', 'cesar');
press(['ArrowDown', 'KeyI']);
press(keys[0]);
step(9);
check(!guard.pct && att.pct > 0, 'counter');
const [lib] = setup('bolivar');
press(keys[3]);
step(1);
check(lib.speedTime > 0, 'seal');
const [h, opp] = setup('aquiles');
press(keys[3]);
const hb = h.heelBox;
check(hb, 'heel box');
e.hurt(h, opp, { dmg: 4, bk: 1, ks: 0.1, ang: 0 }, h.face, 'melee', hb);
check(h.pct === 8, 'heel damage');
const [pad] = setup('alejandro');
Object.defineProperty(navigator, 'getGamepads', {
  configurable: true,
  value: () => [
    { connected: true, axes: [0, -1], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 1 })) },
  ],
});
e.step();
check(pad.atk?.spec.name === 'Vuelo de Bucéfalo', 'gamepad up');
delete navigator.getGamepads;
// Orbe: colisión circular, rebote en el escenario y retención real.
const { shotTouches } = await import('../src/combat/effects.js');
check(
  !shotTouches({ kind: 'orb', x: 0, y: 0, w: 20, h: 20 }, { x: 0, y: 0, w: 1, h: 1 }),
  'orb transparent corner',
);
const [mage, victim] = setup('robinson');
victim.x = mage.x + 130;
press(keys[1]);
for (let i = 0; i < 40 && !victim.pend; i++) e.step();
check(victim.pend && victim.stun === 24, 'orb hit-stun');
const [bounce, far] = setup('robinson');
far.x = bounce.x + 500;
press(keys[1]);
step(29);
check(
  e.projectiles.some((p) => p.kind === 'orb' && p.bounces < 2),
  'platform bounce',
);
const [climber] = setup('bolivar');
press(keys[2]);
climber.x = e.main.x - climber.w - 1;
climber.y = e.main.y - 16;
climber.vx = 0;
climber.vy = -0.8;
climber.face = 1;
e.step();
check(climber.on && climber.y === e.main.y - climber.h, 'ledge catch');
const [left, right] = setup('alejandro');
left.face = -1;
right.x = left.x - 145;
press(keys[1]);
step(12);
check(right.pct > 0, 'mirrored long spear');
const [recover] = setup('aquiles');
press(keys[2]);
step(36);
press(keys[2]);
check(!recover.atk && recover.upSpecUsed, 'one recovery before landing');
const [champ, rival] = setup('aquiles');
press(keys[3]);
const dmg = { dmg: 4, bk: 6, ks: 0.12, ang: -35 };
e.hurt(rival, champ, dmg, 1);
const enragedSpeed = Math.hypot(rival.vx, rival.vy);
const [calm, other] = setup('aquiles');
e.hurt(other, calm, dmg, 1);
check(Math.abs(enragedSpeed / Math.hypot(other.vx, other.vy) - 1.55) < 1e-8, 'rage knockback');
console.log({ fighters: e.roster.length, commands: activated, uniqueBySlot: signatures.map((s) => s.size) });

setup('bolivar');
const x1=e.fighters[0].x, x2=e.fighters[1].x;
e.setRemoteActions(['right']);
step(4);
check(e.fighters[1].x>x2,'mando remoto mueve J2');
check(e.fighters[0].x===x1,'mando remoto no mueve J1');
e.setRemoteActions([]);
check(!e.remoteKeys.right,'soltar mando remoto');
