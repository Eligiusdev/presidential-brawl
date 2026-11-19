import {
  AttackPhase,
  PresidentData,
  ProjectileSpawnSpec,
  SpecialMoveInfo,
  WeaponType,
} from '../types/game';

export interface MoveContext {
  face: number;
  on: boolean;
  dir: number; // -1, 0, 1 horizontal input
  upHeld: boolean;
  downHeld: boolean;
  jabStep: number;
  power: number;
  weaponType: WeaponType;
  hasItemWeapon: boolean;
  itemWeaponKind: string | null;
}

export interface MoveStartEffect {
  vx?: number;
  vy?: number;
  inv?: number;
  sound?: string;
  burstCol?: string;
  burstCount?: number;
  floorZone?: { kind: 'speed_seal' | 'hazard_seal'; r: number; dur: number; col: string };
  barrier?: { w: number; h: number; dur: number; col: string };
  speedBuffT?: number;
  furyT?: number;
  quantumFloatT?: number;
  testudoT?: number;
  mountT?: number;
  bannerText?: string;
}

export interface MoveAttackSpec {
  k: 'l' | 'h';
  moveKind:
    | 'jab'
    | 'ftilt'
    | 'utilt'
    | 'dtilt'
    | 'nair'
    | 'fair'
    | 'bair'
    | 'uair'
    | 'dair'
    | 'sig'
    | 'upSpec'
    | 'downSpec';
  moveLabel: string;
  dur: number;
  heavy?: boolean;
  hop?: { t: number; vy: number; vx?: number };
  ph: AttackPhase[];
  sp: ProjectileSpawnSpec[];
  onStart?: MoveStartEffect;
}

/**
 * Clase base modular para el moveset individual de cada luchador.
 * Cada personaje sobrescribe neutralAttack, specialNeutral, specialUp y specialDown.
 */
export abstract class BaseFighterMoveset {
  readonly data: PresidentData;

  constructor(data: PresidentData) {
    this.data = data;
  }

  abstract getMovesetInfo(): SpecialMoveInfo;

  neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const isSaber = ctx.weaponType === 'saber' && !ctx.hasItemWeapon;
    const isSpear = ctx.weaponType === 'spear' && !ctx.hasItemWeapon;
    const isStaff = ctx.weaponType === 'staff' && !ctx.hasItemWeapon;
    const reachW = isSpear ? 78 : isSaber ? 60 : isStaff ? 54 : 48;
    const reachFx = isSpear ? 10 : isSaber ? 8 : 10;
    const step = ctx.jabStep % 3;

    if (!ctx.on) {
      if (ctx.upHeld) {
        return {
          k: 'l',
          moveKind: 'uair',
          moveLabel: 'Aéreo Ascendente',
          dur: 21,
          ph: [
            {
              a: [4, 12],
              hb: { fx: -18, y: -126, w: isSpear ? 68 : 56, h: 56 },
              dmg: 6.2 * P,
              bk: 4.5,
              ks: 0.12,
              ang: -82,
              fx: isSaber || isSpear ? 'sword' : undefined,
            },
          ],
          sp: [],
        };
      }
      if (ctx.downHeld) {
        return {
          k: 'l',
          moveKind: 'dair',
          moveLabel: 'Meteoro Descendente',
          dur: 24,
          ph: [
            {
              a: [5, 16],
              hb: { fx: -18, y: -6, w: isSpear ? 52 : 44, h: 42 },
              dmg: 7.4 * P,
              bk: 4.8,
              ks: 0.14,
              ang: 78,
              fx: isSaber || isSpear ? 'sword' : undefined,
            },
          ],
          sp: [],
        };
      }
      if (ctx.dir !== 0 && ctx.dir !== ctx.face) {
        return {
          k: 'l',
          moveKind: 'bair',
          moveLabel: 'Aéreo Inverso',
          dur: 22,
          ph: [
            {
              a: [5, 13],
              hb: { fx: isSpear ? -82 : -62, y: -82, w: isSpear ? 72 : 54, h: 38 },
              dmg: 6.8 * P,
              bk: 4.9,
              ks: 0.13,
              ang: -156,
              fx: isSaber || isSpear ? 'sword' : undefined,
            },
          ],
          sp: [],
        };
      }
      if (ctx.dir !== 0 && ctx.dir === ctx.face) {
        return {
          k: 'l',
          moveKind: 'fair',
          moveLabel: 'Aéreo Frontal',
          dur: 20,
          ph: [
            {
              a: [4, 13],
              hb: { fx: reachFx, y: -84, w: reachW + 4, h: 40 },
              dmg: 5.9 * P,
              bk: 4.1,
              ks: 0.11,
              ang: -28,
              fx: isSaber || isSpear ? 'sword' : undefined,
            },
          ],
          sp: [],
        };
      }
      return {
        k: 'l',
        moveKind: 'nair',
        moveLabel: 'Giro Aéreo',
        dur: 21,
        ph: [
          {
            a: [4, 14],
            hb: { fx: -28, y: -90, w: isSpear ? 72 : 56, h: 56 },
            dmg: 5.2 * P,
            bk: 3.5,
            ks: 0.09,
            ang: -38,
            fx: isSaber || isSpear ? 'sword' : undefined,
          },
        ],
        sp: [],
      };
    }

    if (ctx.upHeld) {
      return {
        k: 'l',
        moveKind: 'utilt',
        moveLabel: 'Corte Antiaéreo',
        dur: 20,
        ph: [
          {
            a: [4, 12],
            hb: { fx: -10, y: -124, w: isSpear ? 68 : 56, h: 66 },
            dmg: 5.5 * P,
            bk: 4.1,
            ks: 0.11,
            ang: -84,
            fx: isSaber || isSpear ? 'sword' : undefined,
          },
        ],
        sp: [],
      };
    }
    if (ctx.downHeld) {
      return {
        k: 'l',
        moveKind: 'dtilt',
        moveLabel: 'Barrido Bajo',
        dur: 18,
        ph: [
          {
            a: [4, 11],
            hb: { fx: reachFx, y: -36, w: reachW + 2, h: 32 },
            dmg: 4.8 * P,
            bk: 3.6,
            ks: 0.08,
            ang: -68,
            fx: isSaber || isSpear ? 'sword' : undefined,
          },
        ],
        sp: [],
      };
    }
    if (ctx.dir !== 0) {
      return {
        k: 'l',
        moveKind: 'ftilt',
        moveLabel: 'Ataque Fuerte Frontal',
        dur: 19,
        ph: [
          {
            a: [4, 12],
            hb: { fx: reachFx, y: -78, w: reachW + 6, h: 36 },
            dmg: 5.4 * P,
            bk: 3.5,
            ks: 0.11,
            ang: -24,
            fx: isSaber || isSpear ? 'sword' : undefined,
          },
        ],
        sp: [],
      };
    }

    const fin = step === 2;
    return {
      k: 'l',
      moveKind: 'jab',
      moveLabel: this.getMovesetInfo().neutralName,
      dur: fin ? 22 : 16,
      ph: [
        {
          a: [3, 10],
          hb: { fx: reachFx, y: -76, w: reachW, h: 36 },
          dmg: (fin ? 5.8 : 3.9) * P,
          bk: fin ? 4.8 : 2.3,
          ks: fin ? 0.14 : 0.07,
          ang: fin ? -30 : -18,
          fx: isSaber || isSpear ? 'sword' : undefined,
        },
      ],
      sp: [],
    };
  }

  abstract specialNeutral(ctx: MoveContext): MoveAttackSpec;
  abstract specialUp(ctx: MoveContext): MoveAttackSpec;
  abstract specialDown(ctx: MoveContext): MoveAttackSpec;
}

// =============================================================================
// 1. SIMÓN BOLÍVAR — Espadachín Táctico de Corto-Medio Alcance
// =============================================================================
export class BolivarMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Ráfaga Libertadora',
      neutralDesc: 'Tres estocadas veloces con sable de luz tricolor.',
      specialNeutralName: 'Onda Patriótica',
      specialNeutralDesc: 'Lanza una estela horizontal tricolor desde el filo de su sable.',
      specialUpName: 'Salto de Campaña',
      specialUpDesc: 'Se impulsa en diagonal ascendente con estela de sable para alcanzar plataformas altas.',
      specialDownName: 'Decreto de Guerra',
      specialDownDesc: 'Graba un sello dorado en el suelo que acelera su velocidad de movimiento.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const step = ctx.jabStep % 3;
      const fin = step === 2;
      return {
        ...base,
        moveLabel: 'Ráfaga Libertadora',
        dur: fin ? 20 : 14,
        ph: [
          {
            a: [2, 9],
            hb: { fx: 8, y: -78, w: fin ? 64 : 58, h: 38 },
            dmg: (fin ? 6.2 : step === 1 ? 4.1 : 3.7) * P,
            bk: fin ? 5.1 : 2.2,
            ks: fin ? 0.15 : 0.06,
            ang: fin ? -32 : -14,
            mv: step === 1 ? 3.2 : 1.5,
            fx: 'sword',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Onda Patriótica',
      dur: 34,
      heavy: true,
      ph: [
        { a: [6, 14], hb: { fx: 10, y: -80, w: 58, h: 42 }, dmg: 6.2 * P, bk: 4.0, ks: 0.1, ang: -22, mv: 2.5, fx: 'sword' },
      ],
      sp: [
        {
          t: 9,
          p: {
            fx: 24,
            y: -76,
            w: 44,
            h: 52,
            vx: 11.4,
            life: 58,
            kind: 'tricolor_wave',
            dmg: 10.2 * P,
            bk: 5.8,
            ks: 0.16,
            ang: -24,
          },
        },
      ],
      onStart: { sound: 'sword', burstCol: '#f0c43c', burstCount: 10 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const hDir = ctx.dir !== 0 ? ctx.dir : ctx.face;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Salto de Campaña',
      dur: 34,
      heavy: true,
      ph: [
        { a: [3, 21], hb: { fx: -6, y: -120, w: 66, h: 96 }, dmg: 10.4 * P, bk: 6.6, ks: 0.22, ang: -74, fx: 'sword' },
      ],
      sp: [],
      onStart: {
        vx: hDir * 6.8,
        vy: -15.2,
        sound: 'sword',
        burstCol: '#fcd116',
        burstCount: 14,
      },
    };
  }

  specialDown(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Decreto de Guerra',
      dur: 28,
      heavy: true,
      ph: [
        { a: [6, 15], hb: { fx: -28, y: -32, w: 72, h: 34 }, dmg: 5.4 * P, bk: 4.8, ks: 0.11, ang: -58, fx: 'gold' },
      ],
      sp: [],
      onStart: {
        sound: 'seal',
        burstCol: '#f0c43c',
        burstCount: 16,
        floorZone: { kind: 'speed_seal', r: 78, dur: 270, col: '#f0c43c' },
        speedBuffT: 270,
        bannerText: 'DECRETO DE GUERRA',
      },
    };
  }
}

