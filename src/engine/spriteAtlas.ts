import type { PreviewAnimState, RenderFighterState } from './pixelRenderer';

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasFrameEntry {
  rect: AtlasFrameRect;
  durationMs: number;
  anchorX: number;
  anchorY: number;
  event?: string;
}

export interface AtlasAnimationDef {
  loop: boolean;
  frames: AtlasFrameEntry[];
}

export interface FighterAtlasManifest {
  version: number;
  fighterId: string;
  artStyle: 'cps1_pixel' | 'hd_raster';
  atlasImage: string;
  portraitImage: string;
  cellWidth: number;
  cellHeight: number;
  visualScale: number;
  referenceHeightPx: number;
  paletteSpec?: {
    keyLight: string;
    rimLight: string;
    outline: string;
    primary: string;
    secondary: string;
    cloth: string;
  };
  animations: Record<string, AtlasAnimationDef>;
}

export interface LoadedFighterAtlas {
  manifest: FighterAtlasManifest;
  atlasImage: HTMLImageElement;
  portraitImage: HTMLImageElement | null;
  ready: boolean;
}

const FIGHTER_ATLAS_REGISTRY: Record<string, string> = {
  aquiles: 'assets/fighters/achilles',
  washington: 'assets/fighters/washington',
};

const atlasCache = new Map<string, LoadedFighterAtlas>();
const pendingLoads = new Map<string, Promise<LoadedFighterAtlas | null>>();
const failedLoads = new Set<string>();

export function registerFighterAtlas(fighterId: string, relativeAssetDir: string): void {
  FIGHTER_ATLAS_REGISTRY[fighterId] = relativeAssetDir.replace(/^\/+|\/+$/g, '');
  failedLoads.delete(fighterId);
}

export function hasRegisteredFighterAtlas(fighterId: string): boolean {
  return Boolean(FIGHTER_ATLAS_REGISTRY[fighterId]);
}

