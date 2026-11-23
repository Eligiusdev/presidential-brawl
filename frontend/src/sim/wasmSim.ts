export interface WasmSim {
  create(ids: string[], stage: number, seed: number): number;
  step(id: number, inputs: string[][]): number;
  snapshot(id: number): any;
  leave(id: number, slot: number): void;
  free(id: number): void;
}

let ready: Promise<WasmSim> | null = null;

export function loadWasmSim(): Promise<WasmSim> {
  if (ready) return ready;
  ready = (async () => {
    const g = globalThis as any;
    if (!g.Go) {
      await new Promise<void>((ok, err) => {
        const s = document.createElement('script');
        s.src = '/sim/wasm_exec.js';
        s.onload = () => ok();
        s.onerror = () => err(new Error('wasm_exec.js load failed'));
        document.head.appendChild(s);
      });
    }
    const go = new g.Go();
    const resp = await fetch('/sim/sim.wasm');
    const bytes = await resp.arrayBuffer();
    const mod = await WebAssembly.compile(bytes);
    const inst = await WebAssembly.instantiate(mod, go.importObject);
    // run in background - it blocks on select{}
    void go.run(inst);
    // wait for globals
    for (let i = 0; i < 100; i++) {
      if (typeof g.pbSimCreate === 'function') break;
      await new Promise(r => setTimeout(r, 20));
    }
    if (typeof g.pbSimCreate !== 'function') throw new Error('WASM sim not ready');
    return {
      create: (ids, stage, seed) => g.pbSimCreate(JSON.stringify(ids), stage, seed),
      step: (id, inputs) => g.pbSimStep(id, JSON.stringify(inputs)),
      snapshot: (id) => JSON.parse(g.pbSimSnapshot(id)),
      leave: (id, slot) => g.pbSimLeave(id, slot),
      free: (id) => g.pbSimFree(id),
    };
  })();
  return ready;
}
