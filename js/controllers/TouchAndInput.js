// ============================================================
// CONTROLADOR DE ENTRADA: Floating Joystick, Botones Táctiles en Arco, Teclado y Gamepad API
// ============================================================

const keys = {};
const KEYS = [
  {
    l: ['KeyA', 'GP0l', 'T_l'],
    r: ['KeyD', 'GP0r', 'T_r'],
    u: ['KeyW', 'GP0u', 'T_u', 'T_su'],
    d: ['KeyS', 'GP0d', 'T_d'],
    a: ['KeyJ', 'GP0a', 'T_a'],
    h: ['KeyK', 'GP0h', 'T_h'],
    x: ['KeyL', 'GP0x', 'T_x'],
    c: ['KeyC', 'GP0c', 'T_c'],
    s: ['Space']
  },
  {
    l: ['ArrowLeft', 'GP1l'],
    r: ['ArrowRight', 'GP1r'],
    u: ['ArrowUp', 'GP1u'],
    d: ['ArrowDown', 'GP1d'],
    a: ['KeyU', 'Numpad1', 'GP1a'],
    h: ['KeyI', 'Numpad2', 'GP1h'],
    x: ['KeyO', 'Numpad3', 'GP1x'],
    c: ['KeyM', 'Numpad0', 'GP1c'],
    s: ['Enter']
  }
];

const $ = id => document.getElementById(id);
const tc = $('tc');
const sb = $('sb');
const kn = $('kn');
const gpt = $('gpt');
const tgl = $('tgl');
const rot = $('rot');
const ultB = tc.querySelector('[data-b="c"]');
const tmap = {};

let touchOn = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let tcShown = false;
let gpSt = [0, 0];
let ultWasReady = false;

// Estado del Floating Joystick
const stickState = {
  active: false,
  originX: 0,
  originY: 0,
  radius: 56
};

