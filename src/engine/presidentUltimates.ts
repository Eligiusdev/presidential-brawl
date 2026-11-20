import { PRESIDENT_ULTIMATES, type UltimateSpec } from '../data/presidentUltimates';
import type { PresidentData } from '../types/game';

type Point = readonly [x: number, y: number];
type Shape = 'orb' | 'beam' | 'slash' | 'ground' | 'ring' | 'block';
type Anchor = 'caster' | 'target' | 'center';
type Flags = 'pull' | 'slow' | 'clear' | 'reflect' | 'heal' | 'gravity' | 'guard' | 'speed';

interface Profile {
  anchor: Anchor;
  travel?: 'sweep' | 'cavalry' | 'lane';
  tempo?: { distance: number; steps: readonly number[]; speed: number; startup: number; fixed: boolean };
  shape: Shape;
  route: readonly Point[];
  description: string;
  flags: readonly Flags[];
}

// Las rutas se expresan en fracciones del alcance, relativas al punto de lanzamiento.
// La misma geometría alimenta la advertencia, los impactos y la capa visual.
const profiles: Record<string, Profile> = {};
function define(id: string, anchor: Anchor, shape: Shape, route: readonly Point[],
  description: string, ...flags: Flags[]) {
  profiles[id] = { anchor, shape, route, description, flags };
}

define('kalam','target','orb',[[-.9,-1],[.7,-.35],[-.35,-.1],[0,0]],'Una salva orbital cruza en diagonal y converge sobre el punto marcado.');
define('sheinbaum','caster','beam',[[.1,0],[.55,0],[1,0]],'Una columna solar barre el frente de lado a lado.');
define('noboa','caster','ground',[[.15,-.12],[1.1,-.12],[1.35,-.38]],'Una salva naval recorre la altura baja y termina con un disparo ascendente.');
define('eisenhower','caster','orb',[[.2,-1],[.44,0],[.65,-.51],[.9,0],[1.1,-.28]],'Cápsulas de desembarco rebotan hacia delante.');
define('fdr','caster','block',[[.12,0],[.27,-.58],[.61,-.74],[1.08,0]],'Un proyectil pesado describe un arco industrial.');
define('duque','caster','beam',[[.22,.18],[.48,0],[.75,-.37],[.95,-.85]],'Un abanico sónico remata en altura.','slow');
define('juana','target','beam',[[0,0],[-.47,0],[.47,0],[0,0]],'Un pilar luminoso abre el paso a rayos laterales.');
define('cesar','target','slash',[[-.74,-.84],[-.3,-.5],[.35,-.64],[0,0]],'Una lluvia diagonal culmina con una estocada descendente.');
define('nkrumah','target','orb',[[0,0],[.5,-.35],[-.52,-.18],[.32,.42],[-.32,.42],[0,0]],'Una implosión atrae hacia el centro de un estallido estelar.','pull');
define('cardenas','caster','beam',[[.14,.12],[.35,.12],[.69,.12],[1.14,.12]],'Géiseres de petróleo brotan en secuencia bajo el rival.');
define('ataturk','caster','block',[[.18,.15],[.38,-.12],[.69,.03],[1.04,-.28]],'La artillería avanza con impactos escalonados.');
define('bukele','target','block',[[0,.3],[0,.02],[0,-.3],[0,0]],'Cubos holográficos se apilan y convergen en la detonación.');
define('simo','target','beam',[[-.2,0],[.2,0]],'Una mira helada marca el punto durante 0.70 s. El disparo inflige 28% a corta distancia y 22% a más de 240 px.');
define('sunyatsen','target','orb',[[-.46,.14],[0,-.71],[.46,.14],[-.46,.14],[0,0]],'Tres soles recorren un triángulo y convergen.');
define('teddy','target','beam',[[0,.28],[0,.02],[0,-.45]],'Un géiser asciende debajo de la marca inicial.');

