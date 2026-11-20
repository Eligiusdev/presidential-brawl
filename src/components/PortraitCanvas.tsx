import { useEffect, useRef } from 'react';
import { fighterArtPath } from '../engine/fighterSprites';
import { renderPresidentPortrait } from '../engine/pixelRenderer';
import { PresidentData } from '../types/game';

interface PortraitCanvasProps {
  president: PresidentData;
  className?: string;
  animate?: boolean;
}

export function PortraitCanvas(props: PortraitCanvasProps) {
  const { president, className = 'w-12 h-12' } = props;
  const path = fighterArtPath(president);
  if (path) return <img loading="lazy" decoding="async" src={path + 'portrait.png'}
    alt={president.name} className={`block object-contain ${className}`} />;
  return <ProceduralPortrait {...props} />;
}

function ProceduralPortrait({ president, className = 'w-12 h-12', animate = false }: PortraitCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!animate) {
      renderPresidentPortrait(canvas, president, 0);
      return;
    }
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 1;
      renderPresidentPortrait(canvas, president, t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [president, animate]);

  return <canvas ref={ref} width={48} height={48} className={`pixel-canvas block ${className}`} />;
}
