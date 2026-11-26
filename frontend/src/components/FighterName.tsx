import type { PresidentData } from '../types/game';

const countries: Record<string, string> = {
  washington: 'US', lincoln: 'US', teddy: 'US', fdr: 'US', eisenhower: 'US',
  kennedy: 'US', trump: 'US', biden: 'US', obama: 'US',
  bolivar: 'VE', maduro: 'VE', sucre: 'VE',
  sanmartin: 'AR', sarmiento: 'AR', milei: 'AR',
  juarez: 'MX', cardenas: 'MX', sheinbaum: 'MX',
  ohiggins: 'CL', allende: 'CL', kast: 'CL',
  alfaro: 'EC', noboa: 'EC', batlle: 'UY', artigas: 'UY', mujica: 'UY',
  vargas: 'BR', kubitschek: 'BR', lula: 'BR',
  degaulle: 'FR', mitterrand: 'FR', chirac: 'FR', macron: 'FR',
  napoleon: 'FR', antoinette: 'AT', juana: 'FR',
  masaryk: 'CZ', havel: 'CZ', walesa: 'PL', pertini: 'IT',
  kekkonen: 'FI', simo: 'FI', robinson: 'IE', mandela: 'ZA', sankara: 'BF',
  nkrumah: 'GH', nyerere: 'TZ', ataturk: 'TR', sunyatsen: 'TW', kalam: 'IN',
  musashi: 'JP', policarpa: 'CO', ricaurte: 'CO', abelardo: 'CO', petro: 'CO',
  uribe: 'CO', santos: 'CO', duque: 'CO', elcid: 'ES',
  bukele: 'SV', putin: 'RU', bathory: 'HU', xiomara: 'HN',
  diazcanel: 'CU', ortega: 'NI', gengis: 'MN',
};

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
const scotland = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}';

export function FighterName({ fighter, name = fighter.name }: { fighter: PresidentData; name?: string }) {
  const code = countries[fighter.id];
  const country = fighter.id === 'wallace' ? 'Escocia' : code ? regionNames.of(code) : undefined;
  const flag = fighter.id === 'wallace' ? scotland
    : code ? String.fromCodePoint(...[...code].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65)) : '';
  return <>{country && <><span className="fighter-flag" role="img" aria-label={country} title={country}>{flag}</span> </>}{name}</>;
}
