import { ArrowUp, Crown, Crosshair, RotateCcw, Swords, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { sound } from '../audio/soundEngine';
import type { PlayerAction } from '../types/game';

const actions = [
  { action: 'jump', label: 'Saltar', Icon: ArrowUp },
  { action: 'light', label: 'Golpe', Icon: Swords },
  { action: 'heavy', label: 'Especial', Icon: Crosshair },
  { action: 'dash', label: 'Esquivar', Icon: Zap },
  { action: 'ult', label: 'Supremo', Icon: Crown },
  { action: 'reload', label: 'Recargar', Icon: RotateCcw },
] as const;
const directions = ['left', 'right', 'down'] as const;
const radius = 42;

export function TouchControls({ onAction, ultReady = false, hasGun = true, inline = false }: {
  onAction: (action: PlayerAction, active: boolean) => void;
  ultReady?: boolean;
  hasGun?: boolean;
  inline?: boolean;
}) {
  const callback = useRef(onAction);
  callback.current = onAction;
  const active = useRef(new Set<PlayerAction>());
  const stick = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const buttons = useRef(new Map<number, PlayerAction>());
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState<PlayerAction[]>([]);

  const setAction = (action: PlayerAction, next: boolean) => {
    if (active.current.has(action) === next) return;
    if (next) active.current.add(action);
    else active.current.delete(action);
    callback.current(action, next);
    setPressed([...active.current]);
  };

  useEffect(() => {
    const release = () => {
      for (const action of active.current) callback.current(action, false);
      active.current.clear();
      buttons.current.clear();
      stick.current = null;
      setOrigin(null);
      setOffset({ x: 0, y: 0 });
      setPressed([]);
    };
    const visibility = () => { if (document.hidden) release(); };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', visibility);
      for (const action of active.current) callback.current(action, false);
      active.current.clear();
    };
  }, []);

  useEffect(() => {
    if (hasGun || !active.current.has('reload')) return;
    for (const [pointer, action] of buttons.current) {
      if (action === 'reload') buttons.current.delete(pointer);
    }
    setAction('reload', false);
  }, [hasGun]);

  const startStick = (e: PointerEvent<HTMLDivElement>) => {
    if (stick.current || e.button !== 0) return;
    sound.init();
    e.currentTarget.setPointerCapture(e.pointerId);
    const bounds = e.currentTarget.getBoundingClientRect();
    stick.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY };
    setOrigin({
      x: Math.max(30, Math.min(bounds.width - 30, e.clientX - bounds.left)),
      y: Math.max(30, Math.min(bounds.height - 30, e.clientY - bounds.top)),
    });
  };
  const moveStick = (e: PointerEvent<HTMLDivElement>) => {
    const start = stick.current;
    if (!start || start.pointer !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const size = Math.max(radius, Math.hypot(dx, dy));
    setOffset({ x: dx * radius / size, y: dy * radius / size });
    setAction('left', dx / size < -0.25);
    setAction('right', dx / size > 0.25);
    setAction('down', dy / size > 0.43);
  };
  const resetStick = (e: PointerEvent<HTMLDivElement>) => {
    if (stick.current?.pointer !== e.pointerId) return;
    stick.current = null;
    setOrigin(null);
    setOffset({ x: 0, y: 0 });
    for (const action of directions) setAction(action, false);
  };
  const releaseButton = (pointer: number) => {
    const action = buttons.current.get(pointer);
    if (!action) return;
    buttons.current.delete(pointer);
    if (![...buttons.current.values()].includes(action)) setAction(action, false);
  };

  return <div className={`touch-deck ${inline ? 'touch-deck-inline' : ''}`} aria-label="Controles táctiles">
    <div className="touch-stick-zone" aria-label="Control de movimiento" onPointerDown={startStick}
      onPointerMove={moveStick} onPointerUp={resetStick} onPointerCancel={resetStick} onLostPointerCapture={resetStick}>
      <div className={`touch-stick ${origin ? 'touch-stick-active' : ''}`}
        style={origin ? { left: origin.x, top: origin.y } : undefined}>
        <div className="touch-knob" style={{ transform: `translate(${offset.x * 0.65}px, ${offset.y * 0.65}px)` }} />
      </div>
    </div>
    <div className="touch-action-grid">
      {actions.filter(({ action }) => action !== 'reload' || hasGun).map(({ action, label, Icon }) =>
        <button key={action} type="button" className={`touch-action touch-${action}`} data-ready={action === 'ult' && ultReady}
          aria-pressed={pressed.includes(action)} aria-label={label}
          onContextMenu={e => e.preventDefault()}
          onPointerDown={e => {
            if (e.button !== 0) return;
            sound.init();
            e.currentTarget.setPointerCapture(e.pointerId);
            buttons.current.set(e.pointerId, action);
            setAction(action, true);
          }}
          onPointerUp={e => releaseButton(e.pointerId)} onPointerCancel={e => releaseButton(e.pointerId)}
          onLostPointerCapture={e => releaseButton(e.pointerId)}>
          <Icon size={19} aria-hidden="true" /><span>{label}</span>
        </button>
      )}
    </div>
  </div>;
}
