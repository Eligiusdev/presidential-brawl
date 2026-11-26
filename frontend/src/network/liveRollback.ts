import type { PlayerAction } from '../types/game';
import type { RichSnapshot } from '../sim/wasmWorld';

const maxRollback = 8;
const needsState = 3;
const applied = 1;
const frameMs = 1000 / 60;

interface EffectiveInput {
  seq: number;
  held: string[] | null;
}

export interface SyncReply {
  type: 'rollbackSync';
  syncRequest?: number;
  matchId: number;
  frame: number;
  roomSlots: number[];
  checkpoint?: object;
  held?: EffectiveInput[];
  inputs?: { frame: number; slots: EffectiveInput[] }[];
}

export interface OnlineWasm {
  create(checkpoint: string, slot: number, held: string[][] | null): number;
  advance(id: number, held: string[]): number;
  confirm(id: number, first: number, inputs: string[][][]): number;
  snapshot(id: number): RichSnapshot | null;
  free(id: number): void;
}

export class LiveRollback {
  private id = -1;
  private matchId = 0;
  private confirmed = 0;
  private head = 0;
  private nextAdvance = 0;
  private lastRequest = -Infinity;
  private requested = 0;
  private pending = false;
  private reply: SyncReply | null = null;
  corrections = 0;
  checkpoints = 0;

  constructor(private wasm: OnlineWasm, private roomSlot: number, private nextRequestId: () => number) {}

  receive(reply: SyncReply) {
    if (reply.syncRequest !== this.requested || !this.pending) return;
    this.reply = reply;
    this.pending = false;
  }

  update(now: number, local: ReadonlySet<PlayerAction>, send: (message: object) => boolean) {
    const reply = this.reply;
    this.reply = null;
    if (reply) this.apply(reply, now);
    const interval = this.pending ? 150 : this.id < 0 ? 200 : 40;
    if (now - this.lastRequest >= interval) {
      const syncRequest = this.nextRequestId();
      if (send({ type: 'rollbackSync', syncRequest, matchId: this.matchId,
        ...(this.id >= 0 ? { afterFrame: this.confirmed } : {}),
      })) {
        this.lastRequest = now;
        this.requested = syncRequest;
        this.pending = true;
      }
    }
    if (this.id < 0) return null;
    const held = [...local];
    // Bound work per render and fall back while a full correction is pending.
    for (let i = 0; i < 2 && now + .3 >= this.nextAdvance && this.head < this.confirmed + maxRollback; i++) {
      this.head = this.wasm.advance(this.id, held);
      this.nextAdvance += frameMs;
    }
    if (now - this.nextAdvance > frameMs * 2) this.nextAdvance = now + frameMs;
    return this.head >= this.confirmed + maxRollback ? null : this.wasm.snapshot(this.id);
  }

  private apply(reply: SyncReply, now: number) {
    if (reply.checkpoint) {
      const slot = reply.roomSlots.indexOf(this.roomSlot);
      if (slot < 0) return;
      const id = this.wasm.create(JSON.stringify(reply.checkpoint), slot, reply.held?.map(input => input.held ?? []) ?? null);
      if (id < 0) return;
      this.dispose();
      this.id = id;
      this.matchId = reply.matchId;
      this.head = this.confirmed = reply.frame;
      this.nextAdvance = now;
      this.checkpoints++;
      return;
    }
    if (this.id < 0 || reply.matchId !== this.matchId) return;
    const inputs = reply.inputs ?? [];
    const first = this.confirmed + 1;
    if (!inputs.length && reply.frame === this.confirmed) return;
    if (inputs.length > maxRollback || inputs.length !== reply.frame - this.confirmed ||
      inputs.some((entry, i) => entry.frame !== first + i || entry.slots.length !== reply.roomSlots.length)) {
      this.dispose();
      return;
    }
    const result = this.wasm.confirm(this.id, first, inputs.map(entry => entry.slots.map(input => input.held ?? [])));
    if (result === needsState || result < 0) {
      this.dispose();
      return;
    }
    if (result === applied) this.corrections++;
    this.confirmed = reply.frame;
    this.head = Math.max(this.head, this.confirmed);
  }

  dispose() {
    if (this.id >= 0) this.wasm.free(this.id);
    this.id = -1;
    this.pending = false;
    this.reply = null;
  }
}
