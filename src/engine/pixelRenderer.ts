import { ultimatePoint, type PresidentUltimate, type UltimateOrigin } from './presidentUltimates';
import { stageArt, stageHazardColumns, stageNightMix } from './stageAtmosphere';
import { paintCombatSprite, paintSprite, spritePortrait } from './fighterSprites';
import { drawEffects, drawStrike, drawShot, shotTouches, strikeBox } from '../combat/effects.js';
import { PIXEL_PRESET_DIMS } from '../config/defaultConfig';
import { ColorRamp, GameConfig, PlatformDef, PresidentData, StageDef } from '../types/game';

export type PreviewAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'shoot' | 'reload' | 'sig' | 'victory';
export type VictoryPoseStyle =
  | 'saber_salute'
  | 'pulse_levitate'
  | 'chainsaw_rev'
  | 'boxing_champ'
  | 'gavel_proclaim'
  | 'axe_shoulder'
  | 'tactical_salute'
  | 'diplomat_bow';

export function getVictoryPoseStyle(d: PresidentData): VictoryPoseStyle {
  const sig = d.signatureType;
  const wpn = d.anatomy.weaponType;
  const outfit = d.anatomy.outfitStyle;
  if (wpn === 'saber' || sig === 'fencing') return 'saber_salute';
  if (wpn === 'staff' || sig === 'pulse' || d.id === 'robinson') return 'pulse_levitate';
  if (wpn === 'chainsaw' || sig === 'chainsaw') return 'chainsaw_rev';
  if (wpn === 'gloves' || sig === 'tiger') return 'boxing_champ';
  if (wpn === 'axe' || sig === 'lenador') return 'axe_shoulder';
  if (wpn === 'gavel' || sig === 'muralla' || sig === 'quake') return 'gavel_proclaim';
  if (wpn === 'claws' || wpn === 'baton' || outfit === 'tactical' || outfit === 'armored') return 'tactical_salute';
  return 'diplomat_bow';
}

export interface RenderFighterState {
  pi: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  vx: number;
  vy: number;
  face: number;
  on: boolean;
  wall: number;
  dead: number;
  inv: number;
  stun: number;
  maxStun?: number;
  jumpTick?: number;
  koVisual?: { x: number; tick: number };
  dashT: number;
  dashCD: number;
  vote: number;
  pct: number;
  combo: number;
  jabStep?: number;
  floating?: boolean;
  fastFall?: boolean;
  winning?: boolean;
  winT?: number;
  moveKind?: string;
  pickupT?: number;
  wpn: number;
  wk: string | null;
  ammo: number;
  maxAmmo: number;
  reloadT: number;
  reloadDur: number;
  shootRecoil: number;
  landT: number;
  crouch: boolean;
  boss: boolean;
  hitFlash: number;
  squashX: number;
  squashY: number;
  d: PresidentData;
  atk: {
    spec: {
      k: string;
      individual?: boolean; downSpecial?: boolean; effect?: string;
      moveKind?: string;
      dur: number;
      animationTiming?: { from: number[]; to: number[] };
      heavy?: boolean;
      ph: Array<{ a: [number, number]; hb?: { fx: number; y: number; w: number; h: number }; fx?: string; armor?: boolean }>;
    };
    t: number;
    armor: boolean;
  } | null;
  afterimages: Array<{ x: number; y: number; face: number; alpha: number }>;
}

export interface RenderProjectile {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  kind: string;
  w2?: string;
  dir: number;
  life: number;
  ownerColor?: string;
  ownerHighlight?: string;
}

export interface RenderItem {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
}

export interface RenderParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  m: number;
  col: string;
  z: number;
  ex?: number;
  shell?: boolean;
  mag?: boolean;
  dust?: boolean;
  rot?: number;
  shape?: 'spark' | 'diamond' | 'streak' | 'puff';
}

export interface RenderUltEffect {
  dg?: number;
  specialized?: {
    ultimate: PresidentUltimate;
    origin: UltimateOrigin;
    point: { x: number; y: number };
    box: { x: number; y: number; w: number; h: number };
    contact: number;
    originStock: number;
    targetStock: number;
    triggered: boolean;
    active: boolean;
    landed: boolean;
  };
  t: number;
  dur: number;
  f: RenderFighterState;
  o: RenderFighterState;
  ty?: number;
  tr?: Array<{ x: number; y: number }>;
  lx?: number;
  ly?: number;
  cy?: number;
  ex?: number;
  et?: number;
  bx?: number[];
  tx?: number;
  m?: Array<{ x: number; y: number; k: number }>;
  r?: number;
  cx?: number;
  ux?: number;
  kind: string;
}

export type CrowdMood = 'calm' | 'hype' | 'heavy' | 'ult' | 'win';

export interface CrowdParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  m: number;
  col: string;
  size: number;
  kind: 'confetti' | 'flash' | 'cheer' | 'pennant';
  phase: number;
  spin: number;
}

export interface CrowdState {
  excitement: number;
  cheerTimer: number;
  mood: CrowdMood;
  accentColor: string;
  accentHighlight: string;
  seed: number;
}

export interface WorldRenderContext {
  T: number;
  W: number;
  H: number;
  stage: StageDef;
  stageNightStart?: boolean;
  main: { x: number; y: number; w: number; h: number };
  plats: PlatformDef[];
  hzPhase: number;
  hzMod: number;
  hzDur: number;
  legacyHazards?: boolean;
  fighters: RenderFighterState[];
  projectiles: RenderProjectile[];
  items: RenderItem[];
  particles: RenderParticle[];
  crowd: CrowdState;
  crowdParticles: CrowdParticle[];
  ults: RenderUltEffect[];
  cine: { t: number; f: RenderFighterState; name?: string; flash?: boolean } | null;
  telegraph: { t: number; duration?: number; ultimateId?: string; aim?: { x: number; y: number }; zones: Array<{ x: number; y: number; w: number; h: number }> } | null;
  shake: number;
  bannerMsg: { t: string; l: number; m: number };
  floatTexts: Array<{ t: string; x: number; y: number; l: number; m: number }>;
  winnerPi: number | null;
  strikes: Array<{x:number;y:number;w:number;h:number;color:string;highlight?:string;direction?:number}>;
  hitboxes: Array<{ x: number; y: number; w: number; h: number; kind: string }>;
}

interface Vec2 {
  x: number;
  y: number;
}

interface JointPose {
  pelvis: Vec2;
  chest: Vec2;
  neck: Vec2;
  head: Vec2;
  lShoulder: Vec2;
  lElbow: Vec2;
  lHand: Vec2;
  rShoulder: Vec2;
  rElbow: Vec2;
  rHand: Vec2;
  lHip: Vec2;
  lKnee: Vec2;
  lFoot: Vec2;
  rHip: Vec2;
  rKnee: Vec2;
  rFoot: Vec2;
  weaponAngle: number;
  capeAngle: number;
  eyeState: 'normal' | 'fierce' | 'hurt' | 'blink';
  mouthOpen: number;
  torsoAngle: number;
  headTilt: number;
}

// 4x4 Ordered Bayer Dither Matrix (Capcom CPS-1 Halftone Shading)
const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

type RGB = [number, number, number];
type CpsRamp = [number, number, number, number, number]; // [highlight, base, midShadow, deepShadow, outline] packed ABGR
type MuscleProfile = 'uniform' | 'bicep' | 'forearm' | 'thigh' | 'calf' | 'boot' | 'cape';

const SPR_W = 104;
const SPR_H = 112;
const ANCHOR_X = 52;
const ANCHOR_Y = 98;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

