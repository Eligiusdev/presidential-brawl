import { ROOM_PROTOCOL } from './src/network/roomProtocol.mjs';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import uWS from 'uWebSockets.js';
import { createCanvas } from '@napi-rs/canvas';
import { attachRooms } from './server/rooms.mjs';
import { DEFAULT_CONFIG } from './src/config/defaultConfig';
import { PRESIDENTS_DATA } from './src/data/presidents';
import { STAGES_DATA } from './src/data/stages';
import { packMatch } from './src/network/matchState';
import { sound } from './src/audio/soundEngine';
import type { PlayerAction } from './src/types/game';

Object.defineProperty(globalThis, 'document', {
  value: { createElement: (tag: string) => {
    if (tag !== 'canvas') throw Error('Elemento no disponible en el servidor');
    return createCanvas(640, 360);
  } },
});

const { GameEngine } = await import('./src/engine/gameEngine');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const dist = fileURLToPath(new URL('./dist', import.meta.url));
const distRoot = normalize(dist);

const config = structuredClone(DEFAULT_CONFIG);
config.audio.muted = true;
sound.applyConfig(config.audio);

const app = uWS.App();

const stop = attachRooms(app, {
  fighterIds: PRESIDENTS_DATA.map(p => p.id),
  stageCount: STAGES_DATA.length,
  createMatch(ids: string[], stage: number, finish: (order: number[]) => void) {
    const game = new GameEngine(config);
    game.startOnline(ids, stage, randomInt(1, 0x7fffffff));
    game.onOnlineEnd = finish;
    let tick = 0;
    return {
      step(inputs: PlayerAction[][]) { game.stepOnline(inputs); return ++tick; },
      leave(slot: number) { game.leaveOnline(slot); },
      snapshot() { return packMatch(game.worldSnapshot(), tick, stage, game.freeze); },
    };
  },
});

function serve(res: uWS.HttpResponse, status: string, body: string | Buffer | Uint8Array, type: string, cache: string) {
  res.cork(() => {
    res.writeStatus(status);
    res.writeHeader('Content-Type', type);
    res.writeHeader('Cache-Control', cache);
    res.end(body);
  });
}

async function serveFile(res: uWS.HttpResponse, filePath: string, cache: string) {
  let aborted = false;
  res.onAborted(() => { aborted = true; });
  try {
    const data = await readFile(filePath);
    if (aborted) return;
    const ext = extname(filePath).toLowerCase();
    serve(res, '200 OK', data, MIME[ext] || 'application/octet-stream', cache);
  } catch {
    if (aborted) return;
    throw new Error('not found');
  }
}

app.get('/health', (res) => {
  res.onAborted(() => {});
  serve(res, '200 OK', JSON.stringify({ status: 'ok', rooms: 'state-ws', roomProtocol: ROOM_PROTOCOL }), 'application/json; charset=utf-8', 'no-store');
});

app.get('/api/*', (res) => {
  res.onAborted(() => {});
  serve(res, '404 Not Found', JSON.stringify({ error: 'Usa el WebSocket de salas.' }), 'application/json; charset=utf-8', 'no-store');
});

app.any('/*', async (res, req) => {
  const method = req.getMethod();
  if (method !== 'get' && method !== 'head') {
    res.onAborted(() => {});
    serve(res, '405 Method Not Allowed', '', 'text/plain; charset=utf-8', 'no-store');
    return;
  }

  let pathname = '/';
  try { pathname = decodeURIComponent(req.getUrl()); } catch {}

  const safePath = normalize(join(distRoot, pathname));
  if (safePath.startsWith(distRoot)) {
    try {
      await serveFile(res, safePath, 'public, max-age=31536000, immutable');
      return;
    } catch {}
  }

  try {
    await serveFile(res, join(distRoot, 'index.html'), 'no-cache');
  } catch {
    res.onAborted(() => {});
    serve(res, '404 Not Found', 'Not found', 'text/plain; charset=utf-8', 'no-store');
  }
});

const port = Number(process.env.PORT) || (process.argv.includes('--dev') ? 3001 : 3000);
let listenSocket: uWS.us_listen_socket | false = false;

app.listen('0.0.0.0', port, (token) => {
  listenSocket = token;
  if (token) {
    console.log(`Presidential Brawl: http://localhost:${port}`);
    if (process.env.RENDER) return;
    try {
      for (const ip of Object.values(networkInterfaces()).flat()) {
        if (ip && !ip.internal && ip.family === 'IPv4') console.log(`Red local: http://${ip.address}:${port}`);
      }
    } catch {
      console.log(`Red local: http://IP_DEL_ANFITRION:${port}`);
    }
  } else {
    console.error(`No se pudo iniciar el servidor en el puerto ${port}`);
    process.exit(1);
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    stop();
    if (listenSocket) uWS.us_listen_socket_close(listenSocket);
  });
}
