import type { PlayerAction } from '../types/game';

// Wire order is shared with backend/internal/ws/binary_input.go.
const actions: readonly PlayerAction[] = ['left', 'right', 'jump', 'down', 'light', 'heavy', 'dash', 'ult', 'reload'];

export function inputMask(held: ReadonlySet<PlayerAction>): number {
  let mask = 0;
  for (const [index, action] of actions.entries()) {
    if (held.has(action)) mask |= 1 << index;
  }
  return mask;
}

export type SentInput = { mask: number; at: number };

// The server expires stale controls after 500 ms. Leave room for timer jitter.
export function inputIsDue(last: SentInput | null, mask: number, now: number): boolean {
  return last === null || last.mask !== mask || now - last.at >= 200;
}

export function encodeBinaryInput(sequence: number, held: ReadonlySet<PlayerAction>): ArrayBuffer | null {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0x7fffffff) return null;
  const frame = new ArrayBuffer(6);
  const view = new DataView(frame);
  view.setUint32(0, sequence, true);
  view.setUint16(4, inputMask(held), true);
  return frame;
}