define('abelardo','target','slash',[[-.4,0],[.43,0],[-.33,-.14],[.27,.13],[0,0]],'Tres cruces de tigre encierran al rival antes del golpe de mazo.');
define('alejandro','target','slash',[[.41,0],[-.34,0],[0,0]],'Un corte pasa al otro flanco y remata hacia el centro.','pull');
define('sucre','target','slash',[[-.55,.15],[.02,-.61],[.56,.15],[0,0]],'Tres cargas dibujan una pinza triangular.');
define('aquiles','caster','slash',[[0,0],[.21,-.1],[.5,.05],[1.05,0]],'El aura aumenta la velocidad y la embestida termina con una lanza solar.','speed');
define('ohiggins','caster','slash',[[0,0],[.64,0],[.77,-.71],[.96,.16]],'La carga acorazada acaba en un corte vertical.','guard');
define('milei','target','slash',[[-.57,0],[.33,-.44],[-.39,-.56],[.4,-.34],[-.23,-.26],[0,0]],'Una entrada veloz enlaza cortes a distintas alturas.');
define('artigas','target','slash',[[.5,.2],[-.4,-.15],[.35,.11],[-.21,-.18],[0,0]],'Las boleadoras atraen y abren tres cruces en zigzag.','pull');
define('musashi','target','slash',[[0,-.64],[.6,-.1],[.36,.49],[-.36,.49],[-.6,-.1],[0,-.64],[0,0]],'Cinco cortes rodean al rival y el sexto cierra el centro.');
define('elcid','target','slash',[[-.52,-.44],[.47,.3],[-.44,.32],[.47,-.38],[0,0]],'Dos cortes montados cruzan la marca y dejan un último tajo.');
define('bolivar','target','slash',[[0,-.81],[.55,.38],[-.71,-.19],[.71,-.19],[-.55,.38],[0,-.81],[0,0]],'Cinco tajos aéreos trazan una estrella tricolor y el último cae al centro.');
define('kekkonen','caster','slash',[[0,.08],[.39,-.59],[.77,-.93],[1,.05]],'Un salto de rampa cruza en diagonal y rompe el hielo al aterrizar.');
define('wallace','caster','slash',[[0,0],[.52,-.4],[1,.19]],'El mandoble baja en diagonal y abre un surco eléctrico.');

define('lincoln','caster','ground',[[.19,.19],[.6,.14],[.78,-.12]],'Una fisura atrae antes de expulsar hacia arriba.','pull');
define('ricaurte','caster','ring',[[0,0]],'Una mecha visible arde durante 0.65 s. Tras la explosión radial hay 0.40 s de recuperación vulnerable.','guard');
define('juarez','caster','ring',[[.1,0],[.3,0],[.62,0]],'Tres ondas limpian proyectiles y frenan al rival.','slow','clear');
define('degaulle','caster','ring',[[0,-.12],[.25,-.18],[.51,-.04],[.83,-.12]],'Cuatro pulsos de radio avanzan desde el emisor.');
define('sarmiento','target','orb',[[.47,0],[0,-.54],[-.47,0],[0,.43],[0,0]],'Un remolino de páginas gira alrededor de una marca y concluye con una pluma.','pull');
define('vargas','caster','ground',[[.1,.22],[.31,.22],[.53,.22],[.82,.22]],'El acero fundido ocupa el suelo y termina en un estallido.');
define('petro','target','beam',[[-.63,.19],[.63,.19],[0,-.08]],'Dos cascadas laterales convergen en un géiser central.');
define('chirac','target','block',[[-.76,-.72],[-.24,-.43],[.24,-.71],[.76,-.43],[0,.1]],'Cuatro tótems caen y el centro libera un pulso sísmico.');
define('batlle','caster','beam',[[0,-.56],[.57,-.29],[.76,.13],[.38,.43]],'Una manecilla recorre el frente y ralentiza el avance.','slow');
define('santos','caster','ring',[[0,-.17],[.45,-.17],[.92,-.17]],'Ondas de campana avanzan y disipan proyectiles.','clear');
define('kubitschek','target','ring',[[0,.42],[0,-.51]],'Una cúpula eleva y la segunda golpea desde arriba.');
define('lula','target','block',[[-.75,0],[.75,0],[-.18,0],[.18,0],[0,-.24]],'Dos prensas se cierran sobre la marca y rematan con un lanzamiento.');
define('policarpa','target','slash',[[-.45,-.21],[.45,.24],[.31,-.34],[-.31,.28],[0,0]],'El hilo de plata atrae hacia dos cruces de daga.','pull');
define('masaryk','target','beam',[[.52,0],[.26,-.45],[-.26,-.45],[-.52,0],[-.26,.45],[.26,.45],[.52,0]],'Rayos de reloj giran alrededor de una marca que atrae al rival.','pull');

