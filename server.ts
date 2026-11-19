import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { DEFAULT_CONFIG } from './src/config/defaultConfig';
import { PRESIDENTS_DATA } from './src/data/presidents';
import { STAGES_DATA } from './src/data/stages';
import { GameEngine } from './src/engine/gameEngine';
import {
  GameConfig,
  MatchSummary,
  NetLobbyPlayer,
  NetRoomState,
  PlayerAction,
  PresidentData,
} from './src/types/game';

interface RoomSlot {
  ws: WebSocket;
  player: NetLobbyPlayer;
}

interface Room {
  code: string;
  hostSlot: 0 | 1;
  stageIdx: number;
  stocks: number;
  status: 'lobby' | 'playing' | 'finished';
  slots: [RoomSlot | null, RoomSlot | null];
  engine: GameEngine | null;
  fighters: [PresidentData, PresidentData] | null;
  tickTimer: ReturnType<typeof setInterval> | null;
  lastActivity: number;
}

const PORT = Number(process.env.PORT) || 3000;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map<string, Room>();
const socketMeta = new WeakMap<WebSocket, { roomCode: string; slot: 0 | 1 }>();

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `PB${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

function sendJson(ws: WebSocket | undefined | null, payload: unknown) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore closed socket send errors
  }
}

function serializeRoom(room: Room): NetRoomState {
  return {
    roomCode: room.code,
    hostSlot: room.hostSlot,
    stageIdx: room.stageIdx,
    stocks: room.stocks,
    status: room.status,
    players: [room.slots[0]?.player ?? null, room.slots[1]?.player ?? null],
  };
}

function broadcastRoom(room: Room, payload: unknown) {
  for (const s of room.slots) {
    if (s) sendJson(s.ws, payload);
  }
}

function stopRoomLoop(room: Room) {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
}

function resolveFighter(slot: RoomSlot): PresidentData {
  if (slot.player.customFighter && slot.player.customFighter.name) {
    return slot.player.customFighter;
  }
  return PRESIDENTS_DATA.find((p) => p.id === slot.player.fighterId) || PRESIDENTS_DATA[0];
}

function startRoomMatch(room: Room) {
  const s0 = room.slots[0];
  const s1 = room.slots[1];
  if (!s0 || !s1) return;

  stopRoomLoop(room);
  const cfg: GameConfig = structuredClone(DEFAULT_CONFIG);
  cfg.match.stocks = Math.max(1, Math.min(5, room.stocks || 3));

  const engine = new GameEngine(cfg, { headless: true });
  const f1 = resolveFighter(s0);
  const f2 = resolveFighter(s1);
  room.fighters = [f1, f2];
  room.engine = engine;
  room.status = 'playing';
  room.lastActivity = Date.now();

  engine.setCallbacks({
    onMatchEnd: (summary: MatchSummary) => {
      stopRoomLoop(room);
      room.status = 'finished';
      broadcastRoom(room, { type: 'match_end', summary, room: serializeRoom(room) });
    },
  });

  engine.startOnlineMatch(f1, f2, room.stageIdx, cfg.match);
  broadcastRoom(room, {
    type: 'match_start',
    fighters: [f1, f2],
    room: serializeRoom(room),
  });

  room.tickTimer = setInterval(() => {
    if (!room.engine || room.status !== 'playing') {
      stopRoomLoop(room);
      return;
    }
    room.engine.step(false);
    const sfx = room.engine.drainSfxCues();
    const packet = room.engine.getNetPacket(sfx);
    broadcastRoom(room, { type: 'world', packet });
  }, 1000 / 60);
}

function detachSocket(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  const slotObj = room.slots[meta.slot];
  if (slotObj && slotObj.ws === ws) {
    room.slots[meta.slot] = null;
  }

  const remaining = room.slots[0] || room.slots[1];
  if (!remaining) {
    stopRoomLoop(room);
    rooms.delete(room.code);
    return;
  }

  if (room.status === 'playing') {
    stopRoomLoop(room);
    room.status = 'lobby';
    room.engine = null;
  }

  if (room.hostSlot === meta.slot) {
    room.hostSlot = remaining.player.slot;
  }
  remaining.player.ready = false;

  sendJson(remaining.ws, {
    type: 'opponent_left',
    message: 'El otro jugador salió de la sala.',
    room: serializeRoom(room),
  });
}

// Cleanup stale idle rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > 1000 * 60 * 30 && room.status !== 'playing') {
      stopRoomLoop(room);
      rooms.delete(code);
    }
  }
}, 1000 * 60 * 5);

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'ping') {
        sendJson(ws, { type: 'pong', t: msg.t });
        return;
      }

      if (type === 'create_room') {
        detachSocket(ws);
        const code = generateRoomCode();
        const playerName = String(msg.playerName || 'Jugador 1').trim().slice(0, 18) || 'Jugador 1';
        const fighterId = String(msg.fighterId || 'bolivar');
        const customFighter = msg.customFighter as PresidentData | undefined;
        const stageIdx = Math.max(0, Math.min(STAGES_DATA.length, Number(msg.stageIdx) || 0));
        const stocks = Math.max(1, Math.min(5, Number(msg.stocks) || 3));

        const slotPlayer: NetLobbyPlayer = {
          slot: 0,
          name: playerName,
          fighterId,
          customFighter,
          ready: false,
          connected: true,
        };

        const room: Room = {
          code,
          hostSlot: 0,
          stageIdx,
          stocks,
          status: 'lobby',
          slots: [{ ws, player: slotPlayer }, null],
          engine: null,
          fighters: null,
          tickTimer: null,
          lastActivity: Date.now(),
        };

        rooms.set(code, room);
        socketMeta.set(ws, { roomCode: code, slot: 0 });
        sendJson(ws, { type: 'joined', slot: 0, roomCode: code, room: serializeRoom(room) });
        return;
      }

      if (type === 'join_room') {
        detachSocket(ws);
        const code = String(msg.roomCode || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'error', message: `La sala ${code || '?'} no existe o ya expiró.` });
          return;
        }
        if (room.status === 'playing') {
          sendJson(ws, { type: 'error', message: 'La partida en esta sala ya está en curso.' });
          return;
        }
        const openSlot: 0 | 1 | null = room.slots[1] === null ? 1 : room.slots[0] === null ? 0 : null;
        if (openSlot === null) {
          sendJson(ws, { type: 'error', message: 'La sala está llena (máximo 2 jugadores).' });
          return;
        }

        const playerName =
          String(msg.playerName || `Jugador ${openSlot + 1}`).trim().slice(0, 18) || `Jugador ${openSlot + 1}`;
        const fighterId = String(msg.fighterId || (openSlot === 1 ? 'robinson' : 'bolivar'));
        const customFighter = msg.customFighter as PresidentData | undefined;

        const slotPlayer: NetLobbyPlayer = {
          slot: openSlot,
          name: playerName,
          fighterId,
          customFighter,
          ready: false,
          connected: true,
        };

        room.slots[openSlot] = { ws, player: slotPlayer };
        room.lastActivity = Date.now();
        socketMeta.set(ws, { roomCode: code, slot: openSlot });

        sendJson(ws, { type: 'joined', slot: openSlot, roomCode: code, room: serializeRoom(room) });
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const slotObj = room.slots[meta.slot];
      if (!slotObj) return;
      room.lastActivity = Date.now();

      if (type === 'update_lobby') {
        if (room.status === 'playing') return;
        if (typeof msg.playerName === 'string') {
          slotObj.player.name = msg.playerName.trim().slice(0, 18) || slotObj.player.name;
        }
        if (typeof msg.fighterId === 'string') {
          slotObj.player.fighterId = msg.fighterId;
          slotObj.player.customFighter = (msg.customFighter as PresidentData | undefined) || undefined;
          slotObj.player.ready = false;
        }
        if (typeof msg.ready === 'boolean') {
          slotObj.player.ready = msg.ready;
        }
        if (meta.slot === room.hostSlot) {
          if (typeof msg.stageIdx === 'number') {
            room.stageIdx = Math.max(0, Math.min(STAGES_DATA.length, Math.floor(msg.stageIdx)));
          }
          if (typeof msg.stocks === 'number') {
            room.stocks = Math.max(1, Math.min(5, Math.floor(msg.stocks)));
          }
        }
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (type === 'start_match') {
        if (meta.slot !== room.hostSlot) return;
        if (!room.slots[0] || !room.slots[1]) {
          sendJson(ws, { type: 'error', message: 'Esperando a que se conecte el Jugador 2.' });
          return;
        }
        startRoomMatch(room);
        return;
      }

      if (type === 'player_input') {
        if (room.status !== 'playing' || !room.engine) return;
        const actions = Array.isArray(msg.actions) ? (msg.actions as PlayerAction[]) : [];
        room.engine.setRemoteInput(meta.slot, actions);
        return;
      }

      if (type === 'live_stage_switch') {
        if (room.status !== 'playing' || !room.engine) return;
        const nextIdx = Math.max(0, Math.min(STAGES_DATA.length - 1, Number(msg.stageIdx) || 0));
        room.stageIdx = nextIdx;
        room.engine.switchStageLive(nextIdx);
        return;
      }

      if (type === 'rematch') {
        if (!room.slots[0] || !room.slots[1]) return;
        startRoomMatch(room);
        return;
      }

      if (type === 'return_lobby') {
        stopRoomLoop(room);
        room.status = 'lobby';
        room.engine = null;
        if (room.slots[0]) room.slots[0].player.ready = false;
        if (room.slots[1]) room.slots[1].player.ready = false;
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
      }
    });

    ws.on('close', () => {
      detachSocket(ws);
    });

    ws.on('error', () => {
      detachSocket(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Presidential Brawl server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
