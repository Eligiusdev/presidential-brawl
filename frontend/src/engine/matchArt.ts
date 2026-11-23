import type { PresidentData } from '../types/game';
import { preloadArmedFighter } from './fighterSprites';
import { preloadUltimateSprite } from './ultimateSprites';

export async function preloadMatchArt(fighters: readonly PresidentData[]) {
  const distinct = new Map(fighters.map(fighter => [fighter.id, fighter]));
  await Promise.allSettled([...distinct.values()].map(async fighter => {
    await preloadArmedFighter(fighter);
    if (!fighter.isCustom && fighter.ultimateId) void preloadUltimateSprite(fighter.ultimateId);
  }));
}
