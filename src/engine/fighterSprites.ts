import type { PresidentData } from '../types/game';
import type { RenderFighterState } from './pixelRenderer';

type ClipName = 'guard' | 'walk' | 'jump' | 'fall' | 'land' | 'crouch' | 'jab' | 'slash' |
  'aim' | 'fire' | 'magazine' | 'launcher' | 'rocketFire' | 'load' | 'case' | 'up' | 'down' | 'rage' | 'ultimate' | 'hurt' | 'defeat' | 'victory';
type Pose = { region: [number, number, number, number]; anchor: [number, number]; scale: number };
type Clip = { loop: boolean; frames: { pose: string; ticks: number }[] };
type Manifest = { equipmentOverlay?: boolean; image: string; portrait: string; poses: Record<string, Pose>; animations: Record<ClipName, Clip> };
type Art = { atlas: HTMLImageElement; portrait?: HTMLImageElement; meta: Manifest };
type Entry = { ready?: Art; loading: Promise<void>; used: number; retryAt?: number };

const rosterArt = new Set([
  'washington', 'lincoln', 'teddy', 'fdr', 'eisenhower', 'kennedy', 'bolivar',
  'sanmartin', 'juarez', 'cardenas', 'ohiggins', 'sarmiento', 'alfaro', 'batlle',
  'vargas', 'kubitschek', 'allende', 'sucre', 'artigas', 'mujica', 'degaulle',
  'mitterrand', 'chirac', 'masaryk', 'havel', 'walesa', 'pertini', 'kekkonen',
  'robinson', 'mandela', 'sankara', 'nkrumah', 'nyerere', 'ataturk', 'sunyatsen',
  'kalam', 'cesar', 'alejandro', 'lula',
  'aquiles',
  'juana', 'espartaco', 'musashi', 'policarpa', 'wallace', 'elcid', 'ricaurte', 'simo',
  'abelardo', 'petro', 'uribe', 'santos', 'duque', 'bukele', 'sheinbaum',
  'gengis',
  'maduro', 'putin', 'obama', 'napoleon', 'antoinette', 'bathory', 'xiomara', 'diazcanel', 'ortega',
  'milei', 'trump', 'macron', 'noboa', 'kast', 'biden',
]);
const CACHE_LIMIT = 10;
let lastUse = 0;
const cache = new Map<string, Entry>();

export function fighterArtPath(d: PresidentData) {
  const id = d.isCustom ? d.spriteSourceId : d.id;
  if (!id || !rosterArt.has(id)) return;
  const dir = id === 'aquiles' ? 'achilles' : id;
  return (import.meta.env?.BASE_URL ?? '/') + 'assets/fighters/' + dir + '/';
}

function image(url: string): Promise<HTMLImageElement> {
  const result = new Image();
  result.src = url;
  return result.decode().then(() => result);
}

function entry(d: PresidentData) {
  const path = fighterArtPath(d);
  if (!path || typeof Image === 'undefined') return;
  let current = cache.get(path);
  if (!current || (current.retryAt && Date.now() >= current.retryAt)) {
    if (!current && cache.size >= CACHE_LIMIT) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].used - b[1].used)[0];
      cache.delete(oldest[0]);
    }
    const item: Entry = { loading: Promise.resolve(), used: ++lastUse };
    item.loading = (async () => {
      const response = await fetch(path + 'atlas.json');
      if (!response.ok) throw Error('Atlas unavailable');
      const meta: Manifest = await response.json();
      const atlas = await image(path + meta.image);
      for (const pose of Object.values(meta.poses)) {
        const [x, y, w, h] = pose.region;
        if (x < 0 || y < 0 || w <= 0 || h <= 0 || x+w > atlas.width || y+h > atlas.height)
          throw Error('Invalid atlas bounds');
      }
      for (const clip of Object.values(meta.animations)) {
        if (!clip.frames.length || clip.frames.some(f => !meta.poses[f.pose] || !(f.ticks > 0)))
          throw Error('Invalid animation');
      }
      item.ready = { atlas, meta };
      item.ready.portrait = await image(path + meta.portrait);
    })().catch(() => { if (!item.ready) item.retryAt = Date.now() + 5_000; });
    cache.set(path, item);
    current = item;
  }
  current.used = ++lastUse;
  return current;
}

export function preloadFighter(d: PresidentData) { return entry(d)?.loading; }
export function spritePortrait(d: PresidentData) { return entry(d)?.ready?.portrait; }

