// ============================================================
// MODELO DE COMBATE: Clase Fighter, Físicas, Colisiones, IA y Proyectiles
// ============================================================

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const sg = (f, o) => (o.cx >= f.cx ? 1 : -1);

function nudge(f, dx) {
  const r = { x: f.x + dx, y: f.y, w: f.w, h: f.h };
  if (!ov(r, MAIN)) f.x += dx;
}

// ---------- Daño, Knockback, Super Armor y Voto Popular ----------
function hurt(f, o, d, dir) {
  if (f.inv > 0 || f.dead > 0) return 0;
  if (!d.ult) {
    f.vote = Math.min(100, f.vote + 5);
    if (o) o.vote = Math.min(100, o.vote + (d.heavy ? 15 : d.every ? 3 : 8));
  }
  if (o) {
    vibrateGamepad(
      o.pi,
      d.ult ? 400 : d.heavy ? 220 : 70,
      d.ult ? 1 : d.heavy ? 0.7 : 0.3,
      d.ult ? 1 : d.heavy ? 0.9 : 0.15
    );
  }
  if (f.atk && f.atk.armor && !f.atk.ar && !d.ult) {
    f.atk.ar = 1;
    f.pct += d.dmg * 0.5;
    f.pShake = 10;
    A.heavy();
    shake = Math.max(shake, 6);
    burst(f.cx, f.y + 25, '#ffd700', 14);
    return 1;
  }
  f.pct += d.dmg;
  f.pShake = 16;
  const kb = d.bk + (f.pct * d.ks) / f.S.weight,
    r = (d.ang * Math.PI) / 180,
    vx = Math.cos(r) * kb * dir,
    vy = Math.sin(r) * kb;
  f.atk = null;
  f.dashT = 0;
  f.stun = Math.min(42, Math.round(6 + kb * 1.6));
  f.face = -dir;
  if (vy < 0) f.on = false;
  if (d.hold) {
    f.stun = d.hold;
    f.pend = { vx, vy };
    f.vx = f.vy = 0;
  } else {
    f.vx = vx;
    f.vy = vy;
  }
  freeze = d.heavy ? 4 : 2;
  shake = Math.max(shake, d.heavy ? 10 : 3);
  d.heavy ? A.heavy() : A.hit();
  burst(f.cx, f.y + 25, d.heavy ? '#ffb030' : '#fff', d.heavy ? 16 : 8, d.heavy ? 7 : 4);
  return 1;
}

// ---------- Ultimate: Decreto Supremo y Esquive Perfecto ----------
function addUL(f, o, dur, tick, draw) {
  UL.push({ f, o, t: 0, dur, tick, draw });
}

function perfectDodge(o) {
  o.vote = Math.min(100, o.vote + 20);
  SLOW = 12;
  FT.push({ t: '¡ESQUIVE PERFECTO!', x: o.cx, y: o.y - 10, l: 70, m: 70 });
  A.tone(1200, 0.25, 'triangle', 600, 0.08);
  burst(o.cx, o.y + 28, '#7ff', 10, 5);
  vibrateGamepad(o.pi, 120, 0.4, 0.2);
}

function uh(e, ang, dir, x) {
  const o = e.o;
  if (e.dg) return 1;
  if (o.dashT > 0 && o.dead <= 0) {
    e.dg = 1;
    perfectDodge(o);
    return 1;
  }
  return hurt(o, e.f, { dmg: 36, bk: 15, ks: 0.5, ang, heavy: 1, ult: 1, ...x }, dir);
}

function startUlt(f) {
  cine = { t: 0, f, o: F.find(x => x !== f) };
  f.vote = 0;
  A.siren();
  vibrateGamepad(f.pi, 600, 1, 1);
}

function fireUlt(f, o) {
  f.atk = null;
  f.dashT = 0;
  const z = UZ[f.d.id];
  TEL = { f, o, t: 0, z: z ? z(f, o) : [] };
  f.inv = Math.max(f.inv, 24);
  shake = 12;
}

function updUL() {
  UL.forEach(e => {
    e.t++;
    e.tick(e);
  });
  UL = UL.filter(e => e.t < e.dur);
}