// =============================================================================
// 2. MARY ROBINSON / DOCTORA PULSO — Mística Tecnológica (Control de Espacio)
// =============================================================================
export class DoctoraPulsoMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Pulso de Cetro',
      neutralDesc: 'Golpes rápidos y precisos con su cetro de energía esmeralda.',
      specialNeutralName: 'Orbe de Pulso',
      specialNeutralDesc: 'Esfera verde que rebota en las plataformas y atrapa al rival brevemente.',
      specialUpName: 'Levitación Cuántica',
      specialUpDesc: 'Flota libremente hacia arriba envuelta en un campo protector por 2 segundos.',
      specialDownName: 'Campo Escudo',
      specialDownDesc: 'Despliega una barrera estática que absorbe proyectiles enemigos.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Pulso de Cetro',
        dur: fin ? 20 : 15,
        ph: [
          {
            a: [3, 10],
            hb: { fx: 8, y: -76, w: 54, h: 36 },
            dmg: (fin ? 5.6 : 3.9) * P,
            bk: fin ? 4.8 : 2.3,
            ks: fin ? 0.14 : 0.06,
            ang: fin ? -32 : -18,
            fx: 'pulse',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Orbe de Pulso',
      dur: 38,
      heavy: true,
      ph: [],
      sp: [
        {
          t: 10,
          p: {
            fx: 24,
            y: -66,
            w: 32,
            h: 32,
            vx: 8.6,
            vy: 2.1,
            bounces: 3,
            life: 88,
            kind: 'pulse',
            dmg: 9.2 * P,
            bk: 4.2,
            ks: 0.12,
            ang: -28,
            hold: 24,
          },
        },
      ],
      onStart: { burstCol: '#18d48c', burstCount: 10 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Levitación Cuántica',
      dur: 30,
      heavy: true,
      ph: [
        { a: [2, 18], hb: { fx: -34, y: -102, w: 68, h: 94 }, dmg: 7.4 * P, bk: 5.4, ks: 0.14, ang: -74, armor: true, fx: 'pulse' },
      ],
      sp: [],
      onStart: {
        vx: ctx.dir * 4.5,
        vy: -10.4,
        quantumFloatT: 120,
        sound: 'shield',
        burstCol: '#98ffe0',
        burstCount: 16,
      },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Campo Escudo',
      dur: 24,
      heavy: true,
      ph: [],
      sp: [],
      onStart: {
        sound: 'shield',
        burstCol: '#18d48c',
        burstCount: 14,
        barrier: { w: 22, h: 98, dur: 250, col: '#18d48c' },
        bannerText: 'CAMPO ESCUDO',
      },
    };
  }
}

// =============================================================================
// 3. JULIO CÉSAR — Estratega Romano (Presión Cercana / Rushdown)
// =============================================================================
export class JulioCesarMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Corte del Rubicón',
      neutralDesc: 'Combo agresivo de tajo, golpe de pomo y estocada con gladius.',
      specialNeutralName: 'Gladius Voraz',
      specialNeutralDesc: 'Estiletazo veloz con avance frontal que rompe la guardia y escudos.',
      specialUpName: 'Ascenso del Senado',
      specialUpDesc: 'Salto acrobático vertical impulsado por estandartes legionarios.',
      specialDownName: 'Formación Testudo',
      specialDownDesc: 'Escudo romano inmune a proyectiles que contraataca golpes físicos.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const step = ctx.jabStep % 3;
      const fin = step === 2;
      return {
        ...base,
        moveLabel: 'Corte del Rubicón',
        dur: fin ? 20 : 14,
        ph: [
          {
            a: [2, 9],
            hb: { fx: 8, y: -76, w: 54, h: 36 },
            dmg: (fin ? 6.4 : 4.2) * P,
            bk: fin ? 5.2 : 2.1,
            ks: fin ? 0.16 : 0.06,
            ang: fin ? -24 : -10,
            mv: step === 1 ? 2.8 : 1.6,
            fx: 'sword',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Gladius Voraz',
      dur: 34,
      heavy: true,
      ph: [
        {
          a: [5, 17],
          hb: { fx: 10, y: -76, w: 66, h: 42 },
          dmg: 11.8 * P,
          bk: 6.4,
          ks: 0.21,
          ang: -22,
          mv: 12.2,
          guardBreak: true,
          fx: 'sword',
        },
      ],
      sp: [],
      onStart: { sound: 'sword', burstCol: '#ef4444', burstCount: 12 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Ascenso del Senado',
      dur: 34,
      heavy: true,
      ph: [
        { a: [3, 21], hb: { fx: -14, y: -124, w: 60, h: 98 }, dmg: 10.6 * P, bk: 6.5, ks: 0.22, ang: -82, fx: 'gold' },
      ],
      sp: [],
      onStart: {
        vx: ctx.dir * 3.8,
        vy: -15.8,
        sound: 'sword',
        burstCol: '#facc15',
        burstCount: 16,
      },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Formación Testudo',
      dur: 38,
      heavy: true,
      ph: [{ a: [0, 38], armor: true, fx: 'gold' }],
      sp: [],
      onStart: {
        testudoT: 64,
        sound: 'shield',
        burstCol: '#facc15',
        burstCount: 14,
        bannerText: 'FORMACIÓN TESTUDO',
      },
    };
  }
}

// =============================================================================
// 4. ALEJANDRO MAGNO — El Conquistador (Rango Medio con Lanza Sarissa)
// =============================================================================
export class AlejandroMagnoMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Pica de Macedonia',
      neutralDesc: 'Estocadas y barridos de largo alcance con su lanza Sarissa.',
      specialNeutralName: 'Estocada de Caballería',
      specialNeutralDesc: 'Ataque frontal de larguísimo alcance con la lanza Sarissa.',
      specialUpName: 'Vuelo de Bucéfalo',
      specialUpDesc: 'Salto místico montado en una silueta luminosa de su corcel Bucéfalo.',
      specialDownName: 'Empuje Falange',
      specialDownDesc: 'Barre el suelo creando ondas expansivas cortas que repelen rivales cercanos.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Pica de Macedonia',
        dur: fin ? 23 : 16,
        ph: [
          {
            a: [3, 11],
            hb: { fx: 10, y: -76, w: fin ? 84 : 76, h: 32 },
            dmg: (fin ? 6.5 : 4.2) * P,
            bk: fin ? 5.4 : 2.5,
            ks: fin ? 0.16 : 0.08,
            ang: fin ? -26 : -14,
            fx: 'sword',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Estocada de Caballería',
      dur: 38,
      heavy: true,
      ph: [
        {
          a: [8, 22],
          hb: { fx: 12, y: -78, w: 94, h: 36 },
          dmg: 11.4 * P,
          bk: 6.8,
          ks: 0.22,
          ang: -24,
          mv: 8.4,
          fx: 'sword',
        },
      ],
      sp: [],
      onStart: { sound: 'sword', burstCol: '#fbbf24', burstCount: 12 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const hDir = ctx.dir !== 0 ? ctx.dir : ctx.face;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Vuelo de Bucéfalo',
      dur: 38,
      heavy: true,
      ph: [
        { a: [3, 24], hb: { fx: -20, y: -116, w: 86, h: 96 }, dmg: 11.2 * P, bk: 6.8, ks: 0.23, ang: -70, fx: 'gold' },
      ],
      sp: [],
      onStart: {
        vx: hDir * 5.2,
        vy: -15.4,
        mountT: 40,
        sound: 'heavy',
        burstCol: '#fff3a0',
        burstCount: 18,
      },
    };
  }

  specialDown(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Empuje Falange',
      dur: 32,
      heavy: true,
      ph: [
        { a: [6, 15], hb: { fx: -54, y: -40, w: 108, h: 36 }, dmg: 8.0 * P, bk: 6.2, ks: 0.16, ang: -42, fx: 'gold' },
      ],
      sp: [
        {
          t: 8,
          p: { fx: 18, y: -28, w: 28, h: 28, vx: 8.2, life: 24, kind: 'phalanx_wave', dmg: 6.8 * P, bk: 5.8, ks: 0.15, ang: -38 },
        },
        {
          t: 8,
          p: {
            fx: 18,
            y: -28,
            w: 28,
            h: 28,
            vx: -8.2,
            life: 24,
            kind: 'phalanx_wave',
            dmg: 6.8 * P,
            bk: 5.8,
            ks: 0.15,
            ang: -38,
            back: true,
          },
        },
      ],
      onStart: { sound: 'heavy', burstCol: '#f59e0b', burstCount: 14 },
    };
  }
}

