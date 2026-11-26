import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft, Check, CircleDot, Clock3, Crown, Globe, KeyRound, Lock, MapPin,
  RefreshCw, Settings, Swords, Users, Wifi, WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sound } from '../audio/soundEngine';
import { STAGES_DATA, type RoomCapacity } from '../data/stages';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { useGame } from '../game/GameContext';
import { fetchRoomList, subscribeRoomList, type RoomSummary } from '../network/roomClient';
import { getPlayerName, setPlayerName } from '../network/playerIdentity';

const roomCodePattern = /^(?:[A-F0-9]{5}|[A-F0-9]{10})$/;
const playerColors = ['#fb5969', '#60a5fa', '#facc15', '#4ade80', '#fb923c', '#c084fc', '#22d3ee', '#f3f4f6'];

type RoomMode = 'ffa' | 'champion' | 'tournament';
type Filter = 'all' | 'small' | 'large';

const modes: Array<{ value: RoomMode; label: string; desc: string; icon: typeof Swords }> = [
  { value: 'ffa', label: 'Todos contra todos', desc: 'Cada luchador pelea por su cuenta', icon: Globe },
  { value: 'tournament', label: 'Por equipos', desc: 'Duelos 2v2, 3v3 o 4v4', icon: Users },
  { value: 'champion', label: 'Champion', desc: 'El ganador sigue en la cima', icon: Crown },
];

function modeLabel(room: RoomSummary) {
  if (room.mode === 'tournament') return `${room.teamSize}v${room.teamSize}`;
  if (room.mode === 'champion') return 'Champion';
  return 'Todos contra todos';
}

