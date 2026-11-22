import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Crown, Crosshair, Film, Globe, Settings, Swords, UserPlus } from 'lucide-react';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { sound } from '../audio/soundEngine';

interface TitleScreenProps {
  hasReplay: boolean;
  onQuickSelect: () => void;
  onStartCampaign: () => void;
  onStartTutorial: () => void;
  onStartTraining: () => void;
  onWatchLastReplay: () => void;
  onOpenCustomizer: () => void;
  onOpenConfig: () => void;
  onOpenOnline: () => void;
}

type MenuItem = {
  id: string;
  label: string;
  sub: string;
  icon: typeof Swords;
  action: () => void;
  primary?: boolean;
};

export function TitleScreen({
  hasReplay,
  onQuickSelect,
  onStartCampaign,
  onStartTraining,
  onStartTutorial,
  onWatchLastReplay,
  onOpenCustomizer,
  onOpenConfig,
  onOpenOnline,
}: TitleScreenProps) {
  const [focusIdx, setFocusIdx] = useState(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items: MenuItem[] = useMemo(() => {
    const list: MenuItem[] = [
      { id: 'versus', label: 'Combate Versus', sub: '1P · 2P local', icon: Swords, action: onQuickSelect, primary: true },
      { id: 'campaign', label: 'Cumbre Mundial', sub: 'Campaña de 7 rondas', icon: Crown, action: onStartCampaign },
      { id: 'online', label: 'Multijugador en línea', sub: 'Salas y duelos online', icon: Globe, action: onOpenOnline },
      { id: 'tutorial', label: 'Tutorial', sub: 'Aprende a moverte y atacar', icon: Crosshair, action: onStartTutorial },
      { id: 'training', label: 'Entrenamiento', sub: 'Practica tus movimientos', icon: Crosshair, action: onStartTraining },
      { id: 'custom', label: 'Personalizar luchador', sub: 'Crea y edita combatientes', icon: UserPlus, action: onOpenCustomizer },
    ];
    if (hasReplay) {
      list.push({ id: 'replay', label: 'Ver repetición', sub: 'Último combate guardado', icon: Film, action: onWatchLastReplay });
    }
    list.push({ id: 'config', label: 'Configuración', sub: 'Controles, video y audio', icon: Settings, action: onOpenConfig });
    return list;
  }, [hasReplay, onQuickSelect, onStartCampaign, onOpenOnline, onStartTutorial, onStartTraining, onOpenCustomizer, onWatchLastReplay, onOpenConfig]);

  useEffect(() => {
    btnRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => {
          const n = (i + 1) % items.length;
          btnRefs.current[n]?.focus();
          sound.uiClick();
          return n;
        });
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => {
          const n = (i - 1 + items.length) % items.length;
          btnRefs.current[n]?.focus();
          sound.uiClick();
          return n;
        });
      } else if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof Element && e.target.closest('button,[role="menuitem"]'))) {
        e.preventDefault();
        sound.init();
        sound.uiConfirm();
        onQuickSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onQuickSelect]);

  const activate = (item: MenuItem) => {
    sound.init();
    sound.uiConfirm();
    item.action();
  };

  return (
    <div
      className="apex-menu apex-title absolute inset-0 z-20 flex flex-col overflow-y-auto p-6 sm:p-12"
      style={{ '--apex-cover': `url("${stageArtUrl('narino', 'night')}")` } as CSSProperties}
      aria-label="Pantalla de título"
    >
      <div className="console-title-layout">
        <div className="console-title-lockup">
          <svg viewBox="0 0 64 40" className="console-crest" aria-hidden="true">
            <rect x="4" y="18" width="56" height="4" fill="#ffcc33" />
            <polygon points="10,16 18,4 28,14 32,2 36,14 46,4 54,16" fill="#ffcc33" />
            <rect x="8" y="25" width="48" height="3" fill="#e03131" />
            <rect x="14" y="31" width="36" height="3" fill="#3b82f6" />
          </svg>
          <h1 className="console-game-title">
            Presidential <span>Brawl</span>
          </h1>
          <p className="console-tagline">Elige a tu luchador y disputa el combate en un palacio presidencial.</p>
        </div>

        <nav className="console-menu" role="menu" aria-label="Opciones">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const focused = focusIdx === idx;
            return (
              <button
                key={item.id}
                ref={(el) => { btnRefs.current[idx] = el; }}
                role="menuitem"
                type="button"
                data-gamepad-initial={item.primary || undefined}
                className={`console-menu-item ${item.primary ? 'is-primary' : ''} ${focused ? 'is-focused' : ''}`}
                onFocus={() => setFocusIdx(idx)}
                onMouseEnter={() => { setFocusIdx(idx); btnRefs.current[idx]?.focus(); }}
                onClick={() => activate(item)}
              >
                <span className="console-menu-icon" aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="console-menu-text">
                  <span className="console-menu-label">{item.label}</span>
                  <span className="console-menu-sub">{item.sub}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="console-hints" aria-hidden>
          <span>↑↓ Navegar</span>
          <span>Enter Seleccionar</span>
        </div>
      </div>
    </div>
  );
}
