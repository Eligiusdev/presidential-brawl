import { useEffect, useRef } from 'react';
import type { PresidentData } from '../types/game';
import { victoryTheme } from '../data/victoryThemes';
import { fighterArtPath, paintSprite, preloadFighter } from '../engine/fighterSprites';
import { PortraitCanvas } from './PortraitCanvas';

const customCelebrations = new Set(['bolivar', 'lincoln', 'gengis']);

export function VictoryShowcase({ fighter }: { fighter: PresidentData }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const { colors, motif } = victoryTheme(fighter);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = 0;
    let disposed = false;
    let celebration: HTMLImageElement | undefined;
    const path = fighterArtPath(fighter);
    if (path && customCelebrations.has(fighter.isCustom ? fighter.spriteSourceId ?? '' : fighter.id)) {
      const image = new Image();
      image.src = path + 'victory.webp';
      void image.decode().then(() => {
        if (!disposed) {
          celebration = image;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(draw);
        }
      }).catch(() => { /* The base atlas still provides a victory pose. */ });
    }

    function draw(now: number) {
      if (!ctx || disposed) return;
      const tick = reduced ? 54 : Math.min(150, (now - start) * .06);
      ctx.clearRect(0, 0, 360, 132);
      for (let i = 0; i < 6; i++) {
        const offset = Math.floor(i / 2) * 13;
        const side = i % 2 ? -1 : 1;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.globalAlpha = .72;
        ctx.lineWidth = motif === 'wind' || motif === 'waves' ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(180 + side * 36, 113 - offset);
        ctx.quadraticCurveTo(180 + side * 68, 62 - offset, 180 + side * (125 + offset), 78 - offset);
        ctx.stroke();
        if (motif === 'laurels') {
          ctx.fillStyle = ctx.strokeStyle;
          for (let leaf = 0; leaf < 4; leaf++) {
            ctx.beginPath();
            ctx.ellipse(180 + side * (56 + leaf * 13), 100 - offset - leaf * 6, 6, 2.5,
              side * -.52, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      for (let i = 0; i < 30; i++) {
        const age = (tick * .013 + i * .131) % 1;
        const side = i % 2 ? -1 : 1;
        const x = 180 + side * (35 + age * 136) + Math.sin(i * 71) * 9;
        const y = 112 - Math.sin(age * Math.PI) * (52 + i % 6 * 8);
        const size = 2 + i % 4;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = .75 * (1 - age);
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
        if (motif === 'stars' || motif === 'sun') {
          ctx.fillRect(Math.round(x - size / 2), Math.round(y + 1), size * 2, 1);
          ctx.fillRect(Math.round(x + 1), Math.round(y - size / 2), 1, size * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(180, 119);
      if (celebration) {
        const width = celebration.naturalWidth / 3;
        const pose = tick < 10 ? 0 : tick < 23 ? 1 : 2;
        const scale = .68;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(celebration, pose * width, 0, width, celebration.naturalHeight,
          -width * scale / 2, -176 * scale, width * scale, celebration.naturalHeight * scale);
      } else {
        paintSprite(ctx, fighter, 'victory', tick, 1, 1.42);
      }
      ctx.restore();
      if (!reduced && tick < 150) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    void preloadFighter(fighter)?.then(() => {
      if (!disposed) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(draw);
      }
    });
    return () => { disposed = true; cancelAnimationFrame(frame); };
  }, [fighter]);

  if (fighter.isCustom && !fighter.spriteSourceId) {
    return <PortraitCanvas president={fighter} className="mx-auto h-24 w-24" animate />;
  }
  return <canvas ref={ref} width={360} height={132} className="victory-showcase"
    aria-label={`Celebración de ${fighter.name}`} />;
}
