import { VictoryShowcase } from './VictoryShowcase';
import { CampaignBracket } from './CampaignBracket';
import { PRESIDENTS_DATA } from "../data/presidents";
import { fighterAsset, fighterArtPath } from "../engine/fighterSprites";
import type { MatchSnapshot, RoomState } from "../network/matchState";
import { ultimateText } from '../engine/presidentUltimates';
import { TouchControls } from './TouchControls';
import {movesFor} from '../combat/roster.js';
import { ChevronLeft, ChevronRight, Code2, Download, Film, Landmark, Pause, Play, RotateCcw, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sound } from '../audio/soundEngine';
import { STAGES_DATA } from '../data/stages';
import {
  CampaignState,
  GameConfig,
  GameMode,
  GameScreenState,
  HudSnapshot,
  MatchReplayData,
  MatchSummary,
  PlayerAction,
  PresidentData,
} from '../types/game';
import { PortraitCanvas } from './PortraitCanvas';

interface GameHUDProps {
  roster: PresidentData[];
  screen: GameScreenState;
  mode: GameMode;
  hud: HudSnapshot | null;
  config: GameConfig;
  campaign: CampaignState | null;
  summary: MatchSummary | null;
  lastReplay: MatchReplayData | null;
  replayFrame: number;
  replayPaused: boolean;
  replaySpeed: 0.5 | 1 | 2;
  replayEnded: boolean;
  onToggleMute: () => void;
  onOpenConfig: () => void;
  onTogglePause: () => void;
  onRestartMatch: () => void;
  onRematch: () => void;
  onExitToSelect: () => void;
  onContinueCampaign: () => void;
  onWatchLastReplay: (fromScreen: 'GAME_OVER' | 'CENSURE' | 'CHAMPION') => void;
  onDownloadReplayJson: () => void;
  onToggleReplayPause: () => void;
  onChangeReplaySpeed: (speed: 0.5 | 1 | 2) => void;
  onRestartReplay: () => void;
  onExitReplay: () => void;
  onSwitchStageLive: (idx: number) => void;
  onTouchAction: (action: PlayerAction, active: boolean) => void;
}

const pctColor = (p: number) =>
  p < 45 ? '#f8fafc' : p < 90 ? '#ffe033' : p < 140 ? '#ff8a1f' : '#ff4d5e';

const pctGlow = (p: number, hitFlash: number) => {
  if (hitFlash > 0) return '0 0 16px rgba(255, 92, 92, 0.85)';
  if (p >= 140) return '0 0 14px rgba(255, 77, 94, 0.65)';
  if (p >= 90) return '0 0 10px rgba(255, 138, 31, 0.45)';
  return '0 2px 6px rgba(10, 16, 32, 0.75)';
};

