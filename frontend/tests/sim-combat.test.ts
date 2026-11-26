import { encodeBinaryInput } from '../src/network/binaryInput';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import net from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { fromBinary } from '@bufbuild/protobuf';
import { SnapshotSchema } from '../src/contract/generated/protocol_pb';
import { ROOM_PROTOCOL } from '../src/network/roomProtocol.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const serverBinBase = path.resolve(process.env.SERVER_BIN || path.join(root, 'server-bin'));
const serverBin = existsSync(serverBinBase) ? serverBinBase : `${serverBinBase}.exe`;

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (!addr || typeof addr === 'string') return reject(new Error('no port'));
      const p = addr.port;
      srv.close(err => err ? reject(err) : resolve(p));
    });
  });
}

function waitHealth(url: string, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { const r = await fetch(url); if (r.ok) return resolve(); } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('health timeout'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

function waitMsg<T = any>(ws: WebSocket, pred: (m: any) => boolean, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { ws.off('message', onMsg); reject(new Error('timeout')); }, timeoutMs);
    const onMsg = (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) return;
      const m = JSON.parse(String(data));
      if (pred(m)) { clearTimeout(t); ws.off('message', onMsg); resolve(m as T); }
    };
    ws.on('message', onMsg);
  });
}

async function waitSnap(ws: WebSocket, pred: (s: any) => boolean, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { ws.off('message', onMsg); reject(new Error('snap timeout')); }, timeoutMs);
    const onMsg = (data: WebSocket.RawData, isBinary: boolean) => {
      if (!isBinary) return;
      const raw = data instanceof Buffer ? new Uint8Array(data) : new Uint8Array(data as ArrayBuffer);
      const proto = fromBinary(SnapshotSchema, raw) as any;
      const snap = proto.snapshotJson?.length
        ? JSON.parse(new TextDecoder().decode(proto.snapshotJson)) : proto;
      if (pred(snap)) { clearTimeout(t); ws.off('message', onMsg); resolve(snap); }
    };
    ws.on('message', onMsg);
  });
}

describe('Go sim combat parity', () => {
  let proc: ChildProcessWithoutNullStreams;
  let port: number;
  beforeAll(async () => {
    port = await freePort();
    proc = spawn(serverBin, [], { cwd: root, stdio: 'pipe', env: { ...process.env, PORT: String(port) } });
    await waitHealth(`http://127.0.0.1:${port}/health`);
  }, 15000);
  afterAll(async () => { proc?.kill('SIGTERM'); });

  test('fighters take damage and stocks decrease through combat', async () => {
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/api/rooms/ws`);
    await new Promise(r => ws1.on('open', r));
    ws1.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'create', maxPlayers: 2 }));
    const seat1 = await waitMsg<any>(ws1, m => m.type === 'seat');
    const code = seat1.code;

    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/api/rooms/ws`);
    await new Promise(r => ws2.on('open', r));
    ws2.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'join', code }));
    await waitMsg<any>(ws2, m => m.type === 'seat');

    ws1.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'select', fighterId: 'lincoln' }));
    ws1.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'ready', ready: true }));
    ws2.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'select', fighterId: 'robinson' }));
    ws2.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'ready', ready: true }));
    await waitMsg<any>(ws1, m => m.type === 'room' && m.players?.every((p: any) => p?.ready));
    ws1.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'start' }));
    await waitMsg<any>(ws1, m => m.type === 'room' && m.playing);

    let seq1 = 0, seq2 = 0;
    const iv = setInterval(() => {
      seq1++; seq2++;
      if (ws1.readyState === WebSocket.OPEN) ws1.send(encodeBinaryInput(seq1, new Set(['right', 'light']))!);
      if (ws2.readyState === WebSocket.OPEN) ws2.send(JSON.stringify({ protocol: ROOM_PROTOCOL, type: 'input', seq: seq2, actions: ['left','light'] }));
    }, 50);

    const requestSync = (matchId?: number, afterFrame?: number) => {
      const reply = waitMsg<any>(ws1, message => message.type === 'rollbackSync');
      ws1.send(JSON.stringify({ type: 'rollbackSync', matchId, afterFrame }));
      return reply;
    };
    const checkpoint = await requestSync();
    expect(checkpoint.checkpoint.version).toBe(1);
    expect(checkpoint.checkpoint.state.Frame).toBe(checkpoint.frame);
    expect(checkpoint.roomSlots).toEqual([0, 1]);
    await new Promise(resolve => setTimeout(resolve, 300));
    const confirmed = await requestSync(checkpoint.matchId, checkpoint.frame);
    expect(confirmed.checkpoint).toBeUndefined();
    expect(confirmed.inputs[0].frame).toBe(checkpoint.frame + 1);
    expect(confirmed.inputs.at(-1).frame).toBe(confirmed.frame);
    expect(confirmed.inputs.some((frame: any) => frame.slots.every((slot: any) => slot.seq > 0))).toBe(true);

    const snap = await waitSnap(ws1, s => {
      const ps = s.players || [];
      return ps.some((p: any) => (p.pct ?? p.damage ?? 0) > 0 || (p.stocks ?? 3) < 3);
    }, 15000);
    clearInterval(iv);
    const ps = snap.players || [];
    expect(ps.length).toBe(2);
    const anyDamage = ps.some((p: any) => (p.pct ?? p.damage ?? 0) > 0 || (p.stocks ?? 3) < 3);
    expect(anyDamage).toBe(true);
    ws1.close(); ws2.close();
  }, 20000);
});
