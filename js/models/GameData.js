// ============================================================
// MODELO DE DATOS: 12 Escenarios Paramétricos, 8 Presidentes, Zonas UZ, Guía y Frases
// ============================================================

const W = 960;
const H = 540;
const BZ = { l: -110, r: W + 110, t: -170, b: H + 110 };
const hbS = { fx: 8, y: -52, w: 46, h: 30 };

// ---------- Funciones Paramétricas Reutilizables para Fondos (bg) ----------
const sky = (X, a, b) => {
  const g = X.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  X.fillStyle = g;
  X.fillRect(-20, -20, W + 40, H + 40);
};

const stars = (X, n = 40, maxY = 220, col = '#fff', seed = 97) => {
  X.fillStyle = col;
  for (let k = 0; k < n; k++) {
    const s = k % 3 == 0 ? 3 : 2;
    X.fillRect((k * seed) % W, (k * 53) % maxY, s, s);
  }
};

const orb = (X, x, y, r, col, glow = null) => {
  X.save();
  if (glow) {
    const g = X.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
    g.addColorStop(0, glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = g;
    X.beginPath();
    X.arc(x, y, r * 2.2, 0, 7);
    X.fill();
  }
  X.fillStyle = col;
  X.beginPath();
  X.arc(x, y, r, 0, 7);
  X.fill();
  X.restore();
};

const sil = (X, pts, col, yBase = 390) => {
  X.fillStyle = col;
  X.beginPath();
  X.moveTo(0, yBase);
  pts.forEach(([x, y]) => X.lineTo(x, y));
  X.lineTo(W, yBase);
  X.closePath();
  X.fill();
};

const ground = (X, topCol, lineCol, y0 = 390) => {
  X.fillStyle = topCol;
  X.fillRect(0, y0, W, H - y0);
  if (lineCol) {
    X.strokeStyle = lineCol;
    X.lineWidth = 2;
    for (let k = 0; k < 32; k++) {
      X.beginPath();
      X.moveTo(k * 34, y0);
      X.lineTo(k * 34 - 30, H);
      X.stroke();
    }
  }
};

const cols = (X, x0, y, n, step, w, h, col, skip = []) => {
  X.fillStyle = col;
  for (let k = 0; k < n; k++) {
    if (skip.includes(k)) continue;
    X.fillRect(x0 + k * step, y, w, h);
  }
};

const arches = (X, x0, y, n, step, w, h, col, skip = []) => {
  X.fillStyle = col;
  const r = w / 2;
  for (let k = 0; k < n; k++) {
    if (skip.includes(k)) continue;
    const x = x0 + k * step;
    X.fillRect(x, y, w, h);
    X.beginPath();
    X.arc(x + r, y, r, Math.PI, 0);
    X.fill();
  }
};

const pediment = (X, x1, y1, xm, ym, x2, col) => {
  X.fillStyle = col;
  X.beginPath();
  X.moveTo(x1, y1);
  X.lineTo(xm, ym);
  X.lineTo(x2, y1);
  X.closePath();
  X.fill();
};

const flg = (X, x, y, w, h, cs, v) =>
  cs.forEach((c, i) => {
    X.fillStyle = c;
    v
      ? X.fillRect(x + (i * w) / cs.length, y, w / cs.length + 0.5, h)
      : X.fillRect(x, y + (i * h) / cs.length, w, h / cs.length + 0.5);
  });

const pole = (X, x, y, h) => {
  X.fillStyle = '#ccc';
  X.fillRect(x, y, 3, h);
};

// ---------- 12 Escenarios Elegibles (STAGES_DATA) ----------
const STAGES_DATA = [
  // 1. La Casa Blanca
  {
    id: 'blanca',
    name: 'La Casa Blanca',
    main: { x: 290, y: 390, w: 380, h: 60 },
    plats: [
      { x: 80, y: 260, w: 170 },
      { x: 710, y: 260, w: 170 }
    ],
    pm: '#6b6f7e',
    pt: '#8c91a3',
    pl: '#8a8f9c',
    pl2: '#c9ceda',
    bg(X) {
      sky(X, '#050a1c', '#22305c');
      stars(X, 40, 200, '#fff');
      orb(X, 820, 70, 24, '#f4efd0', 'rgba(244,239,208,.25)');
      ground(X, '#0f2418', null);
      X.fillStyle = '#16301f';
      for (let k = 0; k < 12; k++) {
        X.beginPath();
        X.arc(k * 90 + 20, 392, 34, Math.PI, 0);
        X.fill();
      }
      X.fillStyle = '#d6d9e4';
      X.fillRect(230, 210, 500, 180);
      pediment(X, 250, 210, 480, 140, 710, '#d6d9e4');
      pediment(X, 300, 204, 480, 158, 660, '#f4f5fa');
      cols(X, 262, 240, 8, 58, 16, 26, '#ffe9a8');
      cols(X, 285, 206, 9, 52, 14, 184, '#f6f6fa');
      X.fillStyle = '#bfc3d2';
      X.fillRect(250, 206, 460, 6);
      [150, 810].forEach((x, i) => {
        pole(X, x, 170, 230);
        const fx = i ? x - 44 : x + 3;
        flg(X, fx, 172, 44, 26, ['#c22', '#fff', '#c22', '#fff', '#c22', '#fff', '#c22']);
        X.fillStyle = '#1c3a8a';
        X.fillRect(fx, 172, 18, 14);
      });
    },
    hz: {
      name: 'Foco del Marine One',
      msg: '¡VIENTO! Marine One empuja hacia los bordes',
      dur: 300,
      tick(ph, m) {
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead <= 0) nudge(f, (f.cx < W / 2 ? -1 : 1) * 1.3);
          });
          if (m % 2 == 0) {
            const x = Math.random() * W;
            PA.push({
              x,
              y: Math.random() * H,
              vx: (x < W / 2 ? -1 : 1) * (6 + Math.random() * 6),
              vy: 0,
              l: 30,
              m: 30,
              col: '#dfe8f5',
              z: 3
            });
          }
        }
      },
      fx(X, ph, m) {
        if (ph == 1 && T % 20 < 10) {
          orb(X, 12, 70, 6, '#f33');
        }
        if (ph == 2) {
          const hx = -80 + (m / this.dur) * (W + 160),
            hy = 70 + Math.sin(m / 18) * 8,
            sx = Math.sin(m / 25) * 120;
          X.fillStyle = 'rgba(255,255,210,.22)';
          X.beginPath();
          X.moveTo(hx - 5, hy + 10);
          X.lineTo(hx + 5, hy + 10);
          X.lineTo(hx + 80 + sx, H);
          X.lineTo(hx - 80 + sx, H);
          X.fill();
          X.fillStyle = '#1a1f2a';
          X.beginPath();
          X.ellipse(hx, hy, 26, 12, 0, 0, 7);
          X.fill();
          X.fillRect(hx - 62, hy - 3, 40, 5);
          X.fillRect(hx - 64, hy - 14, 4, 18);
          X.fillRect(hx - 40 * Math.abs(Math.cos(m / 2)), hy - 16, 80 * Math.abs(Math.cos(m / 2)), 3);
          orb(X, hx + 4, hy + 11, 4, '#ffd');
        }
      }
    }
  },

  // 2. Casa de Nariño
  {
    id: 'narino',
    name: 'Casa de Nariño',
    main: { x: 320, y: 390, w: 320, h: 60 },
    plats: [
      { x: 130, y: 300, w: 130 },
      { x: 700, y: 300, w: 130 },
      { x: 415, y: 215, w: 130 }
    ],
    pm: '#8a7a66',
    pt: '#b59f80',
    pl: '#9a7448',
    pl2: '#d9b878',
    bg(X) {
      sky(X, '#3a2a66', '#f2a460');
      orb(X, 480, 350, 70, '#ffd27a', 'rgba(255,210,122,.3)');
      sil(
        X,
        [
          [0, 300],
          [120, 230],
          [230, 300],
          [330, 250],
          [450, 330],
          [600, 260],
          [740, 320],
          [860, 240],
          [W, 310]
        ],
        '#4a3a6a'
      );
      X.fillStyle = '#eadfc2';
      X.fillRect(180, 240, 600, 150);
      X.fillStyle = '#f4ebd2';
      X.fillRect(400, 205, 160, 185);
      pediment(X, 390, 205, 480, 165, 570, '#f4ebd2');
      arches(X, 205, 270, 8, 70, 26, 46, '#6a5a40', [3, 4]);
      X.fillRect(462, 300, 36, 90);
      cols(X, 414, 230, 5, 30, 12, 28, '#fff3c0');
      pole(X, 478, 95, 75);
      flg(X, 481, 97, 40, 28, ['#fcd116', '#fcd116', '#003893', '#ce1126']);
      ground(X, '#7d6a52', '#65553f');
      [110, 850].forEach(x => {
        X.fillStyle = '#222';
        X.fillRect(x, 310, 4, 80);
        orb(X, x + 2, 306, 8, '#ffd070');
      });
    },
    hz: {
      name: 'Cañonazo de Gala',
      msg: '¡CAÑONAZO! Sube a las plataformas aéreas',
      dur: 240,
      tick(ph, m) {
        if (ph == 2 && m % 80 == 0) {
          [
            [10, 7, 1],
            [W - 44, -7, -1]
          ].forEach(([x, vx, dir]) => {
            PR.push({
              x,
              y: MAIN.y - 34,
              w: 34,
              h: 34,
              vx,
              vy: 0,
              life: 140,
              kind: 'sonic',
              owner: null,
              dir,
              d: { dmg: 9, bk: 5.5, ks: 0.18, ang: -55, heavy: 1 },
              hit: 0,
              done: []
            });
            burst(x + (dir > 0 ? 40 : -6), MAIN.y - 18, '#ffcf6a', 14, 6);
          });
          A.heavy();
          shake = Math.max(shake, 5);
        }
      },
      fx(X, ph) {
        if (ph < 1) return;
        X.globalAlpha = ph == 1 && T % 20 < 10 ? 0.5 : 1;
        [0, 1].forEach(s => {
          const x = s ? W - 64 : 0;
          X.fillStyle = '#6f6350';
          X.fillRect(x, MAIN.y - 4, 64, H);
          X.fillStyle = '#222';
          X.fillRect(x + 10, MAIN.y - 32, 44, 14);
          orb(X, x + 32, MAIN.y - 12, 9, '#5a3a1a');
          const gx = s ? x + 52 : x + 2;
          X.fillStyle = '#b22';
          X.fillRect(gx, MAIN.y - 26, 10, 22);
          orb(X, gx + 5, MAIN.y - 32, 5, '#e0b080');
          X.fillStyle = '#111';
          X.fillRect(gx, MAIN.y - 40, 10, 4);
        });
        X.globalAlpha = 1;
      }
    }
  },

  // 3. La Casa Rosada
  {
    id: 'rosada',
    name: 'La Casa Rosada',
    main: { x: 290, y: 390, w: 380, h: 60 },
    plats: [
      { x: 80, y: 290, w: 150, amp: 45, ph: 0 },
      { x: 730, y: 290, w: 150, amp: 45, ph: Math.PI }
    ],
    pm: '#7c7c86',
    pt: '#a0a0ac',
    pl: '#c06a86',
    pl2: '#f2a8c0',
    bg(X) {
      sky(X, '#4a9be0', '#cfe6ff');
      X.fillStyle = '#fff';
      [
        [120, 70],
        [420, 50],
        [760, 90]
      ].forEach(([x, y]) => {
        X.beginPath();
        X.arc(x, y, 22, 0, 7);
        X.arc(x + 26, y + 4, 18, 0, 7);
        X.arc(x - 24, y + 6, 16, 0, 7);
        X.fill();
      });
      X.fillStyle = '#e58aa8';
      X.fillRect(140, 200, 680, 190);
      X.fillStyle = '#c4688a';
      X.fillRect(140, 190, 680, 16);
      X.fillStyle = '#f0a0b8';
      X.fillRect(400, 150, 160, 240);
      X.fillStyle = '#c4688a';
      X.fillRect(400, 140, 160, 12);
      for (let k = 0; k < 10; k++) {
        if (k == 4 || k == 5) continue;
        const x = 160 + k * 66;
        X.fillStyle = '#7a2a48';
        X.fillRect(x, 240, 28, 50);
        X.beginPath();
        X.arc(x + 14, 240, 14, Math.PI, 0);
        X.fill();
        X.fillStyle = k % 2 ? '#ffe08a' : '#a8486a';
        X.fillRect(x + 4, 252, 20, 36);
        X.fillStyle = '#fff';
        X.fillRect(x - 3, 290, 34, 4);
      }
      X.fillStyle = '#fff';
      X.fillRect(436, 166, 88, 8);
      X.fillStyle = '#fff0b0';
      X.beginPath();
      X.arc(480, 196, 16, Math.PI, 0);
      X.fillRect(464, 196, 32, 40);
      X.fill();
      pole(X, 478, 70, 72);
      flg(X, 481, 72, 44, 26, ['#74acdf', '#fff', '#74acdf']);
      orb(X, 503, 85, 5, '#f6b40e');
      ground(X, '#8a8a94', '#767680');
    },
    hz: {
      name: 'El Balcón Presidencial',
      msg: '¡LLUVIA DE DECRETOS! Gravedad reducida',
      dur: 360,
      tick(ph, m) {
        if (ph == 2) {
          GF = 0.6;
          F.forEach(f => {
            if (f.dead <= 0) nudge(f, (f.cx < W / 2 ? -1 : 1) * 1);
          });
          if (m % 90 == 0) A.tone(200, 0.4, 'sawtooth', 300, 0.08);
          for (let k = 0; k < 2; k++)
            PA.push({
              x: Math.random() * W,
              y: -10,
              vx: Math.random() * 2 - 1,
              vy: 1 + Math.random(),
              l: 260,
              m: 260,
              col: '#f6f2e0',
              z: 7
            });
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        if (ph == 1 && T % 20 < 10) {
          X.fillStyle = 'rgba(255,240,150,.5)';
          X.fillRect(436, 150, 88, 90);
        }
        X.fillStyle = '#ffd24a';
        X.beginPath();
        X.moveTo(W / 2 - 8, 166);
        X.lineTo(W / 2 + 22, 154);
        X.lineTo(W / 2 + 22, 182);
        X.lineTo(W / 2 - 8, 174);
        X.fill();
        if (ph == 2)
          for (let k = 0; k < 3; k++) {
            const r = (((m + k * 30) % 90) / 90) * 520;
            X.strokeStyle = 'rgba(255,235,160,' + (1 - r / 520) + ')';
            X.lineWidth = 6;
            X.beginPath();
            X.arc(W / 2, 170, r, 0, 7);
            X.stroke();
          }
      }
    }
  },

  // 4. Palacio Nacional / Zócalo México
  {
    id: 'zocalo',
    name: 'Palacio Nacional · Zócalo',
    main: { x: 270, y: 390, w: 420, h: 60 },
    plats: [
      { x: 90, y: 275, w: 150 },
      { x: 720, y: 275, w: 150 },
      { x: 405, y: 200, w: 150 }
    ],
    pm: '#785a4c',
    pt: '#a87d68',
    pl: '#8c3b32',
    pl2: '#d99b66',
    bg(X) {
      sky(X, '#1e1638', '#d96b43');
      stars(X, 28, 160, '#ffe6b0', 79);
      // Fachada de tezontle y cantera del Palacio Nacional
      X.fillStyle = '#8f392c';
      X.fillRect(110, 210, 740, 180);
      X.fillStyle = '#c8b294';
      X.fillRect(110, 200, 740, 12);
      X.fillRect(390, 145, 180, 245);
      // Almenas coloniales
      cols(X, 120, 186, 24, 30, 14, 14, '#c8b294');
      // Arcos del primer nivel y balcones
      arches(X, 136, 315, 10, 70, 32, 75, '#3b1e1a', [4, 5]);
      cols(X, 142, 236, 10, 70, 22, 36, '#ffe090', [4, 5]);
      // Nicho de la Campana de Dolores
      X.fillStyle = '#3b1e1a';
      X.beginPath();
      X.arc(480, 190, 24, Math.PI, 0);
      X.fillRect(456, 190, 48, 30);
      X.fill();
      X.fillStyle = '#d4af37';
      X.beginPath();
      X.arc(480, 192, 13, Math.PI, 0);
      X.lineTo(497, 212);
      X.lineTo(463, 212);
      X.closePath();
      X.fill();
      // Asta Bandera Monumental del Zócalo
      pole(X, 478, 52, 95);
      flg(X, 481, 56, 54, 32, ['#006847', '#fff', '#ce1126'], true);
      orb(X, 508, 72, 5, '#c8962e');
      ground(X, '#625652', '#4c413e');
    },
    hz: {
      name: 'Campanazo Sísmico',
      msg: '¡CAMPANAZO SÍSMICO! Salta para esquivar el temblor',
      dur: 260,
      tick(ph, m) {
        if (ph == 2 && m % 65 == 0) {
          A.heavy();
          A.tone(520, 0.35, 'triangle', -180, 0.1);
          shake = Math.max(shake, 16);
          for (let k = 0; k < 6; k++) {
            burst(MAIN.x + 40 + k * 65, MAIN.y, '#d99b66', 10, 6, 22);
          }
          F.forEach(f => {
            if (f.dead <= 0 && f.on && !f.pl) {
              hurt(f, null, { dmg: 8, bk: 6.5, ks: 0.16, ang: -82, heavy: 1 }, f.face);
            }
          });
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        const swing = ph == 2 ? Math.sin(m / 4) * 0.45 : Math.sin(T / 3) * 0.15;
        X.save();
        X.translate(480, 182);
        X.rotate(swing);
        X.fillStyle = '#ffd700';
        X.beginPath();
        X.arc(0, 10, 16, Math.PI, 0);
        X.lineTo(20, 32);
        X.lineTo(-20, 32);
        X.closePath();
        X.fill();
        X.restore();
        if (ph == 2) {
          const r = ((m % 65) / 65) * 440;
          X.strokeStyle = 'rgba(255, 210, 70, ' + (1 - r / 440) + ')';
          X.lineWidth = 6;
          X.beginPath();
          X.arc(480, 195, r, 0, 7);
          X.stroke();
        }
      }
    }
  },

  // 5. CECOT / Búnker Táctico San Salvador
  {
    id: 'cecot',
    name: 'CECOT · Búnker Táctico',
    main: { x: 260, y: 390, w: 440, h: 60 },
    plats: [
      { x: 110, y: 270, w: 140 },
      { x: 710, y: 270, w: 140 }
    ],
    pm: '#3a4250',
    pt: '#647285',
    pl: '#465264',
    pl2: '#7bd4ff',
    bg(X) {
      sky(X, '#060911', '#182436');
      // Muros blindados y torres de vigilancia
      X.fillStyle = '#1f2630';
      X.fillRect(60, 150, 110, 240);
      X.fillRect(790, 150, 110, 240);
      X.fillStyle = '#293240';
      X.fillRect(170, 220, 620, 170);
      cols(X, 200, 245, 8, 74, 34, 16, '#7bd4ff');
      // Alambre táctico superior y reflectores
      X.strokeStyle = '#8fa0b5';
      X.lineWidth = 2;
      for (let k = 0; k < 30; k++) {
        X.beginPath();
        X.arc(175 + k * 20, 216, 7, 0, 7);
        X.stroke();
      }
      pole(X, 478, 120, 100);
      flg(X, 481, 122, 44, 26, ['#0f47af', '#fff', '#0f47af']);
      ground(X, '#1b2028', '#2c3542');
    },
    hz: {
      name: 'Rejas Láser en los Bordes',
      msg: '¡CLAUSURA LÁSER! Rejas de energía en los bordes',
      dur: 300,
      tick(ph, m) {
        if (ph == 2) {
          const edges = [MAIN.x, MAIN.x + MAIN.w - 22];
          F.forEach(f => {
            if (f.dead > 0) return;
            edges.forEach((ex, idx) => {
              if (ov({ x: ex, y: MAIN.y - 160, w: 22, h: 160 }, f)) {
                const dir = idx == 0 ? 1 : -1;
                if (hurt(f, null, { dmg: 10, bk: 7.5, ks: 0.18, ang: -35, heavy: 1 }, dir)) {
                  A.tone(880, 0.15, 'sawtooth', -400, 0.08);
                  burst(f.cx, f.y + 28, '#ff3355', 16, 6);
                }
              }
            });
          });
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        const edges = [MAIN.x + 6, MAIN.x + MAIN.w - 6];
        edges.forEach(x => {
          X.fillStyle = '#222';
          X.fillRect(x - 10, MAIN.y - 12, 20, 12);
          if (ph == 1 && T % 14 < 7) {
            orb(X, x, MAIN.y - 14, 6, '#ff2244', 'rgba(255,34,68,.5)');
          } else if (ph == 2) {
            X.strokeStyle = m % 4 < 2 ? '#ff2244' : '#ff99aa';
            X.lineWidth = 5;
            for (let b = -6; b <= 6; b += 6) {
              X.beginPath();
              X.moveTo(x + b, MAIN.y - 160);
              X.lineTo(x + b, MAIN.y);
              X.stroke();
            }
            X.fillStyle = 'rgba(255, 30, 60, 0.22)';
            X.fillRect(x - 12, MAIN.y - 160, 24, 160);
          }
        });
      }
    }
  },

  // 6. Lincoln Memorial Siglo XIX
  {
    id: 'lincoln',
    name: 'Lincoln Memorial · Siglo XIX',
    main: { x: 260, y: 390, w: 440, h: 60 },
    plats: [
      { x: 100, y: 265, w: 160 },
      { x: 700, y: 265, w: 160 },
      { x: 400, y: 190, w: 160 }
    ],
    pm: '#6e6459',
    pt: '#9e9080',
    pl: '#7d6b58',
    pl2: '#d8cbb8',
    bg(X) {
      sky(X, '#2c221e', '#c99868');
      orb(X, 180, 95, 38, '#ffe6b8', 'rgba(255,230,184,.28)');
      // Templo neoclásico de mármol
      X.fillStyle = '#cbbba4';
      X.fillRect(210, 155, 540, 32);
      X.fillStyle = '#dfd3c0';
      X.fillRect(230, 182, 500, 16);
      X.fillStyle = '#332b24';
      X.fillRect(250, 198, 460, 192);
      // Estatua monumental sentada en el centro
      X.fillStyle = '#e8dec8';
      X.fillRect(455, 255, 50, 95);
      orb(X, 480, 240, 14, '#e8dec8');
      // Columnata dórica
      cols(X, 242, 198, 10, 50, 22, 192, '#efe6d5');
      ground(X, '#4a3d33', '#332922');
      // Rieles de ferrocarril sobre el suelo
      X.fillStyle = '#8c7a6b';
      for (let k = 0; k < 32; k++) X.fillRect(k * 30, 386, 16, 4);
    },
    hz: {
      name: 'Expreso de Vapor',
      msg: '¡LOCOMOTORA DE VAPOR! Sube a las plataformas',
      dur: 180,
      tick(ph, m) {
        if (ph == 2) {
          const tx = -280 + (m / this.dur) * (W + 560);
          if (m == 1) A.tone(240, 0.5, 'sawtooth', -30, 0.1);
          if (m % 3 == 0) {
            PA.push({
              x: tx + 90,
              y: MAIN.y - 95,
              vx: -2,
              vy: -1.8,
              l: 38,
              m: 38,
              col: '#d0cbc4',
              z: 10,
              ex: 1
            });
          }
          F.forEach(f => {
            if (f.dead <= 0 && ov({ x: tx - 140, y: MAIN.y - 84, w: 280, h: 86 }, f)) {
              hurt(f, null, { dmg: 12, bk: 8.5, ks: 0.2, ang: -48, heavy: 1 }, 1);
            }
          });
        }
      },
      fx(X, ph, m) {
        if (ph == 1 && T % 16 < 8) {
          X.fillStyle = '#ffcc33';
          X.fillRect(16, MAIN.y - 70, 28, 56);
        }
        if (ph == 2) {
          const tx = -280 + (m / this.dur) * (W + 560);
          X.save();
          X.translate(tx, MAIN.y);
          X.fillStyle = '#1b1d24';
          X.fillRect(-140, -64, 200, 54);
          X.fillRect(40, -88, 70, 78);
          X.fillStyle = '#b82828';
          X.fillRect(46, -98, 58, 10);
          X.fillStyle = '#2b2f3a';
          X.fillRect(72, -108, 22, 26);
          pediment(X, 110, -10, 145, 0, 110, '#b82828');
          for (let k = 0; k < 5; k++) orb(X, -110 + k * 46, -8, 14, '#c89d3c');
          orb(X, 108, -68, 9, '#fff2a0', 'rgba(255,242,160,.5)');
          X.restore();
        }
      }
    }
  },

  // 7. Paso de los Andes
  {
    id: 'andes',
    name: 'Paso de los Andes',
    main: { x: 270, y: 390, w: 420, h: 60 },
    plats: [
      { x: 95, y: 275, w: 145 },
      { x: 720, y: 275, w: 145 }
    ],
    pm: '#5b6e82',
    pt: '#b8d8f0',
    pl: '#6a829a',
    pl2: '#dff2ff',
    bg(X) {
      sky(X, '#0c1b33', '#6ca6d9');
      // Cumbres de la Cordillera de los Andes
      sil(
        X,
        [
          [0, 280],
          [110, 140],
          [220, 250],
          [370, 110],
          [510, 230],
          [660, 120],
          [810, 240],
          [910, 150],
          [W, 260]
        ],
        '#2b4363'
      );
      // Picos nevados
      pediment(X, 65, 198, 110, 140, 155, '#f2f8ff');
      pediment(X, 315, 180, 370, 110, 425, '#f2f8ff');
      pediment(X, 605, 185, 660, 120, 715, '#f2f8ff');
      // Cóndor andino planeando
      const cx = (T * 1.4) % (W + 120) - 60,
        cy = 85 + Math.sin(T / 20) * 14;
      X.strokeStyle = '#141a24';
      X.lineWidth = 4;
      X.beginPath();
      X.moveTo(cx - 22, cy - Math.sin(T / 6) * 6);
      X.quadraticCurveTo(cx - 8, cy - 8, cx, cy);
      X.quadraticCurveTo(cx + 8, cy - 8, cx + 22, cy - Math.sin(T / 6) * 6);
      X.stroke();
      ground(X, '#a8c6df', '#7d9db8');
    },
    hz: {
      name: 'Ventisca y Piso de Hielo',
      msg: '¡VENTISCA ANDINA! Piso de hielo ultra resbaladizo',
      dur: 340,
      tick(ph, m) {
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead <= 0) {
              if (f.on) {
                f.vx = clamp(f.vx * 1.18, -9.5, 9.5);
                if (Math.abs(f.vx) > 1.5 && m % 3 == 0) {
                  PA.push({ x: f.cx, y: f.y + f.h, vx: -f.vx * 0.2, vy: -0.5, l: 18, m: 18, col: '#e8f8ff', z: 4 });
                }
              }
              nudge(f, Math.sin(m / 45) * 0.9);
            }
          });
          for (let k = 0; k < 3; k++) {
            PA.push({
              x: Math.random() * W,
              y: -10,
              vx: 5 + Math.random() * 4,
              vy: 2 + Math.random() * 2,
              l: 70,
              m: 70,
              col: '#ffffff',
              z: 4
            });
          }
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        X.fillStyle = ph == 1 && T % 16 < 8 ? 'rgba(180,240,255,.35)' : 'rgba(190,245,255,.78)';
        X.fillRect(MAIN.x, MAIN.y, MAIN.w, 10);
        PLAT.forEach(p => X.fillRect(p.x, p.y, p.w, 6));
      }
    }
  },

  // 8. Estadio de Johannesburgo
  {
    id: 'johannesburgo',
    name: 'Estadio de Johannesburgo',
    main: { x: 260, y: 390, w: 440, h: 60 },
    plats: [
      { x: 100, y: 270, w: 150 },
      { x: 710, y: 270, w: 150 },
      { x: 405, y: 190, w: 150 }
    ],
    pm: '#2a6b3f',
    pt: '#48b868',
    pl: '#b86828',
    pl2: '#ffd24a',
    bg(X) {
      sky(X, '#0b1326', '#263b5e');
      // Arco monumental del estadio y reflectores
      X.strokeStyle = '#d9822b';
      X.lineWidth = 14;
      X.beginPath();
      X.arc(W / 2, 460, 390, Math.PI * 1.08, Math.PI * 1.92);
      X.stroke();
      [180, 320, 640, 780].forEach(x => orb(X, x, 130, 12, '#fffbe0', 'rgba(255,250,200,.45)'));
      // Gradas y flashes del público
      X.fillStyle = '#1b2436';
      X.fillRect(60, 250, 840, 140);
      stars(X, 55, 130, '#ffd700', 67);
      ground(X, '#1e5c32', '#174726');
    },
    hz: {
      name: 'Onda Dorada de Ubuntu',
      msg: '¡ONDA DORADA! Salto aumentado un +35%',
      dur: 340,
      tick(ph, m) {
        if (ph == 2) {
          GF = 0.72;
          F.forEach(f => {
            if (f.dead <= 0 && f.vy < -8) {
              f.vy *= 1.03;
              if (m % 2 == 0)
                PA.push({ x: f.cx, y: f.y + f.h, vx: (Math.random() - 0.5) * 2, vy: 1.5, l: 20, m: 20, col: '#ffd700', z: 5 });
            }
          });
          if (m % 4 == 0) {
            PA.push({
              x: MAIN.x + Math.random() * MAIN.w,
              y: MAIN.y,
              vx: 0,
              vy: -3 - Math.random() * 2,
              l: 45,
              m: 45,
              col: '#ffd24a',
              z: 5
            });
          }
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        const yWave = MAIN.y - ((m * 3) % 180);
        X.strokeStyle = 'rgba(255, 215, 0, ' + (ph == 1 ? 0.35 : 0.7 * (1 - ((m * 3) % 180) / 180)) + ')';
        X.lineWidth = 5;
        X.beginPath();
        X.moveTo(MAIN.x, yWave);
        X.lineTo(MAIN.x + MAIN.w, yWave);
        X.stroke();
      }
    }
  },

  // 9. El Kremlin / Plaza Roja
  {
    id: 'kremlin',
    name: 'El Kremlin · Plaza Roja',
    main: { x: 280, y: 390, w: 400, h: 60 },
    plats: [
      { x: 95, y: 270, w: 155 },
      { x: 710, y: 270, w: 155 }
    ],
    pm: '#6e2b2b',
    pt: '#a84242',
    pl: '#823232',
    pl2: '#e6c040',
    bg(X) {
      sky(X, '#141c30', '#415a77');
      stars(X, 35, 190, '#e0f0ff', 83);
      // Muralla roja del Kremlin y Torre Spásskaya
      X.fillStyle = '#8b2626';
      X.fillRect(100, 250, 760, 140);
      cols(X, 110, 232, 25, 30, 16, 18, '#8b2626');
      X.fillStyle = '#9e2b2b';
      X.fillRect(435, 130, 90, 260);
      pediment(X, 440, 130, 480, 62, 520, '#2a6f4e');
      // Estrella roja y reloj dorado
      orb(X, 480, 56, 9, '#ff2222', 'rgba(255,40,40,.6)');
      orb(X, 480, 175, 20, '#111');
      orb(X, 480, 175, 16, '#ffd700');
      // Cúpulas bulbosas estilo San Basilio
      [
        [240, 210, 24, '#e63946'],
        [290, 195, 28, '#2a9d8f'],
        [670, 195, 28, '#f4a261'],
        [720, 210, 24, '#457b9d']
      ].forEach(([x, y, r, c]) => {
        orb(X, x, y, r, c);
        pediment(X, x - r * 0.6, y - r * 0.6, x, y - r * 1.6, x + r * 0.6, c);
      });
      ground(X, '#4a4e58', '#343840');
    },
    hz: {
      name: 'Invierno Ruso',
      msg: '¡INVIERNO RUSO! No te quedes quieto o te congelarás',
      dur: 320,
      tick(ph, m) {
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead > 0) return;
            const still = Math.abs(f.vx) < 1.2 && Math.abs(f.vy) < 1.2 && !f.atk;
            f._frost = still ? (f._frost || 0) + 1 : Math.max(0, (f._frost || 0) - 2);
            if (f._frost > 15) f.vx *= 0.65;
            if (f._frost >= 45) {
              f._frost = 0;
              f.stun = 34;
              f.pct += 5;
              A.tone(1100, 0.2, 'triangle', -500, 0.08);
              burst(f.cx, f.y + 28, '#80f0ff', 18, 5);
            }
          });
          if (m % 2 == 0) {
            PA.push({
              x: Math.random() * W,
              y: -10,
              vx: (Math.random() - 0.5) * 2,
              vy: 2.5 + Math.random() * 2,
              l: 90,
              m: 90,
              col: '#d8f4ff',
              z: 4
            });
          }
        } else {
          F.forEach(f => (f._frost = 0));
        }
      },
      fx(X, ph) {
        if (ph < 1) return;
        X.fillStyle = 'rgba(160, 225, 255, ' + (ph == 1 ? 0.12 : 0.22) + ')';
        X.fillRect(0, 0, W, H);
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead <= 0 && f._frost > 10) {
              X.strokeStyle = '#7ff';
              X.lineWidth = 3;
              X.strokeRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
            }
          });
        }
      }
    }
  },

  // 10. Torre Eiffel París
  {
    id: 'eiffel',
    name: 'Torre Eiffel · París',
    main: { x: 280, y: 390, w: 400, h: 60 },
    plats: [
      { x: 100, y: 280, w: 145 },
      { x: 715, y: 280, w: 145 },
      { x: 410, y: 195, w: 140 }
    ],
    pm: '#4a4656',
    pt: '#827c96',
    pl: '#665c49',
    pl2: '#ffd875',
    bg(X) {
      sky(X, '#0a0f24', '#2e294e');
      stars(X, 42, 220, '#fff7cc', 71);
      // Silueta de hierro de la Torre Eiffel
      pediment(X, 370, 390, 480, 45, 590, '#6e583b');
      pediment(X, 415, 390, 480, 140, 545, '#19182c');
      X.fillStyle = '#9c7e54';
      X.fillRect(420, 270, 120, 12);
      X.fillRect(445, 175, 70, 10);
      orb(X, 480, 45, 10, '#fff3a0', 'rgba(255,243,160,.6)');
      [140, 820].forEach(x => {
        pole(X, x, 240, 150);
        flg(X, x + 3, 242, 42, 26, ['#002395', '#fff', '#ed2939'], true);
      });
      ground(X, '#2c2a38', '#423f54');
    },
    hz: {
      name: 'Faro de la Ciudad de la Luz',
      msg: '¡REFLECTOR CENTRAL! +20% de daño bajo la luz',
      dur: 320,
      tick(ph, m) {
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead <= 0 && Math.abs(f.cx - W / 2) < 150) {
              if (m % 12 == 0) f.vote = Math.min(100, f.vote + 1);
              if (f.stun == 12) f.pct += 1.8;
              if (m % 4 == 0) PA.push({ x: f.cx + (Math.random() - 0.5) * 24, y: f.y, vx: 0, vy: -1, l: 18, m: 18, col: '#fff3a0', z: 4 });
            }
          });
        }
      },
      fx(X, ph) {
        if (ph < 1) return;
        X.save();
        X.globalAlpha = ph == 1 && T % 16 < 8 ? 0.2 : 0.42;
        const g = X.createLinearGradient(0, 45, 0, MAIN.y);
        g.addColorStop(0, 'rgba(255,245,170,.9)');
        g.addColorStop(1, 'rgba(255,215,80,.2)');
        X.fillStyle = g;
        X.beginPath();
        X.moveTo(472, 45);
        X.lineTo(488, 45);
        X.lineTo(W / 2 + 155, MAIN.y);
        X.lineTo(W / 2 - 155, MAIN.y);
        X.closePath();
        X.fill();
        X.restore();
      }
    }
  },

  // 11. Ciudad Prohibida Pekín
  {
    id: 'pekin',
    name: 'Ciudad Prohibida · Pekín',
    main: { x: 265, y: 390, w: 430, h: 60 },
    plats: [
      { x: 95, y: 270, w: 155 },
      { x: 710, y: 270, w: 155 },
      { x: 405, y: 195, w: 150 }
    ],
    pm: '#7a2222',
    pt: '#d4af37',
    pl: '#9e2a2b',
    pl2: '#ffd24a',
    bg(X) {
      sky(X, '#1a091e', '#6b1d2f');
      stars(X, 34, 180, '#ffd880', 61);
      // Palacio Imperial con techo dorado de doble alero
      X.fillStyle = '#8c1d24';
      X.fillRect(190, 240, 580, 150);
      pediment(X, 150, 242, 480, 185, 810, '#e0a82e');
      X.fillStyle = '#9e242b';
      X.fillRect(280, 185, 400, 55);
      pediment(X, 240, 188, 480, 130, 720, '#f2c14e');
      cols(X, 225, 242, 9, 62, 14, 148, '#d4af37');
      // Faroles imperiales rojos
      [150, 310, 650, 810].forEach(x => orb(X, x, 255, 11, '#ff3322', 'rgba(255,80,30,.5)'));
      ground(X, '#4a3c38', '#332825');
    },
    hz: {
      name: 'Pirotecnia Imperial',
      msg: '¡PIROTECNIA IMPERIAL! Explosiones en las plataformas',
      dur: 300,
      tick(ph, m) {
        if (ph == 2 && m % 50 == 0) {
          const idx = (m / 50) % PLAT.length | 0;
          const p = PLAT[idx] || MAIN;
          const ex = p.x + p.w / 2,
            ey = p.y - 18;
          A.heavy();
          shake = Math.max(shake, 8);
          burst(ex, ey, ['#ff3355', '#ffd700', '#33ffaa'][idx % 3], 28, 8, 28);
          F.forEach(f => {
            if (f.dead <= 0 && Math.hypot(f.cx - ex, f.y + 28 - ey) < 95) {
              hurt(f, null, { dmg: 9, bk: 6.5, ks: 0.18, ang: -65, heavy: 1 }, f.cx >= ex ? 1 : -1);
            }
          });
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        const idx = (((m + 20) / 50) % PLAT.length) | 0;
        const p = PLAT[idx] || MAIN;
        if (T % 10 < 5) {
          X.strokeStyle = '#ffd700';
          X.lineWidth = 3;
          X.beginPath();
          X.arc(p.x + p.w / 2, p.y - 18, 36, 0, 7);
          X.stroke();
        }
      }
    }
  },

  // 12. Asamblea General de la ONU
  {
    id: 'onu',
    name: 'Asamblea General de la ONU',
    main: { x: 260, y: 390, w: 440, h: 60 },
    plats: [
      { x: 100, y: 270, w: 150 },
      { x: 710, y: 270, w: 150 },
      { x: 405, y: 185, w: 150 }
    ],
    pm: '#2a5a4c',
    pt: '#52b788',
    pl: '#1d4e89',
    pl2: '#74c0fc',
    bg(X) {
      sky(X, '#0b1e36', '#1b4965');
      // Muro curvo dorado de la Asamblea General y Emblema de la ONU
      X.fillStyle = '#b58840';
      X.fillRect(180, 120, 600, 270);
      cols(X, 195, 120, 24, 24, 8, 270, '#8f682c');
      orb(X, 480, 225, 62, '#4ea8de', 'rgba(78,168,222,.45)');
      X.strokeStyle = '#ffffff';
      X.lineWidth = 3;
      [24, 42, 58].forEach(r => {
        X.beginPath();
        X.arc(480, 225, r, 0, 7);
        X.stroke();
      });
      // Podio de mármol verde
      X.fillStyle = '#2d6a4f';
      X.fillRect(430, 320, 100, 70);
      ground(X, '#1b3a4b', '#122632');
    },
    hz: {
      name: 'Atracción al Podio Central',
      msg: '¡ATRACCIÓN AL PODIO! El vórtice diplomático atrae al centro',
      dur: 320,
      tick(ph, m) {
        if (ph == 2) {
          F.forEach(f => {
            if (f.dead <= 0) {
              const dx = W / 2 - f.cx;
              nudge(f, clamp(dx * 0.035, -2.2, 2.2));
              f.vx += Math.sign(dx) * 0.18;
            }
          });
          if (m % 3 == 0) {
            const a = Math.random() * 6.28;
            PA.push({
              x: W / 2 + Math.cos(a) * 140,
              y: MAIN.y - 45 + Math.sin(a) * 60,
              vx: -Math.cos(a) * 4,
              vy: -Math.sin(a) * 2,
              l: 28,
              m: 28,
              col: '#74c0fc',
              z: 5
            });
          }
        }
      },
      fx(X, ph, m) {
        if (ph < 1) return;
        for (let k = 0; k < 3; k++) {
          const r = 140 - (((m * 2 + k * 45) % 135) / 135) * 125;
          X.strokeStyle = 'rgba(116, 192, 252, ' + (ph == 1 ? 0.3 : 0.75 * (1 - r / 145)) + ')';
          X.lineWidth = 4;
          X.beginPath();
          X.arc(W / 2, MAIN.y - 45, r, 0, 7);
          X.stroke();
        }
      }
    }
  }
];