export function GameHUD({
  roster,
  screen,
  mode,
  hud,
  config,
  campaign,
  summary,
  lastReplay,
  replayFrame,
  replayPaused,
  replaySpeed,
  replayEnded,
  onToggleMute,
  onOpenConfig,
  onTogglePause,
  onRestartMatch,
  onRematch,
  onExitToSelect,
  onContinueCampaign,
  onWatchLastReplay,
  onDownloadReplayJson,
  onToggleReplayPause,
  onChangeReplaySpeed,
  onRestartReplay,
  onExitReplay,
  onSwitchStageLive,
  onTouchAction,
}: GameHUDProps) {
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [stageMenuOpen, setStageMenuOpen] = useState(false);

  const replayJsonSnippet = useMemo(() => {
    if (!lastReplay || !showJsonPreview) return '';
    return JSON.stringify(lastReplay, null, 2);
  }, [lastReplay, showJsonPreview]);

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const showTouch =
    screen === 'PLAYING' &&
    (config.controls.touchMode === 'on' || (config.controls.touchMode === 'auto' && isTouchDevice));

  const isReplay = screen === 'REPLAY';

  return (
    <>
      {/* Active Playing / Replay HUD (pointer-events-none, zero backdrop-filter over canvas) */}
      {(screen === 'PLAYING' || screen === 'PAUSED' || isReplay) && hud && (
        <div className="match-hud pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
          {/* Top Bar: Match Timer + Live Stage Switcher + Hazard Alert + Quick Controls */}
          <div className="match-toolbar flex items-start justify-between gap-2 sm:gap-3">
            <div className="relative flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-[#2c3959] bg-[#0c1224]/88 px-3 py-1.5 text-xs font-semibold text-[#e2e8f0] shadow-[0_4px_14px_rgba(8,12,26,0.5)]">
                {isReplay && lastReplay ? (
                  <>
                    <span className="flex items-center gap-1.5 font-display font-bold uppercase tracking-wider text-[#c084fc]">
                      <Film className="h-3.5 w-3.5" />
                      Repetición
                    </span>
                    <span aria-hidden="true" className="text-[#475569]">·</span>
                    <span className="font-mono-num text-[#ffcc33]">
                      {Math.floor(hud.roundTimeSec / 60)}:{String(hud.roundTimeSec % 60).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true" className="text-[#475569]">·</span>
                    <span className="font-mono-num text-[#94a3b8]">
                      F {Math.min(replayFrame, lastReplay.totalFrames)}/{lastReplay.totalFrames}
                    </span>
                    <span aria-hidden="true" className="hidden sm:inline text-[#475569]">·</span>
                    <span className="hidden sm:inline text-[#7dd3fc] truncate max-w-[140px]">{hud.stageName}</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono-num text-[#ffcc33]">
                      {Math.floor(hud.roundTimeSec / 60)}:{String(hud.roundTimeSec % 60).padStart(2, '0')}
                    </span>
                    {hud.campaignRound !== null && (
                      <>
                        <span aria-hidden="true" className="text-[#475569]">·</span>
                        <span className="whitespace-nowrap">Ronda {hud.campaignRound}/7</span>
                        <span aria-hidden="true" className="text-[#475569]">·</span>
                        <span className="font-mono-num text-[#38bdf8] whitespace-nowrap">{hud.campaignScore} pts</span>
                      </>
                    )}
                    {mode === 'training' && (
                      <>
                        <span aria-hidden="true" className="text-[#475569]">·</span>
                        <span className="text-[#38bdf8] whitespace-nowrap">Entrenamiento</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Live 12-Palace Stage Switcher (only in live match/pause, never in deterministic replay) */}
              {!isReplay && (
                <div className="pointer-events-auto relative flex items-center rounded-lg border border-[#2c3959] bg-[#0c1224]/88 text-xs font-semibold text-[#e2e8f0] shadow-[0_4px_14px_rgba(8,12,26,0.5)]">
                  <button
                    type="button"
                    onClick={() => {
                      sound.uiClick();
                      setStageMenuOpen(false);
                      onSwitchStageLive((hud.stageIdx - 1 + STAGES_DATA.length) % STAGES_DATA.length);
                    }}
                    title="Palacio anterior"
                    aria-label="Palacio anterior"
                    className="flex h-8 w-7 items-center justify-center rounded-l-lg text-[#94a3b8] transition-colors hover:bg-[#17213b] hover:text-[#ffcc33]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.uiClick();
                      setStageMenuOpen((v) => !v);
                    }}
                    title="Cambiar Palacio Presidencial en vivo (Atajo: F2)"
                    className="flex h-8 items-center gap-1.5 px-2 transition-colors hover:text-white whitespace-nowrap shrink-0"
                  >
                    <Landmark className="h-3.5 w-3.5 text-[#ffcc33]" />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide max-w-[125px] sm:max-w-[170px] truncate">
                      {hud.stageName}
                    </span>
                    <span className="hidden md:inline font-mono-num text-[10px] text-[#7dd3fc]/80">F2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.uiClick();
                      setStageMenuOpen(false);
                      onSwitchStageLive((hud.stageIdx + 1) % STAGES_DATA.length);
                    }}
                    title="Siguiente palacio (F2)"
                    aria-label="Siguiente palacio"
                    className="flex h-8 w-7 items-center justify-center rounded-r-lg text-[#94a3b8] transition-colors hover:bg-[#17213b] hover:text-[#ffcc33]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {stageMenuOpen && (
                    <div className="absolute left-0 top-full z-40 mt-2 w-[300px] sm:w-[440px] rounded-xl border border-[#34436a] bg-[#0b1122]/96 p-2.5 shadow-[0_14px_34px_rgba(6,10,24,0.85)]">
                      <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        <span>Cambiar Palacio en Vivo ({STAGES_DATA.length} Sedes)</span>
                        <span className="font-mono-num text-[#7dd3fc]">Atajo F2</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto arcade-scroll">
                        {STAGES_DATA.map((st, idx) => {
                          const active = idx === hud.stageIdx;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                sound.uiConfirm();
                                setStageMenuOpen(false);
                                onSwitchStageLive(idx);
                              }}
                              className={`flex flex-col rounded-md border px-2 py-1.5 text-left transition-colors ${
                                active
                                  ? 'border-[#ffcc33] bg-[#1e2642] text-white shadow-[0_0_12px_rgba(255,204,51,0.22)]'
                                  : 'border-[#232e4d] bg-[#111930] text-[#cbd5e1] hover:border-[#4b5f94] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-[2px] border border-[#1a2238]"
                                  style={{ backgroundColor: st.palette.platformTrim }}
                                />
                                <span className="font-display text-[11px] font-bold truncate">{st.name}</span>
                              </div>
                              <span className="pl-3.5 text-[10px] text-[#94a3b8] truncate">{st.country}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Center Hazard Telegraph / Active Banner */}
            <div className="flex-1 flex justify-center">
              {hud.hazardWarning && (
                <div className="rounded-md border border-[#ef4444] bg-[#7f1d1d]/95 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
                  ⚠ {hud.hazardWarning}
                </div>
              )}
              {!hud.hazardWarning && hud.hazardActive && (
                <div className="rounded-md border border-[#f59e0b]/70 bg-[#0b0f1b]/90 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-[#fcd34d] sm:text-sm">
                  {hud.hazardActive}
                </div>
              )}
            </div>

            {/* Right Action Icons (pointer-events-auto) */}
            {isReplay ? (
              <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  onClick={() => {
                    sound.uiClick();
                    onToggleReplayPause();
                  }}
                  aria-label={replayPaused ? 'Reproducir' : 'Pausar'}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-[#a855f7]/60 bg-[#1a132b]/95 px-3 text-xs font-bold text-white hover:border-[#c084fc]"
                >
                  {replayPaused ? <Play className="h-3.5 w-3.5 fill-current text-[#ffcc33]" /> : <Pause className="h-3.5 w-3.5 text-[#ffcc33]" />}
                  <span className="hidden sm:inline">{replayPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>

                {([0.5, 1, 2] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      sound.uiClick();
                      onChangeReplaySpeed(spd);
                    }}
                    className={`h-9 rounded-lg border px-2.5 font-mono-num text-xs font-bold transition-colors ${
                      replaySpeed === spd
                        ? 'border-[#ffcc33] bg-[#242118] text-[#ffcc33]'
                        : 'border-[#2a344d] bg-[#0b0f1b]/90 text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}

                <button
                  onClick={() => {
                    sound.uiClick();
                    onRestartReplay();
                  }}
                  aria-label="Reiniciar repetición"
                  title="Reiniciar repetición"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    sound.uiClick();
                    onDownloadReplayJson();
                  }}
                  aria-label="Descargar JSON"
                  title="Descargar JSON de entradas"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </button>

                <button
                  onClick={onToggleMute}
                  aria-label={config.audio.muted ? 'Activar audio' : 'Silenciar audio'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
                >
                  {config.audio.muted ? <VolumeX className="h-4 w-4 text-[#ef4444]" /> : <Volume2 className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => {
                    sound.uiClick();
                    onExitReplay();
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-[#ef4444]/50 bg-[#241118]/95 px-3 text-xs font-bold text-[#fecaca] hover:border-[#ef4444] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Salir
                </button>
              </div>
            ) : (
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  onClick={onToggleMute}
                  aria-label={config.audio.muted ? 'Activar audio' : 'Silenciar audio'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
                >
                  {config.audio.muted ? <VolumeX className="h-4 w-4 text-[#ef4444]" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    sound.uiClick();
                    onOpenConfig();
                  }}
                  aria-label="Configuración"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    sound.uiClick();
                    onTogglePause();
                  }}
                  aria-label="Pausa"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-[#2a344d] bg-[#0b0f1b]/90 px-3 text-xs font-bold text-[#e2e8f0] hover:border-[#ffcc33] hover:text-white"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pausa</span>
                </button>
              </div>
            )}
          </div>

          {/* Minimalist Reactive Bottom Fighter Status Plates */}
          <div className="match-fighter-cards flex items-end justify-between gap-3">
            {hud.fighters.map((f) => {
              const pres = roster.find((p) => p.id === f.id) || roster[0];
              const art = fighterArtPath(pres);
              const ultReady = f.vote >= 100;
              const isGun = f.weaponKind === 'mg' || f.weaponKind === 'rocket';
              const highPct = f.pct >= 100;
              const hitActive = f.hitFlash > 0;
              const label = f.isBoss ? 'JEFE' : f.pi === 0 ? 'J1' : f.isAI ? 'IA' : 'J2';
              const cardShadow = hitActive
                ? `0 0 22px rgba(255, 77, 94, 0.55), inset 0 0 12px rgba(255, 77, 94, 0.18)`
                : ultReady
                  ? `0 0 18px rgba(255, 204, 51, 0.32), 0 6px 18px rgba(8, 12, 26, 0.65)`
                  : highPct
                    ? `0 0 16px ${f.accent}44, 0 6px 18px rgba(8, 12, 26, 0.65)`
                    : `0 8px 22px rgba(6, 10, 22, 0.7)`;

              return (
                <div
                  key={f.pi}
                  className={`match-fighter-card relative flex w-[214px] sm:w-[268px] flex-col gap-1.5 overflow-hidden rounded-xl border p-2 sm:p-2.5 transition-transform duration-100 ${
                    hitActive ? 'scale-[1.02]' : ''
                  } ${art ? 'has-art' : ''}`}
                  style={{
                    ['--pc' as any]: f.accent,
                    borderColor: hitActive ? '#ff5c6c' : ultReady ? '#ffcc33' : `${f.accent}bb`,
                    boxShadow: cardShadow,
                    background: art
                      ? `linear-gradient(135deg, rgba(8,14,26,.95) 0%, rgba(10,18,34,.84) 42%, rgba(10,18,34,.48) 100%), right center/cover no-repeat url("${fighterAsset(art, 'selection.webp')}")`
                      : 'linear-gradient(180deg,#10192c,#0b1222)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r" style={{ background: f.accent }} />

                  <div className="relative z-[1] flex items-start justify-between gap-2.5 pl-1.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="shrink-0 overflow-hidden rounded-lg border bg-[#0d1628]/90"
                        style={{
                          borderColor: ultReady ? '#ffcc33' : `${f.accent}88`,
                          boxShadow: ultReady ? '0 0 12px rgba(255, 204, 51, 0.4)' : `0 0 10px ${f.accent}22`,
                        }}
                      >
                        <PortraitCanvas president={pres} className="match-portrait h-11 w-11 sm:h-12 sm:w-12" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-display text-[10px] font-extrabold uppercase tracking-[.14em] sm:text-[11px]">
                          <span style={{ color: f.accent }}>{label}</span>
                          {f.isAI && <span className="rounded bg-[#1a2740] px-1.5 py-px text-[9px] tracking-[.08em] text-[#9ecbff]">CPU</span>}
                        </div>
                        <div className="truncate font-display text-xs font-bold leading-tight text-white sm:text-sm">
                          {f.name}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {mode === 'training' ? (
                              <span className="font-mono-num text-[10px] font-semibold text-[#38bdf8]">∞ LIBRE</span>
                            ) : (
                              Array.from({ length: f.maxStocks }).map((_, idx) => {
                                const alive = idx < f.stocks;
                                return (
                                  <span
                                    key={idx}
                                    className="h-2.5 w-2.5 rotate-45 rounded-[2px] border border-[#0b1222] transition-all"
                                    style={{
                                      backgroundColor: alive ? f.accent : '#1a2740',
                                      boxShadow: alive ? `0 0 8px ${f.accent}cc` : undefined,
                                    }}
                                  />
                                );
                              })
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider ${
                              f.dashReady ? 'text-[#7dd3fc]' : 'text-[#4b607f]'
                            }`}
                          >
                            {f.dashReady ? 'DASH' : 'CD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`match-damage font-mono-num text-3xl font-black leading-none sm:text-4xl transition-transform duration-75 ${
                          hitActive ? '-translate-y-0.5 scale-105' : ''
                        }`}
                        style={{
                          color: pctColor(f.pct),
                          textShadow: pctGlow(f.pct, f.hitFlash),
                        }}
                      >
                        {f.pct}<span className="ml-0.5 text-[0.45em] font-extrabold text-[#cbd5e1]/80 align-top">%</span>
                      </div>
                    </div>
                  </div>

                  {(f.hitStun > 0 || f.floating || f.weaponKind || (f.combo >= 2 && f.comboTimer > 0)) && (
                    <div className="match-fighter-badges relative z-[1] flex flex-wrap items-center justify-between gap-1.5 pl-1.5 text-[10px] font-semibold">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {f.hitStun > 0 && (
                          <span className="rounded border border-[#ff5c6c]/70 bg-[#4c1220]/90 px-1.5 py-0.5 font-mono-num text-[9px] font-bold uppercase text-[#fecaca]">
                            STUN
                          </span>
                        )}
                        {f.floating && f.hitStun <= 0 && (
                          <span className="rounded border border-[#34d399]/65 bg-[#083d33]/85 px-1.5 py-0.5 font-mono-num text-[9px] font-bold uppercase text-[#a7f3d0]">
                            LEVITANDO
                          </span>
                        )}
                        {f.combo >= 2 && f.comboTimer > 0 && (
                          <span className="rounded border border-[#fb923c]/70 bg-[#2c170b]/90 px-1.5 py-0.5 font-mono-num text-[9px] font-bold uppercase text-[#ffd23f]">
                            {f.combo} HITS · ×{f.comboMultiplier.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {f.weaponKind && (
                        <span className="truncate font-mono-num text-[10px] font-bold text-[#ffd23f]">
                          {f.weaponKind === 'mg' ? 'METRALLETA' : f.weaponKind === 'rocket' ? 'COHETE' : 'MALETÍN'}{' '}
                          {isGun ? `${f.ammo}/${f.maxAmmo}` : `${f.weaponTimer}s`}
                        </span>
                      )}
                    </div>
                  )}

                  {isGun && f.reloading && (
                    <div className="relative z-[1] ml-1.5 h-2 overflow-hidden rounded-full border border-[#f59e0b]/60 bg-[#101a2f]">
                      <div
                        className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fcd34d] transition-all duration-75"
                        style={{ width: `${Math.round(f.reloadProgress * 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="relative z-[1] flex items-center gap-2 pl-1.5">
                    <div
                      className={`relative h-2.5 flex-1 overflow-hidden rounded-full border bg-[#0f1a2f] ${
                        ultReady ? 'border-[#ffcc33] hud-ult-glow' : 'border-[#273456]'
                      }`}
                    >
                      <div
                        className="h-full transition-all duration-100"
                        style={{
                          width: `${Math.min(100, f.vote)}%`,
                          background: ultReady
                            ? 'linear-gradient(90deg,#ffe27a,#ffbf1a)'
                            : `linear-gradient(90deg,${f.accent}aa,${f.accent})`,
                          boxShadow: ultReady ? '0 0 10px rgba(255, 204, 51, 0.85)' : `0 0 8px ${f.accent}55`,
                        }}
                      />
                    </div>
                    <span
                      className={`whitespace-nowrap font-mono-num text-[10px] font-extrabold tracking-wider ${
                        ultReady ? 'text-[#ffcc33]' : 'text-[#9bb3d4]'
                      }`}
                    >
                      {ultReady ? 'ULT LISTO' : `ULT ${f.vote}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Touch Controls */}
      {showTouch && (
        <TouchControls
          scale={config.controls.touchScale ?? 1}
          ultReady={Boolean(hud?.fighters[0] && hud.fighters[0].vote >= 100)}
          hasGun={Boolean(hud?.fighters[0] && (hud.fighters[0].weaponKind === 'mg' || hud.fighters[0].weaponKind === 'rocket'))}
          onAction={onTouchAction}
        />
      )}

      {/* Campaign VS Ladder Screen */}
      {screen === 'VS' && campaign && (
        <div className="apex-overlay absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-[#090c14]/94 p-6 text-center">
          <div className="font-display text-sm font-bold uppercase tracking-widest text-[#ffcc33]">
            {campaign.round === 6 ? '★ Gran Final Mundial ★' : `Ronda ${campaign.round + 1} de 7`}
          </div>
          <div className="mt-4 w-full max-w-4xl px-2">
            <CampaignBracket campaign={campaign} roster={roster} state="active" />
          </div>

          <div className="my-8 flex items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="overflow-hidden rounded-xl border-2 border-[#ffcc33]">
                <PortraitCanvas president={roster[campaign.hero] || roster[0]} className="h-20 w-20" animate />
              </div>
              <div className="mt-2 font-display text-lg font-bold text-white">
                {(roster[campaign.hero] || roster[0]).name}
              </div>
            </div>

            <div className="font-display text-3xl font-bold text-[#ef4444]">VS</div>

            <div className="flex flex-col items-center">
              <div className="overflow-hidden rounded-xl border-2 border-[#38bdf8]">
                <PortraitCanvas
                  president={roster[campaign.ladder[campaign.round]] || roster[0]}
                  className="h-20 w-20"
                  animate
                />
              </div>
              <div className="mt-2 font-display text-lg font-bold text-white">
                {campaign.round === 6 ? 'LÍDER SUPREMO · ' : ''}
                {(roster[campaign.ladder[campaign.round]] || roster[0]).name}
              </div>
            </div>
          </div>

          <p className="text-sm italic text-[#cbd5e1]">
            «{(roster[campaign.ladder[campaign.round]] || roster[0]).taunt}»
          </p>
          <p className="mt-2 font-mono-num text-xs text-[#94a3b8]">
            Puntuación acumulada: {campaign.score}
            {campaign.lastRoundScore > 0 ? ` (+${campaign.lastRoundScore} última ronda)` : ''}
          </p>
        </div>
      )}

      {/* Pause Modal */}
      {screen === 'PAUSED' && hud && (
        <div data-gamepad-overlay className="apex-overlay absolute inset-0 z-30 flex items-center justify-center bg-[#070a12]/88 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-5 overflow-y-auto rounded-xl border border-[#2a344d] bg-[#111726] p-6">
            <div className="flex items-center justify-between border-b border-[#222b42] pb-3">
              <h2 className="font-display text-2xl font-bold uppercase text-[#ffcc33]">Combate en Pausa</h2>
              <button
                onClick={() => {
                  sound.uiClick();
                  onOpenConfig();
                }}
                className="flex items-center gap-2 rounded-lg border border-[#2f3b57] bg-[#182034] px-3.5 py-2 text-xs font-bold text-white hover:border-[#ffcc33]"
              >
                <Settings className="h-4 w-4 text-[#ffcc33]" />
                Configuración
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hud.fighters.map((f) => {
                const d = roster.find((p) => p.id === f.id) || roster[0];
                const moves = movesFor(d);
                const ultimate = ultimateText(d);
                return (
                  <div key={f.pi} className="rounded-lg border border-[#252f47] bg-[#151c2e] p-4 space-y-2 text-xs">
                    <div className="font-display text-sm font-bold text-[#ffcc33]">
                      {f.pi === 0 ? 'J1' : f.isAI ? 'IA' : 'J2'} · {d.name}
                    </div>
                    <p className="text-[#cbd5e1]">
                      {moves && <><strong className="text-white">Ligero</strong> · {moves.neutralAttack().name}<br /></>}
                      <strong className="text-white">{moves?.specialNeutral().name ?? d.sigName}</strong>
                      {' · ↑ '+(moves?.specialUp().name ?? '')+' · ↓ '+(moves?.specialDown().name ?? '')}
                    </p>
                    <p className="text-[#cbd5e1]">
                      <strong className="text-white">Ultimate ({ultimate.name}):</strong> {ultimate.ultDesc}
                    </p>
                    <p className="text-[#94a3b8]">
                      <strong className="text-[#38bdf8]">Cómo esquivarlo:</strong> {ultimate.dodgeTip}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-[#94a3b8]">
              Esquivar un Ultimate con Dash justo en el impacto activa <strong className="text-[#38bdf8]">Esquive Perfecto</strong> (+20% Voto Popular y cámara lenta).
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-[#222b42]">
              <button
                onClick={onExitToSelect}
                className="rounded-lg border border-[#2f3b57] bg-[#161e31] px-4 py-2.5 text-xs font-bold text-[#cbd5e1] hover:text-white"
              >
                Salir al Menú
              </button>
              <button
                onClick={onRestartMatch}
                className="flex items-center gap-2 rounded-lg border border-[#2f3b57] bg-[#161e31] px-4 py-2.5 text-xs font-bold text-white hover:border-[#ffcc33]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar Pelea
              </button>
              <button
                data-gamepad-back
                data-gamepad-initial
                onClick={onTogglePause}
                className="rounded-lg bg-[#ffcc33] px-6 py-2.5 font-display text-sm font-bold text-[#0b0e17] hover:bg-[#ffd95e]"
              >
                Reanudar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replay Completed Overlay */}
      {isReplay && replayEnded && (
        <div data-gamepad-overlay className="apex-overlay absolute inset-0 z-30 flex items-center justify-center bg-[#070a12]/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#a855f7]/60 bg-[#111726] p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-[#c084fc]">Secuencia Completada</div>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase text-white">Repetición Finalizada</h2>
            {lastReplay && (
              <p className="mt-2 font-mono-num text-xs text-[#94a3b8]">
                {lastReplay.keyframes.length} eventos de entrada · {lastReplay.totalFrames} frames · Seed #{lastReplay.seed}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={() => {
                  sound.uiClick();
                  onRestartReplay();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#a855f7]/60 bg-[#1c1430] py-2.5 text-xs font-bold text-[#e9d5ff] hover:border-[#c084fc] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Repetir
              </button>
              <button
                onClick={() => {
                  sound.uiClick();
                  onDownloadReplayJson();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#2f3b57] bg-[#161e31] py-2.5 text-xs font-bold text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </button>
              <button
                data-gamepad-back
                onClick={() => {
                  sound.uiClick();
                  onExitReplay();
                }}
                className="flex-1 rounded-lg bg-[#ffcc33] py-2.5 font-display text-sm font-bold text-[#0b0e17] hover:bg-[#ffd95e]"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versus Game Over */}
      {screen === 'GAME_OVER' && summary && (
        <div data-gamepad-overlay className="apex-overlay absolute inset-0 z-30 flex items-center justify-center bg-[#070a12]/90 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-[#2a344d] bg-[#111726] p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ffcc33]">Presidente Electo</div>
            <h2 className="mt-1 font-display text-3xl font-bold uppercase text-white">{summary.winnerName}</h2>

            <VictoryShowcase fighter={roster.find(p => p.id === summary.winnerId) ?? roster[0]} />

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#222b42] bg-[#0c101c] p-3 text-xs sm:grid-cols-4">
              <div>
                <div className="text-[#94a3b8]">Duración</div>
                <div className="font-mono-num font-bold text-white">{summary.durationSec}s</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Daño</div>
                <div className="font-mono-num font-bold text-[#ffcc33]">{summary.damageDealt}%</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Combo Máx.</div>
                <div className="font-mono-num font-bold text-[#fb923c]">{summary.maxCombo ?? 0} hits</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Esquives Perf.</div>
                <div className="font-mono-num font-bold text-[#38bdf8]">{summary.perfectDodges}</div>
              </div>
            </div>

            {/* Replay + JSON Sequence Controls */}
            {lastReplay && (
              <div className="mt-4 space-y-2 rounded-lg border border-[#272f4a] bg-[#0e1322] p-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#e9d5ff]">Repetición Guardada (JSON)</div>
                    <div className="font-mono-num text-[10px] text-[#94a3b8]">
                      {lastReplay.keyframes.length} keyframes · {lastReplay.totalFrames} frames · Seed #{lastReplay.seed}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        sound.uiConfirm();
                        onWatchLastReplay('GAME_OVER');
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-[#a855f7]/60 bg-[#24163b] px-3 py-1.5 text-xs font-bold text-white hover:border-[#c084fc]"
                    >
                      <Film className="h-3.5 w-3.5 text-[#c084fc]" />
                      Ver Repetición
                    </button>
                    <button
                      onClick={() => {
                        sound.uiClick();
                        onDownloadReplayJson();
                      }}
                      title="Descargar archivo JSON"
                      className="flex items-center gap-1 rounded-md border border-[#2f3b57] bg-[#161e31] px-2.5 py-1.5 text-xs font-semibold text-[#7dd3fc] hover:border-[#38bdf8] hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      JSON
                    </button>
                    <button
                      onClick={() => {
                        sound.uiClick();
                        setShowJsonPreview((v) => !v);
                      }}
                      title="Ver secuencia JSON"
                      className="flex items-center gap-1 rounded-md border border-[#2f3b57] bg-[#161e31] px-2.5 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {showJsonPreview && (
                  <pre className="max-h-36 overflow-auto rounded border border-[#1f2840] bg-[#070a12] p-2 font-mono-num text-[10px] leading-relaxed text-[#7dd3fc] arcade-scroll">
                    {replayJsonSnippet}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                data-gamepad-back
                onClick={onExitToSelect}
                className="flex-1 rounded-lg border border-[#2f3b57] bg-[#161e31] py-2.5 text-xs font-bold text-[#cbd5e1] hover:text-white"
              >
                Cambiar Luchadores
              </button>
              <button
                onClick={onRematch}
                className="flex-1 rounded-lg bg-[#ffcc33] py-2.5 font-display text-sm font-bold text-[#0b0e17] hover:bg-[#ffd95e]"
              >
                Revancha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Censure / Continue */}
      {screen === 'CENSURE' && campaign && (
        <div data-gamepad-overlay className="apex-overlay absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#070a12]/90 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#ef4444]/50 bg-[#111726] p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ef4444]">Moción de Censura</div>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">¿Continuar Campaña?</h2>
            <p className="mt-2 text-xs text-[#94a3b8]">
              Caíste en la ronda {campaign.round + 1} de 7 ante {(roster[campaign.ladder[campaign.round]] || roster[0]).name}.
              Tu progreso en la escalera se conserva.
            </p>
            <div className="mt-4">
              <CampaignBracket campaign={campaign} roster={roster} state="lost" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                data-gamepad-back
                onClick={onExitToSelect}
                className="flex-1 rounded-lg border border-[#2f3b57] bg-[#161e31] py-2.5 text-xs font-bold text-[#cbd5e1] hover:text-white"
              >
                Abandonar
              </button>
              {lastReplay && (
                <button
                  onClick={() => {
                    sound.uiClick();
                    onWatchLastReplay('CENSURE');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#a855f7]/60 bg-[#1c1430] px-3.5 py-2.5 text-xs font-bold text-[#e9d5ff] hover:border-[#c084fc]"
                >
                  <Film className="h-3.5 w-3.5" />
                  Repetición
                </button>
              )}
              <button
                onClick={onContinueCampaign}
                className="flex-1 rounded-lg bg-[#ffcc33] py-2.5 font-display text-sm font-bold text-[#0b0e17] hover:bg-[#ffd95e]"
              >
                Reintentar Ronda {campaign.round + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Champion */}
      {screen === 'CHAMPION' && campaign && (
        <div data-gamepad-overlay className="apex-overlay absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#070a12]/90 p-4">
          <div className="w-full max-w-4xl rounded-xl border-2 border-[#ffcc33] bg-[#111726] p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ffcc33]">★ Victoria Total ★</div>
            <h2 className="mt-1 font-display text-3xl font-bold uppercase text-white">
              ¡Líder Supremo Mundial!
            </h2>
            <VictoryShowcase fighter={roster[campaign.hero] ?? roster[0]} />
            <div className="font-display text-xl font-bold text-[#ffcc33]">
              {(roster[campaign.hero] || roster[0]).name}
            </div>
            <div className="mt-4">
              <CampaignBracket campaign={campaign} roster={roster} state="won" />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg border border-[#222b42] bg-[#0c101c] p-3 text-xs">
              <div>
                <div className="text-[#94a3b8]">KOs</div>
                <div className="font-mono-num font-bold text-white">{campaign.kos}</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Tiempo</div>
                <div className="font-mono-num font-bold text-white">
                  {Math.floor(campaign.timeFrames / 3600)}:
                  {String(Math.floor((campaign.timeFrames / 60) % 60)).padStart(2, '0')}
                </div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Continues</div>
                <div className="font-mono-num font-bold text-white">{campaign.continues}</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Puntos</div>
                <div className="font-mono-num font-bold text-[#ffcc33]">{campaign.score}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {lastReplay && (
                <button
                  onClick={() => {
                    sound.uiClick();
                    onWatchLastReplay('CHAMPION');
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#a855f7]/60 bg-[#1c1430] px-4 py-3 text-xs font-bold text-[#e9d5ff] hover:border-[#c084fc] hover:text-white"
                >
                  <Film className="h-4 w-4" />
                  Ver Repetición Final
                </button>
              )}
              <button
                data-gamepad-back
                onClick={onExitToSelect}
                className="flex-1 rounded-lg bg-[#ffcc33] py-3 font-display text-sm font-bold uppercase text-[#0b0e17] hover:bg-[#ffd95e]"
              >
                Volver al Menú Principal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OnlineGameHUD({ fighters, room, localSlot }: {
  fighters: MatchSnapshot['players']; room: RoomState; localSlot: number;
}) {
  return <div className={`online-hud ${room.maxPlayers === 2 ? 'online-duel-hud' : ''}`} aria-label="Estado del combate">
    {fighters.map(f => {
      const president = PRESIDENTS_DATA.find(p => p.id === f.fighterId);
      const label = president?.name ?? f.fighterId;
      return <article key={f.slot} style={{ borderColor: room.players[f.slot]?.color }} aria-label={label}>
        {president && fighterArtPath(president) && <img src={fighterAsset(fighterArtPath(president)!, 'thumb.webp')} alt="" />}
        <div><strong title={label}>J{f.slot + 1}{f.slot === localSlot ? ' · Tú' : ''} · {label}</strong>
          <small>{Math.floor(f.damage)} % · {f.stocks} vidas</small>
          <progress max={100} value={f.ultCharge} aria-label={`Definitiva de ${label}`} /></div>
      </article>;
    })}
  </div>;
}
