import { useEffect, useState } from 'react';
import { ArrowLeft, Gamepad2, Monitor, RotateCcw, Settings, Sliders, Volume2 } from 'lucide-react';
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
              <label className="block text-sm font-semibold text-[#cbd5e1]">Iluminación del escenario
                <select value={config.video.stageTime ?? 'cycle'} onChange={e => updateVideo('stageTime', e.target.value as GameConfig['video']['stageTime'])}
                  className="mt-2 block w-full rounded-lg border border-[#283652] bg-[#121a2b] px-3 py-2 text-white">
                  <option value="cycle">Inicio al azar · cambio cada 2 minutos</option>
                  <option value="day">Siempre de día</option><option value="night">Siempre de noche</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#cbd5e1]"><input type="checkbox" checked={config.video.adaptiveQuality !== false} onChange={e => updateVideo('adaptiveQuality', e.target.checked)} />Calidad gráfica adaptativa</label>
              <label className="block text-sm text-[#cbd5e1]">Densidad máxima en línea
                <select className="ml-2 rounded bg-[#121a2b] p-1 text-white" value={config.video.maxDpr ?? 1.5} onChange={e => updateVideo('maxDpr', Number(e.target.value) as 1 | 1.5 | 2)}>
                  <option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option>
                </select>
              </label>
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
                <SliderField label="Tamaño de botones táctiles" value={config.controls.touchScale ?? 1} min={0.8} max={1.6} step={0.05} format={v=>`${Math.round(v*100)}%`} onChange={v=>updateControls('touchScale', v)} />
                <TouchPreview scale={config.controls.touchScale ?? 1} />
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

function TouchPreview({ scale }: { scale: number }) {
  const size = Math.round(54 * scale);
  const btn = (label: string, cls: string) => (
    <div className={`flex flex-col items-center justify-center rounded-full border-2 border-[#9bb8d4b0] bg-[#1a2f4fe0] text-white ${cls}`} style={{ width: size, height: size }}>
      <span style={{ fontSize: Math.max(8, Math.round(10 * scale)) }} className="font-bold leading-none">{label}</span>
    </div>
  );
  return (
    <div className="rounded-lg border border-[#2a3a55] bg-[#0d1524] p-4">
      <div className="text-xs text-[#94a3b8] mb-3">Vista previa táctil</div>
      <div className="flex items-end justify-between gap-4 max-w-[520px] mx-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full border-2 border-[#bbd2f799] bg-[#172842cc] grid place-items-center" style={{ width: Math.round(86 * scale), height: Math.round(86 * scale) }}>
            <div className="rounded-full bg-[#c9d7e6cc]" style={{ width: Math.round(34 * scale), height: Math.round(34 * scale) }} />
          </div>
          <span className="text-[10px] text-[#94a3b8] font-semibold">Mover / Agachar</span>
        </div>
        <div className="grid grid-cols-3 gap-2" style={{ gap: Math.round(8 * scale) }}>
          <div />{btn('ULT','')}{btn('ESP','')}
          {btn('DASH','')}{btn('GOL','')}{btn('SALTO','')}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#94a3b8] justify-center">
        <span><b className="text-[#cbd5e1]">GOL</b> Golpe ligero</span>
        <span><b className="text-[#cbd5e1]">ESP</b> Especial</span>
        <span><b className="text-[#cbd5e1]">ULT</b> Supremo</span>
        <span><b className="text-[#cbd5e1]">DASH</b> Esquivar</span>
      </div>
    </div>
  );
}

function KeyboardPreview({ bindings }: { bindings: Record<PlayerAction, string[]> }) {
  const items: Array<[string, PlayerAction]> = [
    ['Izq', 'left'], ['Der', 'right'], ['Salto', 'jump'], ['Agachar', 'down'],
    ['Golpe', 'light'], ['Especial', 'heavy'], ['Dash', 'dash'], ['ULT', 'ult'], ['Recarga', 'reload'],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, act]) => (
        <div key={act} className="flex items-center justify-between rounded border border-[#283652] bg-[#101827] px-2 py-1.5 text-[11px]">
          <span className="text-[#94a3b8]">{label}</span>
          <span className="font-mono-num font-bold text-[#ffcc33]">{(bindings[act] || []).map(formatKeyCode).join('/') || '-'}</span>
        </div>
      ))}
    </div>
  );
}
