import express from 'express';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { networkInterfaces } from 'node:os';
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

const app = express();
app.disable('x-powered-by');
const http = createServer(app);
const config = structuredClone(DEFAULT_CONFIG);
config.audio.muted = true;
sound.applyConfig(config.audio);
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
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: 'state-ws' }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Usa el WebSocket de salas.' }));
const dist = fileURLToPath(new URL('./dist', import.meta.url));
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(`${dist}/index.html`));
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
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { stop(); http.close(); });
}
