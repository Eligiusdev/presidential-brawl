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

export function NetworkPanel({ config, hideLaunch, onActive }: {
  config: GameConfig; hideLaunch: boolean; onActive: (active: boolean) => void;
}) {
  const invited = new URLSearchParams(location.search).get('room') ?? '';
  const [open, setOpen] = useState(Boolean(invited));
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

  if (!open) return hideLaunch ? null : <button className="network-launch" onClick={() => setOpen(true)}>Jugar en línea</button>;
  if (room && seat && !room.playing) return <>
    <OnlineLobby room={room} slot={seat.slot} send={send} leave={leave} />
    {status && <p className="online-status" role="status">{status}</p>}
  </>;
  if (room && seat) return <section className="online-screen online-match" aria-label="Combate en línea">
    <OnlineGameHUD fighters={hud} room={room} localSlot={seat.slot} />
    <div className="online-arena">
      <canvas ref={canvas} aria-label="Arena multijugador" />
      {playing && <div className="network-touch"><TouchControls inline onAction={(action, down) => {
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
    <footer><span role="status">{status || `J${seat.slot + 1} · WASD · J/K/L · C: definitiva`}</span><button onClick={leave}>Salir</button></footer>
  </section>;

  return <section className="network-panel" aria-label="Salas en línea">
    <div className="network-heading"><strong>Salas en línea</strong><button onClick={leave} aria-label="Cerrar">×</button></div>
    <label>Modo <select value={capacity} disabled={busy} onChange={e => setCapacity(Number(e.target.value) as RoomCapacity)}>
      <option value={2}>Duelo · 2</option><option value={4}>Campal · 4</option>
      <option value={6}>Campal · 6</option><option value={8}>Gran Campal · 8</option>
    </select></label>
    <button disabled={busy} onClick={() => enter.current({ type: 'create', maxPlayers: capacity })}>Crear sala</button>
    <label>Código <input value={code} maxLength={10} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
    <button disabled={busy || !/^[A-F0-9]{10}$/.test(code)} onClick={() => enter.current({ type: 'join', code })}>Entrar a la sala</button>
    {(busy || status) && <p role="status">{busy ? 'Conectando…' : status}</p>}
  </section>;
}
