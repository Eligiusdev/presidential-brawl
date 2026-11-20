import { sound } from '../audio/soundEngine';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_P1_KEYS, DEFAULT_P2_KEYS } from '../config/defaultConfig';
import { PRESIDENTS_DATA } from '../data/presidents';
import type { RoomCapacity } from '../data/stages';
import { PixelRenderer } from '../engine/pixelRenderer';
import { renderMatchState, type MatchSnapshot, type RoomState, type ServerRoomMessage } from '../network/matchState';
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

type Seat = Extract<ServerRoomMessage, { type: 'seat' }>;
type Samples = { previous: MatchSnapshot; latest: MatchSnapshot; at: number };

export function NetworkPanel({ config, hideLaunch, onActive, openSignal = 0 }: {
  config: GameConfig; hideLaunch: boolean; onActive: (active: boolean) => void; openSignal?: number;
}) {
  const invited = (new URLSearchParams(location.search).get('room') ?? '').toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 5);
  const [open, setOpen] = useState(Boolean(invited));
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);
  const [code, setCode] = useState(invited);
  const [capacity, setCapacity] = useState<RoomCapacity>(2);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [hud, setHud] = useState<MatchSnapshot['players']>([]);
  const socket = useRef<WebSocket | null>(null);
  const currentSeat = useRef<Seat | null>(null);
  const sequence = useRef(0);
  const jumpSequence = useRef(-1);
  const reconnect = useRef<number | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const samples = useRef<Samples | null>(null);
  const pressed = useRef(new Map<string, PlayerAction>());
  const touch = useRef(new Set<PlayerAction>());
  const enter = useRef<(request: object) => void>(() => {});
  const autoJoined = useRef(false);
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  const playing = Boolean(room?.playing && !room.standings);
  const actions = () => new Set([...pressed.current.values(), ...touch.current]);
  const send = (message: object) => {
    if (socket.current?.readyState === WebSocket.OPEN && socket.current.bufferedAmount < 32000) {
      socket.current.send(JSON.stringify(message));
    }
  };
  const sendInput = () => send({ type: 'input', seq: ++sequence.current, actions: [...actions()] });
  const clearInput = () => { pressed.current.clear(); touch.current.clear(); sendInput(); };

  useEffect(() => {
    onActiveRef.current(open);
    return () => { onActiveRef.current(false); };
  }, [open]);

  enter.current = request => {
    sound.init();
    setBusy(true);
    setStatus('');
    const ws = new WebSocket(roomSocketUrl());
    socket.current = ws;
    ws.onopen = () => send(request);
    ws.onmessage = event => {
      if (socket.current !== ws) return;
      let data: ServerRoomMessage;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'seat') {
        currentSeat.current = data;
        sequence.current = Math.max(sequence.current, data.seq);
        setSeat(data);
        setBusy(false);
        setStatus('');
        setCode(data.code);
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
        samples.current = { previous: last ?? data, latest: data, at: performance.now() };
        if (last) {
          if (data.world.winnerPi !== null && last.world.winnerPi === null) sound.win();
          else if (data.players.some(p => p.stocks < last.players[p.slot].stocks)) sound.ko();
          else if (data.cine && !last.cine) sound.siren();
          else if (data.players.some(p => p.damage > last.players[p.slot].damage)) sound.hit();
        }
        if (data.tick % 6 === 0 || !last || data.world.winnerPi !== null) setHud(data.players);
      }
      if (data.type === 'error') {
        setStatus(data.message);
        setBusy(false);
        if (!currentSeat.current || data.code === 'RESUME' || data.code === 'ROOM_MISSING') {
          if (data.code === 'RESUME' || data.code === 'ROOM_MISSING') {
            currentSeat.current = null;
            setSeat(null);
            setRoom(null);
          }
          socket.current = null;
          ws.close();
        }
      }
    };
    ws.onclose = () => {
      if (socket.current !== ws) return;
      socket.current = null;
      setBusy(false);
      clearInput();
      const saved = currentSeat.current;
      if (saved) {
        setStatus('Reconectando con la sala…');
        reconnect.current = window.setTimeout(() => enter.current({ type: 'resume', code: saved.code, token: saved.token }), 1000);
      } else setStatus('No se pudo conectar con el servidor de salas.');
    };
  };
  useEffect(() => () => {
    clearTimeout(reconnect.current);
    const ws = socket.current;
    socket.current = null;
    ws?.close();
  }, []);

  useEffect(() => {
    if (invited && /^[A-F0-9]{5}$/.test(invited) && !autoJoined.current) {
      autoJoined.current = true;
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
    setOpen(false);
  }

  useEffect(() => {
    if (!playing || !seat) return;
    const target = canvas.current;
    if (!target) return;
    const renderer = new PixelRenderer();
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
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const buffer = samples.current;
      if (!target || !buffer || now - lastPaint < paintStep) return;
      lastPaint += Math.floor((now - lastPaint) / paintStep) * paintStep;
      const width = Math.round(Math.min(lastWidth, lastHeight * 16 / 9) * devicePixelRatio);
      const height = Math.round(width * 9 / 16);
      if (!width || !height) return;
      if (target.width !== width) target.width = width;
      if (target.height !== height) target.height = height;
      const span = Math.max(33.33, (buffer.latest.tick - buffer.previous.tick) * 1000 / 60);
      const blend = Math.min(1, (now - buffer.at) / span);
      const since = (now - buffer.at) / (1000 / 60);
      const ping = room?.players[slot]?.ping ?? 0;
      const prediction = Math.max(0, since) + Math.min(5, 1 + ping / 20);
      sound.tickMusic(buffer.latest.players.some(p => p.stocks === 1 || p.damage > 150));
      renderer.renderWorld(target, renderMatchState(buffer.previous, buffer.latest, blend, slot, actions(), prediction, jumpSequence.current), config);
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

  if (!open) return null;
  if (room && seat && !room.playing) return <>
    <OnlineLobby room={room} slot={seat.slot} send={send} leave={leave} />
    {status && <p className="online-status" role="status">{status}</p>}
  </>;
  if (room && seat) return <section data-gamepad-online data-gamepad-playing={playing || undefined} className="online-screen online-match" aria-label="Combate en línea">
    <OnlineGameHUD fighters={hud} room={room} localSlot={seat.slot} />
    <div className="online-arena">
      <canvas ref={canvas} aria-label="Arena multijugador" />
      {playing && <div data-gamepad-ignore className="network-touch"><TouchControls inline onAction={(action, down) => {
        if (down) {
          if (action === 'jump' && !actions().has('jump')) jumpSequence.current = sequence.current + 1;
          touch.current.add(action);
        } else touch.current.delete(action);
        sendInput();
      }} /></div>}
      {room.standings && <section className="online-results" aria-label="Posiciones">
        <h2>Posiciones</h2>
        <ol>{room.standings.map(slot => {
          const fighter = PRESIDENTS_DATA.find(d => d.id === hud[slot]?.fighterId);
          return <li key={slot}>J{slot + 1}{fighter ? ` · ${fighter.name}` : ''}</li>;
        })}</ol>
        {room.hostSlot === seat.slot && <button onClick={() => send({ type: 'lobby' })}>Volver a la sala</button>}
      </section>}
    </div>
    <footer><span role="status">{status || `J${seat.slot + 1} · WASD · J/K/L · C: definitiva`}</span><button data-gamepad-back onClick={leave}>Salir</button></footer>
  </section>;

<<<<<<< HEAD
  return <div className="console-modal-overlay" role="dialog" aria-modal="true" aria-label="Salas en línea" onMouseDown={(e) => { if (e.target === e.currentTarget) leave(); }}>
    <section className="console-modal">
      <header className="console-modal-head">
        <div>
          <p className="console-modal-kicker">Multijugador</p>
          <h2>Salas en línea</h2>
        </div>
        <button type="button" className="console-modal-close" onClick={leave} aria-label="Cerrar">×</button>
      </header>

      <div className="console-modal-body">
        <div className="console-field">
          <label htmlFor="room-mode">Modo de sala</label>
          <select id="room-mode" value={capacity} disabled={busy} onChange={e => setCapacity(Number(e.target.value) as RoomCapacity)}>
            <option value={2}>Duelo · 2 jugadores</option>
            <option value={4}>Campal · 4 jugadores</option>
            <option value={6}>Campal · 6 jugadores</option>
            <option value={8}>Gran Campal · 8 jugadores</option>
          </select>
        </div>
        <button type="button" className="console-btn console-btn-primary" disabled={busy} onClick={() => enter.current({ type: 'create', maxPlayers: capacity })}>
          Crear sala
        </button>

        <div className="console-divider"><span>o únete con código</span></div>

        <div className="console-field">
          <label htmlFor="room-code">Código de sala</label>
          <input id="room-code" value={code} maxLength={5} placeholder="ABCDE" autoComplete="off" spellCheck={false}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 5))} />
        </div>
        <button type="button" className="console-btn" disabled={busy || !/^[A-F0-9]{5}$/.test(code)} onClick={() => enter.current({ type: 'join', code })}>
          Entrar a la sala
        </button>

        {(busy || status) && <p className={`console-modal-status ${status && !busy ? 'is-error' : ''}`} role="status">{busy ? 'Conectando…' : status}</p>}
      </div>
    </section>
  </div>;
=======
  return <section data-gamepad-online className="network-panel" aria-label="Salas en línea">
    <div className="network-heading"><strong>Salas en línea</strong><button data-gamepad-back onClick={leave} aria-label="Cerrar">×</button></div>
    <label>Modo <select value={capacity} disabled={busy} onChange={e => setCapacity(Number(e.target.value) as RoomCapacity)}>
      <option value={2}>Duelo · 2</option><option value={4}>Campal · 4</option>
      <option value={6}>Campal · 6</option><option value={8}>Gran Campal · 8</option>
    </select></label>
    <button disabled={busy} onClick={() => enter.current({ type: 'create', maxPlayers: capacity })}>Crear sala</button>
    <label>Código <input value={code} maxLength={10} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
    <button disabled={busy || !/^[A-F0-9]{10}$/.test(code)} onClick={() => enter.current({ type: 'join', code })}>Entrar a la sala</button>
    {(busy || status) && <p role="status">{busy ? 'Conectando…' : status}</p>}
  </section>;
>>>>>>> upstream/main
}
