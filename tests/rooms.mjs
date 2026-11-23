import { ROOM_PROTOCOL } from '../src/network/roomProtocol.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { WebSocket } from 'ws';

async function findPort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('salas WebSocket de 2/4/6/8, snapshots autoritativos y migración', { timeout: 25000 }, async () => {
  const port = await findPort();
  const serverBin = process.env.SERVER_BIN;
  const host = serverBin
    ? spawn(serverBin, [], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
        env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
      });
  const peers = [];
  let stderr = '';
  host.stderr.on('data', chunk => { stderr += chunk; });
  try {
    await new Promise((resolve, reject) => {
      host.stdout.once('data', resolve);
      host.once('exit', () => reject(Error(stderr)));
    });
    const base = `http://127.0.0.1:${port}`;
    const health = await (await fetch(base + '/health')).json();
    assert.equal(health.rooms, 'state-ws');
    assert.equal(health.roomProtocol, ROOM_PROTOCOL);

    async function connect(body) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/api/rooms/ws`);
      const inbox = [];
      let wake;
      ws.on('message', data => { inbox.push(JSON.parse(data)); wake?.(); });
      await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
      const send = message => ws.send(JSON.stringify(message));
      async function next(predicate) {
        const end = Date.now() + 4500;
        while (Date.now() < end) {
          const index = inbox.findIndex(predicate);
          if (index >= 0) return inbox.splice(index, 1)[0];
          await new Promise(resolve => {
            const timer = setTimeout(resolve, 60);
            wake = () => { clearTimeout(timer); resolve(); };
          });
          wake = undefined;
        }
        throw Error('Mensaje esperado ausente: ' + stderr + ' ' + JSON.stringify(inbox.at(-1)).slice(0, 400));
      }
      const peer = { ws, next, send };
      peers.push(peer);
      send({ protocol: ROOM_PROTOCOL, ...body });
      return peer;
    }

    const stale = await connect({ type: 'create', maxPlayers: 2, protocol: undefined });
    assert.equal((await stale.next(m => m.type === 'error')).code, 'PROTOCOL');
    stale.ws.close();

    for (const maxPlayers of [2, 4, 6, 8]) {
      const players = [];
      let finalSeat;
      const creator = await connect({ type: 'create', maxPlayers });
      const seat = await creator.next(m => m.type === 'seat');
      assert.equal(seat.slot, 0);
      players.push(creator);
      for (let slot = 1; slot < maxPlayers; slot++) {
        const peer = await connect({ type: 'join', code: seat.code });
        finalSeat = await peer.next(m => m.type === 'seat');
        assert.equal(finalSeat.slot, slot);
        players.push(peer);
      }
      const overflow = await connect({ type: 'join', code: seat.code });
      assert.equal((await overflow.next(m => m.type === 'error')).code, 'ROOM_FULL');
      overflow.ws.close();

      let leader = creator;
      if (maxPlayers === 6) {
        const replaced = new Promise(resolve => creator.ws.once('close', resolve));
        leader = await connect({ type: 'resume', code: seat.code, token: seat.token });
        assert.equal((await leader.next(m => m.type === 'seat')).slot, 0);
        assert.equal(await replaced, 4001);
        players[0] = leader;
      }
      if (maxPlayers === 4) {
        creator.ws.close();
        leader = players[1];
        const migrated = await leader.next(m => m.type === 'room' && m.hostSlot === 1);
        assert.equal(migrated.players[0].connected, false);
        players[0] = await connect({ type: 'resume', code: seat.code, token: seat.token });
        assert.equal((await players[0].next(m => m.type === 'seat')).slot, 0);
      }
      leader.send({ type: 'stage', stage: 1 });
      for (const p of players) {
        p.send({ type: 'select', fighterId: maxPlayers === 2 ? 'xiomara' : 'bolivar' });
        p.send({ type: 'ready', ready: true });
      }
      await leader.next(m => m.type === 'room' && m.stage === 1 && m.players.every(p => p?.ready));
      leader.send({ type: 'start' });
      const sample = await players.at(-1).next(m => m.type === 'snapshot');
      assert.equal(sample.players.length, maxPlayers);
      assert.equal(sample.players[0].fighterId, maxPlayers === 2 ? 'xiomara' : 'bolivar');
      assert.equal(sample.stage, 1);
      assert.ok(sample.world.camera.zoom > 0);
      assert.ok(JSON.stringify(sample).length < 16000);
      assert.ok(!JSON.stringify(sample).includes('base64'));
      let visitor = players.at(-1);
      visitor.send({ type: 'input', seq: 1, actions: ['right'] });
      const moved = await players[0].next(m => m.type === 'snapshot' && m.ack.at(-1) === 1 && m.players.at(-1).vx > 0);
      assert.ok(moved.players.at(-1).x > sample.players.at(-1).x);
      assert.equal(moved.tick % 2, 0);
      if (maxPlayers === 2 || maxPlayers === 8) {
        const ticket = finalSeat;
        const observer = players[0];
        visitor.ws.terminate();
        await observer.next(m => m.type === 'room' && m.playing && !m.players.at(-1)?.connected);
        visitor = await connect({ type: 'resume', code: ticket.code, token: ticket.token });
        const resumed = await visitor.next(m => m.type === 'seat');
        assert.equal(resumed.slot, ticket.slot);
        assert.equal(resumed.seq, 1);
        visitor.send({ type: 'ping' });
        await visitor.next(m => m.type === 'pong');
        visitor.send({ type: 'input', seq: 2, actions: ['left'] });
        await visitor.next(m => m.type === 'snapshot' && m.tick > moved.tick && m.ack.at(-1) === 2 && m.players.at(-1).vx < 0);
      }
      if (maxPlayers === 8) {
        const startClock = performance.now();
        const later = await visitor.next(m => m.type === 'snapshot' && m.tick >= moved.tick + 24);
        const observed = performance.now() - startClock;
        assert.ok(later.tick % 2 === 0);
        assert.ok(observed >= 250 && observed < 1300, 'cadencia de snapshots');

        players[0].send({ type: 'leave' });
        const migrated = await visitor.next(m => m.type === 'room' && m.playing && m.hostSlot === 1);
        assert.equal(migrated.players[0], null);
        await visitor.next(m => m.type === 'snapshot' && m.players[0].stocks === 0);
      }
      for (let i = 0; i < players.length - 1; i++) {
        if (players[i].ws.readyState === WebSocket.OPEN) players[i].send({ type: 'leave' });
      }
      const done = await visitor.next(m => m.type === 'room' && m.standings);
      assert.equal(done.standings[0], maxPlayers - 1);
      assert.equal(new Set(done.standings).size, maxPlayers);
      visitor.send({ type: 'leave' });
    }
  } finally {
    for (const peer of peers) peer.ws.terminate();
    host.kill();
    await new Promise(resolve => host.exitCode === null && host.signalCode === null ? host.once('exit', resolve) : resolve());
  }
});
