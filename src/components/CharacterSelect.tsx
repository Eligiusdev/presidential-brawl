import {movesFor} from '../combat/roster.js';
import { ArrowLeft, Crown, Film, Pencil, Play, Settings, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sound } from '../audio/soundEngine';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { STAGES_DATA } from '../data/stages';
import { GameConfig, PresidentData, PresidentRegion } from '../types/game';
import { fighterArtPath } from '../engine/fighterSprites';
import { FighterPreview } from './FighterPreview';
import { PortraitCanvas } from './PortraitCanvas';
import { SelectionRail } from './SelectionRail';

type RegionFilter = 'all' | PresidentRegion | 'current' | 'former' | 'mythic';

function matchesFilter(fighter: PresidentData, filter: RegionFilter) {
  if (filter === 'all') return true;
  if (filter === 'custom') return Boolean(fighter.isCustom);
  if (fighter.isCustom) return false;
  if (filter === 'current' || filter === 'former' || filter === 'mythic') return fighter.rosterGroup === filter;
  return fighter.rosterGroup !== 'mythic' && fighter.region === filter;
}

const REGION_TABS: Array<{ id: RegionFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'current', label: 'Presidentes actuales' },
  { id: 'former', label: 'Expresidentes recientes' },
  { id: 'mythic', label: 'Míticos' },
  { id: 'latam', label: 'Latinoamérica' },
  { id: 'na', label: 'Norteamérica' },
  { id: 'eu', label: 'Europa' },
  { id: 'af_as', label: 'África y Asia' },
  { id: 'custom', label: 'Propios' },
];

interface CharacterSelectProps {
  roster: PresidentData[];
  sel: [number, number];
  stageSel: number;
  vsAI: boolean;
  config: GameConfig;
  hasReplay: boolean;
  onChangeSel: (next: [number, number]) => void;
  onChangeStage: (idx: number) => void;
  onToggleVsAI: () => void;
  remoteOpponent?: boolean;
  remoteReady?: boolean;
  onStartVersus: () => void;
  onStartCampaign: () => void;
  onStartTraining: () => void;
  onWatchLastReplay: () => void;
  onOpenCustomizer: (editTarget?: PresidentData) => void;
  onDeleteCustom: (id: string) => void;
  onOpenConfig: () => void;
  onBack: () => void;
}

