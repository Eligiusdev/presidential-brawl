import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRenderReader } from '../frontend/src/render/wasmBridge.ts';

const root = process.argv[2] ?? 'frontend/public/sim';
await import(pathToFileURL(resolve(root, 'wasm_exec.js')));
const go = new globalThis.Go();
const wasm = await WebAssembly.instantiate(await readFile(resolve(root, 'sim.wasm')), go.importObject);
void go.run(wasm.instance);
const memory = wasm.instance.exports.mem;
const read = createRenderReader(memory, globalThis.pbOnlineRenderBuffer);
const roster = JSON.stringify(['bolivar', 'aquiles']);
const id = globalThis.pbSimCreate(roster, 0, 53017);
const ids = [];
try {
  const first = read(id);
  assert.equal(first.length, 64);
  assert.equal(first[0], 1);
  const buffer = first.buffer;
  // Retain actual Go matches until the Go allocator asks Wasm for more pages.
  for (let i = 0; i < 12000 && memory.buffer === buffer; i++) {
    ids.push(globalThis.pbSimCreate(roster, 0, i + 1));
  }
  assert.notEqual(memory.buffer, buffer, 'fixture must grow Go linear memory');
  assert.equal(first.byteLength, 0);
  const refreshed = read(id);
  assert.equal(refreshed.buffer, memory.buffer);
  assert.equal(refreshed[0], 1);
  assert.equal(refreshed[7], 3);
  console.log(`Go memory growth verified, read ${refreshed.byteLength} bytes before the next simulation step`);
} finally {
  for (const match of ids) globalThis.pbSimFree(match);
  globalThis.pbSimFree(id);
}
