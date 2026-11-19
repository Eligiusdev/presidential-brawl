import {
  MatchSummary,
  NetRoomState,
  NetWorldPacket,
  PlayerAction,
  PresidentData,
} from '../types/game';

export type ServerMessage =
  | { type: 'joined'; slot: 0 | 1; roomCode: string; room: NetRoomState }
  | { type: 'room_state'; room: NetRoomState }
  | { type: 'match_start'; fighters: [PresidentData, PresidentData]; room: NetRoomState }
  | { type: 'world'; packet: NetWorldPacket }
  | { type: 'match_end'; summary: MatchSummary; room: NetRoomState }
  | { type: 'opponent_left'; message: string; room: NetRoomState }
  | { type: 'error'; message: string }
  | { type: 'pong'; t: number };

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private onMsg: ((msg: ServerMessage) => void) | null = null;
  private onCloseCb: (() => void) | null = null;
  private onPingCb: ((ms: number) => void) | null = null;
  private connectingPromise: Promise<void> | null = null;

  setListeners(opts: {
    onMessage: (msg: ServerMessage) => void;
    onDisconnect?: () => void;
    onPing?: (ms: number) => void;
  }) {
    this.onMsg = opts.onMessage;
    this.onCloseCb = opts.onDisconnect || null;
    this.onPingCb = opts.onPing || null;
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  connect(): Promise<void> {
    if (this.connected) return Promise.resolve();
    if (this.connectingPromise) return this.connectingPromise;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    this.connectingPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.connectingPromise = null;
        this.startPing();
        resolve();
      };

      ws.onerror = () => {
        this.connectingPromise = null;
        reject(new Error('No se pudo conectar al servidor multijugador.'));
      };

      ws.onclose = () => {
        this.connectingPromise = null;
        this.stopPing();
        if (this.ws === ws) this.ws = null;
        this.onCloseCb?.();
      };

      ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.data)) as ServerMessage;
          if (parsed.type === 'pong' && typeof parsed.t === 'number') {
            this.onPingCb?.(Math.max(1, Math.round(performance.now() - parsed.t)));
            return;
          }
          this.onMsg?.(parsed);
        } catch {
          // ignore malformed messages
        }
      };
    });

    return this.connectingPromise;
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', t: performance.now() });
    }, 2500);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  async createRoom(opts: {
    playerName: string;
    fighter: PresidentData;
    stageIdx: number;
    stocks: number;
  }) {
    await this.connect();
    this.send({
      type: 'create_room',
      playerName: opts.playerName,
      fighterId: opts.fighter.id,
      customFighter: opts.fighter.isCustom ? opts.fighter : undefined,
      stageIdx: opts.stageIdx,
      stocks: opts.stocks,
    });
  }

  async joinRoom(opts: {
    roomCode: string;
    playerName: string;
    fighter: PresidentData;
  }) {
    await this.connect();
    this.send({
      type: 'join_room',
      roomCode: opts.roomCode.trim().toUpperCase(),
      playerName: opts.playerName,
      fighterId: opts.fighter.id,
      customFighter: opts.fighter.isCustom ? opts.fighter : undefined,
    });
  }

  updateLobby(opts: {
    playerName?: string;
    fighter?: PresidentData;
    stageIdx?: number;
    stocks?: number;
    ready?: boolean;
  }) {
    this.send({
      type: 'update_lobby',
      playerName: opts.playerName,
      fighterId: opts.fighter?.id,
      customFighter: opts.fighter?.isCustom ? opts.fighter : undefined,
      stageIdx: opts.stageIdx,
      stocks: opts.stocks,
      ready: opts.ready,
    });
  }

  startMatch() {
    this.send({ type: 'start_match' });
  }

  sendInput(actions: PlayerAction[]) {
    this.send({ type: 'player_input', actions });
  }

  switchStage(stageIdx: number) {
    this.send({ type: 'live_stage_switch', stageIdx });
  }

  rematch() {
    this.send({ type: 'rematch' });
  }

  returnToLobby() {
    this.send({ type: 'return_lobby' });
  }

  disconnect() {
    this.stopPing();
    this.connectingPromise = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close error
      }
      this.ws = null;
    }
  }
}