// ---------- Inteligencia Artificial (IA Competitiva) ----------
function ai(f, o) {
  const i = { l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, x: 0, c: 0 },
    dx = o.cx - f.cx,
    dy = o.y - f.y,
    ad = Math.abs(dx),
    off = f.cx < MAIN.x || f.cx > MAIN.x + MAIN.w;
  if ((off || f.y > MAIN.y + 20) && !f.on) {
    if (f.cx < W / 2) i.r = 1;
    else i.l = 1;
    if (T % 16 < 2) i.u = 1;
    if (f.vy > 7 && f.y > MAIN.y + 60 && T % 30 < 2) i.x = 1;
    return i;
  }
  if (f.vote >= 100 && ad < 380 && Math.abs(dy) < 170) {
    i.c = 1;
    return i;
  }
  if (ad > 45) {
    dx > 0 ? (i.r = 1) : (i.l = 1);
  }
  if (dy < -70 && ad < 90 && T % 40 < 2) i.u = 1;
  const D = f.dif | 0,
    K = [0.8, 1.3, 1.7][D];
  if (D > 0) {
    if (!o.on && ad < 170 && dy < 60 && dy > -220 && f.airJ > 0 && T % 20 < 2) i.u = 1;
    if (!f.on && dy > 20 && ad < 70) {
      i.d = 1;
      i.a = 1;
    }
  }
  if (ad < 70 && Math.abs(dy) < 60) {
    if (Math.random() < 0.12 * K) i.a = 1;
    if (Math.random() < (D ? 0.06 : 0.025)) i.h = 1;
    if (Math.random() < [0.004, 0.012, 0.02][D]) i.x = 1;
  }
  if (ad < 50 && dy < -50 && Math.random() < 0.1) {
    i.a = 1;
    i.u = 1;
  }
  if (ad > 150 && ad < 320 && Math.random() < 0.01) i.h = 1;
  return i;
}

// ---------- Clase Luchador (Fighter) ----------
class Fighter {
  constructor(pi, d, isAI) {
    this.pi = pi;
    this.d = d;
    this.S = d.stats;
    this.ai = isAI;
    this.w = 30;
    this.h = 56;
    this.stocks = 3;
    this.vote = 0;
    this.pin = {};
    this.pShake = 0;
    this.spawn(true);
  }

  get cx() {
    return this.x + this.w / 2;
  }

  spawn(first) {
    this.x = first ? (this.pi ? 580 : 370) : W / 2 - 15;
    this.y = first ? MAIN.y - this.h : -90;
    this.vx = this.vy = 0;
    this.face = this.pi ? -1 : 1;
    this.pct = 0;
    this.inv = first ? 0 : 120;
    this.stun = 0;
    this.atk = null;
    this.dashT = 0;
    this.dashCD = 0;
    this.wpn = 0;
    this.airJ = 2;
    this.dropT = 0;
    this.dead = 0;
    this.wall = 0;
    this.on = first;
    this.pl = null;
    if (this.dif > 0) this.vote = Math.min(100, this.vote + 15);
    this.combo = 0;
    this.cT = 0;
    this.pend = null;
  }

  readIn(o) {
    let i;
    if (this.ai) {
      i = ai(this, o);
    } else {
      const k = KEYS[this.pi],
        g = a => a.some(c => keys[c]);
      i = {
        l: g(k.l),
        r: g(k.r),
        u: g(k.u),
        d: g(k.d),
        a: g(k.a),
        h: g(k.h),
        x: g(k.x),
        c: g(k.c),
        s: g(k.s)
      };
    }
    const pe = {};
    for (const k in i) pe[k] = i[k] && !this.pin[k];
    this.pin = i;
    this.in = i;
    this.pe = pe;
  }

  rect(hb, boost) {
    const k = boost ? 1.4 : 1,
      w = hb.w * k,
      fx = hb.fx > 0 ? hb.fx * k : hb.fx,
      x = this.face > 0 ? this.cx + fx : this.cx - fx - w;
    return {
      x,
      y: this.y + this.h + hb.y - (boost ? hb.h * 0.2 : 0),
      w,
      h: hb.h * k
    };
  }

  startAtk(spec) {
    this.atk = { spec, t: 0, hits: {}, armor: false, ar: 0 };
  }

