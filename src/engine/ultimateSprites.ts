import atlas from '../data/ultimateAtlas.json';
import type { RenderUltEffect } from './pixelRenderer';

type AtlasEntry = { sheet: number; box: readonly number[] };
const entries: Record<string, AtlasEntry | undefined> = atlas;
const images = new Map<number, HTMLImageElement>();
const locomotives = new Set(['ult_lincoln', 'ult_alfaro', 'ult_biden']);
const traces: Record<string, 'steam' | 'water' | 'ember' | 'frost' | 'light'> = {
  ult_lincoln: 'steam', ult_alfaro: 'steam', ult_biden: 'steam', ult_fdr: 'steam',
  ult_noboa: 'water', ult_petro: 'water', ult_robinson: 'water', ult_teddy: 'water',
  ult_cardenas: 'ember', ult_vargas: 'ember', ult_ricaurte: 'ember', ult_elcid: 'ember',
  ult_pertini: 'frost', ult_sanmartin: 'frost', ult_kekkonen: 'frost',
  ult_simo: 'frost', ult_washington: 'frost',
};
const traceColors = {
  steam: ['#55657e', '#bdcbd6', '#fff0cc'],
  water: ['#11658d', '#48b9d9', '#c8fbff'],
  ember: ['#9d3722', '#ef7b2d', '#ffe0a3'],
  frost: ['#628abd', '#addefa', '#effaff'],
  light: ['', '', '#fff4d5'],
};

function getSprite(id: string) {
  const entry = entries[id];
  if (!entry || typeof Image === 'undefined') return;
  let image = images.get(entry.sheet);
  if (!image) {
    image = new Image();
    image.src = `${import.meta.env?.BASE_URL ?? '/'}assets/ultimates/sheet-${entry.sheet}.webp`;
    images.set(entry.sheet, image);
  }
  if (!image.complete || !image.naturalWidth) return;
  return { image, box: entry.box };
}

export function preloadUltimateSprite(id: string) {
  getSprite(id);
  if (id === 'ult_bolivar') getSprite('ult_uribe');
}

function spriteLayer(ctx: CanvasRenderingContext2D, sprite: NonNullable<ReturnType<typeof getSprite>>,
  width: number, height: number, x = 0, y = 0) {
  const [sourceX, sourceY, sourceWidth, sourceHeight] = sprite.box;
  ctx.drawImage(sprite.image, sourceX, sourceY, sourceWidth, sourceHeight,
    Math.round(x - width / 2), Math.round(y - height / 2), width, height);
}

