// ============================================================
// VISTA Y AUDIO: Renderizado Canvas Pixel-Art 16-Bits Metal Slug (Neo-Geo) y Sintetizador Audio/MUS
// ============================================================

const C = document.getElementById('c');
const X = C.getContext('2d');
const ui = document.getElementById('ui');

// ---------- Audio Procedural y Efectos 16-Bits ----------
const A = {
  ctx: null,
  nb: null,
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (this.ctx && this.ctx.state == 'suspended') this.ctx.resume();
  },
  tone(f, d, t = 'square', s = 0, v = 0.07) {
    const c = this.ctx;
    if (!c) return;
    const o = c.createOscillator(),
      g = c.createGain(),
      n = c.currentTime;
    o.type = t;
    o.frequency.setValueAtTime(f, n);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f + s), n + d);
    g.gain.setValueAtTime(v, n);
    g.gain.exponentialRampToValueAtTime(0.001, n + d);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(n + d);
  },
  noise(d, v = 0.1) {
    const c = this.ctx;
    if (!c) return;
    const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate),
      a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
    const s = c.createBufferSource(),
      g = c.createGain();
    g.gain.value = v;
    s.buffer = b;
    s.connect(g);
    g.connect(c.destination);
    s.start();
  },
  jump() {
    this.tone(300, 0.12, 'square', 450);
  },
  dash() {
    this.tone(500, 0.08, 'triangle', 300);
  },
  hit() {
    this.noise(0.06, 0.1);
    this.tone(220, 0.08, 'square', -120);
  },
  heavy() {
    this.noise(0.22, 0.18);
    this.tone(110, 0.25, 'sawtooth', -70, 0.12);
  },
  saw() {
    this.tone(90, 0.07, 'sawtooth', 50, 0.06);
    this.noise(0.05, 0.05);
  },
  sword() {
    this.tone(900, 0.12, 'sawtooth', -650, 0.05);
  },
  ko() {
    this.noise(0.7, 0.22);
    this.tone(220, 0.7, 'sawtooth', -180, 0.12);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'square', 0, 0.08), i * 140));
  },
  siren() {
    [0, 300].forEach(d => setTimeout(() => this.tone(520, 0.3, 'sawtooth', 420, 0.1), d));
    this.tone(90, 0.6, 'square', 0, 0.05);
  },
  note(f, d, ty, t, v) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = ty;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + d);
  },
  kick(t) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.15);
  },
  nz(t, d, v) {
    const c = this.ctx;
    if (!this.nb) {
      this.nb = c.createBuffer(1, (c.sampleRate * 0.3) | 0, c.sampleRate);
      const a = this.nb.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(),
      g = c.createGain();
    s.buffer = this.nb;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(g);
    g.connect(c.destination);
    s.start(t);
    s.stop(t + d);
  }
};

// ---------- Secuenciador Musical 16-Bits (MUS) ----------
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
const dangerMode = () => F.some(f => f.stocks === 1 || f.pct > 150);

const MUS = {
  on: true,
  s: 0,
  nx: 0,
  bass: [33, 29, 36, 31],
  mel: [
    [69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 76, 81, 0, 76, 0],
    [65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 69, 72, 77, 0, 72, 0],
    [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 76, 79, 84, 0, 79, 0],
    [67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 71, 74, 79, 0, 74, 0]
  ],
  tick() {
    const c = A.ctx;
    if (!c || !this.on || c.state != 'running') return;
    const dg = dangerMode(),
      sd = 60 / (dg ? 165 : 132) / 4,
      sm = dg ? 1 : 0;
    if (this.nx < c.currentTime - 0.1) this.nx = c.currentTime + 0.05;
    while (this.nx < c.currentTime + 0.15) {
      const s = this.s % 64,
        bar = s >> 4,
        st = s & 15,
        t = this.nx,
        n = this.mel[bar][st];
      if (st % 2 == 0) A.note(mf(this.bass[bar] + sm + (st % 4 == 2 ? 12 : 0)), sd * 1.8, 'sawtooth', t, 0.05);
      if (n) A.note(mf(n + sm), sd * 1.6, 'square', t, 0.035);
      if (st == 0 || st == 8 || st == 10) A.kick(t);
      if (st == 4 || st == 12) A.nz(t, 0.12, 0.08);
      if (st % 2 == 0) A.nz(t, 0.03, 0.03);
      this.nx += sd;
      this.s++;
    }
  }
};

// ---------- Explosiones de Humo Escalonadas (Estilo Metal Slug 16-Bits) ----------
function burst(x, y, col, n, s = 5, life = 24) {
  const big = n >= 12;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28,
      v = Math.random() * s,
      m = big ? Math.round(life * (1.35 + Math.random() * 0.85)) : life;
    PA.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - (big ? 0.65 : 0),
      l: big ? m : Math.round(life * (0.55 + Math.random() * 0.45)),
      m: big ? m : life,
      col,
      z: big ? 8 + Math.random() * 12 : 3 + Math.random() * 3,
      ex: big ? 1 : 0
    });
  }
  if (big) {
    // Bocanadas de humo escalonado estilo Neo-Geo (billowing smoke clouds)
    const smokeCount = Math.min(8, Math.ceil(n / 3));
    for (let k = 0; k < smokeCount; k++) {
      const a = (k / smokeCount) * 6.28 + (Math.random() - 0.5) * 0.5;
      const spd = 1 + Math.random() * (s * 0.55);
      const smLife = Math.round(life * (1.6 + Math.random() * 0.7));
      PA.push({
        x: x + Math.cos(a) * 6,
        y: y + Math.sin(a) * 4,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 0.9,
        l: smLife,
        m: smLife,
        col: '#444854',
        z: 10 + Math.random() * 10,
        ex: 2
      });
    }
    // Chispas incandescentes de alto contraste
    for (let k = 0; k < Math.min(10, Math.ceil(n / 3)); k++) {
      PA.push({
        x,
        y,
        vx: (Math.random() - 0.5) * s * 1.8,
        vy: -Math.random() * s * 1.3,
        l: 22,
        m: 22,
        col: '#fff6a0',
        z: 3,
        ex: 0
      });
    }
  }
}