  light(i) {
    const air = !this.on,
      P = this.S.power;
    let p;
    if (i.u) p = { a: [5, 12], hb: { fx: -17, y: -96, w: 34, h: 46 }, dmg: 5, bk: 4, ks: 0.1, ang: -80, dur: 22 };
    else if (i.d && air) p = { a: [6, 16], hb: { fx: -15, y: -2, w: 30, h: 30 }, dmg: 6, bk: 3.5, ks: 0.1, ang: 80, dur: 26 };
    else p = { a: [4, 10], hb: { fx: 8, y: -50, w: 38, h: 22 }, dmg: 3.5, bk: 2.5, ks: 0.1, ang: -22, dur: 17 };
    const fin = this.combo % 3 == 2;
    p.dmg *= P * (fin ? 1.4 : 1);
    if (fin) {
      p.bk *= 1.8;
      p.dur += 6;
    }
    this.combo++;
    this.cT = 40;
    A.tone(400 + this.combo * 60, 0.07, 'square', -120, 0.05);
    this.startAtk({ k: 'l', dur: p.dur, ph: [p], sp: [] });
  }

  heavy(i) {
    const s = this.d.sig;
    this.startAtk({
      k: 'h',
      dur: s.dur,
      ph: s.ph.map(p => ({ ...p, dmg: p.dmg ? p.dmg * this.S.power : 0 })),
      sp: s.sp,
      hop: s.hop,
      heavy: 1
    });
    if (this.d.signatureType == 'uppercut' || this.d.signatureType == 'tiger') A.sword();
    else if (this.d.signatureType == 'chainsaw') A.saw();
    else A.tone(160, 0.18, 'sawtooth', 100, 0.07);
  }

  throwW() {
    PR.push({
      x: this.cx - 8,
      y: this.y + 10,
      w: 18,
      h: 18,
      vx: this.face * 10,
      vy: -2,
      life: 60,
      kind: 'throw',
      w2: this.wk,
      owner: this,
      dir: this.face,
      d: { dmg: 9, bk: 5, ks: 0.16, ang: -25, heavy: 1 },
      hit: 0
    });
    this.wpn = 0;
    A.sword();
  }