// =============================================================================
// 5. AQUILES — Héroe Mítico (Agilidad Extrema y Furia de Tesalia)
// =============================================================================
export class AquilesMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Torbellino de Ptía',
      neutralDesc: 'Ráfaga vertiginosa de tres golpes con lanza y hoja de bronce.',
      specialNeutralName: 'Corte de los Mirmidones',
      specialNeutralDesc: 'Combo supersónico que atraviesa al enemigo dejando estelas doradas.',
      specialUpName: 'Salto Divino',
      specialUpDesc: 'Salto vertical altísimo impulsado por gracia olímpica.',
      specialDownName: 'Furia de Tesalia',
      specialDownDesc: 'Furia dorada 5s (+Knockback y Fuerza), pero el daño se duplica en su talón trasero.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Torbellino de Ptía',
        dur: fin ? 17 : 12,
        ph: [
          {
            a: [2, 8],
            hb: { fx: 8, y: -76, w: 68, h: 34 },
            dmg: (fin ? 5.8 : 3.6) * P,
            bk: fin ? 5.0 : 2.1,
            ks: fin ? 0.15 : 0.06,
            ang: fin ? -26 : -14,
            mv: 2.2,
            fx: 'sword',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Corte de los Mirmidones',
      dur: 32,
      heavy: true,
      ph: [
        {
          a: [4, 15],
          hb: { fx: -8, y: -82, w: 72, h: 52 },
          dmg: 5.5 * P,
          bk: 2.8,
          ks: 0.07,
          ang: -18,
          mv: 15.8,
          passThrough: true,
          fx: 'sword',
        },
        {
          a: [17, 24],
          hb: { fx: -22, y: -86, w: 78, h: 56 },
          dmg: 7.4 * P,
          bk: 6.4,
          ks: 0.21,
          ang: -36,
          mv: 3.5,
          fx: 'gold',
        },
      ],
      sp: [],
      onStart: { sound: 'sword', inv: 10, burstCol: '#ffd43b', burstCount: 16 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Salto Divino',
      dur: 34,
      heavy: true,
      ph: [
        { a: [2, 20], hb: { fx: -14, y: -128, w: 64, h: 102 }, dmg: 10.2 * P, bk: 6.4, ks: 0.22, ang: -85, fx: 'gold' },
      ],
      sp: [],
      onStart: {
        vx: ctx.dir * 4.2,
        vy: -17.0,
        sound: 'sword',
        burstCol: '#fff3a0',
        burstCount: 18,
      },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Furia de Tesalia',
      dur: 24,
      heavy: true,
      ph: [],
      sp: [],
      onStart: {
        furyT: 300,
        sound: 'fury',
        burstCol: '#fbbf24',
        burstCount: 22,
        bannerText: 'FURIA DE TESALIA',
      },
    };
  }
}