// ---------- Feedback Háptico ----------
function hapticTap(pattern) {
  try {
    if (touchOn && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {}
}

function vibrateGamepad(pi, d, w, s) {
  try {
    const p = gpList()[pi],
      a = p && p.vibrationActuator;
    if (a && a.playEffect) {
      a.playEffect('dual-rumble', {
        startDelay: 0,
        duration: d,
        weakMagnitude: w,
        strongMagnitude: s
      });
    } else if (touchOn && pi == 0 && navigator.vibrate) {
      if (d >= 400) navigator.vibrate([50, 30, 90]);
      else if (d >= 200) navigator.vibrate(45);
      else navigator.vibrate(Math.min(d, 25));
    }
  } catch (e) {}
}

// ---------- Teclado ----------
addEventListener('keydown', e => {
  keys[e.code] = 1;
  if (/^Arrow|Space/.test(e.code) || (e.code == 'Enter' && state == 'play')) e.preventDefault();
  if (!e.repeat && (e.code == 'Escape' || e.code == 'KeyP')) togglePause();
  A.init();
});

addEventListener('keyup', e => {
  keys[e.code] = 0;
});

// ---------- Gamepad API ----------
const gpList = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(p => p && p.connected);

function pollGamepads() {
  const L = gpList();
  for (let n = 0; n < 2; n++) {
    const p = L[n],
      pre = 'GP' + n;
    if (!p) {
      ['l', 'r', 'u', 'd', 'a', 'h', 'x', 'c'].forEach(k => (keys[pre + k] = 0));
      gpSt[n] = 0;
      continue;
    }
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed),
      ax = p.axes[0] || 0,
      ay = p.axes[1] || 0,
      dz = 0.25;
    keys[pre + 'l'] = ax < -dz || b(14);
    keys[pre + 'r'] = ax > dz || b(15);
    keys[pre + 'u'] = ay < -0.7 || b(12) || b(0) || b(3);
    keys[pre + 'd'] = ay > dz || b(13);
    keys[pre + 'a'] = b(2);
    keys[pre + 'h'] = b(1);
    keys[pre + 'x'] = b(4) || b(5);
    keys[pre + 'c'] = b(6) || b(7);
    const st = b(9);
    if (st && !gpSt[n] && state != 'play' && state != 'vs') {
      A.init();
      const bt = ui.querySelector('#rv,#ct,#go,#ab');
      if (bt) bt.click();
    } else if (st && !gpSt[n] && state == 'play') {
      togglePause();
    }
    gpSt[n] = st;
  }
}

// ---------- Floating Joystick Ultra Suave ----------
function startFloatingStick(t) {
  const tcRect = tc.getBoundingClientRect();
  const sbRect = sb.getBoundingClientRect();
  const R = sbRect.width / 2 || 56;
  stickState.radius = R;

  // Coordenadas relativas al contenedor #tc, con margen seguro para no salir de la mitad izquierda
  const pad = R + 8;
  const maxX = tcRect.width * 0.48 - R;
  const relX = clamp(t.clientX - tcRect.left, pad, Math.max(pad, maxX));
  const relY = clamp(t.clientY - tcRect.top, pad, Math.max(pad, tcRect.height - pad));

  stickState.originX = tcRect.left + relX;
  stickState.originY = tcRect.top + relY;
  stickState.active = true;

  sb.style.left = relX - R + 'px';
  sb.style.top = relY - R + 'px';
  sb.style.bottom = 'auto';
  sb.classList.add('active');
  kn.style.transform = 'translate3d(0px, 0px, 0)';
  hapticTap(10);
  tStick(t);
}

function tStick(t) {
  if (!stickState.active) return;
  const R = stickState.radius || sb.getBoundingClientRect().width / 2 || 56;
  let dx = (t.clientX - stickState.originX) / R;
  let dy = (t.clientY - stickState.originY) / R;
  const m = Math.hypot(dx, dy);
  if (m > 1) {
    dx /= m;
    dy /= m;
  }
  const maxTravel = R * 0.58;
  kn.style.transform = `translate3d(${(dx * maxTravel).toFixed(1)}px, ${(dy * maxTravel).toFixed(1)}px, 0)`;

  const prevL = keys.T_l,
    prevR = keys.T_r;
  keys.T_l = dx < -0.24;
  keys.T_r = dx > 0.24;
  keys.T_d = dy > 0.42;
  keys.T_su = dy < -0.65;

  if ((keys.T_l && !prevL) || (keys.T_r && !prevR)) {
    hapticTap(6);
  }
}

function stickOff() {
  stickState.active = false;
  sb.classList.remove('active');
  sb.style.left = '';
  sb.style.top = '';
  sb.style.bottom = '';
  kn.style.transform = 'translate3d(0px, 0px, 0)';
  keys.T_l = keys.T_r = keys.T_d = keys.T_su = false;
}

function resetT() {
  for (const id in tmap) delete tmap[id];
  stickOff();
  ['u', 'a', 'h', 'x', 'c'].forEach(k => (keys['T_' + k] = 0));
  tc.querySelectorAll('.on').forEach(b => b.classList.remove('on'));
}

// ---------- Eventos Táctiles Multi-Touch ----------
function triggerButtonHaptic(k) {
  if (k == 'c') hapticTap([35, 25, 70]);
  else if (k == 'h') hapticTap(28);
  else if (k == 'a') hapticTap(16);
  else if (k == 'x') hapticTap(14);
  else hapticTap(10);
}

function tcEv(e) {
  e.preventDefault();
  const ty = e.type;
  const tcRect = tc.getBoundingClientRect();

  for (let q = 0; q < e.changedTouches.length; q++) {
    const t = e.changedTouches[q],
      id = t.identifier;
    if (ty == 'touchstart') {
      A.init();
      const bt = t.target.closest && t.target.closest('[data-b]');
      if (bt) {
        tmap[id] = bt;
        const k = bt.dataset.b;
        bt.classList.add('on');
        keys['T_' + k] = 1;
        triggerButtonHaptic(k);
        if (k == 'u') {
          setTimeout(() => {
            keys.T_u = 0;
          }, 90);
        }
      } else if (t.clientX < tcRect.left + tcRect.width * 0.5 && !Object.values(tmap).includes('s')) {
        tmap[id] = 's';
        startFloatingStick(t);
      }
    } else if (ty == 'touchmove') {
      if (tmap[id] == 's') {
        tStick(t);
      }
    } else {
      const m = tmap[id];
      if (m == 's') {
        stickOff();
      } else if (m) {
        m.classList.remove('on');
        keys['T_' + m.dataset.b] = 0;
      }
      delete tmap[id];
    }
  }
}

['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(n =>
  tc.addEventListener(n, tcEv, { passive: false })
);

document.addEventListener(
  'touchmove',
  e => {
    if (touchOn && state == 'play') e.preventDefault();
  },
  { passive: false }
);
document.addEventListener('gesturestart', e => e.preventDefault());
addEventListener('contextmenu', e => e.preventDefault());

// ---------- Botones de Barra de Herramientas y Sincronización UI ----------
tgl.onclick = () => {
  touchOn = !touchOn;
  resetT();
};

$('mus').onclick = () => {
  MUS.on = !MUS.on;
  $('mus').textContent = '🎵 Música ' + (MUS.on ? 'ON' : 'OFF');
};

$('crt').onclick = () => $('w').classList.toggle('crt');
$('pz').onclick = () => togglePause();

function syncUI() {
  const n = Math.min(2, gpList().length),
    s = [0, 1]
      .slice(0, n)
      .map(i => '🎮 Mando ' + (i + 1) + ' Conectado')
      .join(' · ');
  if (gpt.textContent !== s) gpt.textContent = s;

  const tt = '📱 Táctil ' + (touchOn ? 'ON' : 'OFF');
  if (tgl.textContent !== tt) tgl.textContent = tt;

  const sh = touchOn && state == 'play' && !paused;
  if (sh !== tcShown) {
    tcShown = sh;
    tc.style.display = sh ? 'block' : 'none';
    if (!sh) resetT();
  }

  rot.style.display = touchOn && innerHeight > innerWidth ? 'flex' : 'none';

  const rdy = !!(sh && F[0] && F[0].vote >= 100);
  ultB.classList.toggle('rdy', rdy);
  if (rdy && !ultWasReady) {
    hapticTap([30, 40, 60]);
  }
  ultWasReady = rdy;
}
