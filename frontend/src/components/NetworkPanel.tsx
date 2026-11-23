import { ROOM_PROTOCOL, ROOM_RESUME_MS } from '../network/roomProtocol.mjs';
import { AdaptiveRenderQuality, onlineCanvasWidth } from '../engine/renderPerformance';
import { preloadMatchArt } from '../engine/matchArt';
import { clearPerformanceSamples, performanceMetricsEnabled, samplePerformance } from '../engine/performanceMetrics';
import { VictoryShowcase } from './VictoryShowcase';
import { sound } from '../audio/soundEngine';
import { useEffect, useRef, useState } from 'react';
import { Crown, Globe, KeyRound, Swords, Users, X } from 'lucide-react';
import { DEFAULT_P1_KEYS, DEFAULT_P2_KEYS } from '../config/defaultConfig';
import { PRESIDENTS_DATA } from '../data/presidents';
import type { RoomCapacity } from '../data/stages';
import { PixelRenderer } from '../engine/pixelRenderer';
import { renderMatchState, type MatchSnapshot, type RoomState, type ServerRoomMessage } from '../network/matchState';
import { decodeSnapshotFrame } from '../network/protoAdapter';
import { roomSocketUrl } from '../network/roomClient';
import type { GameConfig, PlayerAction } from '../types/game';
import { OnlineGameHUD } from './GameHUD';
import { OnlineLobby } from './OnlineLobby';
import { TouchControls } from './TouchControls';

const keys = new Map<string, PlayerAction>();
for (const bindings of [DEFAULT_P1_KEYS, DEFAULT_P2_KEYS]) {
  for (const action of Object.keys(bindings) as PlayerAction[]) {
    for (const code of bindings[action]) keys.set(code, action);
  }
}

const seatStorageKey = 'brawl-online-seat';
function readSeat(): Seat | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(seatStorageKey) ?? 'null') as Seat | null;
    if (saved && typeof saved.token === 'string' && roomCodePattern.test(saved.code)) return saved;
  } catch {}
  return null;
}
function saveSeat(seat: Seat | null) {
  try {
    if (seat) sessionStorage.setItem(seatStorageKey, JSON.stringify(seat));
    else sessionStorage.removeItem(seatStorageKey);
  } catch {}
}

const roomCodePattern = /^(?:[A-F0-9]{5}|[A-F0-9]{10})$/;

type Seat = Extract<ServerRoomMessage, { type: 'seat' }>;
type Samples = { previous: MatchSnapshot; latest: MatchSnapshot; at: number };

