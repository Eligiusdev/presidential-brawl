import type { StageDef, StageTime } from '../types/game';

const PERIOD = 30 * 60;
const TRANSITION = 150;
export function stageNightMix(time: StageTime | undefined, frame: number) {
  if (time === 'day') return 0;
  if (time === 'night') return 1;
  const segment = Math.floor(frame / PERIOD);
  if (!segment) return 0;
  const t = Math.min(1, (frame % PERIOD) / TRANSITION);
  const blend = t * t * (3 - 2 * t);
  return segment % 2 ? blend : 1 - blend;
}

export function stageArtUrl(id: string, time: 'day' | 'night') {
  return `${import.meta.env?.BASE_URL ?? '/'}assets/stages/${id}-${time}.webp`;
}

// Shared by the simulation and renderer so a telegraph marks the actual hazard.
export function stageHazardColumns(hazard: StageDef['hazard'], frame: number, phaseFrame: number, width: number) {
  switch (hazard) {
    case 'scanner': return [{ x: width / 2 + Math.sin(frame * 0.035) * 470, halfWidth: 34, danger: true }];
    case 'street-lamps': return [{ x: width * (Math.floor(phaseFrame / 70) % 2 ? 0.68 : 0.32), halfWidth: 66, danger: true }];
    case 'central-updraft': return [{ x: width / 2, halfWidth: 145, danger: false }];
    case 'thermal-columns': return [{ x: width * 0.28, halfWidth: 86, danger: false }, { x: width * 0.72, halfWidth: 86, danger: false }];
    default: return [];
  }
}

const images = new Map<string, HTMLImageElement>();
export function stageArt(id: string, time: 'day' | 'night') {
  if (typeof Image === 'undefined') return;
  const url = stageArtUrl(id, time);
  let asset = images.get(url);
  if (!asset) {
    asset = new Image();
    asset.src = url;
    images.set(url, asset);
  }
  return asset.complete && asset.naturalWidth ? asset : undefined;
}