define('uribe','caster','block',[[.05,.2],[.67,.2],[1.1,.2],[.22,-.43],[1.1,-.43]],'Dos oleadas galopan a alturas distintas.');
define('trump','caster','block',[[.38,.26],[.38,-.74],[.72,-.44],[1.17,.12]],'Una torre se levanta y cae hacia delante.');
define('alfaro','caster','block',[[.15,.16],[.53,.16],[.39,-.31],[.88,-.31],[.74,-.61],[1.23,-.61]],'Un tren asciende por tres tramos en zigzag.');
define('espartaco','caster','ground',[[.1,.1],[.35,.17],[.61,.15],[.91,.15]],'Cuatro siluetas avanzan en fila tras romperse la cadena.');
define('washington','caster','ground',[[.07,.33],[.44,.31],[.74,.27],[1.21,.05]],'Témpanos ralentizan y un barco remata por la vía baja.','slow');
define('biden','caster','block',[[.05,-.36],[.51,-.36],[.99,-.36],[1.4,-.36]],'Un expreso recorre una altura intermedia.');
define('kast','caster','block',[[.08,0],[.39,0],[.72,0],[1.03,0]],'Una falange avanza y devuelve proyectiles.','reflect');
define('mujica','caster','block',[[0,.15],[.23,-.28],[.61,-.69],[.97,-.23],[1.18,.12]],'Un vehículo toma una rampa y aturde al aterrizar.','slow');
define('walesa','caster','block',[[.08,-.78],[.39,-.78],[.78,-.78],[.78,.12]],'Una grúa barre arriba y deja caer la carga.');
define('sankara','caster','beam',[[.2,.25],[.46,.13],[.75,0],[1.12,-.19]],'Baobabs plantados en secuencia se alzan a distintas alturas.');

define('macron','caster','ring',[[0,0],[0,-.1]],'Doce estrellas bloquean proyectiles durante 1.2 s. El cuerpo a cuerpo puede atravesar la guardia.','reflect','guard');
define('mitterrand','caster','beam',[[-.43,-.34],[.43,-.34],[.43,.34],[-.43,.34],[0,0]],'Una pirámide refracta un ataque en cuatro direcciones.','reflect','guard');
define('nyerere','caster','ring',[[-.34,0],[0,0],[.34,0]],'Tres anillos cubren ambos flancos y añaden 3% por anillo al pulso final.','guard');
define('havel','caster','block',[[-.7,-.16],[.7,-.16],[-.27,0],[.27,0],[0,0]],'Las llaves frenan al atacante y los telones se cierran.','slow','guard');

define('kennedy','center','ring',[[0,-.92],[0,-.33],[0,.03]],'La gravedad baja durante tres segundos y un módulo desciende en el centro.','gravity');
define('sanmartin','caster','slash',[[.12,-.74],[.39,-.36],[.7,-.09],[1.15,.16]],'Una ventisca diagonal termina con un sablazo.');
define('robinson','caster','beam',[[.15,.22],[.52,-.07],[.84,-.32],[1.2,-.53]],'Un tornado cruza en diagonal y arrastra al rival.','pull');
define('mandela','center','ring',[[-.89,.03],[-.35,-.37],[.35,-.37],[.89,.03]],'Un arco barre el centro. Si conecta, recupera ocho puntos de daño una vez por stock.','heal');
define('allende','center','ground',[[0,0],[.62,.1],[-.62,.1],[1.16,.13],[-1.16,.13]],'Dos oleadas salen del centro hacia extremos opuestos.');
define('pertini','target','block',[[-.82,-.85],[-.55,-.62],[-.36,-.24],[0,.17],[.46,.3]],'Humo en altura precede una avalancha diagonal.');