export function NetworkPanel({ config, onActive, openSignal = 0 }: {
  config: GameConfig; onActive: (active: boolean) => void; openSignal?: number;
}) {
  const [invited] = useState(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('room');
    const fromPath = location.pathname.match(/^\/room\/([A-Za-z0-9]+)$/)?.[1];
    const code = fromQuery || fromPath;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return (code ?? (navigation?.type === 'reload' ? readSeat()?.code : '') ?? '').trim().toUpperCase();
  });
  const [open, setOpen] = useState(Boolean(invited));
  const [code, setCode] = useState(invited);
  useEffect(() => {
    if (!openSignal) return;
    setOpen(true);
    const fromPath = location.pathname.match(/^\/room\/([A-Za-z0-9]+)$/)?.[1];
    const fromQuery = new URLSearchParams(location.search).get('room');
    const next = (fromPath || fromQuery || '').trim().toUpperCase();
    if (next && roomCodePattern.test(next)) setCode(next);
  }, [openSignal]);
  const [capacity, setCapacity] = useState<RoomCapacity>(2);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [status, setStatus] = useState('');
  const [incompatible, setIncompatible] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const retryUntil = useRef(0);
  const [busy, setBusy] = useState(false);
  const [hud, setHud] = useState<MatchSnapshot['players']>([]);
  const socket = useRef<WebSocket | null>(null);
  const authenticatedSocket = useRef<WebSocket | null>(null);
  const currentSeat = useRef<Seat | null>(null);
  const sequence = useRef(0);
  const jumpSequence = useRef(-1);
  const reconnect = useRef<number | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const samples = useRef<Samples | null>(null);
  const pendingTouches = useRef<{ seq: number; at: number }[]>([]);
  const fighterIds = room?.players.map(player => player?.fighterId ?? '').join(',') ?? '';
  useEffect(() => {
    const selected = new Set(fighterIds.split(','));
    void preloadMatchArt(PRESIDENTS_DATA.filter(fighter => selected.has(fighter.id)));
  }, [fighterIds]);
  const pressed = useRef(new Map<string, PlayerAction>());
  const touch = useRef(new Set<PlayerAction>());
  const enter = useRef<(request: { type: 'create'; maxPlayers: RoomCapacity } | { type: 'join'; code: string } | { type: 'resume'; code: string; token: string }) => void>(() => {});
  const autoJoined = useRef(false);
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  const playing = Boolean(room?.playing && !room.standings);
  const actions = () => new Set([...pressed.current.values(), ...touch.current]);
  const send = (message: object) => {
    if (socket.current?.readyState === WebSocket.OPEN && socket.current.bufferedAmount < 32000) {
      socket.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };
  const sendInput = () => {
    if (!socket.current || authenticatedSocket.current !== socket.current) return;
    const seq = ++sequence.current;
    return send({ type: 'input', seq, actions: [...actions()] }) ? seq : undefined;
  };
  const clearInput = () => { pressed.current.clear(); touch.current.clear(); sendInput(); };

  useEffect(() => {
    onActiveRef.current(open);
    return () => { onActiveRef.current(false); };
  }, [open]);

  enter.current = request => {
    sound.init();
    clearTimeout(reconnect.current);
    const manual = request.type === 'create' || request.type === 'join';
    if (manual) {
      retryUntil.current = 0;
      setRecovering(false);
      setIncompatible(false);
      setRoom(null);
      setSeat(null);
      setHud([]);
      samples.current = null;
      currentSeat.current = null;
      authenticatedSocket.current = null;
      saveSeat(null);
    }
    setBusy(true);
    if (manual || !retryUntil.current) setStatus('');
    const previous = socket.current;
    const ws = new WebSocket(roomSocketUrl());
    ws.binaryType = 'arraybuffer';
    socket.current = ws;
    if (previous && previous !== ws) try { previous.close(); } catch {}
    let lastReply = performance.now();
    let lastPing = 0;
    const watchdog = window.setInterval(() => {
      if (socket.current !== ws) { clearInterval(watchdog); return; }
      if (document.hidden) { lastReply = performance.now(); return; }
      const now = performance.now();
      const timeout = currentSeat.current ? 7000 : 30000;
      if (now - lastReply > timeout) {
        disconnected(4000, 'connection timeout');
        ws.close(4000, 'connection timeout');
      }
      else if (now - lastPing >= 2500 && send({ type: 'ping' })) lastPing = now;
    }, 1000);
    function incompatibleProtocol() {
      setIncompatible(true);
      setRecovering(false);
      setBusy(false);
      setStatus('La versión de esta página y la del servidor no coinciden.');
      socket.current = null;
      ws.close();
    }
    ws.onmessage = event => {
      if (socket.current !== ws) return;
      let data: ServerRoomMessage;
      if (event.data instanceof ArrayBuffer) {
        const snap = decodeSnapshotFrame(event.data);
        if (!snap) return;
        data = snap as any;
      } else {
        try { data = JSON.parse(String(event.data)); } catch { return; }
      }
      lastReply = performance.now();
      if (data.type === 'hello') {
        if (data.protocol !== ROOM_PROTOCOL) incompatibleProtocol();
        else send({ ...request, protocol: ROOM_PROTOCOL });
        return;
      }
      if (data.type === 'seat') {
        authenticatedSocket.current = ws;
        pressed.current.clear();
        touch.current.clear();
        jumpSequence.current = -1;
        saveSeat(data);
        retryUntil.current = 0;
        setRecovering(false);
        pendingTouches.current = [];
        currentSeat.current = data;
        sequence.current = Math.max(sequence.current, data.seq);
        setSeat(data);
        setBusy(false);
        setStatus('');
        setCode(data.code);
        if (roomCodePattern.test(data.code)) window.history.replaceState({}, '', `/room/${data.code}`);
      }
      if (data.type === 'room') {
        setRoom(data);
        if (!data.playing) {
          samples.current = null;
          setHud([]);
        }
      }
      if (data.type === 'snapshot') {
        const last = samples.current?.latest;
        if (last && data.tick <= last.tick) return;
        const at = performance.now();
        if (samples.current) samplePerformance('snapshot', at - samples.current.at);
        samples.current = { previous: last ?? data, latest: data, at };
        if (performanceMetricsEnabled && currentSeat.current) {
          const ack = data.ack[currentSeat.current.slot] ?? -1;
          while (pendingTouches.current.length && pendingTouches.current[0].seq <= ack) {
            samplePerformance('ack', at - pendingTouches.current.shift()!.at);
          }
        }
        if (last) {
          if (data.world.winnerPi !== null && last.world.winnerPi === null) sound.win();
          else if (data.players.some(p => p.stocks < last.players[p.slot].stocks)) sound.ko();
          else if (data.cine && !last.cine) sound.siren();
          else if (data.players.some(p => p.damage > last.players[p.slot].damage)) sound.hit();
        }
        if (data.tick % 6 === 0 || !last || data.world.winnerPi !== null) setHud(data.players);
      }
      if (data.type === 'error') {
        if (data.code === 'PROTOCOL') { incompatibleProtocol(); return; }
        setStatus(data.message);
        setBusy(false);
        if (!currentSeat.current || data.code === 'RESUME' || data.code === 'ROOM_MISSING') {
          if (data.code === 'RESUME' || data.code === 'ROOM_MISSING') {
            currentSeat.current = null;
            retryUntil.current = 0;
            setRecovering(false);
            saveSeat(null);
            setSeat(null);
            setRoom(null);
          }
          socket.current = null;
          ws.close();
        }
      }
    };
    function disconnected(closeCode: number, reason: string) {
      clearInterval(watchdog);
      if (socket.current !== ws) return;
      socket.current = null;
      setBusy(false);
      clearInput();
      const saved = currentSeat.current;
      if (saved && closeCode !== 4001 && reason !== 'expired') {
        const now = Date.now();
        retryUntil.current ||= now + ROOM_RESUME_MS;
        if (now < retryUntil.current) {
          setRecovering(true);
          setStatus('Conexión interrumpida. Intentando recuperar tu puesto…');
          reconnect.current = window.setTimeout(() => enter.current({ type: 'resume', code: saved.code, token: saved.token }), 750);
          return;
        }
      }
      currentSeat.current = null;
      retryUntil.current = 0;
      if (closeCode !== 4001) saveSeat(null);
      setRecovering(false);
      setSeat(null);
      setRoom(null);
      samples.current = null;
      setStatus(closeCode === 4001 ? 'El puesto se abrió en otra conexión.' : saved
        ? 'No se pudo recuperar tu puesto. Puedes volver a intentar con el código.'
        : 'No se pudo conectar con el servidor de salas.');
    }
    ws.onclose = event => disconnected(event.code, event.reason);
  };
  useEffect(() => () => {
    clearTimeout(reconnect.current);
    const ws = socket.current;
    socket.current = null;
    ws?.close();
  }, []);

  useEffect(() => {
    if (invited && roomCodePattern.test(invited) && !autoJoined.current) {
      autoJoined.current = true;
      const saved = readSeat();
      if (saved?.code === invited) {
        currentSeat.current = saved;
        enter.current({ type: 'resume', code: saved.code, token: saved.token });
        return;
      }
      enter.current({ type: 'join', code: invited });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function leave() {
    clearTimeout(reconnect.current);
    clearInput();
    send({ type: 'leave' });
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    currentSeat.current = null;
    samples.current = null;
    setRoom(null);
    setSeat(null);
    setHud([]);
    setBusy(false);
    setStatus('');
    retryUntil.current = 0;
    saveSeat(null);
    setRecovering(false);
    setIncompatible(false);
    setOpen(false);
  }

  useEffect(() => {
    if (!playing || !seat) return;
    const target = canvas.current;
    if (!target) return;
    const renderer = new PixelRenderer();
    const quality = new AdaptiveRenderQuality(config.video.adaptiveQuality !== false, window.matchMedia('(pointer: coarse)').matches);
    clearPerformanceSamples();
    pendingTouches.current = [];
    const slot = seat.slot;
    let lastWidth = 0;
    let lastHeight = 0;
    const resize = new ResizeObserver(entries => {
      lastWidth = entries[0].contentRect.width;
      lastHeight = entries[0].contentRect.height;
    });
    resize.observe(target);
    let raf = 0;
    let lastPaint = performance.now() - 1000 / 60;
    const paintStep = 1000 / 60;
    let previousPaint = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const buffer = samples.current;
      if (!target || !buffer || now - lastPaint < paintStep - .3) return;
      lastPaint += Math.max(1, Math.floor((now - lastPaint) / paintStep)) * paintStep;
      const width = onlineCanvasWidth(Math.min(lastWidth, lastHeight * 16 / 9), devicePixelRatio, config.video.maxDpr, quality.quality);
      const height = Math.round(width * 9 / 16);
      if (!width || !height) return;
      if (target.width !== width) target.width = width;
      if (target.height !== height) target.height = height;
      const span = Math.max(33.33, (buffer.latest.tick - buffer.previous.tick) * 1000 / 60);
      const blend = Math.min(1, (now - buffer.at) / span);
      const since = (now - buffer.at) / (1000 / 60);
      const ping = room?.players[slot]?.ping ?? 0;
      const prediction = Math.min(8, Math.max(0, since) + Math.min(5, 1 + ping / 20));
      sound.tickMusic(buffer.latest.players.some(p => p.stocks === 1 || p.damage > 150));
      const start = performance.now();
      renderer.renderWorld(target, renderMatchState(buffer.previous, buffer.latest, blend, slot, actions(), prediction, jumpSequence.current), config, quality.quality);
      const cost = performance.now() - start;
      if (previousPaint) {
        quality.record(now - previousPaint, cost);
        samplePerformance('frame', now - previousPaint);
        samplePerformance('render', cost);
      }
      previousPaint = now;
    }
    const key = (e: KeyboardEvent) => {
      const action = keys.get(e.code);
      if (!action || e.ctrlKey || e.metaKey || e.altKey ||
        (e.type === 'keydown' && e.target instanceof HTMLElement && e.target.closest('button,input,select,textarea'))) return;
      e.preventDefault();
      if (e.repeat) return;
      if (e.type === 'keydown') {
        if (action === 'jump' && !actions().has('jump')) jumpSequence.current = sequence.current + 1;
        pressed.current.set(e.code, action);
      }
      else pressed.current.delete(e.code);
      sendInput();
    };
    const visibility = () => { if (document.hidden) clearInput(); };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(sendInput, 1000 / 30);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      clearInterval(timer);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', visibility);
      clearInput();
    };
  }, [playing, seat, config]);

  const reload = () => {
    const roomCode = currentSeat.current?.code || (roomCodePattern.test(code) ? code : null);
    const url = new URL(roomCode ? `/room/${roomCode}` : '/', location.origin);
    url.searchParams.set('refresh', Date.now().toString());
    location.replace(url);
  };
  const reloadButton = incompatible && <button type="button" className="console-btn" onClick={reload}>Recargar el juego</button>;
  const roomModes: Array<{ value: RoomCapacity; label: string; desc: string; icon: typeof Swords }> = [
    { value: 2, label: 'Duelo', desc: '1 vs 1', icon: Swords },
    { value: 4, label: 'Campal', desc: '4 jugadores', icon: Users },
    { value: 6, label: 'Campal', desc: '6 jugadores', icon: Crown },
    { value: 8, label: 'Gran Campal', desc: '8 jugadores', icon: Globe },
  ];
  if (!open) return null;
  if (room && seat && !room.playing) return <>
    <OnlineLobby room={room} slot={seat.slot} send={recovering || incompatible ? () => {} : send} leave={leave} />
    {status && <p className="online-status" role="status">{status} {reloadButton}</p>}
  </>;
  const championSlot = room?.standings?.[0];
  const champion = championSlot === undefined ? undefined : PRESIDENTS_DATA.find(f => f.id === room?.players[championSlot]?.fighterId);
  if (room && seat) return <section data-gamepad-online data-gamepad-playing={playing || undefined} className="online-screen online-match" aria-label="Combate en línea">
    <OnlineGameHUD fighters={hud} room={room} localSlot={seat.slot} />
    <div className="online-arena">
      <canvas ref={canvas} aria-label="Arena multijugador" />
      {playing && !recovering && !incompatible && <div data-gamepad-ignore className="network-touch"><TouchControls inline scale={config.controls.touchScale ?? 1} layout={config.controls.touchLayout} joystick={config.controls.touchJoystick} onAction={(action, down) => {
        const touchStarted = performanceMetricsEnabled && down ? performance.now() : null;
        if (down) {
          if (action === 'jump' && !actions().has('jump')) jumpSequence.current = sequence.current + 1;
          touch.current.add(action);
        } else touch.current.delete(action);
        const seq = sendInput();
        if (touchStarted !== null && seq !== undefined) {
          if (pendingTouches.current.length >= 32) pendingTouches.current.shift();
          pendingTouches.current.push({ seq, at: touchStarted });
        }
      }} /></div>}
      {room.standings && <section className="online-results" aria-label="Posiciones">
        <h2>Posiciones</h2>
        {champion && <VictoryShowcase key={champion.id} fighter={champion} />}
        <ol>{room.standings.map(slot => {
          const fighter = PRESIDENTS_DATA.find(d => d.id === hud[slot]?.fighterId);
          return <li key={slot}>J{slot + 1}{fighter ? ` · ${fighter.name}` : ''}</li>;
        })}</ol>
        {room.hostSlot === seat.slot && <button onClick={() => send({ type: 'lobby' })}>Volver a la sala</button>}
      </section>}
    </div>
    <footer><span role="status">{status || `J${seat.slot + 1} · WASD · J/K/L · C: definitiva`}</span>{reloadButton}<button data-gamepad-back onClick={leave}>Salir</button></footer>
  </section>;

  return <div data-gamepad-online className="console-modal-overlay" role="dialog" aria-modal="true" aria-label="Salas en línea" onMouseDown={(e) => { if (e.target === e.currentTarget) leave(); }}>
    <section className="console-modal room-modal">
      <header className="console-modal-head room-modal-head">
        <div className="room-modal-title">
          <div className="room-modal-icon" aria-hidden><Globe className="h-5 w-5" /></div>
          <div>
            <p className="console-modal-kicker">Multijugador en línea</p>
            <h2>Salas de combate</h2>
            <p className="room-modal-sub">Crea una sala o entra con un código para pelear en tiempo real.</p>
          </div>
        </div>
        <button type="button" data-gamepad-back className="console-modal-close" onClick={leave} aria-label="Cerrar"><X className="h-4 w-4" /></button>
      </header>

      <div className="console-modal-body room-modal-body">
        <section className="room-modal-section" aria-label="Crear sala">
          <div className="room-modal-section-head">
            <span className="room-modal-section-kicker"><Swords className="h-3.5 w-3.5" />Crear sala</span>
            <span className="room-modal-section-note">Elige el modo antes de abrir la sala</span>
          </div>
          <div className="room-mode-grid" role="radiogroup" aria-label="Modo de sala">
            {roomModes.map(mode => {
              const Icon = mode.icon;
              const selected = capacity === mode.value;
              return <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`room-mode-card ${selected ? 'is-selected' : ''}`}
                disabled={incompatible || busy}
                onClick={() => { sound.uiClick(); setCapacity(mode.value); }}
              >
                <span className="room-mode-icon" aria-hidden><Icon className="h-4 w-4" /></span>
                <span className="room-mode-text">
                  <strong>{mode.label}</strong>
                  <small>{mode.desc}</small>
                </span>
                <span className="room-mode-check" aria-hidden>{selected ? '●' : '○'}</span>
              </button>;
            })}
          </div>
          <button type="button" data-gamepad-initial className="console-btn console-btn-primary room-modal-create" disabled={incompatible || busy} onClick={() => enter.current({ type: 'create', maxPlayers: capacity })}>
            <Swords className="h-4 w-4" />Crear sala {capacity === 2 ? 'duelo' : capacity === 8 ? 'gran campal' : 'campal'}
          </button>
        </section>

        <div className="console-divider"><span>o únete con código</span></div>

        <section className="room-modal-section" aria-label="Unirse a sala">
          <div className="room-modal-section-head">
            <span className="room-modal-section-kicker"><KeyRound className="h-3.5 w-3.5" />Entrar a sala</span>
            <span className="room-modal-section-note">Pega el código que te compartieron</span>
          </div>
          <label className="room-code-field" htmlFor="room-code">
            <span className="room-code-label">Código de sala</span>
            <div className="room-code-input-wrap">
              <KeyRound className="h-4 w-4" aria-hidden />
              <input id="room-code" value={code} maxLength={10} placeholder="ABCDE" autoComplete="off" spellCheck={false}
                disabled={incompatible || busy}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 10))} />
            </div>
          </label>
          <button type="button" className="console-btn room-modal-join" disabled={incompatible || busy || !roomCodePattern.test(code)} onClick={() => enter.current({ type: 'join', code })}>
            Entrar a la sala
          </button>
        </section>

        {(busy || status) && <p className={`console-modal-status ${status && !busy ? 'is-error' : ''}`} role="status">{busy ? 'Conectando con la sala…' : status} {reloadButton}</p>}
      </div>
    </section>
  </div>;
}
