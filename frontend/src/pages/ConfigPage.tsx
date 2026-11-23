import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Crown, Crosshair, Gamepad2, Monitor, RotateCcw, Settings, Sliders, Swords, Volume2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sound } from '../audio/soundEngine';
import { ACTION_LABELS, DEFAULT_CONFIG, DEFAULT_P1_KEYS, DEFAULT_P2_KEYS, formatKeyCode, PIXEL_PRESET_DIMS } from '../config/defaultConfig';
import { useGame } from '../game/GameContext';
import type { CrtFilterPreset, GameConfig, HazardFrequency, ItemSpawnRate, ParticleDensity, PixelResolutionPreset, PlayerAction, TouchMode } from '../types/game';

type ConfigTab = 'video' | 'match' | 'controls' | 'audio';

export function ConfigPage() {
  const g = useGame();
  const navigate = useNavigate();
  const { config, updateConfig } = g;
  const [tab, setTab] = useState<ConfigTab>('video');
  const [listening, setListening] = useState<{ player: 'p1' | 'p2'; action: PlayerAction } | null>(null);
  const [touchEditor, setTouchEditor] = useState(false);
  const goBack = () => { sound.uiClick(); if (window.history.length > 1) navigate(-1); else navigate('/'); };

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') { setListening(null); return; }
      const next = structuredClone(config);
      next.controls[listening.player][listening.action] = [e.code];
      updateConfig(next);
      sound.uiConfirm();
      setListening(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, config, updateConfig]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (listening) return;
      if (e.code === 'Escape') { e.preventDefault(); goBack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listening]);

  const updateVideo = <K extends keyof GameConfig['video']>(k: K, v: GameConfig['video'][K]) => { sound.uiClick(); updateConfig({ ...config, video: { ...config.video, [k]: v } }); };
  const updateMatch = <K extends keyof GameConfig['match']>(k: K, v: GameConfig['match'][K]) => { sound.uiClick(); updateConfig({ ...config, match: { ...config.match, [k]: v } }); };
  const updateAudio = <K extends keyof GameConfig['audio']>(k: K, v: GameConfig['audio'][K]) => { updateConfig({ ...config, audio: { ...config.audio, [k]: v } }); };
  const updateControls = <K extends keyof GameConfig['controls']>(k: K, v: GameConfig['controls'][K]) => { sound.uiClick(); updateConfig({ ...config, controls: { ...config.controls, [k]: v } }); };
  const resetAll = () => { sound.uiConfirm(); updateConfig(structuredClone(DEFAULT_CONFIG)); };
  const resetKeys = () => { sound.uiConfirm(); updateConfig({ ...config, controls: { ...config.controls, p1: structuredClone(DEFAULT_P1_KEYS), p2: structuredClone(DEFAULT_P2_KEYS) } }); };

  const tabs: Array<{ id: ConfigTab; label: string; icon: typeof Monitor }> = [
    { id: 'video', label: 'Video', icon: Monitor },
    { id: 'match', label: 'Combate', icon: Sliders },
    { id: 'controls', label: 'Controles', icon: Gamepad2 },
    { id: 'audio', label: 'Audio', icon: Volume2 },
  ];

  return (
    <section data-gamepad-config className="ob-lobby ob-gallery" aria-label="Configuración" style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto', overflowX: 'hidden' }}>
      <header className="ob-topbar">
        <div className="ob-brand">
          <Settings className="h-5 w-5 text-[#ffcc33]" aria-hidden />
          <div className="ob-brand-text">
            <h2>Configuración</h2>
            <p>Ajusta video, combate, controles y audio</p>
          </div>
        </div>
        <div className="ob-top-actions">
          <button type="button" data-gamepad-back onClick={goBack}><ArrowLeft className="h-4 w-4" />Volver</button>
        </div>
      </header>

      <div className="ob-main config-layout">
        <aside className="ob-roster" aria-label="Secciones de configuración" style={{ maxHeight: 'none' }}>
          <div className="ob-roster-head"><h3>Secciones</h3></div>
          <nav className="console-menu" role="tablist" aria-label="Secciones" style={{ padding: '12px', gap: 8 }}>
            {tabs.map(t => {
              const Icon = t.icon; const active = tab === t.id;
              return (
                <button key={t.id} role="tab" aria-selected={active} type="button"
                  className={`console-menu-item ${active ? 'is-primary is-focused' : ''}`}
                  onClick={() => { sound.uiClick(); setTab(t.id); }}>
                  <span className="console-menu-icon" aria-hidden><Icon className="h-5 w-5" /></span>
                  <span className="console-menu-text"><span className="console-menu-label">{t.label}</span></span>
                </button>
              );
            })}
          </nav>
          <div style={{ padding: '12px', marginTop: 'auto' }}>
            <button onClick={resetAll} className="console-btn" style={{ width: '100%', justifyContent: 'center' }}>
              <RotateCcw className="h-4 w-4" />Restaurar valores
            </button>
          </div>
        </aside>

        <section className="ob-preview" aria-label="Opciones" style={{ overflow: 'visible' }}>
          <div className="ob-character-card" style={{ padding: 24, display: 'block' }}>
            {tab === 'video' && <div className="space-y-6">
              <SectionTitle>Pixelación y video</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#cbd5e1]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Iluminación del escenario</span>
                  <div className="relative">
                    <select value={config.video.stageTime ?? 'cycle'} onChange={e => updateVideo('stageTime', e.target.value as GameConfig['video']['stageTime'])}
                      className="w-full appearance-none rounded-lg border border-[#2f3f5f] bg-[#141d31] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors hover:border-[#4b648f] focus:border-[#ffcc33]">
                      <option value="cycle">Inicio al azar · cambio cada 2 minutos</option>
                      <option value="day">Siempre de día</option><option value="night">Siempre de noche</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">▾</span>
                  </div>
                </label>
                <label className="block text-sm font-semibold text-[#cbd5e1]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Densidad máxima en línea</span>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-[#2f3f5f] bg-[#141d31] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors hover:border-[#4b648f] focus:border-[#ffcc33]"
                      value={config.video.maxDpr ?? 1.5} onChange={e => updateVideo('maxDpr', Number(e.target.value) as 1 | 1.5 | 2)}>
                      <option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">▾</span>
                  </div>
                </label>
              </div>
              <ToggleRow label="Calidad gráfica adaptativa" desc="Ajusta la resolución automáticamente para mantener fluidez" checked={config.video.adaptiveQuality !== false} onChange={v => updateVideo('adaptiveQuality', v)} />
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#cbd5e1] mb-3">Resolución nativa del búfer pixelado</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(Object.keys(PIXEL_PRESET_DIMS) as PixelResolutionPreset[]).map(preset => {
                    const info = PIXEL_PRESET_DIMS[preset]; const selected = config.video.pixelPreset === preset;
                    return <button key={preset} onClick={() => updateVideo('pixelPreset', preset)} className={`flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors ${selected ? 'border-[#ffcc33] bg-[#1f2942] text-white' : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8] hover:border-[#3e4e73]'}`}>
                      <span className="font-display text-sm font-bold text-[#ffcc33]">{info.label}</span>
                      <span className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{info.desc}</span>
                    </button>;
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#cbd5e1] mb-3">Filtro de pantalla / shader arcade</h3>
                <div className="grid grid-cols-3 gap-3">
                  {([['none','Nítido Puro','Píxeles crudos sin líneas'],['scanlines','CRT Scanlines','Líneas de escaneo clásicas'],['pvm','Monitor PVM','Trama RGB + viñeta arcade']] as Array<[CrtFilterPreset,string,string]>).map(([val,title,desc]) => (
                    <button key={val} onClick={() => updateVideo('crtFilter', val)} className={`rounded-lg border p-3 text-left transition-colors ${config.video.crtFilter === val ? 'border-[#ffcc33] bg-[#1f2942] text-white' : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8] hover:border-[#3e4e73]'}`}>
                      <div className="font-display text-sm font-bold">{title}</div><div className="mt-0.5 text-xs text-[#94a3b8]">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ToggleRow label="Contornos Pixelados Anatómicos" desc="Delineado oscuro de 1px en extremidades y rostro" checked={config.video.pixelOutlines} onChange={v => updateVideo('pixelOutlines', v)} />
                <ToggleRow label="Iluminación Ambiental Dinámica" desc="Tinte atmosférico por escenario y destellos" checked={config.video.dynamicLighting} onChange={v => updateVideo('dynamicLighting', v)} />
                <ToggleRow label="Hitstop Cinematográfico" desc="Micro-pausa de impacto en golpes pesados" checked={config.video.hitstopEnabled} onChange={v => updateVideo('hitstopEnabled', v)} />
                <ToggleRow label="Mostrar Hitboxes (Laboratorio)" desc="Visualiza cajas de daño y colisión en tiempo real" checked={config.video.showHitboxes} onChange={v => updateVideo('showHitboxes', v)} />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Densidad de Partículas y Casquillos</label>
                  <div className="flex gap-2">{(['low','high','extreme'] as ParticleDensity[]).map(d => <button key={d} onClick={() => updateVideo('particleDensity', d)} className={`flex-1 rounded-lg border py-2 text-xs font-bold uppercase transition-colors ${config.video.particleDensity===d ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#94a3b8]'}`}>{d==='low'?'Baja':d==='high'?'Alta':'Extrema'}</button>)}</div>
                </div>
                <div><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>Vibración de Cámara</span><span className="font-mono-num text-[#ffcc33]">{Math.round(config.video.shakeIntensity*100)}%</span></div>
                  <input type="range" min={0} max={1.5} step={0.1} value={config.video.shakeIntensity} onChange={e => updateVideo('shakeIntensity', parseFloat(e.target.value))} className="w-full accent-[#ffcc33]" />
                </div>
              </div>
            </div>}

            {tab === 'match' && <div className="space-y-6">
              <SectionTitle>Reglas de combate</SectionTitle>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>Vidas (Stocks)</span><span className="font-mono-num text-[#ffcc33]">{config.match.stocks}</span></div>
                  <div className="flex gap-2">{[1,2,3,4,5].map(n => <button key={n} onClick={() => updateMatch('stocks', n)} className={`flex-1 rounded-lg border py-2 font-mono-num text-sm font-bold ${config.match.stocks===n ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{n}</button>)}</div>
                </div>
                <div><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>Dificultad de la IA</span><span className="text-[#ffcc33]">{['Novato','Competitiva','Leyenda','Brutal'][config.match.aiDifficulty]}</span></div>
                  <div className="flex gap-2">{([0,1,2,3] as const).map(lvl => <button key={lvl} onClick={() => updateMatch('aiDifficulty', lvl)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${config.match.aiDifficulty===lvl ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{['Novato','Comp.','Leyenda','Brutal'][lvl]}</button>)}</div>
                </div>
                <SliderField label="Multiplicador de Empuje (Knockback)" value={config.match.knockbackMultiplier} min={0.7} max={2} step={0.1} format={v=>`${v.toFixed(1)}x`} onChange={v=>updateMatch('knockbackMultiplier',v)} />
                <SliderField label="Gravedad de Arena" value={config.match.gravityMultiplier} min={0.7} max={1.3} step={0.1} format={v=>`${v.toFixed(1)}x`} onChange={v=>updateMatch('gravityMultiplier',v)} />
                <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Peligros de Escenario (Hazards)</label>
                  <div className="flex gap-2">{(['off','normal','frenetic'] as HazardFrequency[]).map(hf => <button key={hf} onClick={() => updateMatch('hazardFrequency', hf)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${config.match.hazardFrequency===hf ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{hf==='off'?'Desactivado':hf==='normal'?'Normal':'Frenético'}</button>)}</div>
                </div>
                <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Armas y Suministros Shooter</label>
                  <div className="flex gap-2">{(['off','normal','chaos'] as ItemSpawnRate[]).map(ir => <button key={ir} onClick={() => updateMatch('itemSpawnRate', ir)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${config.match.itemSpawnRate===ir ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{ir==='off'?'Sin Armas':ir==='normal'?'Normal':'Lluvia'}</button>)}</div>
                </div>
                <SliderField label="Carga de Voto Popular" value={config.match.voteGainMultiplier} min={0.5} max={2} step={0.1} format={v=>`${v.toFixed(1)}x`} onChange={v=>updateMatch('voteGainMultiplier',v)} />
                <ToggleRow label="Iniciar con Ultimate al 100%" desc="Comienza la pelea con el Decreto Supremo listo" checked={config.match.startFullVote} onChange={v => updateMatch('startFullVote', v)} />
              </div>
            </div>}

            {tab === 'controls' && <div className="space-y-6">
              <SectionTitle>Controles</SectionTitle>

              <div className="rounded-lg border border-[#252f47] bg-[#141b2d] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><div className="text-sm font-bold text-white">Controles táctiles en pantalla</div><div className="text-xs text-[#94a3b8]">Joystick virtual + botones de acción para móvil</div></div>
                  <div className="flex gap-2">{(['auto','on','off'] as TouchMode[]).map(tm => <button key={tm} onClick={() => updateControls('touchMode', tm)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase ${config.controls.touchMode===tm ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#2a344d] bg-[#101522] text-[#94a3b8]'}`}>{tm==='auto'?'Auto':tm==='on'?'Siempre ON':'OFF'}</button>)}</div>
                </div>
                <SliderField label="Tamaño de botones táctiles (global)" value={config.controls.touchScale ?? 1} min={0.5} max={4} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={v=>updateControls('touchScale', v)} />
                <div className="rounded-lg border border-[#2a3a55] bg-[#0d1524] p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Editor de diseño táctil</div>
                    <div className="text-xs text-[#94a3b8]">Abre pantalla completa para mover y cambiar tamaño de cada botón.</div>
                  </div>
                  <button type="button" className="console-btn console-btn-primary" onClick={() => { sound.uiConfirm(); setTouchEditor(true); }}>Editar pantalla completa</button>
                </div>
              </div>

              <div className="rounded-lg border border-[#252f47] bg-[#141b2d] p-4">
                <h4 className="font-display mb-3 text-sm font-bold uppercase tracking-wider text-[#ffcc33]">Mapa de teclado</h4>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {(['p1','p2'] as const).map(player => (
                    <div key={player}>
                      <div className="text-xs font-bold text-[#cbd5e1] mb-2">{player==='p1'?'Jugador 1':'Jugador 2'}</div>
                      <KeyboardPreview bindings={config.controls[player]} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {(['p1','p2'] as const).map(player => (
                  <div key={player} className="rounded-lg border border-[#252f47] bg-[#141b2d] p-4">
                    <h4 className="font-display mb-3 text-sm font-bold uppercase tracking-wider text-[#ffcc33]">{player==='p1'?'Asignar teclas · J1':'Asignar teclas · J2'}</h4>
                    <div className="space-y-2">{(Object.keys(ACTION_LABELS) as PlayerAction[]).map(act => {
                      const isWaiting = listening?.player===player && listening.action===act; const codes = config.controls[player][act];
                      return <div key={act} className="flex items-center justify-between gap-2 text-xs"><span className="text-[#cbd5e1]">{ACTION_LABELS[act]}</span><button onClick={() => setListening({player, action: act})} className={`min-w-[110px] rounded border px-3 py-1.5 font-mono-num font-bold transition-colors ${isWaiting ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#2f3b57] bg-[#0e1320] text-white hover:border-[#ffcc33]'}`}>{isWaiting ? 'Pulsa tecla...' : codes.map(formatKeyCode).join(' / ')}</button></div>;
                    })}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <ToggleRow label="Vibración en Mandos (Gamepad)" desc="Retroalimentación háptica al impactar y recibir KOs" checked={config.controls.gamepadVibration} onChange={v => updateControls('gamepadVibration', v)} />
                <button onClick={resetKeys} className="flex shrink-0 items-center gap-2 rounded-lg border border-[#32405e] bg-[#1a2236] px-4 py-2 text-xs font-bold text-[#cbd5e1] hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Restaurar Teclas</button>
              </div>
            </div>}

            {tab === 'audio' && <div className="space-y-6">
              <SectionTitle>Audio</SectionTitle>
              <ToggleRow label="Silenciar Todo el Audio" desc="Desactiva música chiptune y efectos de combate" checked={config.audio.muted} onChange={v => updateAudio('muted', v)} />
              <div className="space-y-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-5">
                <SliderField label="Volumen Maestro" value={config.audio.masterVolume} min={0} max={1} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={v=>updateAudio('masterVolume',v)} />
                <SliderField label="Música Arcade Chiptune" value={config.audio.musicVolume} min={0} max={1} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={v=>updateAudio('musicVolume',v)} />
                <SliderField label="Efectos de Combate y Armas (SFX)" value={config.audio.sfxVolume} min={0} max={1} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={v=>updateAudio('sfxVolume',v)} />
              </div>
            </div>}
          </div>
        </section>
      </div>
      {touchEditor && <TouchLayoutEditor
        scale={config.controls.touchScale ?? 1}
        layout={config.controls.touchLayout}
        joystick={config.controls.touchJoystick}
        onChange={(touchLayout) => updateControls('touchLayout', touchLayout)}
        onJoystickChange={(j) => updateControls('touchJoystick', j)}
        onScaleChange={(s) => updateControls('touchScale', s)}
        onReset={() => { updateControls('touchLayout', structuredClone(DEFAULT_CONFIG.controls.touchLayout)); updateControls('touchJoystick', { x: 18, y: 22, scale: 1 }); updateControls('touchScale', 1); }}
        onClose={() => { sound.uiClick(); setTouchEditor(false); }}
      />}
    </section>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="font-display text-lg font-bold tracking-wide text-[#ffcc33] border-b border-[#24304a] pb-3">{children}</h3>;
}

function SliderField({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v:number)=>string; onChange: (v:number)=>void }) {
  return <div>
    <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>{label}</span><span className="font-mono-num text-[#ffcc33]">{format(value)}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-[#ffcc33]" />
  </div>;
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between gap-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-3.5 text-left transition-colors hover:border-[#3c4c70] w-full">
      <div><div className="text-sm font-semibold text-white">{label}</div><div className="mt-0.5 text-xs text-[#94a3b8]">{desc}</div></div>
      <div className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-[#ffcc33]' : 'bg-[#2a344d]'}`}>
        <div className={`h-5 w-5 rounded-full bg-[#0b0e17] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

type TouchBtnKey = 'jump' | 'light' | 'heavy' | 'dash' | 'ult' | 'reload';
type TouchLayout = Partial<Record<TouchBtnKey, { x: number; y: number; scale?: number }>>;

const DEFAULT_TOUCH_LAYOUT: Record<TouchBtnKey, { x: number; y: number }> = {
  jump: { x: 90, y: 18 }, light: { x: 78, y: 18 }, heavy: { x: 90, y: 42 },
  dash: { x: 66, y: 18 }, ult: { x: 78, y: 42 }, reload: { x: 66, y: 42 },
};

function TouchPreview({ scale, layout, onChange, onReset }: { scale: number; layout?: TouchLayout; onChange: (l: TouchLayout) => void; onReset: () => void }) {
  const S = Math.round(52 * scale);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ key: TouchBtnKey; id: number } | null>(null);
  const layoutRef = useRef<TouchLayout>({});
  const merged: Record<TouchBtnKey, { x: number; y: number }> = { ...DEFAULT_TOUCH_LAYOUT, ...(layout || {}) };
  layoutRef.current = merged;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; const area = areaRef.current;
      if (!d || !area || e.pointerId !== d.id) return;
      const r = area.getBoundingClientRect();
      const x = Math.max(6, Math.min(94, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.max(6, Math.min(94, (1 - (e.clientY - r.top) / r.height) * 100));
      onChange({ ...layoutRef.current, [d.key]: { x: Math.round(x), y: Math.round(y) } });
    };
    const up = (e: PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [onChange]);

  const Btn = ({ k, label, icon: Icon, size=S, primary=false }: { k: TouchBtnKey; label: string; icon: any; size?: number; primary?: boolean }) => {
    const p = merged[k];
    return (
      <div role="button" tabIndex={0} aria-label={`Mover ${label}`} title={`${label} (arrastra para mover)`}
        onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { key: k, id: e.pointerId }; }}
        className={`absolute flex items-center justify-center rounded-full border-2 text-white cursor-grab active:cursor-grabbing select-none ${primary ? 'border-[#ffd86b] bg-[#2d4f7ce8]' : 'border-[#9bb8d4b0] bg-[#1a2f4fe0]'}`}
        style={{ width: size, height: size, left: `${p.x}%`, top: `${100 - p.y}%`, transform: 'translate(-50%,-50%)', boxShadow: primary ? '0 0 0 2px #ffd86b33, 0 6px 14px #0008' : '0 6px 14px #0008', touchAction: 'none' }}>
        <Icon size={Math.max(16, Math.round(size * 0.38))} strokeWidth={2.4} aria-hidden />
      </div>
    );
  };

  const W = Math.round(S * 3.6);
  const H = Math.round(S * 2.8);
  return (
    <div className="rounded-lg border border-[#2a3a55] bg-[#0d1524] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div><div className="text-xs text-[#94a3b8]">Vista previa táctil</div><div className="text-[11px] text-[#64748b]">Arrastra los botones para personalizar su posición</div></div>
        <button type="button" onClick={onReset} className="text-[11px] px-2 py-1 rounded border border-[#334155] text-[#cbd5e1] hover:border-[#ffcc33]">Restablecer</button>
      </div>
      <div className="flex items-end justify-between gap-4 max-w-[560px] mx-auto">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="rounded-full border-2 border-[#bbd2f799] bg-[#172842cc] grid place-items-center" style={{ width: Math.round(88 * scale), height: Math.round(88 * scale) }}>
            <div className="rounded-full bg-[#c9d7e6cc]" style={{ width: Math.round(34 * scale), height: Math.round(34 * scale) }} />
          </div>
          <span className="text-[10px] text-[#94a3b8] font-semibold">Joystick</span>
        </div>
        <div ref={areaRef} className="relative shrink-0 rounded-lg border border-dashed border-[#334155] bg-[#0b1220]/50" style={{ width: W, height: H }}>
          <Btn k="jump" label="Saltar" icon={ArrowUp} size={Math.round(S*1.12)} primary />
          <Btn k="light" label="Golpe" icon={Swords} />
          <Btn k="heavy" label="Especial" icon={Crosshair} />
          <Btn k="dash" label="Dash" icon={Zap} />
          <Btn k="ult" label="ULT" icon={Crown} />
          <Btn k="reload" label="Recargar" icon={RotateCcw} size={Math.round(S*0.88)} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#94a3b8] justify-center">
        <span className="inline-flex items-center gap-1"><ArrowUp size={12}/>Saltar</span>
        <span className="inline-flex items-center gap-1"><Swords size={12}/>Golpe</span>
        <span className="inline-flex items-center gap-1"><Crosshair size={12}/>Especial</span>
        <span className="inline-flex items-center gap-1"><Zap size={12}/>Dash</span>
        <span className="inline-flex items-center gap-1"><Crown size={12}/>ULT</span>
        <span className="inline-flex items-center gap-1"><RotateCcw size={12}/>Recargar</span>
      </div>
    </div>
  );
}


const KEY_ROWS: Array<Array<{ code: string; label: string; w?: number }>> = [
  [{code:'Escape',label:'Esc'},{code:'Digit1',label:'1'},{code:'Digit2',label:'2'},{code:'Digit3',label:'3'},{code:'Digit4',label:'4'},{code:'Digit5',label:'5'},{code:'Digit6',label:'6'},{code:'Digit7',label:'7'},{code:'Digit8',label:'8'},{code:'Digit9',label:'9'},{code:'Digit0',label:'0'},{code:'Minus',label:'-'},{code:'Equal',label:'='},{code:'Backspace',label:'⌫',w:1.8}],
  [{code:'Tab',label:'Tab',w:1.4},{code:'KeyQ',label:'Q'},{code:'KeyW',label:'W'},{code:'KeyE',label:'E'},{code:'KeyR',label:'R'},{code:'KeyT',label:'T'},{code:'KeyY',label:'Y'},{code:'KeyU',label:'U'},{code:'KeyI',label:'I'},{code:'KeyO',label:'O'},{code:'KeyP',label:'P'},{code:'BracketLeft',label:'['},{code:'BracketRight',label:']'},{code:'Backslash',label:'\\',w:1.4}],
  [{code:'CapsLock',label:'Caps',w:1.7},{code:'KeyA',label:'A'},{code:'KeyS',label:'S'},{code:'KeyD',label:'D'},{code:'KeyF',label:'F'},{code:'KeyG',label:'G'},{code:'KeyH',label:'H'},{code:'KeyJ',label:'J'},{code:'KeyK',label:'K'},{code:'KeyL',label:'L'},{code:'Semicolon',label:';'},{code:'Quote',label:"'"},{code:'Enter',label:'Enter',w:2.1}],
  [{code:'ShiftLeft',label:'Shift',w:2.2},{code:'KeyZ',label:'Z'},{code:'KeyX',label:'X'},{code:'KeyC',label:'C'},{code:'KeyV',label:'V'},{code:'KeyB',label:'B'},{code:'KeyN',label:'N'},{code:'KeyM',label:'M'},{code:'Comma',label:','},{code:'Period',label:'.'},{code:'Slash',label:'/'},{code:'ShiftRight',label:'Shift',w:2.2}],
  [{code:'ControlLeft',label:'Ctrl',w:1.4},{code:'AltLeft',label:'Alt',w:1.2},{code:'Space',label:'Space',w:6.2},{code:'AltRight',label:'Alt',w:1.2},{code:'ControlRight',label:'Ctrl',w:1.4},{code:'ArrowLeft',label:'←'},{code:'ArrowUp',label:'↑'},{code:'ArrowDown',label:'↓'},{code:'ArrowRight',label:'→'}],
];

const ACTION_COLORS: Record<PlayerAction, string> = {
  left:'#38bdf8', right:'#38bdf8', jump:'#4ade80', down:'#94a3b8',
  light:'#f59e0b', heavy:'#f97316', dash:'#a78bfa', ult:'#ffcc33', reload:'#f43f5e',
};

function KeyboardPreview({ bindings }: { bindings: Record<PlayerAction, string[]> }) {
  const byCode = new Map<string, { action: PlayerAction; label: string }>();
  (Object.keys(ACTION_LABELS) as PlayerAction[]).forEach(act => {
    for (const code of bindings[act] || []) byCode.set(code, { action: act, label: ACTION_LABELS[act] });
  });
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px] space-y-1.5 rounded-lg border border-[#24314b] bg-[#0b1220] p-3">
          {KEY_ROWS.map((row, i) => (
            <div key={i} className="flex gap-1.5">
              {row.map(k => {
                const hit = byCode.get(k.code);
                const color = hit ? ACTION_COLORS[hit.action] : undefined;
                return (
                  <div key={k.code} title={hit ? `${hit.label} (${k.label})` : k.label}
                    className="relative flex h-9 items-center justify-center rounded-md border text-[10px] font-bold select-none"
                    style={{
                      flex: `${k.w ?? 1} 0 0`,
                      minWidth: 28,
                      borderColor: color ? color : '#334155',
                      background: color ? `color-mix(in srgb, ${color} 22%, #111827)` : '#111827',
                      color: color ? '#fff' : '#94a3b8',
                      boxShadow: color ? `inset 0 0 0 1px ${color}55` : undefined,
                    }}>
                    <span>{k.label}</span>
                    {hit && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] leading-3 font-bold" style={{ background: color, color: '#0b0e17', whiteSpace: 'nowrap' }}>{hit.label.split(' ')[0]}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px]">
        {(Object.keys(ACTION_LABELS) as PlayerAction[]).map(act => {
          const active = (bindings[act] || []).length > 0;
          return <span key={act} className="inline-flex items-center gap-1 rounded border px-2 py-0.5" style={{ borderColor: ACTION_COLORS[act] + '88', color: active ? '#e2e8f0' : '#64748b', background: active ? ACTION_COLORS[act] + '22' : '#0f172a' }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: ACTION_COLORS[act] }} />{ACTION_LABELS[act]}
          </span>;
        })}
      </div>
    </div>
  );
}


function TouchLayoutEditor({ scale, layout, joystick, onChange, onJoystickChange, onScaleChange, onReset, onClose }: {
  scale: number;
  layout?: TouchLayout;
  joystick?: { x: number; y: number; scale?: number };
  onChange: (l: TouchLayout) => void;
  onJoystickChange: (j: { x: number; y: number; scale?: number }) => void;
  onScaleChange: (s: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ key: TouchBtnKey | 'joystick'; id: number } | null>(null);
  const layoutRef = useRef<TouchLayout>({});
  const joystickRef = useRef<{ x: number; y: number; scale?: number }>({ x: 18, y: 22, scale: 1 });
  const [selected, setSelected] = useState<TouchBtnKey | 'joystick'>('jump');
  const merged: Record<TouchBtnKey, { x: number; y: number; scale?: number }> = { ...DEFAULT_TOUCH_LAYOUT, ...(layout || {}) } as any;
  const joy = { x: 18, y: 22, scale: 1, ...(joystick || {}) };
  layoutRef.current = merged;
  joystickRef.current = joy;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      if (d.key === 'joystick') {
        const area = areaRef.current; if (!area) return;
        const r = area.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
        const y = Math.max(0, Math.min(100, (1 - (e.clientY - r.top) / r.height) * 100));
        onJoystickChange({ ...joystickRef.current, x: Math.round(x), y: Math.round(y) });
      } else {
        const box = areaRef.current; if (!box) return;
        const r = box.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
        const y = Math.max(0, Math.min(100, (1 - (e.clientY - r.top) / r.height) * 100));
        onChange({ ...layoutRef.current, [d.key]: { ...layoutRef.current[d.key], x: Math.round(x), y: Math.round(y) } });
      }
    };
    const up = (e: PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [onChange, onJoystickChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items: Array<{ k: TouchBtnKey; label: string; icon: any }> = [
    { k: 'jump', label: 'Saltar', icon: ArrowUp },
    { k: 'light', label: 'Golpe', icon: Swords },
    { k: 'heavy', label: 'Especial', icon: Crosshair },
    { k: 'dash', label: 'Dash', icon: Zap },
    { k: 'ult', label: 'ULT', icon: Crown },
    { k: 'reload', label: 'Recargar', icon: RotateCcw },
  ];
  const selectedIsJoy = selected === 'joystick';
  const selectedDef = selectedIsJoy ? { label: 'Joystick', icon: Gamepad2 } : items.find(i => i.k === selected)!;
  const selectedScale = selectedIsJoy ? (joy.scale ?? 1) : (merged[selected as TouchBtnKey]?.scale ?? 1);

  return (
    <div className="fixed inset-0 z-[120] bg-[#060b14]/96 text-white flex flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#24324a] bg-[#0c1424]">
        <div>
          <div className="font-display text-lg font-bold text-[#ffcc33]">Editar controles táctiles</div>
          <div className="text-xs text-[#94a3b8]">Arrastra joystick y botones. Selecciona uno para cambiar su tamaño.</div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="console-btn" onClick={onReset}><RotateCcw className="h-4 w-4" />Restablecer</button>
          <button type="button" className="console-btn console-btn-primary" onClick={onClose}>Listo</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-0 p-3 md:p-5">
          <div ref={areaRef} className="relative w-full h-full min-h-[320px] rounded-xl border border-[#2a3a55] bg-[radial-gradient(ellipse_at_center,#18263f_0%,#0b1220_70%)] overflow-hidden" style={{ touchAction: 'none' }}>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060b14] to-transparent pointer-events-none" />
            <div className="absolute left-4 bottom-4 text-[11px] text-[#94a3b8] pointer-events-none">Área de juego (vista previa)</div>

            <div
              role="button" tabIndex={0} aria-label="Mover joystick"
              onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { key: 'joystick', id: e.pointerId }; setSelected('joystick'); }}
              className={`absolute flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none ${selectedIsJoy ? 'drop-shadow-[0_0_10px_rgba(255,204,51,.45)]' : ''}`}
              style={{ left: `${joy.x}%`, top: `${100 - joy.y}%`, transform: 'translate(-50%,-50%)' }}>
              <div className={`rounded-full border-2 grid place-items-center ${selectedIsJoy ? 'border-[#ffcc33] bg-[#1a355dcc]' : 'border-[#bbd2f799] bg-[#172842cc]'}`} style={{ width: Math.round(96 * scale * (joy.scale ?? 1)), height: Math.round(96 * scale * (joy.scale ?? 1)) }}>
                <div className="rounded-full bg-[#c9d7e6cc]" style={{ width: Math.round(38 * scale * (joy.scale ?? 1)), height: Math.round(38 * scale * (joy.scale ?? 1)) }} />
              </div>
              <span className="text-[10px] text-[#94a3b8] font-semibold">Joystick</span>
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {items.map(({ k, label, icon: Icon }) => {
                const p = merged[k];
                const base = k === 'jump' ? 1.12 : k === 'reload' ? 0.88 : 1;
                const size = Math.round(64 * scale * base * (p.scale ?? 1));
                const isSel = selected === k;
                return (
                  <button key={k} type="button" aria-label={label}
                    onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { key: k, id: e.pointerId }; setSelected(k); }}
                    className={`absolute pointer-events-auto flex items-center justify-center rounded-full border-2 text-white select-none ${isSel ? 'border-[#ffcc33] bg-[#355a8fe8]' : 'border-[#9bb8d4b0] bg-[#1a2f4fe0]'}`}
                    style={{ width: size, height: size, left: `${p.x}%`, top: `${100-p.y}%`, transform: 'translate(-50%,-50%)', boxShadow: isSel ? '0 0 0 3px #ffcc3344, 0 8px 18px #000a' : '0 8px 18px #000a' }}>
                    <Icon size={Math.max(18, Math.round(size * 0.36))} strokeWidth={2.4} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="border-t md:border-t-0 md:border-l border-[#24324a] bg-[#0c1424] p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">Control seleccionado</div>
            <div className="flex items-center gap-2 rounded-lg border border-[#2a3a55] bg-[#141b2d] p-3">
              <selectedDef.icon size={20} className="text-[#ffcc33]" />
              <div className="font-bold">{selectedDef.label}</div>
            </div>
          </div>
          <SliderField label={`Tamaño de ${selectedDef.label}`} value={selectedScale} min={0.5} max={4} step={0.05} format={v=>`${Math.round(v*100)}%`}
            onChange={v => selectedIsJoy ? onJoystickChange({ ...joy, scale: v }) : onChange({ ...merged, [selected as TouchBtnKey]: { ...merged[selected as TouchBtnKey], scale: v } })} />
          <SliderField label="Tamaño global táctil" value={scale} min={0.5} max={4} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={onScaleChange} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">Todos los controles</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelected('joystick')} className={`flex items-center gap-2 rounded border px-2 py-2 text-sm ${selectedIsJoy ? 'border-[#ffcc33] bg-[#1f2942] text-white' : 'border-[#2a3a55] bg-[#141b2d] text-[#cbd5e1]'}`}>
                <Gamepad2 size={16} />Joystick
              </button>
              {items.map(({k,label,icon:Icon}) => (
                <button key={k} type="button" onClick={() => setSelected(k)} className={`flex items-center gap-2 rounded border px-2 py-2 text-sm ${selected===k ? 'border-[#ffcc33] bg-[#1f2942] text-white' : 'border-[#2a3a55] bg-[#141b2d] text-[#cbd5e1]'}`}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[#94a3b8]">Consejo: deja el joystick a la izquierda y los botones principales cerca del pulgar derecho.</p>
        </aside>
      </div>
    </div>
  );
}