// ---------- Sombras Proyectadas en el Suelo Bajo Cada Presidente ----------
function drawDropShadows() {
  X.save();
  F.forEach(f => {
    if (f.dead > 0) return;
    let sy = null;
    const cx = f.cx,
      fy = f.y + f.h;
    for (const p of PLAT) {
      if (cx >= p.x - 8 && cx <= p.x + p.w + 8 && fy <= p.y + 6) {
        if (sy === null || p.y < sy) sy = p.y;
      }
    }
    if (sy === null && cx >= MAIN.x - 10 && cx <= MAIN.x + MAIN.w + 10 && fy <= MAIN.y + 8) {
      sy = MAIN.y;
    }
    if (sy !== null) {
      const dist = Math.max(0, sy - fy);
      const sc = Math.max(0.32, 1 - dist / 250);
      const rx = Math.round(19 * sc),
        ry = Math.max(3, Math.round(5.5 * sc));
      // Penumbra exterior pixel-art
      X.fillStyle = `rgba(0, 0, 0, ${(0.28 * sc).toFixed(2)})`;
      X.beginPath();
      X.ellipse(cx, sy + 1, rx + 4, ry + 2, 0, 0, Math.PI * 2);
      X.fill();
      // Núcleo oscuro de sombra bajo los pies con borde definido
      X.fillStyle = `rgba(5, 7, 14, ${(0.55 * sc).toFixed(2)})`;
      X.beginPath();
      X.ellipse(cx, sy + 1, rx, ry, 0, 0, Math.PI * 2);
      X.fill();
    }
  });

  IT.forEach(t => {
    const cx = t.x + t.w / 2,
      fy = t.y + t.h;
    if (cx >= MAIN.x && cx <= MAIN.x + MAIN.w && fy <= MAIN.y + 6) {
      const dist = Math.max(0, MAIN.y - fy);
      const sc = Math.max(0.3, 1 - dist / 260);
      X.fillStyle = `rgba(0, 0, 0, ${(0.42 * sc).toFixed(2)})`;
      X.beginPath();
      X.ellipse(cx, MAIN.y + 1, 13 * sc, 4 * sc, 0, 0, Math.PI * 2);
      X.fill();
    }
  });
  X.restore();
}

// ---------- Iluminación Metálica Neo-Geo en Plataformas ----------
function drawMetallicPlatforms() {
  X.save();
  // Plataforma Principal (MAIN) con acabado metálico 16-bits, bisel, remaches y borde negro lineWidth: 3
  const mg = X.createLinearGradient(0, MAIN.y, 0, MAIN.y + MAIN.h);
  mg.addColorStop(0, STG.pt);
  mg.addColorStop(0.18, STG.pm);
  mg.addColorStop(0.82, STG.pm);
  mg.addColorStop(1, '#181b24');
  X.fillStyle = mg;
  X.fillRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h);

  // Franja de brillo especular metálico superior
  X.fillStyle = STG.pt;
  X.fillRect(MAIN.x, MAIN.y, MAIN.w, 9);
  X.fillStyle = 'rgba(255, 255, 255, 0.38)';
  X.fillRect(MAIN.x + 2, MAIN.y + 2, MAIN.w - 4, 3);

  // Reflejos metálicos diagonales estilo Metal Slug
  X.fillStyle = 'rgba(255, 255, 255, 0.07)';
  for (let k = 0; k * 80 < MAIN.w - 40; k++) {
    X.beginPath();
    X.moveTo(MAIN.x + 20 + k * 80, MAIN.y + 10);
    X.lineTo(MAIN.x + 42 + k * 80, MAIN.y + 10);
    X.lineTo(MAIN.x + 18 + k * 80, MAIN.y + MAIN.h - 3);
    X.lineTo(MAIN.x + k * 80, MAIN.y + MAIN.h - 3);
    X.closePath();
    X.fill();
  }

  // Paneles verticales y remaches industriales
  X.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  X.lineWidth = 2;
  for (let k = 1; k * 48 < MAIN.w; k++) {
    const px = MAIN.x + k * 48;
    X.beginPath();
    X.moveTo(px, MAIN.y + 9);
    X.lineTo(px, MAIN.y + MAIN.h - 2);
    X.stroke();
    // Remaches metálicos con brillo y sombra
    X.fillStyle = '#111';
    X.fillRect(px - 6, MAIN.y + 15, 3, 3);
    X.fillRect(px + 3, MAIN.y + 15, 3, 3);
    X.fillStyle = 'rgba(255,255,255,.55)';
    X.fillRect(px - 6, MAIN.y + 14, 2, 2);
    X.fillRect(px + 3, MAIN.y + 14, 2, 2);
  }

  // Moldura dorada/bronce industrial y sombra inferior
  X.fillStyle = '#d4af37';
  X.fillRect(MAIN.x + 2, MAIN.y + 9, MAIN.w - 4, 3);
  X.fillStyle = 'rgba(0, 0, 0, 0.4)';
  X.fillRect(MAIN.x + 2, MAIN.y + MAIN.h - 6, MAIN.w - 4, 5);

  // Borde negro marcado Neo-Geo (lineWidth: 3)
  X.strokeStyle = '#000';
  X.lineWidth = 3;
  X.strokeRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h);

  // Plataformas Aéreas (PLAT) con iluminación metálica y remaches
  PLAT.forEach(p => {
    const pg = X.createLinearGradient(0, p.y, 0, p.y + 12);
    pg.addColorStop(0, STG.pl2);
    pg.addColorStop(0.45, STG.pl);
    pg.addColorStop(1, '#1a1d26');
    X.fillStyle = pg;
    X.fillRect(p.x, p.y, p.w, 12);

    // Brillo metálico superior
    X.fillStyle = STG.pl2;
    X.fillRect(p.x, p.y, p.w, 4);
    X.fillStyle = 'rgba(255, 255, 255, 0.45)';
    X.fillRect(p.x + 2, p.y + 1, p.w - 4, 2);

    // Remaches en los extremos de cada plataforma aérea
    for (let rx = p.x + 8; rx < p.x + p.w - 6; rx += 28) {
      X.fillStyle = '#111';
      X.fillRect(rx, p.y + 6, 3, 3);
      X.fillStyle = 'rgba(255,255,255,.6)';
      X.fillRect(rx, p.y + 5, 2, 2);
    }

    // Borde negro marcado (lineWidth: 3)
    X.strokeStyle = '#000';
    X.lineWidth = 3;
    X.strokeRect(p.x, p.y, p.w, 12);
  });
  X.restore();
}