// =============================================================================
// 6. NAYIB BUKELE — Estratega Digital (Proyectil Crypto Blast y Viento Eléctrico)
// =============================================================================
export class BukeleMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Ráfaga Ejecutiva',
      neutralDesc: 'Tres golpes rápidos y precisos de corta distancia con impulso eléctrico.',
      specialNeutralName: 'Crypto Blast',
      specialNeutralDesc: 'Lanza un proyectil digital de Bitcoin envuelto en ráfagas eléctricas azules.',
      specialUpName: 'Salto Bitcóin',
      specialUpDesc: 'Propulsión vertical veloz con estela cian para recuperar altura al instante.',
      specialDownName: 'Nodo Digital',
      specialDownDesc: 'Activa un sello tecnológico en el suelo que acelera su velocidad de combate.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Ráfaga Ejecutiva',
        dur: fin ? 18 : 13,
        ph: [
          {
            a: [2, 8],
            hb: { fx: 10, y: -74, w: 52, h: 36 },
            dmg: (fin ? 5.9 : 3.9) * P,
            bk: fin ? 5.1 : 2.1,
            ks: fin ? 0.16 : 0.06,
            ang: fin ? -24 : -14,
            mv: fin ? 3.2 : 1.5,
            fx: 'sword',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(_ctx: MoveContext): MoveAttackSpec {
    const P = _ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Crypto Blast',
      dur: 34,
      heavy: true,
      ph: [{ a: [8, 14], hb: { fx: 12, y: -74, w: 38, h: 36 }, dmg: 4.5 * P, bk: 3.4, ks: 0.08, ang: -18, mv: 3.5 }],
      sp: [
        {
          t: 10,
          p: {
            fx: 24,
            y: -74,
            w: 38,
            h: 34,
            vx: 10.6,
            life: 62,
            kind: 'crypto_wave',
            dmg: 10.4 * P,
            bk: 6.2,
            ks: 0.18,
            ang: -24,
          },
        },
      ],
      onStart: { sound: 'pulse', burstCol: '#38bdf8', burstCount: 16 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Salto Bitcóin',
      dur: 32,
      heavy: true,
      ph: [{ a: [3, 18], hb: { fx: -12, y: -116, w: 52, h: 88 }, dmg: 8.8 * P, bk: 5.8, ks: 0.19, ang: -78 }],
      sp: [],
      onStart: { vx: ctx.dir * 5.2, vy: -15.6, sound: 'dash', burstCol: '#7dd3fc', burstCount: 14 },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Nodo Digital',
      dur: 26,
      heavy: true,
      ph: [],
      sp: [],
      onStart: {
        speedBuffT: 240,
        sound: 'seal',
        burstCol: '#38bdf8',
        burstCount: 18,
        floorZone: { kind: 'speed_seal', r: 70, dur: 260, col: '#38bdf8' },
        bannerText: 'NODO DIGITAL',
      },
    };
  }
}

// =============================================================================
// 7. GUSTAVO PETRO — Estratega Andino (Andean Gust y Energía Esmeralda)
// =============================================================================
export class PetroMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Pulso de Nariño',
      neutralDesc: 'Combo fluido con proyección de ráfagas verde y oro.',
      specialNeutralName: 'Andean Gust',
      specialNeutralDesc: 'Desata una ola giratoria de energía verde y dorada con viento andino.',
      specialUpName: 'Vuelo del Cóndor',
      specialUpDesc: 'Ascenso diagonal envuelto en corrientes esmeralda de gran alcance.',
      specialDownName: 'Pacto Verde',
      specialDownDesc: 'Genera una barrera de energía natural que absorbe proyectiles enemigos.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Pulso de Nariño',
        dur: fin ? 20 : 14,
        ph: [
          {
            a: [3, 9],
            hb: { fx: 10, y: -76, w: 54, h: 38 },
            dmg: (fin ? 6.1 : 4.0) * P,
            bk: fin ? 5.2 : 2.3,
            ks: fin ? 0.16 : 0.07,
            ang: fin ? -28 : -16,
            fx: 'gold',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Andean Gust',
      dur: 36,
      heavy: true,
      ph: [{ a: [8, 15], hb: { fx: 10, y: -78, w: 46, h: 42 }, dmg: 5.0 * P, bk: 3.6, ks: 0.09, ang: -24, mv: 3.2 }],
      sp: [
        {
          t: 11,
          p: {
            fx: 24,
            y: -78,
            w: 42,
            h: 44,
            vx: 9.8,
            life: 60,
            kind: 'nature_wave',
            dmg: 10.6 * P,
            bk: 6.4,
            ks: 0.2,
            ang: -26,
          },
        },
      ],
      onStart: { sound: 'pulse', burstCol: '#22c55e', burstCount: 16 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Vuelo del Cóndor',
      dur: 34,
      heavy: true,
      ph: [{ a: [4, 20], hb: { fx: -14, y: -118, w: 58, h: 92 }, dmg: 9.2 * P, bk: 6.0, ks: 0.2, ang: -76, fx: 'gold' }],
      sp: [],
      onStart: { vx: ctx.dir * 5.0, vy: -15.4, sound: 'sword', burstCol: '#22c55e', burstCount: 15 },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Pacto Verde',
      dur: 30,
      heavy: true,
      ph: [],
      sp: [],
      onStart: {
        sound: 'shield',
        burstCol: '#22c55e',
        burstCount: 16,
        barrier: { w: 28, h: 96, dur: 180, col: '#22c55e' },
        bannerText: 'PACTO VERDE',
      },
    };
  }
}

// =============================================================================
// 8. DONALD TRUMP — Coloso Ejecutivo (Executive Strike y Aura Dorada)
// =============================================================================
export class TrumpMoveset extends BaseFighterMoveset {
  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: 'Negociación Directa',
      neutralDesc: 'Ganchos pesados de gran contundencia y empuje corporal.',
      specialNeutralName: 'Executive Strike',
      specialNeutralDesc: 'Puñetazo frontal con aura dorada y viento tricolor que rompe la guardia.',
      specialUpName: 'Ascensor Torre',
      specialUpDesc: 'Uppercut vertical blindado que eleva a los rivales cercanos.',
      specialDownName: 'Arancel Blindado',
      specialDownDesc: 'Impacto al suelo con Super Armor que genera ondas expansivas a ambos lados.',
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: 'Negociación Directa',
        dur: fin ? 22 : 16,
        ph: [
          {
            a: [4, 11],
            hb: { fx: 10, y: -76, w: 54, h: 42 },
            dmg: (fin ? 7.2 : 4.8) * P,
            bk: fin ? 6.0 : 2.6,
            ks: fin ? 0.19 : 0.08,
            ang: fin ? -18 : -10,
            fx: 'gold',
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(_ctx: MoveContext): MoveAttackSpec {
    const P = _ctx.power;
    return {
      k: 'h',
      moveKind: 'sig',
      moveLabel: 'Executive Strike',
      dur: 38,
      heavy: true,
      ph: [
        { a: [0, 12], armor: true, fx: 'charge' },
        {
          a: [13, 24],
          hb: { fx: 10, y: -78, w: 68, h: 48 },
          dmg: 13.2 * P,
          bk: 7.4,
          ks: 0.25,
          ang: -18,
          mv: 11.4,
          guardBreak: true,
          fx: 'gold',
        },
      ],
      sp: [],
      onStart: { sound: 'heavy', burstCol: '#fbbf24', burstCount: 18 },
    };
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: 'Ascensor Torre',
      dur: 36,
      heavy: true,
      ph: [
        { a: [3, 20], hb: { fx: -12, y: -120, w: 58, h: 94 }, dmg: 11.2 * P, bk: 6.8, ks: 0.23, ang: -82, armor: true, fx: 'gold' },
      ],
      sp: [],
      onStart: { vx: ctx.dir * 3.4, vy: -15.2, sound: 'heavy', burstCol: '#ef4444', burstCount: 16 },
    };
  }

  specialDown(_ctx: MoveContext): MoveAttackSpec {
    const P = _ctx.power;
    return {
      k: 'h',
      moveKind: 'downSpec',
      moveLabel: 'Arancel Blindado',
      dur: 34,
      heavy: true,
      ph: [
        { a: [0, 8], armor: true, fx: 'charge' },
        { a: [9, 17], hb: { fx: -46, y: -42, w: 92, h: 40 }, dmg: 8.6 * P, bk: 6.4, ks: 0.17, ang: -44, fx: 'gold' },
      ],
      sp: [
        { t: 10, p: { fx: 20, y: -26, w: 28, h: 26, vx: 7.2, life: 26, kind: 'shock', dmg: 6.8 * P, bk: 5.4, ks: 0.14, ang: -40 } },
        { t: 10, p: { fx: 20, y: -26, w: 28, h: 26, vx: -7.2, life: 26, kind: 'shock', dmg: 6.8 * P, bk: 5.4, ks: 0.14, ang: -40, back: true } },
      ],
      onStart: { sound: 'heavy', burstCol: '#3b82f6', burstCount: 18 },
    };
  }
}

// =============================================================================
// ARQUITECTURA INDIVIDUAL PARA CADA UNO DE LOS 36 PRESIDENTES RESTANTES (CERO CLONACIÓN)
// =============================================================================
type DownTechKind = 'speed_seal' | 'shield_barrier' | 'testudo' | 'phalanx_push' | 'fury_surge' | 'shock_trap';

interface UniquePresidentBlueprint {
  neutralName: string;
  neutralDesc: string;
  jabReach: number;
  jabDur: number;
  jabDmg: number;
  specialNeutralName: string;
  specialNeutralDesc: string;
  snKind: 'lunge_guardbreak' | 'dash_slash' | 'long_pierce' | 'wall' | 'bars' | 'pulse' | 'quake' | 'breaker' | 'tiger' | 'uppercut';
  snDmg: number;
  snBk: number;
  snVx?: number;
  snColor: string;
  specialUpName: string;
  specialUpDesc: string;
  upVy: number;
  upVx: number;
  upStyle: 'blade' | 'quantum' | 'mount' | 'banner' | 'quake';
  specialDownName: string;
  specialDownDesc: string;
  downKind: DownTechKind;
  downColor: string;
}

const PRESIDENT_BLUEPRINTS: Record<string, UniquePresidentBlueprint> = {
  washington: {
    neutralName: 'Sable Continental',
    neutralDesc: 'Esgrima disciplinada de tres cortes con guardia alta.',
    jabReach: 60, jabDur: 16, jabDmg: 4.1,
    specialNeutralName: 'Estocada del Delaware',
    specialNeutralDesc: 'Estocada frontal que rompe guardias y proyecta ondas de hielo.',
    snKind: 'lunge_guardbreak', snDmg: 10.8, snBk: 6.2, snColor: '#e8c458',
    specialUpName: 'Vuelo sobre el Hielo',
    specialUpDesc: 'Impulso diagonal táctico con doble corte ascendente.',
    upVy: -14.8, upVx: 5.5, upStyle: 'banner',
    specialDownName: 'Orden General',
    specialDownDesc: 'Sello táctico en el suelo que acelera su avance militar.',
    downKind: 'speed_seal', downColor: '#e8c458',
  },
  lincoln: {
    neutralName: 'Hachazo de la Unión',
    neutralDesc: 'Tajo amplio con hacha colosal de largo alcance.',
    jabReach: 64, jabDur: 19, jabDmg: 4.8,
    specialNeutralName: 'Golpe de Emancipación',
    specialNeutralDesc: 'Salto corto e impacto sísmico vertical que divide el suelo.',
    snKind: 'quake', snDmg: 11.4, snBk: 6.8, snColor: '#c94338',
    specialUpName: 'Pilar del Capitolio',
    specialUpDesc: 'Salto vertical pesado con hacha en alto que rompe plataformas.',
    upVy: -14.4, upVx: 3.4, upStyle: 'quake',
    specialDownName: 'Proclama Firme',
    specialDownDesc: 'Barrido de doble onda sísmica que aleja a cualquier rival.',
    downKind: 'phalanx_push', downColor: '#c94338',
  },
  teddy: {
    neutralName: 'Gancho Rough Rider',
    neutralDesc: 'Boxeo contundente de tres golpes con guanteletes pesados.',
    jabReach: 48, jabDur: 15, jabDmg: 4.6,
    specialNeutralName: 'Carga de San Juan',
    specialNeutralDesc: 'Carga frontal con Super Armor que absorbe un golpe y remata.',
    snKind: 'breaker', snDmg: 12.6, snBk: 7.0, snColor: '#d97706',
    specialUpName: 'Salto del Alce',
    specialUpDesc: 'Embestida aérea ascendente cargando hacia arriba.',
    upVy: -14.6, upVx: 4.8, upStyle: 'mount',
    specialDownName: 'Big Stick Guard',
    specialDownDesc: 'Postura defensiva blindada que responde golpes con contragolpe.',
    downKind: 'testudo', downColor: '#d97706',
  },
  fdr: {
    neutralName: 'Martillo Constitucional',
    neutralDesc: 'Golpes firmes de mazo dorado con gran control de área.',
    jabReach: 52, jabDur: 17, jabDmg: 4.3,
    specialNeutralName: 'Escudo del New Deal',
    specialNeutralDesc: 'Erige una columna de mármol protectora que eleva al rival.',
    snKind: 'wall', snDmg: 10.6, snBk: 6.6, snColor: '#3b82f6',
    specialUpName: 'Elevación Cívica',
    specialUpDesc: 'Ascenso protegido rodeado de anillos de luz azul.',
    upVy: -14.5, upVx: 4.0, upStyle: 'quantum',
    specialDownName: 'Cortafuegos Federal',
    specialDownDesc: 'Campo azul estático que absorbe disparos enemigos.',
    downKind: 'shield_barrier', downColor: '#3b82f6',
  },
  eisenhower: {
    neutralName: 'Bastón de Mando',
    neutralDesc: 'Golpes tácticos precisos de tres tiempos.',
    jabReach: 50, jabDur: 15, jabDmg: 4.0,
    specialNeutralName: 'Perímetro Aliado',
    specialNeutralDesc: 'Barrera táctica que inmoviliza brevemente al oponente.',
    snKind: 'bars', snDmg: 9.0, snBk: 6.4, snColor: '#eab308',
    specialUpName: 'Despliegue Aéreo',
    specialUpDesc: 'Salto paracaidista vertical con estandartes dorados.',
    upVy: -15.0, upVx: 4.6, upStyle: 'banner',
    specialDownName: 'Plan de Flanqueo',
    specialDownDesc: 'Marca el terreno aumentando la velocidad táctica.',
    downKind: 'speed_seal', downColor: '#eab308',
  },
  kennedy: {
    neutralName: 'Báculo Orbital',
    neutralDesc: 'Golpes ligeros de largo alcance con brillo azul espacial.',
    jabReach: 55, jabDur: 14, jabDmg: 3.8,
    specialNeutralName: 'Pulso Apolo',
    specialNeutralDesc: 'Orbe azul veloz que rebota por la arena con estela cósmica.',
    snKind: 'pulse', snDmg: 9.4, snBk: 4.8, snVx: 10.2, snColor: '#38bdf8',
    specialUpName: 'Propulsión Saturno V',
    specialUpDesc: 'Levitación espacial de alto impulso con escudo orbital.',
    upVy: -15.4, upVx: 5.0, upStyle: 'quantum',
    specialDownName: 'Órbita Defensiva',
    specialDownDesc: 'Despliega un campo deflector de plasma espacial.',
    downKind: 'shield_barrier', downColor: '#38bdf8',
  },
  sanmartin: {
    neutralName: 'Sable Corvo',
    neutralDesc: 'Tres tajos curvos veloces propios de la caballería andina.',
    jabReach: 62, jabDur: 15, jabDmg: 4.2,
    specialNeutralName: 'Estocada de Maipú',
    specialNeutralDesc: 'Avance veloz que atraviesa la guardia rival con el sable corvo.',
    snKind: 'dash_slash', snDmg: 11.4, snBk: 6.2, snColor: '#60a5fa',
    specialUpName: 'Paso de los Patos',
    specialUpDesc: 'Salto heroico montado sobre silueta astral de corcel andino.',
    upVy: -15.2, upVx: 5.2, upStyle: 'mount',
    specialDownName: 'Formación Granaderos',
    specialDownDesc: 'Contraataque disciplinado que repele asaltos físicos.',
    downKind: 'testudo', downColor: '#60a5fa',
  },
  juarez: {
    neutralName: 'Mazo de la Reforma',
    neutralDesc: 'Golpes sólidos y cadenciosos con impacto medio.',
    jabReach: 50, jabDur: 17, jabDmg: 4.4,
    specialNeutralName: 'Balanza de la Reforma',
    specialNeutralDesc: 'Levanta un muro constitucional de jade frente a sí.',
    snKind: 'wall', snDmg: 11.2, snBk: 6.8, snColor: '#22c55e',
    specialUpName: 'Ascenso Republicano',
    specialUpDesc: 'Impulso vertical recto con estela esmeralda.',
    upVy: -14.7, upVx: 3.8, upStyle: 'banner',
    specialDownName: 'Soberanía Jurídica',
    specialDownDesc: 'Trampa de onda verde que repele a ambos flancos.',
    downKind: 'phalanx_push', downColor: '#22c55e',
  },
  cardenas: {
    neutralName: 'Centella Energética',
    neutralDesc: 'Golpes de báculo cargados de plasma verde.',
    jabReach: 54, jabDur: 15, jabDmg: 4.0,
    specialNeutralName: 'Pulso Soberano',
    specialNeutralDesc: 'Disparo de energía verde que rebota y aturde al rival.',
    snKind: 'pulse', snDmg: 9.6, snBk: 4.9, snVx: 8.8, snColor: '#10b981',
    specialUpName: 'Torre Petrolera',
    specialUpDesc: 'Levitación energética sostenida con campo esmeralda.',
    upVy: -14.9, upVx: 4.4, upStyle: 'quantum',
    specialDownName: 'Red Eléctrica',
    specialDownDesc: 'Barrera estática de alto voltaje contra proyectiles.',
    downKind: 'shield_barrier', downColor: '#10b981',
  },
  ohiggins: {
    neutralName: 'Acero de Chacabuco',
    neutralDesc: 'Combo rápido de cortes diagonales con sable austral.',
    jabReach: 60, jabDur: 14, jabDmg: 4.0,
    specialNeutralName: 'Carga de Rancagua',
    specialNeutralDesc: 'Acometida rápida que cruza al enemigo con tajo doble.',
    snKind: 'dash_slash', snDmg: 10.8, snBk: 6.0, snColor: '#dc2626',
    specialUpName: 'Vuelo del Cóndor',
    specialUpDesc: 'Salto diagonal carmesí muy alto con corte ascendente.',
    upVy: -15.3, upVx: 6.1, upStyle: 'blade',
    specialDownName: 'Furia de la Patria',
    specialDownDesc: 'Aumenta su potencia de impacto temporalmente con riesgo en su guardia baja.',
    downKind: 'fury_surge', downColor: '#dc2626',
  },
  sarmiento: {
    neutralName: 'Pluma de Luz',
    neutralDesc: 'Golpes rítmicos con báculo ilustrado.',
    jabReach: 52, jabDur: 16, jabDmg: 3.9,
    specialNeutralName: 'Faro Educativo',
    specialNeutralDesc: 'Proyectil celeste de trayectoria parabólica con rebote.',
    snKind: 'pulse', snDmg: 9.2, snBk: 4.7, snVx: 9.2, snColor: '#38bdf8',
    specialUpName: 'Impulso Ilustrado',
    specialUpDesc: 'Flotación suave con onda protectora ascendente.',
    upVy: -14.8, upVx: 4.2, upStyle: 'quantum',
    specialDownName: 'Cátedra Activa',
    specialDownDesc: 'Sello luminoso que incrementa su agilidad en la arena.',
    downKind: 'speed_seal', downColor: '#38bdf8',
  },
  alfaro: {
    neutralName: 'Hacha Alfarista',
    neutralDesc: 'Tajos pesados con acero ferroviario.',
    jabReach: 58, jabDur: 18, jabDmg: 4.7,
    specialNeutralName: 'Martillo del Ferrocarril',
    specialNeutralDesc: 'Salto y golpe de yunque que envía ondas por el riel.',
    snKind: 'quake', snDmg: 11.2, snBk: 6.6, snColor: '#f59e0b',
    specialUpName: 'Vapor Trasandino',
    specialUpDesc: 'Impulso ascendente ardiendo con chispas doradas.',
    upVy: -14.7, upVx: 4.5, upStyle: 'quake',
    specialDownName: 'Freno de Emergencia',
    specialDownDesc: 'Onda expansiva doble en tierra que repele rivales cercanos.',
    downKind: 'phalanx_push', downColor: '#f59e0b',
  },
  batlle: {
    neutralName: 'Mazo Cívico',
    neutralDesc: 'Tres impactos equilibrados de autoridad.',
    jabReach: 50, jabDur: 16, jabDmg: 4.2,
    specialNeutralName: 'Escudo Republicano',
    specialNeutralDesc: 'Reja de contención que atrapa momentáneamente al oponente.',
    snKind: 'bars', snDmg: 8.8, snBk: 6.6, snColor: '#60a5fa',
    specialUpName: 'Salto del Colegiado',
    specialUpDesc: 'Salto ascendente protegido con estela azul.',
    upVy: -14.5, upVx: 4.1, upStyle: 'banner',
    specialDownName: 'Veto Defensivo',
    specialDownDesc: 'Escudo azul contra proyectiles y presión a distancia.',
    downKind: 'shield_barrier', downColor: '#60a5fa',
  },
  vargas: {
    neutralName: 'Puño Siderúrgico',
    neutralDesc: 'Golpes pesados de acero industrial.',
    jabReach: 50, jabDur: 18, jabDmg: 4.9,
    specialNeutralName: 'Muralla de Acero',
    specialNeutralDesc: 'Levanta una viga industrial reforzada que lanza hacia arriba.',
    snKind: 'wall', snDmg: 11.6, snBk: 7.0, snColor: '#22c55e',
    specialUpName: 'Grúa de Volta Redonda',
    specialUpDesc: 'Salto robusto blindado hacia plataformas superiores.',
    upVy: -14.3, upVx: 3.6, upStyle: 'quake',
    specialDownName: 'Blindaje Fabril',
    specialDownDesc: 'Postura de acero que contraataca golpes físicos.',
    downKind: 'testudo', downColor: '#22c55e',
  },
  kubitschek: {
    neutralName: 'Compás Modernista',
    neutralDesc: 'Golpes ágiles con cetro geométrico.',
    jabReach: 54, jabDur: 14, jabDmg: 3.8,
    specialNeutralName: 'Arco de Brasilia',
    specialNeutralDesc: 'Orbe dorado rápido que rebota formando trayectorias limpias.',
    snKind: 'pulse', snDmg: 9.0, snBk: 4.8, snVx: 10.0, snColor: '#facc15',
    specialUpName: 'Cúpula del Congreso',
    specialUpDesc: 'Levitación rápida de gran alcance vertical.',
    upVy: -15.6, upVx: 5.2, upStyle: 'quantum',
    specialDownName: 'Aceleración 50 en 5',
    specialDownDesc: 'Sello dorado que dispara su velocidad de desplazamiento.',
    downKind: 'speed_seal', downColor: '#facc15',
  },
  allende: {
    neutralName: 'Bastón de Dignidad',
    neutralDesc: 'Combinación firme de tres impactos frontales.',
    jabReach: 50, jabDur: 16, jabDmg: 4.3,
    specialNeutralName: 'Firmeza Cívica',
    specialNeutralDesc: 'Golpe con Super Armor que resiste presión y contraataca.',
    snKind: 'breaker', snDmg: 11.8, snBk: 6.7, snColor: '#e11d48',
    specialUpName: 'Ascenso de la Alameda',
    specialUpDesc: 'Salto recto con brillo carmesí.',
    upVy: -14.7, upVx: 4.0, upStyle: 'banner',
    specialDownName: 'Escudo Constitucional',
    specialDownDesc: 'Contragolpe defensivo firme frente a ataques cuerpo a cuerpo.',
    downKind: 'testudo', downColor: '#e11d48',
  },
  sucre: {
    neutralName: 'Filo de Ayacucho',
    neutralDesc: 'Esgrima veloz y elegante de corto alcance.',
    jabReach: 62, jabDur: 14, jabDmg: 3.9,
    specialNeutralName: 'Duelo de Ayacucho',
    specialNeutralDesc: 'Estocada de largo alcance que rompe bloqueos enemigos.',
    snKind: 'lunge_guardbreak', snDmg: 10.6, snBk: 6.2, snColor: '#facc15',
    specialUpName: 'Salto de Pichincha',
    specialUpDesc: 'Ascenso diagonal velocísimo con sable dorado.',
    upVy: -15.5, upVx: 6.4, upStyle: 'blade',
    specialDownName: 'Paso del Mariscal',
    specialDownDesc: 'Sello táctico que aumenta agilidad y ritmo de combate.',
    downKind: 'speed_seal', downColor: '#facc15',
  },
  artigas: {
    neutralName: 'Sable Blandengue',
    neutralDesc: 'Cortes amplios de caballería ligera.',
    jabReach: 61, jabDur: 15, jabDmg: 4.2,
    specialNeutralName: 'Sable Oriental',
    specialNeutralDesc: 'Corte ascendente con salto corto que lanza al cielo.',
    snKind: 'uppercut', snDmg: 10.9, snBk: 6.6, snColor: '#ef4444',
    specialUpName: 'Galope Oriental',
    specialUpDesc: 'Salto espectral sobre silueta luminosa de caballo criollo.',
    upVy: -15.0, upVx: 5.5, upStyle: 'mount',
    specialDownName: 'Fervor Federal',
    specialDownDesc: 'Desata onda de choque doble alrededor para limpiar la plataforma.',
    downKind: 'phalanx_push', downColor: '#ef4444',
  },
  mujica: {
    neutralName: 'Hacha Austera',
    neutralDesc: 'Golpes pausados pero contundentes.',
    jabReach: 55, jabDur: 18, jabDmg: 4.5,
    specialNeutralName: 'Arado de la Tierra',
    specialNeutralDesc: 'Golpe al suelo que libera ondas sísmicas bilaterales.',
    snKind: 'quake', snDmg: 10.4, snBk: 6.3, snColor: '#38bdf8',
    specialUpName: 'Brote Ascendente',
    specialUpDesc: 'Salto sereno con estela celeste.',
    upVy: -14.6, upVx: 4.0, upStyle: 'quake',
    specialDownName: 'Calma de Chacra',
    specialDownDesc: 'Postura paciente que contraataca golpes apresurados.',
    downKind: 'testudo', downColor: '#38bdf8',
  },
  degaulle: {
    neutralName: 'Bastón de Francia',
    neutralDesc: 'Golpes largos y sobrios de mando militar.',
    jabReach: 56, jabDur: 17, jabDmg: 4.4,
    specialNeutralName: 'Línea Estratégica',
    specialNeutralDesc: 'Barrera vertical de hierro que frena avances rivales.',
    snKind: 'bars', snDmg: 9.4, snBk: 6.8, snColor: '#3b82f6',
    specialUpName: 'Cruz de Lorena',
    specialUpDesc: 'Salto vertical alto con estandarte tricolor francés.',
    upVy: -14.8, upVx: 3.9, upStyle: 'banner',
    specialDownName: 'Línea Maginot',
    specialDownDesc: 'Escudo estático contra todo tipo de proyectiles.',
    downKind: 'shield_barrier', downColor: '#3b82f6',
  },
  mitterrand: {
    neutralName: 'Mazo del Elíseo',
    neutralDesc: 'Tres golpes calculados con ritmo diplomático.',
    jabReach: 52, jabDur: 16, jabDmg: 4.1,
    specialNeutralName: 'Golpe Diplomático',
    specialNeutralDesc: 'Embestida elegante seguida de remate con mazo.',
    snKind: 'tiger', snDmg: 10.8, snBk: 6.2, snColor: '#ef4444',
    specialUpName: 'Vuelo Republicano',
    specialUpDesc: 'Salto con estela roja y dorada.',
    upVy: -14.8, upVx: 4.6, upStyle: 'banner',
    specialDownName: 'Cláusula Oculta',
    specialDownDesc: 'Trampa eléctrica en el suelo que explota al paso.',
    downKind: 'shock_trap', downColor: '#ef4444',
  },
  chirac: {
    neutralName: 'Golpe Institucional',
    neutralDesc: 'Impactos firmes de gran estabilidad.',
    jabReach: 50, jabDur: 17, jabDmg: 4.4,
    specialNeutralName: 'Escudo del Elíseo',
    specialNeutralDesc: 'Pilar arquitectónico que bloquea proyectiles y lanza arriba.',
    snKind: 'wall', snDmg: 11.0, snBk: 6.7, snColor: '#2563eb',
    specialUpName: 'Salto Tricolor',
    specialUpDesc: 'Impulso vertical sólido hacia cornisas altas.',
    upVy: -14.4, upVx: 4.1, upStyle: 'banner',
    specialDownName: 'Veto Presidencial',
    specialDownDesc: 'Onda expansiva en suelo que aleja agresores.',
    downKind: 'phalanx_push', downColor: '#2563eb',
  },
  masaryk: {
    neutralName: 'Cetro de Bohemia',
    neutralDesc: 'Golpes limpios de rango medio con luz azul.',
    jabReach: 54, jabDur: 15, jabDmg: 3.9,
    specialNeutralName: 'Luz de Praga',
    specialNeutralDesc: 'Orbe luminoso de rebote múltiple.',
    snKind: 'pulse', snDmg: 9.2, snBk: 4.6, snVx: 9.0, snColor: '#38bdf8',
    specialUpName: 'Elevación Filosófica',
    specialUpDesc: 'Flotación táctica con aura azul protectora.',
    upVy: -15.0, upVx: 4.6, upStyle: 'quantum',
    specialDownName: 'Escudo Humanista',
    specialDownDesc: 'Barrera que absorbe proyectiles y recarga el Voto.',
    downKind: 'shield_barrier', downColor: '#38bdf8',
  },
  havel: {
    neutralName: 'Zarpazo de Terciopelo',
    neutralDesc: 'Ráfaga acrobática rápida con garras cortas.',
    jabReach: 48, jabDur: 13, jabDmg: 3.7,
    specialNeutralName: 'Impulso Terciopelo',
    specialNeutralDesc: 'Corte supersónico que atraviesa al oponente.',
    snKind: 'dash_slash', snDmg: 10.6, snBk: 5.9, snColor: '#a855f7',
    specialUpName: 'Salto del Escenario',
    specialUpDesc: 'Salto acrobático violeta muy ágil.',
    upVy: -15.4, upVx: 6.0, upStyle: 'blade',
    specialDownName: 'Ritmo de Praga',
    specialDownDesc: 'Sello púrpura de velocidad acelerada.',
    downKind: 'speed_seal', downColor: '#a855f7',
  },
  walesa: {
    neutralName: 'Puño del Astillero',
    neutralDesc: 'Boxeo pesado de alto knockback.',
    jabReach: 48, jabDur: 16, jabDmg: 4.6,
    specialNeutralName: 'Golpe Solidario',
    specialNeutralDesc: 'Puñetazo blindado con Super Armor de gran impacto.',
    snKind: 'breaker', snDmg: 12.4, snBk: 7.1, snColor: '#ef4444',
    specialUpName: 'Grúa de Gdańsk',
    specialUpDesc: 'Gancho ascendente con impulso de acero.',
    upVy: -14.6, upVx: 4.4, upStyle: 'quake',
    specialDownName: 'Huelga Firme',
    specialDownDesc: 'Postura inamovible que contraataca golpes.',
    downKind: 'testudo', downColor: '#ef4444',
  },
  pertini: {
    neutralName: 'Bastón Partisano',
    neutralDesc: 'Golpes rápidos y tenaces a media distancia.',
    jabReach: 52, jabDur: 14, jabDmg: 4.0,
    specialNeutralName: 'Firmeza Alpina',
    specialNeutralDesc: 'Estocada frontal veloz que quiebra defensas.',
    snKind: 'lunge_guardbreak', snDmg: 10.8, snBk: 6.2, snColor: '#22c55e',
    specialUpName: 'Salto Alpino',
    specialUpDesc: 'Salto diagonal ágil entre cumbres.',
    upVy: -15.1, upVx: 5.8, upStyle: 'blade',
    specialDownName: 'Espíritu Partisano',
    specialDownDesc: 'Trampa de chispa verde bajo sus pies.',
    downKind: 'shock_trap', downColor: '#22c55e',
  },
  kekkonen: {
    neutralName: 'Hacha del Norte',
    neutralDesc: 'Cortes atléticos de gran empuje.',
    jabReach: 57, jabDur: 16, jabDmg: 4.4,
    specialNeutralName: 'Salto Nórdico',
    specialNeutralDesc: 'Impacto descendente con ondas glaciares.',
    snKind: 'quake', snDmg: 10.6, snBk: 6.4, snColor: '#38bdf8',
    specialUpName: 'Esquí Olímpico',
    specialUpDesc: 'Salto parabólico altísimo de gran recorrido horizontal.',
    upVy: -15.4, upVx: 6.6, upStyle: 'quake',
    specialDownName: 'Sisu Finlandés',
    specialDownDesc: 'Desata furia nórdica que potencia sus golpes.',
    downKind: 'fury_surge', downColor: '#38bdf8',
  },
  mandela: {
    neutralName: 'Guantelete Invictus',
    neutralDesc: 'Combo de puños blindados con remate expansivo.',
    jabReach: 48, jabDur: 16, jabDmg: 4.5,
    specialNeutralName: 'Rompecadenas',
    specialNeutralDesc: 'Golpe con Super Armor que rompe defensas y lanza lejos.',
    snKind: 'breaker', snDmg: 12.6, snBk: 7.0, snColor: '#2aa662',
    specialUpName: 'Ascenso Arcoíris',
    specialUpDesc: 'Uppercut ascendente envuelto en luz dorada y verde.',
    upVy: -14.8, upVx: 4.5, upStyle: 'banner',
    specialDownName: 'Voluntad Inquebrantable',
    specialDownDesc: 'Guardia imperturbable que castiga cualquier ataque físico.',
    downKind: 'testudo', downColor: '#2aa662',
  },
  sankara: {
    neutralName: 'Bastón del Sahel',
    neutralDesc: 'Combinación ultrarrápida de tres golpes ágiles.',
    jabReach: 52, jabDur: 13, jabDmg: 3.8,
    specialNeutralName: 'Avance Íntegro',
    specialNeutralDesc: 'Corte relámpago que atraviesa al oponente.',
    snKind: 'dash_slash', snDmg: 10.8, snBk: 6.0, snColor: '#ef4444',
    specialUpName: 'Salto Revolucionario',
    specialUpDesc: 'Salto vertical velocísimo con boina roja al viento.',
    upVy: -15.6, upVx: 6.2, upStyle: 'blade',
    specialDownName: 'Marcha Popular',
    specialDownDesc: 'Sello táctico que aumenta su velocidad extrema.',
    downKind: 'speed_seal', downColor: '#ef4444',
  },
  nkrumah: {
    neutralName: 'Cetro Estrella Negra',
    neutralDesc: 'Golpes solares de energía dorada.',
    jabReach: 54, jabDur: 15, jabDmg: 4.1,
    specialNeutralName: 'Pulso Estrella Negra',
    specialNeutralDesc: 'Orbe solar dorado que rebota iluminando la plataforma.',
    snKind: 'pulse', snDmg: 9.6, snBk: 4.9, snVx: 8.6, snColor: '#facc15',
    specialUpName: 'Alba Ascendente',
    specialUpDesc: 'Levitación dorada protectora de dos segundos.',
    upVy: -15.0, upVx: 4.6, upStyle: 'quantum',
    specialDownName: 'Escudo Panafricano',
    specialDownDesc: 'Barrera dorada que absorbe disparos enemigos.',
    downKind: 'shield_barrier', downColor: '#facc15',
  },
  nyerere: {
    neutralName: 'Mazo Ujamaa',
    neutralDesc: 'Golpes firmes de gran alcance medio.',
    jabReach: 52, jabDur: 16, jabDmg: 4.3,
    specialNeutralName: 'Bastión Ujamaa',
    specialNeutralDesc: 'Erige un pilar verde comunitario de alto impacto.',
    snKind: 'wall', snDmg: 10.8, snBk: 6.6, snColor: '#22c55e',
    specialUpName: 'Cumbre Kilimanjaro',
    specialUpDesc: 'Salto vertical de gran altura sobre la nieve.',
    upVy: -14.8, upVx: 4.0, upStyle: 'banner',
    specialDownName: 'Círculo Comunitario',
    specialDownDesc: 'Onda expansiva bilateral que despeja el centro.',
    downKind: 'phalanx_push', downColor: '#22c55e',
  },
  ataturk: {
    neutralName: 'Sable de Anatolia',
    neutralDesc: 'Cortes precisos de esgrima militar moderna.',
    jabReach: 62, jabDur: 15, jabDmg: 4.2,
    specialNeutralName: 'Estocada de Ankara',
    specialNeutralDesc: 'Estocada larga que rompe escudos enemigos.',
    snKind: 'lunge_guardbreak', snDmg: 11.2, snBk: 6.4, snColor: '#e11d48',
    specialUpName: 'Vuelo del Bósforo',
    specialUpDesc: 'Impulso diagonal alto con sable en guardia.',
    upVy: -15.2, upVx: 5.9, upStyle: 'blade',
    specialDownName: 'Frente Republicano',
    specialDownDesc: 'Postura defensiva que contraataca golpes físicos.',
    downKind: 'testudo', downColor: '#e11d48',
  },
  sunyatsen: {
    neutralName: 'Hoja Republicana',
    neutralDesc: 'Esgrima fluida de tres tajos equilibrados.',
    jabReach: 60, jabDur: 14, jabDmg: 4.0,
    specialNeutralName: 'Guardia Republicana',
    specialNeutralDesc: 'Corte ascendente veloz con estela azul.',
    snKind: 'uppercut', snDmg: 10.5, snBk: 6.5, snColor: '#3b82f6',
    specialUpName: 'Dragón Ascendente',
    specialUpDesc: 'Salto espiral hacia las alturas con destello azul.',
    upVy: -15.3, upVx: 5.7, upStyle: 'blade',
    specialDownName: 'Tres Principios',
    specialDownDesc: 'Sello azul en tierra que acelera su movilidad.',
    downKind: 'speed_seal', downColor: '#3b82f6',
  },
  kalam: {
    neutralName: 'Báculo Aeroespacial',
    neutralDesc: 'Golpes ligeros con estela naranja de ignición.',
    jabReach: 54, jabDur: 14, jabDmg: 3.9,
    specialNeutralName: 'Pulso Aeroespacial',
    specialNeutralDesc: 'Orbe térmico de trayectoria rápida con rebote.',
    snKind: 'pulse', snDmg: 9.4, snBk: 4.8, snVx: 9.8, snColor: '#fb923c',
    specialUpName: 'Despegue Agni',
    specialUpDesc: 'Levitación propulsada por energía naranja.',
    upVy: -15.6, upVx: 5.0, upStyle: 'quantum',
    specialDownName: 'Escudo Térmico',
    specialDownDesc: 'Barrera naranja que neutraliza proyectiles entrantes.',
    downKind: 'shield_barrier', downColor: '#fb923c',
  },
};

export class PresidentUniqueMoveset extends BaseFighterMoveset {
  private bp: UniquePresidentBlueprint;

  constructor(data: PresidentData, bp: UniquePresidentBlueprint) {
    super(data);
    this.bp = bp;
  }

  getMovesetInfo(): SpecialMoveInfo {
    return {
      neutralName: this.bp.neutralName,
      neutralDesc: this.bp.neutralDesc,
      specialNeutralName: this.bp.specialNeutralName,
      specialNeutralDesc: this.bp.specialNeutralDesc,
      specialUpName: this.bp.specialUpName,
      specialUpDesc: this.bp.specialUpDesc,
      specialDownName: this.bp.specialDownName,
      specialDownDesc: this.bp.specialDownDesc,
    };
  }

  override neutralAttack(ctx: MoveContext): MoveAttackSpec {
    const base = super.neutralAttack(ctx);
    if (base.moveKind === 'jab') {
      const P = ctx.power;
      const fin = ctx.jabStep % 3 === 2;
      return {
        ...base,
        moveLabel: this.bp.neutralName,
        dur: fin ? this.bp.jabDur + 5 : this.bp.jabDur,
        ph: [
          {
            a: [3, 10],
            hb: { fx: 10, y: -76, w: this.bp.jabReach, h: 36 },
            dmg: (fin ? this.bp.jabDmg * 1.42 : this.bp.jabDmg) * P,
            bk: fin ? 4.9 : 2.3,
            ks: fin ? 0.14 : 0.07,
            ang: fin ? -30 : -18,
            fx: ctx.weaponType === 'saber' || ctx.weaponType === 'spear' ? 'sword' : undefined,
          },
        ],
      };
    }
    return base;
  }

  specialNeutral(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const bp = this.bp;
    switch (bp.snKind) {
      case 'lunge_guardbreak':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 34,
          heavy: true,
          ph: [
            {
              a: [5, 17],
              hb: { fx: 10, y: -76, w: Math.max(66, bp.jabReach + 8), h: 40 },
              dmg: bp.snDmg * P,
              bk: bp.snBk,
              ks: 0.21,
              ang: -22,
              mv: 11.5,
              guardBreak: true,
              fx: 'sword',
            },
          ],
          sp: [],
          onStart: { sound: 'sword', burstCol: bp.snColor, burstCount: 10 },
        };
      case 'dash_slash':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 32,
          heavy: true,
          ph: [
            {
              a: [4, 14],
              hb: { fx: -6, y: -82, w: 70, h: 50 },
              dmg: bp.snDmg * 0.48 * P,
              bk: 2.8,
              ks: 0.07,
              ang: -18,
              mv: 14.2,
              passThrough: true,
              fx: 'sword',
            },
            {
              a: [16, 23],
              hb: { fx: -18, y: -84, w: 74, h: 52 },
              dmg: bp.snDmg * 0.62 * P,
              bk: bp.snBk,
              ks: 0.2,
              ang: -34,
              mv: 3.0,
              fx: 'gold',
            },
          ],
          sp: [],
          onStart: { sound: 'sword', inv: 8, burstCol: bp.snColor, burstCount: 12 },
        };
      case 'long_pierce':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 36,
          heavy: true,
          ph: [
            {
              a: [7, 20],
              hb: { fx: 12, y: -76, w: 88, h: 36 },
              dmg: bp.snDmg * P,
              bk: bp.snBk,
              ks: 0.21,
              ang: -24,
              mv: 8.0,
              fx: 'sword',
            },
          ],
          sp: [],
          onStart: { sound: 'sword', burstCol: bp.snColor, burstCount: 10 },
        };
      case 'wall':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 42,
          heavy: true,
          ph: [],
          sp: [
            {
              t: 10,
              p: { fx: 34, y: -116, w: 34, h: 116, vx: 0, life: 28, kind: 'wall', dmg: bp.snDmg * P, bk: bp.snBk, ks: 0.22, ang: -84 },
            },
          ],
          onStart: { burstCol: bp.snColor, burstCount: 10 },
        };
      case 'bars':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 44,
          heavy: true,
          ph: [],
          sp: [
            {
              t: 9,
              p: { fx: 46, y: -110, w: 38, h: 110, vx: 0, life: 15, kind: 'bars', dmg: bp.snDmg * P, bk: bp.snBk, ks: 0.22, ang: -50, hold: 34 },
            },
          ],
          onStart: { burstCol: bp.snColor, burstCount: 10 },
        };
      case 'pulse':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 36,
          heavy: true,
          ph: [],
          sp: [
            {
              t: 10,
              p: {
                fx: 22,
                y: -66,
                w: 34,
                h: 28,
                vx: bp.snVx ?? 9.0,
                vy: 1.9,
                bounces: 2,
                life: 74,
                kind: 'pulse',
                dmg: bp.snDmg * P,
                bk: bp.snBk,
                ks: 0.14,
                ang: -25,
                hold: 16,
              },
            },
          ],
          onStart: { burstCol: bp.snColor, burstCount: 8 },
        };
      case 'quake':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 48,
          heavy: true,
          hop: { t: 4, vy: -7 },
          ph: [{ a: [15, 22], hb: { fx: 6, y: -84, w: 54, h: 84 }, dmg: bp.snDmg * 0.78 * P, bk: 5.2, ks: 0.2, ang: -60, fx: 'mallet' }],
          sp: [
            { t: 16, p: { fx: 20, y: -24, w: 26, h: 24, vx: 6.5, life: 34, kind: 'shock', dmg: bp.snDmg * 0.65 * P, bk: bp.snBk * 0.65, ks: 0.16, ang: -50 } },
            { t: 16, p: { fx: 20, y: -24, w: 26, h: 24, vx: -6.5, life: 34, kind: 'shock', dmg: bp.snDmg * 0.65 * P, bk: bp.snBk * 0.65, ks: 0.16, ang: -50, back: true } },
          ],
        };
      case 'breaker':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 46,
          heavy: true,
          ph: [
            { a: [0, 22], armor: true, fx: 'charge' },
            { a: [23, 32], hb: { fx: 8, y: -76, w: 60, h: 46 }, dmg: bp.snDmg * P, bk: bp.snBk, ks: 0.25, ang: -10, guardBreak: true, fx: 'gold' },
          ],
          sp: [],
        };
      case 'uppercut':
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 38,
          heavy: true,
          hop: { t: 7, vy: -8.8 },
          ph: [{ a: [7, 17], hb: { fx: 0, y: -112, w: 58, h: 86 }, dmg: bp.snDmg * P, bk: bp.snBk, ks: 0.25, ang: -76, fx: 'sword' }],
          sp: [],
          onStart: { sound: 'sword', burstCol: bp.snColor, burstCount: 10 },
        };
      case 'tiger':
      default:
        return {
          k: 'h',
          moveKind: 'sig',
          moveLabel: bp.specialNeutralName,
          dur: 46,
          heavy: true,
          ph: [
            { a: [5, 18], hb: { fx: 0, y: -76, w: 54, h: 56 }, dmg: bp.snDmg * 0.45 * P, bk: 3.0, ks: 0.06, ang: -15, mv: 8.5, fx: 'gold' },
            { a: [24, 32], hb: { fx: 6, y: -102, w: 60, h: 74 }, dmg: bp.snDmg * 0.85 * P, bk: bp.snBk, ks: 0.22, ang: -35, mv: 0, fx: 'mallet' },
          ],
          sp: [],
          onStart: { burstCol: bp.snColor, burstCount: 10 },
        };
    }
  }

  specialUp(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const bp = this.bp;
    const hDir = ctx.dir !== 0 ? ctx.dir : ctx.face;

    if (bp.upStyle === 'quantum') {
      return {
        k: 'h',
        moveKind: 'upSpec',
        moveLabel: bp.specialUpName,
        dur: 30,
        heavy: true,
        ph: [{ a: [2, 18], hb: { fx: -34, y: -106, w: 68, h: 96 }, dmg: 7.8 * P, bk: 5.5, ks: 0.16, ang: -75, armor: true, fx: 'pulse' }],
        sp: [],
        onStart: {
          vx: ctx.dir * bp.upVx,
          vy: bp.upVy * 0.72,
          quantumFloatT: 90,
          sound: 'shield',
          burstCol: bp.snColor,
          burstCount: 14,
        },
      };
    }

    return {
      k: 'h',
      moveKind: 'upSpec',
      moveLabel: bp.specialUpName,
      dur: 34,
      heavy: true,
      ph: [{ a: [3, 20], hb: { fx: -8, y: -120, w: 64, h: 96 }, dmg: 9.8 * P, bk: 6.4, ks: 0.22, ang: -78, fx: bp.upStyle === 'blade' ? 'sword' : 'gold' }],
      sp: [],
      onStart: {
        vx: hDir * bp.upVx,
        vy: bp.upVy,
        mountT: bp.upStyle === 'mount' ? 36 : undefined,
        sound: bp.upStyle === 'blade' ? 'sword' : 'heavy',
        burstCol: bp.snColor,
        burstCount: 14,
      },
    };
  }

  specialDown(ctx: MoveContext): MoveAttackSpec {
    const P = ctx.power;
    const bp = this.bp;

    switch (bp.downKind) {
      case 'speed_seal':
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 26,
          heavy: true,
          ph: [{ a: [5, 14], hb: { fx: -24, y: -32, w: 64, h: 32 }, dmg: 5.0 * P, bk: 4.5, ks: 0.1, ang: -55, fx: 'gold' }],
          sp: [],
          onStart: {
            sound: 'seal',
            burstCol: bp.downColor,
            burstCount: 14,
            floorZone: { kind: 'speed_seal', r: 74, dur: 240, col: bp.downColor },
            speedBuffT: 240,
            bannerText: bp.specialDownName.toUpperCase(),
          },
        };
      case 'shield_barrier':
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 24,
          heavy: true,
          ph: [],
          sp: [],
          onStart: {
            sound: 'shield',
            burstCol: bp.downColor,
            burstCount: 14,
            barrier: { w: 20, h: 96, dur: 220, col: bp.downColor },
            bannerText: bp.specialDownName.toUpperCase(),
          },
        };
      case 'testudo':
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 34,
          heavy: true,
          ph: [{ a: [0, 34], armor: true, fx: 'gold' }],
          sp: [],
          onStart: {
            testudoT: 52,
            sound: 'shield',
            burstCol: bp.downColor,
            burstCount: 14,
            bannerText: bp.specialDownName.toUpperCase(),
          },
        };
      case 'fury_surge':
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 24,
          heavy: true,
          ph: [],
          sp: [],
          onStart: {
            furyT: 240,
            sound: 'fury',
            burstCol: bp.downColor,
            burstCount: 18,
            bannerText: bp.specialDownName.toUpperCase(),
          },
        };
      case 'shock_trap':
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 26,
          heavy: true,
          ph: [],
          sp: [],
          onStart: {
            sound: 'seal',
            burstCol: bp.downColor,
            burstCount: 14,
            floorZone: { kind: 'hazard_seal', r: 66, dur: 240, col: bp.downColor },
            bannerText: bp.specialDownName.toUpperCase(),
          },
        };
      case 'phalanx_push':
      default:
        return {
          k: 'h',
          moveKind: 'downSpec',
          moveLabel: bp.specialDownName,
          dur: 30,
          heavy: true,
          ph: [{ a: [6, 14], hb: { fx: -48, y: -38, w: 96, h: 36 }, dmg: 7.4 * P, bk: 5.9, ks: 0.15, ang: -42, fx: 'gold' }],
          sp: [
            { t: 8, p: { fx: 16, y: -26, w: 26, h: 26, vx: 7.5, life: 22, kind: 'phalanx_wave', dmg: 6.2 * P, bk: 5.4, ks: 0.14, ang: -38 } },
            { t: 8, p: { fx: 16, y: -26, w: 26, h: 26, vx: -7.5, life: 22, kind: 'phalanx_wave', dmg: 6.2 * P, bk: 5.4, ks: 0.14, ang: -38, back: true } },
          ],
          onStart: { sound: 'heavy', burstCol: bp.downColor, burstCount: 14 },
        };
    }
  }
}

