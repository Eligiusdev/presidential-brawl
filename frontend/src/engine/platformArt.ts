import type { StageDef } from '../types/game';

function mixHex(a: string, b: string, amount: number) {
  const left = parseInt(a.slice(1), 16);
  const right = parseInt(b.slice(1), 16);
  const color = (shift: number) => Math.round(((left >> shift) & 255) * (1 - amount) + ((right >> shift) & 255) * amount);
  return `rgb(${color(16)},${color(8)},${color(0)})`;
}

export function paintIllustratedPlatform(ctx: CanvasRenderingContext2D, stage: StageDef, night: number,
    x: number, y: number, w: number, h: number, floating: boolean, sw: (value: number) => number, art?: CanvasImageSource & { width: number; height: number }) {
    if (w <= 0 || h <= 0) return;
    const base = floating ? stage.palette.floatMain : stage.palette.platformMain;
    const ledge = floating ? stage.palette.floatTop : stage.palette.platformTop;
    const bevel = Math.min(sw(floating ? 6 : 10), h / 3, w / 5);
    const edge = Math.max(1, sw(2));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - bevel);
    ctx.lineTo(x + w - bevel, y + h);
    ctx.lineTo(x + bevel, y + h);
    ctx.lineTo(x, y + h - bevel);
    ctx.closePath();
    ctx.clip();
    const shading = ctx.createLinearGradient(0, y, 0, y + h);
    shading.addColorStop(0, mixHex(ledge, '#516083', night * 0.42));
    shading.addColorStop(0.16, mixHex(base, '#172239', night * 0.40));
    shading.addColorStop(1, mixHex(base, '#080d17', 0.64 + night * 0.10));
    ctx.fillStyle = shading;
    ctx.fillRect(x, y, w, h);
    if (art) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = floating ? 0.18 : 0.26;
      ctx.drawImage(art, 0, art.height * 0.81, art.width, art.height * 0.17, x, y, w, h);
      ctx.restore();
    }
    ctx.fillStyle = mixHex(ledge, '#9faed3', night * 0.36);
    ctx.fillRect(x, y, w, edge);
    ctx.fillStyle = stage.palette.platformTrim;
    ctx.fillRect(x, y + bevel, w, edge);
    ctx.fillStyle = 'rgba(8, 13, 22, 0.55)';
    ctx.fillRect(x, y + h - edge, w, edge);
    if (!floating) {
      const spacing = Math.max(8, sw(84));
      for (let offset = spacing; offset < w; offset += spacing) {
        ctx.fillRect(x + offset, y + bevel * 2, 1, h - bevel * 2);
      }
    }
    ctx.restore();
  }