define('maduro', 'caster', 'ground', [[0.12,0.27],[0.38,0.04],[0.68,0.07],[0.92,0.27]], "Las cuerdas del arpa levantan un oleaje de notas doradas.");
define('putin', 'caster', 'block', [[0.02,-0.1],[0.3,-0.26],[0.65,0.12]], "Un escudo de hielo devuelve el impacto en una ráfaga.");
define('obama', 'caster', 'ring', [[0.18,0],[0.38,-0.2],[0.73,-0.14],[1.08,0.03]], "Un micrófono de plata lanza tres ondas azules y doradas.");
define('napoleon', 'caster', 'slash', [[0.18,0.04],[0.47,-0.29],[0.85,-0.13],[1.18,0.18]], "El águila imperial abre un barrido diagonal bajo el estandarte.");
define('antoinette', 'target', 'orb', [[0,0.21],[0.43,-0.15],[-0.35,-0.4],[0.05,-0.04]], "Un abanico rococó dispersa pétalos alrededor de un espejo.");
define('bathory', 'target', 'ring', [[0.05,0.04],[-0.43,-0.14],[0.39,-0.36],[-0.04,0.19]], "Un espejo de amatista se abre entre rosas y niebla carmesí.");
define('xiomara', 'target', 'beam', [[0.05,0.3],[-0.31,0.13],[0.28,0.12],[0.02,-0.42]], "Una ceiba turquesa brota entre cinco estrellas y raíces de luz.");
define('diazcanel', 'caster', 'ground', [[0.17,0.27],[0.46,0.17],[0.72,0.24],[1.12,-0.06]], "Una ola azul recorre el malecón al ritmo de notas luminosas.");
define('ortega', 'target', 'block', [[-0.42,0.27],[-0.14,-0.38],[0.22,-0.5],[0.4,0.2]], "Un sol ámbar ilumina el volcán y eleva fragmentos de obsidiana.");

const sweepingUltimates: Record<string, { travel: 'sweep' | 'cavalry'; durationMs: number; hits: number; description: string } | undefined> = {
  lincoln: { travel: 'sweep', durationMs: 750, hits: 1, description: 'La locomotora cruza toda la plataforma a ras del suelo y lanza al rival al contacto.' },
  robinson: { travel: 'sweep', durationMs: 900, hits: 3, description: 'Un tornado cruza la arena, arrastra al rival hacia el vórtice y lo expulsa.' },
  bolivar: { travel: 'cavalry', durationMs: 430, hits: 1, description: 'Bolívar dirige una carga de caballería tricolor y embiste con un dash terrestre.' },
};

// Velocidades en unidades del mundo por tick para las rutas dibujadas por cada definitiva.
const tempos = {
  spawnProjectile: { speed: 24, startup: 24, min: 21, max: 64 },
  dashStrike: { speed: 22, startup: 25, min: 20, max: 64 },
  spawnZone: { speed: 17, startup: 27, min: 22, max: 63 },
  spawnEntity: { speed: 22, startup: 27, min: 24, max: 67 },
  counterStance: { speed: 16, startup: 25, min: 24, max: 60 },
  arenaEffect: { speed: 18, startup: 26, min: 24, max: 64 },
} as const;

const laneHeights: Record<string, number | undefined> = {
  noboa: 58, washington: 54, uribe: 75, espartaco: 55, biden: 132, kast: 70, alfaro: 75,
};
const fixedEffects = new Set(['simo', 'ricaurte', 'kennedy', 'macron']);

export function ultimateLaneHeight(id: string) {
  return laneHeights[id.replace(/^ult_/, '')];
}

function withTempo(spec: UltimateSpec, profile: Profile, fighterId: string): Profile {
  const preset = tempos[spec.primitive];
  const steps = [0];
  for (let i = 1; i < profile.route.length; i++) {
    const [x, y] = profile.route[i];
    const [previousX, previousY] = profile.route[i - 1];
    steps.push(steps[i - 1] + Math.hypot(x - previousX, y - previousY));
  }
  return {
    ...profile,
    travel: laneHeights[fighterId] !== undefined ? 'lane' : profile.travel,
    tempo: { distance: steps[steps.length - 1], steps, speed: preset.speed,
      startup: preset.startup, fixed: fixedEffects.has(fighterId) || spec.primitive === 'counterStance' },
  };
}

