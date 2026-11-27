import { FighterSelectionCard } from './FighterSelectionCard';
import { FighterName } from './FighterName';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, ChevronLeft, ChevronRight, Settings, Sliders, Swords, Users } from 'lucide-react';
import { FighterPreview } from './FighterPreview';
import { movesFor } from '../combat/roster.js';
import { ultimateText } from '../engine/presidentUltimates';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { STAGES_DATA } from '../data/stages';
import { RosterDisplay, REGION_TABS, matchesFilter, matchesSearch, useRosterDisplay, type RegionFilter } from './CharacterSelect';
import type { GameConfig, PresidentData } from '../types/game';

interface Props {
  roster: PresidentData[];
  sel: [number, number];
  stageSel: number;
  vsAI: boolean;
  config: GameConfig;
  onChangeSel: (next: [number, number]) => void;
  onChangeStage: (idx: number) => void;
  onToggleVsAI: () => void;
  onStart: () => void;
  onBack: () => void;
  onOpenConfig: () => void;
  onOpenMatchConfig: () => void;
}

export function VersusCharacterSelect({ roster, sel, stageSel, vsAI, onChangeSel, onChangeStage, onToggleVsAI, onStart, onBack, onOpenConfig, onOpenMatchConfig }: Props) {
  const display = useRosterDisplay();
  const { query } = display;
  const [filter, setFilter] = useState<RegionFilter>('all');
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const filteredRoster = useMemo(() => {
    const list = roster.filter(d => matchesFilter(d, filter) && matchesSearch(d, query));
    if (filter === 'current' || filter === 'former') list.sort((a, b) => (b.termStart ?? 0) - (a.termStart ?? 0));
    return list;
  }, [filter, query]);
  const p1 = roster[sel[0]] || roster[0];
  const p2 = roster[sel[1]] || roster[0];
  const info = activeSlot === 0 ? p1 : p2;
  const moves = useMemo(() => movesFor(info), [info]);
  const ultimate = useMemo(() => ultimateText(info), [info]);
  const stage = STAGES_DATA[stageSel] || STAGES_DATA[0];
  const stageArt = stageArtUrl(stage.id, 'day');
  const stageCount = STAGES_DATA.length;
  const setStage = (idx: number) => { sound.uiClick(); onChangeStage(((idx % stageCount) + stageCount) % stageCount); };
  const statBars = useMemo(() => ([
    { name: 'Velocidad', val: (info.stats.speed / 6.5) * 100, color: '#38bdf8' },
    { name: 'Peso', val: (info.stats.weight / 1.6) * 100, color: '#f97316' },
    { name: 'Salto', val: (info.stats.jumpForce / 14.5) * 100, color: '#4ade80' },
    { name: 'Potencia', val: (info.stats.power / 1.3) * 100, color: '#f43f5e' },
  ]), [info]);
  const moveRows = useMemo(() => moves
    ? [['Ligero', moves.neutralAttack().name], ['Especial', moves.specialNeutral().name], ['↑ Esp.', moves.specialUp().name], ['↓ Esp.', moves.specialDown().name]] as const
    : [['Signature', info.sigName]] as const, [moves, info]);

  const pick = (idx: number) => {
    sound.uiClick();
    if (activeSlot === 0) onChangeSel([idx, sel[1]]);
    else onChangeSel([sel[0], idx]);
  };

  return (
    <section className="ob-lobby ob-gallery" aria-label="Combate local" style={{ position: 'absolute', zIndex: 20 }}>
      <header className="ob-topbar">
        <div className="ob-brand">
          <Swords className="h-5 w-5 text-[#ffcc33]" aria-hidden />
          <div className="ob-brand-text">
            <h2>Combate local</h2>
            <p>{vsAI ? 'Jugador vs IA' : 'Jugador vs Jugador'} · {stage.name}</p>
          </div>
        </div>
        <div className="ob-top-actions">
          <button type="button" onClick={() => { sound.uiClick(); onOpenConfig(); }}><Settings className="h-4 w-4" />Ajustes</button>
          <button type="button" className="ob-invite-btn" onClick={() => { sound.uiClick(); onOpenMatchConfig(); }}><Sliders className="h-4 w-4" />Reglas de partida</button>
          <button type="button" data-gamepad-back onClick={() => { sound.uiClick(); onBack(); }}><ArrowLeft className="h-4 w-4" />Volver</button>
        </div>
      </header>

      <div className="ob-main">
        <section className="ob-preview fighter-selection-preview" aria-label="Vista previa" style={{ overflow: 'auto' }}>
          <div className="ob-stage-carousel" aria-label="Escenario" style={{ position: 'static', width: 'min(100%, 420px)', margin: '0 0 8px', flexShrink: 0 }}>
            <button type="button" className="ob-stage-nav" aria-label="Escenario anterior" onClick={() => setStage(stageSel - 1)}><ChevronLeft className="h-4 w-4" /></button>
            <div className="ob-stage-slide">
              <img src={stageArt} alt="" draggable={false} />
              <div className="ob-stage-slide-meta">
                <b>{stage.name}</b>
                <small>{stage.city} · {stageSel + 1}/{stageCount}</small>
              </div>
            </div>
            <button type="button" className="ob-stage-nav" aria-label="Siguiente escenario" onClick={() => setStage(stageSel + 1)}><ChevronRight className="h-4 w-4" /></button>
            <div className="ob-stage-dots" aria-hidden>
              {STAGES_DATA.map((_, i) => <span key={i} className={`ob-stage-dot ${i === stageSel ? 'on' : ''}`} />)}
            </div>
          </div>

          <div className="ob-character-card" style={{ flex: 'none', ['--accent' as any]: info.palette.accent.base }}>
            <div className="grid grid-cols-2 gap-2 p-2">
              <FighterSelectionCard fighter={p1} label="Jugador 1" selected={activeSlot === 0} onSelect={() => setActiveSlot(0)} />
              <FighterSelectionCard fighter={p2} label={vsAI ? 'IA' : 'Jugador 2'} selected={activeSlot === 1} onSelect={() => setActiveSlot(1)} />
            </div>
            <div className="ob-char-info" style={{ background: 'linear-gradient(180deg,rgba(8,13,24,.62) 0%,rgba(8,13,24,.88) 24%,rgba(8,13,24,.95) 100%)' }}>
              <div className="ob-hero-tags" style={{ flexWrap: 'wrap' }}>
                <span className="ob-tag">{activeSlot === 0 ? 'Jugador 1' : (vsAI ? 'IA' : 'Jugador 2')}</span>
                <span className="ob-tag">{info.role}</span>
              </div>
              <div className="ob-hero-name">
                <h3><FighterName fighter={info} /></h3>
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

        <aside className="ob-roster" aria-label="Selección">
          <div className="ob-roster-head">
            <h3>Personajes</h3>
            <div className="flex gap-1.5 mb-2">
              <button type="button" className={`flex-1 rounded-md py-1.5 text-xs font-bold ${activeSlot === 0 ? 'bg-[#ffcc33] text-[#0b0e17]' : 'bg-[#162033] text-[#94a3b8] hover:text-white'}`} onClick={() => { sound.uiClick(); setActiveSlot(0); }}>J1: <FighterName fighter={p1} /></button>
              <button type="button" className={`flex-1 rounded-md py-1.5 text-xs font-bold ${activeSlot === 1 ? 'bg-[#38bdf8] text-[#0b0e17]' : 'bg-[#162033] text-[#94a3b8] hover:text-white'}`} onClick={() => { sound.uiClick(); setActiveSlot(1); }}>{vsAI ? 'IA' : 'J2'}: <FighterName fighter={p2} /></button>
            </div>
            <RosterDisplay display={display} />
            <div className="ob-filters" aria-label="Filtros" onWheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY; }}>
              {REGION_TABS.map(rt => {
                const count = roster.filter(f => matchesFilter(f, rt.id)).length;
                return <button key={rt.id} type="button" aria-pressed={filter === rt.id} onClick={() => { sound.uiClick(); setFilter(rt.id); }}>{rt.label} <span className="ob-filter-count">{count}</span></button>;
              })}
            </div>
          </div>
          <div className="ob-grid" aria-label="Personajes">
            {filteredRoster.map(d => {
              const realIdx = roster.indexOf(d);
              const isP1 = realIdx === sel[0];
              const isP2 = realIdx === sel[1];
              const mine = activeSlot === 0 ? isP1 : isP2;
              const ring = isP1 && isP2 ? '#a855f7' : isP1 ? '#ffcc33' : isP2 ? '#38bdf8' : undefined;
              return (
                <button key={d.id} type="button" aria-pressed={mine} className={`ob-tile ${mine ? 'mine' : ''} ${(isP1 || isP2) && !mine ? 'taken' : ''}`}
                  style={ring ? { ['--ring' as any]: ring } : undefined}
                  onClick={() => pick(realIdx)}>
                  <span className="ob-tile-art"><FighterPreview president={d} selected={isP1 || isP2} /></span>
                  <span className="ob-tile-name"><FighterName fighter={d} /></span>
                  {(isP1 || isP2) && <span className="ob-tile-badges">
                    {isP1 && <span className="ob-badge" style={{ background: '#ffcc33' }}>J1</span>}
                    {isP2 && <span className="ob-badge" style={{ background: '#38bdf8' }}>{vsAI ? 'IA' : 'J2'}</span>}
                  </span>}
                </button>
              );
            })}
          </div>
          <div className="ob-roster-actions">
            <div className="flex gap-2">
              <button type="button" className={`flex-1 rounded-lg border py-2 text-xs font-bold flex items-center justify-center gap-1.5 ${!vsAI ? 'border-[#ffcc33] bg-[#212026] text-[#ffcc33]' : 'border-[#2f3b57] bg-[#161e31] text-[#cbd5e1]'}`} onClick={() => { if (vsAI) { sound.uiClick(); onToggleVsAI(); } }}>
                <Users className="h-3.5 w-3.5" />2 Jugadores
              </button>
              <button type="button" className={`flex-1 rounded-lg border py-2 text-xs font-bold flex items-center justify-center gap-1.5 ${vsAI ? 'border-[#38bdf8] bg-[#13243b] text-[#38bdf8]' : 'border-[#2f3b57] bg-[#161e31] text-[#cbd5e1]'}`} onClick={() => { if (!vsAI) { sound.uiClick(); onToggleVsAI(); } }}>
                <Bot className="h-3.5 w-3.5" />VS IA
              </button>
            </div>

            <button type="button" className="ob-fight" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => { sound.uiConfirm(); onStart(); }}>
              <Swords className="h-4 w-4" />¡PELEAR!
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
