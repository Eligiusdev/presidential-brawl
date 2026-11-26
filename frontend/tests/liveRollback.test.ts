import { describe, expect, it, vi } from 'vitest';
import { LiveRollback, type OnlineWasm, type SyncReply } from '../src/network/liveRollback';

function setup(confirmResult = 2) {
  const wasm: OnlineWasm = {
    create: vi.fn(() => 15),
    advance: vi.fn(() => 1),
    confirm: vi.fn(() => confirmResult),
    snapshot: vi.fn(() => null),
    free: vi.fn(),
  };
  let requestID = 0;
  const timeline = new LiveRollback(wasm, 0, () => ++requestID);
  const send = vi.fn(() => true);
  const reply = (frame: number, data: Partial<SyncReply>) => timeline.receive({
    type: 'rollbackSync', syncRequest: requestID, matchId: 7, frame, roomSlots: [0, 1], ...data,
  });
  timeline.request(0, send);
  reply(0, { checkpoint: {} });
  timeline.update(0, new Set(), 0);
  return { timeline, wasm, send, reply };
}

const confirmations = (count: number) => Array.from({ length: count }, (_, index) => ({
  frame: index + 1,
  slots: [{ seq: 1, held: [] }, { seq: 2, held: ['left'] }],
}));

describe('live rollback catch-up', () => {
  it('drains a valid longer batch in chunks without fetching a checkpoint', () => {
    const { timeline, wasm, send, reply } = setup();
    timeline.request(50, send);
    reply(12, { inputs: confirmations(12) });
    for (let i = 1; i <= 5; i++) timeline.update(50 + i * 17, new Set(), 12);
    expect(vi.mocked(wasm.confirm).mock.calls.map(([, frame, inputs]) => [frame, inputs.length]))
      .toEqual([[1, 1], [2, 3], [5, 3], [8, 3], [11, 2]]);
    expect(timeline.checkpoints).toBe(1);
    expect(wasm.free).not.toHaveBeenCalled();
  });

  it('requests a checkpoint if the rewind itself is outside the retained history', () => {
    const { timeline, wasm, send, reply } = setup(3);
    timeline.request(50, send);
    reply(2, { inputs: confirmations(2) });
    timeline.update(60, new Set(), 2);
    expect(wasm.free).toHaveBeenCalledWith(15);
    timeline.request(251, send);
    expect(send).toHaveBeenLastCalledWith({ type: 'rollbackSync', syncRequest: 3, matchId: 7 });
  });
});
