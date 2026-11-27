import { expect, test } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/defaultConfig';
import { readGamepadActions } from '../src/input/gamepadActions';
import type { PlayerAction } from '../src/types/game';

test('standard M and S bindings do not trigger jump or dash', () => {
  const pad = {
    axes: [0.5, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: index === 3 || index === 5 })),
  } as Gamepad;
  const actions = new Set<PlayerAction>();
  readGamepadActions(pad, DEFAULT_CONFIG.controls, action => actions.add(action));
  expect(actions).toEqual(new Set(['medium', 'special', 'right']));
});
