import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PRESIDENTS_DATA } from '../src/data/presidents.ts';
import { movesFor } from '../src/combat/roster.js';

const [sheetPath, ...ids] = process.argv.slice(2);
if (!sheetPath || ids.length !== 3) throw Error('Uso: node --import tsx tools/build-roster-atlas.mjs hoja.png id1 id2 id3');
const sheet = await loadImage(sheetPath);
const source = createCanvas(sheet.width, sheet.height);
const sourceCtx = source.getContext('2d');
sourceCtx.drawImage(sheet, 0, 0);

const { width, height } = source;
const pixels = sourceCtx.getImageData(0, 0, width, height);
const labels = new Int32Array(width * height);
const queue = new Int32Array(width * height);
const cellsByIndex = Array(9).fill(null);

for (let start = 0; start < labels.length; start++) {
  if (labels[start] || pixels.data[start * 4 + 3] < 30) continue;
  const label = start + 1;
  let end = 0, left = width, top = height, right = 0, bottom = 0;
  let sumX = 0, sumY = 0;
  const add = (x, y) => {
    const i = y * width + x;
    if (labels[i] || pixels.data[i * 4 + 3] < 30) return;
    labels[i] = label;
    queue[end++] = i;
  };
  add(start % width, Math.floor(start / width));
  for (let head = 0; head < end; head++) {
    const i = queue[head];
    const x = i % width, y = Math.floor(i / width);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    sumX += x;
    sumY += y;
    for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
      for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) add(nx, ny);
    }
  }
  if (end < 1000) continue;
  const row = Math.floor(sumY / end * 3 / height);
  const col = Math.floor(sumX / end * 3 / width);
  const index = row * 3 + col;
  if ((cellsByIndex[index]?.ink ?? 0) >= end) continue;
  cellsByIndex[index] = { x: left, y: top, w: right - left + 1, h: bottom - top + 1, label, ink: end };
}

for (const [index, cell] of cellsByIndex.entries()) {
  if (!cell || cell.h < height * 0.11 || cell.h > height * 0.43) {
    throw Error(`Celda ${index + 1} sin una pose completa y aislada.`);
  }
}
const silhouettes = new Set(cellsByIndex.map(cell => cell.label));
for (let i = 0; i < labels.length; i++) {
  if (!silhouettes.has(labels[i])) pixels.data[i * 4 + 3] = 0;
}
sourceCtx.putImageData(pixels, 0, 0);

