// ============================================================
// CONTROLADOR PRINCIPAL: Estado Global, Bucle requestAnimationFrame, Campaña y PWA
// ============================================================

let MAIN = { x: 290, y: 390, w: 380, h: 60 };
let PLAT = [];
let STG = null;
let GF = 1;
let stageSel = 0;

let state = 'sel';
let T = 0;
let freeze = 0;
let shake = 0;
let F = [];
let PR = [];
let IT = [];
let PA = [];
let endT = 0;
let winner = null;
let sel = [0, 3];
let vsAI = true;
let UL = [];
let cine = null;
let HC = 1200;
let campaignState = null;
let vsT = 0;
let CF = [];
let installEv = null;
let MSG = { t: '', l: 0, m: 1 };
let FT = [];
let paused = false;
let SLOW = 0;
let TEL = null;

// ---------- Gestión de Escenarios y Peligros (Hazards) ----------
function setStage(i) {
  STG = STAGES_DATA[i];
  MAIN = { ...STG.main };
  PLAT = STG.plats.map(p => ({ ...p, by: p.y }));
}

function hzPhase() {
  const m = T % HC;
  return m >= HC - 120 ? 1 : T >= HC && m < STG.hz.dur ? 2 : 0;
}

function movePlats() {
  PLAT.forEach(p => {
    if (p.amp) p.y = p.by + Math.sin(T / 50 + p.ph) * p.amp;
  });
}

function hazard() {
  const ph = hzPhase();
  if (T % HC == HC - 120) A.tone(880, 0.3, 'square', 0, 0.07);
  STG.hz.tick(ph, T % HC);
}

// ---------- Bucle de Simulación y Animación ----------
function step() {
  if (paused) return;
  PA.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    if (p.ex) p.vy = p.vy * 0.96 - 0.03;
    p.l--;
  });
  PA = PA.filter(p => p.l > 0);
  FT.forEach(f => f.l--);
  FT = FT.filter(f => f.l > 0);

  if (shake > 0) shake *= 0.88;
  if (shake < 0.3) shake = 0;

  if (state == 'champ') confetti();
  if (state != 'play') return;

  if (cine) {
    if (++cine.t >= 36) {
      const c = cine;
      cine = null;
      fireUlt(c.f, c.o);
    }
    return;
  }
  if (freeze > 0) {
    freeze--;
    return;
  }
  if (SLOW > 0) {
    SLOW--;
    if (SLOW % 3) return;
  }

  T++;
  if (T == 1) {
    TEL = null;
    MUS.s = 0;
    MUS.nx = 0;
    popMsg('MISSION START', 90);
  }
  if (MSG.l > 0) MSG.l--;
  GF = 1;
  movePlats();
  hazard();
  F[0].update(F[1]);
  F[1].update(F[0]);
  updProj();
  updItems();
  updUL();

  if (TEL && ++TEL.t >= 20) {
    const q = TEL;
    TEL = null;
    q.f.d.ult.fire(q.f, q.o);
    shake = 10;
  }

  const dead = F.find(f => f.stocks <= 0);
  if (dead && !winner) {
    winner = F.find(f => f !== dead);
    endT = 100;
    A.win();
  }
  if (winner && --endT <= 0) {
    campaignState ? campEnd(winner) : showOver(winner);
  }
}

let last = 0,
  acc = 0;
function loop(t) {
  requestAnimationFrame(loop);
  pollGamepads();
  syncUI();
  if (state == 'play' && !paused) MUS.tick();
  acc += Math.min(50, t - last);
  last = t;
  while (acc >= 16.667) {
    acc -= 16.667;
    step();
  }
  draw();
}

// ---------- Modo Campaña: Cumbre Mundial ----------
function startCampaign() {
  const hero = sel[0],
    rv = R.map((d, k) => k).filter(k => k != hero);
  for (let k = rv.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [rv[k], rv[j]] = [rv[j], rv[k]];
  }
  campaignState = { hero, ladder: rv, round: 0, score: 0, kos: 0, time: 0, cont: 0, last: 0 };
  A.init();
  showVS();
}