export function createFighterMoveset(data: PresidentData): BaseFighterMoveset {
  const sourceId = data.isCustom ? data.powerSourceId || data.id : data.id;
  switch (sourceId) {
    case 'bolivar':
      return new BolivarMoveset(data);
    case 'robinson':
      return new DoctoraPulsoMoveset(data);
    case 'julio_cesar':
      return new JulioCesarMoveset(data);
    case 'alejandro_magno':
      return new AlejandroMagnoMoveset(data);
    case 'aquiles':
      return new AquilesMoveset(data);
    case 'bukele':
      return new BukeleMoveset(data);
    case 'petro':
      return new PetroMoveset(data);
    case 'trump':
      return new TrumpMoveset(data);
    default: {
      const bp = PRESIDENT_BLUEPRINTS[sourceId];
      if (bp) return new PresidentUniqueMoveset(data, bp);
      // Fallback derived deterministically from weapon & signatureType for custom/unknown fighters
      const sig = data.signatureType || 'fencing';
      const fallbackBp: UniquePresidentBlueprint = {
        neutralName: 'Ataque Soberano',
        neutralDesc: 'Ráfaga de tres golpes equilibrados.',
        jabReach: data.anatomy.weaponType === 'spear' ? 76 : data.anatomy.weaponType === 'saber' ? 60 : 50,
        jabDur: 15,
        jabDmg: 4.1,
        specialNeutralName: data.sigName || 'Signature Presidencial',
        specialNeutralDesc: data.ult?.sigDesc || 'Ataque característico.',
        snKind:
          sig === 'pulse'
            ? 'pulse'
            : sig === 'wall'
              ? 'wall'
              : sig === 'bars'
                ? 'bars'
                : sig === 'quake'
                  ? 'quake'
                  : sig === 'breaker'
                    ? 'breaker'
                    : sig === 'uppercut'
                      ? 'uppercut'
                      : sig === 'tiger'
                        ? 'tiger'
                        : 'lunge_guardbreak',
        snDmg: 10.6,
        snBk: 6.2,
        snColor: data.palette.accent.base,
        specialUpName: 'Impulso Ascendente',
        specialUpDesc: 'Recuperación aérea con impulso vertical.',
        upVy: -14.8,
        upVx: 4.8,
        upStyle: data.anatomy.weaponType === 'staff' ? 'quantum' : 'blade',
        specialDownName: 'Maniobra Táctica',
        specialDownDesc: 'Barrido expansivo en el suelo.',
        downKind: data.anatomy.weaponType === 'staff' ? 'shield_barrier' : 'phalanx_push',
        downColor: data.palette.accent.base,
      };
      return new PresidentUniqueMoveset(data, fallbackBp);
    }
  }
}

export function getMovesetInfoForPresident(data: PresidentData): SpecialMoveInfo {
  return createFighterMoveset(data).getMovesetInfo();
}
