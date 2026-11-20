import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Crown, Swords, Wifi, WifiOff } from 'lucide-react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { fighterArtPath } from '../engine/fighterSprites';
import type { RoomState } from '../network/matchState';
import type { PresidentData, PresidentRegion } from '../types/game';
import { FighterPreview } from './FighterPreview';
import { PortraitCanvas } from './PortraitCanvas';
import { SelectionRail } from './SelectionRail';

type RegionFilter = 'all' | PresidentRegion | 'current' | 'former' | 'mythic';

const REGION_TABS: Array<{ id: RegionFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'current', label: 'Actuales' },
  { id: 'former', label: 'Recientes' },
  { id: 'mythic', label: 'Míticos' },
  { id: 'latam', label: 'Latam' },
  { id: 'na', label: 'Norteamérica' },
  { id: 'eu', label: 'Europa' },
  { id: 'af_as', label: 'África/Asia' },
];

function matchesFilter(fighter: PresidentData, filter: RegionFilter) {
  if (filter === 'all') return true;
  if (fighter.isCustom) return false;
  if (filter === 'current' || filter === 'former' || filter === 'mythic') return fighter.rosterGroup === filter;
  return fighter.rosterGroup !== 'mythic' && fighter.region === filter;
}

export function OnlineLobby({ room, slot, send, leave }: {
  room: RoomState; slot: number; send: (message: object) => void; leave: () => void;
}) {
  const linkField = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<RegionFilter>('all');
  const [copied, setCopied] = useState(false);
  const self = room.players[slot];
  const host = room.hostSlot === slot;
  const allReady = room.players.every(p => p?.ready && p.connected);
  const url = new URL(location.href);
  url.searchParams.set('room', room.code);

  const [focusedId, setFocusedId] = useState<string | null>(self?.fighterId ?? null);
  useEffect(() => {
    if (self?.fighterId) setFocusedId(self.fighterId);
  }, [self?.fighterId]);

  const roster = PRESIDENTS_DATA;
  const filteredRoster = useMemo(() => {
    const list = roster.filter(d => matchesFilter(d, filter));
    if (filter === 'current' || filter === 'former') list.sort((a, b) => (b.termStart ?? 0) - (a.termStart ?? 0));
    return list;
  }, [roster, filter]);

  const focused = roster.find(f => f.id === focusedId) || roster.find(f => f.id === self?.fighterId) || filteredRoster[0] || roster[0];
  const myFighter = roster.find(f => f.id === self?.fighterId) || null;
  const artPath = fighterArtPath(focused);

  const pick = (fighterId: string) => {
    sound.uiClick();
    setFocusedId(fighterId);
    send({ type: 'select', fighterId });
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw Error();
      await navigator.clipboard.writeText(url.href);
    } catch { linkField.current?.select(); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return <section className="online-brawl-lobby apex-menu" aria-label="Selección en línea">
    <header className="online-brawl-top">
      <div className="online-brawl-title">
        <Swords className="h-5 w-5 text-[#ffcc33]" aria-hidden />
        <div>
          <h2>{room.maxPlayers === 2 ? 'Duelo' : room.maxPlayers === 8 ? 'Gran Campal' : 'Campal'} en línea</h2>
          <p>Sala <strong>{room.code}</strong> · Tú eres <strong style={{ color: self?.color }}>J{slot + 1}</strong>{host ? ' · Anfitrión' : ''}</p>
        </div>
      </div>
      <div className="online-brawl-top-actions">
        <input ref={linkField} readOnly aria-label="Enlace de invitación" value={url.href} onFocus={e => e.target.select()} className="online-invite-input" />
        <button onClick={() => void copy()}><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Invitar'}</button>
        <button onClick={leave}>Salir</button>
      </div>
    </header>

    <div className="online-brawl-body">
      <aside className="online-brawl-preview" aria-label="Vista previa del personaje">
        <div className="online-brawl-hero" style={artPath ? { backgroundImage: `url("${artPath}selection.webp")` } : undefined}>
          <div className="online-brawl-hero-art">
            <FighterPreview president={focused} selected large />
          </div>
          <div className="online-brawl-hero-caption">
            <span>{focused.id === self?.fighterId ? 'Tu selección' : 'Vista previa'}</span>
            <h3>{focused.name}</h3>
            <p>{focused.title} · {focused.role}</p>
            <em>«{focused.taunt}»</em>
          </div>
        </div>
        {myFighter && <div className="online-brawl-my-pick">
          <span className="online-brawl-label">Listo para pelear</span>
          <div className="online-brawl-my-pick-row">
            <PortraitCanvas president={myFighter} className="h-12 w-12 rounded border border-[#2c3752]" />
            <div><strong>{myFighter.name}</strong><small>{self?.ready ? 'Listo ✓' : 'Aún no listo'}</small></div>
          </div>
        </div>}
      </aside>

      <main className="online-brawl-gridpane" aria-label="Selector de personajes">
        <div className="online-brawl-filters selector-filters">
          {REGION_TABS.map(rt => <button key={rt.id} type="button" aria-pressed={filter === rt.id}
            onClick={() => { sound.uiClick(); setFilter(rt.id); }}>{rt.label}</button>)}
        </div>
        <div className="online-brawl-grid" role="listbox" aria-label="Personajes">
          {filteredRoster.map(d => {
            const pickers = room.players
              .map((p, i) => p?.fighterId === d.id ? { slot: i, color: p.color || '#94a3b8', ready: p.ready, me: i === slot } : null)
              .filter((x): x is { slot: number; color: string; ready: boolean; me: boolean } => Boolean(x));
            const mine = pickers.some(p => p.me);
            const focusedTile = focusedId === d.id;
            const border = mine ? '#ffcc33' : pickers[0]?.color;
            return <button key={d.id} type="button" role="option" aria-selected={mine}
              className={`online-fighter-tile ${mine ? 'is-mine' : ''} ${focusedTile ? 'is-focused' : ''} ${pickers.length ? 'is-taken' : ''}`}
              style={border ? { ['--pick' as any]: border } : undefined}
              onClick={() => pick(d.id)} onMouseEnter={() => setFocusedId(d.id)}>
              <span className="online-fighter-tile-art">
                <FighterPreview president={d} selected={mine || pickers.length > 0} />
              </span>
              <span className="online-fighter-tile-name">{d.name}</span>
              {pickers.length > 0 && <span className="online-fighter-tile-badges">
                {pickers.map(p => <span key={p.slot} className="online-pick-badge" style={{ background: p.color, color: '#081018' }}>
                  J{p.slot + 1}{p.me ? '·Tú' : ''}{p.ready ? ' ✓' : ''}
                </span>)}
              </span>}
            </button>;
          })}
        </div>
        <p className="online-brawl-hint">Elige tu luchador. Verás en tiempo real las selecciones de los demás jugadores.</p>
      </main>

      <aside className="online-brawl-sidebar" aria-label="Jugadores y sala">
        <section className="online-brawl-panel">
          <h3 className="online-brawl-label"><Wifi className="h-3.5 w-3.5" /> Jugadores ({room.players.filter(p => p?.connected).length}/{room.maxPlayers})</h3>
          <div className="online-brawl-slots">
            {room.players.map((p, i) => {
              const fighter = roster.find(f => f.id === p?.fighterId) || null;
              const accent = p?.color || '#425675';
              const empty = !p;
              return <div key={i} className={`online-slot ${i === slot ? 'is-me' : ''} ${p?.ready ? 'is-ready' : ''}`}
                style={{ borderColor: accent }}>
                <div className="online-slot-portrait" style={{ background: `${accent}22` }}>
                  {fighter ? <PortraitCanvas president={fighter} className="h-full w-full object-contain" /> : <span className="online-slot-empty">{empty ? '?' : '…'}</span>}
                </div>
                <div className="online-slot-info">
                  <div className="online-slot-head">
                    <strong style={{ color: accent }}>J{i + 1}{room.hostSlot === i ? <Crown className="inline h-3 w-3 ml-1 text-[#ffcc33]" /> : null}{i === slot ? ' · Tú' : ''}</strong>
                    {p?.connected ? <span className="online-slot-ping">{p.ping}ms</span> : !empty && <WifiOff className="h-3.5 w-3.5 text-[#f87171]" />}
                  </div>
                  <div className="online-slot-fighter">{fighter ? fighter.name : empty ? 'Esperando…' : 'Sin elegir'}</div>
                  <div className={`online-slot-status ${p?.ready ? 'ready' : ''}`}>
                    {!p ? 'Puesto libre' : !p.connected ? 'Reconectando…' : p.ready ? <><Check className="h-3.5 w-3.5" /> Listo</> : 'Eligiendo'}
                  </div>
                </div>
              </div>;
            })}
          </div>
        </section>

        <section className="online-brawl-panel">
          <h3 className="online-brawl-label">Escenario</h3>
          <select value={room.stage} disabled={!host} aria-label="Escenario"
            onChange={e => send({ type: 'stage', stage: Number(e.target.value) })}>
            {STAGES_DATA.map((st, i) => <option key={st.id} value={i}>{st.name} · {st.city}</option>)}
          </select>
          <div className="online-stage-thumb">
            <img src={stageArtUrl(STAGES_DATA[room.stage]?.id || STAGES_DATA[0].id, 'day')} alt="" />
            <small>{host ? 'Tú eliges el escenario' : 'El anfitrión elige el escenario'}</small>
          </div>
        </section>

        <section className="online-brawl-actions">
          <button disabled={!self?.fighterId}
            onClick={() => { sound.uiClick(); send({ type: 'ready', ready: !self?.ready }); }}
            className={`online-ready-btn ${self?.ready ? 'is-ready' : ''}`}>
            {self?.ready ? '✓ Listo (cambiar)' : 'Estoy listo'}
          </button>
          {host && <button disabled={!allReady}
            onClick={() => { sound.uiConfirm(); send({ type: 'start' }); }}
            className="online-start-btn">¡Pelear!</button>}
          <p className="online-brawl-status" role="status">
            {allReady ? 'Todos listos. ¡A pelear!' : host ? 'Espera a que todos estén listos.' : 'Pulsa “Estoy listo” cuando elijas.'}
          </p>
        </section>
      </aside>
    </div>
  </section>;
}