// ---------- Renderizado Pixel-Art 16-Bits de Luchador ----------
function drawFighterSprite(f) {
  if (f.dead > 0) return;
  const d = f.d,
    c = d.c;
  X.save();
  if (f.inv > 0) X.globalAlpha = T % 6 < 3 ? 0.35 : 0.85;
  const bob = f.on && !f.atk && Math.abs(f.vx) < 1.5 ? Math.sin(T / 7 + f.pi * 3) : 0;
  X.translate(f.cx, f.y + f.h);
  X.scale(f.face * (1 + bob * 0.03), 1 - bob * 0.05);

  if (f.vote >= 100) {
    X.save();
    const g = X.createRadialGradient(0, -28, 4, 0, -28, 52);
    g.addColorStop(0, 'rgba(255,235,130,.88)');
    g.addColorStop(1, 'rgba(255,200,40,0)');
    X.globalAlpha = 0.55 + 0.3 * Math.sin(T / 5);
    X.fillStyle = g;
    X.beginPath();
    X.arc(0, -28, 52, 0, 7);
    X.fill();
    X.restore();
  }
  if (f.boss) {
    X.save();
    const g = X.createRadialGradient(0, -28, 6, 0, -28, 64);
    g.addColorStop(0, 'rgba(190,90,255,.55)');
    g.addColorStop(0.6, 'rgba(255,200,60,.35)');
    g.addColorStop(1, 'rgba(120,40,200,0)');
    X.globalAlpha = 0.7 + 0.25 * Math.sin(T / 7);
    X.fillStyle = g;
    X.beginPath();
    X.arc(0, -28, 64, 0, 7);
    X.fill();
    X.restore();
  }

  const a = f.atk,
    ph = a && a.spec.ph.find(p => a.t >= p.a[0] && a.t <= p.a[1]);
  if (ph && ph.fx == 'charge') {
    X.strokeStyle = '#ffd700';
    X.lineWidth = 3;
    X.beginPath();
    X.arc(0, -28, 24 + Math.sin(T / 2) * 4, 0, 7);
    X.stroke();
    for (let k = 0; k < 5; k++) {
      X.strokeRect(-26 + k * 13, -60 + (k % 2) * 60, 7, 5);
    }
  }

  // Bordes negros marcados estilo Metal Slug (lineWidth: 3)
  X.lineWidth = 3;
  X.strokeStyle = '#000';
  X.lineJoin = 'round';

  // Piernas y botas con sombreado 16-bits
  [
    [-10, -1],
    [2, 1]
  ].forEach(([lx, s]) => {
    const o = f.on && Math.abs(f.vx) > 1 ? Math.sin(T / 3) * 3 * s : 0;
    X.fillStyle = '#24242e';
    X.fillRect(lx + o, -14, 8, 14);
    X.fillStyle = '#4e4e60';
    X.fillRect(lx + o + 1, -14, 3, 10);
    X.fillStyle = '#14141a';
    X.fillRect(lx + o, -4, 9, 4);
    X.strokeRect(lx + o, -14, 8, 14);
  });

  // Torso con volumen celular de 3 tonos y solapas marcadas
  X.fillStyle = c.body;
  X.fillRect(-14, -40, 28, 28);
  X.fillStyle = 'rgba(0,0,0,.32)';
  X.fillRect(-14, -40, 9, 28);
  X.fillStyle = 'rgba(255,255,255,.26)';
  X.fillRect(5, -39, 5, 26);
  // Cinturón y hebilla metálica
  X.fillStyle = '#16161c';
  X.fillRect(-14, -16, 28, 4);
  X.fillStyle = '#e6c040';
  X.fillRect(-2, -16, 6, 4);
  X.strokeRect(-14, -40, 28, 28);

  // Brazo de ataque con borde negro de 3px
  X.fillStyle = c.skin;
  const ext = ph && ph.hb ? 20 : 0;
  X.fillRect(6, -36, 14 + ext * 0.6, 7);
  X.fillStyle = 'rgba(255,255,255,.28)';
  X.fillRect(6, -36, 14 + ext * 0.6, 2);
  X.strokeRect(6, -36, 14 + ext * 0.6, 7);

  // Cabeza con volumen pixel-art y expresión intensa
  X.fillStyle = c.skin;
  X.beginPath();
  X.arc(0, -46, 11, 0, 7);
  X.fill();
  X.stroke();
  X.fillStyle = 'rgba(255,255,255,.32)';
  X.fillRect(-6, -54, 5, 4);
  X.fillStyle = 'rgba(0,0,0,.18)';
  X.fillRect(-10, -45, 5, 6);
  // Ojo y ceja
  X.fillStyle = '#fff';
  X.fillRect(3, -49, 5, 4);
  X.fillStyle = '#111';
  X.fillRect(5, -48, 3, 3);
  X.fillRect(3, -51, 6, 2);

  // Rasgos distintivos de cada presidente
  X.lineWidth = 3;
  X.strokeStyle = '#000';
  d.drawCustomFeatures(X);

  // Arma equipada con borde negro marcado
  if (f.wpn > 0) {
    X.fillStyle = f.wk == 'case' ? '#2a2a2a' : '#e6b422';
    X.fillRect(16, -40, 16, 12);
    X.strokeStyle = '#000';
    X.lineWidth = 3;
    X.strokeRect(16, -40, 16, 12);
    if (f.wk == 'case') {
      X.fillStyle = '#e6b422';
      X.fillRect(22, -36, 4, 3);
    }
  }
  X.restore();

  // Efecto de hitbox activa con borde marcado
  if (ph && ph.hb) {
    const r = f.rect(ph.hb, f.wpn > 0 && a.spec.k == 'l');
    X.save();
    X.globalAlpha = 0.52;
    X.lineWidth = 3;
    X.strokeStyle = '#000';
    X.fillStyle =
      ph.fx == 'gold' || ph.fx == 'charge'
        ? '#ffd700'
        : ph.fx == 'saw'
        ? '#ffa030'
        : ph.fx == 'sword'
        ? '#cfe8ff'
        : '#fff';
    if (ph.fx == 'sword') {
      X.beginPath();
      X.arc(r.x + r.w / 2, r.y + r.h, r.h, Math.PI, 2 * Math.PI);
      X.fill();
      X.stroke();
    } else {
      X.fillRect(r.x, r.y, r.w, r.h);
      X.strokeRect(r.x, r.y, r.w, r.h);
    }
    if (ph.fx == 'saw') {
      X.fillStyle = '#ccc';
      for (let k = 0; k < 6; k++) X.fillRect(r.x + (k * r.w) / 6, r.y + (k % 2) * 4, 5, r.h - 8);
    }
    if (ph.fx == 'mallet') {
      X.fillStyle = '#8a5a2a';
      X.fillRect(r.x, r.y, r.w, r.h);
      X.strokeRect(r.x, r.y, r.w, r.h);
    }
    X.restore();
  }
}