// ---------- los 8 Presidentes (PRESIDENTS_DATA) ----------
const PRESIDENTS_DATA = [
  {
    id: 'muralla',
    name: 'Don Muralla',
    era: 'Actual',
    role: 'Tanque pesado',
    stats: { speed: 3.2, weight: 1.6, jumpForce: 11.5, power: 1.25 },
    c: { skin: '#f0b890', body: '#1b2a5a', acc: '#d22' },
    drawCustomFeatures(c) {
      c.fillStyle = '#f4c542';
      c.beginPath();
      c.ellipse(3, -55, 13, 6, 0.2, 0, 7);
      c.fill();
      c.stroke();
      c.fillStyle = '#d11';
      c.fillRect(1, -36, 5, 28);
    },
    ult: {
      name: 'Arancel del 1000% / Torre Dorada',
      cry: '¡Va a ser ENORME!',
      fire(f, o) {
        const X0 = W / 2 - 60;
        addUL(
          f,
          o,
          90,
          e => {
            const y0 = -480,
              y1 = MAIN.y - 430,
              p = Math.min(1, e.t / 30);
            e.ty = y0 + (y1 - y0) * p * p;
            for (let k = 0; k < 3; k++)
              PA.push({
                x: Math.random() * W,
                y: -10,
                vx: Math.random() - 0.5,
                vy: 4 + Math.random() * 3,
                l: 90,
                m: 90,
                col: '#7ad67a',
                z: 8
              });
            if (!e.h && e.t <= 34 && ov({ x: X0, y: e.ty, w: 120, h: 430 }, e.o) && uh(e, -65, sg(f, e.o))) e.h = 1;
            if (e.t == 30) {
              shake = 24;
              A.heavy();
              burst(W / 2, MAIN.y, '#ffd700', 40, 9);
              if (
                !e.h &&
                Math.abs(e.o.cx - W / 2) < 150 &&
                e.o.y + e.o.h > MAIN.y - 130 &&
                uh(e, -70, sg({ cx: W / 2 }, e.o))
              )
                e.h = 1;
            }
          },
          e => {
            const y = e.ty;
            if (y == null) return;
            X.fillStyle = '#e6b422';
            X.fillRect(X0, y, 120, 430);
            X.strokeStyle = '#000';
            X.lineWidth = 3;
            X.strokeRect(X0, y, 120, 430);
            X.fillStyle = '#fff3a0';
            X.fillRect(X0 + 2, y + 2, 12, 426);
            X.fillStyle = '#8a6a10';
            for (let r = 0; r < 14; r++)
              for (let c = 0; c < 3; c++) X.fillRect(X0 + 16 + c * 34, y + 20 + r * 28, 20, 16);
            X.fillStyle = '#c22';
            X.font = 'bold 26px system-ui';
            X.textAlign = 'center';
            X.fillText('$$$', W / 2, y + 410);
          }
        );
      }
    },
    signatureType: 'wall',
    sigName: 'The Great Wall',
    sig: {
      dur: 48,
      ph: [],
      sp: [{ t: 12, p: { fx: 34, y: -120, w: 34, h: 120, vx: 0, life: 26, kind: 'wall', dmg: 11, bk: 7, ks: 0.22, ang: -85 } }]
    }
  },
  {
    id: 'libertario',
    name: 'El Libertario',
    era: 'Actual',
    role: 'Rushdown / Berserker',
    stats: { speed: 6.2, weight: 0.8, jumpForce: 12.5, power: 1 },
    c: { skin: '#f0b890', body: '#22232b', acc: '#e8c020' },
    drawCustomFeatures(c) {
      c.fillStyle = '#4a3020';
      c.fillRect(-14, -52, 9, 20);
      for (let k = -3; k <= 3; k++) {
        c.beginPath();
        c.moveTo(k * 4 - 3, -52);
        c.lineTo(k * 5, -66 - (k % 2 ? 4 : 0));
        c.lineTo(k * 4 + 3, -52);
        c.fill();
      }
      c.fillRect(2, -47, 4, 9);
    },
    ult: {
      name: 'Hiper-Motosierra ¡Afuera!',
      cry: '¡AFUERA!',
      fire(f, o) {
        f.inv = 125;
        let vx = sg(f, o) * 11,
          vy = -8;
        addUL(
          f,
          o,
          120,
          e => {
            if (f.dead > 0) {
              e.t = e.dur;
              return;
            }
            if (e.t % 35 == 0) {
              const dx = o.cx - f.cx,
                dy = o.y - f.y,
                d = Math.hypot(dx, dy) || 1;
              vx = (dx / d) * 13;
              vy = (dy / d) * 13;
            }
            f.x += vx;
            f.y += vy;
            if (f.x < 10 || f.x > W - 40) vx = -vx;
            if (f.y < 30 || f.y > 440) vy = -vy;
            f.x = clamp(f.x, 10, W - 40);
            f.y = clamp(f.y, 30, 440);
            f.vx = f.vy = 0;
            f.stun = 0;
            f.atk = null;
            f.dashT = 0;
            f.airJ = 2;
            f.inv = Math.max(f.inv, 4);
            (e.tr = e.tr || []).push({ x: f.cx, y: f.y + 28 });
            if (e.tr.length > 18) e.tr.shift();
            if (e.t % 9 == 0 && ov({ x: f.x - 6, y: f.y - 6, w: f.w + 12, h: f.h + 12 }, o)) {
              A.saw();
              uh(e, -25, sg(f, o), { dmg: 8, bk: 3, ks: 0.05, heavy: 0 });
            }
            if (e.t == e.dur - 1) {
              if (ov({ x: f.x - 16, y: f.y - 16, w: f.w + 32, h: f.h + 32 }, o))
                uh(e, -30, sg(f, o), { dmg: 14, bk: 17 });
              if (ov(f, MAIN)) f.y = MAIN.y - f.h;
            }
          },
          e => {
            const t = e.tr || [];
            X.lineWidth = 14;
            for (let k = 1; k < t.length; k++) {
              X.strokeStyle = k % 2 ? '#ffd400' : '#111';
              X.beginPath();
              X.moveTo(t[k - 1].x, t[k - 1].y);
              X.lineTo(t[k].x, t[k].y);
              X.stroke();
            }
          }
        );
      }
    },
    signatureType: 'chainsaw',
    sigName: 'Plan Motosierra',
    sig: {
      dur: 58,
      ph: [
        { a: [6, 36], hb: { fx: 8, y: -52, w: 52, h: 30 }, dmg: 2, bk: 1.8, ks: 0.03, ang: -12, mv: 4.5, every: 6, fx: 'saw' },
        { a: [40, 46], hb: { fx: 8, y: -56, w: 56, h: 36 }, dmg: 6, bk: 5, ks: 0.2, ang: -25, mv: 2 }
      ],
      sp: []
    }
  },
  {
    id: 'barrotes',
    name: 'Comandante Barrotes',
    era: 'Actual',
    role: 'Táctico / Equilibrado',
    stats: { speed: 4.6, weight: 1.1, jumpForce: 12, power: 1.05 },
    c: { skin: '#e0aa80', body: '#1a1d24', acc: '#9ab' },
    drawCustomFeatures(c) {
      c.fillStyle = '#f4f4f4';
      c.fillRect(-11, -56, 22, 8);
      c.fillRect(-18, -52, 9, 3);
      c.fillStyle = '#111';
      c.fillRect(1, -48, 11, 5);
      c.fillStyle = '#2a2a2a';
      c.fillRect(-4, -37, 12, 4);
    },
    ult: {
      name: 'Mega-CECOT Orbital',
      cry: '¡Sin salida!',
      fire(f, o) {
        addUL(
          f,
          o,
          110,
          e => {
            const t = e.t;
            if (t < 36) {
              e.lx = o.cx;
              e.ly = o.y + o.h;
            }
            if (t == 40) A.tone(900, 0.25, 'square', -500, 0.08);
            if (t >= 45 && !e.ex) {
              e.cy = -170 + (t - 45) * 24;
              const c = { x: e.lx - 55, y: e.cy, w: 110, h: 130 };
              if (c.y + 130 >= e.ly || c.y > H - 60 || ov(c, o)) {
                e.ex = 1;
                e.et = t;
                shake = 26;
                A.heavy();
                burst(e.lx, e.ly, '#ffb030', 50, 10);
                if (Math.hypot(o.cx - e.lx, o.y + 28 - e.ly) < 120) uh(e, -72, o.cx >= e.lx ? 1 : -1);
              }
            }
          },
          e => {
            if (e.lx == null) return;
            const t = e.t;
            if (t < 45) {
              X.strokeStyle = 'rgba(255,40,40,' + (t % 6 < 3 ? 0.9 : 0.5) + ')';
              X.lineWidth = 4;
              X.beginPath();
              X.moveTo(e.lx, 0);
              X.lineTo(e.lx, e.ly);
              X.stroke();
              X.beginPath();
              X.arc(e.lx, e.ly, 20 + Math.sin(t) * 3, 0, 7);
              X.stroke();
            } else if (!e.ex) {
              X.fillStyle = '#9fb0c0';
              X.fillRect(e.lx - 55, e.cy, 110, 130);
              X.strokeStyle = '#000';
              X.lineWidth = 3;
              X.strokeRect(e.lx - 55, e.cy, 110, 130);
              X.fillStyle = '#1a2230';
              for (let k = 0; k < 6; k++) X.fillRect(e.lx - 50 + k * 18, e.cy + 8, 6, 114);
            } else {
              const r = (t - e.et) * 12;
              X.fillStyle = 'rgba(255,170,50,' + Math.max(0, 0.6 - (t - e.et) / 30) + ')';
              X.beginPath();
              X.arc(e.lx, e.ly, r, 0, 7);
              X.fill();
            }
          }
        );
      }
    },
    signatureType: 'bars',
    sigName: 'Régimen de Excepción',
    sig: {
      dur: 52,
      ph: [],
      sp: [{ t: 10, p: { fx: 50, y: -110, w: 38, h: 110, vx: 0, life: 14, kind: 'bars', dmg: 8, bk: 7, ks: 0.22, ang: -50, hold: 40 } }]
    }
  },
  {
    id: 'pulso',
    name: 'Doctora Pulso',
    era: 'Actual',
    role: 'Zoner / Científica',
    stats: { speed: 4.3, weight: 0.9, jumpForce: 14.5, power: 1 },
    c: { skin: '#e6b48c', body: '#38306a', acc: '#2d9' },
    drawCustomFeatures(c) {
      c.fillStyle = '#2b1b12';
      c.beginPath();
      c.ellipse(-13, -52, 6, 13, 0.5, 0, 7);
      c.fill();
      c.fillRect(-11, -56, 22, 6);
      c.lineWidth = 3;
      ['#0a6', '#fff', '#c22'].forEach((k, i) => {
        c.strokeStyle = k;
        c.beginPath();
        c.moveTo(-14 + i * 3, -38);
        c.lineTo(12 + i * 3, -12);
        c.stroke();
      });
    },
    ult: {
      name: 'Tormenta Solar Soberana',
      cry: '¡Energía soberana!',
      fire(f, o) {
        f.inv = 70;
        addUL(
          f,
          o,
          115,
          e => {
            const x0 = -90 + (e.t * (W + 520)) / 100;
            e.bx = [0, 1, 2].map(k => x0 - k * 170);
            e.hh = e.hh || [0, 0, 0];
            e.bx.forEach((x, k) => {
              if (!e.hh[k] && ov({ x: x - 30, y: -50, w: 60, h: H + 100 }, o) && uh(e, -55, 1, k ? { dmg: 14, bk: 8 } : {}))
                e.hh[k] = 1;
              if (e.t % 3 == 0 && x > 0 && x < W) burst(x, MAIN.y - 40 + Math.random() * 60, '#fff7a0', 3, 5, 14);
            });
            if (e.t % 10 == 0) A.tone(300 + Math.random() * 400, 0.15, 'sawtooth', 300, 0.06);
          },
          e => {
            (e.bx || []).forEach(x => {
              const g = X.createLinearGradient(x - 45, 0, x + 45, 0);
              g.addColorStop(0, 'rgba(255,220,60,0)');
              g.addColorStop(0.5, 'rgba(255,255,220,.95)');
              g.addColorStop(1, 'rgba(255,220,60,0)');
              X.fillStyle = g;
              X.fillRect(x - 45, 0, 90, H);
              X.strokeStyle = '#fff';
              X.lineWidth = 3;
              X.beginPath();
              let y = 0;
              X.moveTo(x, 0);
              while (y < H) {
                y += 30;
                X.lineTo(x + (Math.random() - 0.5) * 40, y);
              }
              X.stroke();
            });
          }
        );
      }
    },
    signatureType: 'pulse',
    sigName: 'Pulso de Energía',
    sig: {
      dur: 42,
      ph: [],
      sp: [{ t: 12, p: { fx: 20, y: -52, w: 34, h: 24, vx: 9, life: 45, kind: 'pulse', dmg: 9, bk: 4.5, ks: 0.14, ang: -25 } }]
    }
  },
  {
    id: 'tigre',
    name: 'El Tigre Togado',
    era: 'Actual',
    role: 'Duelista elegante',
    stats: { speed: 5.1, weight: 1, jumpForce: 12, power: 1.1 },
    c: { skin: '#e6b48c', body: '#2c2f3a', acc: '#e5b422' },
    drawCustomFeatures(c) {
      c.fillStyle = '#e8e0cc';
      c.fillRect(-17, -55, 34, 3);
      c.fillRect(-9, -66, 18, 12);
      c.fillStyle = '#822';
      c.fillRect(-9, -58, 18, 3);
      c.fillStyle = '#222';
      c.fillRect(4, -38, 5, 8);
      c.fillStyle = '#c11';
      c.fillRect(6, -31, 6, 5);
    },
    ult: {
      name: 'Veredicto del Tigre Supremo',
      cry: '¡Justicia felina!',
      fire(f, o) {
        const d = f.face;
        addUL(
          f,
          o,
          95,
          e => {
            const p = Math.min(1, e.t / 70);
            e.tx = d > 0 ? -320 + p * (W + 640) : W + 320 - p * (W + 640);
            if (!e.h && e.t < 75 && ov({ x: e.tx - 110, y: MAIN.y - 150, w: 220, h: 160 }, o) && uh(e, -28, d)) {
              e.h = 1;
              burst(o.cx, o.y + 28, '#ffd700', 40, 10);
            }
          },
          e => {
            if (e.tx == null) return;
            X.fillStyle = 'rgba(0,0,0,.25)';
            X.fillRect(0, 0, W, H);
            X.translate(e.tx, MAIN.y - 100);
            X.scale(d, 1);
            X.shadowColor = '#ffd700';
            X.shadowBlur = 30;
            X.strokeStyle = '#ffe066';
            X.lineWidth = 7;
            X.fillStyle = 'rgba(255,190,30,.35)';
            X.beginPath();
            X.ellipse(0, 0, 120, 60, 0, 0, 7);
            X.fill();
            X.stroke();
            X.beginPath();
            X.arc(110, -30, 48, 0, 7);
            X.fill();
            X.stroke();
            X.beginPath();
            X.moveTo(85, -70);
            X.lineTo(95, -95);
            X.lineTo(112, -76);
            X.moveTo(125, -76);
            X.lineTo(143, -92);
            X.lineTo(146, -62);
            X.stroke();
            for (let k = 0; k < 5; k++) {
              X.beginPath();
              X.moveTo(-70 + k * 35, -55);
              X.lineTo(-60 + k * 35, -20);
              X.stroke();
            }
            X.beginPath();
            X.moveTo(-120, 0);
            X.quadraticCurveTo(-190, -60, -170, -100);
            X.stroke();
            X.fillStyle = '#fff';
            X.beginPath();
            X.arc(122, -38, 6, 0, 7);
            X.fill();
          }
        );
      }
    },
    signatureType: 'tiger',
    sigName: 'Zarpazo del Tigre',
    sig: {
      dur: 54,
      ph: [
        { a: [6, 22], hb: { fx: 0, y: -58, w: 52, h: 48 }, dmg: 5, bk: 3, ks: 0.06, ang: -15, mv: 9, fx: 'gold' },
        { a: [30, 36], hb: { fx: 6, y: -92, w: 58, h: 70 }, dmg: 9, bk: 6, ks: 0.23, ang: -35, mv: 0, fx: 'mallet' }
      ],
      sp: []
    }
  },
  {
    id: 'lenador',
    name: 'Honesto Leñador',
    era: 'Histórico',
    role: 'Alcance pesado',
    stats: { speed: 3.7, weight: 1.3, jumpForce: 11.5, power: 1.2 },
    c: { skin: '#d8a47c', body: '#15151a', acc: '#888' },
    drawCustomFeatures(c) {
      c.fillStyle = '#111';
      c.fillRect(-15, -56, 30, 3);
      c.fillRect(-9, -88, 18, 32);
      c.fillStyle = '#c33';
      c.fillRect(-9, -62, 18, 3);
      c.fillStyle = '#222';
      c.fillRect(-9, -38, 19, 9);
    },
    ult: {
      name: 'Unión Indestructible',
      cry: '¡Todos a bordo!',
      fire(f, o) {
        const d = f.face;
        A.tone(260, 0.6, 'sawtooth', -40, 0.1);
        addUL(
          f,
          o,
          80,
          e => {
            const p = Math.min(1, e.t / 55);
            e.tx = d > 0 ? -360 + p * (W + 720) : W + 360 - p * (W + 720);
            if (!e.h && e.t < 60 && ov({ x: e.tx - 170, y: MAIN.y - 96, w: 340, h: 102 }, o) && uh(e, -38, d)) e.h = 1;
            if (e.t % 2 == 0)
              PA.push({
                x: e.tx - d * 130,
                y: MAIN.y - 110,
                vx: -d,
                vy: -1.5,
                l: 40,
                m: 40,
                col: '#bbb',
                z: 10 + Math.random() * 8
              });
            if (e.t % 3 == 0) burst(e.tx, MAIN.y - 6, '#ffb030', 3, 6, 12);
          },
          e => {
            if (e.tx == null) return;
            X.translate(e.tx, MAIN.y);
            X.scale(d, 1);
            X.fillStyle = '#14161c';
            X.fillRect(-170, -70, 230, 60);
            X.fillRect(60, -96, 80, 86);
            X.fillStyle = '#b22';
            X.fillRect(70, -110, 60, 14);
            X.fillStyle = '#14161c';
            X.fillRect(-140, -100, 26, 34);
            X.beginPath();
            X.moveTo(140, -10);
            X.lineTo(175, 0);
            X.lineTo(140, 0);
            X.fill();
            X.fillStyle = '#d33';
            for (let k = 0; k < 5; k++) {
              X.beginPath();
              X.arc(-130 + k * 50, -8, 16, 0, 7);
              X.fill();
            }
            X.fillStyle = '#ffd24a';
            X.beginPath();
            X.arc(100, -84, 9, 0, 7);
            X.fill();
          }
        );
      }
    },
    signatureType: 'quake',
    sigName: 'Golpe de Emancipación',
    sig: {
      dur: 54,
      hop: { t: 4, vy: -7 },
      ph: [{ a: [16, 22], hb: { fx: 6, y: -70, w: 50, h: 70 }, dmg: 8, bk: 5, ks: 0.2, ang: -60, fx: 'mallet' }],
      sp: [
        { t: 17, p: { fx: 20, y: -24, w: 26, h: 24, vx: 6, life: 34, kind: 'shock', dmg: 7, bk: 4, ks: 0.16, ang: -50 } },
        { t: 17, p: { fx: 20, y: -24, w: 26, h: 24, vx: -6, life: 34, kind: 'shock', dmg: 7, bk: 4, ks: 0.16, ang: -50, back: 1 } }
      ]
    }
  },
  {
    id: 'libertador',
    name: 'El Gran Libertador',
    era: 'Histórico',
    role: 'Espadachín ágil',
    stats: { speed: 5.4, weight: 1, jumpForce: 12.5, power: 1.1 },
    c: { skin: '#d8a47c', body: '#1e3d8a', acc: '#e33' },
    drawCustomFeatures(c) {
      c.fillStyle = '#e6c040';
      c.fillRect(-18, -41, 9, 5);
      c.fillRect(9, -41, 9, 5);
      c.fillStyle = '#c22';
      c.fillRect(-10, -38, 20, 4);
      c.fillStyle = '#3a2616';
      c.fillRect(-11, -56, 22, 6);
      c.strokeStyle = '#dfe8f0';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(20, -30);
      c.lineTo(48, -52);
      c.stroke();
    },
    ult: {
      name: 'Tormenta de los Libertadores',
      cry: '¡Carga!',
      fire(f, o) {
        const d = f.face,
          sy = f.y;
        f.inv = 100;
        addUL(
          f,
          o,
          130,
          e => {
            if (f.dead > 0) {
              e.t = e.dur;
              return;
            }
            const t = e.t;
            f.vx = f.vy = 0;
            f.stun = 0;
            f.atk = null;
            f.dashT = 0;
            f.airJ = 2;
            f.y = t <= 18 ? sy - 110 * Math.sin(((t / 18) * Math.PI) / 2) : sy - 110;
            e.m = e.m || [];
            if (t >= 20 && t < 80 && (t - 20) % 6 == 0) {
              A.sword();
              e.m.push({ x: f.cx + d * 30, y: 70 + ((t - 20) / 6) * 38, k: (t - 20) / 6 });
            }
            e.m.forEach(m => {
              m.x += d * 13;
              if (!e.h && ov({ x: d > 0 ? m.x - 10 : m.x - 80, y: m.y - 74, w: 90, h: 148 }, o) && uh(e, -35, d)) e.h = 1;
            });
          },
          e => {
            (e.m || []).forEach(m => {
              X.strokeStyle = ['#fcd116', '#003893', '#ce1126'][m.k % 3];
              X.lineWidth = 18;
              X.beginPath();
              d > 0 ? X.arc(m.x, m.y, 70, -1.1, 1.1) : X.arc(m.x, m.y, 70, Math.PI - 1.1, Math.PI + 1.1);
              X.stroke();
            });
          }
        );
      }
    },
    signatureType: 'uppercut',
    sigName: 'Carga de los Andes',
    sig: {
      dur: 42,
      hop: { t: 8, vy: -9 },
      ph: [{ a: [8, 18], hb: { fx: -6, y: -100, w: 56, h: 78 }, dmg: 10, bk: 6.5, ks: 0.27, ang: -82, fx: 'sword' }],
      sp: []
    }
  },
  {
    id: 'sabio',
    name: 'El Sabio Boxeador',
    era: 'Histórico',
    role: 'Brawler / Boxeador',
    stats: { speed: 4.6, weight: 1.15, jumpForce: 12, power: 1.15 },
    c: { skin: '#6b4430', body: '#d9822b', acc: '#2a9d5c' },
    drawCustomFeatures(c) {
      c.fillStyle = '#ccc';
      c.fillRect(-11, -55, 22, 5);
      ['#2a9d5c', '#e33', '#26c'].forEach((k, i) => {
        c.fillStyle = k;
        c.fillRect(-10 + i * 9, -34 + i * 5, 6, 6);
      });
      c.fillStyle = '#d22';
      c.beginPath();
      c.arc(24, -31, 8, 0, 7);
      c.fill();
      c.stroke();
    },
    ult: {
      name: 'Espíritu de Invictus',
      cry: '¡Soy el dueño de mi destino!',
      fire(f, o) {
        f.inv = 45;
        A.heavy();
        addUL(
          f,
          o,
          55,
          e => {
            e.r = Math.min(230, e.t * 9);
            e.cx = f.cx;
            e.cy = f.y + 28;
            if (!e.h && Math.hypot(o.cx - e.cx, o.y + 28 - e.cy) < e.r + 10 && uh(e, -18, sg(f, o), { bk: 20 })) e.h = 1;
          },
          e => {
            if (e.r == null) return;
            const g = X.createRadialGradient(e.cx, e.cy, e.r * 0.5, e.cx, e.cy, e.r);
            g.addColorStop(0, 'rgba(255,230,120,.15)');
            g.addColorStop(1, 'rgba(255,200,40,.75)');
            X.globalAlpha = Math.max(0, 1 - e.t / 55);
            X.fillStyle = g;
            X.beginPath();
            X.arc(e.cx, e.cy, e.r, 0, 7);
            X.fill();
            X.strokeStyle = '#fff';
            X.lineWidth = 5;
            X.stroke();
          }
        );
      }
    },
    signatureType: 'breaker',
    sigName: 'Rompecadenas',
    sig: {
      dur: 56,
      ph: [
        { a: [0, 30], armor: 1, fx: 'charge' },
        { a: [31, 38], hb: { fx: 8, y: -58, w: 56, h: 34 }, dmg: 12, bk: 6.5, ks: 0.25, ang: -8, fx: 'gold' }
      ],
      sp: []
    }
  }
];

