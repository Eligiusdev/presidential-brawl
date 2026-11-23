import type { PresidentData } from '../types/game';

type Motif = 'stars' | 'laurels' | 'sun' | 'waves' | 'wind';
type VictoryTheme = { colors: readonly string[]; motif: Motif };

const themes = [
  ['washington lincoln teddy fdr eisenhower kennedy trump biden obama', 'stars', '#ee535d', '#ffffff', '#4779e1'],
  ['bolivar policarpa ricaurte abelardo petro uribe santos duque noboa alfaro maduro', 'stars', '#ffdb55', '#4779e1', '#ee535d'],
  ['sanmartin sarmiento milei', 'sun', '#7ed9ff', '#ffffff', '#ffda72'],
  ['juarez cardenas sheinbaum', 'laurels', '#4bd5a1', '#ffffff', '#ee535d'],
  ['ohiggins allende kast', 'stars', '#285ee1', '#ffffff', '#ee535d'],
  ['batlle artigas mujica', 'sun', '#78d3ff', '#ffffff', '#ffcd64'],
  ['vargas kubitschek lula', 'stars', '#4fd77e', '#ffdf52', '#466ddb'],
  ['sucre', 'sun', '#ee535d', '#ffe155', '#4dd779'],
  ['degaulle mitterrand chirac macron juana napoleon antoinette', 'laurels', '#5288f2', '#ffffff', '#ee535d'],
  ['masaryk havel putin', 'stars', '#ffffff', '#4887ee', '#ee535d'],
  ['walesa', 'laurels', '#ffffff', '#ee535d'],
  ['pertini bathory', 'laurels', '#ffffff', '#ee535d', '#4ac78c'],
  ['kekkonen simo wallace', 'wind', '#ffffff', '#4592e8'],
  ['robinson', 'waves', '#47cf8b', '#ffffff', '#f5ae57'],
  ['mandela', 'sun', '#4bcc8e', '#ffce55', '#f4564e', '#5986ed'],
  ['sankara nkrumah', 'stars', '#ee535d', '#ffda55', '#4bd797'],
  ['nyerere', 'sun', '#59d2a0', '#ffdc65', '#64c6f7'],
  ['ataturk', 'stars', '#ee535d', '#ffffff'],
  ['sunyatsen', 'sun', '#ffffff', '#5984e5', '#ee535d'],
  ['kalam', 'sun', '#ffae53', '#ffffff', '#55d39c', '#577be4'],
  ['cesar alejandro aquiles espartaco', 'laurels', '#ffcb70', '#b56353', '#eee4cf'],
  ['musashi', 'sun', '#ffffff', '#ee535d'],
  ['elcid', 'sun', '#ffcb59', '#ee535d'],
  ['bukele xiomara ortega', 'waves', '#7ed9ff', '#ffffff', '#4584e3'],
  ['diazcanel', 'waves', '#4fa7ef', '#ffffff', '#ee535d'],
  ['gengis', 'wind', '#65ddda', '#f6c66b', '#b64f68'],
] as const;

const byFighter = new Map<string, VictoryTheme>();
for (const [ids, motif, ...colors] of themes) {
  for (const id of ids.split(' ')) byFighter.set(id, { colors, motif });
}

export function victoryTheme(fighter: PresidentData): VictoryTheme {
  return byFighter.get(fighter.id) ?? {
    colors: [fighter.palette.accent.base, fighter.palette.accent.highlight],
    motif: 'laurels',
  };
}
