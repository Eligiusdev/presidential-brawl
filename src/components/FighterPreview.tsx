import { useEffect, useRef, useState } from 'react';
import { renderCharacterPreview } from '../engine/pixelRenderer';
import { fighterArtPath, paintSprite } from '../engine/fighterSprites';
import type { PresidentData } from '../types/game';

type Props = { president: PresidentData; selected: boolean; large?: boolean };

export function FighterPreview(props: Props) {
  return <PreviewArt key={props.president.id} {...props} />;
}

function PreviewArt({ president, selected, large = false }: Props) {
  const path = fighterArtPath(president);
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const size = large ? 'fighter-showcase-body' : 'h-24 w-24 sm:h-28 sm:w-28';

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let hasDrawn = false;
    const start = performance.now();
    const draw = (now: number) => {
      const tick = Math.floor((now - start) * 0.06);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (path) {
        ctx.save();
        ctx.translate(canvas.width * 0.48, canvas.height * 0.94);
        const drawn = paintSprite(ctx, president, 'guard', tick, 1, canvas.height * 0.86 / 74);
        ctx.restore();
        if (drawn && !hasDrawn) {
          hasDrawn = true;
          setReady(true);
        }
      } else {
        renderCharacterPreview(canvas, president, 'idle', tick, 1);
      }
      if (selected || large) raf = requestAnimationFrame(draw);
    };
    draw(start);
    return () => cancelAnimationFrame(raf);
  }, [path, president, selected, large]);

  if (path && !large) {
    return <img loading="lazy" decoding="async" width={112} height={112}
      src={path + 'thumb.webp'} alt={president.name}
      className={`block object-contain ${size}`} />;
  }

  return <div className={`relative ${size}`}>
    {path && !ready && <img src={path + 'thumb.webp'} alt="" className="absolute inset-0 h-full w-full object-contain" />}
    <canvas ref={ref} width={large ? 280 : 112} height={large ? 232 : 112}
      aria-label={president.name + ' en guardia'} className="block h-full w-full object-contain" />
  </div>;
}