  update(o) {
    if (this.dead > 0) {
      if (--this.dead == 0 && this.stocks > 0) this.spawn(false);
      return;
    }
    this.readIn(o);
    const i = this.in,
      pe = this.pe,
      S = this.S;
    if (this.on && this.pl) this.y = this.pl.y - this.h;
    if (this.boss && T % 30 == 0) this.vote = Math.min(100, this.vote + 1);
    if (this.inv > 0) this.inv--;
    if (this.dashCD > 0) this.dashCD--;
    if (this.wpn > 0) this.wpn--;
    if (this.dropT > 0) this.dropT--;
    if (this.cT > 0 && --this.cT == 0) this.combo = 0;
    if (this.pShake > 0) this.pShake--;

    let free = this.stun <= 0;
    if (!free) {
      this.stun--;
      if (this.pend) {
        this.vx = this.vy = 0;
        if (this.stun <= 0) {
          this.vx = this.pend.vx;
          this.vy = this.pend.vy;
          this.pend = null;
        }
      } else {
        this.vx *= 0.985;
        if (Math.hypot(this.vx, this.vy) > 7 && T % 2 == 0)
          PA.push({ x: this.cx, y: this.y + 28, vx: 0, vy: -0.3, l: 26, m: 26, col: '#9a9a9a', z: 8 });
      }
    } else {
      const a = this.atk,
        dir = (i.r ? 1 : 0) - (i.l ? 1 : 0);
      if (this.vote >= 100 && !cine && (pe.c || pe.s || (i.a && i.h && (pe.a || pe.h)))) {
        startUlt(this);
        pe.a = pe.h = pe.x = 0;
      } else if (pe.a && i.x && this.wpn > 0) {
        this.throwW();
      } else if (pe.x && this.dashCD <= 0 && this.dashT <= 0) {
        this.dashT = 12;
        this.inv = Math.max(this.inv, 12);
        this.dashCD = 90;
        this.vx = (dir || this.face) * 10;
        this.vy = 0;
        this.atk = null;
        A.dash();
      }
      if (this.dashT > 0) {
        this.dashT--;
        this.vy = 0;
        if (this.dashT == 0) this.vx *= 0.3;
      } else {
        if (dir) {
          this.vx += (dir * S.speed * (a ? 0.35 : 1) - this.vx) * (this.on ? 0.22 : 0.07);
          if (!a) this.face = dir;
        } else if (this.on) {
          this.vx *= 0.8;
        } else {
          this.vx *= 0.99;
        }

        if (pe.u) {
          if (this.on) {
            this.vy = -S.jumpForce;
            this.on = false;
            A.jump();
          } else if (this.wall && !this.on) {
            this.vy = -S.jumpForce * 0.95;
            this.vx = -this.wall * 7;
            this.face = -this.wall;
            A.jump();
            burst(this.cx, this.y + 30, '#fff', 6);
          } else if (this.airJ > 0) {
            this.airJ--;
            this.vy = -S.jumpForce * 0.92;
            A.jump();
            burst(this.cx, this.y + this.h, '#fff', 6, 3);
          }
        }
        if (pe.d && this.on && this.y + this.h < MAIN.y - 1) {
          this.dropT = 14;
          this.y += 2;
          this.on = false;
        }
        if (!this.on && i.d && this.vy > -3 && !a) this.vy = Math.max(this.vy, 13);
        if (pe.a && !this.wpn) {
          const it = IT.find(t => ov(t, this));
          if (it) {
            this.wpn = 900;
            this.wk = it.kind;
            popMsg('HEAVY MACHINE GUN!', 70);
            IT.splice(IT.indexOf(it), 1);
            A.tone(700, 0.15, 'triangle', 400);
            burst(this.cx, this.y, '#ffd700', 16);
          }
        }
        if (!a || (a.spec.k == 'l' && a.t >= a.spec.dur * 0.55)) {
          if (pe.a && !i.x) this.light(i);
          else if (pe.h && !a) this.heavy(i);
        }
      }
    }

    // Ataque activo
    if (this.atk && free) {
      const a = this.atk,
        sp = a.spec,
        t = ++a.t;
      a.armor = sp.ph.some(p => p.armor && t >= p.a[0] && t <= p.a[1]);
      if (sp.hop && t == sp.hop.t) {
        this.vy = sp.hop.vy;
        this.on = false;
      }
      sp.sp.forEach(s => {
        if (s.t == t) {
          const p = s.p,
            x = this.face > 0 ? this.cx + p.fx : this.cx - p.fx - p.w;
          PR.push({
            x,
            y: this.y + this.h + p.y,
            w: p.w,
            h: p.h,
            vx: p.vx * (p.back ? -this.face * -1 : this.face) * (p.back ? -1 : 1),
            vy: 0,
            life: p.life,
            kind: p.kind,
            owner: this,
            dir: p.back ? -this.face : this.face,
            d: { ...p, dmg: p.dmg * this.S.power, heavy: 1 },
            hit: 0
          });
          if (p.kind == 'wall') A.heavy();
          if (p.kind == 'pulse') A.tone(600, 0.2, 'sawtooth', 300, 0.06);
          if (p.kind == 'bars') A.tone(180, 0.2, 'square', -80, 0.08);
        }
      });
      sp.ph.forEach((p, idx) => {
        if (t < p.a[0] || t > p.a[1]) return;
        if (p.mv != null && p.mv >= 0 && p.hb) this.vx = this.face * p.mv;
        if (p.fx == 'saw' && t % 3 == 0) {
          PA.push({
            x: this.cx + this.face * 40,
            y: this.y + 28,
            vx: this.face * 3 + Math.random() * 3 - 1,
            vy: -Math.random() * 3,
            l: 14,
            m: 14,
            col: '#ffb020',
            z: 3
          });
          if (t % 6 == 0) A.saw();
        }
        if (!p.hb) return;
        const key = idx + ':' + (p.every ? Math.floor((t - p.a[0]) / p.every) : 0);
        if (a.hits[key]) return;
        const r = this.rect(p.hb, this.wpn > 0 && sp.k == 'l');
        if (ov(r, o)) {
          const d = { ...p, dmg: p.dmg * (this.wpn > 0 && sp.k == 'l' ? 1.35 : 1), heavy: sp.heavy && !p.every };
          if (hurt(o, this, d, this.face)) {
            a.hits[key] = 1;
          }
        }
      });
      if (t >= sp.dur) this.atk = null;
    }

    // Física y colisiones con plataformas
    if (!(this.dashT > 0) && !this.pend) this.vy = Math.min(this.vy + 0.55 * GF, 14.5);
    if (free && !this.on && this.wall && this.vy > 2.2 && ((this.wall == 1 && i.r) || (this.wall == -1 && i.l)))
      this.vy = 2.2;
    const M = MAIN;
    this.x += this.vx;
    if (this.x + this.w > M.x && this.x < M.x + M.w && this.y + this.h > M.y && this.y < M.y + M.h) {
      if (this.vx > 0) this.x = M.x - this.w;
      else if (this.vx < 0) this.x = M.x + M.w;
      this.vx = 0;
    }
    this.wall = 0;
    if (this.y + this.h > M.y + 3 && this.y < M.y + M.h) {
      if (Math.abs(this.x + this.w - M.x) < 2) this.wall = 1;
      else if (Math.abs(this.x - (M.x + M.w)) < 2) this.wall = -1;
    }
    const pb = this.y + this.h;
    this.y += this.vy;
    this.on = false;
    if (this.x + this.w > M.x && this.x < M.x + M.w && this.y + this.h > M.y && this.y < M.y + M.h) {
      if (this.vy >= 0 && pb <= M.y + 1) {
        this.y = M.y - this.h;
        this.vy = 0;
        this.on = true;
        this.pl = null;
      } else if (this.vy < 0) {
        this.y = M.y + M.h;
        this.vy = 0;
      }
    }
    if (!this.on) {
      for (const p of PLAT) {
        if (
          this.vy >= 0 &&
          this.dropT <= 0 &&
          pb <= p.y + 1 &&
          this.y + this.h >= p.y &&
          this.x + this.w > p.x &&
          this.x < p.x + p.w
        ) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.on = true;
          this.pl = p;
        }
      }
    }
    if (this.on) {
      this.airJ = 2;
      if (this.stun <= 0 && !this.pend && Math.abs(this.vx) > 0) this.vx *= 1;
    }
    // Blast zone KO
    if (this.cx < BZ.l || this.cx > BZ.r || this.y < BZ.t || this.y > BZ.b) this.ko();
  }

  ko() {
    const px = clamp(this.cx, 0, W),
      py = clamp(this.y + 28, 0, H),
      a0 = Math.atan2(H / 2 - py, W / 2 - px);
    for (let k = 0; k < 60; k++) {
      const a = a0 + (Math.random() - 0.5) * 1.4,
        v = 2 + Math.random() * 9;
      PA.push({
        x: px,
        y: py,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        l: 50,
        m: 50,
        col: [this.d.c.acc, '#fff', this.d.c.body, '#ffb030'][k % 4],
        z: 3 + Math.random() * 5
      });
    }
    A.ko();
    burst(px, py, '#fff', 28, 10, 30);
    popMsg('KO!', 50);
    shake = 22;
    freeze = 6;
    this.stocks--;
    if (campaignState && this.pi == 1) campaignState.kos++;
    vibrateGamepad(0, 600, 1, 1);
    vibrateGamepad(1, 600, 1, 1);
    this.dead = this.stocks > 0 ? 80 : 9999;
    this.atk = null;
    this.x = this.y = -999;
    this.pend = null;
  }

  draw() {
    drawFighterSprite(this);
  }
}

