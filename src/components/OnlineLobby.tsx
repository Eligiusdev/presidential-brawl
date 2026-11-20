import { useMemo, useRef, useState } from 'react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { fighterArtPath } from '../engine/fighterSprites';
import type { RoomState } from '../network/matchState';
import type { PresidentData, PresidentRegion } from '../types/game';
import { FighterPreviewCard } from './CharacterSelect';
import { FighterPreview } from './FighterPreview';
import { SelectionRail } from './SelectionRail';

type RegionFilter = 'all' | PresidentRegion | 'current' | 'former' | 'mythic';

const REGION_TABS: Array<{ id: RegionFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'current', label: 'Presidentes actuales' },
  { id: 'former', label: 'Expresidentes recientes' },
  { id: 'mythic', label: 'Míticos' },
  { id: 'latam', label: 'Latinoamérica' },
  { id: 'na', label: 'Norteamérica' },
  { id: 'eu', label: 'Europa' },
  { id: 'af_as', label: 'África y Asia' },
];

function matchesFilter(fighter: PresidentData, filter: RegionFilter) {
  if (filter === 'all') return true;
  if (fighter.isCustom) return false;
  if (filter === 'current' || filter === 'former' || filter === 'mythic') return fighter.rosterGroup === filter;
  return fighter.rosterGroup !== 'mythic' && fighter.region === filter;
}

function PlayerCard({ slot, player, you, host }: {
  slot: number; player: RoomState['players'][number]; you: boolean; host: boolean;
}) {
  const fighter = PRESIDENTS_DATA.find(f => f.id === player?.fighterId) || null;
  const accent = player?.color || '#425675';
  const status = !player ? 'Puesto libre' : !player.connected ? 'Reconectando…' : player.ready ? 'Listo' : player.fighterId ? 'Eligiendo' : 'Sin personaje';
  return <article className="online-player-card" style={{ borderColor: accent }}>
    <header className="online-player-card-head">
      <strong style={{ color: accent }}>J{slot + 1}{host ? ' · Anfitrión' : ''}{you ? ' · Tú' : ''}</strong>
      <small>{status}{player?.connected ? ` · ${player.ping} ms` : ''}</small>
    </header>
    {fighter ? <div className="online-player-pick">
      <FighterPreview president={fighter} selected />
      <div>
        <div className="font-display font-bold text-white truncate">{fighter.name}</div>
        <div className="text-xs text-[#94a3b8] truncate">{fighter.title}</div>
      </div>
    </div> : <div className="online-player-empty">{player ? 'Selecciona un luchador…' : 'Esperando jugador…'}</div>}
  </article>;
}

