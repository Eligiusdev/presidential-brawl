export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function heel(f) {
  return f.heelBox ?? { x: f.face > 0 ? f.x : f.x + f.w - 10, y: f.y + f.h - 13, w: 10, h: 13 };
}
export function shotTouches(p, target) {
  if (p.kind !== 'orb') return overlaps(p, target);
  const r = p.w / 2,
    x = p.x + r,
    y = p.y + r;
  const dx = x - Math.max(target.x, Math.min(x, target.x + target.w));
  const dy = y - Math.max(target.y, Math.min(y, target.y + target.h));
  return dx * dx + dy * dy <= r * r;
}
export function activate(f, move, stage) {
  if (move.launch) {
    f.on = false;
    f.upSpecUsed = true;
    f.fastFall = false;
    f.vy = move.launch.vy;
    f.vx = move.launch.vx * f.face;
  }
  if (move.effect === 'rage') f.rage = 300;
  if (move.effect === 'seal') {
    const floor = [stage.main, ...stage.plats]
      .filter((p) => f.cx >= p.x && f.cx <= p.x + p.w && p.y >= f.y + f.h - 2)
      .sort((a, b) => a.y - b.y)[0];
    if (floor) f.field = { kind: 'seal', x: f.cx - 32, y: floor.y - 8, w: 64, h: 8, life: 210, floor };
  }
  if (move.effect === 'barrier')
    f.field = { kind: 'barrier', x: f.cx + f.face * 48 - 5, y: f.y - 10, w: 10, h: f.h + 20, life: 150 };
}
export function tickEffects(f) {
  if (f.rage > 0) f.rage--;
  if (f.speedTime > 0) f.speedTime--;
  if (f.field && --f.field.life <= 0) f.field = null;
  if (f.field?.kind === 'seal') {
    f.field.y = f.field.floor.y - 8;
    if (overlaps(f, f.field)) f.speedTime = 45;
  }
}
export function drawEffects(ctx, f) {
  if (f.dead > 0) return;
  const effect = f.atk?.spec.effect;
  ctx.save();
  if (f.field) {
    const s = f.field;
    ctx.fillStyle = s.kind === 'barrier' ? '#37ebb4aa' : '#f6c546bb';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#feffeb';
    ctx.fillRect(s.x, s.y, s.w, 2);
  }
  if (effect === 'hover' || effect === 'testudo' || f.rage > 0) {
    ctx.strokeStyle = f.rage ? '#ffd546' : effect === 'hover' ? '#53ffb2' : '#d49b5c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(f.cx, f.y + f.h / 2, 31, 55, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (f.rage) {
      const b = heel(f);
      ctx.fillStyle = '#ff6b51';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
  if (effect === 'horse') {
    ctx.translate(f.cx, f.y + f.h - 13);
    ctx.scale(f.face, 1);
    ctx.fillStyle = '#99edffbb';
    ctx.beginPath();
    const points = [
      [-35, -9],
      [-21, -5],
      [16, -8],
      [27, -32],
      [34, -39],
      [37, -29],
      [48, -18],
      [43, -13],
      [32, -18],
      [24, 5],
      [8, 12],
      [20, 24],
      [13, 25],
      [-2, 13],
      [-15, 12],
      [-28, 26],
      [-35, 25],
      [-25, 7],
      [-36, 1],
      [-45, 10],
    ];
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
  } else if (effect === 'standard') {
    ctx.fillStyle = '#ce9946';
    ctx.fillRect(f.cx - 27, f.y, 3, 85);
    ctx.fillStyle = '#ad3244';
    ctx.fillRect(f.cx - 24, f.y + 2, 22, 29);
  } else if (effect === 'olympus') {
    ctx.fillStyle = '#fff2b0';
    ctx.fillRect(f.cx - 6, f.y + f.h, 12, 18);
  }
  ctx.restore();
}
export function drawStrike(ctx, box) {
  const { x, y, w, h, color } = box;
  const grip = box.direction < 0 ? x + w : x;
  const reverse = box.direction < 0 ? -1 : 1;
  ctx.fillStyle = box.weapon === 'sarissa' ? '#ad804c' : color;
  ctx.fillRect(x, y, w, h);
  if (box.weapon === 'saber' || box.weapon === 'sarissa') {
    const blade = box.weapon === 'sarissa' ? Math.min(20, w * 0.3) : w * 0.83;
    ctx.fillStyle = '#bfd7df';
    ctx.fillRect(box.direction < 0 ? x : x + w - blade, y, blade, h);
    ctx.fillStyle = '#e0b44f';
    ctx.fillRect(grip + reverse * w * 0.12 - 2, y, 4, h);
  } else if (box.weapon === 'staff') {
    ctx.fillStyle = '#73ffd1';
    ctx.fillRect(box.direction < 0 ? x : x + w - 8, y, 8, h);
  }
  ctx.fillStyle = '#fff3d5';
  ctx.fillRect(x, y, w, Math.min(2, h));
  ctx.fillStyle = '#20263788';
  ctx.fillRect(x, y + h - 2, w, 2);
}
export function drawShot(ctx, p) {
  if (p.kind === 'orb') {
    ctx.fillStyle = '#32da96';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bdffdc';
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.4, p.y + p.h * 0.36, p.w * 0.19, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }
  if (p.kind === 'tricolor') {
    ['#ffda54', '#388aff', '#ff475f'].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(p.x, p.y + (i * p.h) / 3, p.w, p.h / 3);
    });
    return true;
  }
  if (!['arco', 'suelo', 'rayo'].includes(p.kind)) return false;
  drawStrike(ctx, { ...p, color: p.ownerColor });
  return true;
}

// La extensión del arma varía dentro de cada ventana activa. La mano,
// el dibujo del filo y la prueba de contacto consultan este mismo rectángulo.
export function strikeBox(f, phase, frame, boosted) {
  const b = f.rect(phase.hb, boosted);
  const progress = (frame - phase.a[0] + 1) / (phase.a[1] - phase.a[0] + 1);
  const width = b.w * (0.75 + 0.25 * Math.sin(progress * Math.PI));
  if (f.face < 0 !== Boolean(phase.rear)) b.x += b.w - width;
  return { ...b, w: width };
}
