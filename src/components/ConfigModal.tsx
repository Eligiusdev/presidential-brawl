import { useEffect, useState } from 'react';
import { Gamepad2, Monitor, RotateCcw, Sliders, Volume2, X } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { ACTION_LABELS, DEFAULT_CONFIG, DEFAULT_P1_KEYS, DEFAULT_P2_KEYS, formatKeyCode, PIXEL_PRESET_DIMS } from '../config/defaultConfig';
import {
  CrtFilterPreset,
  GameConfig,
  HazardFrequency,
  ItemSpawnRate,
  ParticleDensity,
  PixelResolutionPreset,
  PlayerAction,
  TouchMode,
} from '../types/game';

interface ConfigModalProps {
  config: GameConfig;
  onChange: (next: GameConfig) => void;
  onClose: () => void;
}

type ConfigTab = 'video' | 'match' | 'controls' | 'audio';

export function ConfigModal({ config, onChange, onClose }: ConfigModalProps) {
  const [tab, setTab] = useState<ConfigTab>('video');
  const [listening, setListening] = useState<{ player: 'p1' | 'p2'; action: PlayerAction } | null>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      const next = structuredClone(config);
      next.controls[listening.player][listening.action] = [e.code];
      onChange(next);
      sound.uiConfirm();
      setListening(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, config, onChange]);

  const updateVideo = <K extends keyof GameConfig['video']>(k: K, v: GameConfig['video'][K]) => {
    sound.uiClick();
    onChange({ ...config, video: { ...config.video, [k]: v } });
  };

  const updateMatch = <K extends keyof GameConfig['match']>(k: K, v: GameConfig['match'][K]) => {
    sound.uiClick();
    onChange({ ...config, match: { ...config.match, [k]: v } });
  };

  const updateAudio = <K extends keyof GameConfig['audio']>(k: K, v: GameConfig['audio'][K]) => {
    onChange({ ...config, audio: { ...config.audio, [k]: v } });
  };

  const updateControls = <K extends keyof GameConfig['controls']>(k: K, v: GameConfig['controls'][K]) => {
    sound.uiClick();
    onChange({ ...config, controls: { ...config.controls, [k]: v } });
  };

  const resetAll = () => {
    sound.uiConfirm();
    onChange(structuredClone(DEFAULT_CONFIG));
  };

  const resetKeys = () => {
    sound.uiConfirm();
    onChange({
      ...config,
      controls: {
        ...config.controls,
        p1: structuredClone(DEFAULT_P1_KEYS),
        p2: structuredClone(DEFAULT_P2_KEYS),
      },
    });
  };

  const tabs: Array<{ id: ConfigTab; label: string; icon: typeof Monitor }> = [
    { id: 'video', label: 'Pixelación y Video', icon: Monitor },
    { id: 'match', label: 'Reglas de Combate', icon: Sliders },
    { id: 'controls', label: 'Controles', icon: Gamepad2 },
    { id: 'audio', label: 'Audio', icon: Volume2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a12]/88 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#2a344d] bg-[#111726] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222b42] px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-[#ffcc33]">
              Configuración del Sistema
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Ajusta la resolución de pixel art, física de combate, teclado y audio
            </p>
          </div>
          <button
            onClick={() => {
              sound.uiClick();
              onClose();
            }}
            aria-label="Cerrar configuración"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2c3752] bg-[#182034] text-[#cbd5e1] transition-colors hover:bg-[#232f4a] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#222b42] bg-[#0d121e] px-6 py-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  sound.uiClick();
                  setTab(t.id);
                }}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#ffcc33] text-[#0b0e17]'
                    : 'text-[#94a3b8] hover:bg-[#1a2236] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="arcade-scroll flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'video' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#cbd5e1] mb-3">
                  Resolución Nativa del Búfer Pixelado
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(Object.keys(PIXEL_PRESET_DIMS) as PixelResolutionPreset[]).map((preset) => {
                    const info = PIXEL_PRESET_DIMS[preset];
                    const selected = config.video.pixelPreset === preset;
                    return (
                      <button
                        key={preset}
                        onClick={() => updateVideo('pixelPreset', preset)}
                        className={`flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors ${
                          selected
                            ? 'border-[#ffcc33] bg-[#1f2942] text-white'
                            : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8] hover:border-[#3e4e73]'
                        }`}
                      >
                        <span className="font-display text-sm font-bold text-[#ffcc33]">{info.label}</span>
                        <span className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{info.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#cbd5e1] mb-3">
                  Filtro de Pantalla / Shader Arcade
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ['none', 'Nítido Puro', 'Píxeles crudos sin líneas'],
                      ['scanlines', 'CRT Scanlines', 'Líneas de escaneo clásicas'],
                      ['pvm', 'Monitor PVM', 'Trama RGB + viñeta arcade'],
                    ] as Array<[CrtFilterPreset, string, string]>
                  ).map(([val, title, desc]) => (
                    <button
                      key={val}
                      onClick={() => updateVideo('crtFilter', val)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        config.video.crtFilter === val
                          ? 'border-[#ffcc33] bg-[#1f2942] text-white'
                          : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8] hover:border-[#3e4e73]'
                      }`}
                    >
                      <div className="font-display text-sm font-bold">{title}</div>
                      <div className="mt-0.5 text-xs text-[#94a3b8]">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ToggleRow
                  label="Contornos Pixelados Anatómicos"
                  desc="Delineado oscuro de 1px en extremidades y rostro"
                  checked={config.video.pixelOutlines}
                  onChange={(v) => updateVideo('pixelOutlines', v)}
                />
                <ToggleRow
                  label="Iluminación Ambiental Dinámica"
                  desc="Tinte atmosférico por escenario y destellos"
                  checked={config.video.dynamicLighting}
                  onChange={(v) => updateVideo('dynamicLighting', v)}
                />
                <ToggleRow
                  label="Hitstop Cinematográfico"
                  desc="Micro-pausa de impacto en golpes pesados"
                  checked={config.video.hitstopEnabled}
                  onChange={(v) => updateVideo('hitstopEnabled', v)}
                />
                <ToggleRow
                  label="Mostrar Hitboxes (Laboratorio)"
                  desc="Visualiza cajas de daño y colisión en tiempo real"
                  checked={config.video.showHitboxes}
                  onChange={(v) => updateVideo('showHitboxes', v)}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    Densidad de Partículas y Casquillos
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'high', 'extreme'] as ParticleDensity[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => updateVideo('particleDensity', d)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-bold uppercase transition-colors ${
                          config.video.particleDensity === d
                            ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                            : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8]'
                        }`}
                      >
                        {d === 'low' ? 'Baja' : d === 'high' ? 'Alta' : 'Extrema'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Vibración de Cámara</span>
                    <span className="font-mono-num text-[#ffcc33]">{Math.round(config.video.shakeIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={config.video.shakeIntensity}
                    onChange={(e) => updateVideo('shakeIntensity', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'match' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Vidas (Stocks)</span>
                    <span className="font-mono-num text-[#ffcc33]">{config.match.stocks}</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateMatch('stocks', n)}
                        className={`flex-1 rounded-lg border py-2 font-mono-num text-sm font-bold ${
                          config.match.stocks === n
                            ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                            : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Dificultad de la IA</span>
                    <span className="text-[#ffcc33]">
                      {['Novato', 'Competitiva', 'Leyenda', 'Brutal'][config.match.aiDifficulty]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {([0, 1, 2, 3] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => updateMatch('aiDifficulty', lvl)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-bold ${
                          config.match.aiDifficulty === lvl
                            ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                            : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'
                        }`}
                      >
                        {['Novato', 'Comp.', 'Leyenda', 'Brutal'][lvl]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Multiplicador de Empuje (Knockback)</span>
                    <span className="font-mono-num text-[#ffcc33]">{config.match.knockbackMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={2.0}
                    step={0.1}
                    value={config.match.knockbackMultiplier}
                    onChange={(e) => updateMatch('knockbackMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Gravedad de Arena</span>
                    <span className="font-mono-num text-[#ffcc33]">{config.match.gravityMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.3}
                    step={0.1}
                    value={config.match.gravityMultiplier}
                    onChange={(e) => updateMatch('gravityMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    Peligros de Escenario (Hazards)
                  </label>
                  <div className="flex gap-2">
                    {(['off', 'normal', 'frenetic'] as HazardFrequency[]).map((hf) => (
                      <button
                        key={hf}
                        onClick={() => updateMatch('hazardFrequency', hf)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-bold ${
                          config.match.hazardFrequency === hf
                            ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                            : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'
                        }`}
                      >
                        {hf === 'off' ? 'Desactivado' : hf === 'normal' ? 'Normal' : 'Frenético'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    Armas y Suministros Shooter
                  </label>
                  <div className="flex gap-2">
                    {(['off', 'normal', 'chaos'] as ItemSpawnRate[]).map((ir) => (
                      <button
                        key={ir}
                        onClick={() => updateMatch('itemSpawnRate', ir)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-bold ${
                          config.match.itemSpawnRate === ir
                            ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                            : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'
                        }`}
                      >
                        {ir === 'off' ? 'Sin Armas' : ir === 'normal' ? 'Normal' : 'Lluvia'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Carga de Voto Popular</span>
                    <span className="font-mono-num text-[#ffcc33]">{config.match.voteGainMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={config.match.voteGainMultiplier}
                    onChange={(e) => updateMatch('voteGainMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>

                <ToggleRow
                  label="Iniciar con Ultimate al 100%"
                  desc="Comienza la pelea con el Decreto Supremo listo"
                  checked={config.match.startFullVote}
                  onChange={(v) => updateMatch('startFullVote', v)}
                />
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-4">
                <div>
                  <div className="text-sm font-bold text-white">Controles Táctiles en Pantalla</div>
                  <div className="text-xs text-[#94a3b8]">Muestra joystick virtual y botones arcade en pantalla</div>
                </div>
                <div className="flex gap-2">
                  {(['auto', 'on', 'off'] as TouchMode[]).map((tm) => (
                    <button
                      key={tm}
                      onClick={() => updateControls('touchMode', tm)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase ${
                        config.controls.touchMode === tm
                          ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                          : 'border-[#2a344d] bg-[#101522] text-[#94a3b8]'
                      }`}
                    >
                      {tm === 'auto' ? 'Auto' : tm === 'on' ? 'Siempre ON' : 'OFF'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {(['p1', 'p2'] as const).map((player) => (
                  <div key={player} className="rounded-lg border border-[#252f47] bg-[#141b2d] p-4">
                    <h4 className="font-display mb-3 text-sm font-bold uppercase tracking-wider text-[#ffcc33]">
                      {player === 'p1' ? 'Teclado Jugador 1' : 'Teclado Jugador 2'}
                    </h4>
                    <div className="space-y-2">
                      {(Object.keys(ACTION_LABELS) as PlayerAction[]).map((act) => {
                        const isWaiting = listening?.player === player && listening.action === act;
                        const codes = config.controls[player][act];
                        return (
                          <div key={act} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#cbd5e1]">{ACTION_LABELS[act]}</span>
                            <button
                              onClick={() => setListening({ player, action: act })}
                              className={`min-w-[110px] rounded border px-3 py-1.5 font-mono-num font-bold transition-colors ${
                                isWaiting
                                  ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]'
                                  : 'border-[#2f3b57] bg-[#0e1320] text-white hover:border-[#ffcc33]'
                              }`}
                            >
                              {isWaiting ? 'Pulsa tecla...' : codes.map(formatKeyCode).join(' / ')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <ToggleRow
                  label="Vibración en Mandos (Gamepad)"
                  desc="Retroalimentación háptica al impactar y recibir KOs"
                  checked={config.controls.gamepadVibration}
                  onChange={(v) => updateControls('gamepadVibration', v)}
                />
                <button
                  onClick={resetKeys}
                  className="ml-4 flex shrink-0 items-center gap-2 rounded-lg border border-[#32405e] bg-[#1a2236] px-4 py-2 text-xs font-bold text-[#cbd5e1] hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar Teclas
                </button>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-6">
              <ToggleRow
                label="Silenciar Todo el Audio"
                desc="Desactiva música chiptune y efectos de combate"
                checked={config.audio.muted}
                onChange={(v) => updateAudio('muted', v)}
              />

              <div className="space-y-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-5">
                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Volumen Maestro</span>
                    <span className="font-mono-num text-[#ffcc33]">{Math.round(config.audio.masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.audio.masterVolume}
                    onChange={(e) => updateAudio('masterVolume', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Música Arcade Chiptune</span>
                    <span className="font-mono-num text-[#ffcc33]">{Math.round(config.audio.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.audio.musicVolume}
                    onChange={(e) => updateAudio('musicVolume', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    <span>Efectos de Combate y Armas (SFX)</span>
                    <span className="font-mono-num text-[#ffcc33]">{Math.round(config.audio.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.audio.sfxVolume}
                    onChange={(e) => updateAudio('sfxVolume', parseFloat(e.target.value))}
                    className="w-full accent-[#ffcc33]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#222b42] bg-[#0d121e] px-6 py-4">
          <button
            onClick={resetAll}
            className="flex items-center gap-2 rounded-lg border border-[#2c3752] bg-[#161e30] px-4 py-2 text-xs font-semibold text-[#cbd5e1] hover:bg-[#1f2942] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Valores por Defecto
          </button>
          <button
            onClick={() => {
              sound.uiConfirm();
              onClose();
            }}
            className="rounded-lg bg-[#ffcc33] px-6 py-2.5 font-display text-sm font-bold text-[#0b0e17] transition-colors hover:bg-[#ffd95e]"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-3.5 text-left transition-colors hover:border-[#3c4c70]"
    >
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-0.5 text-xs text-[#94a3b8]">{desc}</div>
      </div>
      <div
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-[#ffcc33]' : 'bg-[#2a344d]'
        }`}
      >
        <div
          className={`h-5 w-5 rounded-full bg-[#0b0e17] transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}