export function OnlineLobby({ room, slot, send, leave }: {
  room: RoomState; slot: number; send: (message: object) => void; leave: () => void;
}) {
  const linkField = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<RegionFilter>('all');
  const self = room.players[slot];
  const host = room.hostSlot === slot;
  const allReady = room.players.every(p => p?.ready && p.connected);
  const url = new URL(location.href);
  url.searchParams.set('room', room.code);

  const myFighter = PRESIDENTS_DATA.find(f => f.id === self?.fighterId) || PRESIDENTS_DATA[0];
  const artPath = fighterArtPath(myFighter);

  const filteredRoster = useMemo(() => {
    const mapped = PRESIDENTS_DATA.map((d, idx) => ({ d, idx }));
    const filtered = mapped.filter(({ d }) => matchesFilter(d, filter));
    if (filter === 'current' || filter === 'former') filtered.sort((a, b) => (b.d.termStart ?? 0) - (a.d.termStart ?? 0));
    return filtered;
  }, [filter]);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw Error();
      await navigator.clipboard.writeText(url.href);
    } catch { linkField.current?.select(); }
  };

  const pick = (fighterId: string) => {
    sound.uiClick();
    send({ type: 'select', fighterId });
  };

  return <section className="apex-menu apex-selector online-screen online-lobby" aria-label="Selección en línea">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#222d4a]">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-2xl">
          {room.maxPlayers === 2 ? 'Duelo' : room.maxPlayers === 8 ? 'Gran Campal' : 'Campal'} en línea
        </h2>
        <span className="rounded border border-[#2f3b57] bg-[#161e31] px-2 py-1 text-xs text-[#cbd5e1]">Sala {room.code} · J{slot + 1}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={linkField} readOnly aria-label="Enlace de invitación" value={url.href}
          onFocus={e => e.target.select()} className="online-invite-input" />
        <button onClick={() => void copy()}>Copiar invitación</button>
        <button onClick={leave}>Salir</button>
      </div>
    </div>

    {artPath && self?.fighterId && <section aria-label={'Vista de ' + myFighter.name} className="fighter-showcase mx-auto mt-3 w-full max-w-6xl"
      style={{ backgroundImage: `url("${artPath}selection.webp")` }}>
      <FighterPreview president={myFighter} selected large />
      <div className="fighter-showcase-caption">
        <span>Tu personaje</span>
        <h3>{myFighter.name}</h3>
        <p>{myFighter.title}</p>
      </div>
    </section>}

    <div className="selector-layout mx-auto my-3 grid w-full max-w-6xl flex-1 gap-3">
      <div className="selector-side flex flex-col gap-3">
        <FighterPreviewCard
          slot={0}
          label={`J${slot + 1} · Tú${host ? ' · Anfitrión' : ''}`}
          president={myFighter}
          isActive
          onFocus={() => {}}
          onCustomize={() => {}}
          readonly
        />
        <button disabled={!self?.fighterId}
          onClick={() => { sound.uiClick(); send({ type: 'ready', ready: !self?.ready }); }}
          className={`min-h-[44px] rounded-lg border px-4 py-2 font-display text-xs font-bold uppercase tracking-wide ${self?.ready ? 'border-[#4ade80] bg-[#143226] text-[#bbf7d0]' : 'border-[#ffcc33]/60 bg-[#1f1926] text-[#ffd27a]'}`}>
          {self?.ready ? 'Listo ✓ (cambiar)' : 'Estoy listo'}
        </button>
      </div>

      <div className="selector-center flex min-w-0 flex-col gap-3">
        <div className="selector-filters flex items-center gap-1.5">
          {REGION_TABS.map(rt => {
            const count = PRESIDENTS_DATA.filter(f => matchesFilter(f, rt.id)).length;
            return <button key={rt.id} onClick={() => { sound.uiClick(); setFilter(rt.id); }}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${filter === rt.id ? 'border-[#ffcc33] bg-[#211f1b] text-[#ffcc33]' : 'border-[#222b42] bg-[#101524] text-[#94a3b8] hover:text-white'}`}>
              {rt.label} <span className="font-mono-num opacity-75">({count})</span>
            </button>;
          })}
        </div>

        <SelectionRail label="Luchadores" variant="fighters" resetKey={filter}>
          {filteredRoster.map(({ d }) => {
            const pickers = room.players
              .map((p, i) => p?.fighterId === d.id ? { slot: i, color: p.color, ready: p.ready, me: i === slot } : null)
              .filter((x): x is { slot: number; color: string; ready: boolean; me: boolean } => Boolean(x));
            const mine = pickers.some(p => p.me);
            const border = mine ? '#ffcc33' : pickers[0]?.color;
            return <div key={d.id} role="button" tabIndex={0} aria-pressed={mine}
              onClick={() => pick(d.id)}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); pick(d.id); } }}
              className={`group relative flex cursor-pointer flex-col items-center rounded-lg border p-2.5 text-center transition-all ${pickers.length ? 'bg-[#1a2238]' : 'border-[#25304d] bg-[#11182c] hover:border-[#4b5f94]'}`}
              style={border ? { borderColor: border, boxShadow: `0 0 14px ${border}33` } : undefined}>
              <div className="mb-2 overflow-hidden rounded border border-[#2a344d]">
                <FighterPreview president={d} selected={pickers.length > 0} />
              </div>
              <div className="font-display text-xs font-bold text-white leading-tight truncate w-full">{d.name}</div>
              <div className="mt-0.5 text-[10px] text-[#94a3b8] truncate w-full">{d.role}</div>
              {pickers.length > 0 && <div className="mt-1 flex flex-wrap justify-center gap-1">
                {pickers.map(p => <span key={p.slot} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: p.color, background: `${p.color}22`, border: `1px solid ${p.color}66` }}>
                  J{p.slot + 1}{p.me ? '·Tú' : ''}{p.ready ? ' ✓' : ''}
                </span>)}
              </div>}
            </div>;
          })}
        </SelectionRail>

        <div>
          <SelectionRail label="Escenarios" variant="stages">
            {STAGES_DATA.map((st, idx) => <button key={st.id} aria-pressed={room.stage === idx}
              disabled={!host}
              onClick={() => { if (!host) return; sound.uiClick(); send({ type: 'stage', stage: idx }); }}
              className={`rounded-md border px-2 py-1.5 text-left transition-all ${room.stage === idx ? 'border-[#ffcc33] bg-[#1f2845] text-white shadow-[0_0_12px_rgba(255,204,51,0.2)]' : 'border-[#232e4d] bg-[#141c32] text-[#94a3b8] hover:border-[#3c4d7a] hover:text-white'} ${!host ? 'opacity-80 cursor-default' : ''}`}>
              <img src={stageArtUrl(st.id, 'day')} className="mb-1 aspect-video w-full rounded object-cover" alt="" loading="lazy" />
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-[2px] border border-[#1a223a]" style={{ backgroundColor: st.palette.platformTrim }} />
                <span className="font-display text-[11px] font-bold truncate">{st.name}</span>
              </div>
              <div className="text-[10px] opacity-75 truncate pl-3.5">{st.city} · {st.country}</div>
            </button>)}
          </SelectionRail>
          <p className="mt-2 text-xs text-[#b3bfd5]">
            {host ? 'Elige el escenario de la sala. ' : 'El anfitrión elige el escenario. '}
            {STAGES_DATA[room.stage]?.hazardMsg}
          </p>
        </div>
      </div>

      <div className="selector-side online-opponents flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c1]">Jugadores en sala (tiempo real)</div>
        <div className="online-opponents-list flex flex-col gap-2 overflow-auto pr-1">
          {room.players.map((p, i) => <PlayerCard key={i} slot={i} player={p} you={i === slot} host={room.hostSlot === i} />)}
        </div>
      </div>
    </div>

    <div className="selector-launch mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 pt-2">
      <div className="text-sm text-[#b3bfd5]" role="status">
        {allReady ? 'Todos listos.' : 'Elige personaje y pulsa “Estoy listo”.'} {host ? 'Puedes iniciar cuando todos estén listos.' : 'Esperando al anfitrión.'}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button disabled={!self?.fighterId}
          onClick={() => { sound.uiClick(); send({ type: 'ready', ready: !self?.ready }); }}>
          {self?.ready ? 'Cambiar disponibilidad' : 'Estoy listo'}
        </button>
        {host && <button disabled={!allReady}
          onClick={() => { sound.uiConfirm(); send({ type: 'start' }); }}
          className="flex min-h-[46px] items-center gap-2.5 rounded-lg bg-[#ffcc33] px-8 py-2.5 font-display text-base font-bold uppercase tracking-wider text-[#0b0e17] transition-transform active:scale-[0.98] hover:bg-[#ffd95e] disabled:opacity-45">
          ¡Pelear!
        </button>}
      </div>
    </div>
  </section>;
}
