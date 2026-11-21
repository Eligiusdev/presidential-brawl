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
    const orientation = window.screen.orientation;
    orientation?.addEventListener('change', release);
    window.addEventListener('orientationchange', release);
    window.addEventListener('pointerup', releasePointer, true);
    window.addEventListener('pointercancel', releasePointer, true);
    window.addEventListener('blur', release);
    window.addEventListener('pagehide', release);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      orientation?.removeEventListener('change', release);
      window.removeEventListener('orientationchange', release);
      window.removeEventListener('pointerup', releasePointer, true);
      window.removeEventListener('pointercancel', releasePointer, true);
      window.removeEventListener('blur', release);
      window.removeEventListener('pagehide', release);
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
    e.preventDefault();
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
    const horizontal = dx / size;
    const left = horizontal < (active.current.has('left') ? -0.13 : -0.21);
    const right = horizontal > (active.current.has('right') ? 0.13 : 0.21);
    // Release before switching direction so the online client never sends both.
    if (!left) setAction('left', false);
    if (!right) setAction('right', false);
    if (left) setAction('left', true);
    if (right) setAction('right', true);
    setAction('down', dy / size > (active.current.has('down') ? 0.25 : 0.36));
  };
  const releaseButton = (pointer: number) => {
    const action = buttons.current.get(pointer);
    if (!action) return;
    buttons.current.delete(pointer);
    if (![...buttons.current.values()].includes(action)) setAction(action, false);
  };

  const releasePointer = ({ pointerId }: { pointerId: number }) => {
    if (stick.current?.pointer === pointerId) {
      stick.current = null;
      setOrigin(null);
      setOffset({ x: 0, y: 0 });
      for (const action of directions) setAction(action, false);
    }
    releaseButton(pointerId);
  };

  return <div className={`touch-deck ${inline ? 'touch-deck-inline' : ''}`} aria-label="Controles táctiles">
    <div className="touch-stick-zone" aria-label="Control de movimiento" onPointerDown={startStick}
      onPointerMove={moveStick} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer}>
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
            e.preventDefault();
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
