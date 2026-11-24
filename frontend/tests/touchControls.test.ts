import { describe, expect, it } from 'vitest';
import type { PlayerAction } from '../src/types/game';
import { touchStickActions } from '../src/components/TouchControls';

describe('touch joystick actions', () => {
  it('jumps when pushed upward and keeps jump on diagonals', () => {
    expect(touchStickActions(0, -60, new Set()).jump).toBe(true);
    expect(touchStickActions(60, -60, new Set())).toMatchObject({ right: true, jump: true });
  });

  it('uses hysteresis to avoid flickering at the jump threshold', () => {
    const active = new Set<PlayerAction>(['jump']);
    expect(touchStickActions(0, -15, active).jump).toBe(true);
    expect(touchStickActions(0, -15, new Set()).jump).toBe(false);
  });
});
