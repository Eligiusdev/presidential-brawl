type Body = { x: number; y: number; w: number; h: number; dead: number; stocks?: number };

export function campalBounds(fighters: readonly Body[]) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const f of fighters) {
    if (f.dead > 0 || f.stocks === 0) continue;
    left = Math.min(left, f.x);
    right = Math.max(right, f.x + f.w);
    top = Math.min(top, f.y);
    bottom = Math.max(bottom, f.y + f.h);
  }
  if (left === Infinity) return undefined;
  return { left: left - 140, right: right + 140, top: top - 140, bottom: bottom + 140 };
}
