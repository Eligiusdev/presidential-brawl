import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { PRESIDENTS_DATA } from '../src/data/presidents.ts';
import { movesFor } from '../src/combat/roster.js';
import { fighterArtPath, spriteAction } from '../src/engine/fighterSprites.ts';

const aquiles = PRESIDENTS_DATA.find(d => d.id === 'aquiles');
const custom = { ...aquiles, id: 'custom_test', isCustom: true };
assert.equal(fighterArtPath(custom), undefined);
assert.equal(fighterArtPath({ ...custom, spriteSourceId: 'aquiles' }), fighterArtPath(aquiles));
assert.equal(fighterArtPath({ ...custom, spriteSourceId: '../unknown' }), undefined);

const actions = ['guard','walk','jump','fall','land','jab','slash','up','hurt','defeat','victory','ultimate'];
let poseCount=0;
let atlasCount=0;
for (const d of PRESIDENTS_DATA) {
  const path = fighterArtPath(d);
  assert.ok(path, d.id + ' requiere un atlas');
  atlasCount++;
  const directory = new URL('../public'+path, import.meta.url);
  const meta=JSON.parse(readFileSync(new URL('atlas.json', directory)));
  const atlas = await loadImage(readFileSync(new URL(meta.image,directory)));
  const canvas=createCanvas(atlas.width,atlas.height);
  const ctx=canvas.getContext('2d');ctx.drawImage(atlas,0,0);
  for (const pose of Object.values(meta.poses)) {
    const [x,y,w,h]=pose.region;
    assert.ok(x>=0 && y>=0 && w>0 && h>0 && x+w<=atlas.width && y+h<=atlas.height,d.id);
    const data=ctx.getImageData(x,y,w,h).data;let clear=0, ink=0;
    for(let i=3;i<data.length;i+=4) data[i] ? ink++ : clear++;
    assert.ok(ink>80 && clear>40,d.id+' silhouette');
    assert.ok(pose.anchor.every(Number.isFinite) && pose.scale>0);
  }
  for (const action of actions) assert.ok(meta.animations[action]?.frames.length,d.id+' '+action);
  for (const [name,clip] of Object.entries(meta.animations)) {
    assert.equal(typeof clip.loop,'boolean');
    for(const frame of clip.frames) assert.ok(meta.poses[frame.pose] && frame.ticks>0,d.id+' '+name);
  }
  if (d.id!=='aquiles') {
    const footprints=new Set();
    for(const frame of meta.animations.guard.frames) {
      const pose=meta.poses[frame.pose];
      const [x,y,w,h]=pose.region;
      const art=ctx.getImageData(x,y,w,h).data;
      const [ax,ay]=pose.anchor;
      const feet=[];
      for(let v=Math.max(0,ay-6);v<h;v++) for(let u=0;u<w;u++) {
        if(art[(v*w+u)*4+3]>128) feet.push([u-ax,v-ay]);
      }
      assert.ok(feet.length>0,d.id+' pies en el suelo');
      footprints.add(JSON.stringify(feet));
    }
    if (meta.image === 'atlas.png') assert.equal(footprints.size,1,d.id+' apoyo de guardia');
    if (meta.image === 'atlas.png') for(const pickup of ['aim','fire','magazine','launcher','load','case']) {
      assert.ok(meta.animations[pickup],d.id+' '+pickup);
    }
    const book = movesFor(d, false, false, false).book;
    const balanced = movesFor(d).book;
    for(const [slot,clip] of [['jab','jab'],['neutral','slash'],['up','up'],['down','down']]) {
      const move=book[slot];
      const ticks=meta.animations[clip].frames.reduce((sum,f)=>sum+f.ticks,0);
      assert.equal(ticks,move.effect==='hover'?120:move.dur,d.id+' '+slot);
      const current = balanced[slot];
      assert.equal(current.animationTiming.to[3], ticks, d.id + ' final del atlas');
      const state = (t) => ({ atk: { spec: { ...current, k: slot === 'jab' ? 'l' : 'h',
        downSpecial: slot === 'down', moveKind: slot === 'up' ? 'upSpec' : 'jab' }, t } });
      assert.equal(spriteAction(state(current.frames.startup + 1), 0)[1],
        current.animationTiming.to[1], d.id + ' sincronía del primer impacto');
      assert.equal(spriteAction(state(current.dur), 0)[1], ticks, d.id + ' cierre de recuperación');
    }
    assert.equal(spriteAction({atk:{spec:{downSpecial:true,k:'h'},t:1}},1)[0],'down');
  }
  for(const file of ['thumb.webp','selection.webp',meta.portrait]) {
    const image=await loadImage(readFileSync(new URL(file,directory)));assert.ok(image.width>0);
  }
  poseCount+=Object.keys(meta.poses).length;
}
assert.equal(atlasCount,PRESIDENTS_DATA.length);
console.log(atlasCount+' luchadores con atlas, '+poseCount+' poses y recursos de selección verificados.');
