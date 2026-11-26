import { describe, expect, it } from 'vitest';
import type { PlayerAction } from '../src/types/game';
import { touchDirectionButtons, touchStickActions } from '../src/components/TouchControls';

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

describe('touch direction buttons', () => {
  it('uses the latest horizontal direction and restores the held one when released', () => {
    expect(touchDirectionButtons(['left', 'right']).horizontal).toBe('right');
    expect(touchDirectionButtons(['left']).horizontal).toBe('left');
    expect(touchDirectionButtons([]).horizontal).toBeUndefined();
  });

  it('allows a direction and a jump during an attack', () => {
    expect(touchDirectionButtons(['right', 'jump', 'light'])).toEqual({
      horizontal: 'right', jump: true, down: false,
    });
  });
});