const R = PRESIDENTS_DATA;

// ---------- Zonas de Impacto Telegraph (UZ) ----------
const UZ = {
  muralla: () => [
    { x: W / 2 - 150, y: MAIN.y - 130, w: 300, h: 130 },
    { x: W / 2 - 60, y: 0, w: 120, h: MAIN.y - 130 }
  ],
  libertario: (f, o) => [
    {
      x: Math.min(f.cx, o.cx) - 20,
      y: Math.min(f.y, o.y) - 10,
      w: Math.abs(o.cx - f.cx) + 40,
      h: Math.abs(o.y - f.y) + 80
    }
  ],
  barrotes: (f, o) => [{ x: o.cx - 120, y: o.y + o.h - 200, w: 240, h: 200 }],
  pulso: () => [{ x: 0, y: 0, w: 90, h: H }],
  tigre: () => [{ x: 0, y: MAIN.y - 150, w: W, h: 160 }],
  lenador: () => [{ x: 0, y: MAIN.y - 96, w: W, h: 102 }],
  libertador: f => [{ x: f.face > 0 ? f.cx : 0, y: 60, w: f.face > 0 ? W - f.cx : f.cx, h: 360 }],
  sabio: f => [{ x: f.cx - 230, y: f.y + 28 - 230, w: 460, h: 460 }]
};