const clip = (loop, ...frames) => ({ loop, frames: frames.map(([pose, ticks]) => ({ pose, ticks })) });
for (const [row, id] of ids.entries()) {
  const fighter = PRESIDENTS_DATA.find(({ id: key }) => key === id);
  if (!fighter) throw Error(`Luchador desconocido: ${id}`);
  const { jab, neutral, up, down } = movesFor(fighter).book;
  const cells = cellsByIndex.slice(row * 3, row * 3 + 3);
  const baseScale = Math.min(150 / cells[0].h, 183 / Math.max(...cells.map(c => c.w)));
  const artwork = {
    guard: [0, 1, 1, 0],
    breath: [0, 1, 1.025, 0],
    stride: [1, 1, 1, 0],
    pass: [1, 0.94, 1.025, 0.06],
    strike: [2, 1, 1, 0],
    crouch: [1, 1.04, 0.81, 0.06],
    rise: [1, 0.96, 1.02, -0.15],
    fall: [1, 0.98, 0.92, 0.13],
    hurt: [0, 0.96, 0.9, -0.24],
    kneel: [1, 0.96, 0.63, 0.13],
    prone: [0, 1, 1, -Math.PI / 2],
    victory: [0, 1.01, 1.04, -0.06],
  };
  const atlas = createCanvas(240 * 4, 184 * 3);
  const ctx = atlas.getContext('2d');
  const poses = {};
  for (const [index, [name, [col, sx, sy, angle]]] of Object.entries(artwork).entries()) {
    const cell = cells[col];
    const x = (index % 4) * 240, y = Math.floor(index / 4) * 184;
    const w = cell.w * baseScale, h = cell.h * baseScale;
    const anchorX = col === 2 ? w * 0.29 : col === 1 ? w * 0.48 : w * 0.5;
    const rootX = 104, rootY = 173;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, 240, 184); ctx.clip();
    if (name === 'prone') ctx.translate(x + rootX + h / 2, y + rootY - anchorX);
    else ctx.translate(x + rootX, y + rootY);
    ctx.rotate(angle);
    ctx.scale(sx, sy);
    ctx.drawImage(source, cell.x, cell.y, cell.w, cell.h, -anchorX, -h, w, h);
    ctx.restore();
    poses[name] = { region: [x, y, 240, 184], anchor: [rootX, rootY], scale: 0.5 };
  }
  function attack(move, prep, impact) {
    const duration = move.effect === 'hover' ? 120 : move.dur;
    const firstActive = move.ph[0]?.a[0] ?? move.sp[0]?.t ?? 5;
    const start = Math.min(duration - 2, Math.max(1, firstActive));
    const hit = Math.min(duration - start - 1, 7);
    return clip(false, [prep, start], [impact, hit], ['guard', duration - start - hit]);
  }
  const animations = {
    guard: clip(true, ['guard', 18], ['breath', 14]),
    walk: clip(true, ['guard', 4], ['stride', 5], ['pass', 4]),
    jump: clip(false, ['crouch', 2], ['rise', 10]),
    fall: clip(false, ['fall', 8]),
    land: clip(false, ['crouch', 3], ['guard', 4]),
    crouch: clip(false, ['crouch', 1]),
    hurt: clip(false, ['hurt', 5], ['guard', 6]),
    defeat: clip(false, ['hurt', 5], ['kneel', 7], ['prone', 20]),
    victory: clip(true, ['victory', 24], ['breath', 15]),
    ultimate: clip(false, ['crouch', 8], ['rise', 8], ['strike', 12], ['guard', 8]),
    jab: attack(jab, 'stride', 'strike'),
    slash: attack(neutral, 'crouch', 'strike'),
    up: attack(up, 'crouch', 'rise'),
    down: attack(down, 'crouch', 'strike'),
  };
  const guard = cells[0];
  const thumb = createCanvas(224, 224);
  const fit = Math.min(202 / guard.h, 202 / guard.w);
  thumb.getContext('2d').drawImage(source, guard.x, guard.y, guard.w, guard.h,
    (224 - guard.w * fit) / 2, 218 - guard.h * fit, guard.w * fit, guard.h * fit);

  const portrait = createCanvas(128, 128);
  const crop = Math.min(guard.w, Math.max(guard.w * 0.58, guard.h * 0.32));
  portrait.getContext('2d').drawImage(source, guard.x + (guard.w - crop) / 2,
    guard.y, crop, Math.min(guard.h, crop), 0, 0, 128, 128);

  const selection = createCanvas(640, 256);
  const bg = selection.getContext('2d');
  const glow = bg.createRadialGradient(300, 120, 25, 340, 128, 320);
  glow.addColorStop(0, fighter.palette.accent.base);
  glow.addColorStop(0.45, '#253248');
  glow.addColorStop(1, '#101622');
  bg.fillStyle = glow;
  bg.fillRect(0, 0, 640, 256);

  const dest = resolve('public/assets/fighters', id);
  await mkdir(dest, { recursive: true });
  await Promise.all([
    writeFile(resolve(dest, 'atlas.webp'), atlas.toBuffer('image/webp', 88)),
    writeFile(resolve(dest, 'atlas.json'), JSON.stringify({ image: 'atlas.webp', portrait: 'portrait.png', poses, animations }) + '\n'),
    writeFile(resolve(dest, 'thumb.webp'), thumb.toBuffer('image/webp', 92)),
    writeFile(resolve(dest, 'portrait.png'), portrait.toBuffer('image/png')),
    writeFile(resolve(dest, 'selection.webp'), selection.toBuffer('image/webp', 86)),
  ]);
  console.log(`${id}: ${Object.keys(poses).length} poses`);
}
