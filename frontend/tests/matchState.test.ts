import { describe, it, expect } from 'vitest';
import { create, toBinary } from '@bufbuild/protobuf';
import { SnapshotSchema } from '../src/contract/generated/protocol_pb';
import { decodeSnapshotFrame } from '../src/network/protoAdapter';
import { renderMatchState } from '../src/network/matchState';
import { arenaGeometry, STAGES_DATA } from '../src/data/stages';
import type { MatchSnapshot } from '../src/network/matchState';

type WirePlayer = {
  slot: number; fighterId: string; facing: number; x: number; y: number; w: number; h: number;
  vx: number; vy: number; stocks: number; damage: number; ultCharge: number; dead: number;
  hitFlash?: boolean;
  atkJson?: Uint8Array;
};

function player(slot: number, fighterId: string, over: Partial<WirePlayer> = {}): WirePlayer {
  return { slot, fighterId, facing: 1, x: 600 + slot * 200, y: 500, w: 38, h: 92,
    vx: 0, vy: 0, stocks: 3, damage: 0, ultCharge: 0, dead: 0, ...over };
}

function binarySnapshot(stage = 0, onlineCapacity = 0, tick = 1, players = [player(0, 'washington'), player(1, 'lincoln')],
  extra: Record<string, unknown> = {}, worldExtra: Record<string, unknown> = {}): ArrayBuffer {
  const buf = toBinary(SnapshotSchema, create(SnapshotSchema, {
    tick, stage, ack: [0, 0], players: players.map(p => ({ id: p.slot, ...p })),
    world: { T: tick, onlineCapacity, shake: 0, crowdMood: 'calm', cameraX: 720, cameraY: 405, cameraZoom: 1, ...worldExtra },
    ...extra,
  }));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function decoded(capacity = 0, tick = 1, players?: WirePlayer[], extra?: Record<string, unknown>, worldExtra?: Record<string, unknown>): MatchSnapshot {
  const snap = decodeSnapshotFrame(binarySnapshot(0, capacity, tick, players, extra, worldExtra));
  expect(snap).not.toBeNull();
  return snap!;
}

describe('renderMatchState con snapshots binarios', () => {
  it('deriva main/plats del escenario para que el renderer no lea .x de undefined', () => {
    const snap = decoded();
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.main).toBeDefined();
    expect(world.main.x).toBe(STAGES_DATA[0].main.x);
    expect(world.plats.length).toBe(STAGES_DATA[0].plats.length);
    expect(world.fighters).toHaveLength(2);
  });

  it('usa la geometría escalada de la sala online', () => {
    const snap = decoded(4);
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    const geometry = arenaGeometry(STAGES_DATA[0], 4);
    expect(world.main.w).toBeCloseTo(geometry.main.w);
    expect(world.plats.length).toBe(geometry.plats.length);
  });

  it('rellena los campos ausentes del world con valores seguros para el renderer', () => {
    const snap = decoded();
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.W).toBe(1440);
    expect(world.H).toBe(810);
    expect(world.items).toEqual([]);
    expect(world.floatTexts).toEqual([]);
    expect(world.strikes).toEqual([]);
    expect(world.hitboxes).toEqual([]);
    expect(world.bannerMsg).toEqual({ t: '', l: 0, m: 1 });
    expect(world.telegraph).toBeNull();
    expect(world.winnerPi).toBeNull();
    expect(world.crowd.mood).toBe('calm');
  });

  it('usa la cámara dinámica del modo local en lugar de un zoom fijo', () => {
    const snap = decoded();
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.camera).toBeUndefined();
  });

  it('usa la semilla y el color de multitud del escenario local', () => {
    const snap = decoded();
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.crowd.seed).toBe(1337);
    expect(world.crowd.accentColor).toBe(STAGES_DATA[0].palette.platformTrim);
  });

  it('reconstruye el koVisual y detecta al ganador', () => {
    const players = [player(0, 'washington', { dead: 12, stocks: 2 }), player(1, 'lincoln', { stocks: 1 })];
    const snap = decoded(0, 10, players);
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.fighters[0].koVisual).toMatchObject({ tick: 10, x: 619 });
    expect(world.winnerPi).toBe(1);
  });

  it('transporta la semilla para el modo noche y la multitud', () => {
    const snap = decoded(0, 1, undefined, undefined, { seed: 1337 });
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.crowd.seed).toBe(1337);
    expect(world.stageNightStart).toBeDefined();
  });

  it('transporta la animación de ataque como payload opaco', () => {
    const atk = { t: 3, armor: false, spec: {
      k: 'h', individual: false, downSpecial: false, effect: 'launch', moveKind: 'sig',
      dur: 12, heavy: true, frames: { startup: 2, active: 4 },
      animationTiming: { from: [0, 2, 5, 12], to: [0, 5, 11, 18] },
      ph: [{ a: [2, 5], hb: { fx: 10, y: -40, w: 30, h: 10 }, fx: 'impact', armor: false }],
    } };
    const withAtk = { ...player(0, 'washington'), atkJson: new TextEncoder().encode(JSON.stringify(atk)) };
    const snap = decoded(0, 1, [withAtk, player(1, 'lincoln')]);
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.fighters[0].atk?.spec.ph[0]?.hb?.w).toBe(30);
    expect(world.fighters[0].atk?.t).toBe(3);
  });

  it('transporta los proyectiles del snapshot binario', () => {
    const snap = decoded(0, 1, undefined, { projectiles: [
      { id: 1, x: 700, y: 400, w: 12, h: 8, vx: 5, vy: 0, kind: 'arco', dir: 1, life: 40 },
    ] });
    expect(snap.projectiles).toHaveLength(1);
    expect(snap.projectiles[0].kind).toBe('arco');
    const world = renderMatchState(snap, snap, 1, 0, new Set(), 0);
    expect(world.projectiles[0].x).toBe(700);
  });
});

it('exposes damage and ultimate charge from the rich Go snapshot', () => {
  const rich = {
    type: 'snapshot', tick: 1, world: {},
    players: [{ slot: 0, fighterId: 'washington', pct: 43.5, vote: 100 }],
  };
  const snapshotJson = new TextEncoder().encode(JSON.stringify(rich));
  const snapshot = decodeSnapshotFrame(binarySnapshot(0, 0, 1, undefined, { snapshotJson }));

  expect(snapshot?.players[0]).toMatchObject({ slot: 0, damage: 43.5, ultCharge: 100, pct: 43.5, vote: 100 });
});
