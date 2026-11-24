import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import WebSocket from 'ws';
import { ROOM_PROTOCOL } from '../src/network/roomProtocol.mjs';
import { decodeSnapshotFrame } from '../src/network/protoAdapter';

async function findPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

type Msg = any;

function connectWs(url: string) {
  const ws = new WebSocket(url);
  const inbox: Msg[] = [];
  let wake: (() => void) | undefined;
  ws.on('message', (data, isBinary) => {
    if (isBinary || Buffer.isBuffer(data) && data.length > 0 && data[0] !== 123) {
      const buf = data instanceof ArrayBuffer ? data : (data as Buffer).buffer.slice((data as Buffer).byteOffset, (data as Buffer).byteOffset + (data as Buffer).byteLength);
      const snap = decodeSnapshotFrame(buf as ArrayBuffer);
      if (snap) inbox.push(snap);
    } else {
      try { inbox.push(JSON.parse(String(data))); } catch {}
    }
    wake?.();
  });
  const send = (msg: object) => ws.send(JSON.stringify(msg));
  async function next(predicate: (m: Msg) => boolean, timeout = 4500): Promise<Msg> {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const i = inbox.findIndex(predicate);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await new Promise<void>(resolve => { const t = setTimeout(resolve, 60); wake = () => { clearTimeout(t); resolve(); }; });
      wake = undefined;
    }
    throw new Error('Mensaje esperado ausente: ' + JSON.stringify(inbox.at(-1)).slice(0, 300));
  }
  return { ws, send, next, inbox };
}

describe('server-frontend room communication', () => {
  let host: ChildProcess;
  let port: number;
  let base: string;
  const peers: WebSocket[] = [];

  beforeAll(async () => {
    port = await findPort();
    const binBase = process.env.SERVER_BIN || '../server-bin';
    const bin = existsSync(binBase) ? binBase : `${binBase}.exe`;
    host = spawn(bin, [], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise<void>((resolve, reject) => {
      host.stdout?.once('data', () => resolve());
      host.once('exit', (c) => reject(new Error('server exited ' + c)));
    });
    base = `http://127.0.0.1:${port}`;
  }, 20000);

  afterAll(() => {
    for (const ws of peers) try { ws.terminate(); } catch {}
    try { host?.kill(); } catch {}
  });

  async function connect(body: object) {
    const c = connectWs(`ws://127.0.0.1:${port}/api/rooms/ws`);
    peers.push(c.ws);
    await new Promise<void>((resolve, reject) => { c.ws.once('open', () => resolve()); c.ws.once('error', reject); });
    c.send({ protocol: ROOM_PROTOCOL, ...body });
    return c;
  }

  it('reports health and protocol', async () => {
    const health = await (await fetch(base + '/health')).json();
    expect(health.status).toBe('ok');
    expect(health.roomProtocol).toBe(ROOM_PROTOCOL);
  });

  it('rejects missing protocol', async () => {
    const stale = await connect({ type: 'create', maxPlayers: 2, protocol: undefined });
    const err = await stale.next(m => m.type === 'error');
    expect(err.code).toBe('PROTOCOL');
    stale.ws.close();
  });

  it('creates, joins, starts and syncs snapshots', async () => {
    const creator = await connect({ type: 'create', maxPlayers: 2 });
    const seat = await creator.next(m => m.type === 'seat');
    expect(seat.slot).toBe(0);
    const joiner = await connect({ type: 'join', code: seat.code });
    const seat2 = await joiner.next(m => m.type === 'seat');
    expect(seat2.slot).toBe(1);

    creator.send({ type: 'select', fighterId: 'bolivar' });
    creator.send({ type: 'ready', ready: true });
    joiner.send({ type: 'select', fighterId: 'lincoln' });
    joiner.send({ type: 'ready', ready: true });
    await creator.next(m => m.type === 'room' && m.players.every((p: any) => p?.ready));
    creator.send({ type: 'start' });
    const snap = await joiner.next(m => m.type === 'snapshot');
    expect(snap.players.length).toBe(2);
    expect(snap.stage).toBeDefined();
    expect(snap.world.camera.zoom).toBeGreaterThan(0);
    expect(snap.world.seed).toBeGreaterThan(0);

    joiner.send({ type: 'input', seq: 1, actions: ['right'] });
    const moved = await creator.next(m => m.type === 'snapshot' && m.ack[1] === 1 && m.players[1].vx > 0);
    expect(moved.players[1].x).toBeGreaterThan(snap.players[1].x);

    joiner.send({ type: 'input', seq: 2, actions: ['light'] });
    const attacking = await creator.next(m => m.type === 'snapshot' && m.players[1]?.atk?.spec?.ph?.length > 0, 3000);
    expect(attacking.players[1].atk.spec.ph[0].a).toHaveLength(2);
    expect(attacking.players[1].atk.spec.ph[0].hb).toBeDefined();
  });
});
