import { describe, expect, it } from 'vitest';
import { createRenderReader, MAX_PLAYERS, STRIDE } from '../src/render/wasmBridge';

describe('Wasm render memory', () => {
  it('reads without a copy and recreates the view after memory growth', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const refresh = createRenderReader(memory, id => id === 1 ? 16 : -1);
    const first = refresh(1)!;
    expect(first.length).toBe(MAX_PLAYERS * STRIDE);
    new Float32Array(memory.buffer, 16, 1)[0] = 3.5;
    expect(first[0]).toBe(3.5);
    expect(refresh(1)).toBe(first);
    memory.grow(1);
    expect(refresh(1)).not.toBe(first);
    expect(refresh(1)?.[0]).toBe(3.5);
    expect(refresh(2)).toBeNull();
  });
});
