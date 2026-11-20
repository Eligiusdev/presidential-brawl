import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomInt } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function send(res: ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8') {
  const buf = Buffer.from(body);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': String(buf.length),
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
  });
  res.end(buf);
}

function serveFile(req: IncomingMessage, res: ServerResponse, filePath: string, cache = true) {
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const headers: Record<string, string | number> = {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return true;
    }
    res.writeHead(200, headers);
    const stream = createReadStream(filePath);
    stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
    stream.pipe(res);
    return true;
  } catch {
    return false;
  }
}

const config = structuredClone(DEFAULT_CONFIG);
config.audio.muted = true;
sound.applyConfig(config.audio);

const http = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.url?.startsWith('/api/')) return send(res, 404, JSON.stringify({ error: 'Usa el WebSocket de salas.' }));
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Length': '0' });
    return res.end();
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/health') {
    return send(res, 200, JSON.stringify({ status: 'ok', rooms: 'state-ws' }));
  }
  if (pathname.startsWith('/api/')) {
    return send(res, 404, JSON.stringify({ error: 'Usa el WebSocket de salas.' }));
  }

  // Static file from dist with path traversal protection
  const safePath = normalize(join(distRoot, pathname));
  if (safePath.startsWith(distRoot) && existsSync(safePath) && statSync(safePath).isFile()) {
    return serveFile(req, res, safePath);
  }

  // SPA fallback
  const indexPath = join(distRoot, 'index.html');
  if (!serveFile(req, res, indexPath, false)) {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
});

http.keepAliveTimeout = 65000;
http.headersTimeout = 66000;
http.requestTimeout = 0;

const stop = attachRooms(http, {
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

const port = Number(process.env.PORT) || (process.argv.includes('--dev') ? 3001 : 3000);
http.listen(port, '0.0.0.0', () => {
  console.log(`Presidential Brawl: http://localhost:${port}`);
  if (process.env.RENDER) return;
  try {
    for (const ip of Object.values(networkInterfaces()).flat()) {
      if (ip && !ip.internal && ip.family === 'IPv4') console.log(`Red local: http://${ip.address}:${port}`);
    }
  } catch {
    console.log(`Red local: http://IP_DEL_ANFITRION:${port}`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { stop(); http.close(); });
}