// ---------- Tipografía Arcade Neo-Geo / Metal Slug y Overlays ----------
const pc = p => (p < 50 ? '#fff' : p < 100 ? '#ffe033' : p < 150 ? '#ff8a1f' : '#a30d0d');

function arcT(t, x, y, sz) {
  X.save();
  X.textAlign = 'center';
  X.lineJoin = 'round';
  X.font = '900 ' + sz + 'px Impact,Arial Black,system-ui';
  X.lineWidth = Math.max(4, sz / 4);
  X.strokeStyle = '#000';
  X.strokeText(t, x, y);
  const g = X.createLinearGradient(0, y - sz, 0, y);
  g.addColorStop(0, '#fff6a0');
  g.addColorStop(0.5, '#ffc01e');
  g.addColorStop(1, '#e8601a');
  X.fillStyle = g;
  X.fillText(t, x, y);
  X.restore();
}

function popMsg(t, l) {
  MSG = { t, l, m: l };
}

function drawMsg() {
  if (state == 'play' && MSG.l > 0) {
    const sc = Math.min(1, (MSG.m - MSG.l) / 8);
    arcT(MSG.t, W / 2, H * 0.38, Math.round(30 + 34 * sc));
  }
  FT.forEach(f => {
    X.save();
    X.globalAlpha = Math.min(1, f.l / 20);
    arcT(f.t, clamp(f.x, 170, W - 170), f.y - (f.m - f.l) * 0.5, 26);
    X.restore();
  });
}