export function paintUltimatePreview(ctx: CanvasRenderingContext2D, id: string,
  x: number, y: number, size: number, time: number) {
  const sprite = getSprite(id);
  if (!sprite) return;
  const [,, width, height] = sprite.box;
  const scale = size / Math.max(width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = Math.min(.63, (time + 1) / 12) * (.88 + .12 * Math.sin(time * .21));
  spriteLayer(ctx, sprite, width * scale, height * scale, 0, -Math.sin(time * .17) * 2);
  ctx.restore();
}

interface Placement {
  x: number;
  y: number;
  hitWidth: number;
  hitHeight: number;
  unit: number;
}

export function paintUltimateSprite(ctx: CanvasRenderingContext2D, u: RenderUltEffect, placement: Placement) {
  if (!u.specialized) return false;
  const { ultimate: { spec, profile }, origin, active, triggered } = u.specialized;
  const sprite = getSprite(spec.id);
  if (!sprite) return false;

  const { x, y, hitWidth, hitHeight, unit } = placement;
  const train = locomotives.has(spec.id);
  const cavalry = profile.travel === 'cavalry';
  const horse = cavalry ? getSprite('ult_uribe') : undefined;
  const slash = spec.primitive === 'dashStrike';
  const heavy = spec.primitive === 'spawnEntity';
  const vertical = ['ult_kennedy', 'ult_cardenas', 'ult_teddy', 'ult_sankara'].includes(spec.id);
  const trace = traces[spec.id] ?? 'light';
  const [primary, highlight] = spec.colors;
  const accents = traceColors[trace];
  const time = u.t;
  const progress = Math.min(1, time / Math.max(1, u.dur));
  const opacity = Math.min(1, (time + 2) / 7, (u.dur - time + 6) / 12);
  const spring = active ? 1 + .075 * Math.sin(time * .37) : .93;
  const ratio = sprite.box[2] / sprite.box[3];
  const length = train ? Math.max(unit * 186, hitWidth * 1.36) : Math.max(unit * 88, Math.min(unit * 256, Math.max(hitWidth, hitHeight) * .91));
  const width = Math.max(1, Math.round(length * spring * Math.min(1, ratio)));
  const height = Math.max(1, Math.round(length * spring / Math.max(1, ratio)));
  const direction = origin.face < 0 ? -1 : 1;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(direction, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity * (active ? 1 : .63);
  const moving = Boolean(profile.travel) || spec.primitive === 'dashStrike' || spec.primitive === 'spawnEntity' || spec.primitive === 'spawnProjectile';
  const bob = moving ? Math.sin(time * .28) * unit * 2 : -Math.sin(time * .13) * unit * 5;
  const beat = (time * spec.hits / Math.max(1, u.dur)) % 1;
  const accent = Math.sin(beat * Math.PI);

  if (train) {
    const rail = height * .49;
    ctx.fillStyle = '#13202f';
    ctx.fillRect(-width * .8, rail + 2 * unit, width * 1.55, Math.max(2, 5 * unit));
    ctx.fillStyle = '#f8bf71';
    ctx.fillRect(-width * .8, rail, width * 1.55, Math.max(1, unit));
    for (let i = 0; i < 8; i++) {
      const offset = ((i * 20 + time * 5) % 160) / 160;
      ctx.fillStyle = '#6a4f45';
      ctx.fillRect((offset - .8) * width * 1.55, rail + 5 * unit, Math.max(2, unit * 7), Math.max(1, unit * 3));
    }
  }

  const motes = trace === 'light' ? 6 : 11;
  for (let i = 0; i < motes; i++) {
    const age = ((time + i * 5) % 42) / 42;
    const angle = i * 2.39996 + time * .13;
    const size = Math.max(1, Math.round(unit * (trace === 'steam' ? 5 + age * 19 : 3 + age * 6)));
    const dx = trace === 'steam' ? width * (.23 - age * .94) : Math.cos(angle) * width * (.33 + age * .49);
    const dy = trace === 'steam' ? -height * .46 - age * unit * 38
      : Math.sin(angle) * height * (.33 + age * .46);
    ctx.globalAlpha = opacity * (1 - age) * (active ? .85 : .44);
    ctx.fillStyle = trace === 'light' ? (i % 2 ? primary : highlight) : accents[i % 3];
    ctx.fillRect(Math.round(dx), Math.round(dy), size, size);
    if (trace === 'ember' || trace === 'water') ctx.fillRect(Math.round(dx - size), Math.round(dy + size), size, Math.max(1, size / 3));
  }

  if (horse) {
    const horseWidth = unit * 104;
    const horseHeight = horseWidth * horse.box[3] / horse.box[2];
    for (const rank of [2, 1, 0]) {
      const stride = Math.sin(time * .83 - rank * 1.4);
      const saddleX = (rank === 0 ? 7 : -rank * 62) * unit;
      const saddleY = (18 - rank * 13 + stride * 6) * unit;
      ctx.globalAlpha = opacity * (rank === 0 ? .95 : .72);
      spriteLayer(ctx, horse, horseWidth, horseHeight, saddleX, saddleY);
      const bannerX = saddleX - unit * 18;
      const bannerY = saddleY - horseHeight * .48;
      ctx.fillStyle = '#f4dfae';
      ctx.fillRect(bannerX, bannerY, 2 * unit, 28 * unit);
      for (const [i, color] of ['#facc15', '#2563eb', '#dc2626'].entries()) {
        ctx.fillStyle = color;
        ctx.fillRect(bannerX - (23 + stride * 3) * unit, bannerY + i * 4 * unit, 24 * unit, 4 * unit);
      }
    }
  }

  if (moving && active && !train && !horse) {
    ctx.globalAlpha = opacity * .22;
    spriteLayer(ctx, sprite, width, height, -unit * 19, bob + unit * 3);
  }
  if (spec.primitive === 'counterStance') {
    ctx.globalAlpha = opacity * (triggered ? .66 : .4);
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1, unit * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * (.61 + .09 * progress), height * .61, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = opacity * (active ? .98 : .69);
  ctx.save();
  if (slash) ctx.rotate((accent - .5) * .31);
  if (heavy && !train) ctx.rotate(Math.sin(time * .14) * .055);
  if (vertical) ctx.scale(.94 + accent * .06, .92 + accent * .13);
  if (horse) {
    ctx.globalAlpha *= .83;
    spriteLayer(ctx, sprite, width * .5, height * .5, unit * 4, -unit * 35 + bob);
  } else {
    spriteLayer(ctx, sprite, width, height, 0, bob);
  }
  ctx.restore();

  if (spec.id === 'ult_lincoln') {
    const wheelY = height * .31 + bob;
    const radius = height * .086;
    ctx.globalAlpha = opacity * .72;
    ctx.lineWidth = Math.max(1, unit * 1.5);
    ctx.strokeStyle = '#ffc878';
    for (const hub of [-.24, .035]) {
      const wheelX = width * hub;
      for (let spoke = 0; spoke < 5; spoke++) {
        const angle = time * .34 + spoke * 2 * Math.PI / 5;
        ctx.beginPath();
        ctx.moveTo(wheelX, wheelY);
        ctx.lineTo(wheelX + Math.cos(angle) * radius, wheelY + Math.sin(angle) * radius);
        ctx.stroke();
      }
    }
  }
  if (train && active) {
    ctx.globalAlpha = opacity * (.25 + .25 * Math.sin(time * .3) ** 2);
    ctx.fillStyle = '#ffda91';
    ctx.beginPath();
    ctx.moveTo(width * .38, -height * .1);
    ctx.lineTo(width * .85, -height * .25);
    ctx.lineTo(width * .85, height * .24);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return true;
}
