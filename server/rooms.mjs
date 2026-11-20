import { randomBytes } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const capacities = [2, 4, 6, 8];
const actions = new Set(['left', 'right', 'jump', 'down', 'light', 'heavy', 'dash', 'ult', 'reload']);
const colors = ['#fb5969','#60a5fa','#facc15','#4ade80','#fb923c','#c084fc','#22d3ee','#f3f4f6'];
const tokens = () => randomBytes(24).toString('hex');
const MAX_BUFFER = 64 * 1024;
const STEP = 1000 / 60;

export function attachRooms(server, { allowedOrigins = process.env.ALLOWED_ORIGINS ?? '', fighterIds, stageCount, createMatch }) {
  const origins = new Set(allowedOrigins.split(',').map(origin => origin.trim()).filter(Boolean));
  const roster = new Set(fighterIds);
  const rooms = new Map();
  const sockets = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    maxPayload: 4096,
    skipUTF8Validation: true,
  });
  const send = (ws, message) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  const failure = (ws, code, message) => send(ws, { type: 'error', code, message });
  const publish = room => {
    const state = {
      type: 'room', code: room.code, hostSlot: room.hostSlot, stage: room.stage,
      maxPlayers: room.players.length, playing: Boolean(room.match), standings: room.standings,
      players: room.players.map((p, slot) => p && ({
        slot, fighterId: p.fighterId, color: colors[slot], ping: p.ping, ready: p.ready, connected: Boolean(p.ws),
      })),
    };
    for (const p of room.players) if (p?.ws) send(p.ws, state);
  };

  function remove(room, player, resume) {
    const slot = room.players.indexOf(player);
    if (slot < 0) return;
    player.ws = null;
    player.input = [];
    player.pending = [];
    player.ready = false;
    player.leftAt = resume ? Date.now() : 1;
    if (!resume) {
      room.match?.leave(slot);
      room.players[slot] = null;
    }
    if (room.hostSlot === slot) room.hostSlot = room.players.findIndex(p => p?.ws);
    publish(room);
  }

  function upgrade(req, socket, head) {
    if (req.url?.split('?')[0] !== '/api/rooms/ws') return;
    const origin = req.headers.origin;
    if (origin) {
      let sameHost = false;
      try { sameHost = new URL(origin).host === req.headers.host; } catch {}
      if (!sameHost && !origins.has(origin)) {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
    }
    sockets.handleUpgrade(req, socket, head, ws => sockets.emit('connection', ws));
  }
  server.on('upgrade', upgrade);

  sockets.on('connection', (ws, req) => {
    const sock = req?.socket ?? ws._socket;
    try { sock?.setNoDelay?.(true); sock?.setKeepAlive?.(true, 15000); } catch {}
    let room, player, slot;
    ws.alive = true;
    ws.on('error', () => {});
    ws.on('pong', data => {
      ws.alive = true;
      if (player) player.ping = Math.max(0, Math.min(9999, Date.now() - Number(data.toString()) || 0));
    });
    ws.on('close', () => {
      if (player?.ws === ws) remove(room, player, true);
    });
    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (!player) {
        if (msg.type === 'create') {
          if (!capacities.includes(msg.maxPlayers)) return failure(ws, 'CAPACITY', 'Elige 2, 4, 6 u 8 jugadores.');
          if (rooms.size >= 100) return failure(ws, 'LIMIT', 'El servidor ya tiene demasiadas salas.');
          let code;
          do { code = randomBytes(5).toString('hex').toUpperCase(); } while (rooms.has(code));
          room = { code, players: Array(msg.maxPlayers).fill(null), hostSlot: 0, stage: 0,
            match: null, standings: null, clock: 0, updated: Date.now() };
          rooms.set(code, room);
        } else if (msg.type === 'join' || msg.type === 'resume') {
          room = rooms.get(msg.code);
          if (!room) return failure(ws, 'ROOM_MISSING', 'La sala no existe o caducó.');
        } else return;

        if (msg.type === 'resume') {
          slot = room.players.findIndex(p => p && p.token === msg.token && !p.ws);
          if (slot < 0) return failure(ws, 'RESUME', 'Ya no se puede recuperar este puesto.');
          player = room.players[slot];
        } else {
          slot = room.players.indexOf(null);
          if (slot < 0) return failure(ws, 'ROOM_FULL', 'La sala está llena.');
          if (room.match) return failure(ws, 'IN_MATCH', 'La partida ya comenzó.');
          player = { token: tokens(), fighterId: null, input: [], pending: [], appliedSeq: -1, seq: -1, ping: 0, ready: false, inputAt: 0 };
          room.players[slot] = player;
        }
        player.ws = ws;
        player.leftAt = undefined;
        room.updated = Date.now();
        if (room.hostSlot < 0) room.hostSlot = slot;
        send(ws, { type: 'seat', code: room.code, slot, token: player.token, seq: player.seq });
        publish(room);
        return;
      }
      if (player.ws !== ws) return;
      room.updated = Date.now();
      if (msg.type === 'input' && room.match && !room.standings) {
        if (!Number.isSafeInteger(msg.seq) || msg.seq <= player.seq || !Array.isArray(msg.actions) ||
          msg.actions.length > actions.size || msg.actions.some(action => !actions.has(action))) return;
        player.seq = msg.seq;
        const next = [...new Set(msg.actions)];
        const lastInput = player.pending.at(-1)?.actions ?? player.input;
        if (lastInput.length === next.length && next.every(a => lastInput.includes(a))) {
          if (player.pending.length) player.pending.at(-1).seq = msg.seq;
          else player.appliedSeq = msg.seq;
        } else {
          if (player.pending.length >= 6) player.pending.pop();
          player.pending.push({ seq: msg.seq, actions: next });
        }
        player.inputAt = Date.now();
      } else if (msg.type === 'select' && !room.match && roster.has(msg.fighterId)) {
        player.fighterId = msg.fighterId;
        player.ready = false;
        publish(room);
      } else if (msg.type === 'ready' && !room.match && player.fighterId && typeof msg.ready === 'boolean') {
        player.ready = msg.ready;
        publish(room);
      } else if (msg.type === 'stage' && !room.match && slot === room.hostSlot &&
        Number.isInteger(msg.stage) && msg.stage >= 0 && msg.stage < stageCount) {
        room.stage = msg.stage;
        publish(room);
      } else if (msg.type === 'start' && slot === room.hostSlot) {
        if (room.match || !room.players.every(p => p?.ws && p.ready)) {
          return failure(ws, 'NOT_READY', 'Todos los puestos deben estar conectados y listos.');
        }
        room.standings = null;
        room.match = createMatch(room.players.map(p => p.fighterId), room.stage, standings => {
          room.standings = standings;
        });
        publish(room);
      } else if (msg.type === 'lobby' && room.standings && slot === room.hostSlot) {
        room.match = null;
        room.standings = null;
        room.players.forEach(p => { if (p) { p.ready = false; p.input = []; p.pending = []; } });
        publish(room);
      } else if (msg.type === 'leave') {
        remove(room, player, false);
        ws.close(1000);
      }
    });
    send(ws, { type: 'hello' });
  });

  let last = performance.now();
  const tick = setInterval(() => {
    const now = Date.now();
    const time = performance.now();
    const elapsed = Math.min(100, time - last);
    last = time;
    for (const [code, room] of rooms) {
      for (const p of room.players) {
        if (p && !p.ws && now - p.leftAt > 20000) remove(room, p, false);
      }
      if (!room.players.some(Boolean) || now - room.updated > 30 * 60 * 1000) {
        for (const p of room.players) p?.ws?.close(1000);
        rooms.delete(code);
        continue;
      }
      if (!room.match || room.standings || !room.players.some(p => p?.ws)) continue;
      room.clock += elapsed;
      let snapshotDue = false;
      while (room.clock >= STEP && !room.standings) {
        room.clock -= STEP;
        const step = room.match.step(room.players.map(p => {
          if (!p?.ws || now - p.inputAt >= 500) {
            if (p) { p.input = []; p.pending = []; }
            return [];
          }
          const input = p.pending.shift();
          if (input) { p.input = input.actions; p.appliedSeq = input.seq; }
          return p.input;
        }));
        snapshotDue ||= step % 2 === 0 || Boolean(room.standings);
      }
      if (!snapshotDue) continue;
      const data = JSON.stringify({ type: 'snapshot', ...room.match.snapshot(), ack: room.players.map(p => p?.appliedSeq ?? -1) });
      for (const p of room.players) {
        if (p?.ws?.readyState === WebSocket.OPEN && p.ws.bufferedAmount < MAX_BUFFER) p.ws.send(data);
      }
      if (room.standings) publish(room);
    }
  }, 8);
  const heartbeat = setInterval(() => {
    for (const ws of sockets.clients) {
      if (!ws.alive) ws.terminate();
      else { ws.alive = false; ws.ping(String(Date.now())); }
    }
    for (const room of rooms.values()) publish(room);
  }, 10000);
  tick.unref();
  heartbeat.unref();

  return () => {
    clearInterval(tick);
    clearInterval(heartbeat);
    server.off('upgrade', upgrade);
    for (const ws of sockets.clients) ws.terminate();
    sockets.close();
    rooms.clear();
  };
}
