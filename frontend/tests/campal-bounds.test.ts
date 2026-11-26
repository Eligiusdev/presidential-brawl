import { expect, it } from 'vitest';
import { campalBounds } from '../src/engine/campalBounds';

it.each([4, 6, 8])('encuadra ambos extremos con %i luchadores', count => {
  const fighters = Array.from({ length: count }, (_, i) => ({
    x: -300 + 2200 * i / (count - 1), y: 100 + i * 20, w: 38, h: 92, dead: 0, stocks: 1,
  }));
  expect(campalBounds(fighters)).toEqual({
    left: -440, right: 2078, top: -40, bottom: 332 + (count - 1) * 20,
  });
  fighters[0].stocks = 0;
  fighters[count - 1].dead = 20;
  expect(campalBounds(fighters)?.left).toBeGreaterThan(-440);
  expect(campalBounds(fighters)?.right).toBeLessThan(2078);
});
