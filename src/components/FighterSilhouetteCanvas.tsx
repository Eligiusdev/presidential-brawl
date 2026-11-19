import { useEffect, useRef } from 'react';
import { PreviewAnimState, renderFighterSilhouette } from '../engine/pixelRenderer';
import { preloadFighterAtlas } from '../engine/spriteAtlas';
import { PresidentData } from '../types/game';

interface FighterSilhouetteCanvasProps {
  president: PresidentData;
  className?: string;
  faceDir?: 1 | -1;
  anim?: PreviewAnimState;
  animate?: boolean;
}

export function FighterSilhouetteCanvas({
  president,
  className = 'h-14 w-14',
  faceDir = 1,
  anim = 'sig',
  animate = false,
}: FighterSilhouetteCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let active = true;

    void preloadFighterAtlas(president.id).then((loaded) => {
      if (active && loaded && !animate) {
        renderFighterSilhouette(canvas, president, faceDir, anim);
      }
    });

    if (!animate) {
      renderFighterSilhouette(canvas, president, faceDir, anim);
      return () => {
        active = false;
      };
    }

    let raf = 0;
    let tick = Math.max(8, Math.round(president.sig.dur * 0.25));
    let lastTime = 0;

    const loop = (now: number) => {
      if (now - lastTime >= 48) {
        lastTime = now;
        tick += 1;
        renderFighterSilhouette(canvas, president, faceDir, anim, tick);
      }
      raf = requestAnimationFrame(loop);
    };

    renderFighterSilhouette(canvas, president, faceDir, anim, tick);
    raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [president, faceDir, anim, animate]);

  return <canvas ref={ref} width={104} height={112} className={`pixel-canvas block ${className}`} />;
}