// ---------- Proyectiles e Ítems ----------
function updProj() {
  for (let i = PR.length - 1; i >= 0; i--) {
    const p = PR[i];
    p.x += p.vx;
    p.y += p.vy || 0;
    if (p.kind == 'throw') p.vy += 0.35;
    p.life--;
    const ts = F.filter(f => f !== p.owner && f.dead <= 0);
    if (!p.hit) {
      for (const o of ts) {
        if (p.done && p.done.includes(o)) continue;
        if (ov(p, o) && hurt(o, p.owner, p.d, p.dir)) {
          if (p.done) p.done.push(o);
          else {
            p.hit = 1;
            if (p.kind != 'wall' && p.kind != 'bars') p.life = 0;
          }
          break;
        }
      }
    }
    if (p.kind == 'pulse' && T % 2 == 0)
      PA.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: 0, vy: 0, l: 12, m: 12, col: '#ffe566', z: 6 });
    if (p.life <= 0 || p.x < -80 || p.x > W + 80 || p.y > H + 80) PR.splice(i, 1);
  }
}

function updItems() {
  if (T > 0 && T % 720 == 0)
    IT.push({ x: 320 + Math.random() * 300, y: -30, w: 26, h: 22, vy: 0, kind: Math.random() < 0.5 ? 'case' : 'mega' });
  IT.forEach(t => {
    if (t.y + t.h < MAIN.y) {
      t.vy = Math.min(t.vy + 0.3, 5);
      t.y += t.vy;
      if (t.y + t.h >= MAIN.y) {
        t.y = MAIN.y - t.h;
      }
    }
  });
}
