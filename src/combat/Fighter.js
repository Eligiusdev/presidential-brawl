// Un compás es una acción de la animación. Todos los tiempos son ticks de 1/60 s.
// Las coordenadas locales se miden desde el centro de los pies, mirando a la derecha.
const strikes = {
  toque: [2, 3, 38, -49, 10, 3, 2, -15, 0],
  punta: [4, 4, 70, -58, 6, 4, 3, -19, 1],
  alto: [5, 3, 49, -80, 12, 5, 4, -65, 0],
  bajo: [3, 5, 54, -13, 9, 4, 4, -38, 0],
  gancho: [5, 5, 25, -100, 58, 5, 5, -82, 2],
  carga: [3, 5, 43, -55, 20, 6, 5, -25, 8],
  martillo: [8, 4, 57, -65, 27, 8, 7, -48, 0],
  reverso: [3, 5, 68, -44, 10, 5, 4, -35, 0],
  barrido: [6, 5, 100, -12, 10, 6, 8, -12, 0],
  sarissa: [7, 6, 172, -54, 6, 10, 7, -20, 2],
  cruce: [1, 5, 76, -53, 9, 3, 2, -8, 15],
  retorno: [1, 4, 92, -49, 8, 6, 6, -35, 0],
};
const shots = {
  onda: { kind: 'tricolor', w: 51, h: 12, vx: 9, vy: 0 },
  orbe: { kind: 'orb', w: 24, h: 24, vx: 5, vy: 1, bounces: 2, hold: 24 },
  rayo: { kind: 'rayo', w: 36, h: 7, vx: 12, vy: 0 },
  arco: { kind: 'arco', w: 14, h: 14, vx: 5, vy: -5 },
  suelo: { kind: 'suelo', w: 36, h: 10, vx: 6, vy: 0 },
};
export function move(name, score, options = {}) {
  let tick = 0;
  const ph = [],
    sp = [];
  for (const beat of score.split(' ').filter(Boolean)) {
    if (beat === 'pausa') {
      tick += 8;
      continue;
    }
    if (shots[beat]) {
      tick += 6;
      sp.push({
        t: tick,
        p: {
          fx: 18,
          y: beat === 'suelo' ? -10 : -56,
          life: 90,
          dmg: 6,
          bk: 4,
          ks: 0.13,
          ang: -30,
          ...shots[beat],
        },
      });
      continue;
    }
    const [windup, active, w, y, h, dmg, bk, ang, mv] = strikes[beat];
    tick += windup;
    const fx = beat === 'reverso' || beat === 'retorno' ? 12 - w : 10;
    ph.push({
      a: [tick, tick + active - 1],
      hb: { fx, y, w, h },
      dmg,
      bk,
      ks: 0.12,
      ang,
      mv,
      rear: fx < 0,
      beat,
    });
    tick += active;
  }
  return { name, ph, sp, dur: tick + 8, ...options };
}

export class Fighter {
  constructor(book) {
    this.book = book;
  }
  neutralAttack() {
    return this.book.jab;
  }
  specialNeutral() {
    return this.book.neutral;
  }
  specialUp() {
    return this.book.up;
  }
  specialDown() {
    return this.book.down;
  }
}