function drawTel() {
  const b = TEL.t % 6 < 3;
  X.save();
  TEL.z.forEach((r, i) => {
    X.fillStyle = b ? 'rgba(255,30,30,.38)' : 'rgba(255,30,30,.16)';
    X.fillRect(r.x, r.y, r.w, r.h);
    X.strokeStyle = '#f22';
    X.lineWidth = 3;
    X.strokeRect(r.x, r.y, r.w, r.h);
    if (i == 0) {
      X.fillStyle = '#fff';
      X.strokeStyle = '#000';
      X.lineWidth = 4;
      X.font = 'bold 18px system-ui';
      X.textAlign = 'center';
      const tx = clamp(r.x + r.w / 2, 110, W - 110),
        ty = clamp(r.y + 22, 24, H - 12);
      X.strokeText('⚠️ ZONA DE IMPACTO', tx, ty);
      X.fillText('⚠️ ZONA DE IMPACTO', tx, ty);
    }
  });
  X.restore();
}

function drawCine() {
  if (!cine) return;
  const t = cine.t,
    f = cine.f,
    k = Math.min(1, t / 8),
    u = f.d.ult;
  X.save();
  X.translate(W / 2, H / 2);
  X.rotate(-0.18);
  X.fillStyle = f.d.c.acc;
  X.fillRect(-W * k, -62, W * 2 * k, 124);
  X.fillStyle = '#0a0c14';
  X.fillRect(-W * k, -50, W * 2 * k, 100);
  X.textAlign = 'center';
  X.fillStyle = '#fff';
  X.font = 'italic 900 38px system-ui';
  X.fillText(u.name.toUpperCase(), (1 - k) * -300, -4);
  X.fillStyle = f.d.c.acc;
  X.font = 'italic bold 26px system-ui';
  X.fillText('«' + u.cry + '»', (1 - k) * 300, 34);
  X.restore();
}

function drawBanner() {
  if (state != 'play' || !STG) return;
  const ph = hzPhase(),
    m = T % HC;
  if (!ph) return;
  X.save();
  X.textAlign = 'center';
  if (ph == 1) {
    X.globalAlpha = T % 30 < 15 ? 0.9 : 0.5;
    X.fillStyle = '#b00';
    X.fillRect(W / 2 - 230, 10, 460, 34);
    X.strokeStyle = '#000';
    X.lineWidth = 3;
    X.strokeRect(W / 2 - 230, 10, 460, 34);
    X.globalAlpha = 1;
    X.fillStyle = '#fff';
    X.font = 'bold 18px system-ui';
    X.fillText('⚠ ' + STG.hz.name.toUpperCase() + ' en ' + Math.ceil((HC - m) / 60) + 's', W / 2, 33);
    X.strokeStyle = 'rgba(255,40,40,.6)';
    X.lineWidth = 6;
    X.strokeRect(3, 3, W - 6, H - 6);
  } else {
    X.fillStyle = 'rgba(0,0,0,.68)';
    X.fillRect(W / 2 - 260, 10, 520, 30);
    X.strokeStyle = '#000';
    X.lineWidth = 3;
    X.strokeRect(W / 2 - 260, 10, 520, 30);
    X.fillStyle = '#ffd24a';
    X.font = 'bold 16px system-ui';
    X.fillText(STG.hz.msg, W / 2, 31);
  }
  X.restore();
}

function confetti() {
  for (let k = 0; k < 4; k++)
    CF.push({
      x: Math.random() * W,
      y: -10,
      vx: Math.random() * 2 - 1,
      vy: 2 + Math.random() * 3,
      r: Math.random() * 6,
      vr: Math.random() * 0.3 - 0.15,
      c: ['#ffd700', '#fff3a0', '#e6b422', '#fff'][k],
      s: 6 + Math.random() * 6
    });
  CF.forEach(p => {
    p.x += p.vx + Math.sin(p.y / 30);
    p.y += p.vy;
    p.r += p.vr;
  });
  CF = CF.filter(p => p.y < H + 20);
}

function drawChamp() {
  if (campaignState && state == 'play') {
    X.save();
    X.fillStyle = '#fff';
    X.font = 'bold 13px system-ui';
    X.textAlign = 'left';
    X.fillText('RONDA ' + (campaignState.round + 1) + '/7 · PUNTOS ' + campaignState.score, 12, 22);
    X.restore();
  }
  if (state != 'champ') return;
  CF.forEach(p => {
    X.save();
    X.translate(p.x, p.y);
    X.rotate(p.r);
    X.fillStyle = p.c;
    X.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    X.restore();
  });
  X.save();
  X.translate(W / 2, H * 0.4);
  X.shadowColor = '#ffd700';
  X.shadowBlur = 30;
  X.fillStyle = '#ffd24a';
  X.beginPath();
  X.moveTo(-50, -60);
  X.lineTo(50, -60);
  X.quadraticCurveTo(50, 10, 0, 30);
  X.quadraticCurveTo(-50, 10, -50, -60);
  X.fill();
  X.lineWidth = 8;
  X.strokeStyle = '#ffd24a';
  X.beginPath();
  X.arc(-52, -35, 20, Math.PI / 2, Math.PI * 1.5);
  X.stroke();
  X.beginPath();
  X.arc(52, -35, 20, -Math.PI / 2, Math.PI / 2);
  X.stroke();
  X.fillRect(-8, 30, 16, 30);
  X.fillRect(-35, 60, 70, 14);
  X.fillStyle = '#b8860b';
  X.font = 'bold 30px system-ui';
  X.textAlign = 'center';
  X.fillText('★', 0, -18);
  X.restore();
}