function showVS() {
  const c = campaignState,
    r = R[c.ladder[c.round]],
    boss = c.round == 6;
  state = 'vs';
  setStage(c.round % 3);
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
  }${r.name}</div><p class="s" style="font-size:16px">«${TAUNTS[r.id]}»</p><p class="s">Puntos: ${c.score}${
    c.last ? ' · Última ronda: +' + c.last : ''
  }</p>`;
  A.tone(200, 0.3, 'square', 200, 0.08);
  clearTimeout(vsT);
  vsT = setTimeout(() => {
    if (state == 'vs') startRound();
  }, 2500);
}

function startRound() {
  const c = campaignState,
    boss = c.round == 6;
  setStage(c.round % 3);
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
}

function campEnd(w) {
  const c = campaignState;
  c.time += T;
  if (w === F[0]) {
    const sec = Math.floor(T / 60),
      pts = Math.round((1000 + Math.max(0, 150 - sec) * 15 + F[0].stocks * 700) * (1 + c.round * 0.15));
    c.score += pts;
    c.last = pts;
    if (c.round == 6) showChamp();
    else {
      c.round++;
      showVS();
    }
  } else {
    showCensure();
  }
}

function showCensure() {
  const c = campaignState;
  state = 'over';
  ui.style.display = 'flex';
  ui.style.background = '';
  ui.innerHTML = `<h1>MOCIÓN DE CENSURA</h1><div class="big">¿Continuar?</div><p class="s" style="font-size:14px">Caíste en la ronda ${
    c.round + 1
  } de 7 ante ${R[c.ladder[c.round]].name}. Tu progreso en la escalera se conserva.</p><div><button id="ct">Continuar (reintentar ronda ${
    c.round + 1
  })</button><button id="ab">Abandonar</button></div>`;
  ui.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    A.init();
    if (b.id == 'ct') {
      c.cont++;
      showVS();
    } else if (b.id == 'ab') {
      showSelect();
    }
  };
}

function showChamp() {
  const c = campaignState,
    s = Math.floor(c.time / 60);
  state = 'champ';
  CF = [];
  A.win();
  ui.style.display = 'flex';
  ui.style.background = 'rgba(10,12,20,.35)';
  ui.innerHTML = `<h1>¡LÍDER SUPREMO MUNDIAL!</h1><div style="height:34%"></div><div class="big">${
    R[c.hero].name
  }</div><p class="s" style="font-size:15px">KOs totales: <b>${c.kos}</b> · Tiempo: <b>${Math.floor(
    s / 60
  )}:${String(s % 60).padStart(2, '0')}</b> · Continuaciones: <b>${
    c.cont
  }</b><br>PUNTUACIÓN FINAL: <b style="color:var(--ac);font-size:22px">${
    c.score
  }</b></p><div><button id="ab">Volver al menú</button></div>`;
  ui.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    A.init();
    showSelect();
  };
}

// ---------- Pausa y Pantallas de Selección / Victoria ----------
function togglePause() {
  if (state != 'play' || winner) return;
  paused = !paused;
  if (paused) showPause();
  else ui.style.display = 'none';
}

function showPause() {
  const g = f => {
    const d = f.d,
      G = GUIDE[d.id] || {};
    return `<div class="pc"><h3 style="margin:0 0 4px;color:var(--ac)">${
      f.pi ? (f.ai ? 'CPU' : 'J2') : 'J1'
    } · ${d.name}</h3><p style="font-size:12px"><b>Signature (K / I) · ${d.sigName}:</b> ${
      G.sig
    }</p><p style="font-size:12px"><b>Ultimate (C / M) · ${d.ult.name}:</b> ${
      G.ult
    }</p><p style="font-size:12px"><b>Cómo esquivarla:</b> ${G.dodge}</p></div>`;
  };
  ui.style.display = 'flex';
  ui.style.background = '';
  ui.innerHTML = `<h1>⏸ PAUSA</h1><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%">${F.map(
    g
  ).join(
    ''
  )}</div><p class="s">Teclado J1: A/D mover · W saltar · S bajar · J ligero · K signature · L esquive · C/Espacio ultimate &nbsp;|&nbsp; J2: flechas · U/I/O · M/Enter ultimate<br>Mando: stick/cruceta mover · A/Y saltar · X ligero · B signature · LB/RB esquive · LT/RT ultimate · Start pausa<br>Esquivar un Ultimate: haz Dash justo cuando su impacto te alcanza = ¡ESQUIVE PERFECTO! (+20% Voto Popular)</p><div><button id="rs">▶ Reanudar Combate</button><button id="rt">🔄 Reiniciar Pelea</button><button id="ex">🏠 Salir al Menú Principal</button></div>`;
  ui.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    A.init();
    if (b.id == 'rs') togglePause();
    else if (b.id == 'rt') {
      paused = false;
      campaignState ? startRound() : start();
    } else if (b.id == 'ex') {
      paused = false;
      showSelect();
    }
  };
}

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone =
  (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;

addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEv = e;
  if (state == 'sel') showSelect();
});

addEventListener('appinstalled', () => {
  installEv = null;
  if (state == 'sel') showSelect();
});

function showSelect() {
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
  ui.innerHTML = `<h1>PRESIDENTIAL BRAWL</h1><p class="s">J1: A/D mover · W saltar (x3) · S caída rápida/bajar · J ligero · K signature · L esquive &nbsp;|&nbsp; J2: flechas · U/I/O (o Numpad 1/2/3). Esquive+Ataque lanza el arma. ULTIMATE con Voto Popular al 100%: J1 C / J+K / Espacio · J2 M / U+I / Enter / Numpad 0. Agarra paredes para el wall-jump.</p>${row(
    0
  )}${row(1)}<h3>Escenario</h3><div class="g">${[
    'La Casa Blanca',
    'Casa de Nariño',
    'La Casa Rosada',
    'Aleatorio'
  ]
    .map(
      (n, k) =>
        `<button class="c${stageSel == k ? ' on' : ''}" data-s="${k}"><b>${n}</b><small>${
          k < 3 ? STAGES_DATA[k].hz.name : 'Sorpresa'
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
      if (stageSel < 3) setStage(stageSel);
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
}

function showOver(w) {
  state = 'over';
  ui.style.display = 'flex';
  ui.style.background = '';
  ui.innerHTML = `<h1>PRESIDENTE ELECTO:<br>${w.d.name.toUpperCase()}</h1><div><button id="rv">Revancha</button><button id="ch">Cambiar Personajes</button></div>`;
  ui.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    A.init();
    if (b.id == 'rv') start();
    else if (b.id == 'ch') showSelect();
  };
}

function start() {
  campaignState = null;
  HC = 1200;
  setStage(stageSel == 3 ? Math.floor(Math.random() * 3) : stageSel);
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
}

// ---------- Registro de Service Worker (PWA 100% Offline) ----------
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ---------- Inicialización ----------
setStage(0);
showSelect();
requestAnimationFrame(loop);
