import type { PresidentData } from '../types/game';
import type { RenderFighterState } from './pixelRenderer';

type ClipName = 'guard' | 'walk' | 'jump' | 'fall' | 'land' | 'crouch' | 'jab' | 'slash' |
  'aim' | 'fire' | 'magazine' | 'launcher' | 'rocketFire' | 'load' | 'case' | 'up' | 'down' | 'rage' | 'ultimate' | 'hurt' | 'defeat' | 'victory';
type Pose = { region: [number, number, number, number]; anchor: [number, number]; scale: number };
type Clip = { loop: boolean; frames: { pose: string; ticks: number }[] };
type EquipmentSheet = { image: string; authored?: boolean; regions: Record<string, Pose['region']> };
type Manifest = { equipment?: EquipmentSheet; equipmentOverlay?: boolean; image: string; portrait: string; poses: Record<string, Pose>; animations: Record<ClipName, Clip> };
type Art = { atlas: HTMLImageElement; portrait?: HTMLImageElement; equipment?: HTMLImageElement;
  equipmentPending?: boolean; equipmentRetryAt?: number; meta: Manifest; path: string };
type Entry = { thumbnail?: HTMLImageElement; ready?: Art; loading: Promise<void>; used: number; retryAt?: number };

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
  if (!rosterArt.has(d.id)) return;
  const dir = d.id === 'aquiles' ? 'achilles' : d.id;
  return (import.meta.env?.BASE_URL ?? '/') + 'assets/fighters/' + dir + '/';
}

export function fighterAsset(path: string, file: string) {
  return `${path}${file}?art=2`;
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
    void image(fighterAsset(path, 'thumb.webp')).then(thumb => { item.thumbnail = thumb; }).catch(() => {});
    item.loading = (async () => {
      const response = await fetch(fighterAsset(path, 'atlas.json'));
      if (!response.ok) throw Error('Atlas unavailable');
      const meta: Manifest = await response.json();
      if (path.split('/').at(-2) !== 'ataturk' && meta.image !== 'atlas-anime.webp') throw Error('Obsolete fighter atlas');
      const atlas = await image(fighterAsset(path, meta.image));
      for (const pose of Object.values(meta.poses)) {
        const [x, y, w, h] = pose.region;
        if (x < 0 || y < 0 || w <= 0 || h <= 0 || x+w > atlas.width || y+h > atlas.height)
          throw Error('Invalid atlas bounds');
      }
      for (const clip of Object.values(meta.animations)) {
        if (!clip.frames.length || clip.frames.some(f => !meta.poses[f.pose] || !(f.ticks > 0)))
          throw Error('Invalid animation');
      }
      item.ready = { atlas, meta, path };
      item.ready.portrait = await image(fighterAsset(path, meta.portrait));
    })().catch(() => { if (!item.ready) item.retryAt = Date.now() + 5_000; });
    cache.set(path, item);
    current = item;
  }
  current.used = ++lastUse;
  return current;
}

export function preloadFighter(d: PresidentData) { return entry(d)?.loading; }
export function spritePortrait(d: PresidentData) { return entry(d)?.ready?.portrait; }

export function paintFighterThumbnail(ctx: CanvasRenderingContext2D, fighter: PresidentData, face: number, scale: number) {
  const thumb = entry(fighter)?.thumbnail;
  if (!thumb) return;
  const height = 74 * scale;
  const width = height * thumb.width / thumb.height;
  ctx.save();
  ctx.scale(face < 0 ? -1 : 1, 1);
  ctx.drawImage(thumb, -width / 2, -height, width, height);
  ctx.restore();
}

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

type SpriteMotion = { pose?: string; lean: number; stretch: number; lift: number };

const impactPoses: Partial<Record<ClipName, readonly string[]>> = {
  jab: ['jab', 'strike'],
  slash: ['swing', 'special', 'rush', 'thrust', 'strike'],
  up: ['upper', 'uppercut', 'rise'],
  down: ['low', 'sweep', 'backstrike'],
  rage: ['swing', 'special', 'strike'],
};

