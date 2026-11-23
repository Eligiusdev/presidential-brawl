import { useMemo, useState } from 'react';
import { ArrowLeft, Crown, Swords } from 'lucide-react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { FighterPreview } from './FighterPreview';
import { movesFor } from '../combat/roster.js';
import { ultimateText } from '../engine/presidentUltimates';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { RosterDisplay, REGION_TABS, matchesFilter, matchesSearch, useRosterDisplay, type RegionFilter } from './CharacterSelect';
import type { PresidentData } from '../types/game';

interface Props {
  roster: PresidentData[];
  selected: number;
  onSelect: (idx: number) => void;
  onStart: () => void;
  onBack: () => void;
}

export function CampaignCharacterSelect({ roster, selected, onSelect, onStart, onBack }: Props) {
  const display = useRosterDisplay();
  const { query } = display;
  const [filter, setFilter] = useState<RegionFilter>('all');
  const filteredRoster = useMemo(() => {
    const list = roster.filter(d => matchesFilter(d, filter) && matchesSearch(d, query));
    if (filter === 'current' || filter === 'former') list.sort((a, b) => (b.termStart ?? 0) - (a.termStart ?? 0));
    return list;
  }, [filter, query]);
  const info = roster[selected] ?? roster[0];
  const moves = useMemo(() => movesFor(info), [info]);
  const ultimate = useMemo(() => ultimateText(info), [info]);
  const stageArt = stageArtUrl('narino', 'day');
  const statBars = useMemo(() => ([
    { name: 'Velocidad', val: (info.stats.speed / 6.5) * 100, color: '#38bdf8' },
    { name: 'Peso', val: (info.stats.weight / 1.6) * 100, color: '#f97316' },
    { name: 'Salto', val: (info.stats.jumpForce / 14.5) * 100, color: '#4ade80' },
    { name: 'Potencia', val: (info.stats.power / 1.3) * 100, color: '#f43f5e' },
  ]), [info]);
  const moveRows = useMemo(() => moves
    ? [['Ligero', moves.neutralAttack().name], ['Especial', moves.specialNeutral().name], ['↑ Esp.', moves.specialUp().name], ['↓ Esp.', moves.specialDown().name]] as const
    : [['Signature', info.sigName]] as const, [moves, info]);

  return (
    <section className="ob-lobby ob-gallery" aria-label="Seleccionar héroe de campaña" style={{ position: 'absolute', zIndex: 20 }}>
      <header className="ob-topbar">
        <div className="ob-brand">
          <Crown className="h-5 w-5 text-[#ffcc33]" aria-hidden />
          <div className="ob-brand-text">
            <h2>Cumbre Mundial</h2>
            <p>Elige tu héroe para la campaña de 7 rondas</p>
          </div>
        </div>
        <div className="ob-top-actions">
          <button type="button" className="ob-fight" style={{ minHeight: 40, padding: '0 18px', fontSize: 13 }} onClick={() => { sound.uiConfirm(); onStart(); }}>
            <Swords className="h-4 w-4" style={{ marginRight: 6, verticalAlign: 'middle' }} />Iniciar campaña
          </button>
          <button type="button" data-gamepad-back onClick={() => { sound.uiClick(); onBack(); }}><ArrowLeft className="h-4 w-4" />Volver</button>
        </div>
      </header>

      <div className="ob-main">
        <section className="ob-preview" aria-label="Vista previa del personaje">
          <div className="ob-character-card" style={{ ['--accent' as any]: info.palette.accent.base }}>
            <div className="ob-card-bg" aria-hidden>
              <div className="ob-bg-stage" style={{ backgroundImage: `url("${stageArt}")` }} />
              <div className="ob-bg-color" style={{ background: `radial-gradient(120% 90% at 78% 30%, color-mix(in srgb, ${info.palette.accent.base} 24%, transparent), transparent 58%), linear-gradient(90deg, rgba(8,13,24,.18) 0%, rgba(8,13,24,.04) 45%, rgba(8,13,24,.22) 100%)` }} />
            </div>
            <div className="ob-hero-art" style={{ paddingTop: 24 }}>
              <div className="ob-hero-fighter me solo">
                <FighterPreview president={info} selected large />
              </div>
            </div>
            <div className="ob-char-info" style={{ background: 'linear-gradient(180deg,rgba(8,13,24,.62) 0%,rgba(8,13,24,.88) 24%,rgba(8,13,24,.95) 100%)' }}>
              <div className="ob-hero-tags" style={{ flexWrap: 'wrap' }}>
                <span className="ob-tag">Héroe de campaña</span>
                <span className="ob-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Crown className="h-3 w-3" />{info.era}</span>
              </div>
              <div className="ob-hero-name">
                <h3>{info.name}</h3>
                <p>{info.title} · {info.role}</p>
              </div>
              <div className="ob-quote">«{info.taunt}»</div>
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

        <aside className="ob-roster" aria-label="Personajes">
          <div className="ob-roster-head">
            <h3>Elige tu héroe</h3>
            <RosterDisplay display={display} />
            <div className="ob-filters" aria-label="Filtros de personajes" onWheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY; }}>
              {REGION_TABS.map(rt => {
                const count = roster.filter(fighter => matchesFilter(fighter, rt.id)).length;
                return <button key={rt.id} type="button" aria-pressed={filter === rt.id} onClick={() => { sound.uiClick(); setFilter(rt.id); }}>
                  {rt.label} <span className="ob-filter-count">{count}</span>
                </button>;
              })}
            </div>
          </div>
          <div className="ob-grid" aria-label="Personajes">
            {filteredRoster.map(d => {
              const realIdx = roster.indexOf(d);
              const isSelected = realIdx === selected;
              return (
                <button key={d.id} type="button" aria-pressed={isSelected} className={`ob-tile ${isSelected ? 'mine' : ''}`}
                  style={isSelected ? { ['--ring' as any]: '#ffcc33' } : undefined}
                  onClick={() => { sound.uiClick(); onSelect(realIdx); }}>
                  <span className="ob-tile-art"><FighterPreview president={d} selected={isSelected} /></span>
                  <span className="ob-tile-name">{d.name}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
