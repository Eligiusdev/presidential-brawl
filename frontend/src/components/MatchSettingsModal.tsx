import { useEffect } from 'react';
import { RotateCcw, Sliders, X } from 'lucide-react';
import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { sound } from '../audio/soundEngine';
import type { GameConfig, HazardFrequency, ItemSpawnRate } from '../types/game';

type MatchConfig = GameConfig['match'];

export function MatchSettingsModal({ open, onClose, value, onChange, inMatch = false, onRestart }: {
  open: boolean;
  onClose: () => void;
  value: MatchConfig;
  onChange: (next: MatchConfig) => void;
  inMatch?: boolean;
  onRestart?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  const set = <K extends keyof MatchConfig>(key: K, v: MatchConfig[K]) => {
    sound.uiClick();
    onChange({ ...value, [key]: v });
  };

  return (
    <div data-gamepad-overlay className="console-modal-overlay" role="dialog" aria-modal="true" aria-label="Reglas de partida"
      style={{ zIndex: 110 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="console-modal" style={{ width: 'min(660px, 100%)' }}>
        <header className="console-modal-head">
          <div className="room-modal-title">
            <div className="room-modal-icon" aria-hidden><Sliders className="h-5 w-5" /></div>
            <div>
              <p className="console-modal-kicker">Solo esta partida</p>
              <h2>Reglas de combate</h2>
              <p className="room-modal-sub">Cambia vidas, dificultad y física del combate. No están en la configuración general.</p>
            </div>
          </div>
          <button type="button" data-gamepad-back className="console-modal-close" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </header>

        <div className="console-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>Vidas (Stocks)</span><span className="font-mono-num text-[#ffcc33]">{value.stocks}</span></div>
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" onClick={() => set('stocks', n)} className={`flex-1 rounded-lg border py-2 font-mono-num text-sm font-bold ${value.stocks === n ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{n}</button>)}</div>
          </div>
          <div><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>Dificultad de la IA</span><span className="text-[#ffcc33]">{['Novato', 'Competitiva', 'Leyenda', 'Brutal'][value.aiDifficulty]}</span></div>
            <div className="flex gap-2">{([0, 1, 2, 3] as const).map(lvl => <button key={lvl} type="button" onClick={() => set('aiDifficulty', lvl)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${value.aiDifficulty === lvl ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{['Novato', 'Comp.', 'Leyenda', 'Brutal'][lvl]}</button>)}</div>
          </div>
          <SliderField label="Multiplicador de Empuje (Knockback)" value={value.knockbackMultiplier} min={0.7} max={2} step={0.1} format={v => `${v.toFixed(1)}x`} onChange={v => set('knockbackMultiplier', v)} />
          <SliderField label="Gravedad de Arena" value={value.gravityMultiplier} min={0.7} max={1.3} step={0.1} format={v => `${v.toFixed(1)}x`} onChange={v => set('gravityMultiplier', v)} />
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Peligros de Escenario (Hazards)</label>
            <div className="flex gap-2">{(['off', 'normal', 'frenetic'] as HazardFrequency[]).map(hf => <button key={hf} type="button" onClick={() => set('hazardFrequency', hf)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${value.hazardFrequency === hf ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{hf === 'off' ? 'Desactivado' : hf === 'normal' ? 'Normal' : 'Frenético'}</button>)}</div>
          </div>
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Armas y Suministros Shooter</label>
            <div className="flex gap-2">{(['off', 'normal', 'chaos'] as ItemSpawnRate[]).map(ir => <button key={ir} type="button" onClick={() => set('itemSpawnRate', ir)} className={`flex-1 rounded-lg border py-2 text-xs font-bold ${value.itemSpawnRate === ir ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}>{ir === 'off' ? 'Sin Armas' : ir === 'normal' ? 'Normal' : 'Lluvia'}</button>)}</div>
          </div>
          <SliderField label="Carga de Voto Popular" value={value.voteGainMultiplier} min={0.5} max={2} step={0.1} format={v => `${v.toFixed(1)}x`} onChange={v => set('voteGainMultiplier', v)} />
          <ToggleRow label="Iniciar con Ultimate al 100%" desc="Comienza la pelea con el Decreto Supremo listo" checked={value.startFullVote} onChange={v => set('startFullVote', v)} />

          <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginTop: 4 }}>
            <button type="button" className="console-btn" onClick={() => { sound.uiConfirm(); onChange(structuredClone(DEFAULT_CONFIG.match)); }}><RotateCcw className="h-4 w-4" />Restaurar reglas</button>
            <div className="flex gap-2">
              <button type="button" className="console-btn" onClick={onClose}>Cerrar</button>
              {inMatch && <button type="button" data-gamepad-initial className="console-btn console-btn-primary" onClick={() => { sound.uiConfirm(); onClose(); onRestart?.(); }}>Aplicar y reiniciar</button>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SliderField({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return <div>
    <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]"><span>{label}</span><span className="font-mono-num text-[#ffcc33]">{format(value)}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-[#ffcc33]" />
  </div>;
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-[#252f47] bg-[#141b2d] p-3.5 text-left transition-colors hover:border-[#3c4c70]">
      <div><div className="text-sm font-semibold text-white">{label}</div><div className="mt-0.5 text-xs text-[#94a3b8]">{desc}</div></div>
      <div className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-[#ffcc33]' : 'bg-[#2a344d]'}`}>
        <div className={`h-5 w-5 rounded-full bg-[#0b0e17] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}
