import { Fighter, move } from './Fighter.js';

// Las frases se leen de izquierda a derecha. La pausa crea una trampa de tiempo,
// reverso cubre la espalda, suelo recorre el piso y arco describe una parábola.
const repertoire = {
  washington: ['punta alto', 'carga pausa punta', 'alto punta', 'bajo reverso'],
  lincoln: ['martillo toque', 'alto martillo', 'gancho martillo', 'pausa barrido'],
  teddy: ['toque carga', 'carga carga martillo', 'gancho carga', 'bajo martillo'],
  fdr: ['bajo toque', 'suelo pausa alto', 'alto suelo', 'reverso suelo'],
  eisenhower: ['alto reverso', 'rayo pausa suelo', 'gancho rayo', 'suelo reverso'],
  kennedy: ['alto toque', 'arco rayo', 'alto arco', 'arco suelo'],
  sanmartin: ['punta pausa punta', 'punta carga punta', 'punta alto carga', 'reverso bajo'],
  juarez: ['martillo bajo', 'martillo pausa reverso', 'martillo alto', 'bajo pausa alto'],
  cardenas: ['toque bajo', 'suelo arco', 'suelo gancho', 'suelo pausa suelo'],
  ohiggins: ['carga punta', 'carga punta alto', 'carga alto', 'reverso carga'],
  sarmiento: ['toque alto', 'arco pausa rayo', 'arco alto', 'rayo reverso'],
  alfaro: ['martillo carga', 'suelo carga martillo', 'carga gancho', 'martillo suelo'],
  batlle: ['bajo alto', 'reverso pausa martillo', 'reverso gancho', 'suelo pausa reverso'],
  vargas: ['martillo pausa toque', 'martillo suelo martillo', 'martillo gancho', 'barrido martillo'],
  kubitschek: ['alto pausa bajo', 'arco pausa arco', 'arco reverso', 'suelo alto'],
  allende: ['toque martillo', 'gancho pausa carga', 'gancho bajo', 'martillo pausa bajo'],
  sucre: ['punta toque', 'punta pausa carga', 'alto pausa punta', 'bajo punta'],
  artigas: ['carga bajo', 'carga reverso punta', 'carga reverso', 'barrido carga'],
  mujica: ['bajo pausa toque', 'bajo pausa martillo', 'bajo gancho', 'pausa bajo carga'],
  degaulle: ['punta reverso', 'rayo suelo rayo', 'rayo gancho', 'barrido rayo'],
  mitterrand: ['reverso punta', 'punta reverso alto', 'punta reverso', 'reverso pausa punta'],
  chirac: ['martillo reverso', 'reverso carga martillo', 'martillo reverso', 'martillo barrido'],
  masaryk: ['alto pausa toque', 'arco alto rayo', 'rayo alto', 'arco pausa bajo'],
  havel: ['reverso toque', 'reverso pausa carga', 'reverso alto', 'bajo carga reverso'],
  walesa: ['gancho toque', 'gancho martillo suelo', 'gancho pausa alto', 'bajo gancho carga'],
  pertini: ['punta bajo', 'alto punta reverso', 'punta gancho', 'barrido punta'],
  kekkonen: ['carga toque', 'gancho carga bajo', 'carga pausa gancho', 'bajo pausa carga'],
  mandela: ['gancho bajo', 'martillo pausa gancho', 'alto gancho', 'bajo pausa reverso'],
  sankara: ['carga alto', 'carga bajo carga', 'carga punta', 'barrido pausa carga'],
  nkrumah: ['alto punta', 'arco suelo arco', 'arco gancho', 'rayo pausa suelo'],
  nyerere: ['reverso bajo', 'suelo pausa martillo', 'bajo alto', 'suelo martillo'],
  ataturk: ['punta carga', 'punta bajo reverso', 'punta pausa alto', 'bajo reverso punta'],
  sunyatsen: ['reverso alto', 'reverso punta gancho', 'reverso punta', 'barrido reverso'],
  kalam: ['toque pausa alto', 'rayo arco rayo', 'arco rayo', 'arco bajo'],
  lula: ['toque gancho', 'suelo pausa carga', 'gancho pausa reverso', 'bajo martillo suelo'],
  juana: ['alto carga reverso', 'punta alto pausa', 'alto carga pausa', 'suelo alto reverso'],
  espartaco: ['gancho carga', 'martillo reverso gancho', 'gancho martillo alto', 'carga barrido alto'],
  musashi: ['punta reverso bajo', 'punta reverso pausa punta', 'alto alto reverso', 'reverso barrido bajo'],
  policarpa: ['toque bajo toque', 'reverso bajo punta', 'alto toque carga', 'bajo reverso pausa'],
  wallace: ['carga martillo', 'carga pausa reverso', 'gancho carga alto', 'barrido carga pausa'],
  elcid: ['punta alto toque', 'punta carga pausa alto', 'carga punta reverso', 'punta barrido pausa'],
  ricaurte: ['bajo carga', 'carga gancho suelo', 'carga bajo alto', 'suelo alto pausa'],
  simo: ['toque reverso bajo', 'rayo pausa arco', 'alto rayo pausa', 'rayo barrido alto'],
  abelardo: ['gancho bajo reverso', 'gancho carga reverso', 'alto gancho carga', 'reverso gancho barrido'],
  petro: ['alto bajo toque', 'suelo arco reverso', 'arco alto pausa', 'arco suelo pausa'],
  uribe: ['bajo reverso alto', 'reverso punta carga', 'alto reverso pausa', 'barrido reverso bajo'],
  santos: ['martillo alto toque', 'martillo pausa arco', 'arco martillo alto', 'martillo bajo reverso'],
  duque: ['toque gancho bajo', 'arco gancho carga', 'gancho arco pausa', 'bajo arco barrido'],
  bukele: ['bajo pausa alto', 'rayo carga bajo', 'carga rayo alto', 'rayo bajo reverso'],
  sheinbaum: ['alto reverso toque', 'arco pausa suelo', 'arco alto reverso', 'arco bajo pausa'],
  milei: ['carga alto bajo', 'carga reverso carga', 'carga gancho reverso', 'barrido pausa alto'],
  trump: ['martillo toque alto', 'martillo alto carga', 'gancho alto martillo', 'martillo barrido bajo'],
  macron: ['punta toque reverso', 'punta pausa reverso alto', 'punta alto reverso', 'reverso punta pausa'],
  noboa: ['toque carga bajo', 'carga bajo punta', 'gancho carga reverso', 'bajo barrido toque'],
  kast: ['martillo bajo toque', 'martillo carga bajo', 'alto martillo pausa', 'bajo martillo reverso'],
  biden: ['toque pausa reverso', 'alto pausa arco', 'alto reverso carga', 'suelo reverso pausa'],
};

