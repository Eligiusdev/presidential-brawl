import { ArrowLeft, Check, Copy, Crown, Globe, Play, Users, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { sound } from '../audio/soundEngine';
import { FIGHTER_SPLASH_ART } from '../data/fighterSplashes';
import { STAGES_DATA } from '../data/stages';
import { NetRoomState, PresidentData, PresidentRegion } from '../types/game';
import { FighterSilhouetteCanvas } from './FighterSilhouetteCanvas';
import { PortraitCanvas } from './PortraitCanvas';

type RegionFilter = 'all' | PresidentRegion;

const REGION_TABS: Array<{ id: RegionFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'latam', label: 'Latam' },
  { id: 'na', label: 'Norteamérica' },
  { id: 'eu', label: 'Europa' },
  { id: 'af_as', label: 'África/Asia' },
  { id: 'mythic', label: 'Míticos' },
  { id: 'custom', label: 'Propios' },
];

interface OnlineLobbyProps {
  roster: PresidentData[];
  room: NetRoomState | null;
  slot: 0 | 1 | null;
  pingMs: number | null;
  errorMsg: string | null;
  initialRoomCode?: string;
  defaultFighterIdx: number;
  defaultStageIdx: number;
  defaultStocks: number;
  onCreateRoom: (playerName: string, fighter: PresidentData, stageIdx: number, stocks: number) => void;
  onJoinRoom: (code: string, playerName: string, fighter: PresidentData) => void;
  onUpdateLobby: (opts: { fighter?: PresidentData; stageIdx?: number; stocks?: number; ready?: boolean }) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onBack: () => void;
}

