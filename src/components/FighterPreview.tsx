import { useEffect, useRef, useState } from 'react';
import { renderCharacterPreview } from '../engine/pixelRenderer';
import { fighterArtPath, paintSprite } from '../engine/fighterSprites';
import type { PresidentData } from '../types/game';

type Props = { president: PresidentData; selected: boolean; large?: boolean };
type Clip = 'guard' | 'walk' | 'jab' | 'slash' | 'up' | 'down' | 'victory' | 'rage' | 'ultimate' | 'jump';

const ACTIONS: Clip[] = ['jab', 'slash', 'up', 'down', 'walk', 'victory', 'rage', 'ultimate', 'jump'];

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
    let clip: Clip = 'guard';
    let clipStart = start;
    let nextActionAt = start + 1800 + Math.random() * 2600;

    const draw = (now: number) => {
      const tick = Math.floor((now - start) * 0.06);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (path) {
        if (large) {
          if (clip === 'guard' && now >= nextActionAt) {
            clip = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            clipStart = now;
            nextActionAt = now + 1200 + Math.random() * 1000;
          } else if (clip !== 'guard' && now - clipStart > 1100) {
            clip = 'guard';
            clipStart = now;
            nextActionAt = now + 2200 + Math.random() * 3200;
          }
        }

        const tickClip = clip === 'guard' ? tick : Math.floor((now - clipStart) * 0.06);
        ctx.save();
        ctx.translate(canvas.width * 0.5, canvas.height * 0.95);
        let drawn = paintSprite(ctx, president, clip, tickClip, 1, canvas.height * 0.9 / 74);
        if (!drawn && clip !== 'guard') {
          clip = 'guard';
          clipStart = now;
          nextActionAt = now + 2200 + Math.random() * 3200;
          drawn = paintSprite(ctx, president, 'guard', tick, 1, canvas.height * 0.9 / 74);
        }
        ctx.restore();
        if (drawn && !hasDrawn) {
          hasDrawn = true;
          setReady(true);
        }
      } else {
        const pose = large && Math.floor((now - start) / 2600) % 5 === 2 ? 'sig' : 'idle';
        renderCharacterPreview(canvas, president, pose, tick, 1);
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
    <canvas ref={ref} width={large ? 360 : 112} height={large ? 320 : 112}
      aria-label={president.name + ' en guardia'} className="block h-full w-full object-contain" />
  </div>;
}