const labels = {
  washington: ['Toque de orden', 'Cruce del río', 'Retaguardia continental'],
  lincoln: ['Golpe de mazo', 'Alzada de la Unión', 'Surco abierto'],
  teddy: ['Hombro de bisonte', 'Carga de la colina', 'Pisada del parque'],
  fdr: ['Toque de cubierta', 'Elevador de obras', 'Segunda línea'],
  eisenhower: ['Señal de flanco', 'Puente aéreo', 'Cobertura aliada'],
  kennedy: ['Cuenta regresiva', 'Órbita lunar', 'Módulo de retorno'],
  sanmartin: ['Finta de granadero', 'Paso de los Andes', 'Retirada de Maipú'],
  juarez: ['Golpe de acta', 'Tribuna alta', 'Recurso de amparo'],
  cardenas: ['Toque soberano', 'Torre de sondeo', 'Veta profunda'],
  ohiggins: ['Punta de vanguardia', 'Ladera andina', 'Carga de retaguardia'],
  sarmiento: ['Tiza rápida', 'Faro de escuela', 'Última lección'],
  alfaro: ['Biela motriz', 'Viaducto', 'Traviesa de acero'],
  batlle: ['Doble moción', 'Tribuna cívica', 'Sesión aplazada'],
  vargas: ['Prensa de taller', 'Grúa industrial', 'Rodillo de acero'],
  kubitschek: ['Compás de arquitecto', 'Arco del Palacio', 'Eje monumental'],
  allende: ['Toque de campana', 'Tribuna popular', 'Réplica cívica'],
  sucre: ['Punta de Ayacucho', 'Paso del cóndor', 'Finta de Pichincha'],
  artigas: ['Sable de rienda', 'Salto de posta', 'Giro de estribo'],
  mujica: ['Golpe de azada', 'Surco ascendente', 'Contrapie de la chacra'],
  degaulle: ['Saludo de flanco', 'Enlace aéreo', 'Línea de radio'],
  mitterrand: ['Finta de tribuna', 'Arco de cristal', 'Réplica tardía'],
  chirac: ['Toque de escudo', 'Escalinata del Elíseo', 'Vuelta de guardia'],
  masaryk: ['Péndulo de Praga', 'Luz del castillo', 'Arco del reloj'],
  havel: ['Cambio de escena', 'Tramoya', 'Mutis por el foro'],
  walesa: ['Gancho de astillero', 'Grúa del Báltico', 'Turno de relevo'],
  pertini: ['Punta alpina', 'Cresta de la cordillera', 'Viraje de ladera'],
  kekkonen: ['Bastón de salida', 'Salto de esquí', 'Cambio de pista'],
  mandela: ['Gancho de apertura', 'Ascenso de la plaza', 'Segunda campana'],
  sankara: ['Paso de vanguardia', 'Impulso íntegro', 'Giro de patrulla'],
  nkrumah: ['Toque de estrella', 'Cenit solar', 'Eco de horizonte'],
  nyerere: ['Giro de bastón', 'Círculo comunitario', 'Raíz compartida'],
  ataturk: ['Punta de apertura', 'Paso de Anatolia', 'Sable de retorno'],
  sunyatsen: ['Réplica del bastón', 'Escalón republicano', 'Giro de asamblea'],
  kalam: ['Toque de ignición', 'Etapa orbital', 'Cápsula de retorno'],
  lula: ['Golpe de asamblea', 'Ascenso del sindicato', 'Turno de fábrica'],
  juana: ['Apertura · alto carga reverso', 'Ascenso · alto carga reverso', 'Réplica · alto carga reverso'],
  espartaco: ['Apertura · gancho carga', 'Ascenso · gancho carga', 'Réplica · gancho carga'],
  musashi: ['Apertura · punta reverso bajo', 'Ascenso · punta reverso bajo', 'Réplica · punta reverso bajo'],
  policarpa: ['Apertura · toque bajo toque', 'Ascenso · toque bajo toque', 'Réplica · toque bajo toque'],
  wallace: ['Apertura · carga martillo', 'Ascenso · carga martillo', 'Réplica · carga martillo'],
  elcid: ['Apertura · punta alto toque', 'Ascenso · punta alto toque', 'Réplica · punta alto toque'],
  ricaurte: ['Apertura · bajo carga', 'Ascenso · bajo carga', 'Réplica · bajo carga'],
  simo: ['Apertura · toque reverso bajo', 'Ascenso · toque reverso bajo', 'Réplica · toque reverso bajo'],
  abelardo: ['Apertura · gancho bajo reverso', 'Ascenso · gancho bajo reverso', 'Réplica · gancho bajo reverso'],
  petro: ['Apertura · alto bajo toque', 'Ascenso · alto bajo toque', 'Réplica · alto bajo toque'],
  uribe: ['Apertura · bajo reverso alto', 'Ascenso · bajo reverso alto', 'Réplica · bajo reverso alto'],
  santos: ['Apertura · martillo alto toque', 'Ascenso · martillo alto toque', 'Réplica · martillo alto toque'],
  duque: ['Apertura · toque gancho bajo', 'Ascenso · toque gancho bajo', 'Réplica · toque gancho bajo'],
  bukele: ['Apertura · bajo pausa alto', 'Ascenso · bajo pausa alto', 'Réplica · bajo pausa alto'],
  sheinbaum: ['Apertura · alto reverso toque', 'Ascenso · alto reverso toque', 'Réplica · alto reverso toque'],
  milei: ['Apertura · carga alto bajo', 'Ascenso · carga alto bajo', 'Réplica · carga alto bajo'],
  trump: ['Apertura · martillo toque alto', 'Ascenso · martillo toque alto', 'Réplica · martillo toque alto'],
  macron: ['Apertura · punta toque reverso', 'Ascenso · punta toque reverso', 'Réplica · punta toque reverso'],
  noboa: ['Apertura · toque carga bajo', 'Ascenso · toque carga bajo', 'Réplica · toque carga bajo'],
  kast: ['Apertura · martillo bajo toque', 'Ascenso · martillo bajo toque', 'Réplica · martillo bajo toque'],
  biden: ['Apertura · toque pausa reverso', 'Ascenso · toque pausa reverso', 'Réplica · toque pausa reverso'],
};

