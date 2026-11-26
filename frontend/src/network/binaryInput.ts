import type { PlayerAction } from '../types/game';

// Wire order is shared with backend/internal/ws/binary_input.go.
const actions: readonly PlayerAction[] = ['left', 'right', 'jump', 'down', 'light', 'heavy', 'dash', 'ult', 'reload'];

export function encodeBinaryInput(sequence: number, held: ReadonlySet<PlayerAction>): ArrayBuffer | null {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0x7fffffff) return null;
  let mask = 0;
  for (const [index, action] of actions.entries()) {
    if (held.has(action)) mask |= 1 << index;
  }
  const frame = new ArrayBuffer(6);
  const view = new DataView(frame);
  view.setUint32(0, sequence, true);
  view.setUint16(4, mask, true);
  return frame;
}