// ---------- Función Principal de Renderizado (draw) ----------
function draw() {
  X.setTransform(C.width / W, 0, 0, C.height / H, 0, 0);
  X.imageSmoothingEnabled = false;
  X.save();
  X.clearRect(0, 0, W, H);

  if (cine) {
    const z = 1 + Math.min(cine.t, 24) * 0.005,
      zx = cine.f.cx,
      zy = cine.f.y + 28;
    X.translate(zx, zy);
    X.scale(z, z);
    X.translate(-zx, -zy);
  }
  if (shake > 0) X.translate((Math.random() - 0.5) * shake * 1.4, (Math.random() - 0.5) * shake * 1.4);

  STG.bg(X);
  STG.hz.fx(X, hzPhase(), T % HC);

  // Plataformas con iluminación metálica Neo-Geo y bordes negros de 3px
  drawMetallicPlatforms();

  // Sombras proyectadas en el suelo bajo cada presidente e ítem
  drawDropShadows();

  // Ítems en el escenario con borde negro marcado
  IT.forEach(t => {
    X.save();
    X.shadowColor = '#ffd700';
    X.shadowBlur = 14 + Math.sin(T / 6) * 6;
    X.fillStyle = t.kind == 'case' ? '#2a2a2a' : '#e6b422';
    X.fillRect(t.x, t.y, t.w, t.h);
    X.strokeStyle = '#000';
    X.lineWidth = 3;
    X.strokeRect(t.x, t.y, t.w, t.h);
    X.fillStyle = '#ffd700';
    X.fillRect(t.x + t.w / 2 - 3, t.y + 4, 6, 5);
    X.restore();
  });

  if (cine) {
    X.fillStyle = 'rgba(0,0,0,.7)';
    X.fillRect(-60, -60, W + 120, H + 120);
  }
  if (TEL) drawTel();

  F.forEach(f => f.draw());
  UL.forEach(e => {
    X.save();
    if (e.draw) e.draw(e);
    X.restore();
  });

  // Proyectiles con bordes negros marcados (lineWidth: 3)
  PR.forEach(p => {
    X.save();
    X.lineWidth = 3;
    X.strokeStyle = '#000';
    if (p.kind == 'wall') {
      X.fillStyle = '#a8452e';
      X.fillRect(p.x, p.y, p.w, p.h);
      X.strokeRect(p.x, p.y, p.w, p.h);
      X.strokeStyle = '#5a1e10';
      X.lineWidth = 2;
      for (let k = 0; k < p.h; k += 15) X.strokeRect(p.x, p.y + k, p.w, 15);
    } else if (p.kind == 'bars') {
      X.fillStyle = '#b8c4d0';
      for (let k = 0; k < 4; k++) {
        X.fillRect(p.x + k * 10, p.y, 5, p.h);
        X.strokeRect(p.x + k * 10, p.y, 5, p.h);
      }
    } else if (p.kind == 'pulse') {
      X.shadowColor = '#ffe566';
      X.shadowBlur = 16;
      X.fillStyle = '#fff3a0';
      X.beginPath();
      X.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, 7);
      X.fill();
      X.stroke();
    } else if (p.kind == 'sonic') {
      X.strokeStyle = '#ffe9a0';
      X.lineWidth = 4;
      for (let k = 0; k < 3; k++) {
        X.globalAlpha = 1 - k * 0.3;
        X.beginPath();
        X.arc(p.x + p.w / 2 - Math.sign(p.vx) * k * 9, p.y + p.h / 2, p.h / 2, -1.2, 1.2 + (p.vx < 0 ? 0 : 0));
        X.stroke();
      }
      X.globalAlpha = 1;
    } else if (p.kind == 'shock') {
      X.fillStyle = '#a07040';
      X.beginPath();
      X.moveTo(p.x, p.y + p.h);
      X.lineTo(p.x + p.w / 2, p.y);
      X.lineTo(p.x + p.w, p.y + p.h);
      X.closePath();
      X.fill();
      X.stroke();
    } else {
      X.translate(p.x + 9, p.y + 9);
      X.rotate(T / 3);
      X.fillStyle = p.w2 == 'case' ? '#2a2a2a' : '#e6b422';
      X.fillRect(-9, -9, 18, 18);
      X.strokeRect(-9, -9, 18, 18);
    }
    X.restore();
  });

  // Partículas y Explosiones de Humo Escalonadas (Metal Slug 16-bits)
  PA.forEach(p => {
    const r = Math.max(0, p.l / p.m);
    if (p.ex === 2) {
      // Nube de humo escalonado en 4 fases discretas con contorno negro de 3px
      const stepScale = r > 0.75 ? 0.7 : r > 0.5 ? 1.0 : r > 0.25 ? 1.28 : 1.5;
      const sz = Math.round(p.z * stepScale);
      X.globalAlpha = r < 0.25 ? r / 0.25 : 0.92;
      X.fillStyle = r > 0.65 ? '#7a7e8c' : r > 0.35 ? '#484b56' : '#262830';
      X.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      X.fillStyle = 'rgba(255,255,255,0.2)';
      X.fillRect(p.x - sz / 2 + 2, p.y - sz / 2 + 2, Math.max(2, sz * 0.38), Math.max(2, sz * 0.38));
      X.strokeStyle = '#000';
      X.lineWidth = 3;
      X.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    } else if (p.ex === 1) {
      // Explosión ígnea escalonada que transiciona a humo denso
      X.globalAlpha = r < 0.3 ? r / 0.3 : 1;
      X.fillStyle = r > 0.78 ? '#fff6a0' : r > 0.56 ? '#ffc01e' : r > 0.36 ? '#ff6a10' : '#383a44';
      const stepMul = r > 0.6 ? 0.9 : r > 0.35 ? 1.15 : 1.38;
      const z = Math.round(p.z * stepMul);
      X.fillRect(p.x - z / 2, p.y - z / 2, z, z);
      if (r > 0.4) {
        X.fillStyle = '#fff';
        X.fillRect(p.x - z / 2 + 2, p.y - z / 2 + 2, Math.max(2, z * 0.3), Math.max(2, z * 0.3));
      }
      X.strokeStyle = '#000';
      X.lineWidth = 3;
      X.strokeRect(p.x - z / 2, p.y - z / 2, z, z);
    } else {
      X.globalAlpha = r;
      X.fillStyle = p.col;
      X.fillRect(p.x, p.y, p.z, p.z);
    }
  });
  X.globalAlpha = 1;
  X.restore();

  // Barras HUD con estilo Neo-Geo
  if (F.length) {
    F.forEach((f, i) => {
      const x = i ? W - 290 : 10,
        y = touchOn ? 30 : H - 122;
      X.fillStyle = 'rgba(10,12,20,.82)';
      X.fillRect(x, y, 280, 114);
      X.strokeStyle = '#000';
      X.lineWidth = 5;
      X.strokeRect(x, y, 280, 114);
      X.strokeStyle = f.d.c.acc;
      X.lineWidth = 3;
      X.strokeRect(x, y, 280, 114);
      X.fillStyle = '#fff';
      X.font = 'bold 18px system-ui';
      X.textAlign = 'left';
      X.fillText((f.boss ? 'JEFE · ' : i ? (f.ai ? 'CPU · ' : 'J2 · ') : 'J1 · ') + f.d.name, x + 10, y + 20);
      for (let s = 0; s < 3; s++) {
        X.fillStyle = s < f.stocks ? f.d.c.acc : '#333';
        X.beginPath();
        X.arc(x + 18 + s * 20, y + 76, 7, 0, 7);
        X.fill();
        X.strokeStyle = '#000';
        X.lineWidth = 2;
        X.stroke();
      }
      const sh = f.pShake > 0 ? (Math.random() - 0.5) * f.pShake : 0,
        sc = 1 + Math.min(f.pShake, 12) * 0.015;
      X.save();
      X.translate(x + 270 + sh, y + 74+ sh);
      X.scale(sc, sc);
      X.textAlign = 'right';
      X.font = 'bold 54px system-ui';
      X.lineWidth = 5;
      X.strokeStyle = '#000';
      const t = Math.floor(f.pct) + '%';
      X.strokeText(t, 0, 0);
      X.fillStyle = pc(f.pct);
      X.fillText(t, 0, 0);
      X.restore();

      if (f.dashCD <= 0) {
        X.fillStyle = '#6cf';
        X.font = '12px system-ui';
        X.textAlign = 'left';
        X.fillText('DASH ✓', x + 90, y + 80);
      }
      if (f.wpn > 0) {
        X.fillStyle = '#ffd700';
        X.font = '12px system-ui';
        X.fillText('ARMA ' + Math.ceil(f.wpn / 60) + 's', x + 150, y + 80);
      }

      const rd = f.vote >= 100,
        bx = x + 10,
        by = y + 88;
      X.fillStyle = '#222';
      X.fillRect(bx, by, 260, 18);
      X.fillStyle = rd ? (T % 16 < 8 ? '#ffd700' : '#fff3a0') : '#3a8dde';
      X.fillRect(bx, by, 260 * Math.min(1, f.vote / 100), 18);
      X.strokeStyle = '#000';
      X.lineWidth = 3;
      X.strokeRect(bx, by, 260, 18);
      X.fillStyle = rd ? '#111' : '#fff';
      X.font = 'bold 13px system-ui';
      X.textAlign = 'center';
      X.fillText(
        rd ? '¡LISTO! (' + (i ? 'U+I / M / Enter' : 'J+K / C / Espacio') + ')' : 'VOTO POPULAR ' + Math.floor(f.vote) + '%',
        bx + 130,
        by + 13
      );
    });
  }

  drawMsg();
  drawChamp();
  drawCine();
  drawBanner();
  if (state == 'play' && winner) {
    arcT('KO!', W / 2, H / 2, 80);
  }
}

