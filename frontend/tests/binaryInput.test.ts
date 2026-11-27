import { describe, expect, it } from 'vitest';
import { encodeBinaryInput, inputIsDue, inputMask } from '../src/network/binaryInput';

describe('online input cadence', () => {
  const released = inputMask(new Set());
  const jumping = inputMask(new Set(['jump', 'light']));

  it('sends press and release immediately, including the first input', () => {
    expect(inputIsDue(null, released, 0)).toBe(true);
    expect(inputIsDue({ mask: released, at: 1 }, jumping, 2)).toBe(true);
    expect(inputIsDue({ mask: jumping, at: 2 }, released, 3)).toBe(true);
  });

  it('suppresses identical inputs until the heartbeat is due', () => {
    const last = { mask: jumping, at: 100 };
    expect(inputIsDue(last, jumping, 299)).toBe(false);
    expect(inputIsDue(last, jumping, 300)).toBe(true);
  });

  it('preserves the six-byte input format', () => {
    const frame = encodeBinaryInput(42, new Set(['right', 'light', 'reload']));
    expect(frame && [...new Uint8Array(frame)]).toEqual([42, 0, 0, 0, 18, 1]);
  });
});