function parseHexRgb(hex: string): RGB {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
  const num = parseInt(full.slice(0, 6), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function packRgba(r: number, g: number, b: number, a = 255): number {
  return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}

// CPS-1 Hue-Shifted 5-Tone Ramp (warm highlights, cool deep shadows, non-black chromatic outline)
function makeCpsRampFromRgb(r: number, g: number, b: number): CpsRamp {
  const hi = packRgba(clamp(r + 44, 0, 255), clamp(g + 42, 0, 255), clamp(b + 26, 0, 255));
  const base = packRgba(r, g, b);
  const mid = packRgba(clamp(r - 36, 0, 255), clamp(g - 40, 0, 255), clamp(b - 22, 0, 255));
  const deep = packRgba(clamp(r - 70, 0, 255), clamp(g - 74, 0, 255), clamp(b - 46, 0, 255));
  const out = packRgba(
    clamp(Math.round(r * 0.28 + 6), 8, 95),
    clamp(Math.round(g * 0.26 + 5), 7, 90),
    clamp(Math.round(b * 0.34 + 10), 12, 115)
  );
  return [hi, base, mid, deep, out];
}

const rampCache = new Map<string, CpsRamp>();
function getCpsRamp(hex: string): CpsRamp {
  let hit = rampCache.get(hex);
  if (!hit) {
    const [r, g, b] = parseHexRgb(hex);
    hit = makeCpsRampFromRgb(r, g, b);
    rampCache.set(hex, hit);
  }
  return hit;
}

const tintHexCache = new Map<string, string>();
function tintOutlineHex(hex: string, factor = 0.28): string {
  const key = `${hex}:${factor}`;
  let hit = tintHexCache.get(key);
  if (!hit) {
    const [r, g, b] = parseHexRgb(hex);
    const or = clamp(Math.round(r * factor + 7), 10, 88);
    const og = clamp(Math.round(g * factor + 6), 9, 82);
    const ob = clamp(Math.round(b * (factor + 0.08) + 12), 14, 110);
    hit = `rgb(${or},${og},${ob})`;
    tintHexCache.set(key, hit);
  }
  return hit;
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r},${g},${b})`;
}

// 2-Bone Analytical Inverse Kinematics Solver
function solveTwoBoneIK(root: Vec2, target: Vec2, l1: number, l2: number, bendDir: number): { mid: Vec2; end: Vec2 } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy) || 0.001;
  const maxReach = Math.max(0.5, l1 + l2 - 0.05);
  const minReach = Math.abs(l1 - l2) + 0.05;
  const dist = Math.max(minReach, Math.min(maxReach, rawDist));

  const baseAngle = Math.atan2(dy, dx);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
  const angleA = Math.acos(cosA);
  const theta1 = baseAngle + bendDir * angleA;

  const mid: Vec2 = {
    x: root.x + Math.cos(theta1) * l1,
    y: root.y + Math.sin(theta1) * l1,
  };
  const end: Vec2 = {
    x: root.x + (dx / rawDist) * dist,
    y: root.y + (dy / rawDist) * dist,
  };
  return { mid, end };
}

class CpsSpriteRasterizer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imgData: ImageData;
  buf32: Uint32Array;
  glowMask: Uint8Array; // 1 = additive/emissive pixel that shouldn't get a dark chromatic outline

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SPR_W;
    this.canvas.height = SPR_H;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Sprite 2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.imgData = ctx.createImageData(SPR_W, SPR_H);
    this.buf32 = new Uint32Array(this.imgData.data.buffer);
    this.glowMask = new Uint8Array(SPR_W * SPR_H);
  }

  clear() {
    this.buf32.fill(0);
    this.glowMask.fill(0);
  }

  setPx(x: number, y: number, col32: number, isGlow = false) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= SPR_W || iy < 0 || iy >= SPR_H) return;
    const idx = iy * SPR_W + ix;
    this.buf32[idx] = col32;
    this.glowMask[idx] = isGlow ? 1 : 0;
  }

  fillRectPx(x: number, y: number, w: number, h: number, col32: number, isGlow = false) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(SPR_W, Math.round(x + w));
    const y1 = Math.min(SPR_H, Math.round(y + h));
    for (let py = y0; py < y1; py++) {
      const row = py * SPR_W;
      for (let px = x0; px < x1; px++) {
        this.buf32[row + px] = col32;
        this.glowMask[row + px] = isGlow ? 1 : 0;
      }
    }
  }

  // Bayer-dithered tone selector from continuous shade value lum in [0..1]
  pickDitheredTone(px: number, py: number, lum: number, ramp: CpsRamp, isFlash: boolean, ditherAmt = 0.65): number {
    if (isFlash) return 0xffffffff;
    const bayer = BAYER_4X4[(py & 3) * 4 + (px & 3)] / 16 - 0.5;
    const scaled = clamp(lum, 0, 1) * 3.0; // 0 = deepShadow, 1 = midShadow, 2 = base, 3 = highlight
    const dithered = clamp(Math.round(scaled + bayer * ditherAmt), 0, 3);
    // ramp order: [0]=hi, [1]=base, [2]=midShadow, [3]=deepShadow
    return ramp[3 - dithered];
  }

  // Sculpted Muscular / Cloth Limb Rasterizer with 4x4 Bayer Dithering & Rim Light
  fillMuscleLimb(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    rA: number,
    rB: number,
    profile: MuscleProfile,
    ramp: CpsRamp,
    isFlash: boolean,
    faceDir: number
  ) {
    const pad = Math.ceil(Math.max(rA, rB) * 1.65) + 2;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - pad));
    const maxX = Math.min(SPR_W - 1, Math.ceil(Math.max(ax, bx) + pad));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - pad));
    const maxY = Math.min(SPR_H - 1, Math.ceil(Math.max(ay, by) + pad));

    const vx = bx - ax;
    const vy = by - ay;
    const lenSq = vx * vx + vy * vy || 0.001;
    const invLen = 1 / Math.sqrt(lenSq);
    const dirX = vx * invLen;
    const dirY = vy * invLen;

    for (let py = minY; py <= maxY; py++) {
      const row = py * SPR_W;
      for (let px = minX; px <= maxX; px++) {
        const wx = px - ax;
        const wy = py - ay;
        const tRaw = (wx * vx + wy * vy) / lenSq;
        const t = clamp(tRaw, 0, 1);

        let r = lerp(rA, rB, t);
        if (profile === 'bicep') {
          r *= 1 + 0.24 * Math.sin(Math.pow(t, 0.85) * Math.PI);
        } else if (profile === 'forearm') {
          r *= 1 + 0.26 * Math.sin(Math.pow(t, 0.55) * Math.PI) - 0.14 * t;
        } else if (profile === 'thigh') {
          r *= 1 + 0.30 * Math.sin(Math.pow(t, 0.78) * Math.PI);
        } else if (profile === 'calf') {
          r *= 1 + 0.28 * Math.sin(Math.pow(t, 0.58) * Math.PI) - 0.16 * t;
        } else if (profile === 'boot') {
          const cuff = t < 0.18 ? 0.22 * (1 - t / 0.18) : 0;
          r *= 1 + cuff - 0.12 * t;
        }

        const cx = ax + vx * t;
        const cy = ay + vy * t;
        const dx = px - cx;
        const dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r) continue;

        if (isFlash) {
          this.buf32[row + px] = 0xffffffff;
          this.glowMask[row + px] = 0;
          continue;
        }

        // Compute cylindrical surface normal + Capcom top-front key light
        const d = Math.sqrt(d2);
        const nx = d > 0.001 ? dx / r : 0;
        const ny = d > 0.001 ? dy / r : 0;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        // Key light comes from upper-front relative to fighter facing!
        const lx = faceDir * 0.52;
        const ly = -0.74;
        const lz = 0.42;
        const ndotl = nx * lx + ny * ly + nz * lz;
        // Subtle anatomical muscle striation along segment axis
        const ridge = Math.sin(t * Math.PI * 2.1 + (dirX * nx + dirY * ny) * 1.2) * 0.08;
        const rim = d > r * 0.82 && nx * -faceDir > 0.3 ? 0.14 : 0;
        const lum = clamp(0.46 + ndotl * 0.52 + ridge + rim, 0.02, 0.99);

        this.buf32[row + px] = this.pickDitheredTone(px, py, lum, ramp, false, 0.68);
        this.glowMask[row + px] = 0;
      }
    }
  }

  // Chromatic 1px Pixel-Art Outline Pass (darkens neighboring color instead of uniform black)
  applyChromaticOutline(enabled: boolean) {
    if (!enabled) return;
    const src = new Uint32Array(this.buf32);
    const dirs = [-1, 1, -SPR_W, SPR_W];

    for (let y = 1; y < SPR_H - 1; y++) {
      const row = y * SPR_W;
      for (let x = 1; x < SPR_W - 1; x++) {
        const idx = row + x;
        if (src[idx] !== 0) continue;

        let sample = 0;
        for (let k = 0; k < 4; k++) {
          const nIdx = idx + dirs[k];
          if (src[nIdx] !== 0 && this.glowMask[nIdx] === 0) {
            sample = src[nIdx];
            break;
          }
        }
        if (!sample) continue;

        const r = sample & 255;
        const g = (sample >> 8) & 255;
        const b = (sample >> 16) & 255;
        // Preserve hue in a very dark chromatic outline (never pure #000000 unless cloth is black)
        const or = clamp(Math.round(r * 0.25 + 6), 8, 72);
        const og = clamp(Math.round(g * 0.23 + 5), 7, 68);
        const ob = clamp(Math.round(b * 0.33 + 12), 12, 92);
        this.buf32[idx] = packRgba(or, og, ob, 255);
      }
    }
  }

  flushToContext() {
    this.ctx.putImageData(this.imgData, 0, 0);
  }
}

// Fixed gameplay geometry. Its buffers and poses are independent of the art atlas.
export class LegacyFighterGeometry {
  private spriteRas = new CpsSpriteRasterizer();
  private poseMemory = new Map<number, JointPose>();

  private computeTargetPose(f: RenderFighterState, T: number): JointPose {
    const an = f.d.anatomy;
    const hScale = an.heightScale;
    const absVx = Math.abs(f.vx);
    const dir = f.face;

    // 6.7 Heads Heroic Proportions (head ~11px, total standing height ~74px)
    const legUpper = 18.2 * hScale;
    const legLower = 18.2 * hScale;
    const torsoH = 22.8 * hScale;
    const armUpper = 12.8 * hScale;
    const armLower = 12.4 * hScale;

    let hipY = -(legUpper + legLower) + 4.2; // Natural Street Fighter II semiflexed knees!
    let torsoAngle = 0.06;
    let headTilt = 0;
    let lThighA = 0.36;
    let lKneeBend = 0.44;
    let rThighA = -0.34;
    let rKneeBend = 0.38;

    let lArmA = 0.65;
    let lElbowBend = -1.25;
    let rArmA = -0.58;
    let rElbowBend = -1.32;
    let weaponAngle = -0.32;
    let capeAngle = 0.18;
    let eyeState: JointPose['eyeState'] = 'normal';
    let mouthOpen = 0;

    if (T % 180 > 174 && f.stun <= 0 && !f.atk) eyeState = 'blink';

    // 1. Hurt / Hit-Stun Recoil
    if (f.stun > 0) {
      torsoAngle = -0.46;
      headTilt = -0.38;
      hipY += 3.5;
      lThighA = 0.56;
      lKneeBend = 0.78;
      rThighA = -0.52;
      rKneeBend = 0.54;
      lArmA = -2.15;
      lElbowBend = -0.45;
      rArmA = 2.18;
      rElbowBend = 0.32;
      capeAngle = -0.88;
      eyeState = 'hurt';
      mouthOpen = 1;
    }
    // 2. Dash Aerodynamic Lunge
    else if (f.dashT > 0) {
      torsoAngle = 0.62;
      headTilt = -0.24;
      hipY += 5.0;
      lThighA = -0.96;
      lKneeBend = 1.15;
      rThighA = 0.88;
      rKneeBend = 0.25;
      lArmA = -1.22;
      lElbowBend = -0.25;
      rArmA = 1.25;
      rElbowBend = -0.2;
      capeAngle = -1.18;
      eyeState = 'fierce';
    }
    // 3. Wall Slide Friction
    else if (f.wall !== 0 && !f.on) {
      torsoAngle = -0.14;
      lThighA = 0.52;
      lKneeBend = 1.18;
      rThighA = -0.24;
      rKneeBend = 0.7;
      rArmA = -2.35;
      rElbowBend = -0.35;
      lArmA = 0.6;
      lElbowBend = -0.8;
      eyeState = 'fierce';
    }
    // 3.5. Personality-Driven Victory Pose Choreography!
    else if (f.winning) {
      const wt = f.winT ?? T;
      const intro = Math.min(1, wt / 18);
      const style = getVictoryPoseStyle(f.d);
      eyeState = 'fierce';

      if (style === 'saber_salute') {
        // El Saludo del Libertador: sweeping flourish into heroic saber-to-the-sky salute
        const flourish = Math.min(1, wt / 22);
        torsoAngle = lerp(0.18, -0.1, flourish);
        headTilt = -0.1;
        lThighA = 0.56;
        lKneeBend = 0.48;
        rThighA = -0.46;
        rKneeBend = 0.34;
        rArmA = flourish < 0.45 ? lerp(-0.4, -1.3, flourish / 0.45) : lerp(-1.3, -2.35, (flourish - 0.45) / 0.55);
        rElbowBend = -0.12;
        lArmA = 1.05;
        lElbowBend = -1.25;
        weaponAngle = flourish < 0.45 ? 0.35 : -0.78 + Math.sin(T * 0.08) * 0.03;
        capeAngle = 0.72 + Math.sin(T * 0.14) * 0.18;
        mouthOpen = wt < 28 ? 1 : 0;
      } else if (style === 'pulse_levitate') {
        // Doctora Pulso / Staff Orators: graceful levitation + staff held aloft with energy sway
        const hover = Math.sin(T * 0.16);
        hipY -= intro * 9.5 + hover * 2.2;
        torsoAngle = -0.05 + hover * 0.03;
        headTilt = -0.08;
        lThighA = 0.24;
        lKneeBend = 0.58;
        rThighA = -0.18;
        rKneeBend = 0.44;
        rArmA = lerp(-0.8, -2.18, intro) + hover * 0.05;
        rElbowBend = -0.18;
        lArmA = 0.95;
        lElbowBend = -1.45;
        weaponAngle = -0.15 + hover * 0.05;
        capeAngle = 0.65 + Math.sin(T * 0.22) * 0.2;
      } else if (style === 'chainsaw_rev') {
        // Motosierra al Cielo: rockstar wide stance, hoisting revving blade overhead!
        const vib = Math.sin(T * 1.9) * 0.06;
        torsoAngle = -0.16;
        headTilt = -0.14;
        hipY += 2.5;
        lThighA = 0.62;
        lKneeBend = 0.62;
        rThighA = -0.58;
        rKneeBend = 0.56;
        rArmA = lerp(-0.6, -2.42, intro) + vib;
        rElbowBend = -0.2;
        lArmA = lerp(0.6, -2.08, intro) - vib;
        lElbowBend = -0.35;
        weaponAngle = -0.35 + vib * 1.6;
        mouthOpen = 1;
        capeAngle = 0.52;
      } else if (style === 'boxing_champ') {
        // Champion Fighter Hop: rhythmic celebratory hop pumping both fists skyward!
        const hop = Math.abs(Math.sin(wt * 0.22));
        hipY -= hop * 6.5;
        torsoAngle = -0.08;
        lThighA = 0.42 + hop * 0.22;
        lKneeBend = 0.48 + hop * 0.42;
        rThighA = -0.38;
        rKneeBend = 0.44 + hop * 0.35;
        rArmA = -2.32 + Math.sin(wt * 0.22) * 0.24;
        rElbowBend = -0.35;
        lArmA = -2.18 - Math.sin(wt * 0.22) * 0.24;
        lElbowBend = -0.4;
        mouthOpen = hop > 0.45 ? 1 : 0;
        capeAngle = 0.48 + hop * 0.25;
      } else if (style === 'axe_shoulder') {
        // Warrior Axe-over-Shoulder Salute
        torsoAngle = -0.08;
        lThighA = 0.52;
        lKneeBend = 0.5;
        rThighA = -0.44;
        rKneeBend = 0.4;
        rArmA = lerp(-0.5, -1.48, intro);
        rElbowBend = -1.85;
        weaponAngle = lerp(-0.3, 1.18, intro);
        lArmA = lerp(0.8, -2.25, intro);
        lElbowBend = -0.22;
        capeAngle = 0.44;
        mouthOpen = wt < 22 ? 1 : 0;
      } else if (style === 'gavel_proclaim') {
        // Authoritative Verdict Slam -> Pointing Skyward
        const slam = wt < 16 ? wt / 16 : 1;
        if (wt < 16) {
          torsoAngle = 0.22;
          rArmA = lerp(-1.9, -0.95, slam);
          rElbowBend = -0.25;
          weaponAngle = 0.35;
        } else {
          const point = Math.min(1, (wt - 16) / 14);
          torsoAngle = lerp(0.22, -0.08, point);
          rArmA = lerp(-0.95, -2.15, point);
          rElbowBend = -0.1;
          weaponAngle = -0.55;
        }
        lArmA = 1.1;
        lElbowBend = -1.35;
        lThighA = 0.46;
        lKneeBend = 0.42;
        rThighA = -0.42;
        rKneeBend = 0.38;
        capeAngle = 0.4;
      } else if (style === 'tactical_salute') {
        // Sharp Military / Cyber Salute
        torsoAngle = -0.04;
        headTilt = -0.05;
        lThighA = 0.34;
        lKneeBend = 0.28;
        rThighA = -0.28;
        rKneeBend = 0.24;
        rArmA = lerp(-0.6, -1.72, intro);
        rElbowBend = lerp(-1.2, -1.95, intro);
        lArmA = 1.15;
        lElbowBend = -1.42;
        weaponAngle = -0.15;
        capeAngle = 0.35 + Math.sin(T * 0.12) * 0.12;
      } else {
        // Dignified Presidential Bow & Wave to the Plaza Crowd
        const wavePhase = Math.sin(wt * 0.16);
        torsoAngle = wt < 20 ? lerp(0, 0.26, wt / 20) : lerp(0.26, -0.04, Math.min(1, (wt - 20) / 18));
        lThighA = 0.32;
        lKneeBend = 0.26;
        rThighA = -0.26;
        rKneeBend = 0.24;
        rArmA = -2.15 + wavePhase * 0.22;
        rElbowBend = -0.45 + wavePhase * 0.15;
        lArmA = 0.85;
        lElbowBend = -1.55;
        capeAngle = 0.32;
      }
    }
    // 4. Floating Hover (Doctora Pulso / Staff Zoner) or Jump (Rise -> Apex -> Fast-Fall Descent)
    else if (!f.on && f.floating) {
      const hover = Math.sin(T * 0.22);
      hipY -= 2.5 + hover * 1.8;
      torsoAngle = -0.04 + hover * 0.03;
      lThighA = 0.28;
      lKneeBend = 0.72;
      rThighA = -0.22;
      rKneeBend = 0.64;
      lArmA = 0.78 + hover * 0.08;
      lElbowBend = -1.25;
      rArmA = -1.08 - hover * 0.06;
      rElbowBend = -0.68;
      weaponAngle = -0.1 + hover * 0.04;
      capeAngle = -0.45 + Math.sin(T * 0.26) * 0.18;
      eyeState = 'fierce';
    } else if (!f.on) {
      const rising = f.vy < -1.2;
      const apex = Math.abs(f.vy) <= 1.2;
      if (rising) {
        torsoAngle = 0.18;
        lThighA = 0.94;
        lKneeBend = 1.42;
        rThighA = -0.48;
        rKneeBend = 0.38;
        lArmA = -1.85;
        lElbowBend = -0.55;
        rArmA = -0.85;
        rElbowBend = -0.95;
        capeAngle = 0.68;
      } else if (apex) {
        torsoAngle = 0.08;
        lThighA = 0.75;
        lKneeBend = 1.25;
        rThighA = 0.36;
        rKneeBend = 1.1;
        lArmA = -1.98;
        rArmA = -1.08;
        capeAngle = 0.15;
      } else {
        torsoAngle = f.fastFall ? 0.26 : -0.1;
        lThighA = 0.38;
        lKneeBend = 0.68;
        rThighA = -0.26;
        rKneeBend = 0.86;
        lArmA = -2.28;
        lElbowBend = -0.48;
        rArmA = -1.4;
        rElbowBend = -0.85;
        capeAngle = f.fastFall ? -1.35 : -0.95;
      }
    }
    // 5. Landing Compression / Crouch
    else if (f.landT > 0 || f.crouch) {
      const depth = f.crouch ? 7.5 : Math.min(7.5, f.landT * 1.1);
      hipY += depth;
      torsoAngle = 0.24;
      lThighA = 0.78;
      lKneeBend = 1.32;
      rThighA = -0.58;
      rKneeBend = 1.1;
      lArmA = 0.85;
      lElbowBend = -1.25;
      rArmA = -0.52;
      rElbowBend = -1.35;
    }
    // 6. Heroic Walk / Run Gait
    else if (absVx > 0.3) {
      const isRun = absVx > 3.1;
      const runBlend = Math.max(0, Math.min(1, (absVx - 2.4) / 2.2));
      const freq = isRun ? 0.38 : 0.24;
      const phase = T * freq;
      const strideAmp = lerp(0.55, 0.98, runBlend);
      const bounce = Math.abs(Math.sin(phase)) * lerp(1.5, 4.2, runBlend);

      hipY -= bounce;
      torsoAngle = lerp(0.1, 0.32, runBlend);
      headTilt = -torsoAngle * 0.45;

      lThighA = Math.sin(phase) * strideAmp;
      lKneeBend = Math.max(0.16, -Math.cos(phase) * lerp(0.68, 1.24, runBlend) + 0.28);
      rThighA = Math.sin(phase + Math.PI) * strideAmp;
      rKneeBend = Math.max(0.16, -Math.cos(phase + Math.PI) * lerp(0.68, 1.24, runBlend) + 0.28);

      if (an.weaponType === 'saber' && f.wpn <= 0) {
        // Cavalry fencer sprint carry: saber trailed sleekly behind hip
        lArmA = lerp(0.88, 1.18, runBlend) + Math.sin(phase) * 0.14;
        lElbowBend = lerp(-1.15, -0.75, runBlend);
        rArmA = lerp(-0.4, 0.34, runBlend) + Math.sin(phase) * 0.12;
        rElbowBend = lerp(-0.85, -0.45, runBlend);
        weaponAngle = lerp(-0.24, 0.46, runBlend);
      } else if (an.weaponType === 'staff' && f.wpn <= 0) {
        lArmA = Math.sin(phase + Math.PI) * lerp(0.35, 0.72, runBlend) + 0.22;
        lElbowBend = -1.1;
        rArmA = -0.62 + Math.sin(phase) * 0.18;
        rElbowBend = -1.08;
        weaponAngle = -0.22 + Math.sin(phase) * 0.08;
      } else {
        lArmA = Math.sin(phase + Math.PI) * lerp(0.45, 0.92, runBlend) + 0.15;
        lElbowBend = lerp(-0.68, -1.15, runBlend);
        rArmA = Math.sin(phase) * lerp(0.4, 0.78, runBlend) - 0.12;
        rElbowBend = lerp(-0.88, -1.24, runBlend);
        weaponAngle = -0.15 + Math.sin(phase) * 0.12;
      }
      capeAngle = -lerp(0.28, 0.8, runBlend) + Math.sin(T * 0.28) * 0.16;
    }
    // 7. Classic Street Fighter II Idle Combat Stance (Semiflexed knees, Ryu/Ken high guard + breathing cape!)
    else {
      const breath = Math.sin(T * 0.1 + f.pi * 2);
      hipY += breath * 1.1;
      if (an.weaponType === 'saber' && f.wpn <= 0) {
        // Ryu/Ken-inspired Heroic Fencing Guard Stance
        torsoAngle = 0.05 + breath * 0.02;
        lThighA = 0.48;
        lKneeBend = 0.56;
        rThighA = -0.48;
        rKneeBend = 0.48;
        lArmA = 1.08 + breath * 0.06;
        lElbowBend = -1.32;
        rArmA = -0.78 - breath * 0.05;
        rElbowBend = -0.82;
        weaponAngle = -0.34 + breath * 0.03;
      } else if (an.weaponType === 'staff' && f.wpn <= 0) {
        // Mystic / Tech Poised Combat Stance with glowing staff held upright forward
        torsoAngle = 0.03 + breath * 0.02;
        hipY += Math.sin(T * 0.07) * 0.6;
        lThighA = 0.38;
        lKneeBend = 0.44;
        rThighA = -0.42;
        rKneeBend = 0.42;
        lArmA = 0.72 + breath * 0.06;
        lElbowBend = -1.35;
        rArmA = -0.86 - breath * 0.05;
        rElbowBend = -0.95;
        weaponAngle = -0.08 + breath * 0.03;
      } else {
        // Classic Ryu/Ken Martial Arts Guard
        torsoAngle = 0.08 + breath * 0.03;
        lThighA = 0.44;
        lKneeBend = 0.52;
        rThighA = -0.42;
        rKneeBend = 0.46;
        lArmA = 0.75 + breath * 0.07;
        lElbowBend = -1.38;
        rArmA = -0.68 - breath * 0.07;
        rElbowBend = -1.42;
        weaponAngle = -0.3 + breath * 0.04;
      }
      capeAngle = 0.16 + Math.sin(T * 0.09) * 0.1;
    }

    // 8. Combat Attacks (Light 3-hit combos, Saber Slashes, Hadouken Energy Waves, Signature Specials)
    if (f.atk && f.stun <= 0) {
      const { spec, t } = f.atk;
      const prog = t / Math.max(1, spec.dur);
      const activePh = spec.ph.find((p) => t >= p.a[0] && t <= p.a[1]);
      const isSaber = an.weaponType === 'saber' && f.wpn <= 0;
      const isStaff = an.weaponType === 'staff' && f.wpn <= 0;
      eyeState = 'fierce';

      if (spec.moveKind === 'upSpec') {
        // Soaring Recovery Up-Special (Rising Saber Vault / Arcane Staff Lift)
        mouthOpen = 1;
        const sw = Math.min(1, prog / 0.55);
        torsoAngle = lerp(0.24, -0.22, sw);
        lThighA = 0.95;
        lKneeBend = 1.25;
        rThighA = -0.4;
        rKneeBend = 0.45;
        rArmA = lerp(-0.5, -2.35, sw);
        rElbowBend = -0.08;
        lArmA = 1.15;
        lElbowBend = -0.45;
        weaponAngle = isStaff ? -0.15 : lerp(0.5, -0.65, sw);
        capeAngle = 0.85;
      } else if (spec.k === 'l') {
        const mk = spec.moveKind || 'jab';
        const hitStep = (f.jabStep ?? f.combo) % 3;
        if (mk === 'utilt' || mk === 'uair') {
          const sw = Math.min(1, prog / 0.55);
          mouthOpen = 1;
          torsoAngle = lerp(0.2, -0.18, sw);
          rArmA = lerp(-0.45, -2.25, sw);
          rElbowBend = -0.06;
          lArmA = 1.2;
          weaponAngle = lerp(0.35, -0.78, sw);
        } else if (mk === 'dtilt') {
          hipY += 8.2;
          torsoAngle = 0.34;
          rThighA = 1.22;
          rKneeBend = 0.14;
          lThighA = -0.88;
          lKneeBend = 0.72;
          rArmA = -1.2;
          rElbowBend = -0.08;
          weaponAngle = 0.24;
        } else if (mk === 'dair') {
          mouthOpen = 1;
          torsoAngle = 0.28;
          rArmA = -0.45;
          rElbowBend = -0.1;
          weaponAngle = 1.48;
        } else if (mk === 'bair') {
          mouthOpen = 1;
          torsoAngle = -0.36;
          lThighA = -1.28;
          lKneeBend = 0.12;
          rArmA = 0.92;
          rElbowBend = -0.15;
          weaponAngle = 2.8;
        } else if (mk === 'nair') {
          torsoAngle = Math.sin(prog * Math.PI * 2) * 0.25;
          rArmA = -1.65;
          rElbowBend = -0.08;
          lArmA = 1.45;
          lElbowBend = -0.1;
          weaponAngle = prog * Math.PI * 2;
        } else if (isSaber) {
          if (hitStep === 1 && mk === 'jab') {
            if (prog < 0.22) {
              torsoAngle = -0.14;
              rArmA = 0.34;
              rElbowBend = -1.72;
              lArmA = 1.18;
              lElbowBend = -1.1;
              weaponAngle = -0.05;
            } else {
              mouthOpen = 1;
              torsoAngle = 0.32;
              rThighA = 1.15;
              rKneeBend = 0.14;
              lThighA = -0.82;
              lKneeBend = 0.1;
              hipY += 4.2;
              rArmA = -1.56;
              rElbowBend = 0;
              lArmA = 1.38;
              lElbowBend = 0.08;
              weaponAngle = 0.02;
            }
          } else if (hitStep === 2 && mk === 'jab') {
            if (prog < 0.25) {
              torsoAngle = -0.18;
              rArmA = -2.24;
              rElbowBend = -0.38;
              lArmA = 0.96;
              lElbowBend = -1.1;
              weaponAngle = -0.68;
            } else {
              mouthOpen = 1;
              const sw = Math.min(1, (prog - 0.25) / 0.45);
              torsoAngle = lerp(-0.1, 0.38, sw);
              rArmA = lerp(-2.15, -0.58, sw);
              rElbowBend = -0.08;
              lArmA = 1.25;
              lElbowBend = -0.3;
              weaponAngle = lerp(-0.48, 0.48, sw);
            }
          } else {
            if (prog < 0.2) {
              torsoAngle = 0.28;
              rArmA = 0.54;
              rElbowBend = -0.32;
              weaponAngle = 0.7;
            } else {
              mouthOpen = 1;
              const sw = Math.min(1, (prog - 0.2) / 0.48);
              torsoAngle = lerp(0.24, -0.16, sw);
              rThighA = 0.94;
              rKneeBend = 0.25;
              lThighA = -0.68;
              lKneeBend = 0.22;
              rArmA = lerp(-0.4, -1.96, sw);
              rElbowBend = -0.06;
              lArmA = 1.32;
              lElbowBend = -0.15;
              weaponAngle = lerp(0.42, -0.44, sw);
            }
          }
        } else if (isStaff) {
          if (prog < 0.25) {
            torsoAngle = -0.15;
            rArmA = 0.45;
            rElbowBend = -1.45;
            weaponAngle = -0.45;
          } else {
            mouthOpen = 1;
            const sw = Math.min(1, (prog - 0.25) / 0.4);
            torsoAngle = lerp(-0.1, 0.36, sw);
            rArmA = lerp(0.3, -1.55, sw);
            rElbowBend = -0.1;
            lArmA = 1.25;
            lElbowBend = -0.4;
            weaponAngle = lerp(-0.35, 0.45, sw);
          }
        } else if (activePh) {
          mouthOpen = 1;
          if (hitStep === 1) {
            torsoAngle = 0.32;
            rArmA = -1.52;
            rElbowBend = -0.05;
            lArmA = 0.86;
            lElbowBend = -1.35;
            weaponAngle = 0;
          } else if (hitStep === 2) {
            torsoAngle = 0.44;
            lArmA = -1.56;
            lElbowBend = -0.06;
            rArmA = 0.92;
            rElbowBend = -1.4;
            weaponAngle = 0.14;
          } else {
            torsoAngle = -0.26;
            rThighA = 1.48;
            rKneeBend = 0.08;
            rArmA = -1.38;
            rElbowBend = -0.1;
            weaponAngle = 0.22;
          }
        } else if (prog < 0.35) {
          torsoAngle = -0.25;
          rArmA = 0.8;
          rElbowBend = -1.45;
        }
      } else {
        const sigType = f.d.signatureType;
        mouthOpen = prog > 0.2 || activePh ? 1 : 0;
        if (sigType === 'pulse') {
          // Iconic Street Fighter II Hadouken Pose: Gather energy at hip -> Double-palm / Staff forward thrust!
          if (prog < 0.28) {
            const g = prog / 0.28;
            torsoAngle = lerp(0.05, -0.22, g);
            hipY += 3.5 * g;
            lThighA = 0.56;
            lKneeBend = 0.72;
            rThighA = -0.56;
            rKneeBend = 0.64;
            rArmA = 0.75;
            rElbowBend = -1.85;
            lArmA = 0.55;
            lElbowBend = -1.75;
            weaponAngle = -0.55;
          } else {
            const thrust = Math.min(1, (prog - 0.28) / 0.22);
            torsoAngle = lerp(-0.18, 0.38, thrust);
            hipY += 4.5;
            lThighA = -0.68;
            lKneeBend = 0.32;
            rThighA = 0.88;
            rKneeBend = 0.64;
            rArmA = -1.55;
            rElbowBend = -0.06;
            lArmA = -1.45;
            lElbowBend = -0.08;
            weaponAngle = 0.05;
          }
        } else if (sigType === 'chainsaw') {
          torsoAngle = 0.48;
          rArmA = -1.35;
          rElbowBend = -0.35;
          lArmA = -1.05;
          lElbowBend = -0.5;
          weaponAngle = 0.05 + Math.sin(T * 1.8) * 0.08;
        } else if (sigType === 'fencing') {
          if (prog < 0.44) {
            const thrust = Math.min(1, prog / 0.18);
            torsoAngle = lerp(0.08, 0.44, thrust);
            hipY += 5.2 * thrust;
            rThighA = 1.22 * thrust;
            rKneeBend = 0.14;
            lThighA = -0.88 * thrust;
            lKneeBend = 0.08;
            rArmA = lerp(-0.5, -1.57, thrust);
            rElbowBend = lerp(-0.9, 0.0, thrust);
            lArmA = lerp(0.8, 1.42, thrust);
            lElbowBend = 0.1;
            weaponAngle = lerp(-0.2, 0.01, thrust);
          } else {
            const rip = Math.min(1, (prog - 0.44) / 0.36);
            torsoAngle = lerp(0.42, -0.12, rip);
            rThighA = 0.78;
            rKneeBend = 0.35;
            rArmA = lerp(-0.55, -2.02, rip);
            rElbowBend = -0.06;
            lArmA = 1.25;
            lElbowBend = -0.35;
            weaponAngle = lerp(0.55, -0.45, rip);
          }
        } else if (sigType === 'uppercut') {
          if (prog < 0.2) {
            torsoAngle = 0.32;
            hipY += 4.2;
            rArmA = 0.65;
            rElbowBend = -0.45;
            lArmA = 0.95;
            lElbowBend = -0.9;
            weaponAngle = 0.85;
          } else {
            const sp = Math.min(1, (prog - 0.2) / 0.42);
            torsoAngle = lerp(0.3, -0.22, sp);
            rArmA = lerp(0.35, -2.08, sp);
            rElbowBend = -0.08;
            lArmA = 1.22;
            lElbowBend = -0.45;
            weaponAngle = lerp(0.62, -0.48, sp);
            lThighA = 0.92;
            lKneeBend = 1.18;
          }
        } else if (sigType === 'tiger') {
          torsoAngle = activePh ? 0.55 : -0.2;
          rArmA = activePh ? -1.5 : 0.7;
          rElbowBend = activePh ? -0.1 : -1.2;
          lArmA = activePh ? -1.2 : 0.9;
          weaponAngle = activePh ? 0.25 : -0.8;
        } else if (sigType === 'quake') {
          torsoAngle = prog < 0.32 ? -0.35 : 0.55;
          rArmA = prog < 0.32 ? -2.7 : -0.85;
          rElbowBend = -0.2;
          weaponAngle = prog < 0.32 ? -1.5 : 0.65;
        } else if (sigType === 'breaker') {
          if (prog < 0.52) {
            torsoAngle = -0.25;
            hipY += 4.5;
            rArmA = 1.1;
            rElbowBend = -1.6;
            lArmA = -0.9;
            lElbowBend = -0.9;
          } else {
            torsoAngle = 0.52;
            rArmA = -1.52;
            rElbowBend = -0.04;
            lArmA = 1.1;
            lElbowBend = -1.1;
          }
        } else {
          torsoAngle = prog < 0.25 ? -0.15 : 0.24;
          rArmA = -1.45;
          rElbowBend = -0.15;
          lArmA = -1.1;
          lElbowBend = -0.3;
          weaponAngle = -0.2;
        }
      }
    }

    // Forward Kinematics Construction
    const pelvis: Vec2 = { x: 0, y: hipY };
    const chest: Vec2 = {
      x: pelvis.x + Math.sin(torsoAngle) * torsoH,
      y: pelvis.y - Math.cos(torsoAngle) * torsoH,
    };
    const neck: Vec2 = {
      x: chest.x + Math.sin(torsoAngle * 0.7) * (3.6 * hScale),
      y: chest.y - Math.cos(torsoAngle * 0.7) * (3.6 * hScale),
    };
    const head: Vec2 = {
      x: neck.x + Math.sin(torsoAngle * 0.4 + headTilt) * (7.2 * hScale),
      y: neck.y - Math.cos(torsoAngle * 0.4 + headTilt) * (7.2 * hScale),
    };

    const solveLegFK = (root: Vec2, a1: number, bend: number) => {
      const j1: Vec2 = { x: root.x + Math.sin(a1) * legUpper, y: root.y + Math.cos(a1) * legUpper };
      const a2 = a1 - bend;
      const j2: Vec2 = { x: j1.x + Math.sin(a2) * legLower, y: j1.y + Math.cos(a2) * legLower };
      return { j1, j2 };
    };

    const hipSpread = an.bodyBuild === 'lean' ? 3.0 : 3.8;
    const lHip: Vec2 = { x: pelvis.x - hipSpread, y: pelvis.y + 1.5 };
    const rHip: Vec2 = { x: pelvis.x + hipSpread, y: pelvis.y + 1.5 };
    const lLeg = solveLegFK(lHip, lThighA, lKneeBend);
    const rLeg = solveLegFK(rHip, rThighA, rKneeBend);

    const shSpread = an.shoulderWidth * 0.38;
    const lShoulder: Vec2 = { x: chest.x - shSpread, y: chest.y + 2.8 };
    const rShoulder: Vec2 = { x: chest.x + shSpread, y: chest.y + 2.8 };

    const solveArmFK = (root: Vec2, a1: number, bend: number) => {
      const j1: Vec2 = { x: root.x - Math.sin(a1) * armUpper, y: root.y + Math.cos(a1) * armUpper };
      const a2 = a1 + bend;
      const j2: Vec2 = { x: j1.x - Math.sin(a2) * armLower, y: j1.y + Math.cos(a2) * armLower };
      return { j1, j2 };
    };

    let lArm = solveArmFK(lShoulder, lArmA, lElbowBend);
    let rArm = solveArmFK(rShoulder, rArmA, rElbowBend);

    // 9. 2-Bone Analytical IK for Two-Handed Firearm Aiming, Recoil & Reloading
    if (f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket')) {
      if (f.reloadT > 0) {
        const rp = 1 - f.reloadT / Math.max(1, f.reloadDur);
        eyeState = 'fierce';
        headTilt = 0.25;
        weaponAngle = -0.58;

        const rTarget: Vec2 = { x: chest.x + 11.5, y: chest.y + 5.2 };
        const rIK = solveTwoBoneIK(rShoulder, rTarget, armUpper, armLower, 1);
        rArm = { j1: rIK.mid, j2: rIK.end };

        let lTarget: Vec2;
        if (rp < 0.35) {
          const k = rp / 0.35;
          lTarget = { x: lerp(chest.x + 12, pelvis.x - 4, k), y: lerp(chest.y + 4, pelvis.y + 2, k) };
        } else if (rp < 0.72) {
          const k = (rp - 0.35) / 0.37;
          lTarget = { x: lerp(pelvis.x - 4, rTarget.x + 8, k), y: lerp(pelvis.y + 2, rTarget.y - 2, k) };
        } else {
          const k = Math.sin(((rp - 0.72) / 0.28) * Math.PI);
          lTarget = { x: rTarget.x + (6 - k * 7), y: rTarget.y - 6 };
        }
        const lIK = solveTwoBoneIK(lShoulder, lTarget, armUpper, armLower, 1);
        lArm = { j1: lIK.mid, j2: lIK.end };
      } else {
        const kick = f.shootRecoil > 0 ? Math.min(1, f.shootRecoil / 5) : 0;
        torsoAngle -= kick * 0.14;
        weaponAngle = -kick * 0.18;
        eyeState = 'fierce';
        if (kick > 0.3) mouthOpen = 1;

        const rTarget: Vec2 = { x: chest.x + (15 - kick * 5), y: chest.y + (5 - kick * 2.4) };
        const lTarget: Vec2 = { x: chest.x + (24 - kick * 4.4), y: chest.y + (4.5 - kick * 2.8) };
        const rIK = solveTwoBoneIK(rShoulder, rTarget, armUpper, armLower, 1);
        const lIK = solveTwoBoneIK(lShoulder, lTarget, armUpper, armLower, 1);
        rArm = { j1: rIK.mid, j2: rIK.end };
        lArm = { j1: lIK.mid, j2: lIK.end };
      }
    }

    const flip = (v: Vec2): Vec2 => ({ x: v.x * dir, y: v.y });

    return {
      pelvis: flip(pelvis),
      chest: flip(chest),
      neck: flip(neck),
      head: flip(head),
      lShoulder: flip(lShoulder),
      lElbow: flip(lArm.j1),
      lHand: flip(lArm.j2),
      rShoulder: flip(rShoulder),
      rElbow: flip(rArm.j1),
      rHand: flip(rArm.j2),
      lHip: flip(lHip),
      lKnee: flip(lLeg.j1),
      lFoot: flip(lLeg.j2),
      rHip: flip(rHip),
      rKnee: flip(rLeg.j1),
      rFoot: flip(rLeg.j2),
      weaponAngle,
      capeAngle,
      eyeState,
      mouthOpen,
      torsoAngle: torsoAngle * dir,
      headTilt: headTilt * dir,
    };
  }

  protected solveBlendedPose(f: RenderFighterState, T: number, memKey?: number): JointPose {
    const target = this.computeTargetPose(f, T);
    if (memKey === undefined) return target;
    const prev = this.poseMemory.get(memKey);
    if (!prev || f.dashT > 0 || f.stun > 0) {
      this.poseMemory.set(memKey, target);
      return target;
    }
    const alpha = 0.45;
    const blended: JointPose = {
      pelvis: lerpVec(prev.pelvis, target.pelvis, alpha),
      chest: lerpVec(prev.chest, target.chest, alpha),
      neck: lerpVec(prev.neck, target.neck, alpha),
      head: lerpVec(prev.head, target.head, alpha),
      lShoulder: lerpVec(prev.lShoulder, target.lShoulder, alpha),
      lElbow: lerpVec(prev.lElbow, target.lElbow, alpha),
      lHand: lerpVec(prev.lHand, target.lHand, alpha),
      rShoulder: lerpVec(prev.rShoulder, target.rShoulder, alpha),
      rElbow: lerpVec(prev.rElbow, target.rElbow, alpha),
      rHand: lerpVec(prev.rHand, target.rHand, alpha),
      lHip: lerpVec(prev.lHip, target.lHip, alpha),
      lKnee: lerpVec(prev.lKnee, target.lKnee, alpha),
      lFoot: lerpVec(prev.lFoot, target.lFoot, alpha),
      rHip: lerpVec(prev.rHip, target.rHip, alpha),
      rKnee: lerpVec(prev.rKnee, target.rKnee, alpha),
      rFoot: lerpVec(prev.rFoot, target.rFoot, alpha),
      weaponAngle: lerp(prev.weaponAngle, target.weaponAngle, alpha),
      capeAngle: lerp(prev.capeAngle, target.capeAngle, alpha),
      eyeState: target.eyeState,
      mouthOpen: target.mouthOpen,
      torsoAngle: lerp(prev.torsoAngle, target.torsoAngle, alpha),
      headTilt: lerp(prev.headTilt, target.headTilt, alpha),
    };
    this.poseMemory.set(memKey, blended);
    return blended;
  }

  // Rasterize Flowing Pleated Cape with 16-bit Bayer Halftone Folds
  private rasterFlowingCape(
    ras: CpsSpriteRasterizer,
    chestX: number,
    chestY: number,
    pose: JointPose,
    f: RenderFighterState,
    T: number,
    isFlash: boolean
  ) {
    const an = f.d.anatomy;
    if (!an.hasCapeOrCoat || !an.capeColor) return;
    const ramp = getCpsRamp(an.capeColor);
    const capeLen = 36 * an.heightScale;
    const dir = f.face;
    const swayBase = Math.abs(Math.sin(pose.capeAngle)) * capeLen + 7;
    const dropY = Math.max(18, Math.cos(pose.capeAngle) * capeLen);

    const rows = Math.ceil(dropY);
    for (let r = 0; r <= rows; r++) {
      const v = r / Math.max(1, rows); // 0 at shoulders, 1 at trailing hem
      const wave = Math.sin(T * 0.19 - v * 4.2 + f.pi) * (2.6 * v + 0.6);
      const flutter = Math.cos(T * 0.31 - v * 6.5) * (1.2 * v);
      const py = Math.round(chestY + 2 + r);

      const frontEdge = chestX - dir * (2 + v * 3) + wave * 0.35;
      const backEdge = chestX - dir * (7 + v * swayBase) + wave + flutter;
      const xStart = Math.min(frontEdge, backEdge);
      const xEnd = Math.max(frontEdge, backEdge);
      const span = Math.max(1, xEnd - xStart);

      for (let px = Math.round(xStart); px <= Math.round(xEnd); px++) {
        const u = (px - xStart) / span; // 0..1 across cape width
        // 3 cloth folds with sunlit crests and deep shadow valleys
        const fold = Math.sin(u * Math.PI * 3.1 + T * 0.14 - v * 2.2);
        const lum = clamp(0.45 + fold * 0.34 - v * 0.16 + (1 - u) * 0.12, 0.04, 0.96);
        ras.setPx(px, py, ras.pickDitheredTone(px, py, lum, ramp, isFlash, 0.72));
      }
    }
  }

  // Sculpted Heroic Torso with Pectorals / Tailored Blazer, Epaulets, Lapels, Sash & Belt
  private rasterSculptedTorso(
    ras: CpsSpriteRasterizer,
    pose: JointPose,
    f: RenderFighterState,
    isFlash: boolean
  ) {
    const an = f.d.anatomy;
    const p = f.d.palette;
    const dir = f.face;
    const suitRamp = getCpsRamp(p.suit.base);
    const accentRamp = getCpsRamp(p.accent.base);
    const shirtRamp = getCpsRamp('#eef2ff');
    const goldRamp = getCpsRamp('#f5c63b');
    const leatherRamp = getCpsRamp('#3a2618');

    const px0 = ANCHOR_X + pose.pelvis.x;
    const py0 = ANCHOR_Y + pose.pelvis.y;
    const cosA = Math.cos(pose.torsoAngle);
    const sinA = Math.sin(pose.torsoAngle);

    const tH = Math.round(23.5 * an.heightScale);
    const shHalf = an.shoulderWidth * 0.56;
    const chestHalf = an.chestWidth * 0.52;
    const waistHalf = an.waistWidth * (an.bodyBuild === 'lean' ? 0.38 : 0.44);
    const hipHalf = an.waistWidth * (an.bodyBuild === 'lean' ? 0.5 : 0.49);

    for (let ry = 0; ry <= tH; ry++) {
      const v = 1 - ry / Math.max(1, tH); // 0 = pelvis/belt, 1 = shoulders
      let halfW: number;
      if (v < 0.28) {
        halfW = lerp(hipHalf, waistHalf, v / 0.28);
      } else if (v < 0.76) {
        halfW = lerp(waistHalf, chestHalf, (v - 0.28) / 0.48);
      } else {
        halfW = lerp(chestHalf, shHalf, (v - 0.76) / 0.24);
      }

      const steps = Math.ceil(halfW * 2) + 2;
      for (let sx = -steps; sx <= steps; sx++) {
        const lx = (sx / Math.max(1, steps)) * halfW;
        const ly = -ry;
        const wx = Math.round(px0 + lx * cosA - ly * sinA);
        const wy = Math.round(py0 + lx * sinA + ly * cosA);
        const u = lx / Math.max(0.5, halfW); // -1..1 across torso

        if (isFlash) {
          ras.setPx(wx, wy, 0xffffffff);
          continue;
        }

        // Anatomical shading: front-facing pectoral shelf + vertical rib/coat folds + shaded side
        const frontBias = u * dir; // +1 toward front facing side, -1 toward back
        const pecShelf = v > 0.52 && v < 0.82 ? Math.sin(((v - 0.52) / 0.3) * Math.PI) * 0.22 : 0;
        const centerLine = Math.abs(u - dir * 0.14) < 0.09 ? -0.18 : 0;
        const lum = clamp(0.45 + frontBias * 0.32 + pecShelf + centerLine + (v - 0.3) * 0.16, 0.04, 0.98);

        let col32 = ras.pickDitheredTone(wx, wy, lum, suitRamp, false, 0.65);

        // Waist Belt + Gold Buckle
        if (v >= 0.08 && v <= 0.18) {
          const isBuckle = Math.abs(u - dir * 0.22) < 0.22;
          col32 = ras.pickDitheredTone(wx, wy, isBuckle ? 0.85 : 0.32, isBuckle ? goldRamp : leatherRamp, false, 0.4);
        }

        // Outfit Style Details
        if (an.outfitStyle === 'gala') {
          // White dress shirt V-opening at chest
          if (v > 0.64 && Math.abs(u - dir * 0.18) < (v - 0.62) * 0.72) {
            col32 = ras.pickDitheredTone(wx, wy, 0.72 + frontBias * 0.2, shirtRamp, false, 0.45);
          }
          // Double-breasted brass buttons
          if (v > 0.24 && v < 0.66 && ry % 4 === 0 && Math.abs(Math.abs(u - dir * 0.16) - 0.24) < 0.1) {
            col32 = goldRamp[0];
          }
          // Sculpted Gold Fringed Shoulder Epaulets
          if (v > 0.84 && Math.abs(u) > 0.56) {
            const epLum = clamp(0.62 + (v - 0.84) * 2.2, 0.2, 0.98);
            col32 = ras.pickDitheredTone(wx, wy, epLum, goldRamp, false, 0.5);
          }
        } else if (an.outfitStyle === 'tactical' || an.outfitStyle === 'armored') {
          // Tactical Armored Chest Rig
          if (v > 0.34 && v < 0.86 && Math.abs(u) < 0.78) {
            const plateLum = clamp(lum - 0.12 + (v > 0.78 ? 0.28 : 0), 0.05, 0.95);
            col32 = ras.pickDitheredTone(wx, wy, plateLum, suitRamp, false, 0.55);
            if (Math.abs(u - dir * 0.28) < 0.12 && v > 0.55 && v < 0.7) {
              col32 = accentRamp[1];
            }
          }
        } else {
          // Tailored Presidential / Executive Suit Collar & Tie/Sash
          if (v > 0.6 && Math.abs(u - dir * 0.2) < (v - 0.58) * 0.85) {
            col32 = ras.pickDitheredTone(wx, wy, 0.78 + frontBias * 0.15, shirtRamp, false, 0.4);
          }
          // Blazer Lapel highlight
          if (v > 0.52 && Math.abs(Math.abs(u - dir * 0.2) - (v - 0.52) * 0.9) < 0.14) {
            col32 = ras.pickDitheredTone(wx, wy, 0.82, suitRamp, false, 0.4);
          }
        }

        // Presidential Sash or Necktie
        if (an.tieOrSash === 'tricolor_sash' || an.tieOrSash === 'gold_sash' || an.tieOrSash === 'medal_sash') {
          const diag = u - (v - 0.5) * dir * 1.45;
          if (v > 0.2 && v < 0.94 && Math.abs(diag) < 0.19) {
            const sashRamp = an.tieOrSash === 'gold_sash' ? goldRamp : accentRamp;
            col32 = ras.pickDitheredTone(wx, wy, 0.72 + frontBias * 0.15, sashRamp, false, 0.45);
          }
        } else if (an.tieOrSash !== 'tactical' && v > 0.25 && v < 0.86 && Math.abs(u - dir * 0.2) < 0.12) {
          col32 = ras.pickDitheredTone(wx, wy, 0.65 + frontBias * 0.2, accentRamp, false, 0.4);
        }

        ras.setPx(wx, wy, col32);
      }
    }

    // Side Holster
    if (!isFlash && an.holster) {
      const hx = Math.round(px0 - dir * (hipHalf * 0.85));
      const hy = Math.round(py0 + 1);
      ras.fillRectPx(hx - 1, hy, 3, 5, leatherRamp[2]);
      ras.setPx(hx, hy + 1, goldRamp[1]);
    }
  }

  // Heroic Sculpted 16-Bit Head, Chiseled Jaw, Expressive Face & Hair/Headgear
  private rasterHeroicHead(
    ras: CpsSpriteRasterizer,
    pose: JointPose,
    f: RenderFighterState,
    T: number,
    isFlash: boolean
  ) {
    const an = f.d.anatomy;
    const p = f.d.palette;
    const faceCfg = an.face;
    const dir = f.face;

    const skinRamp = getCpsRamp(p.skin.base);
    const hairRamp = getCpsRamp(p.hair);
    const accentRamp = getCpsRamp(p.accent.base);
    const white32 = packRgba(248, 250, 252);
    const eyeCol = packRgba(...parseHexRgb(faceCfg.eyeColor));

    // Muscular neck column
    const nx = ANCHOR_X + pose.neck.x;
    const ny = ANCHOR_Y + pose.neck.y;
    ras.fillMuscleLimb(nx, ny + 4, ANCHOR_X + pose.head.x, ANCHOR_Y + pose.head.y + 3, 2.8, 2.4, 'uniform', skinRamp, isFlash, dir);

    const hx = Math.round(ANCHOR_X + pose.head.x);
    const hy = Math.round(ANCHOR_Y + pose.head.y);
    const rx = faceCfg.faceShape === 'broad' ? 5.6 : faceCfg.faceShape === 'oval' ? 4.6 : 5.1;
    const ry = 6.0; // ~12px heroic head height on ~76px fighter (~6.5 heads tall!)

    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      const vn = dy / ry; // -1 crown .. +1 chin
      // Chiseled jawline taper below cheek level
      const jawFactor = vn > 0.25 ? 1 - (vn - 0.25) * (faceCfg.faceShape === 'angular' ? 0.56 : faceCfg.faceShape === 'square' ? 0.28 : 0.44) : 1;
      const rowRx = rx * Math.sqrt(Math.max(0.05, 1 - vn * vn * 0.72)) * jawFactor;

      for (let dx = -Math.ceil(rowRx); dx <= Math.ceil(rowRx); dx++) {
        const px = hx + dx;
        const py = hy + dy;
        if (isFlash) {
          ras.setPx(px, py, 0xffffffff);
          continue;
        }
        const un = dx / Math.max(1, rowRx);
        // Cheekbone highlight + brow shadow + chin contour
        const browShade = vn > -0.25 && vn < -0.05 && un * dir > 0.1 ? -0.22 : 0;
        const cheekHi = vn >= -0.05 && vn < 0.35 && un * dir > 0.05 ? 0.18 : 0;
        const lum = clamp(0.54 + un * dir * 0.26 - vn * 0.14 + browShade + cheekHi, 0.06, 0.98);
        ras.setPx(px, py, ras.pickDitheredTone(px, py, lum, skinRamp, false, 0.52));
      }
    }

    if (isFlash) return;

    // Ear & Cheek Contour
    ras.setPx(hx - dir * Math.round(rx * 0.65), hy, skinRamp[2]);
    ras.setPx(hx - dir * Math.round(rx * 0.65), hy + 1, skinRamp[3]);

    // Eyes, Eyebrows & Glasses/Visor
    const ex = Math.round(hx + dir * 2.0);
    const ey = Math.round(hy - 1.0);
    if (pose.eyeState === 'blink') {
      ras.fillRectPx(ex - (dir > 0 ? 0 : 2), ey, 3, 1, skinRamp[4]);
    } else if (pose.eyeState === 'hurt') {
      ras.setPx(ex, ey - 1, skinRamp[4]);
      ras.setPx(ex + dir, ey, skinRamp[4]);
      ras.setPx(ex, ey + 1, skinRamp[4]);
    } else if (faceCfg.eyeStyle === 'shades' || an.glasses) {
      ras.fillRectPx(ex - 1, ey - 1, 4, 2, packRgba(14, 18, 28));
      ras.setPx(ex + dir, ey - 1, packRgba(125, 211, 252));
    } else if (faceCfg.eyeStyle === 'visor') {
      ras.fillRectPx(ex - 1, ey - 1, 5, 2, packRgba(239, 68, 68));
      ras.fillRectPx(ex, ey - 1, 2, 1, packRgba(255, 243, 160));
    } else {
      ras.setPx(ex, ey, white32);
      ras.setPx(ex + dir, ey, eyeCol);
      // Expressive fierce CPS-1 brow ridge
      const browTilt = pose.eyeState === 'fierce' || faceCfg.eyeStyle === 'sharp' ? 1 : 0;
      ras.setPx(ex - dir, ey - 1 - browTilt, hairRamp[3]);
      ras.setPx(ex, ey - 1, hairRamp[3]);
      ras.setPx(ex + dir, ey - 1 + (browTilt ? 0 : 0), hairRamp[2]);
    }

    // Sculpted Nose
    ras.setPx(Math.round(hx + dir * (rx * 0.85)), hy + 1, skinRamp[2]);
    if (faceCfg.noseStyle === 'aquiline' || faceCfg.noseStyle === 'broad') {
      ras.setPx(Math.round(hx + dir * (rx * 0.72)), hy + 2, skinRamp[3]);
    }

    // Facial Hair (Stubble / Mustache / Goatee / Full Beard with Bayer shading)
    if (faceCfg.facialHair === 'stubble') {
      for (let py = hy + 2; py <= hy + 5; py++) {
        for (let px = hx - 3; px <= hx + 3; px++) {
          if ((px - hx) * dir >= -1 && ((px + py) & 1) === 0) {
            ras.setPx(px, py, hairRamp[2]);
          }
        }
      }
    } else if (faceCfg.facialHair === 'mustache') {
      ras.fillRectPx(hx + dir * 1 - 1, hy + 2, 4, 1, hairRamp[2]);
      ras.setPx(hx + dir * 3, hy + 2, hairRamp[3]);
    } else if (faceCfg.facialHair === 'goatee') {
      ras.fillRectPx(hx + dir * 1 - 1, hy + 2, 3, 4, hairRamp[2]);
      ras.setPx(hx + dir * 2, hy + 5, hairRamp[3]);
    } else if (faceCfg.facialHair === 'full_beard') {
      for (let py = hy + 1; py <= hy + 6; py++) {
        for (let px = hx - 4; px <= hx + 4; px++) {
          if (Math.abs(px - hx) <= (py > hy + 4 ? 3 : 4)) {
            ras.setPx(px, py, ras.pickDitheredTone(px, py, 0.35 + (px - hx) * dir * 0.1, hairRamp, false, 0.6));
          }
        }
      }
    }

    // Mouth / Battle Cry
    const mx = Math.round(hx + dir * 2.0);
    const my = hy + 3;
    if (pose.mouthOpen || faceCfg.mouthStyle === 'fierce') {
      ras.fillRectPx(mx - 1, my, 3, 2, packRgba(110, 22, 26));
      ras.setPx(mx, my, white32);
    } else {
      ras.fillRectPx(mx - 1, my, 2, 1, skinRamp[3]);
    }

    // Hair & Iconic 16-Bit Headgear
    const hat = an.hatOrHair;
    if (hat === 'tophat') {
      const topR = getCpsRamp('#232634');
      ras.fillRectPx(hx - 7, hy - 5, 14, 2, topR[2]);
      for (let py = hy - 14; py <= hy - 5; py++) {
        for (let px = hx - 4; px <= hx + 4; px++) {
          const lum = py === hy - 7 ? 0.5 : 0.45 + ((px - hx) * dir) * 0.12;
          ras.setPx(px, py, py === hy - 7 ? accentRamp[1] : ras.pickDitheredTone(px, py, lum, topR, false, 0.5));
        }
      }
    } else if (hat === 'fedora') {
      const fedR = getCpsRamp('#dfd5bc');
      ras.fillRectPx(hx - 7, hy - 4, 14, 2, fedR[1]);
      ras.fillRectPx(hx - 4, hy - 8, 8, 4, fedR[0]);
      ras.fillRectPx(hx - 4, hy - 5, 8, 1, packRgba(150, 36, 36));
    } else if (hat === 'beret') {
      ras.fillRectPx(hx - 6, hy - 7, 11, 3, accentRamp[1]);
      ras.fillRectPx(hx - 5, hy - 8, 9, 2, accentRamp[0]);
      ras.setPx(hx + dir * 2, hy - 6, packRgba(255, 210, 63));
    } else if (hat === 'cap') {
      const capR = getCpsRamp('#dce2ee');
      ras.fillRectPx(hx - 5, hy - 7, 10, 3, capR[1]);
      ras.fillRectPx(hx + (dir > 0 ? 1 : -7), hy - 5, 7, 1, capR[2]);
    } else if (hat === 'helmet') {
      const helmR = getCpsRamp('#3a485e');
      for (let py = hy - 7; py <= hy - 2; py++) {
        for (let px = hx - 6; px <= hx + 6; px++) {
          ras.setPx(px, py, ras.pickDitheredTone(px, py, 0.55 + ((px - hx) * dir) * 0.1, helmR, false, 0.5));
        }
      }
    } else {
      // Hairstyles (Pompadour, Wild Spikes, Heroic Flowing Locks, Ponytail, Grey Veteran)
      const sway = Math.round(Math.sin(T * 0.16 + f.pi) * 1.2);
      for (let py = hy - 7; py <= hy - 2; py++) {
        for (let px = hx - 5; px <= hx + 5; px++) {
          if (py === hy - 7 && Math.abs(px - hx) > 3) continue;
          const lum = clamp(0.52 + ((px - hx) * dir) * 0.14 - (py - (hy - 7)) * 0.08, 0.1, 0.95);
          ras.setPx(px, py, ras.pickDitheredTone(px, py, lum, hairRamp, false, 0.6));
        }
      }
      // Side locks / temple hair
      ras.fillRectPx(hx - dir * 4, hy - 2, 2, 5, hairRamp[2]);
      if (hat === 'wild') {
        for (let k = -2; k <= 2; k++) {
          ras.fillRectPx(hx + k * 2 - 1, hy - 9 - (k & 1) * 2, 2, 3, hairRamp[0]);
        }
      } else if (hat === 'ponytail') {
        // Flowing dynamic ponytail trailing behind head!
        for (let i = 0; i < 9; i++) {
          const tx = Math.round(hx - dir * (5 + i * 0.65) + sway * (i / 8));
          const ty = hy - 3 + i;
          ras.fillRectPx(tx - 1, ty, 3, 2, i < 4 ? hairRamp[1] : hairRamp[2]);
        }
      } else if (hat === 'bicorne_hair') {
        // Swept heroic bangs + period sideburns
        ras.fillRectPx(hx + dir * 2, hy - 7, 4, 2, hairRamp[0]);
        ras.fillRectPx(hx - dir * 5, hy - 2, 2, 6, hairRamp[2]);
      } else if (hat === 'combover') {
        ras.fillRectPx(hx - 4 + dir * 2, hy - 8, 8, 2, hairRamp[0]);
      } else if (hat === 'grey_short') {
        ras.fillRectPx(hx - 4, hy - 4, 3, 1, packRgba(240, 244, 248));
      }
    }
  }

  // Detailed 16-Bit CPS-1 Weapons + Saber Crescent Trails + Staff Energy Orb
  private rasterDetailedWeapon(
    ras: CpsSpriteRasterizer,
    f: RenderFighterState,
    hx: number,
    hy: number,
    angle: number,
    T: number,
    isFlash: boolean
  ) {
    const type = f.wpn > 0 && (f.wk === 'mg' || f.wk === 'rocket' || f.wk === 'case') ? f.wk : f.d.anatomy.weaponType;
    const dir = f.face;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Transform local weapon space (wx forward, wy up/down) -> sprite pixels
    const plotLocal = (lx: number, ly: number, col32: number, isGlow = false) => {
      const rx = (lx * cosA - ly * sinA) * dir;
      const ry = lx * sinA + ly * cosA;
      ras.setPx(Math.round(hx + rx), Math.round(hy + ry), col32, isGlow);
    };

    const rectLocal = (x0: number, y0: number, w: number, h: number, col32: number, isGlow = false) => {
      const stepsX = Math.max(1, Math.ceil(w * 1.6));
      const stepsY = Math.max(1, Math.ceil(h * 1.6));
      for (let ix = 0; ix <= stepsX; ix++) {
        for (let iy = 0; iy <= stepsY; iy++) {
          plotLocal(x0 + (ix / stepsX) * w, y0 + (iy / stepsY) * h, isGlow ? col32 : isFlash ? 0xffffffff : col32, isGlow);
        }
      }
    };

    const goldR = getCpsRamp('#f7d046');
    const steelR = getCpsRamp('#dce4f0');
    const woodR = getCpsRamp('#7c4a26');

    if (type === 'saber') {
      // Heroic Silver Cavalry Saber with Gold Hilt & D-Guard
      rectLocal(-4, -1.5, 4, 3, goldR[2]); // grip
      rectLocal(-5.5, -2.2, 2, 4.4, goldR[0]); // pommel
      rectLocal(0, -4.2, 2.2, 8.4, goldR[0]); // crossguard
      rectLocal(-3, 2.2, 4.5, 1.5, goldR[1]); // knuckle-bow D-guard

      // Gently curved 26px tapered silver blade
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const curveY = -Math.pow(t, 1.8) * 3.2;
        const bladeW = t > 0.85 ? 1.5 : 2.6 - t * 0.6;
        plotLocal(2 + i, curveY - bladeW * 0.5, isFlash ? 0xffffffff : steelR[0]); // bright white edge
        plotLocal(2 + i, curveY, isFlash ? 0xffffffff : steelR[1]); // silver fuller
        plotLocal(2 + i, curveY + bladeW * 0.45, isFlash ? 0xffffffff : steelR[2]); // dark steel spine
      }
      plotLocal(29, -3.6, isFlash ? 0xffffffff : packRgba(255, 255, 255));

      // Glowing Pixel Crescent Light-Slash Arc during Active Saber Attacks!
      if (f.atk && !isFlash) {
        const activePh = f.atk.spec.ph.some((p) => f.atk!.t >= p.a[0] && f.atk!.t <= p.a[1]);
        if (activePh) {
          const arcColOuter = packRgba(...parseHexRgb(f.d.palette.accent.highlight || '#ffe066'));
          const arcColMid = packRgba(125, 211, 252);
          const arcColCore = packRgba(255, 255, 255);
          for (let a = -0.88; a <= 0.72; a += 0.04) {
            const rad1 = 28;
            const rad2 = 30.5;
            const rad3 = 32.5;
            plotLocal(2 + Math.cos(a) * rad1, Math.sin(a) * rad1, arcColOuter, true);
            plotLocal(2 + Math.cos(a) * rad2, Math.sin(a) * rad2, arcColMid, true);
            plotLocal(2 + Math.cos(a) * rad3, Math.sin(a) * rad3, arcColCore, true);
          }
        }
      }
    } else if (type === 'staff') {
      // Purple Mystic/Tech Staff with Glowing Emerald Energy Orb
      const staffR = getCpsRamp('#7b4ce2');
      const orbBase = parseHexRgb(f.d.palette.accent.base || '#18d48c');
      const orbHi = parseHexRgb(f.d.palette.accent.highlight || '#98ffe0');

      // Carved purple staff shaft
      rectLocal(-1.2, -20, 2.4, 38, staffR[1]);
      rectLocal(-1.2, -20, 1.0, 38, staffR[0]);
      // Gold/Silver cradle rings & prongs
      rectLocal(-2.2, -22, 4.4, 2.5, goldR[0]);
      rectLocal(-3.2, -26, 1.4, 4, staffR[0]);
      rectLocal(1.8, -26, 1.4, 4, staffR[0]);

      // Pulsing Multi-Ring Glowing Energy Orb at Tip (-26)
      const pulse = Math.sin(T * 0.25) * 0.7;
      const orbR = 4.6 + pulse * 0.6;
      for (let oy = -6; oy <= 6; oy++) {
        for (let ox = -6; ox <= 6; ox++) {
          const dist = Math.hypot(ox, oy);
          if (dist <= orbR) {
            let col32: number;
            if (dist < 1.6) col32 = packRgba(255, 255, 255);
            else if (dist < 2.9) col32 = packRgba(...orbHi);
            else col32 = packRgba(...orbBase);
            plotLocal(ox, -27 + oy, col32, true);
          }
        }
      }
      // Orbiting arcane sparks
      const sa = T * 0.22;
      plotLocal(Math.cos(sa) * 7, -27 + Math.sin(sa) * 5, packRgba(255, 255, 255), true);
      plotLocal(Math.cos(sa + 3.14) * 7, -27 + Math.sin(sa + 3.14) * 5, packRgba(...orbHi), true);
    } else if (type === 'mg') {
      const gunR = getCpsRamp('#4c566a');
      rectLocal(-8, -2, 6, 4, woodR[1]); // stock
      rectLocal(-2, -3.5, 18, 5, gunR[1]); // receiver
      rectLocal(15, -2.5, 12, 2.5, gunR[2]); // barrel
      rectLocal(25, -3.5, 3, 4.5, steelR[0]); // muzzle brake
      if (f.reloadT <= 0) rectLocal(3, 1.5, 5, 6, goldR[1]); // curved mag
    } else if (type === 'rocket') {
      const odR = getCpsRamp('#49683d');
      rectLocal(-10, -4, 30, 7, odR[1]);
      rectLocal(-10, -4, 30, 2, odR[0]);
      if (f.reloadT <= 0) rectLocal(19, -4.5, 5, 8, packRgba(224, 66, 45));
    } else if (type === 'case') {
      const caseR = getCpsRamp('#2b3040');
      rectLocal(-2, -6, 14, 10, caseR[1]);
      rectLocal(3, -1, 4, 3, goldR[0]);
    } else if (type === 'chainsaw') {
      const vib = Math.sin(T * 1.9);
      const redR = getCpsRamp('#c92a2a');
      rectLocal(-3, -5 + vib, 12, 8, redR[1]);
      rectLocal(9, -3.5 + vib, 20, 5, steelR[1]);
      for (let k = 0; k < 5; k++) {
        const tx = 10 + ((k * 4 + (T % 4)) % 18);
        plotLocal(tx, -5 + vib, steelR[0]);
        plotLocal(tx, 2 + vib, steelR[0]);
      }
    } else if (type === 'axe') {
      rectLocal(-1.5, -18, 3, 30, woodR[1]);
      rectLocal(1.5, -19, 9, 10, steelR[2]);
      rectLocal(9, -20, 3, 12, steelR[0]);
    } else if (type === 'gavel') {
      rectLocal(-1.5, -14, 3, 22, woodR[1]);
      rectLocal(-5, -20, 12, 7, woodR[0]);
      rectLocal(-5, -20, 3, 7, goldR[0]);
      rectLocal(4, -20, 3, 7, goldR[0]);
    } else if (type === 'baton') {
      const batR = getCpsRamp('#222a38');
      rectLocal(-1.5, -15, 3, 20, batR[1]);
      rectLocal(-1.5, -15, 3, 4, packRgba(96, 165, 250), true);
    } else if (type === 'claws') {
      rectLocal(0, -3, 11, 2, goldR[0]);
      rectLocal(0, 0, 12, 2, goldR[0]);
      rectLocal(0, 3, 11, 2, goldR[0]);
    } else if (type === 'gloves') {
      const glR = getCpsRamp('#cf2525');
      rectLocal(-2, -5, 10, 9, glR[1]);
      rectLocal(-2, -5, 5, 4, glR[0]);
      rectLocal(-4, -3, 3, 5, goldR[0]);
    }
  }

  protected drawAtlasEquipment(ctx: CanvasRenderingContext2D, f: RenderFighterState, T: number, scale: number) {
    const ras = this.spriteRas;
    const reload = f.reloadT > 0 ? Math.sin(Math.PI * f.reloadT / Math.max(1, f.reloadDur)) : 0;
    const recoil = Math.min(1, f.shootRecoil / 5);
    const stride = f.on && Math.abs(f.vx) > 0.45 ? Math.sin(T * 0.5) * 3 : 0;
    const reach = f.pickupT ? Math.min(1, f.pickupT / 9) : 0;
    const handX = 13 - recoil * 4;
    const handY = (f.wk === 'case' ? -37 : -51) + reload * 10 + reach * 21 + stride;
    ras.clear();
    this.rasterDetailedWeapon(ras, f, ANCHOR_X + handX * f.face, ANCHOR_Y + handY,
      0.68 * reload + 0.3 * reach - 0.24 * recoil, T, false);
    ras.applyChromaticOutline(true);
    ras.flushToContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ras.canvas, -ANCHOR_X * scale, -ANCHOR_Y * scale, SPR_W * scale, SPR_H * scale);
  }

  protected rasterBody(f:RenderFighterState, pose:JointPose, T:number, isFlash:boolean, bodyOnly:boolean) {
    const p=f.d.palette, an=f.d.anatomy;
    const ras = this.spriteRas;
    ras.clear();

    const suitRamp = getCpsRamp(p.suit.base);
    const skinRamp = getCpsRamp(p.skin.base);
    const pantsRamp = getCpsRamp(an.outfitStyle === 'tactical' ? '#2c3545' : '#242938');
    const bootRamp = getCpsRamp(p.boots || '#161922');

    const armR = Math.max(2.3, an.armThickness * 0.56);
    const legR = Math.max(2.9, an.legThickness * 0.68);

    const sx = (v: Vec2) => ANCHOR_X + v.x;
    const sy = (v: Vec2) => ANCHOR_Y + v.y;

    // Layer A: Flowing Pleated Cape (behind body)
    if (!bodyOnly) this.rasterFlowingCape(ras, sx(pose.chest), sy(pose.chest), pose, f, T, isFlash);

    // Layer B: Back Arm (shoulder -> elbow -> forearm -> clenched fist)
    ras.fillMuscleLimb(sx(pose.lShoulder), sy(pose.lShoulder), sx(pose.lElbow), sy(pose.lElbow), armR, armR * 0.88, 'bicep', suitRamp, isFlash, f.face);
    ras.fillMuscleLimb(sx(pose.lElbow), sy(pose.lElbow), sx(pose.lHand), sy(pose.lHand), armR * 0.86, armR * 0.65, 'forearm', an.outfitStyle === 'tactical' ? skinRamp : suitRamp, isFlash, f.face);
    ras.fillRectPx(sx(pose.lHand) - 2, sy(pose.lHand) - 2, 4, 4, isFlash ? 0xffffffff : skinRamp[1]);

    // Layer C: Back Leg (thigh -> calf/boot -> sculpted tall leather boot foot)
    ras.fillMuscleLimb(sx(pose.lHip), sy(pose.lHip), sx(pose.lKnee), sy(pose.lKnee), legR, legR * 0.82, 'thigh', pantsRamp, isFlash, f.face);
    ras.fillMuscleLimb(sx(pose.lKnee), sy(pose.lKnee), sx(pose.lFoot), sy(pose.lFoot), legR * 0.84, legR * 0.68, 'boot', bootRamp, isFlash, f.face);
    ras.fillRectPx(sx(pose.lFoot) - (f.face < 0 ? 6 : 2), sy(pose.lFoot) - 2, 8, 4, isFlash ? 0xffffffff : bootRamp[2]);
    if (!isFlash) ras.fillRectPx(sx(pose.lFoot) - (f.face < 0 ? 5 : 1), sy(pose.lFoot) - 2, 5, 1, bootRamp[0]);
    if (an.kneepads && !isFlash) {
      ras.fillRectPx(sx(pose.lKnee) - 2, sy(pose.lKnee) - 2, 5, 4, bootRamp[3]);
    }

    // Layer D: Sculpted Anatomical Torso & Tailored Outfit
    this.rasterSculptedTorso(ras, pose, f, isFlash);

    // Layer E: Front Leg (thigh -> calf/boot -> sculpted boot foot)
    ras.fillMuscleLimb(sx(pose.rHip), sy(pose.rHip), sx(pose.rKnee), sy(pose.rKnee), legR, legR * 0.82, 'thigh', pantsRamp, isFlash, f.face);
    ras.fillMuscleLimb(sx(pose.rKnee), sy(pose.rKnee), sx(pose.rFoot), sy(pose.rFoot), legR * 0.84, legR * 0.68, 'boot', bootRamp, isFlash, f.face);
    ras.fillRectPx(sx(pose.rFoot) - (f.face < 0 ? 6 : 2), sy(pose.rFoot) - 2, 8, 4, isFlash ? 0xffffffff : bootRamp[2]);
    if (!isFlash) ras.fillRectPx(sx(pose.rFoot) - (f.face < 0 ? 5 : 1), sy(pose.rFoot) - 2, 5, 1, bootRamp[0]);
    if (an.kneepads && !isFlash) {
      ras.fillRectPx(sx(pose.rKnee) - 2, sy(pose.rKnee) - 2, 5, 4, bootRamp[3]);
    }

    // Layer F: Heroic Sculpted Head & Hair/Hat
    this.rasterHeroicHead(ras, pose, f, T, isFlash);

    // Layer G: Detailed 16-Bit Weapon & Crescent Arc / Staff Orb
    const attack = f.atk;
    const visibleStrike = attack?.spec.individual && attack.spec.ph.some(p=>p.hb && attack.t>=p.a[0] && attack.t<=p.a[1]);
    if (!bodyOnly && !visibleStrike) this.rasterDetailedWeapon(ras, f, sx(pose.rHand), sy(pose.rHand), pose.weaponAngle, T, isFlash);

    // Layer H: Front Arm (deltoid/bicep -> forearm -> fist)
    ras.fillMuscleLimb(sx(pose.rShoulder), sy(pose.rShoulder), sx(pose.rElbow), sy(pose.rElbow), armR, armR * 0.88, 'bicep', suitRamp, isFlash, f.face);
    ras.fillMuscleLimb(sx(pose.rElbow), sy(pose.rElbow), sx(pose.rHand), sy(pose.rHand), armR * 0.86, armR * 0.65, 'forearm', an.outfitStyle === 'tactical' ? skinRamp : suitRamp, isFlash, f.face);
    ras.fillRectPx(sx(pose.rHand) - 2, sy(pose.rHand) - 2, 4, 4, isFlash ? 0xffffffff : skinRamp[1]);

    return ras;
  }

  // El búfer ya contiene los píxeles opacos del cuerpo. Capa, arma y aura se
  // excluyen de la hurtbox. Ninguna lectura de la pantalla ni del framebuffer.
  bodyTouches(f:RenderFighterState, T:number, shape:{x:number;y:number;w:number;h:number}) {
    const scaleX=92/74*f.squashX, scaleY=92/74*f.squashY;
    const left=f.cx-ANCHOR_X*scaleX, top=f.y+f.h-ANCHOR_Y*scaleY;
    const x0=Math.max(0,Math.floor((shape.x-left)/scaleX));
    const x1=Math.min(SPR_W,Math.ceil((shape.x+shape.w-left)/scaleX));
    const y0=Math.max(0,Math.floor((shape.y-top)/scaleY));
    const y1=Math.min(SPR_H,Math.ceil((shape.y+shape.h-top)/scaleY));
    if (x0>=x1 || y0>=y1) return false;
    const raster=this.rasterBody(f,this.fightingPose(f,T),T,false,true);
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
      if(raster.buf32[y*SPR_W+x] && shotTouches(shape,{x:left+x*scaleX,y:top+y*scaleY,w:scaleX,h:scaleY})) return true;
    }
    return false;
  }

  protected fightingPose(f:RenderFighterState,T:number) {
    const pose=this.computeTargetPose(f,T);
    const attack=f.atk;
    const phase=attack?.spec.individual && attack.spec.ph.find(p=>p.hb && attack.t>=p.a[0] && attack.t<=p.a[1]);
    if (phase) {
      const b=strikeBox(f,phase,attack!.t,f.wpn>0 && f.wk==='case' && attack!.spec.k==='l');
      const rear=phase.hb!.fx<0;
      const grip=(f.face>0)!==rear ? b.x : b.x+b.w;
      pose.rHand={x:(grip-f.cx)/(92/74*f.squashX),y:(b.y+b.h/2-f.y-f.h)/(92/74*f.squashY)};
    }
    return pose;
  }

  rearHeel(f:RenderFighterState,T:number) {
    const pose=this.fightingPose(f,T);
    const foot=(pose.lFoot.x-pose.rFoot.x)*f.face<0?pose.lFoot:pose.rFoot;
    return {x:f.cx+foot.x*(92/74)*f.squashX-5,y:f.y+f.h+foot.y*(92/74)*f.squashY-6,w:10,h:9};
  }

}

export class PixelRenderer extends LegacyFighterGeometry {
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private pxW = 640;
  private pxH = 360;
  private camX = 720;
  private camY = 425;
  private camZoom = 1.25;

  constructor() {
    super();
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = this.pxW;
    this.offCanvas.height = this.pxH;
    const ctx = this.offCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D context unavailable');
    this.offCtx = ctx;
    this.offCtx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = this.pxW;
    this.lightCanvas.height = this.pxH;
    const lCtx = this.lightCanvas.getContext('2d');
    if (!lCtx) throw new Error('Light 2D context unavailable');
    this.lightCtx = lCtx;
    this.lightCtx.imageSmoothingEnabled = false;
  }

  private syncBufferSize(cfg: GameConfig) {
    const dim = PIXEL_PRESET_DIMS[cfg.video.pixelPreset] || PIXEL_PRESET_DIMS.modern;
    if (this.pxW !== dim.w || this.pxH !== dim.h) {
      this.pxW = dim.w;
      this.pxH = dim.h;
      this.offCanvas.width = dim.w;
      this.offCanvas.height = dim.h;
      this.offCtx.imageSmoothingEnabled = false;
      this.lightCanvas.width = dim.w;
      this.lightCanvas.height = dim.h;
      this.lightCtx.imageSmoothingEnabled = false;
    }
  }

  private updateCamera(world: WorldRenderContext) {
    const alive = world.fighters.filter((f) => f.dead <= 0);
    if (alive.length === 0) {
      this.camX += (720 - this.camX) * 0.1;
      this.camY += (425 - this.camY) * 0.1;
      this.camZoom += (1.1 - this.camZoom) * 0.1;
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const f of alive) {
      const fx = clamp(f.cx, -120, 1560);
      const fy = clamp(f.y + f.h * 0.5, -140, 820);
      minX = Math.min(minX, fx);
      maxX = Math.max(maxX, fx);
      minY = Math.min(minY, fy);
      maxY = Math.max(maxY, fy);
    }
    const spanX = Math.max(540, maxX - minX + 420);
    const spanY = Math.max(305, maxY - minY + 280);
    const targetZoom = clamp(Math.min(1440 / spanX, 810 / spanY), 0.82, 2.15);

    const midX = (minX + maxX) * 0.5 * 0.82 + 720 * 0.18;
    const midY = (minY + maxY) * 0.5 * 0.78 + 425 * 0.22 - 20;
    const halfViewW = 720 / targetZoom;
    const halfViewH = 405 / targetZoom;
    const targetX = clamp(midX, Math.min(720, halfViewW - 140), Math.max(720, 1580 - halfViewW));
    const targetY = clamp(midY, Math.min(405, halfViewH - 180), Math.max(405, 860 - halfViewH));

    this.camX += (targetX - this.camX) * 0.12;
    this.camY += (targetY - this.camY) * 0.12;
    this.camZoom += (targetZoom - this.camZoom) * 0.1;
  }

  private sx(v: number): number {
    return Math.round(((v - this.camX) * this.camZoom + 720) * (this.pxW / 1440));
  }
  private sy(v: number): number {
    return Math.round(((v - this.camY) * this.camZoom + 405) * (this.pxH / 810));
  }
  private sw(v: number): number {
    return Math.max(1, Math.round(v * this.camZoom * (this.pxW / 1440)));
  }

  private pxRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  // Heroic 16-bit CPS-1 Proportions (6.5 to 7 heads tall inside 104x112 sprite grid!)
  public drawAnatomicalCharacter(
    ctx: CanvasRenderingContext2D,
    f: RenderFighterState,
    T: number,
    pxScale: number,
    rootX: number,
    rootY: number,
    useOutline: boolean,
    memKey?: number
  ) {
    if (f.dead > 0) return;

    const isFlash = f.hitFlash > 0 && f.hitFlash % 4 < 2;
    const p = f.d.palette;
    const an = f.d.anatomy;

    // 1. Dash Afterimages
    for (const ghost of f.afterimages) {
      ctx.save();
      ctx.globalAlpha = ghost.alpha * 0.42;
      ctx.fillStyle = p.accent.base;
      const gx = this.sx(ghost.x);
      const gy = this.sy(ghost.y);
      ctx.fillRect(Math.round(gx - 10 * pxScale), Math.round(gy - 70 * pxScale), Math.round(20 * pxScale), Math.round(70 * pxScale));
      ctx.restore();
    }

    ctx.save();
    if (f.inv > 0 && T % 6 < 3) ctx.globalAlpha = 0.48;

    // 2. Super / Boss / Floating Levitation Aura
    if (f.floating) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(T * 0.35);
      ctx.fillStyle = p.accent.highlight || '#98ffe0';
      ctx.fillRect(Math.round(rootX - 14 * pxScale), Math.round(rootY - 2 * pxScale), Math.round(28 * pxScale), Math.max(2, Math.round(3 * pxScale)));
      ctx.restore();
    }
    if (f.vote >= 100 || f.boss || f.winning) {
      const auraR = Math.round((f.boss ? 42 : f.winning ? 38 : 34) * pxScale);
      const pulse = Math.sin(T * 0.25) * 4 * pxScale;
      ctx.save();
      ctx.globalAlpha = (f.winning ? 0.34 : 0.25) + 0.14 * Math.sin(T * 0.2);
      ctx.fillStyle = f.boss ? '#b855ff' : f.winning ? p.accent.highlight || '#ffd23f' : '#ffd23f';
      ctx.beginPath();
      ctx.arc(rootX, rootY - 36 * pxScale, auraR + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Ground Contact Shadow (CPS-1 Oval Shadow)
    if (f.on) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
      ctx.fillRect(
        Math.round(rootX - 18 * pxScale),
        Math.round(rootY - Math.max(1, 2 * pxScale)),
        Math.round(36 * pxScale),
        Math.max(2, Math.round(4 * pxScale))
      );
    }

    ctx.translate(Math.round(rootX), Math.round(rootY));
    if (f.pickupT) {
      const reach = Math.sin((15 - f.pickupT) * Math.PI / 15);
      ctx.rotate(f.face * 0.22 * reach);
      ctx.scale(1 + 0.06 * reach, 1 - 0.24 * reach);
    }
    ctx.scale(f.squashX, f.squashY);
    const sprite = paintCombatSprite(ctx, f, T, pxScale);
    if (sprite.equipment) this.drawAtlasEquipment(ctx, f, T, pxScale);
    if (!sprite.drawn) {
      const pose = (f as {moves?:unknown}).moves ? this.fightingPose(f,T) : this.solveBlendedPose(f, T, memKey);
      const ras = this.rasterBody(f, pose, T, isFlash, false);
      ras.applyChromaticOutline(useOutline && !isFlash);
      ras.flushToContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ras.canvas, Math.round(-ANCHOR_X * pxScale), Math.round(-ANCHOR_Y * pxScale),
        Math.round(SPR_W * pxScale), Math.round(SPR_H * pxScale));
    }

    // Reload bar above fighter
    if (f.reloadT > 0) {
      const rp = 1 - f.reloadT / Math.max(1, f.reloadDur);
      const barW = Math.round(32 * pxScale);
      const barY = Math.round(-88 * pxScale);
      this.pxRect(ctx, -barW / 2, barY, barW, Math.max(3, Math.round(4 * pxScale)), '#090b12');
      this.pxRect(ctx, -barW / 2 + 1, barY + 1, (barW - 2) * rp, Math.max(1, Math.round(4 * pxScale) - 2), '#ffcc33');
    }

    if (f.atk?.armor) {
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = Math.max(1, Math.round(1.5 * pxScale));
      ctx.beginPath();
      ctx.arc(0, -36 * pxScale, 32 * pxScale + Math.sin(T * 0.5) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawStageBackground(ctx: CanvasRenderingContext2D, world: WorldRenderContext) {
    const { stage, T, hzPhase, hzMod, hzDur } = world;
    const W = this.pxW;
    const H = this.pxH;

    // Multi-stop atmospheric sky gradient with rich mid-horizon scattering
    const skyG = ctx.createLinearGradient(0, 0, 0, H);
    skyG.addColorStop(0, stage.palette.skyTop);
    skyG.addColorStop(0.54, mixHex(stage.palette.skyTop, stage.palette.skyBottom, 0.42));
    skyG.addColorStop(0.86, stage.palette.skyBottom);
    skyG.addColorStop(1, tintOutlineHex(stage.palette.skyBottom, 0.45));
    ctx.fillStyle = skyG;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // Classic 16-bit horizontal dithering bands + drifting parallax atmospheric mist
    for (let b = 0; b < 6; b++) {
      const by = H * (0.36 + b * 0.075);
      if (b % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
        ctx.fillRect(0, Math.round(by), W, Math.max(2, Math.round(H * 0.022)));
      }
    }
    const cloudCol = mixHex(stage.palette.skyBottom, '#ffffff', 0.28);
    ctx.save();
    for (let c = 0; c < 5; c++) {
      const drift = ((T * (0.14 + c * 0.04) + c * 260) % (W + 220)) - 140;
      const cy = Math.round(H * (0.14 + (c % 3) * 0.11));
      const cw = Math.round(W * (0.12 + (c % 2) * 0.06));
      ctx.globalAlpha = 0.08 + (c % 2) * 0.04;
      this.pxRect(ctx, drift, cy, cw, Math.max(3, Math.round(H * 0.025)), cloudCol);
      this.pxRect(ctx, drift + cw * 0.18, cy - Math.max(2, Math.round(H * 0.015)), cw * 0.6, Math.max(2, Math.round(H * 0.016)), cloudCol);
    }
    ctx.restore();

    const sx = (v: number) => this.sx(v);
    const sy = (v: number) => this.sy(v);
    const sw = (v: number) => this.sw(v);

    const drawFlag = (fx: number, fy: number, fw: number, fh: number, stripes: string[]) => {
      const strips = 6;
      const sliceW = fw / strips;
      for (let i = 0; i < strips; i++) {
        const wave = Math.round(Math.sin(T * 0.14 + i * 0.9) * 1.5);
        const stripH = fh / stripes.length;
        stripes.forEach((col, si) => {
          this.pxRect(ctx, fx + i * sliceW, fy + wave + si * stripH, sliceW + 1, stripH + 0.5, col);
        });
      }
    };

    const drawLantern = (lx: number, ly: number, col = '#ffd23f') => {
      this.pxRect(ctx, sx(lx - 2), sy(ly), sw(4), sw(14), '#1a1f2b');
      this.pxRect(ctx, sx(lx - 5), sy(ly - 10), sw(10), sw(10), '#0f131c');
      this.pxRect(ctx, sx(lx - 3), sy(ly - 8), sw(6), sw(6), T % 18 < 9 ? col : '#fff7b0');
    };

    const drawPediment = (cx: number, topY: number, halfW: number, height: number, fillCol: string, trimCol: string) => {
      const steps = 10;
      for (let r = 0; r < steps; r++) {
        const ratio = r / steps;
        const wNow = halfW * 2 * (1 - ratio * 0.85);
        const yNow = topY - ratio * height;
        this.pxRect(ctx, sx(cx - wNow / 2), sy(yNow), sw(wNow), sw(height / steps + 1), r === 0 ? trimCol : fillCol);
      }
    };

    const gY = world.main.y; // ~590 in 1440x810 panoramic world

    if (stage.id === 'blanca') {
      // La Casa Blanca (EE. UU.) - Capitolio & Monumento a Washington en el horizonte + Pórtico Neoclásico
      for (let k = 0; k < 64; k++) {
        ctx.globalAlpha = (T + k * 19) % 70 < 8 ? 0.35 : 0.9;
        this.pxRect(ctx, sx((k * 137) % 1440), sy((k * 73) % 275), 1, 1, '#fff6d6');
      }
      ctx.globalAlpha = 1;
      // Glowing Moon + Distant Washington Monument & Capitol Dome silhouettes
      this.pxRect(ctx, sx(1180), sy(72), sw(42), sw(42), '#f5efc8');
      this.pxRect(ctx, sx(1188), sy(80), sw(24), sw(24), '#fffbe6');
      this.pxRect(ctx, sx(148), sy(210), sw(14), sw(380), '#152042');
      this.pxRect(ctx, sx(151), sy(194), sw(8), sw(18), '#1d2b54');
      this.pxRect(ctx, sx(153), sy(198), sw(4), sw(4), T % 40 < 20 ? '#ef4444' : '#7f1d1d');
      this.pxRect(ctx, sx(1235), sy(370), sw(92), sw(220), '#141e3d');
      this.pxRect(ctx, sx(1258), sy(325), sw(46), sw(48), '#1c2a54');
      this.pxRect(ctx, sx(1274), sy(305), sw(14), sw(22), '#243568');

      // Rose Garden hedges
      this.pxRect(ctx, sx(190), sy(520), sw(1060), sw(70), '#172924');
      for (let k = 0; k < 16; k++) {
        this.pxRect(ctx, sx(210 + k * 66), sy(535 + (k % 2) * 8), sw(8), sw(6), k % 3 ? '#c92a2a' : '#f472b6');
      }

      // White House Facade, Tympanum Pediment & Ionic Columns
      this.pxRect(ctx, sx(300), sy(306), sw(840), sw(286), '#cfd4e2');
      this.pxRect(ctx, sx(300), sy(300), sw(840), sw(14), '#9aa1b8');
      this.pxRect(ctx, sx(320), sy(284), sw(800), sw(16), '#e3e7f2');
      drawPediment(720, 294, 390, 92, '#e3e7f2', '#9aa1b8');
      this.pxRect(ctx, sx(706), sy(248), sw(28), sw(24), '#ffd23f');
      for (let k = 0; k < 10; k++) {
        const wx = sx(346 + k * 78);
        this.pxRect(ctx, wx, sy(352), sw(28), sw(48), '#262b3d');
        this.pxRect(ctx, wx + sw(3), sy(356), sw(22), sw(38), '#ffe694');
        this.pxRect(ctx, wx + sw(13), sy(356), sw(2), sw(38), '#262b3d');
        this.pxRect(ctx, wx - sw(2), sy(400), sw(32), sw(5), '#8c94ab');
      }
      // Second row arched ground windows
      for (let k = 0; k < 10; k++) {
        if (k === 4 || k === 5) continue;
        const wx = sx(346 + k * 78);
        this.pxRect(ctx, wx, sy(436), sw(28), sw(62), '#262b3d');
        this.pxRect(ctx, wx + sw(3), sy(442), sw(22), sw(50), '#ffd978');
      }
      // Grand central entrance portico doors
      this.pxRect(ctx, sx(686), sy(442), sw(68), sw(148), '#2c3347');
      this.pxRect(ctx, sx(694), sy(450), sw(52), sw(26), '#ffe694');
      for (let k = 0; k < 11; k++) {
        const cx = sx(374 + k * 70);
        this.pxRect(ctx, cx - sw(3), sy(304), sw(24), sw(8), '#f5f6fb');
        this.pxRect(ctx, cx, sy(312), sw(18), sw(278), '#f2f4fa');
        this.pxRect(ctx, cx + sw(12), sy(312), sw(6), sw(278), '#b8bfd4');
      }
      [230, 1210].forEach((x, idx) => {
        this.pxRect(ctx, sx(x), sy(235), sw(4), sw(355), '#c8cede');
        const fx = idx ? sx(x - 62) : sx(x + 4);
        drawFlag(fx, sy(238), sw(60), sw(34), ['#c92424', '#fff', '#c92424', '#fff', '#c92424', '#fff', '#c92424']);
        this.pxRect(ctx, fx, sy(238), sw(24), sw(18), '#1c3a8a');
      });

      if (hzPhase === 2) {
        const hx = sx(-120 + (hzMod / hzDur) * (1440 + 240));
        const hy = sy(108 + Math.sin(hzMod / 18) * 12);
        const beamSwing = sx(Math.sin(hzMod / 25) * 170) - sx(0);
        ctx.fillStyle = 'rgba(255, 250, 195, 0.22)';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy + 8);
        ctx.lineTo(hx + 4, hy + 8);
        ctx.lineTo(hx + sw(120) + beamSwing, H);
        ctx.lineTo(hx - sw(120) + beamSwing, H);
        ctx.fill();
        this.pxRect(ctx, hx - sw(36), hy - sw(14), sw(72), sw(24), '#1d2430');
        const rotW = Math.max(4, Math.abs(Math.cos(hzMod / 2)) * sw(110));
        this.pxRect(ctx, hx - rotW / 2, hy - sw(20), rotW, sw(4), '#cfd6e6');
      }
    } else if (stage.id === 'narino') {
      // Casa de Nariño (Colombia) - Atardecer en los Cerros Orientales + Monserrate + Fachada Colonial de Piedra
      this.pxRect(ctx, sx(620), sy(380), sw(200), sw(200), '#ffcf70');
      this.pxRect(ctx, sx(650), sy(410), sw(140), sw(140), '#ffe6a3');
      // Distant Andean Mountains + Monserrate Sanctuary on right peak
      ctx.fillStyle = '#362752';
      ctx.beginPath();
      ctx.moveTo(0, sy(gY));
      [[0, 445], [190, 320], [410, 430], [640, 345], [880, 455], [1165, 285], [1440, 425]].forEach(([px, py]) => {
        ctx.lineTo(sx(px), sy(py));
      });
      ctx.lineTo(W, sy(gY));
      ctx.fill();
      // Lit Monserrate Church atop peak
      this.pxRect(ctx, sx(1152), sy(262), sw(26), sw(24), '#f4f6fc');
      this.pxRect(ctx, sx(1161), sy(246), sw(8), sw(16), '#f4f6fc');
      this.pxRect(ctx, sx(1163), sy(268), sw(4), sw(8), '#ffd23f');

      // Palace wings + terracotta tile roofs + colonial stonework
      this.pxRect(ctx, sx(240), sy(355), sw(960), sw(235), '#e6dab8');
      this.pxRect(ctx, sx(232), sy(335), sw(976), sw(22), '#a6462e'); // terracotta roof
      for (let k = 0; k < 24; k++) {
        this.pxRect(ctx, sx(236 + k * 40), sy(335), sw(4), sw(22), '#7d2f1c');
      }
      // Central Neoclassical Portico + Pediment + Coat of Arms
      this.pxRect(ctx, sx(575), sy(295), sw(290), sw(295), '#f2e8cc');
      drawPediment(720, 292, 155, 52, '#d4c39c', '#b09b70');
      this.pxRect(ctx, sx(706), sy(256), sw(28), sw(22), '#f2c144');
      for (let k = 0; k < 4; k++) {
        this.pxRect(ctx, sx(604 + k * 72), sy(310), sw(16), sw(280), '#faf3df');
        this.pxRect(ctx, sx(615 + k * 72), sy(310), sw(5), sw(280), '#c7b892');
      }
      // Wrought-iron balconies & warm interior windows
      for (let k = 0; k < 10; k++) {
        if (k >= 4 && k <= 5) continue;
        const wx = sx(276 + k * 92);
        this.pxRect(ctx, wx, sy(392), sw(38), sw(78), '#4d3b26');
        this.pxRect(ctx, wx + sw(6), sy(402), sw(26), sw(58), '#ffd77a');
        this.pxRect(ctx, wx - sw(5), sy(458), sw(48), sw(16), '#1f232e'); // iron balcony
      }
      // Flanking Cypresses & Golden Lanterns
      [185, 1235].forEach((tx) => {
        this.pxRect(ctx, sx(tx), sy(455), sw(36), sw(96), '#20452b');
        this.pxRect(ctx, sx(tx + 12), sy(545), sw(12), sw(45), '#4a2f1d');
      });
      [345, 550, 890, 1095].forEach((lx) => drawLantern(lx, 515));
      this.pxRect(ctx, sx(718), sy(125), sw(4), sw(116), '#c8cede');
      drawFlag(sx(722), sy(128), sw(64), sw(40), ['#fcd116', '#fcd116', '#003893', '#ce1126']);
    } else if (stage.id === 'miraflores') {
      // Palacio de Miraflores (Venezuela) - Cerro El Ávila + Cúpula Dorada + Arcadas y Palmas Reales
      ctx.fillStyle = '#2d1c45';
      ctx.beginPath();
      ctx.moveTo(0, sy(gY));
      [[0, 440], [320, 290], [690, 360], [1080, 270], [1440, 400]].forEach(([px, py]) => {
        ctx.lineTo(sx(px), sy(py));
      });
      ctx.lineTo(W, sy(gY));
      ctx.fill();

      this.pxRect(ctx, sx(240), sy(335), sw(960), sw(255), '#d4c29a');
      this.pxRect(ctx, sx(240), sy(322), sw(960), sw(18), '#f2c144');
      // Central Baroque Dome & Clock Tower
      this.pxRect(ctx, sx(565), sy(260), sw(310), sw(330), '#e6d7b5');
      this.pxRect(ctx, sx(625), sy(210), sw(190), sw(52), '#c99b32');
      drawPediment(720, 210, 88, 38, '#a67b1f', '#ffd23f');
      this.pxRect(ctx, sx(706), sy(224), sw(28), sw(28), '#fffbeb'); // palace clock
      // Arched Colonnade Arcade
      for (let k = 0; k < 8; k++) {
        const wx = sx(286 + k * 116);
        this.pxRect(ctx, wx, sy(382), sw(38), sw(92), '#4d3a24');
        this.pxRect(ctx, wx + sw(6), sy(394), sw(26), sw(70), '#ffe294');
        this.pxRect(ctx, wx - sw(4), sy(482), sw(46), sw(108), '#b8a278');
      }
      // Golden Heroic Side Statues & Royal Palms
      [180, 1220].forEach((x) => {
        this.pxRect(ctx, sx(x), sy(480), sw(44), sw(110), '#7a6852');
        this.pxRect(ctx, sx(x + 10), sy(406), sw(24), sw(74), '#e8c458');
        this.pxRect(ctx, sx(x + 14), sy(390), sw(16), sw(16), '#ffd76b');
      });
      [105, 1335].forEach((px) => {
        this.pxRect(ctx, sx(px - 5), sy(410), sw(10), sw(180), '#5c4028');
        this.pxRect(ctx, sx(px - 36), sy(390), sw(72), sw(22), '#266335');
        this.pxRect(ctx, sx(px - 26), sy(372), sw(52), sw(18), '#348046');
      });
      this.pxRect(ctx, sx(718), sy(90), sw(4), sw(92), '#e2e8f0');
      drawFlag(sx(722), sy(93), sw(62), sw(38), ['#fcd116', '#00247d', '#cf142b']);
    } else if (stage.id === 'rosada') {
      // La Casa Rosada (Argentina) - Obelisco lejano, nubes celestes y el icónico Balcón Presidencial
      [[180, 92], [640, 64], [1120, 110]].forEach(([x, y], idx) => {
        const cx = sx(((x + T * (0.25 + idx * 0.1)) % 1560) - 60);
        this.pxRect(ctx, cx, sy(y), sw(88), sw(22), '#f4f8ff');
        this.pxRect(ctx, cx + sw(18), sy(y - 14), sw(48), sw(16), '#ffffff');
      });
      // Distant Buenos Aires skyline + Obelisco
      this.pxRect(ctx, sx(135), sy(210), sw(18), sw(380), '#93b2d9');
      this.pxRect(ctx, sx(139), sy(188), sw(10), sw(24), '#b8d1f0');
      this.pxRect(ctx, sx(1220), sy(390), sw(95), sw(200), '#85a6cf');

      this.pxRect(ctx, sx(200), sy(296), sw(1040), sw(294), '#e084a2');
      this.pxRect(ctx, sx(200), sy(280), sw(1040), sw(20), '#ba5e7d');
      // Corner Cupola Towers
      [215, 1135].forEach((tx) => {
        this.pxRect(ctx, sx(tx), sy(236), sw(90), sw(60), '#d47493');
        this.pxRect(ctx, sx(tx + 12), sy(205), sw(66), sw(32), '#4e586e');
      });
      // Central Presidential Balcony & Arch
      this.pxRect(ctx, sx(590), sy(218), sw(260), sw(372), '#eb9bb5');
      this.pxRect(ctx, sx(590), sy(202), sw(260), sw(18), '#ba5e7d');
      drawPediment(720, 202, 130, 42, '#eb9bb5', '#ba5e7d');
      this.pxRect(ctx, sx(668), sy(350), sw(104), sw(92), '#732541');
      this.pxRect(ctx, sx(676), sy(358), sw(88), sw(76), '#ffe08a');
      this.pxRect(ctx, sx(652), sy(434), sw(136), sw(22), '#f4f7fc'); // famous white balcony rail
      for (let k = 0; k < 12; k++) {
        if (k === 5 || k === 6) continue;
        const wx = sx(238 + k * 84);
        this.pxRect(ctx, wx, sy(362), sw(38), sw(72), '#732541');
        this.pxRect(ctx, wx + sw(6), sy(372), sw(26), sw(54), k % 2 ? '#ffe08a' : '#a8486a');
        this.pxRect(ctx, wx, sy(462), sw(38), sw(76), '#852e4d');
      }
      [300, 560, 880, 1140].forEach((lx) => drawLantern(lx, 520, '#fff3b0'));
      this.pxRect(ctx, sx(718), sy(90), sw(4), sw(90), '#c8cede');
      drawFlag(sx(722), sy(93), sw(64), sw(38), ['#74acdf', '#ffffff', '#74acdf']);
    } else if (stage.id === 'planalto') {
      // Palacio de Planalto (Brasil) - Atardecer en Brasília, Catedral hiperboloide y Columnas de Niemeyer
      this.pxRect(ctx, sx(1120), sy(215), sw(142), sw(142), '#ffb35c');
      this.pxRect(ctx, sx(1144), sy(239), sw(94), sw(94), '#ffe294');
      // Distant Brasília Cathedral silhouette
      this.pxRect(ctx, sx(115), sy(470), sw(110), sw(120), '#2b244d');
      this.pxRect(ctx, sx(140), sy(405), sw(60), sw(70), '#3d336b');
      this.pxRect(ctx, sx(162), sy(372), sw(16), sw(36), '#ffd23f');

      // Reflecting Pool / Esplanade water shimmer
      this.pxRect(ctx, sx(200), sy(550), sw(1040), sw(40), '#1d4a6e');
      for (let k = 0; k < 12; k++) {
        this.pxRect(ctx, sx(230 + k * 84 + Math.sin(T * 0.08 + k) * 6), sy(564), sw(36), sw(4), '#7dd3fc');
      }
      this.pxRect(ctx, sx(240), sy(328), sw(960), sw(222), '#1f3554');
      this.pxRect(ctx, sx(260), sy(345), sw(920), sw(175), '#4e7ea6');
      for (let k = 0; k < 14; k++) {
        this.pxRect(ctx, sx(270 + k * 66), sy(345), sw(4), sw(175), '#254266');
        if (k % 2 === 0) this.pxRect(ctx, sx(282 + k * 66), sy(375), sw(38), sw(90), 'rgba(255, 195, 110, 0.35)');
      }
      // Iconic Oscar Niemeyer sweeping concrete slab + sculpted curved pillars
      this.pxRect(ctx, sx(195), sy(304), sw(1050), sw(28), '#f4f7fc');
      this.pxRect(ctx, sx(195), sy(326), sw(1050), sw(6), '#c2ccd9');
      for (let k = 0; k < 9; k++) {
        const px = sx(250 + k * 116);
        this.pxRect(ctx, px, sy(332), sw(24), sw(258), '#e8eef7');
        this.pxRect(ctx, px + sw(16), sy(332), sw(8), sw(258), '#c2ccd9');
        this.pxRect(ctx, px - sw(10), sy(518), sw(44), sw(72), '#cfd6e0');
      }
      this.pxRect(ctx, sx(718), sy(168), sw(4), sw(136), '#e2e8f0');
      drawFlag(sx(722), sy(172), sw(60), sw(38), ['#009c3b', '#ffdf00', '#009c3b']);
    } else if (stage.id === 'mexico') {
      // Palacio Nacional (México) - Popocatépetl lejano, Tezontle rojo, Campana de Dolores y Faroles del Zócalo
      ctx.fillStyle = '#2d1c3d';
      ctx.beginPath();
      ctx.moveTo(0, sy(gY));
      [[0, 480], [180, 300], [360, 470], [1080, 460], [1260, 290], [1440, 460]].forEach(([px, py]) => {
        ctx.lineTo(sx(px), sy(py));
      });
      ctx.lineTo(W, sy(gY));
      ctx.fill();
      // Snowcaps on twin volcanoes
      this.pxRect(ctx, sx(162), sy(304), sw(36), sw(20), '#e2e8f0');
      this.pxRect(ctx, sx(1240), sy(294), sw(40), sw(22), '#e2e8f0');

      this.pxRect(ctx, sx(150), sy(318), sw(1140), sw(272), '#7a2c32');
      this.pxRect(ctx, sx(150), sy(302), sw(1140), sw(18), '#c9b296');
      // Corner Torreones + Central Baroque Belfry
      [150, 1210].forEach((tx) => {
        this.pxRect(ctx, sx(tx), sy(275), sw(80), sw(315), '#8c343b');
        this.pxRect(ctx, sx(tx), sy(268), sw(80), sw(10), '#d9c4a9');
      });
      this.pxRect(ctx, sx(610), sy(230), sw(220), sw(90), '#91383f');
      this.pxRect(ctx, sx(675), sy(206), sw(90), sw(30), '#c9b296');
      // Golden Bell of Dolores swinging slightly!
      const bellSwing = Math.round(Math.sin(T * 0.08) * 3);
      this.pxRect(ctx, sx(705 + bellSwing), sy(250), sw(30), sw(38), '#ffd23f');
      this.pxRect(ctx, sx(700 + bellSwing), sy(280), sw(40), sw(8), '#f59e0b');
      for (let k = 0; k < 11; k++) {
        const wx = sx(200 + k * 96);
        this.pxRect(ctx, wx, sy(362), sw(44), sw(82), '#4d1b1e');
        this.pxRect(ctx, wx + sw(8), sy(374), sw(28), sw(60), '#f5cb6e');
        this.pxRect(ctx, wx - sw(4), sy(440), sw(52), sw(10), '#1f232e');
        this.pxRect(ctx, wx + sw(6), sy(478), sw(32), sw(112), '#592024');
      }
      [290, 540, 900, 1150].forEach((lx) => drawLantern(lx, 520));
      this.pxRect(ctx, sx(718), sy(100), sw(4), sw(106), '#e2e8f0');
      drawFlag(sx(722), sy(104), sw(64), sw(38), ['#006847', '#ffffff', '#ce1126']);
    } else if (stage.id === 'moneda') {
      // Palacio de La Moneda (Chile) - Cordillera Nevada + Fachada de Granito y Fuentes
      ctx.fillStyle = '#334d73';
      ctx.beginPath();
      ctx.moveTo(0, sy(gY));
      [[0, 420], [240, 235], [520, 385], [850, 225], [1160, 360], [1440, 270]].forEach(([px, py]) => {
        ctx.lineTo(sx(px), sy(py));
      });
      ctx.lineTo(W, sy(gY));
      ctx.fill();
      // Snowy Andes Peak Caps
      [[240, 235], [850, 225], [1160, 360]].forEach(([px, py]) => {
        this.pxRect(ctx, sx(px - 32), sy(py + 12), sw(64), sw(22), '#dbeafe');
        this.pxRect(ctx, sx(px - 16), sy(py), sw(32), sw(14), '#f8fafc');
      });

      this.pxRect(ctx, sx(230), sy(338), sw(980), sw(252), '#8f96a3');
      this.pxRect(ctx, sx(230), sy(324), sw(980), sw(16), '#6b7280');
      this.pxRect(ctx, sx(570), sy(280), sw(300), sw(310), '#a8afbd');
      drawPediment(720, 280, 150, 44, '#9aa2b2', '#6b7280');
      for (let k = 0; k < 9; k++) {
        this.pxRect(ctx, sx(276 + k * 104), sy(380), sw(36), sw(74), '#353a45');
        this.pxRect(ctx, sx(282 + k * 104), sy(390), sw(24), sw(54), '#ffdf88');
        this.pxRect(ctx, sx(264 + k * 104), sy(340), sw(10), sw(250), '#aeb5c2');
      }
      this.pxRect(ctx, sx(718), sy(135), sw(4), sw(110), '#dce2ee');
      drawFlag(sx(722), sy(138), sw(60), sw(36), ['#ffffff', '#d52b1e']);
      this.pxRect(ctx, sx(722), sy(138), sw(24), sw(18), '#0039a6');
    } else if (stage.id === 'pizarro') {
      // Palacio de Gobierno / Pizarro (Perú) - Torres coloniales + Cúpulas verdes y Balcones de Cedro Limeño
      this.pxRect(ctx, sx(125), sy(340), sw(64), sw(250), '#8f7256');
      this.pxRect(ctx, sx(135), sy(305), sw(44), sw(38), '#3b6e5c');
      this.pxRect(ctx, sx(1250), sy(350), sw(64), sw(240), '#8f7256');

      this.pxRect(ctx, sx(210), sy(312), sw(1020), sw(278), '#c9b393');
      this.pxRect(ctx, sx(210), sy(296), sw(1020), sw(18), '#947e60');
      this.pxRect(ctx, sx(580), sy(248), sw(280), sw(342), '#d9c5a7');
      this.pxRect(ctx, sx(620), sy(210), sw(200), sw(38), '#356658'); // copper-green mansard roof
      for (let k = 0; k < 8; k++) {
        const bx = sx(248 + k * 120);
        this.pxRect(ctx, bx, sy(372), sw(68), sw(86), '#3d2214');
        this.pxRect(ctx, bx + sw(8), sy(384), sw(52), sw(54), '#f2c166');
        // Carved cedar lattice bars
        for (let b = 0; b < 4; b++) {
          this.pxRect(ctx, bx + sw(16 + b * 12), sy(384), sw(2), sw(54), '#3d2214');
        }
        this.pxRect(ctx, bx - sw(4), sy(365), sw(76), sw(10), '#241209');
      }
      [340, 560, 880, 1100].forEach((lx) => drawLantern(lx, 520));
      this.pxRect(ctx, sx(718), sy(108), sw(4), sw(105), '#e2e8f0');
      drawFlag(sx(722), sy(112), sw(60), sw(36), ['#d91023', '#ffffff', '#d91023']);
    } else if (stage.id === 'eliseo') {
      // El Elíseo (Francia) - Torre Eiffel iluminada en el horizonte + Mansardas y Pórtico Parisino
      // Distant Eiffel Tower silhouette with golden beacon!
      this.pxRect(ctx, sx(118), sy(480), sw(96), sw(110), '#1f2942');
      this.pxRect(ctx, sx(136), sy(380), sw(60), sw(105), '#253252');
      this.pxRect(ctx, sx(152), sy(260), sw(28), sw(125), '#2d3d63');
      this.pxRect(ctx, sx(162), sy(205), sw(8), sw(58), '#384c7a');
      this.pxRect(ctx, sx(163), sy(202), sw(6), sw(6), T % 26 < 13 ? '#ffd23f' : '#ffffff');

      this.pxRect(ctx, sx(250), sy(328), sw(940), sw(262), '#dcd2be');
      this.pxRect(ctx, sx(250), sy(296), sw(940), sw(34), '#374254');
      this.pxRect(ctx, sx(250), sy(292), sw(940), sw(5), '#ffd23f');
      this.pxRect(ctx, sx(575), sy(242), sw(290), sw(348), '#ebe2cf');
      this.pxRect(ctx, sx(575), sy(218), sw(290), sw(26), '#2d3748');
      drawPediment(720, 244, 130, 38, '#ebe2cf', '#b8ac94');
      for (let k = 0; k < 9; k++) {
        this.pxRect(ctx, sx(292 + k * 96), sy(368), sw(40), sw(96), '#2f3542');
        this.pxRect(ctx, sx(300 + k * 96), sy(378), sw(24), sw(76), '#ffe6a3');
        this.pxRect(ctx, sx(304 + k * 96), sy(304), sw(16), sw(18), '#ffe6a3'); // mansard dormer
      }
      // Manicured garden topiaries
      [200, 1220].forEach((tx) => {
        this.pxRect(ctx, sx(tx), sy(490), sw(34), sw(65), '#264d36');
        this.pxRect(ctx, sx(tx + 12), sy(555), sw(10), sw(35), '#523824');
      });
      this.pxRect(ctx, sx(718), sy(108), sw(4), sw(110), '#ffd23f');
      drawFlag(sx(722), sy(112), sw(60), sw(36), ['#0055a4', '#ffffff', '#ef4135']);
    } else if (stage.id === 'downing') {
      // 10 de Downing Street (Reino Unido) - Big Ben entre la niebla + Fachada Georgiana #10 y Faroles
      // Big Ben Clock Tower in London mist
      this.pxRect(ctx, sx(115), sy(240), sw(66), sw(350), '#1b243b');
      this.pxRect(ctx, sx(122), sy(185), sw(52), sw(58), '#232f4d');
      this.pxRect(ctx, sx(136), sy(140), sw(24), sw(46), '#2b395c');
      this.pxRect(ctx, sx(131), sy(200), sw(34), sw(34), '#ffe89c'); // Big Ben clock dial
      this.pxRect(ctx, sx(146), sy(208), sw(4), sw(12), '#111827');
      this.pxRect(ctx, sx(148), sy(216), sw(10), sw(3), '#111827');

      this.pxRect(ctx, sx(310), sy(236), sw(820), sw(354), '#1f212b');
      for (let row = 0; row < 12; row++) {
        this.pxRect(ctx, sx(310), sy(236 + row * 28), sw(820), 1, '#12141c');
      }
      this.pxRect(ctx, sx(302), sy(224), sw(836), sw(16), '#343847');
      // Iconic #10 Black Door + White Fanlight + Lion Knocker
      this.pxRect(ctx, sx(656), sy(404), sw(128), sw(186), '#e5e7eb');
      this.pxRect(ctx, sx(668), sy(415), sw(104), sw(175), '#0e1017');
      this.pxRect(ctx, sx(676), sy(425), sw(88), sw(32), '#f2e8cc');
      this.pxRect(ctx, sx(714), sy(472), sw(12), sw(16), '#ffd23f');
      // White Georgian Sash Windows
      for (let k = 0; k < 6; k++) {
        if (k === 2 || k === 3) continue;
        const wx = sx(356 + k * 130);
        this.pxRect(ctx, wx - sw(4), sy(296), sw(56), sw(94), '#e2e8f0');
        this.pxRect(ctx, wx, sy(300), sw(48), sw(86), '#f5d27a');
        this.pxRect(ctx, wx + sw(22), sy(300), sw(4), sw(86), '#e2e8f0');
        this.pxRect(ctx, wx, sy(342), sw(48), sw(4), '#e2e8f0');
      }
      // Wrought-iron railings & Victorian streetlamps
      this.pxRect(ctx, sx(280), sy(535), sw(360), sw(55), '#101218');
      this.pxRect(ctx, sx(800), sy(535), sw(360), sw(55), '#101218');
      [250, 1170].forEach((lx) => {
        this.pxRect(ctx, sx(lx), sy(380), sw(8), sw(210), '#101218');
        this.pxRect(ctx, sx(lx - 12), sy(352), sw(32), sw(32), T % 16 < 8 ? '#ffe694' : '#ffd23f');
      });
    } else if (stage.id === 'moncloa') {
      // La Moncloa (España) - Sierra de Guadarrama + Tejados Terracota + Pórtico y Jardines
      ctx.fillStyle = '#3b2c4a';
      ctx.beginPath();
      ctx.moveTo(0, sy(gY));
      [[0, 455], [260, 355], [580, 440], [920, 350], [1220, 430], [1440, 380]].forEach(([px, py]) => {
        ctx.lineTo(sx(px), sy(py));
      });
      ctx.lineTo(W, sy(gY));
      ctx.fill();

      this.pxRect(ctx, sx(210), sy(355), sw(1020), sw(235), '#d4c3aa');
      this.pxRect(ctx, sx(200), sy(330), sw(1040), sw(26), '#9c4338');
      this.pxRect(ctx, sx(590), sy(275), sw(260), sw(315), '#e6d6be');
      drawPediment(720, 275, 130, 44, '#d4c3aa', '#9c4338');
      for (let k = 0; k < 4; k++) {
        this.pxRect(ctx, sx(620 + k * 64), sy(292), sw(14), sw(298), '#f4ebd9');
      }
      [145, 255, 1165, 1270].forEach((tx) => {
        this.pxRect(ctx, sx(tx), sy(435), sw(48), sw(115), '#2d5736');
        this.pxRect(ctx, sx(tx + 8), sy(415), sw(32), sw(24), '#3a6e46');
        this.pxRect(ctx, sx(tx + 18), sy(545), sw(12), sw(45), '#5c3c24');
      });
      for (let k = 0; k < 8; k++) {
        if (k === 3 || k === 4) continue;
        this.pxRect(ctx, sx(308 + k * 112), sy(392), sw(40), sw(74), '#333b4d');
        this.pxRect(ctx, sx(314 + k * 112), sy(400), sw(28), sw(58), '#ffd98a');
      }
      this.pxRect(ctx, sx(718), sy(140), sw(4), sw(100), '#e2e8f0');
      drawFlag(sx(722), sy(144), sw(62), sw(38), ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b']);
    } else {
      // Kantei (Japón) - Monte Fuji, Torre de Tokio y Rascacielos Neón + Estructura Kantei
      // Faint Mount Fuji + Tokyo Tower
      ctx.fillStyle = '#111a30';
      ctx.beginPath();
      ctx.moveTo(sx(80), sy(gY));
      ctx.lineTo(sx(220), sy(340));
      ctx.lineTo(sx(280), sy(340));
      ctx.lineTo(sx(420), sy(gY));
      ctx.fill();
      this.pxRect(ctx, sx(216), sy(340), sw(68), sw(24), '#94a3b8');
      // Glowing Tokyo Tower on right horizon
      this.pxRect(ctx, sx(1220), sy(450), sw(72), sw(140), '#3b1526');
      this.pxRect(ctx, sx(1238), sy(310), sw(36), sw(142), '#7f1d1d');
      this.pxRect(ctx, sx(1248), sy(210), sw(16), sw(102), '#ef4444');
      this.pxRect(ctx, sx(1253), sy(196), sw(6), sw(14), T % 20 < 10 ? '#ffffff' : '#ef4444');

      for (let k = 0; k < 10; k++) {
        this.pxRect(ctx, sx(110 + k * 135), sy(210 + (k % 3) * 45), sw(76), sw(380), '#151c2e');
        this.pxRect(ctx, sx(122 + k * 135), sy(230 + (k % 3) * 45), sw(12), sw(12), (T + k * 7) % 50 < 25 ? '#38bdf8' : '#1e3a5f');
      }
      this.pxRect(ctx, sx(340), sy(288), sw(760), sw(302), '#27324a');
      this.pxRect(ctx, sx(365), sy(314), sw(710), sw(256), '#182236');
      for (let k = 0; k < 12; k++) {
        this.pxRect(ctx, sx(380 + k * 58), sy(314), sw(6), sw(256), '#475978');
        if (k % 3 === 0) this.pxRect(ctx, sx(392 + k * 58), sy(340), sw(34), sw(180), 'rgba(56, 189, 248, 0.14)');
      }
      this.pxRect(ctx, sx(320), sy(274), sw(800), sw(16), '#38bdf8');
      this.pxRect(ctx, sx(320), sy(270), sw(800), sw(6), '#e0f2fe');
    }

    // Active Laser Patrol Sweep visual for Kantei / Downing
    if (world.legacyHazards && ['kantei', 'downing'].includes(stage.id) && hzPhase >= 1) {
      const lx = sx(720 + Math.sin(T * 0.04) * 460);
      ctx.fillStyle = hzPhase === 2 ? 'rgba(255, 55, 40, 0.35)' : 'rgba(255, 160, 40, 0.22)';
      ctx.fillRect(lx - sw(20), 0, sw(40), H);
    }
    // Active Side Cannon turrets for Nariño / Mexico / Pizarro / Miraflores
    if (world.legacyHazards && ['narino', 'mexico', 'pizarro', 'miraflores'].includes(stage.id) && hzPhase >= 1) {
      ctx.globalAlpha = hzPhase === 1 && T % 20 < 10 ? 0.45 : 1;
      [0, 1].forEach((side) => {
        const cx = side ? sx(1355) : sx(20);
        this.pxRect(ctx, cx, sy(gY - 4), sw(65), sw(220), '#4a4035');
        this.pxRect(ctx, cx + sw(10), sy(gY - 36), sw(45), sw(18), '#1f222a');
      });
      ctx.globalAlpha = 1;
    }
    // Active Wave Rings for Rosada / Planalto
    if (world.legacyHazards && ['rosada', 'planalto'].includes(stage.id) && hzPhase === 2) {
      for (let k = 0; k < 3; k++) {
        const r = sw(((hzMod + k * 30) % 90) * 7);
        ctx.strokeStyle = 'rgba(255, 238, 160, ' + Math.max(0, 1 - r / W) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx(720), sy(240), r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawIllustratedStage(ctx: CanvasRenderingContext2D, world: WorldRenderContext, night: number) {
    const dayArt = stageArt(world.stage.id, 'day');
    const nightArt = stageArt(world.stage.id, 'night');
    const first = (night === 1 ? nightArt : dayArt) ?? nightArt ?? dayArt;
    if (!first) return false;
    const W = this.pxW;
    const H = this.pxH;
    const drift = (this.camX - 720) * W / 1440 * 0.15;
    const rise = (this.camY - 425) * H / 810 * 0.1;
    const draw = (art: HTMLImageElement) => {
      const zoom = Math.max(W * 1.16 / art.width, H * 1.1 / art.height);
      const w = art.width * zoom, h = art.height * zoom;
      ctx.drawImage(art, (W - w) / 2 - drift, (H - h) / 2 - rise, w, h);
    };
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    draw(first);
    if (first === dayArt && nightArt && night > 0) {
      ctx.globalAlpha = night;
      draw(nightArt);
      ctx.globalAlpha = 1;
    }
    const haze = ctx.createLinearGradient(0, H * 0.35, 0, H);
    haze.addColorStop(0, 'rgba(9, 14, 26, 0)');
    haze.addColorStop(0.6, `rgba(9, 14, 26, ${0.12 + night * 0.10})`);
    haze.addColorStop(1, `rgba(9, 14, 26, ${0.42 + night * 0.10})`);
    ctx.fillStyle = haze;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.restore();
    return true;
  }

  private drawIllustratedPlatform(ctx: CanvasRenderingContext2D, stage: StageDef, night: number,
    x: number, y: number, w: number, h: number, floating = false) {
    if (w <= 0 || h <= 0) return;
    const base = floating ? stage.palette.floatMain : stage.palette.platformMain;
    const ledge = floating ? stage.palette.floatTop : stage.palette.platformTop;
    const bevel = Math.min(this.sw(floating ? 6 : 10), h / 3, w / 5);
    const edge = Math.max(1, this.sw(2));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - bevel);
    ctx.lineTo(x + w - bevel, y + h);
    ctx.lineTo(x + bevel, y + h);
    ctx.lineTo(x, y + h - bevel);
    ctx.closePath();
    ctx.clip();
    const shading = ctx.createLinearGradient(0, y, 0, y + h);
    shading.addColorStop(0, mixHex(ledge, '#516083', night * 0.42));
    shading.addColorStop(0.16, mixHex(base, '#172239', night * 0.40));
    shading.addColorStop(1, mixHex(base, '#080d17', 0.64 + night * 0.10));
    ctx.fillStyle = shading;
    ctx.fillRect(x, y, w, h);
    const art = stageArt(stage.id, night >= 0.5 ? 'night' : 'day');
    if (art) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = floating ? 0.18 : 0.26;
      ctx.drawImage(art, 0, art.height * 0.81, art.width, art.height * 0.17, x, y, w, h);
      ctx.restore();
    }
    ctx.fillStyle = mixHex(ledge, '#9faed3', night * 0.36);
    ctx.fillRect(x, y, w, edge);
    ctx.fillStyle = stage.palette.platformTrim;
    ctx.fillRect(x, y + bevel, w, edge);
    ctx.fillStyle = 'rgba(8, 13, 22, 0.55)';
    ctx.fillRect(x, y + h - edge, w, edge);
    if (!floating) {
      const spacing = Math.max(8, this.sw(84));
      for (let offset = spacing; offset < w; offset += spacing) {
        ctx.fillRect(x + offset, y + bevel * 2, 1, h - bevel * 2);
      }
    }
    ctx.restore();
  }

  private drawArenaHazard(ctx: CanvasRenderingContext2D, world: WorldRenderContext) {
    if (!world.hzPhase) return;
    const hazard = world.stage.hazard;
    const active = world.hzPhase === 2;
    const pulse = 0.65 + Math.sin(world.T * 0.22) * 0.2;
    ctx.save();
    for (const col of stageHazardColumns(hazard, world.T, active ? world.hzMod : 0, world.W)) {
      const x = this.sx(col.x), span = this.sw(col.halfWidth * 2);
      const glow = ctx.createLinearGradient(x - span / 2, 0, x + span / 2, 0);
      const color = col.danger ? '255, 117, 78' : '120, 224, 255';
      glow.addColorStop(0, `rgba(${color}, 0)`);
      glow.addColorStop(0.5, `rgba(${color}, ${pulse * (active ? 0.46 : 0.23)})`);
      glow.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - span / 2, 0, span, this.sy(world.main.y));
      ctx.fillStyle = `rgba(${color}, ${active ? 0.8 : 0.42})`;
      ctx.fillRect(x - span / 2, this.sy(world.main.y) - 3, span, 3);
    }

    if (!active && ['edge-volley', 'alternating-salvo', 'guard-march', 'bell'].includes(hazard)) {
      const sources = hazard === 'bell' ? [world.W / 2] : hazard === 'edge-volley' ? [24, world.W - 24] : [24];
      ctx.strokeStyle = `rgba(255, 200, 101, ${pulse})`;
      ctx.lineWidth = 2;
      for (const x of sources) {
        ctx.beginPath();
        ctx.arc(this.sx(x), this.sy(world.main.y - 34), this.sw(18 + world.T % 24), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (active && hazard === 'lifts') {
      ctx.strokeStyle = `rgba(109, 234, 255, ${pulse})`;
      ctx.lineWidth = 2;
      for (const p of world.plats.filter((_, i, all) => i === 0 || i === all.length - 1)) {
        ctx.strokeRect(this.sx(p.x), this.sy(p.y) - 1, this.sw(p.w), this.sw(16));
      }
    }
    ctx.restore();
  }

  private drawBackgroundCrowd(ctx: CanvasRenderingContext2D, world: WorldRenderContext) {
    const { T, main, stage, crowd, crowdParticles, fighters } = world;
    const sx = (v: number) => this.sx(v);
    const sy = (v: number) => this.sy(v);
    const sw = (v: number) => this.sw(v);

    const FLAG_MAP: Record<string, string[]> = {
      narino: ['#fcd116', '#003893', '#ce1126'],
      blanca: ['#c92424', '#ffffff', '#1c3a8a'],
      miraflores: ['#fcd116', '#00247d', '#cf142b'],
      rosada: ['#74acdf', '#ffffff', '#74acdf'],
      planalto: ['#009c3b', '#ffdf00', '#002776'],
      mexico: ['#006847', '#ffffff', '#ce1126'],
      moneda: ['#ffffff', '#d52b1e', '#0039a6'],
      pizarro: ['#d91023', '#ffffff', '#d91023'],
      eliseo: ['#0055a4', '#ffffff', '#ef4135'],
      downing: ['#012169', '#ffffff', '#c8102e'],
      moncloa: ['#aa151b', '#f1bf00', '#aa151b'],
      kantei: ['#ffffff', '#bc002d', '#ffffff'],
    };
    const stageFlags = FLAG_MAP[stage.id] || ['#ffcc33', '#ffffff', '#38bdf8'];
    const skinTones = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524', '#ffd5b8'];
    const suitTones = ['#232a3d', '#343f5c', '#4b5563', '#3b2d4a', '#1f3b4d', '#5c2b2b'];
    const hairTones = ['#181920', '#4a3121', '#785032', '#d1b575', '#9ca3af'];

    // Track action center for subtle spectator head focus
    const activeFighters = fighters.filter((f) => f.dead <= 0);
    const focusX =
      activeFighters.length > 0
        ? activeFighters.reduce((sum, f) => sum + f.cx, 0) / activeFighters.length
        : main.x + main.w / 2;

    const ex = Math.max(0, Math.min(1, crowd.excitement));
    const cheering = crowd.cheerTimer > 0 || ex > 0.35;
    const ecstatic = crowd.mood === 'win' || crowd.mood === 'ult' || crowd.mood === 'heavy';
    const waveSpeed = ecstatic ? 0.32 : cheering ? 0.22 : 0.08;

    const railX = main.x + 14;
    const railW = main.w - 28;
    const baseY = main.y;

    // 1. Back-row & Front-row 16-bit Pixel Crowd Silhouettes behind the Plaza Balustrade
    const count = 26;
    for (let idx = 0; idx < count; idx++) {
      // Deterministic hash per spectator using crowd.seed
      const h = ((idx * 2654435761 + crowd.seed * 1597334677) >>> 0) % 10000;
      const row = idx % 2; // 0 = back terrace row, 1 = front rail row
      const tPos = (idx + 0.5) / count + ((h % 13) - 6) * 0.002;
      const wx = railX + 16 + tPos * (railW - 32);
      const scaleRow = row === 0 ? 0.86 : 1.0;

      const wave = Math.sin(T * waveSpeed - idx * 0.52 + (h % 7));
      const hopAmp = ecstatic ? (crowd.mood === 'win' ? 8.5 : 6.2) : cheering ? 3.5 : 0.8;
      const jumpOff = Math.max(0, wave) * hopAmp * (0.35 + ex * 0.95);
      const wy = baseY - (row === 0 ? 5 : 1) - jumpOff;

      const p1Col = fighters[0]?.d.palette.accent.base || stage.palette.platformTrim;
      const p2Col = fighters[1]?.d.palette.accent.base || '#38bdf8';
      const isSupporter = h % 5 === 0;
      const coatCol = isSupporter ? (idx < count / 2 ? p1Col : p2Col) : suitTones[h % suitTones.length];
      const skinCol = skinTones[(h >> 2) % skinTones.length];
      const hairCol = hairTones[(h >> 4) % hairTones.length];
      const isFlagBearer = h % 4 === 1;
      const isPress = !isFlagBearer && h % 5 === 2;

      const bodyW = sw(11 * scaleRow);
      const bodyH = sw(15 * scaleRow);
      const headS = sw(7 * scaleRow);
      const px = sx(wx);
      const py = sy(wy);

      // Torso (with subtle darker shade in back row for depth)
      this.pxRect(ctx, px - bodyW / 2 - 1, py - bodyH - 1, bodyW + 2, bodyH + 2, '#0b0e17');
      this.pxRect(ctx, px - bodyW / 2, py - bodyH, bodyW, bodyH, coatCol);
      if (row === 0) {
        this.pxRect(ctx, px - bodyW / 2, py - bodyH, bodyW, bodyH, 'rgba(8, 11, 20, 0.28)');
      }

      // Arms (idle down vs cheering raised!)
      const armPump = cheering ? Math.max(0, Math.sin(T * (waveSpeed * 1.35) + idx * 0.9)) : 0;
      const armW = sw(3 * scaleRow);
      const armH = sw(8 * scaleRow);
      if (cheering || isFlagBearer) {
        const lLift = cheering ? sw((8 + armPump * 6) * scaleRow) : sw(2 * scaleRow);
        const rLift = isFlagBearer ? sw((9 + Math.max(0, wave) * 5) * scaleRow) : lLift;
        // Left cheering arm
        if (cheering) {
          this.pxRect(ctx, px - bodyW / 2 - armW, py - bodyH - lLift + sw(4), armW, armH, coatCol);
          this.pxRect(ctx, px - bodyW / 2 - armW, py - bodyH - lLift + sw(2), armW, sw(3 * scaleRow), skinCol);
        }
        // Right cheering / flag-bearing arm
        if (cheering || isFlagBearer) {
          this.pxRect(ctx, px + bodyW / 2, py - bodyH - rLift + sw(4), armW, armH, coatCol);
          this.pxRect(ctx, px + bodyW / 2, py - bodyH - rLift + sw(2), armW, sw(3 * scaleRow), skinCol);
        }
      }

      // Head & Hair (tracking match midpoint)
      const lookDir = Math.abs(focusX - wx) < 35 ? 0 : focusX > wx ? 1 : -1;
      this.pxRect(ctx, px - headS / 2 - 1, py - bodyH - headS - 1, headS + 2, headS + 2, '#0b0e17');
      this.pxRect(ctx, px - headS / 2, py - bodyH - headS, headS, headS, skinCol);
      this.pxRect(ctx, px - headS / 2, py - bodyH - headS, headS, sw(2.5 * scaleRow), hairCol);
      // Tiny eyes looking toward fighters
      this.pxRect(ctx, px + sw(lookDir * 1.2) - sw(1), py - bodyH - headS + sw(3.5 * scaleRow), sw(1.5), sw(1.5), '#111827');

      // Waving Handheld Flags (react rapidly to heavy hits, ults, and round wins!)
      if (isFlagBearer) {
        const poleX = px + bodyW / 2 + sw(1);
        const poleTopY = py - bodyH - sw((cheering ? 24 : 18) * scaleRow);
        const poleH = sw((cheering ? 18 : 14) * scaleRow);
        this.pxRect(ctx, poleX, poleTopY, sw(1.5), poleH, '#e2e8f0');

        const flagW = sw((ecstatic ? 17 : cheering ? 14 : 10) * scaleRow);
        const flagH = sw((ecstatic ? 11 : cheering ? 9 : 7) * scaleRow);
        const flagColors =
          crowd.mood === 'win' || (ecstatic && idx % 2 === 0)
            ? [crowd.accentColor, crowd.accentHighlight, crowd.accentColor]
            : stageFlags;
        const strips = 4;
        const stripW = flagW / strips;
        const flagOscSpeed = ecstatic ? 0.45 : cheering ? 0.28 : 0.12;
        const flagOscAmp = ecstatic ? 3.0 : cheering ? 2.0 : 0.9;
        for (let s = 0; s < strips; s++) {
          const flutter = Math.sin(T * flagOscSpeed + idx + s * 0.9) * sw(flagOscAmp);
          const bandH = flagH / flagColors.length;
          flagColors.forEach((col, bi) => {
            this.pxRect(
              ctx,
              poleX + sw(1.5) + s * stripW,
              poleTopY + flutter + bi * bandH,
              stripW + 0.6,
              bandH + 0.5,
              col
            );
          });
        }
      } else if (isPress) {
        // Press camera body
        const camY = py - bodyH - sw((cheering ? 5 : 2) * scaleRow);
        this.pxRect(ctx, px - sw(3), camY, sw(6), sw(4), '#111827');
        this.pxRect(ctx, px - sw(1), camY + sw(1), sw(2), sw(2), '#94a3b8');
      }
    }

    // 2. Palace Balustrade / Press Rail framing the crowd cleanly above the fighting deck
    const rX = sx(railX);
    const rY = sy(baseY - 10);
    const rW = sw(railW);
    this.pxRect(ctx, rX, rY, rW, sw(2.5), stage.palette.platformTop);
    this.pxRect(ctx, rX, rY + sw(2.5), rW, sw(1.5), 'rgba(9, 11, 18, 0.55)');
    for (let pxOff = 0; pxOff <= railW; pxOff += 44) {
      this.pxRect(ctx, sx(railX + pxOff), rY + sw(2.5), sw(3), sw(8), stage.palette.platformMain);
    }

    // 3. Reactive Crowd Particles (Confetti, Camera Flashes, Cheer Sparks & Victory Pennants)
    for (const pt of crowdParticles) {
      const ratio = Math.max(0, pt.l / pt.m);
      const px = sx(pt.x);
      const py = sy(pt.y);
      const pz = Math.max(1.5, sw(pt.size));

      ctx.save();
      if (pt.kind === 'flash') {
        ctx.globalAlpha = ratio;
        const arm = pz * (0.7 + ratio * 1.1);
        this.pxRect(ctx, px - arm, py - 1, arm * 2, 2, '#ffffff');
        this.pxRect(ctx, px - 1, py - arm, 2, arm * 2, '#ffffff');
        this.pxRect(ctx, px - pz * 0.5, py - pz * 0.5, pz, pz, pt.col);
      } else if (pt.kind === 'cheer') {
        ctx.globalAlpha = Math.min(1, ratio * 1.35);
        this.pxRect(ctx, px - pz * 0.6, py - pz * 0.2, pz * 1.2, pz * 0.4, pt.col);
        this.pxRect(ctx, px - pz * 0.2, py - pz * 0.6, pz * 0.4, pz * 1.2, pt.col);
        this.pxRect(ctx, px - pz * 0.2, py - pz * 0.2, pz * 0.4, pz * 0.4, '#ffffff');
      } else if (pt.kind === 'pennant') {
        ctx.globalAlpha = Math.min(1, ratio * 1.25);
        const flutter = Math.sin(pt.phase + (pt.m - pt.l) * pt.spin) * pz * 0.45;
        this.pxRect(ctx, px - pz * 0.8, py - pz * 0.25, pz * 1.6, pz * 0.5, pt.col);
        this.pxRect(ctx, px + pz * 0.4, py + flutter - pz * 0.2, pz * 0.7, pz * 0.4, '#ffffff');
      } else {
        // Spinning fluttering confetti
        ctx.globalAlpha = Math.min(1, ratio * 1.5);
        const spinW = Math.max(1.2, Math.abs(Math.cos(pt.phase + (pt.m - pt.l) * pt.spin)) * pz);
        this.pxRect(ctx, px - spinW / 2, py - pz * 0.35, spinW, pz * 0.7, pt.col);
      }
      ctx.restore();
    }
  }

  private renderLightingPass(ctx: CanvasRenderingContext2D, world: WorldRenderContext) {
    const W = this.pxW;
    const H = this.pxH;
    const lCtx = this.lightCtx;
    const sx = (v: number) => this.sx(v);
    const sy = (v: number) => this.sy(v);
    const sw = (v: number) => this.sw(v);

    const drawGlow = (x: number, y: number, r: number, col: string, alpha: number) => {
      const grad = lCtx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.save();
      lCtx.globalAlpha = alpha;
      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.arc(x, y, r, 0, Math.PI * 2);
      lCtx.fill();
      lCtx.restore();
    };

    lCtx.clearRect(0, 0, W, H);
    lCtx.globalCompositeOperation = 'lighter';

    for (const f of world.fighters) {
      if (f.dead > 0) continue;
      const accentHi = f.d.palette.accent.highlight || '#ffd23f';
      const accentBase = f.d.palette.accent.base || '#38bdf8';
      if (f.shootRecoil > 1) {
        drawGlow(sx(f.cx + f.face * 28), sy(f.y + f.h * 0.42), sw(56), '#ffbe42', 0.56);
      }
      if (f.floating) {
        drawGlow(sx(f.cx), sy(f.y + f.h * 0.72), sw(52), accentHi, 0.34);
        drawGlow(sx(f.cx + f.face * 18), sy(f.y + f.h * 0.25), sw(34), accentBase, 0.32);
      }
      if (f.dashT > 0) {
        drawGlow(sx(f.cx), sy(f.y + f.h * 0.5), sw(44), accentHi, 0.28);
      }
      if (f.atk) {
        const isActive = f.atk.spec.ph.some((ph) => f.atk!.t >= ph.a[0] && f.atk!.t <= ph.a[1]);
        if (isActive && (f.atk.spec.heavy || f.d.anatomy.weaponType === 'saber' || f.d.anatomy.weaponType === 'staff')) {
          drawGlow(sx(f.cx + f.face * 26), sy(f.y + f.h * 0.44), sw(f.atk.spec.heavy ? 64 : 46), accentHi, f.atk.spec.heavy ? 0.38 : 0.26);
        }
      }
      if (f.vote >= 100 || f.winning) {
        drawGlow(sx(f.cx), sy(f.y + f.h * 0.45), sw(f.winning ? 62 : 50), f.winning ? accentHi : '#ffd23f', f.winning ? 0.34 : 0.26);
      }
    }

    for (const p of world.projectiles) {
      if (p.kind === 'bullet' || p.kind === 'rocket' || p.kind === 'pulse' || p.kind === 'sonic' || p.kind === 'bars') {
        const col = p.kind === 'pulse' ? p.ownerHighlight || p.ownerColor || '#25d999' : p.kind === 'bars' ? '#7dd3fc' : '#ff9f2e';
        drawGlow(sx(p.x + p.w / 2), sy(p.y + p.h / 2), sw(p.kind === 'pulse' ? 54 : 42), col, p.kind === 'pulse' ? 0.52 : 0.44);
      }
    }

    for (const pt of world.particles) {
      if ((pt.ex || pt.shape === 'diamond' || pt.shape === 'streak') && pt.l / pt.m > 0.32) {
        drawGlow(sx(pt.x), sy(pt.y), sw(pt.z * (pt.ex ? 2.8 : 2.2)), pt.ex ? '#ff8820' : pt.col, pt.ex ? 0.26 : 0.18);
      }
    }

    ctx.save();
    ctx.fillStyle = world.stage.palette.ambientTint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(this.lightCanvas, 0, 0);
    ctx.restore();
  }

  renderWorld(targetCanvas: HTMLCanvasElement, world: WorldRenderContext, cfg: GameConfig) {
    this.syncBufferSize(cfg);
    this.updateCamera(world);
    const ctx = this.offCtx;
    const W = this.pxW;
    const H = this.pxH;
    const sx = (v: number) => this.sx(v);
    const sy = (v: number) => this.sy(v);
    const sw = (v: number) => this.sw(v);

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (world.cine) {
      const z = 1 + Math.min(world.cine.t, 24) * 0.006;
      const zx = sx(world.cine.f.cx);
      const zy = sy(world.cine.f.y + world.cine.f.h * 0.45);
      ctx.translate(zx, zy);
      ctx.scale(z, z);
      ctx.translate(-zx, -zy);
    }
    if (world.shake > 0) {
      const amt = world.shake * cfg.video.shakeIntensity * (W / 960);
      ctx.translate(Math.round((Math.random() - 0.5) * amt * 2), Math.round((Math.random() - 0.5) * amt * 2));
    }

    const night = stageNightMix(cfg.video.stageTime, world.T, world.stageNightStart);
    const illustrated = this.drawIllustratedStage(ctx, world, night);
    if (!illustrated) this.drawStageBackground(ctx, world);
    ctx.save();
    if (illustrated) ctx.globalAlpha = 0.58;
    this.drawBackgroundCrowd(ctx, world);
    ctx.restore();
    if (!world.legacyHazards) this.drawArenaHazard(ctx, world);

    // Main Platform (Ornate 16-bit Palace Stone Pedestal with Chromatic Smart Outline)
    const M = world.main;
    const mx = sx(M.x);
    const my = sy(M.y);
    const mw = sw(M.w);
    const mh = sw(M.h);
    const mainOutline = tintOutlineHex(world.stage.palette.platformMain, 0.3);
    const floatOutline = tintOutlineHex(world.stage.palette.floatMain, 0.28);
    if (illustrated) {
      this.drawIllustratedPlatform(ctx, world.stage, night, mx, my, mw, mh);
      for (const p of world.plats) {
        this.drawIllustratedPlatform(ctx, world.stage, night, sx(p.x), sy(p.y), sw(p.w), sw(16), true);
      }
    } else {
      this.pxRect(ctx, mx - 1, my - 1, mw + 2, mh + 2, mainOutline);
      this.pxRect(ctx, mx, my, mw, mh, world.stage.palette.platformMain);
      this.pxRect(ctx, mx, my + mh - sw(14), mw, sw(14), tintOutlineHex(world.stage.palette.platformMain, 0.46));
      this.pxRect(ctx, mx, my, mw, sw(10), world.stage.palette.platformTop);
      this.pxRect(ctx, mx, my, mw, sw(2), 'rgba(255, 255, 255, 0.28)');
      this.pxRect(ctx, mx, my + sw(10), mw, sw(4), world.stage.palette.platformTrim);
      // Corner stone pilasters
      this.pxRect(ctx, mx, my + sw(14), sw(18), mh - sw(14), 'rgba(12, 16, 28, 0.2)');
      this.pxRect(ctx, mx + mw - sw(18), my + sw(14), sw(18), mh - sw(14), 'rgba(12, 16, 28, 0.2)');
      // Dentil studs & vertical masonry joints
      for (let k = 1; k * 56 < M.w; k++) {
        this.pxRect(ctx, sx(M.x + k * 56), my + sw(14), 1, mh - sw(14), mainOutline);
        this.pxRect(ctx, sx(M.x + k * 56) - sw(5), my + sw(16), sw(10), sw(4), world.stage.palette.platformTop);
      }

      // Floating Platforms (Beveled Multi-Layer Pedestals with Chromatic Smart Outlines)
      for (const p of world.plats) {
        const px = sx(p.x);
        const py = sy(p.y);
        const pw = sw(p.w);
        this.pxRect(ctx, px - 1, py - 1, pw + 2, sw(15) + 2, floatOutline);
        this.pxRect(ctx, px, py, pw, sw(15), world.stage.palette.floatMain);
        this.pxRect(ctx, px, py, pw, sw(5), world.stage.palette.floatTop);
        this.pxRect(ctx, px, py + sw(5), pw, sw(2), world.stage.palette.platformTrim);
        // Support end brackets
        this.pxRect(ctx, px + sw(8), py + sw(15), sw(12), sw(5), floatOutline);
        this.pxRect(ctx, px + pw - sw(20), py + sw(15), sw(12), sw(5), floatOutline);
        this.pxRect(ctx, px + sw(10), py + sw(15), sw(8), sw(3), world.stage.palette.floatMain);
        this.pxRect(ctx, px + pw - sw(18), py + sw(15), sw(8), sw(3), world.stage.palette.floatMain);
      }

    }

    // Pickups (Chromatic Smart Outlines)
    for (const it of world.items) {
      const ix = sx(it.x);
      const iy = sy(it.y);
      const iw = sw(it.w);
      const ih = sw(it.h);
      const bob = Math.round(Math.sin(world.T * 0.14) * 2);
      const itemOut = it.kind === 'mg' ? '#3a2b0d' : it.kind === 'rocket' ? '#1c2b18' : '#1b2236';
      this.pxRect(ctx, ix - 1, iy - 1 + bob, iw + 2, ih + 2, itemOut);
      if (it.kind === 'mg') {
        this.pxRect(ctx, ix, iy + bob, iw, ih, '#2d3748');
        this.pxRect(ctx, ix + 2, iy + 2 + bob, iw - 4, ih - 4, '#d9a426');
        this.pxRect(ctx, ix + 4, iy + 4 + bob, iw - 8, 3, '#fff3a0');
      } else if (it.kind === 'rocket') {
        this.pxRect(ctx, ix, iy + bob, iw, ih, '#384c2e');
        this.pxRect(ctx, ix + 2, iy + 2 + bob, iw - 4, ih - 4, '#e0422d');
      } else {
        this.pxRect(ctx, ix, iy + bob, iw, ih, '#272935');
        this.pxRect(ctx, ix + sw(8), iy + sw(4) + bob, sw(10), sw(5), '#ffd23f');
      }
    }

    if (world.cine) {
      ctx.fillStyle = world.cine.flash && world.cine.t < 3 ? 'rgba(255, 243, 207, 0.48)' : 'rgba(6, 8, 15, 0.72)';
      ctx.fillRect(-30, -30, W + 60, H + 60);
    }
    if (world.telegraph) {
      const { t, duration, ultimateId, aim, zones } = world.telegraph;
      const blink = t % 6 < 3;
      const aimBox = zones[0];
      if (ultimateId === 'ult_simo' && aim && aimBox) {
        ctx.save();
        ctx.strokeStyle = '#91e8ff';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx(aim.x), sy(aim.y));
        ctx.lineTo(sx(aimBox.x + aimBox.w / 2), sy(aimBox.y + aimBox.h / 2));
        ctx.stroke();
        ctx.restore();
      } else if (ultimateId === 'ult_ricaurte' && aimBox) {
        const fuse = Math.max(0, 1 - t / (duration ?? 39));
        const x = sx(aimBox.x + aimBox.w / 2);
        const y = sy(aimBox.y + aimBox.h / 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y, sw(28), -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * fuse);
        ctx.stroke();
        this.pxRect(ctx, x - 2, y - 2, 4, 4, blink ? '#fff3a0' : '#ef4444');
      }
      for (const z of world.telegraph.zones) {
        ctx.fillStyle = blink ? 'rgba(255, 36, 36, 0.36)' : 'rgba(255, 36, 36, 0.16)';
        ctx.fillRect(sx(z.x), sy(z.y), sw(z.w), sw(z.h));
        ctx.strokeStyle = '#ff3838';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx(z.x), sy(z.y), sw(z.w), sw(z.h));
      }
    }

    // 16-Bit CPS-1 Sprites scaled proportionally to dynamic Smash camera!
    const pxScale = (92 / 74) * this.camZoom * (W / 1440);
    for (const f of world.fighters) {
      // A short KO vignette at the platform edge. The lost fighter is already out of play.
      if (f.dead > 0 && f.koVisual && world.T - f.koVisual.tick < 29) {
        ctx.save();
        ctx.translate(sx(f.koVisual.x), sy(world.main.y));
        ctx.globalAlpha = Math.min(1, (29 - world.T + f.koVisual.tick) / 8);
        paintSprite(ctx, f.d, 'defeat', world.T - f.koVisual.tick, f.face, pxScale);
        ctx.restore();
        continue;
      }
      if (world.cine?.f === f) {
        ctx.save();
        ctx.translate(sx(f.cx), sy(f.y + f.h));
        const drawn = paintSprite(ctx, f.d, 'ultimate', world.cine.t, f.face, pxScale);
        ctx.restore();
        if (drawn) continue;
      }
      this.drawAnatomicalCharacter(ctx, f, world.T, pxScale, sx(f.cx), sy(f.y + f.h), cfg.video.pixelOutlines, f.pi);
    }

    ctx.save();
    ctx.translate(sx(0),sy(0)); ctx.scale(this.camZoom*W/1440,this.camZoom*H/810);
    for (const f of world.fighters) drawEffects(ctx,f);
    for (const box of world.strikes) {
      drawStrike(ctx, box);
      if (box.highlight) {
        ctx.save();
        ctx.globalAlpha = .55;
        ctx.strokeStyle = box.highlight;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo((box.direction ?? 1) > 0 ? box.x : box.x + box.w, box.y + box.h * .8);
        ctx.quadraticCurveTo(box.x + box.w / 2, box.y - box.h * .35,
          (box.direction ?? 1) > 0 ? box.x + box.w : box.x, box.y + box.h * .2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    if (cfg.video.showHitboxes) {
      ctx.strokeStyle = '#38f878';
      ctx.lineWidth = 1;
      for (const f of world.fighters) {
        if (f.dead <= 0) ctx.strokeRect(sx(f.x), sy(f.y), sw(f.w), sw(f.h));
      }
      ctx.strokeStyle = '#ff3b3b';
      for (const hb of world.hitboxes) {
        ctx.strokeRect(sx(hb.x), sy(hb.y), sw(hb.w), sw(hb.h));
      }
    }

    for (const u of world.ults) {
      ctx.save();
      this.drawUltEffect(ctx, u, world.T, world.main);
      ctx.restore();
    }

    // Projectiles (Hadouken Energy Waves, Bullets, Rockets, Walls)
    for (const pr of world.projectiles) {
      const px = sx(pr.x);
      const py = sy(pr.y);
      const pw = sw(pr.w);
      const ph = sw(pr.h);
      ctx.save();
      ctx.translate(px,py);ctx.scale(pw/pr.w,ph/pr.h);
      const drawn=drawShot(ctx,{...pr,x:0,y:0});
      ctx.restore();
      if (drawn) continue;
      if (pr.kind === 'bullet') {
        this.pxRect(ctx, px - pr.dir * sw(9), py, pw + sw(9), ph, 'rgba(255, 160, 40, 0.45)');
        this.pxRect(ctx, px - pr.dir * sw(4), py, pw + sw(4), ph, '#ff9d2e');
        this.pxRect(ctx, px, py, pw, ph, '#fffce0');
      } else if (pr.kind === 'rocket') {
        this.pxRect(ctx, px, py, pw, ph, '#415c36');
        this.pxRect(ctx, pr.vx > 0 ? px + pw - sw(5) : px, py, sw(5), ph, '#ff452e');
        this.pxRect(ctx, pr.vx > 0 ? px - sw(4) : px + pw, py + 1, sw(4), ph - 2, '#ffd43b');
      } else if (pr.kind === 'wall') {
        this.pxRect(ctx, px, py, pw, ph, '#9e3e28');
        for (let r = 0; r < pr.h; r += 14) {
          this.pxRect(ctx, px, sy(pr.y + r), pw, 1, '#541b0e');
        }
      } else if (pr.kind === 'bars') {
        for (let k = 0; k < 4; k++) {
          this.pxRect(ctx, sx(pr.x + k * 10), py, sw(4), ph, '#b8c4d4');
          this.pxRect(ctx, sx(pr.x + k * 10), py, sw(1), ph, '#ffffff');
        }
      } else if (pr.kind === 'pulse') {
        // Capcom CPS-1 Hadouken-Style Multi-Ring Pixel Energy Wave!
        const outerCol = pr.ownerColor || '#25d999';
        const hiCol = pr.ownerHighlight || '#98ffe0';
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const rad = Math.max(4, Math.round(Math.min(pw, ph) * 0.55));
        // Trailing pixel comet wisps
        for (let t = 0; t < 4; t++) {
          const jitter = ((world.T + t * 3) % 5) - 2;
          const tailX = cx - pr.dir * (rad + t * sw(5));
          this.pxRect(ctx, tailX - sw(3), cy + jitter - ph * 0.2, sw(6), ph * 0.4, outerCol);
          this.pxRect(ctx, tailX - sw(1), cy + jitter - ph * 0.1, sw(3), ph * 0.2, hiCol);
        }
        // Dithered energy sphere
        this.pxRect(ctx, cx - rad, cy - rad + 1, rad * 2, rad * 2 - 2, outerCol);
        this.pxRect(ctx, cx - rad + 1, cy - rad, rad * 2 - 2, rad * 2, outerCol);
        this.pxRect(ctx, cx - rad * 0.65, cy - rad * 0.65, rad * 1.3, rad * 1.3, hiCol);
        this.pxRect(ctx, cx + pr.dir * 1 - rad * 0.35, cy - rad * 0.35, rad * 0.7, rad * 0.7, '#ffffff');
      } else if (pr.kind === 'sonic') {
        this.pxRect(ctx, px, py, pw, ph, '#ffd45e');
        this.pxRect(ctx, px + 2, py + 2, pw - 4, ph - 4, '#ffffff');
      } else if (pr.kind === 'shock') {
        this.pxRect(ctx, px, py + ph / 2, pw, ph / 2, '#9c6c3c');
        this.pxRect(ctx, px + pw * 0.25, py, pw * 0.5, ph, '#d9a466');
      } else {
        this.pxRect(ctx, px, py, pw, ph, pr.w2 === 'case' ? '#252730' : '#f0c622');
      }
    }

    // Dynamic Multi-Shape Fade-Out Particles (never flat static blocks!)
    for (const pt of world.particles) {
      const ratio = clamp(pt.l / Math.max(1, pt.m), 0, 1);
      const px = sx(pt.x);
      const py = sy(pt.y);
      const pz = Math.max(1, Math.round((pt.z * W) / 960));
      if (pt.ex) {
        const fade = ratio < 0.4 ? ratio / 0.4 : 1;
        ctx.globalAlpha = fade;
        const col = ratio > 0.72 ? '#fff7b0' : ratio > 0.48 ? '#ffc024' : ratio > 0.24 ? '#ff5912' : '#4a3d52';
        const rad = Math.max(1, Math.round(pz * (0.45 + Math.sin(ratio * Math.PI * 0.85) * 0.85)));
        this.pxRect(ctx, px - rad / 2 - 1, py - rad / 2 - 1, rad + 2, rad + 2, tintOutlineHex(col, 0.34));
        this.pxRect(ctx, px - rad / 2, py - rad / 2, rad, rad, col);
      } else if (pt.mag) {
        ctx.globalAlpha = Math.min(1, ratio * 2);
        this.pxRect(ctx, px, py, Math.max(2, Math.round(3 * (W / 480))), Math.max(3, Math.round(5 * (W / 480))), '#38bdf8');
      } else if (pt.shell) {
        ctx.globalAlpha = Math.min(1, ratio * 2);
        this.pxRect(ctx, px, py, Math.max(1, Math.round(2 * (W / 480))), Math.max(1, Math.round(1 * (W / 480))), '#ffd43b');
      } else if (pt.dust || pt.shape === 'puff') {
        const expand = 0.75 + (1 - ratio) * 0.7;
        const dz = Math.max(1, Math.round(pz * expand));
        ctx.globalAlpha = ratio * ratio * 0.62;
        this.pxRect(ctx, px - dz / 2, py - dz / 2, dz, dz, pt.col);
        this.pxRect(ctx, px - dz * 0.3, py - dz * 0.3, Math.max(1, dz * 0.6), Math.max(1, dz * 0.6), '#ffffff');
      } else if (pt.shape === 'streak') {
        // Velocity-aligned luminous slash/energy trail with smooth fade-out
        ctx.save();
        ctx.globalAlpha = Math.pow(ratio, 0.75);
        const ang = Math.atan2(pt.vy, pt.vx);
        const len = Math.max(pz * 2, Math.round((Math.hypot(pt.vx, pt.vy) * 1.9 + pz * 2) * ratio * (W / 960)));
        const thick = Math.max(1, Math.round(pz * 0.55 * (0.4 + ratio * 0.6)));
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = pt.col;
        ctx.fillRect(-len / 2, -thick / 2, len, thick);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-len * 0.3, -Math.max(1, thick * 0.35), len * 0.6, Math.max(1, thick * 0.6));
        ctx.restore();
      } else if (pt.shape === 'diamond') {
        // 4-point star sparkle that shrinks & fades cleanly
        const dz = Math.max(1, Math.round(pz * (0.45 + ratio * 0.85)));
        ctx.globalAlpha = Math.pow(ratio, 0.7);
        this.pxRect(ctx, px - dz, py - 1, dz * 2, 2, pt.col);
        this.pxRect(ctx, px - 1, py - dz, 2, dz * 2, pt.col);
        this.pxRect(ctx, px - 1, py - 1, 2, 2, '#ffffff');
      } else {
        // Size-easing spark with white-hot core
        const sz = Math.max(1, Math.round(pz * (0.35 + ratio * 0.75)));
        ctx.globalAlpha = Math.pow(ratio, 0.85);
        this.pxRect(ctx, px - sz / 2, py - sz / 2, sz, sz, pt.col);
        if (sz >= 3 && ratio > 0.45) {
          this.pxRect(ctx, px - 1, py - 1, 1, 1, '#ffffff');
        }
      }
    }
    ctx.globalAlpha = 1;

    if (cfg.video.dynamicLighting) {
      this.renderLightingPass(ctx, world);
    }

    const ui = H / 540;
    if (world.cine) {
      const k = Math.min(1, world.cine.t / 8);
      const u = world.cine.f.d.ult;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.14);
      ctx.fillStyle = world.cine.f.d.palette.accent.base;
      ctx.fillRect(-W * k, -58 * ui, W * 2 * k, 116 * ui);
      ctx.fillStyle = '#090b14';
      ctx.fillRect(-W * k, -46 * ui, W * 2 * k, 92 * ui);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(32 * ui)}px "Chakra Petch", system-ui`;
      ctx.fillText((world.cine.name ?? world.cine.f.d.legacyUltimateName ?? u.name).toUpperCase(), (1 - k) * -150, -4 * ui, W * .9);
      ctx.fillStyle = world.cine.f.d.palette.accent.highlight;
      ctx.font = `bold ${Math.round(20 * ui)}px "Chakra Petch", system-ui`;
      ctx.fillText(`«${u.cry}»`, (1 - k) * 150, 26 * ui);
      ctx.restore();
    }

    if (world.bannerMsg.l > 0) {
      const sc = Math.min(1, (world.bannerMsg.m - world.bannerMsg.l) / 8);
      this.drawArcadeText(ctx, world.bannerMsg.t, W / 2, H * 0.36, Math.round((26 + 26 * sc) * ui));
    }
    for (const ft of world.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.l / 20);
      this.drawArcadeText(ctx, ft.t, sx(ft.x), sy(ft.y - (ft.m - ft.l) * 0.5), Math.round(Math.max(12, sw(22))));
      ctx.restore();
    }
    if (world.winnerPi !== null) {
      this.drawArcadeText(ctx, 'KO!', W / 2, H * 0.52, Math.round(68 * ui));
    }

    ctx.restore();

    const dCtx = targetCanvas.getContext('2d');
    if (dCtx) {
      dCtx.imageSmoothingEnabled = false;
      dCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      dCtx.drawImage(this.offCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
  }

  private drawArcadeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = `900 ${Math.max(10, size)}px "Chakra Petch", Impact, system-ui`;
    ctx.lineWidth = Math.max(2, Math.round(size / 5));
    ctx.strokeStyle = '#07090f';
    ctx.strokeText(text, Math.round(x), Math.round(y));
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  private drawUltEffect(ctx: CanvasRenderingContext2D, u: RenderUltEffect, T: number, main: { x: number; y: number; w: number; h: number }) {
    const sx = (v: number) => this.sx(v);
    const sy = (v: number) => this.sy(v);
    const sw = (v: number) => this.sw(v);

    const special = u.specialized;
    if (special) {
      const { ultimate, origin, point, box, active } = special;
      const { spec, profile } = ultimate;
      const [primary, highlight] = spec.colors;
      const x = sx(point.x);
      const y = sy(point.y);
      const rx = sw(box.w) / 2;
      const ry = sw(box.h) / 2;
      ctx.save();
      ctx.globalAlpha = active ? .75 : .24;
      ctx.strokeStyle = highlight;
      ctx.fillStyle = primary;
      ctx.lineWidth = Math.max(1, sw(active ? 5 : 2));
      if (spec.pattern === 'five_point_star_aerial_cuts_tricolor') {
        const colors = [primary, '#2563eb', highlight];
        for (let i = 1; i < profile.route.length; i++) {
          const start = ultimatePoint(ultimate, origin, (i - 1) / (profile.route.length - 1));
          const end = ultimatePoint(ultimate, origin, i / (profile.route.length - 1));
          ctx.strokeStyle = colors[(i - 1) % colors.length];
          ctx.beginPath();
          ctx.moveTo(sx(start.x), sy(start.y));
          ctx.lineTo(sx(end.x), sy(end.y));
          ctx.stroke();
        }
        ctx.strokeStyle = highlight;
      } else if (profile.route.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < profile.route.length; i++) {
          const node = ultimatePoint(ultimate, origin, i / (profile.route.length - 1));
          if (i === 0) ctx.moveTo(sx(node.x), sy(node.y));
          else ctx.lineTo(sx(node.x), sy(node.y));
        }
        ctx.stroke();
      }
      // The authored VFX key fixes the mote pattern for every replay and client.
      let motif = 0;
      for (let i = 0; i < spec.vfxKey.length; i++) motif = (Math.imul(motif, 31) + spec.vfxKey.charCodeAt(i)) >>> 0;
      if (active) {
        const count = 3 + motif % 6;
        for (let i = 0; i < count; i++) {
          const angle = (motif % 360) * Math.PI / 180 + i * 2 * Math.PI / count + u.t * .045;
          const orbit = .6 + .17 * Math.sin(u.t * .15 + i);
          const size = 2 + ((motif >>> (i * 3)) & 3);
          this.pxRect(ctx, x + Math.cos(angle) * rx * orbit, y + Math.sin(angle) * ry * orbit,
            size, size, i % 2 ? primary : highlight);
        }
      }
      if (spec.id === 'ult_nyerere') {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(x, y, rx * (.53 + i * .23), ry * (.53 + i * .23), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (spec.id === 'ult_macron') {
        ctx.fillStyle = highlight;
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6 - Math.PI / 2;
          this.pxRect(ctx, x + Math.cos(angle) * rx - 2, y + Math.sin(angle) * ry - 2, 4, 4, highlight);
        }
        ctx.fillStyle = primary;
      }
      ctx.beginPath();
      if (profile.shape === 'orb' || profile.shape === 'ring') {
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      } else if (profile.shape === 'slash') {
        ctx.moveTo(x - rx, y + ry);
        ctx.quadraticCurveTo(x + rx * .3, y - ry, x + rx, y - ry * .76);
        ctx.quadraticCurveTo(x + rx * .4, y + ry * .42, x - rx, y + ry);
      } else if (profile.shape === 'beam') {
        ctx.moveTo(x, y - ry);
        ctx.lineTo(x + rx, y - ry * .64);
        ctx.lineTo(x + rx * .52, y + ry);
        ctx.lineTo(x - rx * .52, y + ry);
        ctx.lineTo(x - rx, y - ry * .64);
        ctx.closePath();
      } else if (profile.shape === 'ground') {
        ctx.moveTo(x - rx, y + ry);
        ctx.lineTo(x - rx * .55, y - ry);
        ctx.lineTo(x + rx * .34, y - ry * .7);
        ctx.lineTo(x + rx, y + ry);
        ctx.closePath();
      } else {
        ctx.rect(x - rx, y - ry, rx * 2, ry * 2);
      }
      ctx.globalAlpha *= .36;
      ctx.fill();
      ctx.globalAlpha = active ? .92 : .38;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (u.kind === 'muralla' && u.ty != null) {
      const X0 = sx(720 - 80);
      const y = sy(u.ty);
      this.pxRect(ctx, X0, y, sw(160), sw(540), '#e0b024');
      this.pxRect(ctx, X0, y, sw(18), sw(540), '#fff3a0');
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < 3; c++) {
          this.pxRect(ctx, X0 + sw(22 + c * 46), y + sw(24 + r * 36), sw(26), sw(20), '#785a10');
        }
      }
    } else if (u.kind === 'libertario' && u.tr) {
      for (let k = 1; k < u.tr.length; k++) {
        ctx.strokeStyle = k % 2 ? '#ffd400' : '#11141c';
        ctx.lineWidth = sw(12);
        ctx.beginPath();
        ctx.moveTo(sx(u.tr[k - 1].x), sy(u.tr[k - 1].y));
        ctx.lineTo(sx(u.tr[k].x), sy(u.tr[k].y));
        ctx.stroke();
      }
    } else if (u.kind === 'barrotes' && u.lx != null && u.ly != null) {
      const t = u.t;
      if (t < 45) {
        ctx.strokeStyle = t % 6 < 3 ? '#ff3b3b' : 'rgba(255,40,40,0.5)';
        ctx.lineWidth = sw(3);
        ctx.beginPath();
        ctx.moveTo(sx(u.lx), 0);
        ctx.lineTo(sx(u.lx), sy(u.ly));
        ctx.stroke();
      } else if (!u.ex && u.cy != null) {
        this.pxRect(ctx, sx(u.lx - 55), sy(u.cy), sw(110), sw(130), '#8e9fb0');
        for (let k = 0; k < 6; k++) {
          this.pxRect(ctx, sx(u.lx - 50 + k * 18), sy(u.cy + 8), sw(6), sw(114), '#1a2230');
        }
      } else if (u.et != null) {
        const r = sw((t - u.et) * 12);
        ctx.fillStyle = 'rgba(255, 175, 45, 0.55)';
        ctx.beginPath();
        ctx.arc(sx(u.lx), sy(u.ly), r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (u.kind === 'pulso' && u.bx) {
      for (const x of u.bx) {
        this.pxRect(ctx, sx(x - 30), 0, sw(60), this.pxH, 'rgba(24, 212, 140, 0.45)');
        this.pxRect(ctx, sx(x - 16), 0, sw(32), this.pxH, 'rgba(255, 224, 64, 0.72)');
        this.pxRect(ctx, sx(x - 7), 0, sw(14), this.pxH, '#ffffff');
      }
    } else if (u.kind === 'tigre' && u.tx != null) {
      const d = u.f.face;
      const cx = sx(u.tx);
      const cy = sy(main.y - 80);
      this.pxRect(ctx, cx - sw(95), cy - sw(35), sw(190), sw(70), 'rgba(255, 195, 36, 0.65)');
      this.pxRect(ctx, cx + d * sw(70), cy - sw(55), sw(55), sw(55), '#ffe066');
      this.pxRect(ctx, cx + d * sw(95), cy - sw(38), sw(8), sw(8), '#ffffff');
    } else if (u.kind === 'lenador' && u.tx != null) {
      const d = u.f.face;
      ctx.save();
      ctx.translate(sx(u.tx), sy(main.y));
      ctx.scale(d, 1);
      this.pxRect(ctx, -sw(170), -sw(70), sw(230), sw(60), '#171922');
      this.pxRect(ctx, sw(60), -sw(96), sw(80), sw(86), '#171922');
      this.pxRect(ctx, sw(70), -sw(110), sw(60), sw(14), '#b82525');
      this.pxRect(ctx, sw(100), -sw(88), sw(14), sw(14), '#ffd24a');
      ctx.restore();
    } else if (u.kind === 'libertador' && u.m) {
      for (const m of u.m) {
        const col = ['#fcd116', '#38bdf8', '#ce1126'][m.k % 3];
        ctx.strokeStyle = col;
        ctx.lineWidth = sw(14);
        ctx.beginPath();
        if (u.f.face > 0) ctx.arc(sx(m.x), sy(m.y), sw(65), -1.1, 1.1);
        else ctx.arc(sx(m.x), sy(m.y), sw(65), Math.PI - 1.1, Math.PI + 1.1);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = sw(4);
        ctx.beginPath();
        if (u.f.face > 0) ctx.arc(sx(m.x), sy(m.y), sw(65), -0.8, 0.8);
        else ctx.arc(sx(m.x), sy(m.y), sw(65), Math.PI - 0.8, Math.PI + 0.8);
        ctx.stroke();
      }
    } else if (u.kind === 'sabio' && u.r != null && u.cx != null && u.cy != null) {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = sw(6);
      ctx.fillStyle = 'rgba(255, 200, 45, 0.35)';
      ctx.beginPath();
      ctx.arc(sx(u.cx), sy(u.cy), sw(u.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    void T;
  }
}

// Standalone Live Character Studio Preview Renderer (Crisp 112x112 1:1 CPS-1 Pixel Buffer!)
const previewRenderer = new PixelRenderer();
const previewOff = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (previewOff) {
  previewOff.width = 112;
  previewOff.height = 112;
}

export function renderCharacterPreview(
  targetCanvas: HTMLCanvasElement,
  d: PresidentData,
  anim: PreviewAnimState,
  tick: number,
  faceDir: 1 | -1
) {
  if (!previewOff) return;
  const ctx = previewOff.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 112, 112);

  ctx.fillStyle = '#0e1422';
  ctx.fillRect(0, 0, 112, 112);
  ctx.fillStyle = '#141c30';
  for (let y = 0; y < 112; y += 8) ctx.fillRect(0, y, 112, 1);
  for (let x = 0; x < 112; x += 8) ctx.fillRect(x, 0, 1, 112);
  ctx.fillStyle = '#1b2640';
  ctx.fillRect(16, 97, 80, 5);

  const synthetic: RenderFighterState = {
    pi: 99,
    x: 0,
    y: 0,
    w: 38,
    h: 92,
    cx: 0,
    vx: anim === 'walk' ? 2.1 * faceDir : anim === 'run' ? 5.2 * faceDir : 0,
    vy: anim === 'jump' ? (Math.sin(tick * 0.14) < 0 ? -5 : 4) : 0,
    face: faceDir,
    on: anim !== 'jump',
    wall: 0,
    dead: 0,
    inv: 0,
    stun: 0,
    dashT: 0,
    dashCD: 0,
    vote: 0,
    pct: 0,
    combo: 0,
    jabStep: 0,
    floating: false,
    fastFall: false,
    winning: anim === 'victory',
    winT: anim === 'victory' ? tick % 120 : 0,
    wpn: anim === 'shoot' || anim === 'reload' ? 500 : 0,
    wk: anim === 'shoot' || anim === 'reload' ? 'mg' : null,
    ammo: 24,
    maxAmmo: 30,
    reloadT: anim === 'reload' ? 45 - (tick % 45) : 0,
    reloadDur: 45,
    shootRecoil: anim === 'shoot' ? (tick % 10 < 4 ? 4 : 0) : 0,
    landT: 0,
    crouch: false,
    boss: false,
    hitFlash: 0,
    squashX: 1,
    squashY: 1,
    d,
    atk:
      anim === 'sig'
        ? {
            spec: { k: 'h', dur: d.sig.dur, heavy: true, ph: d.sig.ph },
            t: tick % Math.max(1, d.sig.dur),
            armor: false,
          }
        : null,
    afterimages: [],
  };

  previewRenderer.drawAnatomicalCharacter(ctx, synthetic, tick, 1.0, 56, 98, true);

  if (anim === 'shoot' && tick % 10 < 3) {
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(56 + faceDir * 29, 54, 8 * faceDir, 5);
  }

  const dCtx = targetCanvas.getContext('2d');
  if (dCtx) {
    dCtx.imageSmoothingEnabled = false;
    dCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    dCtx.drawImage(previewOff, 0, 0, targetCanvas.width, targetCanvas.height);
  }
}

// 48x48 Indie 16-Bit Portrait with Chromatic Smart Outline Pass, Atmospheric Gradient & Rim Light
const portraitCharOff = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (portraitCharOff) {
  portraitCharOff.width = 48;
  portraitCharOff.height = 48;
}

export function renderPresidentPortrait(canvas: HTMLCanvasElement, d: PresidentData, time = 0) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const portrait = spritePortrait(d);
  if (portrait) {
    if (canvas.width !== portrait.width || canvas.height !== portrait.height) {
      canvas.width = portrait.width;
      canvas.height = portrait.height;
    }
    ctx.drawImage(portrait, 0, 0);
    return;
  }
  const W = 48;
  const H = 48;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  const p = d.palette;
  const an = d.anatomy;
  const face = an.face;
  const bob = Math.round(Math.sin(time * 0.08));

  // 1. Multi-stop atmospheric backdrop + subtle Bayer dithering
  const bgTop = tintOutlineHex(p.suit.base, 0.42);
  const bgBot = mixHex(p.suit.shadow, p.accent.base, 0.25);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, bgTop);
  bgGrad.addColorStop(1, bgBot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (BAYER_4X4[(y & 3) * 4 + (x & 3)] / 16 < (y / H) * 0.48) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Subtle accent rim strip at base
  ctx.fillStyle = p.accent.base;
  ctx.fillRect(0, 44, W, 3);
  ctx.fillStyle = p.accent.highlight || '#fff3a0';
  ctx.fillRect(0, 47, W, 1);

  // 2. Render Character Bust onto transparent offscreen buffer for automatic Smart Chromatic Outline!
  const bCtx = portraitCharOff ? portraitCharOff.getContext('2d') : ctx;
  if (!bCtx) return;
  if (portraitCharOff) {
    bCtx.imageSmoothingEnabled = false;
    bCtx.clearRect(0, 0, W, H);
  }

  // Sculpted Heroic Shoulders & Gala Epaulets / Lapels
  bCtx.fillStyle = p.suit.shadow;
  bCtx.fillRect(7, 31 + bob, 34, 17);
  bCtx.fillStyle = p.suit.base;
  bCtx.fillRect(8, 31 + bob, 24, 16);
  bCtx.fillStyle = p.suit.highlight;
  bCtx.fillRect(8, 31 + bob, 11, 4);

  if (an.outfitStyle === 'gala') {
    bCtx.fillStyle = '#d9a426';
    bCtx.fillRect(7, 30 + bob, 9, 4);
    bCtx.fillRect(32, 30 + bob, 9, 4);
    bCtx.fillStyle = '#fff3a0';
    bCtx.fillRect(8, 30 + bob, 7, 2);
    bCtx.fillRect(33, 30 + bob, 7, 2);
  }

  bCtx.fillStyle = '#eef2ff';
  bCtx.fillRect(19, 31 + bob, 10, 9);
  bCtx.fillStyle = p.accent.base;
  bCtx.fillRect(22, 33 + bob, 4, 15);

  // Neck with chin shadow
  bCtx.fillStyle = p.skin.shadow;
  bCtx.fillRect(19, 25 + bob, 10, 7);
  bCtx.fillStyle = tintOutlineHex(p.skin.shadow, 0.55);
  bCtx.fillRect(20, 26 + bob, 8, 2);

  // Sculpted Head Shape
  const headW = face.faceShape === 'broad' ? 22 : face.faceShape === 'oval' ? 18 : 20;
  const headX = Math.round(24 - headW / 2);
  bCtx.fillStyle = p.skin.shadow;
  bCtx.fillRect(headX, 11 + bob, headW, 15);
  bCtx.fillRect(headX + 2, 26 + bob, headW - 4, 1);
  bCtx.fillStyle = p.skin.base;
  bCtx.fillRect(headX, 11 + bob, headW - 3, 14);
  bCtx.fillStyle = p.skin.highlight;
  bCtx.fillRect(headX + 2, 12 + bob, 7, 4);

  // Eyes / Shades / Visor (hue-tinted dark frame, never flat black)
  if (face.eyeStyle === 'shades' || an.glasses) {
    bCtx.fillStyle = '#182238';
    bCtx.fillRect(16, 16 + bob, 7, 4);
    bCtx.fillRect(25, 16 + bob, 7, 4);
    bCtx.fillRect(23, 17 + bob, 2, 1);
    bCtx.fillStyle = '#7dd3fc';
    bCtx.fillRect(17, 17 + bob, 3, 1);
    bCtx.fillRect(26, 17 + bob, 3, 1);
  } else if (face.eyeStyle === 'visor') {
    bCtx.fillStyle = '#ef4444';
    bCtx.fillRect(15, 16 + bob, 18, 4);
    bCtx.fillStyle = '#fff3a0';
    bCtx.fillRect(18, 17 + bob, 6, 1);
  } else {
    const eyeH = face.eyeStyle === 'wide' ? 3 : 2;
    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(17, 17 + bob, 4, eyeH);
    bCtx.fillRect(26, 17 + bob, 4, eyeH);
    bCtx.fillStyle = face.eyeColor;
    bCtx.fillRect(19, 17 + bob, 2, eyeH);
    bCtx.fillRect(28, 17 + bob, 2, eyeH);
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(16, 15 + bob, 6, 1);
    bCtx.fillRect(25, 15 + bob, 6, 1);
  }

  // Nose
  bCtx.fillStyle = p.skin.shadow;
  bCtx.fillRect(23, 19 + bob, 2, 3);

  // Facial hair
  if (face.facialHair === 'mustache') {
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(19, 22 + bob, 10, 2);
  } else if (face.facialHair === 'goatee' || face.facialHair === 'stubble') {
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(20, 23 + bob, 8, 4);
  } else if (face.facialHair === 'full_beard') {
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(headX + 1, 21 + bob, headW - 2, 6);
  }

  // Mouth
  bCtx.fillStyle = face.mouthStyle === 'fierce' ? '#6b1820' : tintOutlineHex(p.skin.shadow, 0.65);
  bCtx.fillRect(21, 23 + bob, 6, face.mouthStyle === 'fierce' ? 2 : 1);

  // Hair / Hat
  if (an.hatOrHair === 'combover') {
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(13, 6 + bob, 23, 6);
    bCtx.fillStyle = p.hair;
    bCtx.fillRect(15, 5 + bob, 21, 5);
  } else if (an.hatOrHair === 'wild') {
    bCtx.fillStyle = p.hairShadow;
    bCtx.fillRect(12, 7 + bob, 24, 6);
    bCtx.fillStyle = p.hair;
    for (let k = 0; k < 5; k++) bCtx.fillRect(14 + k * 4, 4 + (k % 2) * 2 + bob, 4, 6);
  } else if (an.hatOrHair === 'cap') {
    bCtx.fillStyle = '#f2f4f8';
    bCtx.fillRect(13, 6 + bob, 22, 6);
    bCtx.fillStyle = '#cfd6e6';
    bCtx.fillRect(13, 10 + bob, 26, 2);
  } else if (an.hatOrHair === 'ponytail') {
    bCtx.fillStyle = p.hair;
    bCtx.fillRect(13, 8 + bob, 22, 5);
    bCtx.fillRect(11, 12 + bob, 4, 15);
  } else if (an.hatOrHair === 'fedora') {
    bCtx.fillStyle = '#e8e0cc';
    bCtx.fillRect(10, 9 + bob, 28, 3);
    bCtx.fillRect(15, 3 + bob, 18, 6);
    bCtx.fillStyle = '#962424';
    bCtx.fillRect(15, 7 + bob, 18, 2);
  } else if (an.hatOrHair === 'tophat') {
    bCtx.fillStyle = '#252938';
    bCtx.fillRect(10, 10 + bob, 28, 2);
    bCtx.fillRect(15, 1 + bob, 18, 9);
    bCtx.fillStyle = '#c94338';
    bCtx.fillRect(15, 8 + bob, 18, 2);
  } else if (an.hatOrHair === 'bicorne_hair') {
    bCtx.fillStyle = p.hair;
    bCtx.fillRect(13, 7 + bob, 22, 5);
    bCtx.fillRect(13, 12 + bob, 3, 8);
    bCtx.fillRect(32, 12 + bob, 3, 8);
  } else if (an.hatOrHair === 'beret') {
    bCtx.fillStyle = p.accent.base;
    bCtx.fillRect(12, 6 + bob, 24, 6);
    bCtx.fillStyle = '#ffd23f';
    bCtx.fillRect(26, 8 + bob, 3, 3);
  } else if (an.hatOrHair === 'helmet') {
    bCtx.fillStyle = '#2e3848';
    bCtx.fillRect(12, 5 + bob, 24, 8);
    bCtx.fillStyle = '#4c5b75';
    bCtx.fillRect(12, 10 + bob, 24, 2);
  } else {
    bCtx.fillStyle = p.hair;
    bCtx.fillRect(14, 8 + bob, 20, 4);
    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(15, 9 + bob, 9, 2);
  }

  // 3. Apply 1px Chromatic Smart Outline Pass around entire bust silhouette
  if (portraitCharOff) {
    const img = bCtx.getImageData(0, 0, W, H);
    const data = img.data;
    const orig = new Uint8ClampedArray(data);
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = (y * W + x) * 4;
        if (orig[idx + 3] > 20) continue;
        for (const [dx, dy] of dirs) {
          const nIdx = ((y + dy) * W + (x + dx)) * 4;
          if (orig[nIdx + 3] > 180) {
            data[idx] = clamp(Math.round(orig[nIdx] * 0.28 + 8), 10, 82);
            data[idx + 1] = clamp(Math.round(orig[nIdx + 1] * 0.26 + 7), 9, 76);
            data[idx + 2] = clamp(Math.round(orig[nIdx + 2] * 0.36 + 14), 14, 108);
            data[idx + 3] = 255;
            break;
          }
        }
      }
    }
    bCtx.putImageData(img, 0, 0);
    ctx.drawImage(portraitCharOff, 0, 0);
  }
}