function combatMotion(f: RenderFighterState, clip: ClipName, frame: number, tick: number,
  meta: Manifest): SpriteMotion | undefined {
  if (meta.image !== 'atlas-anime.webp') return;
  if (clip === 'guard' || clip === 'walk') {
    const step = Math.sin(frame * Math.PI / (clip === 'walk' ? 5 : 19));
    return clip === 'walk'
      ? { lean: .065 + step * .035, stretch: 1 + step * .045, lift: Math.abs(step) * 2.5 }
      : { lean: step * .025, stretch: 1 + step * .035, lift: 0 };
  }
  if (clip === 'jump' || clip === 'fall') {
    return { lean: Math.max(-.18, Math.min(.18, f.vx * f.face * .023)),
      stretch: 1 + Math.min(.12, Math.abs(f.vy) * .009), lift: 0 };
  }
  const attack = f.atk;
  const candidates = impactPoses[clip];
  if (!attack || !candidates) return;
  const { spec, t } = attack;
  const budget = spec.frames;
  const startup = budget?.startup ?? 0;
  const activeEnd = budget ? startup + budget.active : spec.dur;
  const hasContactWindows = spec.ph.some(p => p.hb);
  const contact = spec.ph.find(p => p.hb && t >= p.a[0] && t <= p.a[1]);
  const impact = contact?.a ?? (!hasContactWindows && budget && t > startup && t <= activeEnd
    ? [startup + 1, activeEnd] : undefined);
  if (impact) {
    // The visible strike uses the same simulation tick as the contact box.
    const pose = candidates.find(name => meta.poses[name]);
    const release = 1 - (t - impact[0]) / Math.max(1, impact[1] - impact[0] + 1);
    return { pose, lean: (clip === 'up' ? -.09 : .16) * (.45 + .55 * release),
      stretch: 1 + (clip === 'down' ? -.06 : .09) * release, lift: 0 };
  }
  if (t <= startup) {
    const windup = t / Math.max(1, startup);
    return { lean: -.16 * windup, stretch: 1 - .1 * windup, lift: 0 };
  }
  if (t > activeEnd) {
    const recovery = 1 - Math.min(1, (t - activeEnd) / Math.max(1, spec.dur - activeEnd));
    return { lean: .13 * recovery, stretch: 1 - .09 * recovery, lift: 0 };
  }
  return { lean: .045 * Math.sin(tick * .55), stretch: 1, lift: 0 };
}

function loadEquipment(art: Art) {
  const equipment = art.meta.equipment;
  if (equipment && !art.equipment && !art.equipmentPending && Date.now() >= (art.equipmentRetryAt ?? 0)) {
    art.equipmentPending = true;
    return image(fighterAsset(art.path, equipment.image)).then(sheet => {
      const valid = Object.values(equipment.regions).every(([x, y, w, h]) =>
        x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= sheet.width && y + h <= sheet.height);
      if (!valid) throw Error('Invalid equipment atlas bounds');
      art.equipment = sheet;
    }).catch(() => { art.equipmentRetryAt = Date.now() + 5_000; })
      .finally(() => { art.equipmentPending = false; });
  }
}

export async function preloadArmedFighter(d: PresidentData) {
  const item = entry(d);
  await item?.loading;
  if (item?.ready) await loadEquipment(item.ready);
}

export function paintSprite(ctx: CanvasRenderingContext2D, d: PresidentData, clip: ClipName, tick: number,
  face: number, scaleX: number, scaleY = scaleX, combat = false, motion?: SpriteMotion) {
  const art = entry(d)?.ready;
  const animation = art?.meta.animations[clip];
  if (!art || !animation) return false;
  const name = motion?.pose ?? frameAt(animation, tick);
  const pose = art.meta.poses[name];
  const equipment = combat && clip in equipmentClips ? art.meta.equipment : undefined;
  if (equipment) void loadEquipment(art);
  const region = art.equipment && equipment?.regions[name];
  const source = region ? art.equipment! : art.atlas;
  ctx.save();
  const anime = art.meta.image === 'atlas-anime.webp';
  ctx.imageSmoothingEnabled = anime;
  if (combat) {
    // The combat palette prioritizes silhouette and shadow separation at small scales.
    ctx.filter = anime ? 'contrast(1.13) saturate(1.08)' : 'contrast(1.09) saturate(1.12)';
  }
  ctx.scale((face < 0 ? -1 : 1) * scaleX * pose.scale, scaleY * pose.scale);
  if (motion) {
    ctx.translate(0, -motion.lift / pose.scale);
    ctx.transform(1, 0, -motion.lean, motion.stretch, 0, 0);
  }
  ctx.drawImage(source, ...(region || pose.region), -pose.anchor[0], -pose.anchor[1], pose.region[2], pose.region[3]);
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
  let clip = art.meta.animations[requested] ? requested : requested === 'rage' ? 'slash' : equipmentClips[requested] ?? 'guard';
  let motion = combatMotion(f, clip, frame, tick, art.meta);
  if (art.meta.equipment?.authored && f.wpn > 0 && !f.winning && !f.stun && (f.wk === 'mg' || f.wk === 'rocket')) {
    clip = f.wk === 'mg' ? (f.shootRecoil > 0 ? 'fire' : 'aim') : (f.shootRecoil > 0 ? 'rocketFire' : 'launcher');
    motion = { lean: motion?.lean ?? 0, stretch: motion?.stretch ?? 1, lift: motion?.lift ?? 0 };
  }
  const drawn = paintSprite(ctx, f.d, clip, frame, f.face, scale, scale, true, motion);
  const authored = art.meta.equipment;
  const animation = art.meta.animations[clip];
  const bakedEquipment = clip in equipmentClips && (authored?.authored
    ? Boolean(art.equipment && animation && authored.regions[frameAt(animation, frame)])
    : !art.meta.equipmentOverlay);
  const equipment = drawn && !(authored?.authored && (f.wk === 'mg' || f.wk === 'rocket')) && !bakedEquipment && f.wpn > 0 && !f.winning;
  return { drawn, equipment };
}

// The WebGL scene makes its own textures from the same decoded atlas.
export async function fighterAtlasArt(fighter: PresidentData) {
  const item = entry(fighter);
  await item?.loading;
  return item?.ready;
}
