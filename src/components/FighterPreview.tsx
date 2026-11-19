import { useEffect, useRef, useState } from 'react';
import { renderCharacterPreview } from '../engine/pixelRenderer';
import { fighterArtPath, paintSprite, preloadFighter } from '../engine/fighterSprites';
import type { PresidentData } from '../types/game';

type Props = { president: PresidentData; selected: boolean; large?: boolean };

export function FighterPreview(props: Props) {
  const { president, selected } = props;
  const path = fighterArtPath(president);
  const [missing, setMissing] = useState('');
  if (!selected && path && missing !== path) {
    return <img loading="lazy" decoding="async" width={112} height={112}
      src={path + 'thumb.webp'} alt={president.name} onError={() => setMissing(path)}
      className="pixel-canvas h-24 w-24 sm:h-28 sm:w-28 object-contain brightness-75 saturate-50 group-hover:brightness-100 group-hover:saturate-100" />;
  }
  return <AnimatedPreview {...props} />;
}

function AnimatedPreview({ president, selected, large = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let active = true;
    let raf = 0;
    const start = performance.now();
    const draw = (time: number) => {
      if (!active) return;
      const tick = Math.floor((time - start) * 0.06);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width * 0.48, canvas.height * 0.94);
      const drawn = paintSprite(ctx, president, 'guard', tick, 1, canvas.height * 0.86 / 74);
      ctx.restore();
      if (!drawn) renderCharacterPreview(canvas, president, 'idle', tick, 1);
    };
    const animate = (time: number) => {
      draw(time);
      raf = requestAnimationFrame(animate);
    };
    draw(start);
    if (selected) raf = requestAnimationFrame(animate);
    else preloadFighter(president)?.then(() => draw(start));
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [president, selected, large]);
  return <canvas ref={ref} width={large ? 280 : 112} height={large ? 232 : 112}
    aria-label={president.name + ' en guardia'}
    className={large ? 'fighter-showcase-body pixel-canvas' :
      `pixel-canvas h-24 w-24 sm:h-28 sm:w-28 transition-[filter] ${selected ? '' : 'brightness-50 saturate-0 group-hover:brightness-100 group-hover:saturate-100 group-focus:brightness-100'}`} />;
}
