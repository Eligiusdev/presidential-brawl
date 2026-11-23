import { fromBinary } from '@bufbuild/protobuf';
import { SnapshotSchema, type Snapshot } from '../contract/generated/protocol_pb';
import type { MatchSnapshot } from './matchState';

export function decodeSnapshotFrame(buf: ArrayBuffer): MatchSnapshot | null {
  try {
    const s = fromBinary(SnapshotSchema, new Uint8Array(buf));
    if (!s || typeof s.tick !== 'number') return null;
    return protoToMatchSnapshot(s);
  } catch {
    return null;
  }
}

function protoToMatchSnapshot(s: Snapshot): MatchSnapshot {
  const w = s.world;
  return {
    type: 'snapshot',
    tick: s.tick,
    ack: s.ack ?? [],
    stage: s.stage,
    players: (s.players ?? []).map(p => ({
      id: p.id, slot: p.slot, fighterId: p.fighterId, facing: p.facing, state: p.state,
      frame: p.frame, damage: p.damage, stocks: p.stocks, ultCharge: p.ultCharge, hitstop: p.hitstop,
      x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy,
      on: p.on, wall: p.wall, dead: p.dead, inv: p.inv, stun: p.stun, maxStun: p.maxStun,
      jumpTick: p.jumpTick, koVisual: p.koVisual, dashT: p.dashT, dashCD: p.dashCD,
      combo: p.combo, jabStep: p.jabStep, floating: p.floating, fastFall: p.fastFall,
      winning: p.winning, winT: p.winT, moveKind: p.moveKind, pickupT: p.pickupT,
      wpn: p.wpn as any, wk: p.wk, ammo: p.ammo, maxAmmo: p.maxAmmo, reloadT: p.reloadT, reloadDur: p.reloadDur,
      shootRecoil: p.shootRecoil, landT: p.landT, crouch: p.crouch, boss: p.boss, hitFlash: p.hitFlash,
      squashX: p.squashX, squashY: p.squashY, atk: p.atk ? {
        t: p.atk.t, armor: p.atk.armor, spec: {
          k: p.atk.spec?.k ?? '', individual: p.atk.spec?.individual ?? false,
          downSpecial: p.atk.spec?.downSpecial ?? false, effect: p.atk.spec?.effect ?? '',
          moveKind: p.atk.spec?.moveKind ?? '', dur: p.atk.spec?.dur ?? 0,
          animationTiming: p.atk.spec?.animationTiming ?? {}, heavy: p.atk.spec?.heavy ?? false,
          frames: (p.atk.spec?.frames ?? []).map(f => ({ a: f.a, hb: f.hb, fx: f.fx, armor: f.armor })),
        } as any,
      } : null,
      field: p.fieldJson?.length ? JSON.parse(new TextDecoder().decode(p.fieldJson)) : null,
      rage: p.rage,
    })) as any,
    zones: (s.zones ?? []).map(z => {
      const data = z.dataJson?.length ? JSON.parse(new TextDecoder().decode(z.dataJson)) : {};
      return { ...data, f: z.f, o: z.o, id: z.id, t: z.t, d: z.d };
    }) as any,
    projectiles: (s.projectiles ?? []).map(p => ({
      id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, kind: p.kind,
      w2: p.w2, dir: p.dir, life: p.life, ownerColor: p.ownerColor, ownerHighlight: p.ownerHighlight,
    })) as any,
    cine: s.cine ? (() => { const d = s.cine!.dataJson?.length ? JSON.parse(new TextDecoder().decode(s.cine!.dataJson)) : {}; return { ...d, f: s.cine!.f, phase: s.cine!.phase, t: s.cine!.t }; })() as any : null,
    world: {
      T: w?.T ?? s.tick, shake: w?.shake ?? 0, freeze: w?.freeze ?? 0,
      banner: { t: w?.bannerT ?? '', l: w?.bannerL ?? 0, m: w?.bannerM ?? 1 },
      particles: (w?.particles ?? []).map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: p.life, maxLife: p.maxLife, color: p.color, size: p.size })) as any,
      crowdParticles: (w?.crowdParticles ?? []).map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: p.life, maxLife: p.maxLife, color: p.color, size: p.size })) as any,
      crowd: { excitement: w?.crowdExcitement ?? 0, cheerTimer: w?.crowdCheerTimer ?? 0, mood: (w?.crowdMood ?? 'calm') as any, accentColor: w?.crowdAccentColor ?? '#f5d76e', accentHighlight: w?.crowdAccentHighlight ?? '#fff3a0', seed: 0 },
      hitstop: w?.hitstop ?? 0, online: w?.onlineCapacity ?? undefined,
      camera: { x: w?.cameraX ?? 720, y: w?.cameraY ?? 405, zoom: w?.cameraZoom ?? 1 },
      hitboxes: [],
    } as any,
  };
}
