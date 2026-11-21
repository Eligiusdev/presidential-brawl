import type { PresidentData } from '../types/game';
import { preloadFighter } from './fighterSprites';
import { preloadUltimateSprite } from './ultimateSprites';

export async function preloadMatchArt(fighters: readonly PresidentData[]) {
  const distinct = new Map(fighters.map(fighter => [fighter.id, fighter]));
  await Promise.allSettled([...distinct.values()].flatMap(fighter => [
    preloadFighter(fighter),
    !fighter.isCustom && fighter.ultimateId ? preloadUltimateSprite(fighter.ultimateId) : undefined,
  ]));
}
