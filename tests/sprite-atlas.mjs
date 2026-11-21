import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { frameAt, paintCombatSprite, paintSprite, preloadFighter, spriteAction } from '../src/engine/fighterSprites.ts';

const directory = new URL('../public/assets/fighters/achilles/', import.meta.url);
const meta = JSON.parse(readFileSync(new URL('atlas.json', directory)));
const character = { id:'aquiles' };
const loads = [];
// Decode production bytes. Only transport and the DOM image constructor are adapted.
const images = new Map();
for (const name of [meta.image, meta.portrait]) images.set(name, await loadImage(readFileSync(new URL(name, directory))));
const atlas = images.get(meta.image);
const decoded = createCanvas(atlas.width, atlas.height).getContext('2d');
decoded.drawImage(atlas,0,0);
for (const {region:[x,y,w,h]} of Object.values(meta.poses)) {
  const data = decoded.getImageData(x,y,w,h).data;
  let transparent = 0;
  for (let i=3;i<data.length;i+=4) if (!data[i]) transparent++;
  assert.ok(transparent > w*h*0.12, 'Sprite silhouette must have a transparent surround');
}
globalThis.Image = class {
  set src(url) { this.name = url.split('/').pop(); loads.push(this.name); }
  get width() { return images.get(this.name).width; }
  get height() { return images.get(this.name).height; }
  async decode() { assert.ok(images.has(this.name)); }
};
globalThis.fetch = async url => {
  assert.equal(url, '/assets/fighters/achilles/atlas.json');
  loads.push('atlas.json');
  return {ok:true, json:async () => meta};
};
await Promise.all([preloadFighter(character),preloadFighter(character)]);
function snapshot(clip,t,face) {
  const canvas=createCanvas(320,220);
  const context=canvas.getContext('2d');
  const draw=context.drawImage.bind(context);
  context.drawImage=(image,...args)=>draw(images.get(image.name),...args);
  context.translate(160,190);
  assert.ok(paintSprite(context,character,clip,t,face,2));
  return context.getImageData(0,0,320,220).data;
}
for (const [name, clip] of Object.entries(meta.animations)) {
  const total=clip.frames.reduce((sum,f)=>sum+f.ticks,0);
  assert.equal(frameAt(clip,total),clip.frames[clip.loop?0:clip.frames.length-1].pose);
  let elapsed=0;
  for (const frame of clip.frames) {
    assert.equal(frameAt(clip,elapsed),frame.pose);
    const right=snapshot(name,elapsed,1), left=snapshot(name,elapsed,-1);
    let opaque=0;
    for (let y=0;y<220;y++) for(let x=0;x<320;x++){
      const a=right[(y*320+x)*4+3];
      assert.equal(a,left[(y*320+319-x)*4+3]);
      if (a) { opaque++; assert.ok(x>0 && y>0 && x<319 && y<219); }
    }
    assert.ok(opaque>100);
    if (name==='guard') {
      const lowest=right.findLastIndex((value,i)=>i%4===3 && value>100);
      assert.ok(Math.abs(Math.floor(lowest/4/320) - 189) <= 1);
    }
    elapsed+=frame.ticks;
  }
}
assert.deepEqual(snapshot('jab',3,1),snapshot('jab',3,1));
assert.deepEqual(loads,['atlas.json',meta.image,meta.portrait]);
assert.equal(preloadFighter({id:'aquiles',isCustom:true}),undefined);
assert.equal(preloadFighter({id:'sin-atlas'}),undefined);
assert.equal(spriteAction({on:false,vy:-8,jumpTick:20},23)[0],'jump');
assert.equal(spriteAction({on:false,vy:1},30)[0],'fall');
assert.equal(spriteAction({on:true,landT:5},40)[0],'land');
console.log('Atlas, duraciones, orientación, anclaje, caché y transiciones verificados.');


const juanaDirectory = new URL('../public/assets/fighters/juana/', import.meta.url);
const juanaMeta = JSON.parse(readFileSync(new URL('atlas.json', juanaDirectory)));
for (const name of [juanaMeta.image, juanaMeta.portrait, juanaMeta.equipment.image]) {
  images.set(name, await loadImage(readFileSync(new URL(name, juanaDirectory))));
}
globalThis.fetch = async url => {
  assert.equal(url, '/assets/fighters/juana/atlas.json');
  return { ok: true, json: async () => juanaMeta };
};
const juana = { id: 'juana' };
await preloadFighter(juana);
const equipmentRequests = () => loads.filter(name => name === juanaMeta.equipment.image).length;
const beforeEquip = equipmentRequests();
const equippedCanvas = createCanvas(320, 220);
const equippedContext = equippedCanvas.getContext('2d');
const drawEquipped = equippedContext.drawImage.bind(equippedContext);
let equippedImage;
equippedContext.drawImage = (img, ...args) => {
  equippedImage = img.name;
  return drawEquipped(images.get(img.name), ...args);
};
equippedContext.translate(160, 190);
const launcher = { d: juana, face: 1, wpn: 100, on: true, wk: 'rocket' };
paintCombatSprite(equippedContext, { ...launcher, wpn: 0 }, 42, 2);
assert.equal(equipmentRequests(), beforeEquip, 'El atlas de equipo no se solicita sin arma');
paintCombatSprite(equippedContext, launcher, 42, 2);
assert.equal(equippedImage, juanaMeta.image, 'El atlas base cubre la espera del atlas de equipo');
await new Promise(resolve => setImmediate(resolve));
paintCombatSprite(equippedContext, launcher, 42, 2);
assert.equal(equippedImage, juanaMeta.equipment.image, 'Se usa la hoja separada al terminar la carga');
assert.equal(equipmentRequests(), beforeEquip + 1);
for (const wk of ['mg', 'rocket', 'case']) {
  for (const state of [{}, { pickupT: 9 }, { vx: 3 }, { on: false, vy: -3 }, { reloadT: 10 }, { shootRecoil: 4 }]) {
    const f = { d: juana, face: 1, wpn: 100, on: true, wk, reloadDur: 20, ...state };
    const [clip] = spriteAction(f, 42);
    const baked = ['aim', 'fire', 'launcher', 'rocketFire'].includes(clip);
    assert.deepEqual(paintCombatSprite(equippedContext, f, 42, 2), { drawn: true, equipment: !baked });
  }
}
assert.deepEqual(paintCombatSprite(equippedContext, { d: juana, face: 1, wpn: 0, on: true }, 42, 2),
  { drawn: true, equipment: false });
const legacyRocket = { d: character, on: true, face: 1, wpn: 100, wk: 'rocket' };
assert.deepEqual(paintCombatSprite(equippedContext, legacyRocket, 42, 2), { drawn: true, equipment: true });
for (const state of [{vx: 3}, {pickupT: 9}, {on: false, vy: -3}]) {
  assert.deepEqual(paintCombatSprite(equippedContext, { ...legacyRocket, ...state }, 42, 2),
    { drawn: true, equipment: true });
}
console.log('El atlas se conserva al recoger, sostener, mover y recargar el equipo.');

assert.deepEqual(spriteAction({ on: true, wpn: 100, wk: 'rocket', shootRecoil: 9, reloadT: 50 }, 42), ['rocketFire', 0]);
assert.deepEqual(spriteAction({ on: true, wpn: 100, wk: 'rocket', shootRecoil: 0, reloadT: 41, reloadDur: 50 }, 42), ['load', 9]);
