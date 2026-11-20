import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PRESIDENTS_DATA } from '../src/data/presidents.ts';
import atlas from '../src/data/ultimateAtlas.json' with { type: 'json' };
import { ultimateBox, ultimateFor, ultimatePoint } from '../src/engine/presidentUltimates.ts';
import { paintUltimateSprite } from '../src/engine/ultimateSprites.ts';

const root = new URL('../public/assets/ultimates/', import.meta.url);
const sheets = new Map(await Promise.all([...new Set(Object.values(atlas).map(entry => entry.sheet))].map(async sheet => [
  sheet, await loadImage(readFileSync(new URL(`sheet-${sheet}.webp`, root))),
])));
globalThis.Image = class {
  constructor() { return new Proxy({}, {
    set(target, key, url) {
      const sheet = Number(/sheet-(\d+)\.webp$/.exec(url)?.[1]);
      Object.setPrototypeOf(target, null);
      const image = sheets.get(sheet);
      assert.ok(image, url);
      target.image = image;
      target.complete = true;
      target.naturalWidth = image.width;
      return true;
    },
  }); }
};

const canvas = createCanvas(320, 220);
const ctx = canvas.getContext('2d');
const painter = new Proxy(ctx, {
  get(target, key) {
    if (key === 'drawImage') return (image, ...args) => target.drawImage(image.image, ...args);
    const value = target[key];
    return typeof value === 'function' ? value.bind(target) : value;
  },
  set(target, key, value) { target[key] = value; return true; },
});

const ids = new Set();
const sprites = new Set();
for (const fighter of PRESIDENTS_DATA) {
  const id = fighter.ultimateId;
  ids.add(id);
  const entry = atlas[id];
  assert.ok(entry, id);
  const image = sheets.get(entry.sheet);
  const [x, y, w, h] = entry.box;
  assert.ok(x >= 0 && y >= 0 && w >= 32 && h >= 32 && x + w <= image.width && y + h <= image.height, id);
  const source = createCanvas(w, h);
  const sourceCtx = source.getContext('2d');
  sourceCtx.drawImage(image, x, y, w, h, 0, 0, w, h);
  const pixels = sourceCtx.getImageData(0, 0, w, h).data;
  assert.ok(pixels.some((v, i) => i % 4 === 3 && v === 0), id + ' transparencia');
  assert.ok(pixels.some((v, i) => i % 4 === 3 && v >= 200), id + ' silueta');
  sprites.add(createHash('sha256').update(pixels).digest('hex'));

  const ultimate = ultimateFor(fighter);
  const origin = { x: 140, y: 120, face: 1 };
  const point = ultimatePoint(ultimate, origin, .5);
  const box = ultimateBox(ultimate, point);
  const placement = { x: 160, y: 110, hitWidth: box.w * .5, hitHeight: box.h * .5, unit: .5 };
  function frame(t) {
    ctx.clearRect(0, 0, 320, 220);
    assert.ok(paintUltimateSprite(painter, {
      t, dur: 80, specialized: { ultimate, origin, point, box, active: true, triggered: true },
    }, placement), id);
    return createHash('sha256').update(ctx.getImageData(0, 0, 320, 220).data).digest('hex');
  }
  const first = frame(12);
  assert.equal(frame(12), first, id + ' determinista');
  assert.notEqual(frame(32), first, id + ' animación');
}
assert.deepEqual(new Set(Object.keys(atlas)), ids);
assert.equal(sprites.size, 61);
console.log('61 sprites de definitivas distintos, transparentes y animados.');
