import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Crown, Crosshair, Globe, Swords, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { sound } from '../audio/soundEngine';
import { useGame } from '../game/GameContext';

type MenuItem = { id: string; label: string; sub: string; icon: typeof Swords; action: () => void; primary?: boolean };

export function CombatMenuPage() {
  const g = useGame();
  const navigate = useNavigate();
  const [focusIdx, setFocusIdx] = useState(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items: MenuItem[] = useMemo(() => [
    { id: 'campaign', label: 'Cumbre Mundial', sub: 'Campaña de 7 rondas', icon: Crown, action: () => { g.setCampaignSelection(true); g.setScreen('SELECT'); }, primary: true },
    { id: 'online', label: 'En línea', sub: 'Salas y duelos online', icon: Globe, action: () => navigate('/online') },
    { id: 'training', label: 'Entrenamiento', sub: 'Practica tus movimientos', icon: Dumbbell, action: () => { g.setCampaignSelection(false); g.setTrainingSelection('training'); g.setScreen('SELECT'); } },
    { id: 'tutorial', label: 'Tutorial', sub: 'Aprende a moverte y atacar', icon: Crosshair, action: () => { g.setCampaignSelection(false); g.setTrainingSelection('tutorial'); g.setScreen('SELECT'); } },
    { id: 'local', label: 'Combate local', sub: '1P · 2P en el mismo dispositivo', icon: Swords, action: () => { g.setCampaignSelection(false); g.setScreen('SELECT'); } },
  ], [g, navigate]);

  useEffect(() => { btnRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
      if (e.code === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => { const n = (i + 1) % items.length; btnRefs.current[n]?.focus(); sound.uiClick(); return n; }); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => { const n = (i - 1 + items.length) % items.length; btnRefs.current[n]?.focus(); sound.uiClick(); return n; }); }
      else if (e.code === 'Escape') { e.preventDefault(); navigate('/'); }
      else if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof Element && e.target.closest('button,[role="menuitem"]'))) { e.preventDefault(); sound.init(); sound.uiConfirm(); items[0].action(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, navigate]);

  const activate = (item: MenuItem) => { sound.init(); sound.uiConfirm(); item.action(); };

  return (
    <div className="apex-menu apex-title absolute inset-0 z-20 flex flex-col overflow-y-auto p-6 sm:p-12" style={{ '--apex-cover': `url("${stageArtUrl('narino', 'night')}")` } as CSSProperties} aria-label="Modos de combate">
      <div className="console-title-layout">
        <div className="console-title-lockup">
          <button type="button" className="flex items-center gap-2 text-[#94a3b8] hover:text-white mb-4 text-sm font-semibold" onClick={() => { sound.uiClick(); navigate('/'); }}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <h1 className="console-game-title">Combate</h1>
          <p className="console-tagline">Elige cómo quieres entrar a la arena.</p>
        </div>
        <nav className="console-menu" role="menu" aria-label="Modos de combate">
          {items.map((item, idx) => {
            const Icon = item.icon; const focused = focusIdx === idx;
            return (
              <button key={item.id} ref={el => { btnRefs.current[idx] = el; }} role="menuitem" type="button" data-gamepad-initial={item.primary || undefined}
                className={`console-menu-item ${item.primary ? 'is-primary' : ''} ${focused ? 'is-focused' : ''}`}
                onFocus={() => setFocusIdx(idx)} onMouseEnter={() => { setFocusIdx(idx); btnRefs.current[idx]?.focus(); }} onClick={() => activate(item)}>
                <span className="console-menu-icon" aria-hidden><Icon className="h-5 w-5" /></span>
                <span className="console-menu-text"><span className="console-menu-label">{item.label}</span><span className="console-menu-sub">{item.sub}</span></span>
              </button>
            );
          })}
        </nav>
        <div className="console-hints" aria-hidden><span>↑↓ Navegar</span><span>Enter Seleccionar</span><span>Esc Volver</span></div>
      </div>
    </div>
  );
}