// ---------- Sincronización Dinámica de los 12 Escenarios en UI y Campaña ----------
queueMicrotask(() => {
  const totalStages = STAGES_DATA.length;

  window.showSelect = function () {
    state = 'sel';
    F = [];
    campaignState = null;
    HC = 1200;
    clearTimeout(vsT);
    ui.style.display = 'flex';
    ui.style.background = '';
    const row = n =>
      `<h3>Jugador ${n + 1}${n ? (vsAI ? ' (IA)' : ' (Humano)') : ''}</h3><div class="g">${R.map(
        (d, k) =>
          `<button class="c${sel[n] == k ? ' on' : ''}" data-p="${n}" data-k="${k}"><i style="background:${
            d.c.body
          };border-color:${d.c.acc}"></i><b>${d.name}</b><small>${d.role}</small><small>★ ${
            d.sigName
          }</small></button>`
      ).join('')}</div>`;
    const stageOptions = [...STAGES_DATA.map(s => s.name), 'Aleatorio'];
    ui.innerHTML = `<h1>PRESIDENTIAL BRAWL</h1><p class="s">J1: A/D mover · W saltar (x3) · S caída rápida/bajar · J ligero · K signature · L esquive &nbsp;|&nbsp; J2: flechas · U/I/O (o Numpad 1/2/3). Esquive+Ataque lanza el arma. ULTIMATE con Voto Popular al 100%: J1 C / J+K / Espacio · J2 M / U+I / Enter / Numpad 0. Agarra paredes para el wall-jump.</p>${row(
      0
    )}${row(1)}<h3>Escenario (${totalStages} Sedes Mundiales)</h3><div class="g">${stageOptions
      .map(
        (n, k) =>
          `<button class="c${stageSel == k ? ' on' : ''}" data-s="${k}"><b>${n}</b><small>${
            k < totalStages ? STAGES_DATA[k].hz.name : 'Sorpresa (12 sedes)'
          }</small></button>`
      )
      .join('')}</div><div><button id="tg">Jugador 2: ${
      vsAI ? 'IA Competitiva' : 'Humano (Local)'
    }</button><button id="go">¡PELEAR!</button></div><div><button id="cm">★ MODO CUMBRE MUNDIAL (Campaña 1P) ★</button></div>${
      installEv
        ? '<div><button id="ins">📲 Instalar como App</button></div>'
        : isIOS && !standalone
        ? '<p class="s">iOS: Compartir ▸ «Añadir a pantalla de inicio» para instalar como app</p>'
        : ''
    }`;
    ui.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      A.init();
      if (b.dataset.p) {
        sel[+b.dataset.p] = +b.dataset.k;
        showSelect();
      } else if (b.dataset.s) {
        stageSel = +b.dataset.s;
        if (stageSel < totalStages) setStage(stageSel);
        showSelect();
      } else if (b.id == 'tg') {
        vsAI = !vsAI;
        showSelect();
      } else if (b.id == 'go') {
        start();
      } else if (b.id == 'cm') {
        startCampaign();
      } else if (b.id == 'ins' && installEv) {
        installEv.prompt();
        installEv = null;
        showSelect();
      }
    };
  };

  window.start = function () {
    campaignState = null;
    HC = 1200;
    setStage(stageSel >= totalStages ? Math.floor(Math.random() * totalStages) : stageSel);
    F = [new Fighter(0, R[sel[0]], false), new Fighter(1, R[sel[1]], vsAI)];
    PR = [];
    IT = [];
    PA = [];
    UL = [];
    cine = null;
    T = 0;
    freeze = 0;
    shake = 0;
    winner = null;
    state = 'play';
    ui.style.display = 'none';
  };

  window.showVS = function () {
    const c = campaignState,
      r = R[c.ladder[c.round]],
      boss = c.round == 6;
    state = 'vs';
    setStage((c.round * 2 + c.hero) % totalStages);
    F = [];
    ui.style.display = 'flex';
    ui.style.background = '';
    ui.onclick = null;
    ui.innerHTML = `<h1>${boss ? '★ GRAN FINAL ★' : 'RONDA ' + (c.round + 1) + ' DE 7'}</h1><div>${c.ladder
      .map(
        (k, j) =>
          `<span class="lad${j < c.round ? ' done' : j == c.round ? ' cur' : ''}">${j + 1}. ${R[k].name}${
            j == 6 ? ' 👑' : ''
          }</span>`
      )
      .join('')}</div><div class="big">${R[c.hero].name} <span style="color:#f55">VS</span> ${
      boss ? 'EL LÍDER SUPREMO · ' : ''
    }${r.name}</div><p class="s" style="font-size:16px">«${TAUNTS[r.id]}»</p><p class="s">Sede: <b>${
      STG.name
    }</b> (${STG.hz.name}) · Puntos: ${c.score}${c.last ? ' · Última ronda: +' + c.last : ''}</p>`;
    A.tone(200, 0.3, 'square', 200, 0.08);
    clearTimeout(vsT);
    vsT = setTimeout(() => {
      if (state == 'vs') startRound();
    }, 2500);
  };

  window.startRound = function () {
    const c = campaignState,
      boss = c.round == 6;
    setStage((c.round * 2 + c.hero) % totalStages);
    HC = boss ? 600 : 1200;
    F = [new Fighter(0, R[c.hero], false), new Fighter(1, R[c.ladder[c.round]], true)];
    const r = F[1];
    r.dif = boss ? 2 : c.round >= 3 ? 1 : 0;
    if (r.dif > 0) r.vote = 15;
    if (boss) {
      r.boss = 1;
      r.S = { ...r.S, weight: r.S.weight * 1.2 };
    }
    PR = [];
    IT = [];
    PA = [];
    UL = [];
    cine = null;
    T = 0;
    freeze = 0;
    shake = 0;
    winner = null;
    state = 'play';
    ui.style.display = 'none';
  };

  if (state == 'sel') showSelect();
});
