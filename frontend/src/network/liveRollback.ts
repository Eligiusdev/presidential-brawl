import type { PlayerAction } from '../types/game';
import type { RichSnapshot } from '../sim/wasmWorld';

const maxRollback = 8;
const maxConfirmedBatch = 32;
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
  private rendered: RichSnapshot | null = null;
  private queued: NonNullable<SyncReply['inputs']> = [];
  corrections = 0;
  checkpoints = 0;

  constructor(private wasm: OnlineWasm, private roomSlot: number, private nextRequestId: () => number) {}

  receive(reply: SyncReply) {
    if (reply.syncRequest !== this.requested || !this.pending) return;
    this.reply = reply;
    this.pending = false;
  }

  request(now: number, send: (message: object) => boolean) {
    if (this.reply || this.queued.length) return;
    const interval = this.pending ? 150 : this.id < 0 ? 200 : 40;
    if (now - this.lastRequest < interval) return;
    const syncRequest = this.nextRequestId();
    if (!send({ type: 'rollbackSync', syncRequest, matchId: this.matchId,
      ...(this.id >= 0 ? { afterFrame: this.confirmed } : {}),
    })) return;
    this.lastRequest = now;
    this.requested = syncRequest;
    this.pending = true;
  }

  update(now: number, local: ReadonlySet<PlayerAction>, authoritativeFrame: number) {
    const reply = this.reply;
    this.reply = null;
    if (reply) this.apply(reply, now);
    const processing = this.queued.length > 0;
    if (processing) this.commitConfirmed();
    if (this.id < 0) return null;
    let held: string[] | undefined;
    // Bound work per render and fall back while a full correction is pending.
    for (let i = 0; !processing && i < 2 && now + .3 >= this.nextAdvance && this.head < this.confirmed + maxRollback; i++) {
      held ??= [...local];
      this.head = this.wasm.advance(this.id, held);
      this.rendered = null;
      this.nextAdvance += frameMs;
    }
    if (now - this.nextAdvance > frameMs * 2) this.nextAdvance = now + frameMs;
    return this.head >= this.confirmed + maxRollback || this.head < authoritativeFrame - maxRollback ? null : (this.rendered ??= this.wasm.snapshot(this.id));
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
    if (inputs.length > maxConfirmedBatch || inputs.length !== reply.frame - this.confirmed ||
      inputs.some((entry, i) => entry.frame !== first + i || entry.slots.length !== reply.roomSlots.length)) {
      this.dispose();
      return;
    }
    this.queued = inputs;
  }

  private commitConfirmed() {
    const first = this.confirmed + 1;
    // One rewind per paint. If only future inputs remain, catch up in
    // small chunks instead of dropping the history and asking for a checkpoint.
    const count = first <= this.head ? this.head - first + 1 : 3;
    const inputs = this.queued.splice(0, count);
    const result = this.wasm.confirm(this.id, first, inputs.map(entry => entry.slots.map(input => input.held ?? [])));
    if (result === needsState || result < 0) {
      this.dispose();
      return;
    }
    if (result === applied) this.corrections++;
    this.confirmed = inputs[inputs.length - 1].frame;
    if (result === applied || this.confirmed > this.head) this.rendered = null;
    this.head = Math.max(this.head, this.confirmed);
  }

  dispose() {
    if (this.id >= 0) this.wasm.free(this.id);
    this.id = -1;
    this.rendered = null;
    this.queued = [];
    this.pending = false;
    this.reply = null;
  }
}