export function frameAt(clip: Clip, tick: number) {
  const total = clip.frames.reduce((n, frame) => n + frame.ticks, 0);
  let time = Math.max(0, Math.floor(tick));
  time = clip.loop ? time % total : Math.min(time, total - 1);
  for (const frame of clip.frames) {
    if (time < frame.ticks) return frame.pose;
    time -= frame.ticks;
  }
  return clip.frames[clip.frames.length - 1].pose;
}

export function spriteAction(f: RenderFighterState, tick: number): [ClipName, number] {
  if (f.winning) return ['victory', f.winT ?? 0];
  if (f.stun > 0) return ['hurt', Math.max(0, (f.maxStun ?? 14) - f.stun)];
  if (f.pickupT) return f.pickupT > 6 ? ['crouch', 0] : ['land', 14 - f.pickupT];
  if (f.wpn > 0 && f.shootRecoil > 0) {
    if (f.wk === 'mg') return ['fire', 5 - f.shootRecoil];
    if (f.wk === 'rocket') return ['rocketFire', 9 - f.shootRecoil];
  }
  if (f.wpn > 0 && f.reloadT > 0 && (f.wk === 'mg' || f.wk === 'rocket')) {
    return [f.wk === 'mg' ? 'magazine' : 'load', f.reloadDur - f.reloadT];
  }
  if (f.atk) {
    const { spec } = f.atk;
    let t = f.atk.t;
    if (spec.animationTiming) {
      const { from, to } = spec.animationTiming;
      const i = t <= from[1] ? 0 : t <= from[2] ? 1 : 2;
      const progress = Math.min(1, (t - from[i]) / (from[i + 1] - from[i]));
      t = to[i] + progress * (to[i + 1] - to[i]);
    }
    if (spec.effect === 'rage') return ['rage', t];
    if (spec.downSpecial) return ['down', t];
    if (spec.moveKind === 'upSpec') return ['up', t];
    return [spec.k === 'h' || (!spec.individual && spec.moveKind !== 'jab') ? 'slash' : 'jab', t];
  }
  if (!f.on) {
    if (f.vy < 0) return ['jump', Math.max(0, tick - (f.jumpTick ?? (tick - 7)))];
    return ['fall', Math.min(12, Math.abs(f.vy))];
  }
  if (f.landT > 0) return ['land', 7 - f.landT];
  if (f.crouch) return ['crouch', 0];
  if (Math.abs(f.vx) > 0.45 || f.dashT) return ['walk', tick * (f.dashT ? 2 : 1)];
  if (f.wpn > 0 && f.wk === 'mg') return ['aim', tick];
  if (f.wpn > 0 && f.wk === 'rocket') return ['launcher', tick];
  if (f.wpn > 0 && f.wk === 'case') return ['case', tick];
  return ['guard', tick];
}

export function paintSprite(ctx: CanvasRenderingContext2D, d: PresidentData, clip: ClipName, tick: number,
  face: number, scaleX: number, scaleY = scaleX) {
  const art = entry(d)?.ready;
  const animation = art?.meta.animations[clip];
  if (!art || !animation) return false;
  const pose = art.meta.poses[frameAt(animation, tick)];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale((face < 0 ? -1 : 1) * scaleX * pose.scale, scaleY * pose.scale);
  ctx.drawImage(art.atlas, ...pose.region, -pose.anchor[0], -pose.anchor[1], pose.region[2], pose.region[3]);
  ctx.restore();
  return true;
}


const equipmentClips: Partial<Record<ClipName, ClipName>> = {
  aim: 'guard', fire: 'guard', launcher: 'guard', rocketFire: 'launcher', magazine: 'crouch', load: 'crouch', case: 'guard',
};

export function paintCombatSprite(ctx: CanvasRenderingContext2D, f: RenderFighterState, tick: number, scale: number) {
  const art = entry(f.d)?.ready;
  if (!art) return { drawn: false, equipment: false };
  const [requested, frame] = spriteAction(f, tick);
  const clip = art.meta.animations[requested] ? requested : equipmentClips[requested] ?? 'guard';
  const drawn = paintSprite(ctx, f.d, clip, frame, f.face, scale);
  const bakedEquipment = !art.meta.equipmentOverlay && clip in equipmentClips;
  const equipment = drawn && !bakedEquipment && f.wpn > 0 && !f.winning;
  return { drawn, equipment };
}
