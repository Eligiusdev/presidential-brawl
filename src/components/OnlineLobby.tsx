import { useMemo, useRef, useState } from 'react';
import { Check, Copy, Crown, LogOut, Map as MapIcon, Swords, Users, WifiOff } from 'lucide-react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { fighterArtPath } from '../engine/fighterSprites';
import { movesFor } from '../combat/roster.js';
import { ultimateText } from '../engine/presidentUltimates';
import type { RoomState } from '../network/matchState';
import type { PresidentData, PresidentRegion } from '../types/game';
import { FighterPreview } from './FighterPreview';
import { PortraitCanvas } from './PortraitCanvas';

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

  const roster = PRESIDENTS_DATA;
  const filteredRoster = useMemo(() => {
    const list = roster.filter(d => matchesFilter(d, filter));
    if (filter === 'current' || filter === 'former') list.sort((a, b) => (b.termStart ?? 0) - (a.termStart ?? 0));
    return list;
  }, [filter]);

  const preview = roster.find(f => f.id === self?.fighterId) || filteredRoster[0] || roster[0];
  const artPath = fighterArtPath(preview);
  const moves = useMemo(() => movesFor(preview), [preview]);
  const ultimate = ultimateText(preview);
  const statBars = useMemo(() => ([
    { name: 'Velocidad', val: (preview.stats.speed / 6.5) * 100, color: '#38bdf8' },
    { name: 'Peso', val: (preview.stats.weight / 1.6) * 100, color: '#f97316' },
    { name: 'Salto', val: (preview.stats.jumpForce / 14.5) * 100, color: '#4ade80' },
    { name: 'Potencia', val: (preview.stats.power / 1.3) * 100, color: '#f43f5e' },
  ]), [preview]);
  const moveRows = useMemo(() => moves
    ? [
        ['Ligero', moves.neutralAttack().name],
        ['Especial', moves.specialNeutral().name],
        ['↑ Esp.', moves.specialUp().name],
        ['↓ Esp.', moves.specialDown().name],
      ] as const
    : [['Signature', preview.sigName]] as const, [moves, preview]);

  const pick = (fighterId: string) => {
    sound.uiClick();
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

  const stage = STAGES_DATA[room.stage] || STAGES_DATA[0];

  return <section className="ob-lobby" aria-label="Selección en línea">
    <header className="ob-topbar">
      <div className="ob-brand">
        <Swords className="h-5 w-5 text-[#ffcc33]" aria-hidden />
        <div>
          <h2>{room.maxPlayers === 2 ? 'Duelo' : room.maxPlayers === 8 ? 'Gran Campal' : 'Campal'} en línea</h2>
          <p>Sala <b>{room.code}</b> · <span style={{ color: self?.color }}>J{slot + 1}</span>{host ? ' · Anfitrión' : ''}</p>
        </div>
      </div>
      <div className="ob-top-actions">
        <input ref={linkField} readOnly aria-label="Enlace de invitación" value={url.href} onFocus={e => e.target.select()} className="ob-invite" />
        <button type="button" onClick={() => void copy()}><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Invitar'}</button>
        <button type="button" onClick={leave}><LogOut className="h-4 w-4" />Salir</button>
      </div>
    </header>

    <div className="ob-main">
      <section className="ob-preview" aria-label="Vista previa del personaje">
        <div className="ob-character-card"
          style={{
            backgroundImage: artPath ? `linear-gradient(180deg,rgba(5,9,16,.08) 0%,rgba(5,9,16,.18) 30%,rgba(6,11,20,.78) 60%,rgba(7,12,22,.98) 100%), url("${artPath}selection.webp")` : undefined,
            ['--accent' as any]: preview.palette.accent.base,
          }}>
          <div className="ob-hero-top">
            <span className="ob-tag">{self?.fighterId ? 'Tu selección' : 'Elige tu luchador'}</span>
            {self?.ready && <span className="ob-tag ready"><Check className="h-3 w-3" />Listo</span>}
          </div>
          <div className="ob-hero-art">
            <FighterPreview president={preview} selected large />
          </div>
          <div className="ob-char-info">
            <div className="ob-hero-name">
              <h3>{preview.name}</h3>
              <p>{preview.title} · {preview.role}</p>
            </div>
            <div className="ob-quote">«{preview.taunt}»</div>
            <div className="ob-info-grid">
              <div className="ob-bars">
                {statBars.map(s => <div key={s.name} className="ob-bar-row">
                  <span className="ob-bar-label">{s.name}</span>
                  <div className="ob-bar-track"><div className="ob-bar-fill" style={{ width: `${Math.min(100, Math.round(s.val))}%`, background: s.color }} /></div>
                  <span className="ob-bar-val">{Math.round(s.val)}</span>
                </div>)}
              </div>
              <div className="ob-moves">
                {moveRows.map(([k, v]) => <div key={k} className="ob-move"><span className="ob-move-key">{k}</span><span className="ob-move-name">{v}</span></div>)}
                <div className="ob-move ult"><span className="ob-move-key">Ultimate</span><span className="ob-move-name">{ultimate.name}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ob-center" aria-label="Sala y escenario">
        <div className="ob-panel">
          <h3 className="ob-panel-title"><Users className="h-4 w-4" />Jugadores <span>{room.players.filter(p => p?.connected).length}/{room.maxPlayers}</span></h3>
          <div className="ob-slots">
            {room.players.map((p, i) => {
              const fighter = roster.find(f => f.id === p?.fighterId) || null;
              const accent = p?.color || '#425675';
              return <div key={i} className={`ob-slot ${i === slot ? 'me' : ''} ${p?.ready ? 'ready' : ''}`} style={{ ['--pc' as any]: accent }}>
                <div className="ob-slot-port">
                  {fighter ? <PortraitCanvas president={fighter} className="h-full w-full" /> : <span className="ob-slot-q">?</span>}
                </div>
                <div className="ob-slot-info">
                  <div className="ob-slot-head">
                    <b style={{ color: accent }}>J{i + 1}</b>
                    {room.hostSlot === i && <Crown className="h-3.5 w-3.5 text-[#ffcc33]" />}
                    {i === slot && <em>Tú</em>}
                    <span className="spacer" />
                    {p?.connected ? <small>{p.ping}ms</small> : !p ? null : <WifiOff className="h-3.5 w-3.5 text-[#f87171]" />}
                  </div>
                  <div className="ob-slot-name">{fighter ? fighter.name : p ? 'Eligiendo…' : 'Esperando jugador'}</div>
                  <div className={`ob-slot-state ${p?.ready ? 'on' : ''}`}>
                    {!p ? 'Libre' : !p.connected ? 'Reconectando' : p.ready ? <><Check className="h-3.5 w-3.5" />Listo</> : 'En selección'}
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>

        <div className="ob-panel ob-stage-panel">
          <h3 className="ob-panel-title"><MapIcon className="h-4 w-4" />Escenario <small>{host ? 'elige tú' : 'elige anfitrión'}</small></h3>
          <div className="ob-stage-grid">
            {STAGES_DATA.map((st, i) => {
              const sel = room.stage === i;
              return <button key={st.id} type="button" disabled={!host} aria-pressed={sel}
                className={`ob-stage-card ${sel ? 'sel' : ''}`}
                onClick={() => { if (!host) return; sound.uiClick(); send({ type: 'stage', stage: i }); }}>
                <img src={stageArtUrl(st.id, 'day')} alt="" loading="lazy" />
                <span className="ob-stage-meta">
                  <b>{st.name}</b>
                  <small>{st.city}</small>
                </span>
                {sel && <span className="ob-stage-check"><Check className="h-3.5 w-3.5" /></span>}
              </button>;
            })}
          </div>
          <p className="ob-stage-hazard">{stage.hazardMsg}</p>
        </div>
      </section>

      <aside className="ob-roster" aria-label="Selector de personajes">
        <div className="ob-roster-head">
          <h3>Personajes</h3>
          <div className="ob-filters">
            {REGION_TABS.map(rt => <button key={rt.id} type="button" aria-pressed={filter === rt.id}
              onClick={() => { sound.uiClick(); setFilter(rt.id); }}>{rt.label}</button>)}
          </div>
        </div>
        <div className="ob-grid" role="listbox" aria-label="Personajes">
          {filteredRoster.map(d => {
            const pickers = room.players
              .map((p, i) => p?.fighterId === d.id ? { slot: i, color: p.color || '#94a3b8', ready: p.ready, me: i === slot } : null)
              .filter((x): x is { slot: number; color: string; ready: boolean; me: boolean } => Boolean(x));
            const mine = pickers.some(p => p.me);
            const ring = mine ? '#ffcc33' : pickers[0]?.color;
            return <button key={d.id} type="button" role="option" aria-selected={mine}
              className={`ob-tile ${mine ? 'mine' : ''} ${pickers.length ? 'taken' : ''}`}
              style={ring ? { ['--ring' as any]: ring } : undefined}
              onClick={() => pick(d.id)}>
              <span className="ob-tile-art">
                <FighterPreview president={d} selected={mine || pickers.length > 0} />
              </span>
              <span className="ob-tile-name">{d.name}</span>
              {mine && <span className="ob-tile-lock"><Check className="h-3 w-3" /></span>}
              {pickers.length > 0 && <span className="ob-tile-badges">
                {pickers.map(p => <span key={p.slot} className="ob-badge" style={{ background: p.color }}>J{p.slot + 1}{p.ready ? '✓' : ''}</span>)}
              </span>}
            </button>;
          })}
        </div>
        <div className="ob-roster-actions">
          <button type="button" disabled={!self?.fighterId}
            onClick={() => { sound.uiClick(); send({ type: 'ready', ready: !self?.ready }); }}
            className={`ob-ready ${self?.ready ? 'on' : ''}`}>
            {self?.ready ? '✓ LISTO (cambiar)' : 'ESTOY LISTO'}
          </button>
          {host && <button type="button" disabled={!allReady}
            onClick={() => { sound.uiConfirm(); send({ type: 'start' }); }}
            className="ob-fight">¡PELEAR!</button>}
          <p className="ob-status" role="status">
            {allReady ? 'Todos listos. ¡A combatir!' : host ? 'Espera a que todos estén listos.' : 'Elige luchador y confirma.'}
          </p>
        </div>
      </aside>
    </div>
  </section>;
}