export function ultimateFor(data: PresidentData, sweeping = true, paced = true) {
  const candidate = PRESIDENT_ULTIMATES[data.id];
  const spec = !data.isCustom && candidate && (!data.ultimateId || candidate.id === data.ultimateId) ? candidate : undefined;
  const profile = profiles[data.id];
  if (!spec || !profile) return undefined;
  const redesign = sweeping ? sweepingUltimates[data.id] : undefined;
  if (!redesign) return { spec, profile: paced ? withTempo(spec, profile, data.id) : profile };
  const { travel, durationMs, hits, description } = redesign;
  return {
    spec: { ...spec, durationMs, hits },
    profile: { ...profile, travel, description, route: [[0, 0], [1, 0]] as readonly Point[] },
  };
}

export function ultimateText(data: PresidentData) {
  const ultimate = ultimateFor(data);
  return ultimate ? { ...data.ult, name: ultimate.spec.name, ultDesc: ultimate.profile.description,
    dodgeTip: 'Sal de la zona marcada o esquiva al contacto.' } : data.ult;
}

export type PresidentUltimate = NonNullable<ReturnType<typeof ultimateFor>>;

export interface UltimateOrigin {
  x: number;
  y: number;
  face: number;
  endX?: number;
}

const hitSizes: Record<Shape, Point> = {
  orb: [.36, .35], beam: [.15, .74], slash: [.33, .28],
  ground: [.41, .19], ring: [.61, .56], block: [.32, .5],
};

export function ultimatePoint(ultimate: PresidentUltimate, origin: UltimateOrigin, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const { route, tempo, travel } = ultimate.profile;
  if (origin.endX !== undefined && travel !== 'lane') {
    return { x: origin.x + (origin.endX - origin.x) * t, y: origin.y };
  }
  const segment = t * (route.length - 1);
  let index = Math.floor(segment);
  let blend = segment - index;
  if (tempo && tempo.distance > 0 && travel !== 'lane') {
    const goal = tempo.distance * t;
    const next = tempo.steps.findIndex(step => step > goal);
    index = next < 0 ? route.length - 1 : next - 1;
    blend = next < 0 ? 0 : (goal - tempo.steps[index]) / (tempo.steps[next] - tempo.steps[index]);
  }
  const [x, y] = route[index];
  const [nextX, nextY] = route[Math.min(index + 1, route.length - 1)];
  const range = ultimate.spec.rangePx;
  if (origin.endX !== undefined) {
    return { x: origin.x + (origin.endX - origin.x) * t, y: origin.y + (y + (nextY - y) * blend) * range * .55 };
  }
  return {
    x: origin.x + (x + (nextX - x) * blend) * range * origin.face,
    y: origin.y + (y + (nextY - y) * blend) * range,
  };
}

export function ultimateBox(ultimate: PresidentUltimate, point: { x: number; y: number }) {
  if (ultimate.profile.travel && ultimate.profile.travel !== 'lane') {
    const [w, h] = ultimate.spec.id === 'ult_robinson' ? [104, 220] : ultimate.profile.travel === 'cavalry' ? [112, 104] : [170, 100];
    return { x: point.x - w / 2, y: point.y - h / 2, w, h };
  }
  const [width, height] = hitSizes[ultimate.profile.shape];
  const w = ultimate.spec.rangePx * width * 2;
  const h = ultimate.spec.rangePx * height * 2;
  return { x: point.x - w / 2, y: point.y - h / 2, w, h };
}

export function ultimateDuration(spec: UltimateSpec) {
  return Math.round(spec.durationMs * 60 / 1000);
}

export function pacedUltimateDuration(ultimate: PresidentUltimate, origin: UltimateOrigin) {
  const { spec, profile } = ultimate;
  const base = ultimateDuration(spec);
  const tempo = profile.tempo;
  if (!tempo || tempo.fixed) return base;
  const bounds = tempos[spec.primitive];
  const distance = origin.endX === undefined ? tempo.distance * spec.rangePx : Math.abs(origin.endX - origin.x);
  const budget = Math.ceil(distance / tempo.speed) + Math.min(14, 3 * spec.hits);
  return Math.min(base, Math.max(bounds.min, Math.min(bounds.max, budget)));
}
