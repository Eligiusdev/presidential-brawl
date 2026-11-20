export const COMBAT_LIMITS = {
  projectileCooldown: 66,
  fieldLifetime: 180,
  activationHitstop: 10,
  maxUltimateInvulnerability: 15,
  tankArmorDamage: 8,
} as const;

const archetypes = {
  vanguard: { weight: 1, speed: 1.08, vote: 1, ids: 'bolivar sanmartin sucre ohiggins artigas alejandro cesar aquiles musashi elcid wallace ataturk washington napoleon' },
  tank: { weight: 1.22, speed: .86, vote: .95, ids: 'lincoln teddy vargas alfaro lula chirac trump mujica walesa sankara putin ortega' },
  controller: { weight: 1.02, speed: .96, vote: 1.02, ids: 'juarez degaulle eisenhower fdr batlle nyerere kubitschek masaryk allende mandela santos kast uribe maduro xiomara' },
  artillery: { weight: .94, speed: 1, vote: 1, ids: 'kalam kennedy sheinbaum cardenas nkrumah robinson sarmiento petro bukele obama diazcanel' },
  assassin: { weight: .88, speed: 1.16, vote: 1.05, ids: 'simo policarpa juana espartaco ricaurte milei noboa biden macron bathory' },
  specialist: { weight: .96, speed: 1.06, vote: 1.02, ids: 'havel kekkonen pertini mitterrand duque sunyatsen abelardo antoinette' },
} as const;

export type Archetype = keyof typeof archetypes;
const archetypeById = new Map<string, Archetype>();
for (const key of Object.keys(archetypes) as Archetype[]) {
  for (const id of archetypes[key].ids.split(' ')) archetypeById.set(id, key);
}

export function combatBalance(id: string) {
  const archetype = archetypeById.get(id);
  if (!archetype) return undefined;
  const { weight, speed, vote } = archetypes[archetype];
  return { archetype, weight: id === 'musashi' || id === 'aquiles' ? .92 : weight, speed, vote };
}

export const ULTIMATE_BUDGETS = {
  sweep: { startup: 30, minDamage: 18, maxDamage: 22, minRange: 300, maxRange: 340, knockback: 12, whiff: 12 },
  zone: { startup: 36, minDamage: 20, maxDamage: 25, minRange: 140, maxRange: 240, knockback: 11, whiff: 12 },
  precision: { startup: 39, minDamage: 26, maxDamage: 32, minRange: 60, maxRange: 140, knockback: 17, whiff: 24 },
  utility: { startup: 30, minDamage: 14, maxDamage: 20, minRange: 180, maxRange: 280, knockback: 9, whiff: 12 },
} as const;

export type UltimateCategory = keyof typeof ULTIMATE_BUDGETS;
const sweep = new Set('washington uribe mujica biden noboa alfaro trump espartaco kast walesa ataturk sankara'.split(' '));
const precision = new Set('simo milei musashi alejandro ricaurte aquiles elcid bolivar wallace abelardo sucre ohiggins artigas kekkonen cesar'.split(' '));
const utility = new Set('kennedy mandela havel mitterrand santos macron robinson allende pertini sanmartin'.split(' '));

export function ultimateCategory(id: string): UltimateCategory {
  if (sweep.has(id)) return 'sweep';
  if (precision.has(id)) return 'precision';
  if (utility.has(id)) return 'utility';
  return 'zone';
}