export function resolvePublicAssetUrl(relativePath: string): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${normalizedBase}${cleanPath}`;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function preloadFighterAtlas(fighterId: string): Promise<LoadedFighterAtlas | null> {
  const cached = atlasCache.get(fighterId);
  if (cached?.ready) return Promise.resolve(cached);
  if (failedLoads.has(fighterId)) return Promise.resolve(null);

  const dir = FIGHTER_ATLAS_REGISTRY[fighterId];
  if (!dir) return Promise.resolve(null);

  const existing = pendingLoads.get(fighterId);
  if (existing) return existing;

  const task = (async (): Promise<LoadedFighterAtlas | null> => {
    try {
      const manifestUrl = resolvePublicAssetUrl(`${dir}/atlas.json`);
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
      const manifest = (await res.json()) as FighterAtlasManifest;

      const atlasUrl = resolvePublicAssetUrl(`${dir}/${manifest.atlasImage}`);
      const portraitUrl = resolvePublicAssetUrl(`${dir}/${manifest.portraitImage}`);

      const [atlasImage, portraitImage] = await Promise.all([
        loadImageElement(atlasUrl),
        loadImageElement(portraitUrl).catch(() => null),
      ]);

      const loaded: LoadedFighterAtlas = {
        manifest,
        atlasImage,
        portraitImage,
        ready: true,
      };
      atlasCache.set(fighterId, loaded);
      return loaded;
    } catch {
      failedLoads.add(fighterId);
      return null;
    } finally {
      pendingLoads.delete(fighterId);
    }
  })();

  pendingLoads.set(fighterId, task);
  return task;
}

export function getLoadedFighterAtlas(fighterId: string): LoadedFighterAtlas | null {
  const cached = atlasCache.get(fighterId);
  if (cached?.ready) return cached;
  if (hasRegisteredFighterAtlas(fighterId) && !pendingLoads.has(fighterId) && !failedLoads.has(fighterId)) {
    void preloadFighterAtlas(fighterId);
  }
  return null;
}

export function getFighterPortraitImage(fighterId: string): HTMLImageElement | null {
  const loaded = getLoadedFighterAtlas(fighterId);
  return loaded?.portraitImage ?? null;
}

// Per-fighter clip playback state keyed by combat slot / preview slot
interface ClipPlaybackState {
  clip: string;
  startTick: number;
  lastTick: number;
}

const playbackMemory = new Map<string, ClipPlaybackState>();
const SIM_FRAME_MS = 1000 / 60;

export function selectAtlasClipForFighter(f: RenderFighterState, prevClip?: string): string {
  if (f.dead > 0) return 'defeat';
  if (f.stun > 0) return 'hurt';
  if (f.winning) return 'victory';

  if (f.atk) {
    const mk = f.atk.spec.moveKind || f.moveKind || '';
    if (mk === 'upSpec') return 'special_up';
    if (mk === 'downSpec') return 'special_down';
    if (mk === 'sig' || f.atk.spec.k === 'h') return 'attack_special';
    return 'attack_light';
  }

  if (f.landT > 0) return 'land';

  if (!f.on) {
    if (f.vy < -1.5) {
      if (prevClip === 'idle' || prevClip === 'walk' || prevClip === 'run' || prevClip === 'crouch' || prevClip === 'jump_start') {
        return 'jump_start';
      }
      return 'jump_up';
    }
    return 'jump_fall';
  }

  if (f.crouch) return 'crouch';

  const absVx = Math.abs(f.vx);
  if (absVx > 2.6) return 'run';
  if (absVx > 0.35) return 'walk';
  return 'idle';
}

export function resolveAtlasFrameForFighter(
  loaded: LoadedFighterAtlas,
  f: RenderFighterState,
  T: number,
  memKey: string
): { clipName: string; frame: AtlasFrameEntry } | null {
  const anims = loaded.manifest.animations;
  const prev = playbackMemory.get(memKey);
  let clipName = selectAtlasClipForFighter(f, prev?.clip);

  // If jump_start finished naturally while rising, transition cleanly to jump_up
  if (clipName === 'jump_start' && prev && prev.clip === 'jump_start') {
    const startClip = anims.jump_start;
    if (startClip) {
      const totalMs = startClip.frames.reduce((s, fr) => s + fr.durationMs, 0);
      const elapsedMs = Math.max(0, (T - prev.startTick) * SIM_FRAME_MS);
      if (elapsedMs >= totalMs) {
        clipName = 'jump_up';
      }
    }
  }

  if (!anims[clipName]) {
    clipName = anims.idle ? 'idle' : Object.keys(anims)[0];
  }
  const clip = anims[clipName];
  if (!clip || clip.frames.length === 0) return null;

  let state = prev;
  if (!state || state.clip !== clipName || T < state.lastTick) {
    state = { clip: clipName, startTick: T, lastTick: T };
    playbackMemory.set(memKey, state);
  } else {
    state.lastTick = T;
  }

  // Active attacks synchronize directly to simulation attack frame progress (anticipation -> impact -> recovery)
  if (f.atk && (clipName === 'attack_light' || clipName === 'attack_special' || clipName === 'special_up' || clipName === 'special_down')) {
    const dur = Math.max(1, f.atk.spec.dur);
    const ratio = Math.max(0, Math.min(0.9999, f.atk.t / dur));
    const totalMs = clip.frames.reduce((s, fr) => s + fr.durationMs, 0);
    let targetMs = ratio * totalMs;
    for (const fr of clip.frames) {
      if (targetMs <= fr.durationMs) return { clipName, frame: fr };
      targetMs -= fr.durationMs;
    }
    return { clipName, frame: clip.frames[clip.frames.length - 1] };
  }

  const elapsedMs = Math.max(0, (T - state.startTick) * SIM_FRAME_MS);
  const totalMs = clip.frames.reduce((s, fr) => s + fr.durationMs, 0) || 1;
  let cursor = clip.loop ? elapsedMs % totalMs : Math.min(elapsedMs, totalMs - 1);

  for (const fr of clip.frames) {
    if (cursor < fr.durationMs) return { clipName, frame: fr };
    cursor -= fr.durationMs;
  }
  return { clipName, frame: clip.frames[clip.frames.length - 1] };
}

export function resolveAtlasFrameForPreview(
  loaded: LoadedFighterAtlas,
  anim: PreviewAnimState,
  tick: number
): AtlasFrameEntry | null {
  const anims = loaded.manifest.animations;
  let clipName = 'idle';
  if (anim === 'walk') clipName = 'walk';
  else if (anim === 'run') clipName = 'run';
  else if (anim === 'jump') clipName = Math.sin(tick * 0.12) < 0 ? 'jump_up' : 'jump_fall';
  else if (anim === 'light') clipName = 'attack_light';
  else if (anim === 'sig') clipName = 'attack_special';
  else if (anim === 'hurt') clipName = 'hurt';
  else if (anim === 'defeat') clipName = 'defeat';
  else if (anim === 'victory') clipName = 'victory';

  const clip = anims[clipName] || anims.idle;
  if (!clip || clip.frames.length === 0) return null;

  const totalMs = clip.frames.reduce((s, fr) => s + fr.durationMs, 0) || 1;
  let cursor = (Math.max(0, tick) * SIM_FRAME_MS) % totalMs;
  for (const fr of clip.frames) {
    if (cursor < fr.durationMs) return fr;
    cursor -= fr.durationMs;
  }
  return clip.frames[clip.frames.length - 1];
}

// Single reusable offscreen buffer for white hit-flash & silhouette tinting (zero per-frame allocations)
let flashOffCanvas: HTMLCanvasElement | null = null;
let flashOffCtx: CanvasRenderingContext2D | null = null;

function ensureFlashBuffer(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!flashOffCanvas) {
    flashOffCanvas = document.createElement('canvas');
    flashOffCtx = flashOffCanvas.getContext('2d');
  }
  if (!flashOffCanvas || !flashOffCtx) return null;
  if (flashOffCanvas.width < w || flashOffCanvas.height < h) {
    flashOffCanvas.width = Math.max(w, flashOffCanvas.width);
    flashOffCanvas.height = Math.max(h, flashOffCanvas.height);
  }
  return flashOffCtx;
}

export function drawAtlasFrame(
  ctx: CanvasRenderingContext2D,
  loaded: LoadedFighterAtlas,
  frame: AtlasFrameEntry,
  rootX: number,
  rootY: number,
  worldScale: number,
  face: number,
  squashX = 1,
  squashY = 1,
  isFlash = false
): void {
  const { rect, anchorX, anchorY } = frame;
  const drawScale = loaded.manifest.visualScale * worldScale;
  const drawW = Math.round(rect.w * drawScale);
  const drawH = Math.round(rect.h * drawScale);
  const drawX = Math.round(-anchorX * drawScale);
  const drawY = Math.round(-anchorY * drawScale);

  ctx.save();
  ctx.translate(Math.round(rootX), Math.round(rootY));
  ctx.scale((face < 0 ? -1 : 1) * squashX, squashY);
  ctx.imageSmoothingEnabled = loaded.manifest.artStyle !== 'cps1_pixel';

  if (isFlash) {
    const fCtx = ensureFlashBuffer(rect.w, rect.h);
    if (fCtx && flashOffCanvas) {
      fCtx.imageSmoothingEnabled = false;
      fCtx.globalCompositeOperation = 'source-over';
      fCtx.clearRect(0, 0, rect.w, rect.h);
      fCtx.drawImage(loaded.atlasImage, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      fCtx.globalCompositeOperation = 'source-atop';
      fCtx.fillStyle = '#ffffff';
      fCtx.fillRect(0, 0, rect.w, rect.h);
      fCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(flashOffCanvas, 0, 0, rect.w, rect.h, drawX, drawY, drawW, drawH);
      ctx.restore();
      return;
    }
  }

  ctx.drawImage(
    loaded.atlasImage,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    drawX,
    drawY,
    drawW,
    drawH
  );
  ctx.restore();
}

export function drawAtlasSilhouette(
  targetCanvas: HTMLCanvasElement,
  loaded: LoadedFighterAtlas,
  frame: AtlasFrameEntry,
  face: 1 | -1,
  accentHex: string,
  highlightHex: string
): boolean {
  const fCtx = ensureFlashBuffer(frame.rect.w, frame.rect.h);
  const ctx = targetCanvas.getContext('2d');
  if (!fCtx || !flashOffCanvas || !ctx) return false;

  const { rect, anchorX, anchorY } = frame;
  fCtx.imageSmoothingEnabled = false;
  fCtx.globalCompositeOperation = 'source-over';
  fCtx.clearRect(0, 0, rect.w, rect.h);
  fCtx.drawImage(loaded.atlasImage, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  fCtx.globalCompositeOperation = 'source-atop';
  fCtx.fillStyle = '#080c18';
  fCtx.fillRect(0, 0, rect.w, rect.h);
  fCtx.globalCompositeOperation = 'source-over';

  const tw = targetCanvas.width;
  const th = targetCanvas.height;
  const scale = Math.min(tw / rect.w, th / rect.h) * 1.15;
  const drawW = Math.round(rect.w * scale);
  const drawH = Math.round(rect.h * scale);
  const drawX = Math.round(-anchorX * scale);
  const drawY = Math.round(-anchorY * scale);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, tw, th);

  // Subtle CPS-1 kinetic wind swirl behind silhouette
  ctx.save();
  ctx.strokeStyle = highlightHex || accentHex;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.5, tw * 0.024);
  ctx.beginPath();
  ctx.moveTo(tw * 0.08, th * 0.84);
  ctx.quadraticCurveTo(tw * 0.54, th * 0.78, tw * 0.92, th * 0.36);
  ctx.stroke();
  ctx.restore();

  // Chromatic rim-light offset passes + dark ink silhouette
  ctx.save();
  ctx.translate(Math.round(tw * 0.5), Math.round(th * 0.92));
  ctx.scale(face, 1);

  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = -1;
  ctx.drawImage(flashOffCanvas, 0, 0, rect.w, rect.h, drawX, drawY, drawW, drawH);

  ctx.shadowColor = highlightHex || '#ffd23f';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = -1;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(flashOffCanvas, 0, 0, rect.w, rect.h, drawX, drawY, drawW, drawH);

  ctx.restore();
  return true;
}