// ---------- Frases de Campaña (TAUNTS) ----------
const TAUNTS = {
  muralla: '¡Nadie levanta muros como yo!',
  libertario: '¡Voy a motoserrar tu presupuesto!',
  barrotes: 'Tu suerte ya está encerrada.',
  pulso: 'La ciencia dicta tu derrota.',
  tigre: 'El tigre ya huele tu miedo.',
  lenador: 'Te derribaré como a un viejo roble.',
  libertador: '¡Por la libertad, a las armas!',
  sabio: 'Mi espíritu jamás se rinde.'
};

// ---------- Guía Táctica de Pausa (GUIDE) ----------
const GUIDE = {
  muralla: {
    sig: 'levanta un muro de ladrillos frente a él que lanza al rival hacia arriba (11 de daño, empuje vertical alto).',
    ult: 'cae una torre en el centro (columna de 120 px) y su impacto sacude 150 px a cada lado del centro, a ras de suelo.',
    dodge: 'aléjate más de 150 px del centro, salta alto (doble/triple salto) sobre la onda, o haz Dash justo al impacto.'
  },
  libertario: {
    sig: 'avanza con una motosierra que conecta golpes rápidos y remata con un golpe final.',
    ult: '2 s de rebotes diagonales a gran velocidad; cada 0.6 s toma rumbo hacia tu posición.',
    dodge: 'cambia de lugar tras cada giro, usa triple salto o haz Dash justo cuando pase sobre ti.'
  },
  barrotes: {
    sig: 'barrotes de acero frente a él que inmovilizan brevemente y disparan en diagonal.',
    ult: 'un láser te marca ~0.6 s y cae una jaula de 110 px que explota en un radio de 120 px.',
    dodge: 'aléjate más de 120 px de donde se fija el láser o haz Dash en la explosión.'
  },
  pulso: {
    sig: 'lanza una onda eléctrica/solar de medio alcance desde su bastón.',
    ult: 'tres rayos verticales de 60 px (separados 170 px) barren la pantalla de izquierda a derecha.',
    dodge: 'quédate en los huecos entre rayos o haz Dash justo cuando un rayo te alcance.'
  },
  tigre: {
    sig: 'embiste envuelto en aura dorada y remata con un mazo gigante.',
    ult: 'un tigre cruza todo el escenario a ras de suelo (franja de 160 px sobre la plataforma).',
    dodge: 'salta por encima (más de 150 px), sube a una plataforma alta o haz Dash al contacto.'
  },
  lenador: {
    sig: 'salto corto con mazo que parte el suelo y crea ondas laterales.',
    ult: 'una locomotora de 340 px cruza el escenario a ras de suelo (96 px de alto).',
    dodge: 'salta sobre ella con el momento exacto (triple salto), sube a una plataforma o haz Dash.'
  },
  libertador: {
    sig: 'corte circular ascendente de sable, letal para hacer KO por el techo.',
    ult: 'se eleva y lanza 10 medias lunas escalonadas, de arriba abajo, hacia el lado que mira.',
    dodge: 'colócate en el hueco entre medias lunas, huye al lado contrario o haz Dash al cruzarte.'
  },
  sabio: {
    sig: 'gancho cargado con Super Armor (absorbe un golpe) y lanzamiento horizontal.',
    ult: 'onda esférica dorada de 230 px de radio alrededor de él.',
    dodge: 'mantente fuera de 230 px o haz Dash justo cuando el borde de la onda te alcance.'
  }
};
