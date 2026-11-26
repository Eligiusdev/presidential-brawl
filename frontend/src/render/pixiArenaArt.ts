import { ImageSource, NineSliceSprite, Rectangle, Sprite, Texture } from 'pixi.js';
import { drawShot } from '../combat/effects.js';
import { paintIllustratedPlatform } from '../engine/platformArt';
import type { StageDef } from '../types/game';

const shotKinds = ['orb', 'tricolor', 'arco', 'suelo', 'rayo', 'bullet', 'rocket', 'wall', 'bars', 'pulse', 'sonic', 'shock', 'throw'];
const TILE = 64;

export function createArenaAtlas(stage: StageDef, night: number, background: Texture) {
  const sheet = document.createElement('canvas');
  sheet.width = TILE * shotKinds.length;
  sheet.height = TILE * 3;
  const ctx = sheet.getContext('2d');
  if (!ctx) throw Error('Arena atlas generation unavailable');
  const resource = background.source.resource as CanvasImageSource & { width: number; height: number };
  paintIllustratedPlatform(ctx, stage, night, 0, 0, 256, 64, false, value => value, resource);
  paintIllustratedPlatform(ctx, stage, night, 256, 0, 256, 16, true, value => value, resource);
  for (const [index, kind] of shotKinds.entries()) {
    ctx.save();
    ctx.translate(index * TILE, TILE);
    ctx.beginPath();
    ctx.rect(0, 0, TILE, TILE);
    ctx.clip();
    const height = kind === 'orb' || kind === 'pulse' ? 64 : 32;
    ctx.scale(1, TILE / height);
    if (!drawShot(ctx, { kind, x: 0, y: 0, w: TILE, h: height, ownerColor: '#ffce58' })) {
      paintAlternateProjectile(ctx, kind, height);
    }
    ctx.restore();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(8, 128);
  ctx.lineTo(16, 136);
  ctx.lineTo(8, 144);
  ctx.lineTo(0, 136);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(64, 160, 28, 28, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(96, 158);
  ctx.lineTo(143, 151);
  ctx.lineTo(159, 160);
  ctx.lineTo(143, 169);
  ctx.lineTo(96, 162);
  ctx.fill();

  const source = new ImageSource({ resource: sheet, scaleMode: 'nearest' });
  const textures: Texture[] = [];
  const texture = (x: number, y: number, w: number, h: number) => {
    const entry = new Texture({ source, frame: new Rectangle(x, y, w, h) });
    textures.push(entry);
    return entry;
  };
  const main = texture(0, 0, 256, 64);
  const ledge = texture(256, 0, 256, 16);
  const projectiles = new Map(shotKinds.map((kind, i) => [kind, texture(i * TILE, TILE, TILE, TILE)]));
  const particle = texture(0, 128, 16, 16);
  return {
    effectTextures: { dot: particle, ring: texture(32, 128, 64, 64), streak: texture(96, 144, 64, 32) },
    platform(floating: boolean) {
      return new NineSliceSprite({ texture: floating ? ledge : main, leftWidth: 10, rightWidth: 10,
        topHeight: floating ? 3 : 10, bottomHeight: floating ? 3 : 10 });
    },
    projectile(kind: string) { return projectiles.get(kind) ?? projectiles.get('throw')!; },
    particle() { return new Sprite(particle); },
    destroy() {
      for (const entry of textures) entry.destroy(false);
      source.destroy();
    },
  };
}

function paintAlternateProjectile(ctx: CanvasRenderingContext2D, kind: string, height: number) {
  const rect = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  switch (kind) {
    case 'rocket':
      rect('#415c36', 0, 3, 64, height - 6);
      rect('#ff452e', 51, 3, 13, height - 6);
      rect('#ffd43b', 0, 8, 9, height - 16);
      break;
    case 'wall':
      rect('#9e3e28', 0, 0, 64, height);
      for (let y = 0; y < height; y += 8) rect('#541b0e', 0, y, 64, 2);
      break;
    case 'bars':
      for (let x = 0; x < 64; x += 16) {
        rect('#b8c4d4', x, 0, 7, height);
        rect('#fff', x, 0, 2, height);
      }
      break;
    case 'pulse':
      rect('#25d999', 5, 10, 54, 44);
      rect('#98ffe0', 12, 16, 40, 32);
      rect('#fff', 23, 24, 18, 16);
      break;
    case 'shock':
      rect('#9c6c3c', 0, 16, 64, 16);
      rect('#d9a466', 16, 0, 32, 24);
      break;
    case 'bullet':
    case 'sonic':
      rect('#ff9d2e', 0, 3, 64, height - 6);
      rect('#fffce0', 9, 8, 55, height - 16);
      break;
    default:
      rect('#252730', 3, 4, 58, height - 8);
      rect('#f0c622', 12, 4, 5, height - 8);
  }
}