export function OnlineLobby({
  roster,
  room,
  slot,
  pingMs,
  errorMsg,
  initialRoomCode = '',
  defaultFighterIdx,
  defaultStageIdx,
  defaultStocks,
  onCreateRoom,
  onJoinRoom,
  onUpdateLobby,
  onStartMatch,
  onLeaveRoom,
  onBack,
}: OnlineLobbyProps) {
  const [playerName, setPlayerName] = useState<string>(() => (initialRoomCode ? 'Presidente 2' : 'Presidente 1'));
  const [joinCode, setJoinCode] = useState<string>(initialRoomCode);
  const [localFighterIdx, setLocalFighterIdx] = useState<number>(defaultFighterIdx);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialRoomCode) setJoinCode(initialRoomCode.toUpperCase());
  }, [initialRoomCode]);

  const myFighter = roster[localFighterIdx] || roster[0];
  const me = room && slot !== null ? room.players[slot] : null;
  const isHost = Boolean(room && slot !== null && room.hostSlot === slot);
  const p1 = room?.players[0] ?? null;
  const p2 = room?.players[1] ?? null;
  const bothPresent = Boolean(p1 && p2);
  const bothReady = Boolean(p1 && p2 && (room?.hostSlot === 0 ? p2.ready : p1.ready));

  const filteredRoster = useMemo(() => {
    const mapped = roster.map((d, idx) => ({ d, idx }));
    if (regionFilter === 'all') return mapped;
    if (regionFilter === 'custom') return mapped.filter(({ d }) => Boolean(d.isCustom));
    return mapped.filter(({ d }) => !d.isCustom && d.region === regionFilter);
  }, [roster, regionFilter]);

  const resolveSlotFighter = (p: NetRoomState['players'][0]): PresidentData => {
    if (!p) return roster[0];
    if (p.customFighter) return p.customFighter;
    return roster.find((r) => r.id === p.fighterId) || roster[0];
  };

  const handleCopyInvite = async () => {
    if (!room) return;
    sound.uiClick();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#090f1f]/96 p-4 sm:p-6 overflow-y-auto arcade-scroll">
      {/* Header */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-[#222d4a] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.uiClick();
              if (room) onLeaveRoom();
              else onBack();
            }}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-[#2a344d] bg-[#131929] px-3 text-xs font-semibold text-[#cbd5e1] hover:text-white whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {room ? 'Salir de Sala' : 'Inicio'}
          </button>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#38bdf8]" />
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-2xl">
              Multijugador Online (2 PCs)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pingMs !== null && (
            <div className="flex items-center gap-1.5 rounded-md border border-[#233352] bg-[#0f172b] px-2.5 py-1.5 font-mono-num text-xs text-[#7dd3fc]">
              <Wifi className="h-3.5 w-3.5 text-[#34d399]" />
              {pingMs} ms
            </div>
          )}
          {room && (
            <div className="rounded-md border border-[#ffcc33]/60 bg-[#1c1a17] px-3 py-1.5 font-mono-num text-xs font-bold tracking-widest text-[#ffcc33]">
              SALA: {room.roomCode}
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mx-auto mt-3 w-full max-w-6xl rounded-lg border border-[#ef4444]/60 bg-[#2b1218] px-4 py-2.5 text-xs font-semibold text-[#fecaca]">
          {errorMsg}
        </div>
      )}

      {!room ? (
        /* Create or Join Screen */
        <div className="mx-auto my-auto grid w-full max-w-4xl grid-cols-1 gap-5 py-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl border border-[#283659] bg-[#10182e] p-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffcc33]">
                <Crown className="h-4 w-4" />
                Anfitrión
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-white">Crear Nueva Sala</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">
                Genera un código de sala y comparte el enlace con otro jugador en otra computadora para combatir en tiempo real.
              </p>

              <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-[#cbd5e1]">
                Tu Nombre
              </label>
              <input
                type="text"
                maxLength={18}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej. Simón Bolívar"
                className="mt-1.5 w-full rounded-lg border border-[#2c3a5e] bg-[#0b1121] px-3 py-2 text-sm font-semibold text-white focus:border-[#ffcc33] focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                sound.uiConfirm();
                onCreateRoom(playerName.trim() || 'Jugador 1', myFighter, defaultStageIdx, defaultStocks);
              }}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#ffcc33] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#0b0e17] hover:bg-[#ffd95e]"
            >
              <Play className="h-4 w-4 fill-current" />
              Crear Sala Online
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#283659] bg-[#10182e] p-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
                <Users className="h-4 w-4" />
                Invitado
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-white">Unirse con Código</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">
                Ingresa el código de 5 letras que creó tu rival o abre directamente el enlace de invitación compartido.
              </p>

              <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-[#cbd5e1]">
                Tu Nombre
              </label>
              <input
                type="text"
                maxLength={18}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej. Doctora Pulso"
                className="mt-1.5 w-full rounded-lg border border-[#2c3a5e] bg-[#0b1121] px-3 py-2 text-sm font-semibold text-white focus:border-[#38bdf8] focus:outline-none"
              />

              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-[#cbd5e1]">
                Código de Sala
              </label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="EJ: AB7K2"
                className="mt-1.5 w-full rounded-lg border border-[#2c3a5e] bg-[#0b1121] px-3 py-2 font-mono-num text-base font-bold uppercase tracking-widest text-[#38bdf8] focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <button
              disabled={joinCode.trim().length < 4}
              onClick={() => {
                sound.uiConfirm();
                onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim() || 'Jugador 2', myFighter);
              }}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-[#38bdf8] bg-[#12263e] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white hover:bg-[#193556] disabled:opacity-40"
            >
              Unirse a Sala
            </button>
          </div>
        </div>
      ) : (
        /* Active Room Lobby */
        <div className="mx-auto my-4 flex w-full max-w-6xl flex-1 flex-col gap-4">
          {/* Invite Banner + Player Slots */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* P1 Slot */}
            <div className="lg:col-span-4 rounded-xl border border-[#ffcc33]/50 bg-[#12192f] p-3.5">
              {p1 ? (
                <SlotCard
                  slot={0}
                  player={p1}
                  fighter={resolveSlotFighter(p1)}
                  isMe={slot === 0}
                  isHost={room.hostSlot === 0}
                />
              ) : (
                <div className="flex h-20 items-center justify-center text-xs text-[#64748b]">Esperando J1...</div>
              )}
            </div>

            {/* Invite Center Card */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-[#29375a] bg-[#0d1426] p-3 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Comparte esta sala con otro PC
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-[#33446d] bg-[#141d36] px-4 py-1.5 font-mono-num text-xl font-bold tracking-[0.22em] text-[#ffcc33]">
                  {room.roomCode}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1.5 rounded-md border border-[#38bdf8]/50 bg-[#112238] px-3 py-2 text-xs font-bold text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '¡Copiado!' : 'Copiar Link'}
                </button>
              </div>
            </div>

            {/* P2 Slot */}
            <div className="lg:col-span-4 rounded-xl border border-[#38bdf8]/50 bg-[#12192f] p-3.5">
              {p2 ? (
                <SlotCard
                  slot={1}
                  player={p2}
                  fighter={resolveSlotFighter(p2)}
                  isMe={slot === 1}
                  isHost={room.hostSlot === 1}
                />
              ) : (
                <div className="flex h-20 flex-col items-center justify-center text-center">
                  <span className="font-display text-sm font-bold text-[#7dd3fc]">Esperando Jugador 2...</span>
                  <span className="mt-1 text-[11px] text-[#94a3b8]">Envía el link o código {room.roomCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fighter Selection & Stage Settings */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1">
            <div className="lg:col-span-8 flex flex-col justify-between gap-3 rounded-xl border border-[#243150] bg-[#0f1629] p-3.5 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                  Elige tu Combatiente ({myFighter.name})
                </span>
                <div className="flex flex-wrap gap-1">
                  {REGION_TABS.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => {
                        sound.uiClick();
                        setRegionFilter(rt.id);
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        regionFilter === rt.id
                          ? 'border-[#ffcc33] bg-[#211f1b] text-[#ffcc33]'
                          : 'border-[#222b42] bg-[#101524] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Fighter Splash & Moveset Strip */}
              <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-lg border border-white/10 bg-[#0a1020] px-4 py-3 min-h-[104px]">
                {FIGHTER_SPLASH_ART[myFighter.id] && (
                  <img
                    src={FIGHTER_SPLASH_ART[myFighter.id]}
                    alt={myFighter.name}
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080d1b] via-[#080d1b]/75 to-transparent" />
                <div className="relative z-10 flex items-center gap-3 min-w-0">
                  <div className="overflow-hidden rounded-md border border-white/20 shrink-0">
                    <PortraitCanvas president={myFighter} className="h-14 w-14" animate />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-white leading-tight truncate">{myFighter.name}</div>
                    <div className="text-[11px] text-[#94a3b8] truncate">
                      {myFighter.title} · {myFighter.role}
                    </div>
                    {myFighter.movesetInfo && (
                      <div className="mt-1 text-[10px] text-[#cbd5e1] truncate">
                        J: {myFighter.movesetInfo.neutralName} · K: {myFighter.movesetInfo.specialNeutralName} · S+K: {myFighter.movesetInfo.specialDownName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Angled Kinetic Fighter Ribbon */}
              <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 arcade-scroll">
                {filteredRoster.map(({ d, idx }) => {
                  const selected = me?.fighterId === d.id || (!me && localFighterIdx === idx);
                  const cardSplash = FIGHTER_SPLASH_ART[d.id];
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        sound.uiClick();
                        setLocalFighterIdx(idx);
                        onUpdateLobby({ fighter: d, ready: false });
                      }}
                      className={`group relative flex shrink-0 -skew-x-6 items-center gap-2 overflow-hidden rounded-md border px-2.5 py-1.5 text-left transition-transform duration-150 ${
                        selected
                          ? 'border-[#ffcc33] bg-[#242117] -translate-y-1'
                          : 'border-white/10 bg-[#11182c] hover:border-white/40 hover:-translate-y-0.5'
                      }`}
                    >
                      {cardSplash && (
                        <img
                          src={cardSplash}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 group-hover:opacity-45"
                        />
                      )}
                      <span className="pointer-events-none absolute -right-1 bottom-0 skew-x-6 opacity-70 group-hover:opacity-100">
                        <FighterSilhouetteCanvas president={d} className="h-12 w-12" />
                      </span>
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1020]/90 via-[#0a1020]/65 to-transparent" />
                      <span className="relative z-10 skew-x-6 flex items-center gap-2 pr-5">
                        <span className="overflow-hidden rounded border border-white/15 shrink-0">
                          <PortraitCanvas president={d} className="h-10 w-10" animate={selected} />
                        </span>
                        <span className="w-[78px] truncate font-display text-[11px] font-bold text-white">{d.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage + Stocks (Host controlled, guest sees live selection) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-3 rounded-xl border border-[#243150] bg-[#0f1629] p-3.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                    Palacio Presidencial
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#94a3b8]">Vidas:</span>
                    {[2, 3, 4, 5].map((st) => (
                      <button
                        key={st}
                        disabled={!isHost}
                        onClick={() => {
                          sound.uiClick();
                          onUpdateLobby({ stocks: st });
                        }}
                        className={`h-6 w-6 rounded border font-mono-num text-[11px] font-bold ${
                          room.stocks === st
                            ? 'border-[#ffcc33] bg-[#25221b] text-[#ffcc33]'
                            : 'border-[#26314d] bg-[#141c31] text-[#94a3b8]'
                        } disabled:opacity-60`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-[168px] overflow-y-auto pr-1 arcade-scroll">
                  {STAGES_DATA.map((st, idx) => (
                    <button
                      key={st.id}
                      disabled={!isHost}
                      onClick={() => {
                        sound.uiClick();
                        onUpdateLobby({ stageIdx: idx });
                      }}
                      className={`rounded border px-2 py-1 text-left ${
                        room.stageIdx === idx
                          ? 'border-[#ffcc33] bg-[#1f2845] text-white'
                          : 'border-[#232e4d] bg-[#141c32] text-[#94a3b8]'
                      } disabled:opacity-75`}
                    >
                      <div className="truncate font-display text-[10px] font-bold">{st.name}</div>
                      <div className="truncate text-[9px] opacity-75">{st.country}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-[#1f2945] pt-3">
                {!isHost && (
                  <button
                    onClick={() => {
                      sound.uiConfirm();
                      onUpdateLobby({ ready: !me?.ready });
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg font-display text-sm font-bold uppercase tracking-wider ${
                      me?.ready
                        ? 'border border-[#34d399] bg-[#0e2f26] text-[#a7f3d0]'
                        : 'bg-[#38bdf8] text-[#091020] hover:bg-[#60ccf9]'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {me?.ready ? '¡Listo! (Esperando Anfitrión)' : 'Marcar como Listo'}
                  </button>
                )}

                {isHost && (
                  <button
                    disabled={!bothPresent || !bothReady}
                    onClick={() => {
                      sound.uiConfirm();
                      onStartMatch();
                    }}
                    className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#ffcc33] font-display text-sm font-bold uppercase tracking-wider text-[#0b0e17] hover:bg-[#ffd95e] disabled:opacity-40"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {!bothPresent
                      ? 'Esperando Jugador 2'
                      : !bothReady
                        ? 'Esperando que J2 esté Listo'
                        : '¡Iniciar Combate Online!'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  player,
  fighter,
  isMe,
  isHost,
}: {
  slot: 0 | 1;
  player: NonNullable<NetRoomState['players'][0]>;
  fighter: PresidentData;
  isMe: boolean;
  isHost: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="overflow-hidden rounded-lg border border-[#2c3752] shrink-0">
          <PortraitCanvas president={fighter} className="h-14 w-14" animate />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className={slot === 0 ? 'text-[#ffcc33]' : 'text-[#38bdf8]'}>
              J{slot + 1} {isMe ? '(Tú)' : ''}
            </span>
            {isHost && <span className="text-[#ffd23f]">· Anfitrión</span>}
          </div>
          <div className="truncate font-display text-base font-bold text-white">{player.name}</div>
          <div className="truncate text-xs text-[#94a3b8]">{fighter.name}</div>
        </div>
      </div>

      <div
        className={`rounded-md border px-2.5 py-1 font-display text-[11px] font-bold uppercase ${
          isHost
            ? 'border-[#ffcc33]/50 bg-[#252116] text-[#ffcc33]'
            : player.ready
              ? 'border-[#34d399]/60 bg-[#0d2e24] text-[#6ee7b7]'
              : 'border-[#334155] bg-[#161e2e] text-[#94a3b8]'
        }`}
      >
        {isHost ? 'HOST' : player.ready ? 'LISTO' : 'ELIGIENDO'}
      </div>
    </div>
  );
}
