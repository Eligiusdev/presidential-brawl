import type { GameConfig, PlayerAction } from '../types/game';

export function readGamepadActions(pad: Gamepad, controls: GameConfig['controls'], add: (action: PlayerAction) => void) {
  const { gamepadBindings, gamepadDeadzone } = controls;
  for (const action of Object.keys(gamepadBindings) as PlayerAction[]) {
    if (gamepadBindings[action].some(index => pad.buttons[index]?.pressed)) add(action);
  }
  if (pad.axes[0] < -gamepadDeadzone) add('left');
  if (pad.axes[0] > gamepadDeadzone) add('right');
  if (pad.axes[1] < -.7) add('jump');
  if (pad.axes[1] > gamepadDeadzone) add('down');
}