function book(jab, neutral, up, down) {
  return { jab, neutral, up, down };
}
const lift = (name, phrase, vy, vx = 0, effect = '') => move(name, phrase, { launch: { vy, vx }, effect });

const threeThrusts = move('Tres estocadas', 'punta punta punta');
for (const phase of threeThrusts.ph.slice(0, 2)) {
  phase.bk = 0.45;
  phase.ks = 0.015;
  phase.mv = 1.6;
}

const phalanx = move('Empuje Falange', 'barrido suelo');
const frontWave = phalanx.sp[0];
frontWave.p.life = 15;
frontWave.p.bk = 9;
phalanx.sp.push({ ...frontWave, p: { ...frontWave.p, back: true } });

const featured = {
  bolivar: book(
    threeThrusts,
    move('Onda Patriótica', 'onda'),
    lift('Salto de Campaña', 'punta alto', -17, 7, 'ledge'),
    move('Decreto de Guerra', '', { effect: 'seal', dur: 22 }),
  ),
  robinson: book(
    move('Compás del cetro', 'toque alto toque'),
    move('Orbe de Pulso', 'orbe'),
    lift('Levitación Cuántica', '', -2, 0, 'hover'),
    move('Campo Escudo', '', { effect: 'barrier', dur: 24 }),
  ),
  cesar: book(
    move('Pomo y filo', 'toque punta'),
    move('Gladius Voraz', 'carga punta', { pierce: true }),
    lift('Ascenso del Senado', 'gancho alto', -18, 0, 'standard'),
    move('Formación Testudo', '', { effect: 'testudo', dur: 36 }),
  ),
  alejandro: book(
    move('Regatón de sarissa', 'bajo reverso punta'),
    move('Estocada de Caballería', 'sarissa'),
    lift('Vuelo de Bucéfalo', 'carga alto punta', -16, 8, 'horse'),
    phalanx,
  ),
  aquiles: book(
    move('Talón alado', 'bajo alto toque'),
    move('Corte de los Mirmidones', 'cruce retorno cruce'),
    lift('Salto Divino', 'alto pausa gancho', -22, 0, 'olympus'),
    move('Furia de Tesalia', '', { effect: 'rage', dur: 23 }),
  ),
};

const newSignatures = {
  juana: move('Estandarte de Orleans', 'onda punta'),
  espartaco: move('Ruptura de cadenas', 'carga martillo barrido'),
  musashi: move('Cruce de los dos cielos', 'cruce pausa reverso punta'),
  policarpa: move('Finta de La Pola', 'bajo pausa retorno'),
  petro: move('Órbita de la plaza', 'orbe suelo'),
  bukele: move('Doble destello', 'rayo pausa rayo punta'),
  sheinbaum: move('Trayectoria orbital', 'arco orbe arco'),
};

export function movesFor(data, legacySignatures = false) {
  if (data.isCustom) return null; // El editor mantiene sus ataques configurados.
  if (featured[data.id]) return new Fighter(featured[data.id]);
  const phrases = repertoire[data.id];
  if (!phrases) return null;
  const [jab, neutral, up, down] = phrases;
  const [jabName, upName, downName] = labels[data.id];
  return new Fighter(
    book(
      move(jabName, jab),
      (!legacySignatures && newSignatures[data.id]) || move(data.sigName, neutral),
      lift(upName, up, -data.stats.jumpForce - 3, up.startsWith('carga') ? 6 : 1),
      move(downName, down),
    ),
  );
}