export function OnlinePage() {
  const g = useGame();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<RoomMode>('ffa');
  const [capacity, setCapacity] = useState<RoomCapacity>(2);
  const [teamSize, setTeamSize] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerNameState] = useState(getPlayerName);
  const [publicRoom, setPublicRoom] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const list = await fetchRoomList(controller.signal);
      if (controller.signal.aborted) return;
      setRooms(list);
      setError('');
    } catch {
      if (!controller.signal.aborted) setError('No se pudo consultar el servidor de salas.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Real-time updates: the server pushes the room list whenever it changes.
  useEffect(() => subscribeRoomList(
    list => { setRooms(list); setError(''); setLoading(false); setLive(true); },
    () => { setLive(false); setLoading(false); setError('No se pudo consultar el servidor de salas.'); },
  ), []);

  // Fallback for servers without the streaming endpoint (or while it reconnects).
  useEffect(() => {
    if (live) return;
    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => window.clearInterval(timer);
  }, [load, live]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !g.onlineActive.current) {
        e.preventDefault();
        sound.uiClick();
        navigate('/combat');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, navigate]);

  // Only joinable rooms: waiting in a lobby and with at least one free slot.
  const availableRooms = useMemo(
    () => rooms.filter(room => !room.playing && room.players < room.maxPlayers),
    [rooms],
  );
  const visibleRooms = useMemo(() => availableRooms.filter(room => {
    if (filter === 'small') return room.maxPlayers <= 4;
    if (filter === 'large') return room.maxPlayers >= 6;
    return true;
  }), [availableRooms, filter]);
  const freeSlots = useMemo(
    () => visibleRooms.reduce((total, room) => total + (room.maxPlayers - room.players), 0),
    [visibleRooms],
  );

  const formats = useMemo(() => mode === 'tournament'
    ? [
      { key: '2v2', capacity: 4 as RoomCapacity, teamSize: 2, label: '2 vs 2' },
      { key: '3v3', capacity: 6 as RoomCapacity, teamSize: 3, label: '3 vs 3' },
      { key: '4v4', capacity: 8 as RoomCapacity, teamSize: 4, label: '4 vs 4' },
    ]
    : [
      { key: '2', capacity: 2 as RoomCapacity, teamSize: 1, label: '2 jugadores' },
      { key: '4', capacity: 4 as RoomCapacity, teamSize: 1, label: '4 jugadores' },
      { key: '6', capacity: 6 as RoomCapacity, teamSize: 1, label: '6 jugadores' },
      { key: '8', capacity: 8 as RoomCapacity, teamSize: 1, label: '8 jugadores' },
    ], [mode]);

  const selectedFormat = formats.find(f => f.capacity === capacity && f.teamSize === teamSize) ?? formats[0];
  const summary = mode === 'tournament'
    ? `Equipos de ${teamSize} · ${capacity} luchadores en total`
    : mode === 'champion'
      ? `${capacity} luchadores · el ganador se queda en la cima`
      : `${capacity} luchadores · todos contra todos`;

  const chooseMode = (next: RoomMode) => {
    sound.uiClick();
    setMode(next);
    if (next === 'tournament') { setCapacity(4); setTeamSize(2); }
    else { setCapacity(2); setTeamSize(1); }
  };

  const createRoom = () => {
    g.requestOnline({
      type: 'create', maxPlayers: selectedFormat.capacity, mode,
      teamSize: selectedFormat.teamSize, stocks: g.config.match.stocks,
      public: publicRoom, name: setPlayerName(playerName),
    });
  };

  const join = (code: string) => {
    if (!roomCodePattern.test(code)) return;
    g.requestOnline({ type: 'join', code });
  };

  return (
    <div
      data-gamepad-online
      className="apex-menu apex-title online-browser absolute inset-0 z-20"
      style={{ '--apex-cover': `url("${stageArtUrl('narino', 'night')}")` } as CSSProperties}
      aria-label="Salas online"
    >
      <div className="online-browser-inner">
        <header className="online-browser-head">
          <div className="online-browser-heading">
            <button type="button" data-gamepad-back className="online-browser-back" onClick={() => { sound.uiClick(); navigate('/combat'); }}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <p className="console-modal-kicker">Multijugador en línea</p>
            <h1 className="console-game-title">Salas <span>online</span></h1>
            <p className="console-tagline">Entra en una partida o crea tu propia sala y comparte el código.</p>
          </div>
          <div className="online-browser-head-actions">
            <label className="online-name-field" htmlFor="online-player-name">
              <span>Tu nombre</span>
              <input id="online-player-name" value={playerName} maxLength={18} placeholder="Jugador" autoComplete="nickname"
                onChange={e => setPlayerNameState(e.target.value)} onBlur={() => setPlayerNameState(setPlayerName(playerName))} />
            </label>
            <span className={`online-server-state ${error ? 'is-offline' : ''}`}>
              {error ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              {error ? 'Servidor no disponible' : loading ? 'Conectando…' : live ? 'Actualización en vivo' : 'Servidor conectado'}
            </span>
            <button type="button" className="console-btn" onClick={() => { sound.uiClick(); g.setConfigOpen(true); }}>
              <Settings className="h-4 w-4" /> Ajustes
            </button>
            <button type="button" className="console-btn" onClick={() => { sound.uiClick(); void load(); }}>
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
          </div>
        </header>

        <div className="online-browser-grid">
          <section className="online-panel online-browser-rooms" aria-label="Salas disponibles">
            <div className="online-panel-head">
              <div>
                <p className="online-panel-kicker">Explorar</p>
                <h2><Users className="h-4 w-4" /> Salas disponibles</h2>
              </div>
              <span className="online-count">{visibleRooms.length} {visibleRooms.length === 1 ? 'SALA LIBRE' : 'SALAS LIBRES'}</span>
            </div>
            <div className="online-panel-body">
              <div className="online-room-filters" role="group" aria-label="Filtrar salas">
                {([
                  { value: 'all', label: 'Todas' },
                  { value: 'small', label: '2-4 jugadores' },
                  { value: 'large', label: '6-8 jugadores' },
                ] as Array<{ value: Filter; label: string }>).map(option => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filter === option.value}
                    className="online-filter"
                    onClick={() => { sound.uiClick(); setFilter(option.value); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="online-room-summary">
                <Users className="h-3.5 w-3.5" />
                <span>
                  <strong>{freeSlots}</strong> {freeSlots === 1 ? 'plaza libre' : 'plazas libres'} en{' '}
                  <strong>{visibleRooms.length}</strong> {visibleRooms.length === 1 ? 'sala disponible' : 'salas disponibles'}
                </span>
              </div>

              <div className="online-room-list">
                {loading && <div className="online-empty"><RefreshCw className="h-6 w-6" /><strong>Cargando salas…</strong></div>}
                {!loading && visibleRooms.length === 0 && (
                  <div className="online-empty">
                    <Globe className="h-7 w-7" />
                    <strong>{error ? 'Sin conexión con el servidor' : 'No hay salas disponibles'}</strong>
                    <p>{error ? 'Inicia el servidor de salas para ver las partidas abiertas.' : 'No hay salas con huecos ahora mismo. Crea una desde la derecha o entra con un código.'}</p>
                  </div>
                )}
                {!loading && visibleRooms.map(room => (
                  <button key={room.code} type="button" className="online-room-card" onClick={() => join(room.code)}>
                    <span className="online-room-card-top">
                      <span className="online-room-code">{room.code}</span>
                      <span className={`online-room-badge ${room.playing ? 'is-live' : 'is-open'}`}>
                        {room.playing ? <CircleDot className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {room.playing ? 'En curso' : 'Disponible'}
                      </span>
                    </span>
                    <span className="online-room-meta">
                      <span><Users className="h-3.5 w-3.5" /> {room.connected}/{room.maxPlayers} jugadores</span>
                      <span className="online-free-count"><Check className="h-3.5 w-3.5" /> {room.maxPlayers - room.players} libres</span>
                      <span>{room.stocks} vidas</span>
                      <span><Swords className="h-3.5 w-3.5" /> {modeLabel(room)}</span>
                      <span><MapPin className="h-3.5 w-3.5" /> {STAGES_DATA[room.stage]?.name ?? 'Escenario'}</span>
                    </span>
                    <span className="online-room-players">
                      {Array.from({ length: room.maxPlayers }, (_, i) => (
                        <span
                          key={i}
                          className={`online-player-dot ${i < room.players ? 'is-on' : ''}`}
                          style={{ '--pc': playerColors[i % playerColors.length] } as CSSProperties}
                        />
                      ))}
                      <span className="online-room-enter">Entrar <ArrowLeft className="h-3.5 w-3.5 rotate-180" /></span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="online-join-row">
                <label className="room-code-field" htmlFor="online-join-code">
                  <span className="room-code-label">¿Tienes un código? Entra igual</span>
                  <div className="room-code-input-wrap">
                    <KeyRound className="h-4 w-4" aria-hidden />
                    <input
                      id="online-join-code"
                      value={joinCode}
                      maxLength={10}
                      placeholder="ABCDE"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 10))}
                      onKeyDown={e => { if (e.key === 'Enter') join(joinCode); }}
                    />
                  </div>
                </label>
                <button type="button" className="console-btn" disabled={!roomCodePattern.test(joinCode)} onClick={() => join(joinCode)}>
                  Entrar
                </button>
              </div>
            </div>
          </section>

          <section className="online-panel online-browser-create" aria-label="Crear sala">
            <div className="online-panel-head">
              <div>
                <p className="online-panel-kicker">Nueva partida</p>
                <h2><Swords className="h-4 w-4" /> Crear una sala</h2>
              </div>
              <span className="online-count">Anfitrión</span>
            </div>
            <div className="online-panel-body">
              <span className="room-modal-section-kicker"><Swords className="h-3.5 w-3.5" /> Modo de juego</span>
              <div className="online-mode-list" role="radiogroup" aria-label="Modo de juego">
                {modes.map(option => {
                  const Icon = option.icon;
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`room-mode-card online-mode-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => chooseMode(option.value)}
                    >
                      <span className="room-mode-icon" aria-hidden><Icon className="h-4 w-4" /></span>
                      <span className="room-mode-text"><strong>{option.label}</strong><small>{option.desc}</small></span>
                      <span className="room-mode-check" aria-hidden>{selected ? '●' : '○'}</span>
                    </button>
                  );
                })}
              </div>

              <span className="room-modal-section-kicker" style={{ marginTop: 4 }}>
                <Users className="h-3.5 w-3.5" /> {mode === 'tournament' ? 'Formato de equipos' : 'Jugadores'}
              </span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={mode === 'tournament' ? 'Formato de equipos' : 'Cantidad de jugadores'}>
                {formats.map(option => {
                  const selected = selectedFormat.key === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`console-btn ${selected ? 'console-btn-primary' : ''}`}
                      onClick={() => { sound.uiClick(); setCapacity(option.capacity); setTeamSize(option.teamSize); }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <span className="room-modal-section-kicker"><Globe className="h-3.5 w-3.5" />Visibilidad</span>
                <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }} role="radiogroup" aria-label="Visibilidad de la sala">
                  <button type="button" role="radio" aria-checked={publicRoom} className={`console-btn ${publicRoom ? 'console-btn-primary' : ''}`} onClick={() => { sound.uiClick(); setPublicRoom(true); }}>
                    <Globe className="h-4 w-4" />Pública
                  </button>
                  <button type="button" role="radio" aria-checked={!publicRoom} className={`console-btn ${!publicRoom ? 'console-btn-primary' : ''}`} onClick={() => { sound.uiClick(); setPublicRoom(false); }}>
                    <Lock className="h-4 w-4" />Privada
                  </button>
                </div>
              </div>

              <div className="online-create-summary"><Check className="h-4 w-4" /> {summary}</div>

              <p className="online-tip"><Wifi className="h-3.5 w-3.5" /> Comparte el código de la sala con tus amigos. Podrás cambiar el escenario desde la sala de espera.</p>
            </div>
            <div className="online-create-footer">
              <button type="button" data-gamepad-initial className="console-btn console-btn-primary online-create-submit" onClick={createRoom}>
                <Swords className="h-4 w-4" /> Crear sala
              </button>
            </div>
          </section>
        </div>

        <div className="console-hints" aria-hidden>
          <span>←→ Navegar</span><span>Enter Seleccionar</span><span>Esc Volver</span>
        </div>
      </div>
    </div>
  );
}
