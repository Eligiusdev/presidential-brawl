import { createRenderReader, createTagHUDReader } from '../render/wasmBridge';
import type { OnlineWasm } from '../network/liveRollback';
export interface WasmConfig {
  mode?: 'versus' | 'training' | 'campaign' | 'attract' | 'tag';
  stocks?: number; knockback?: number; gravity?: number;
  hazard?: string; items?: string; voteGain?: number;
  startFullVote?: boolean; aiDifficulty?: number;
  hitstop?: boolean; campaignRound?: number;
}

export interface WasmSim {
  online?: OnlineWasm;
  tagHUDView?(id: number): Uint32Array | null;
  onlineRenderView?(id: number): Float32Array | null;
  create(ids: string[], stage: number, seed: number, config?: WasmConfig, mode?: string): number;
  step(id: number, inputs: string[][]): number;
  snapshot(id: number): any;
  save?(id: number): number;
  restore?(id: number, checkpoint: number): boolean;
  dropCheckpoint?(id: number, checkpoint: number): void;
  restoreNetwork?(id: number, checkpointJSON: string): boolean;
  stateHash?(id: number): string | null;
  leave(id: number, slot: number): void;
  free(id: number): void;
}

let ready: Promise<WasmSim> | null = null;

function wasmAsset(filename: string): string {
  const url = `${import.meta.env.BASE_URL}sim/${filename}`;
  const version = import.meta.env.VITE_WASM_VERSION;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

export function loadWasmSim(): Promise<WasmSim> {
  if (ready) return ready;
  ready = (async () => {
    const g = globalThis as any;
    if (!g.Go) {
      await new Promise<void>((ok, err) => {
        const s = document.createElement('script');
        s.src = wasmAsset('wasm_exec.js');
        s.onload = () => ok();
        s.onerror = () => err(new Error('wasm_exec.js load failed'));
        document.head.appendChild(s);
      });
    }
    const go = new g.Go();
    const resp = await fetch(wasmAsset('sim.wasm'));
    if (!resp.ok) throw new Error(`Wasm download failed (${resp.status})`);
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
      create: (ids, stage, seed, config) => g.pbSimCreate(JSON.stringify(ids), stage, seed,
        JSON.stringify(config ?? {}), config?.mode ?? 'versus'),
      step: (id, inputs) => g.pbSimStep(id, JSON.stringify(inputs)),
      snapshot: (id) => JSON.parse(g.pbSimSnapshot(id)),
      ...(typeof g.pbSimSave === 'function' ? {
        save: (id: number) => g.pbSimSave(id),
        restore: (id: number, checkpoint: number) => g.pbSimRestore(id, checkpoint),
        dropCheckpoint: (id: number, checkpoint: number) => g.pbSimDropCheckpoint(id, checkpoint),
        stateHash: (id: number) => g.pbSimStateHash(id),
      } : {}),
      ...(typeof g.pbSimRestoreNetwork === 'function' ? {
        restoreNetwork: (id: number, checkpointJSON: string) => g.pbSimRestoreNetwork(id, checkpointJSON),
      } : {}),
      ...(typeof g.pbOnlineCreate === 'function' ? {
        online: {
          create: (checkpoint: string, slot: number, held: string[][] | null) => g.pbOnlineCreate(checkpoint, slot, JSON.stringify(held)),
          advance: (id: number, held: string[]) => g.pbOnlineAdvance(id, JSON.stringify(held)),
          confirm: (id: number, first: number, inputs: string[][][]) => g.pbOnlineConfirm(id, first, JSON.stringify(inputs)),
          snapshot: (id: number) => {
            const json = g.pbOnlineSnapshot(id);
            return json ? JSON.parse(json) : null;
          },
          free: (id: number) => g.pbOnlineFree(id),
        },
      } : {}),
      ...(typeof g.pbOnlineRenderBuffer === 'function' && inst.exports.mem instanceof WebAssembly.Memory ? {
        onlineRenderView: createRenderReader(inst.exports.mem, id => g.pbOnlineRenderBuffer(id)),
      } : {}),
      ...(typeof g.pbTagHUD === 'function' && inst.exports.mem instanceof WebAssembly.Memory ? {
        tagHUDView: createTagHUDReader(inst.exports.mem, id => g.pbTagHUD(id)),
      } : {}),
      leave: (id, slot) => g.pbSimLeave(id, slot),
      free: (id) => g.pbSimFree(id),
    };
  })();
  return ready;
}