export function CharacterSelect({
  roster,
  sel,
  stageSel,
  vsAI,
  config,
  hasReplay,
  onChangeSel,
  onChangeStage,
  onToggleVsAI,
  remoteOpponent = false,
  remoteReady = false,
  onStartVersus,
  onStartCampaign,
  onStartTraining,
  onWatchLastReplay,
  onOpenCustomizer,
  onDeleteCustom,
  onOpenConfig,
  onBack,
}: CharacterSelectProps) {
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const p1 = roster[sel[0]] || roster[0];
  const p2 = roster[sel[1]] || roster[0];

  const activeFighter = activeSlot === 0 ? p1 : p2;
  const artPath = fighterArtPath(activeFighter);

  const filteredRoster = useMemo(() => {
    const mapped = roster.map((d, idx) => ({ d, idx }));
    const filtered = mapped.filter(({ d }) => matchesFilter(d, regionFilter));
    if (regionFilter === 'current' || regionFilter === 'former') {
      filtered.sort((a, b) => (b.d.termStart ?? 0) - (a.d.termStart ?? 0));
    }
    return filtered;
  }, [roster, regionFilter]);

  const pickPresident = (idx: number) => {
    sound.uiClick();
    const next: [number, number] = [...sel] as [number, number];
    next[remoteOpponent ? 0 : activeSlot] = idx;
    onChangeSel(next);

  };

  return (
    <div className="apex-menu apex-selector absolute inset-0 z-20 flex flex-col p-3 sm:p-6 overflow-y-auto arcade-scroll">
      {/* Top Bar */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#222d4a]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.uiClick();
              onBack();
            }}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-[#2a344d] bg-[#131929] px-3 text-xs font-semibold text-[#cbd5e1] hover:text-white whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </button>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-2xl">
            Selección de Combatientes
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasReplay && (
            <button
              onClick={() => {
                sound.uiClick();
                onWatchLastReplay();
              }}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#a855f7]/50 bg-[#1a132b] px-3.5 text-xs font-bold text-[#e9d5ff] hover:border-[#c084fc] hover:text-white whitespace-nowrap shrink-0"
            >
              <Film className="h-4 w-4 text-[#c084fc]" />
              Última Repetición
            </button>
          )}
          <button
            onClick={() => {
              sound.uiClick();
              onOpenCustomizer();
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-[#38bdf8]/50 bg-[#102033] px-3.5 text-xs font-bold text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4 text-[#38bdf8]" />
            Crear Luchador
          </button>
          <button
            onClick={() => {
              sound.uiClick();
              if (!remoteOpponent) onToggleVsAI();
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-[#2f3b57] bg-[#161e31] px-3.5 text-xs font-bold text-white hover:border-[#ffcc33] whitespace-nowrap shrink-0"
          >
            <Users className="h-4 w-4 text-[#ffcc33]" />
            Rival: {remoteOpponent ? "J2 en línea" : vsAI ? 'IA' : 'Humano 2P'}
          </button>
          <button
            onClick={() => {
              sound.uiClick();
              onOpenConfig();
            }}
            className="flex h-10 items-center gap-2 rounded-lg border border-[#2f3b57] bg-[#161e31] px-3.5 text-xs font-bold text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white whitespace-nowrap shrink-0"
          >
            <Settings className="h-4 w-4 text-[#ffcc33]" />
            Configurar ({config.match.stocks} Vidas · {config.video.pixelPreset.toUpperCase()})
          </button>
        </div>
      </div>

      {artPath && (
        <section aria-label={'Vista de ' + activeFighter.name} className="fighter-showcase"
          style={{backgroundImage: `url("${artPath}selection.webp")`}}>
          <FighterPreview president={activeFighter} selected large />
          <div className="fighter-showcase-caption">
            <span>{activeSlot === 0 ? 'Jugador 1' : vsAI ? 'Rival IA' : 'Jugador 2'}</span>
            <h3>{activeFighter.name}</h3>
            <p>{activeFighter.title}</p>
            <button type="button" className="selector-mobile-customize"
              onClick={() => onOpenCustomizer(activeFighter)}>
              <Pencil size={14} /> Personalizar
            </button>
          </div>
        </section>
      )}

      {/* Main 3-Column Selection Layout */}
      <div className="selector-layout mx-auto my-3 grid w-full max-w-6xl flex-1 gap-3">
        {/* P1 Preview Card */}
        <div className="selector-side">
          <FighterPreviewCard
            slot={0}
            label="Jugador 1"
            president={p1}
            isActive={activeSlot === 0}
            onFocus={() => {
              sound.uiClick();
              setActiveSlot(0);
            }}
            onCustomize={() => {
              sound.uiClick();
              onOpenCustomizer(p1);
            }}
          />
        </div>

        {/* Center Roster + Stage Picker */}
        <div className="selector-center flex min-w-0 flex-col gap-3">
          {/* Active Slot Switcher */}
          <div className="flex items-center justify-between rounded-lg border border-[#232c44] bg-[#101524] p-1.5">
            <button
              onClick={() => {
                sound.uiClick();
                setActiveSlot(0);
              }}
              className={`flex-1 rounded-md py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                activeSlot === 0 ? 'bg-[#ffcc33] text-[#0b0e17]' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Eligiendo J1: {p1.name}
            </button>
            <button
              onClick={() => {
                sound.uiClick();
                if (!remoteOpponent) setActiveSlot(1);
              }}
              className={`flex-1 rounded-md py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                activeSlot === 1 ? 'bg-[#38bdf8] text-[#0b0e17]' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {remoteOpponent ? "J2 elige desde su dispositivo" : <>Eligiendo {vsAI ? 'IA' : 'J2'}: {p2.name}</>}
            </button>
          </div>

          {/* Region Filter Bar */}
          <div className="selector-filters flex items-center gap-1.5">
            {REGION_TABS.map((rt) => {
              const count = roster.filter((fighter) => matchesFilter(fighter, rt.id)).length;
              return (
                <button
                  key={rt.id}
                  onClick={() => {
                    sound.uiClick();
                    setRegionFilter(rt.id);
                  }}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    regionFilter === rt.id
                      ? 'border-[#ffcc33] bg-[#211f1b] text-[#ffcc33]'
                      : 'border-[#222b42] bg-[#101524] text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {rt.label} <span className="font-mono-num opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Roster Grid (Built-in + Custom Fighters) */}
          <SelectionRail label="Luchadores" variant="fighters" resetKey={regionFilter}>
            {filteredRoster.map(({ d, idx }) => {
              const isP1 = sel[0] === idx;
              const isP2 = sel[1] === idx;
              return (
                <div
                  key={d.id}
                  onClick={() => pickPresident(idx)}
                  role="button"
                  aria-pressed={activeSlot === 0 ? isP1 : isP2}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      pickPresident(idx);
                    }
                  }}
                  className={`group relative flex cursor-pointer flex-col items-center rounded-lg border p-2.5 text-center transition-all ${
                    isP1 && isP2
                      ? 'border-[#a855f7] bg-[#1e1b38] shadow-[0_0_16px_rgba(168,85,247,0.3)]'
                      : isP1
                        ? 'border-[#ffcc33] bg-[#212026] shadow-[0_0_16px_rgba(255,204,51,0.24)]'
                        : isP2
                          ? 'border-[#38bdf8] bg-[#13243b] shadow-[0_0_16px_rgba(56,189,248,0.24)]'
                          : 'border-[#25304d] bg-[#11182c] hover:border-[#4b5f94]'
                  }`}
                >
                  {d.isCustom && (
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        title="Editar luchador"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.uiClick();
                          onOpenCustomizer(d);
                        }}
                        className="rounded border border-[#2c3752] bg-[#0e1422] p-1 text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar luchador"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.uiClick();
                          onDeleteCustom(d.id);
                        }}
                        className="rounded border border-[#451d24] bg-[#1f0e13] p-1 text-[#fca5a5] hover:border-[#ef4444] hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="mb-2 overflow-hidden rounded border border-[#2a344d]">
                    <FighterPreview president={d} selected={isP1 || isP2} />
                  </div>
                  <div className="font-display text-xs font-bold text-white leading-tight truncate w-full">{d.name}</div>
                  <div className="mt-0.5 text-[10px] text-[#94a3b8] truncate w-full">
                    {d.isCustom ? 'Personalizado' : d.role}
                  </div>
                  {(isP1 || isP2) && (
                    <div className="mt-1 font-mono-num text-[10px] font-bold">
                      {isP1 && <span className="text-[#ffcc33]">J1</span>}
                      {isP1 && isP2 && <span className="text-[#94a3b8]"> · </span>}
                      {isP2 && <span className="text-[#38bdf8]">{vsAI ? 'IA' : 'J2'}</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Custom Fighter Tile */}
            <button
              type="button"
              onClick={() => {
                sound.uiClick();
                onOpenCustomizer();
              }}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#38bdf8]/45 bg-[#0e1726] p-2.5 text-center text-[#7dd3fc] transition-colors hover:border-[#38bdf8] hover:bg-[#132238] hover:text-white min-h-[116px]"
            >
              <UserPlus className="mb-1.5 h-6 w-6" />
              <span className="font-display text-xs font-bold uppercase">Nuevo</span>
              <span className="mt-0.5 text-[10px] text-[#94a3b8]">Personalizar</span>
            </button>
          </SelectionRail>

          {/* Stage Selector (12 Presidential Palaces) */}
          <div>
            <SelectionRail label="Escenarios" variant="stages">
              {STAGES_DATA.map((st, idx) => (
                <button
                  key={st.id}
                  aria-pressed={stageSel === idx}
                  onClick={() => {
                    sound.uiClick();
                    onChangeStage(idx);
                  }}
                  className={`rounded-md border px-2 py-1.5 text-left transition-all ${
                    stageSel === idx
                      ? 'border-[#ffcc33] bg-[#1f2845] text-white shadow-[0_0_12px_rgba(255,204,51,0.2)]'
                      : 'border-[#232e4d] bg-[#141c32] text-[#94a3b8] hover:border-[#3c4d7a] hover:text-white'
                  }`}
                >
                  <img src={stageArtUrl(st.id, config.video.stageTime === 'night' ? 'night' : 'day')}
                    className="mb-1 aspect-video w-full rounded object-cover" alt="" loading="lazy" />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px] border border-[#1a223a]"
                      style={{ backgroundColor: st.palette.platformTrim }}
                    />
                    <span className="font-display text-[11px] font-bold truncate">{st.name}</span>
                  </div>
                  <div className="text-[10px] opacity-75 truncate pl-3.5">{st.city} · {st.country}</div>
                </button>
              ))}
              <button
                onClick={() => {
                  sound.uiClick();
                  onChangeStage(STAGES_DATA.length);
                }}
                className={`rounded-md border px-2 py-1.5 text-left transition-all ${
                  stageSel >= STAGES_DATA.length
                    ? 'border-[#ffcc33] bg-[#1f2845] text-white shadow-[0_0_12px_rgba(255,204,51,0.2)]'
                    : 'border-[#232e4d] bg-[#141c32] text-[#94a3b8] hover:border-[#3c4d7a] hover:text-white'
                }`}
              >
                <div className="font-display text-[11px] font-bold">Aleatorio</div>
                <div className="text-[10px] opacity-75">Cualquier Palacio</div>
              </button>
            </SelectionRail>
            <p className="mt-2 text-xs text-[#b3bfd5]">
              {config.video.stageTime !== 'day' && config.video.stageTime !== 'night' && 'Día o noche al azar. '}
              {STAGES_DATA[stageSel]?.hazardMsg ?? 'El escenario se sortea al iniciar.'}
            </p>
          </div>
        </div>

        {/* P2 Preview Card */}
        <div className="selector-side">
          <FighterPreviewCard
            slot={1}
            label={vsAI ? `IA (${['Novato', 'Comp.', 'Leyenda', 'Brutal'][config.match.aiDifficulty]})` : 'Jugador 2'}
            president={p2}
            isActive={activeSlot === 1}
            onFocus={() => {
              sound.uiClick();
              if (!remoteOpponent) setActiveSlot(1);
            }}
            onCustomize={() => {
              sound.uiClick();
              onOpenCustomizer(p2);
            }}
          />
        </div>
      </div>

      {/* Bottom Launch Bar */}
      <div className="selector-launch mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              sound.uiConfirm();
              onStartCampaign();
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-[#ff922b]/50 bg-[#1f1926] px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-[#ffd27a] hover:border-[#ffcc33]"
          >
            <Crown className="h-4 w-4 text-[#ffcc33]" />
            Cumbre Mundial (7 Rondas)
          </button>
          <button
            onClick={() => {
              sound.uiClick();
              onStartTraining();
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-[#2a344d] bg-[#131929] px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-[#cbd5e1] hover:text-white"
          >
            <Shield className="h-4 w-4 text-[#38bdf8]" />
            Entrenamiento
          </button>
        </div>

        <button
          disabled={remoteOpponent && !remoteReady}
          onClick={() => {
            sound.uiConfirm();
            void onStartVersus();
          }}
          className="flex min-h-[46px] items-center gap-2.5 rounded-lg bg-[#ffcc33] px-8 py-2.5 font-display text-base font-bold uppercase tracking-wider text-[#0b0e17] transition-transform active:scale-[0.98] hover:bg-[#ffd95e]"
        >
          <Play className="h-4 w-4 fill-current" />
          {remoteOpponent && !remoteReady ? "Esperando a J2" : "¡Pelear!"}
        </button>
      </div>
    </div>
  );
}

function FighterPreviewCard({
  slot,
  label,
  president,
  isActive,
  onFocus,
  onCustomize,
}: {
  slot: 0 | 1;
  label: string;
  president: PresidentData;
  isActive: boolean;
  onFocus: () => void;
  onCustomize: () => void;
}) {
  const accentCol = slot === 0 ? '#ffcc33' : '#38bdf8';
  const moves = useMemo(() => movesFor(president), [president]);
  const statBars = [
    { name: 'Velocidad', val: (president.stats.speed / 6.5) * 100 },
    { name: 'Peso', val: (president.stats.weight / 1.6) * 100 },
    { name: 'Salto', val: (president.stats.jumpForce / 14.5) * 100 },
    { name: 'Potencia', val: (president.stats.power / 1.3) * 100 },
  ];

  return (
    <div
      onClick={onFocus}
      className={`flex h-full cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
        isActive ? 'bg-[#131b31]' : 'bg-[#0e1528]'
      }`}
      style={{
        borderColor: isActive ? accentCol : '#253152',
        boxShadow: isActive ? `0 0 20px ${accentCol}26` : undefined,
      }}
    >
      <div>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider" style={{ color: accentCol }}>
          <span>{label}</span>
          <span className="text-[#94a3b8] font-normal">{president.era}</span>
        </div>

        <div className="mt-3 flex items-center gap-3.5">
          <div className="overflow-hidden rounded-lg border border-[#2c3752] shrink-0">
            <PortraitCanvas president={president} className="h-24 w-24" animate />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-white leading-tight truncate">{president.name}</h3>
            <div className="text-xs text-[#94a3b8] truncate">
              {president.title} · {president.role}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs italic text-[#cbd5e1]">«{president.taunt}»</p>

        {/* Stat Bars */}
        <div className="mt-4 space-y-2">
          {statBars.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>{s.name}</span>
                <span className="font-mono-num text-[#e2e8f0]">{Math.round(s.val)}</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1e273d]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round(s.val))}%`, backgroundColor: president.palette.accent.base }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Moves + Quick Customize Link */}
      <div className="mt-4 space-y-2 border-t border-[#1e273d] pt-3 text-xs">
        <div>
          {moves ? <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {Object.entries({ 'Ligero': moves.neutralAttack(), 'Especial': moves.specialNeutral(), '↑ Especial': moves.specialUp(), '↓ Especial': moves.specialDown() }).map(([key,move]) =>
              <div key={key} className="contents"><dt className="text-[#94a3b8]">{key}</dt><dd>{move.name}</dd></div>)}
          </dl> : <><div className="font-semibold text-[#ffcc33]">Signature: {president.sigName}</div>
          <div className="text-[11px] text-[#94a3b8] leading-snug">{president.ult.sigDesc}</div></>}
        </div>
        <div>
          <div className="font-semibold text-[#38bdf8]">Ultimate: {president.ult.name}</div>
          <div className="text-[11px] text-[#94a3b8] leading-snug">{president.ult.ultDesc}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCustomize();
          }}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#2a344d] bg-[#161e31] py-1.5 text-[11px] font-semibold text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
        >
          <Pencil className="h-3 w-3" />
          {president.isCustom ? 'Editar Luchador' : 'Clonar y Personalizar'}
        </button>
      </div>
    </div>
  );
}

export function RoomCharacterSelect({ roster, roomCode, seat, otherId, pickedId, confirmedId, busy, error, onPick, onConfirm, onLeave, hostOptions }: {
  roster: PresidentData[];
  roomCode: string;
  seat: 1 | 2;
  otherId: string | null;
  hostOptions?: { link: string; onCopy: () => void; onStart: () => void; stage: number; onStage: (index: number) => void };
  pickedId: string;
  confirmedId: string | null;
  busy: boolean;
  error: string;
  onPick: (id: string) => void;
  onConfirm: () => void;
  onLeave: () => void;
}) {
  const [filter, setFilter] = useState<RegionFilter>('all');
  const selected = roster.find(person => person.id === (pickedId || confirmedId));
  const ready = !!selected && confirmedId === selected.id;
  const visible = roster.filter(fighter => matchesFilter(fighter, filter));
  const rival = roster.find(person => person.id === otherId);
  const seats = seat === 1
    ? [{ fighter: selected, confirmed: ready }, { fighter: rival, confirmed: !!rival }]
    : [{ fighter: rival, confirmed: !!rival }, { fighter: selected, confirmed: ready }];

  return <section className="apex-menu apex-selector fixed inset-0 z-[75] flex flex-col overflow-y-auto p-3 sm:p-6 arcade-scroll"
    aria-labelledby="room-fighter-heading">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-[#7dd3fc]">Jugador {seat} · Sala {roomCode}</p>
        <h2 id="room-fighter-heading" className="font-display text-xl font-bold text-white sm:text-3xl">Elige tu luchador</h2>
      </div>
      <button type="button" disabled={busy} onClick={onLeave} className="rounded-lg border border-[#465778] bg-[#182740] px-3 py-2 text-sm">
        Salir de la sala
      </button>
    </div>

    <div className="mx-auto mt-3 grid w-full max-w-6xl grid-cols-2 gap-2">
      {seats.map(({fighter,confirmed},index)=>{
        const own = seat === index + 1;
        return <article key={index} aria-label={`Jugador ${index + 1}`}
          className={`min-w-0 rounded-xl border p-2 sm:p-3 ${own
            ? 'border-[#ffcc33] bg-[#242118]' : 'border-[#304362] bg-[#0d1728]'}`}>
          <p className="text-xs font-bold text-[#f6e4be]">J{index + 1}{own ? ' · Tu lado' : ''}</p>
          {fighter && <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <div className="shrink-0"><PortraitCanvas president={fighter} className="h-9 w-9 rounded sm:h-14 sm:w-14" /></div>
            <h3 className="truncate text-sm font-bold text-white">{fighter.name}</h3>
          </div>}
          <p className="mt-1 text-xs text-[#b8c5dc]">{confirmed ? 'Confirmado' : 'Eligiendo luchador'}</p>
        </article>;
      })}
    </div>
    {hostOptions && <div className="mx-auto mt-3 flex w-full max-w-6xl flex-wrap items-center gap-2">
      <button type="button" onClick={hostOptions.onCopy} className="rounded-md border border-[#465778] px-3 py-2 text-xs">Copiar invitación</button>
      <input readOnly value={hostOptions.link} onFocus={event=>event.target.select()} aria-label="Enlace de invitación"
        className="min-w-0 flex-1 rounded-md border border-[#465778] bg-[#10182a] px-2 py-2 text-xs" />
      <label className="text-xs">Arena <select value={hostOptions.stage} disabled={ready}
        onChange={event=>hostOptions.onStage(Number(event.target.value))}
        className="rounded-md border border-[#465778] bg-[#10182a] p-2">
        {STAGES_DATA.map((stage,index)=><option key={stage.id} value={index}>{stage.name}</option>)}
        <option value={STAGES_DATA.length}>Aleatoria</option>
      </select></label>
    </div>}

    <div className="mx-auto my-3 flex w-full max-w-6xl flex-1 flex-col gap-3">
      <div className="selector-filters flex items-center gap-1.5" aria-label="Filtrar luchadores">
        {REGION_TABS.filter(tab => tab.id !== 'custom').map(tab =>
          <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${filter === tab.id
              ? 'border-[#ffcc33] bg-[#211f1b] text-[#ffcc33]' : 'border-[#303e5c] bg-[#131d30] text-[#cbd5e1]'}`}>
            {tab.label}
          </button>)}
      </div>
      <SelectionRail label="Luchadores" variant="fighters" resetKey={filter}>
        {visible.map(fighter =>
          <button key={fighter.id} type="button" disabled={busy || ready} aria-pressed={selected?.id === fighter.id}
            onClick={() => { sound.uiClick(); onPick(fighter.id); }}
            className={`group flex cursor-pointer flex-col items-center rounded-lg border p-2 text-center ${selected?.id === fighter.id
              ? 'border-[#38bdf8] bg-[#13243b]' : 'border-[#25304d] bg-[#11182c] hover:border-[#4b5f94]'}`}>
            <FighterPreview president={fighter} selected={selected?.id === fighter.id} />
            <span className="w-full truncate font-display text-xs font-bold text-white">{fighter.name}</span>
            <span className="w-full truncate text-[10px] text-[#94a3b8]">{fighter.role}</span>
          </button>)}
      </SelectionRail>
    </div>

    <footer className="selector-launch mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
      <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-[#fda4af]' : 'text-[#cbd5e1]'}`}>
        {error || (ready ? (rival ? 'Los dos jugadores están listos.' : 'Confirmado. Esperando al otro jugador.')
          : 'Selecciona una tarjeta y confirma tu elección.')}
      </p>
      <button type="button" disabled={busy || !selected || ready} onClick={onConfirm}
        className="min-h-[46px] rounded-lg bg-[#ffcc33] px-6 py-2 font-display font-bold text-[#0b0e17] disabled:opacity-45">
        {busy ? 'Procesando…' : ready ? 'Listo' : 'Confirmar luchador'}
      </button>
      {hostOptions && <button type="button" disabled={busy || !ready || !rival} onClick={hostOptions.onStart}
        className="min-h-[46px] rounded-lg bg-[#ffcc33] px-6 py-2 font-display font-bold text-[#0b0e17] disabled:opacity-45">
        ¡Pelear!
      </button>}
    </footer>
  </section>;
}
