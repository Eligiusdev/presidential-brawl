import type { GameConfig } from '../types/game';

const profiles = [
  { scale: 1, particleStep: 1, lights: true },
  { scale: .8, particleStep: 2, lights: true },
  { scale: .65, particleStep: 3, lights: false },
] as const;

export type RenderQuality = typeof profiles[number];
export const fullQuality = profiles[0];

export class AdaptiveRenderQuality {
  private tier: number;
  private samples = 0;
  private misses = 0;
  private goodWindows = 0;

  constructor(private adaptive = true, preferEfficiency = false) {
    this.tier = adaptive && preferEfficiency ? 1 : 0;
  }

  get quality(): RenderQuality { return profiles[this.tier]; }

  record(frameMs: number, renderMs: number) {
    if (!this.adaptive || frameMs <= 0 || frameMs > 160) return;
    this.samples++;
    if (frameMs > 25 || renderMs > 12) this.misses++;
    if (this.samples < 45) return;
    if (this.misses >= 12) {
      this.tier = Math.min(profiles.length - 1, this.tier + 1);
      this.goodWindows = 0;
    } else if (this.misses <= 3) {
      if (++this.goodWindows >= 3) {
        this.tier = Math.max(0, this.tier - 1);
        this.goodWindows = 0;
      }
    } else {
      this.goodWindows = 0;
    }
    this.samples = this.misses = 0;
  }
}

export function onlineCanvasWidth(cssWidth: number, dpr: number,
  maxDpr: GameConfig['video']['maxDpr'], quality: RenderQuality) {
  if (cssWidth <= 0) return 0;
  return Math.ceil(Math.min(1920, cssWidth * Math.max(1, Math.min(dpr, maxDpr ?? 1.5)) * quality.scale) / 16) * 16;
}
