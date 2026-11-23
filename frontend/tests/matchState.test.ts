import { describe, it, expect } from 'vitest';
import { create, toBinary } from '@bufbuild/protobuf';
import { SnapshotSchema } from '../src/contract/generated/protocol_pb';
import { decodeSnapshotFrame } from '../src/network/protoAdapter';
import { renderMatchState } from '../src/network/matchState';
import { arenaGeometry, STAGES_DATA } from '../src/data/stages';
import type { MatchSnapshot } from '../src/network/matchState';

function binarySnapshot(stage = 0, onlineCapacity = 0, tick = 1): ArrayBuffer {
  const buf = toBinary(SnapshotSchema, create(SnapshotSchema, {
    tick,
    stage,
    ack: [0, 0],
    players: [
      { id: 0, slot: 0, fighterId: 'washington', facing: 1, x: 600, y: 500, w: 60, h: 90,
        vx: 0, vy: 0, stocks: 3, damage: 0, ultCharge: 0, dead: 0 },
      { id: 1, slot: 1, fighterId: 'lincoln', facing: -1, x: 800, y: 500, w: 60, h: 90,
        vx: 0, vy: 0, stocks: 3, damage: 0, ultCharge: 0, dead: 0 },
    ],
    world: { T: tick, onlineCapacity, shake: 0, crowdMood: 'calm', cameraX: 720, cameraY: 405, cameraZoom: 1 },
  }));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function decoded(capacity = 0): MatchSnapshot {
  const snap = decodeSnapshotFrame(binarySnapshot(0, capacity));
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
});
