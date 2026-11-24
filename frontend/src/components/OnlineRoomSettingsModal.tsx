import { useEffect, useState } from 'react';
import { Check, Crown, Globe, Sliders, Users, X } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import type { RoomCapacity } from '../data/stages';
import type { RoomState } from '../network/matchState';

type Mode = 'ffa' | 'champion' | 'tournament';

const modes: Array<{ value: Mode; label: string; desc: string; icon: typeof Globe }> = [
  { value: 'ffa', label: 'Todos contra todos', desc: 'Cada luchador pelea por su cuenta', icon: Globe },
  { value: 'tournament', label: 'Por equipos', desc: 'Duelos 2v2, 3v3 o 4v4', icon: Users },
  { value: 'champion', label: 'Champion', desc: 'El ganador sigue en la cima', icon: Crown },
];
const capacities: RoomCapacity[] = [2, 4, 6, 8];

export function OnlineRoomSettingsModal({ room, slot, send, onClose }: {
  room: RoomState; slot: number; send: (message: object) => void; onClose: () => void;
}) {
  const host = room.hostSlot === slot;
  const occupied = room.players.filter(Boolean).length;
  const [mode, setMode] = useState<Mode>(room.mode ?? 'ffa');
  const [capacity, setCapacity] = useState<RoomCapacity>(room.maxPlayers);
  const [teamSize, setTeamSize] = useState(room.teamSize || 1);
  const [stocks, setStocks] = useState(room.stocks ?? 3);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const selectMode = (next: Mode) => {
    sound.uiClick();
    setMode(next);
    if (next === 'tournament') {
      if (capacity < 4) setCapacity(4);
      setTeamSize(capacity >= 8 ? 4 : capacity >= 6 ? 3 : 2);
    } else setTeamSize(1);
  };

  const selectCapacity = (next: RoomCapacity) => {
    sound.uiClick();
    setCapacity(next);
    if (mode === 'tournament') setTeamSize(next / 2);
  };

  const formats = mode === 'tournament' ? capacities.filter(c => c >= 4 && c % 2 === 0) : [];
  const nextStocks = Math.max(1, Math.min(5, stocks));

  return (
    <div data-gamepad-overlay className="console-modal-overlay" role="dialog" aria-modal="true" aria-label="Reglas de la sala"
      style={{ zIndex: 105 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="console-modal" style={{ width: 'min(620px, 100%)' }}>
        <header className="console-modal-head">
          <div className="room-modal-title">
            <div className="room-modal-icon" aria-hidden><Sliders className="h-5 w-5" /></div>
            <div>
              <p className="console-modal-kicker">Configuración de la sala {room.code}</p>
              <h2>Reglas de la partida</h2>
              <p className="room-modal-sub">{host ? 'Cambia el modo, los jugadores y las vidas antes de empezar.' : 'Solo el anfitrión puede cambiar estas reglas.'}</p>
            </div>
          </div>
          <button type="button" data-gamepad-back className="console-modal-close" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </header>

        <div className="console-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <span className="room-modal-section-kicker"><Sliders className="h-3.5 w-3.5" />Modo de juego</span>
            <div className="room-mode-grid" role="radiogroup" aria-label="Modo de juego" style={{ marginTop: 8 }}>
              {modes.map(option => {
                const Icon = option.icon;
                const selected = mode === option.value;
                return <button key={option.value} type="button" role="radio" aria-checked={selected} disabled={!host}
                  className={`room-mode-card ${selected ? 'is-selected' : ''}`} onClick={() => selectMode(option.value)}>
                  <span className="room-mode-icon" aria-hidden><Icon className="h-4 w-4" /></span>
                  <span className="room-mode-text"><strong>{option.label}</strong><small>{option.desc}</small></span>
                  <span className="room-mode-check" aria-hidden>{selected ? '●' : '○'}</span>
                </button>;
              })}
            </div>
          </div>

          <div>
            <span className="room-modal-section-kicker"><Users className="h-3.5 w-3.5" />{mode === 'tournament' ? 'Formato de equipos' : 'Jugadores'}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cantidad de jugadores" style={{ marginTop: 8 }}>
              {capacities.map(c => {
                const disabled = !host || c < occupied || (mode === 'tournament' && ![4, 6, 8].includes(c));
                const selected = capacity === c;
                return <button key={c} type="button" role="radio" aria-checked={selected} disabled={disabled}
                  className={`console-btn ${selected ? 'console-btn-primary' : ''}`} onClick={() => selectCapacity(c)}>{c} jugadores</button>;
              })}
            </div>
          </div>

          {mode === 'tournament' && <div>
            <span className="room-modal-section-kicker"><Users className="h-3.5 w-3.5" />Equipos</span>
            <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
              {formats.filter(c => capacity % c === 0).map(c => {
                const size = c / 2;
                const selected = teamSize === size;
                return <button key={c} type="button" disabled={!host} className={`console-btn ${selected ? 'console-btn-primary' : ''}`}
                  onClick={() => { sound.uiClick(); setTeamSize(size); }}>{size}v{size}</button>;
              })}
            </div>
          </div>}

          <div>
            <span className="room-modal-section-kicker"><Check className="h-3.5 w-3.5" />Vidas (Stocks)</span>
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" disabled={!host}
                className={`flex-1 rounded-lg border py-2 font-mono-num text-sm font-bold ${stocks === n ? 'border-[#ffcc33] bg-[#ffcc33] text-[#0b0e17]' : 'border-[#252f47] bg-[#141b2d] text-[#cbd5e1]'}`}
                onClick={() => { sound.uiClick(); setStocks(n); }}>{n}</button>)}
            </div>
          </div>

          <div className="online-create-summary">
            {mode === 'tournament' ? `Equipos de ${teamSize} · ` : mode === 'champion' ? 'Duelos secuenciales · ' : 'Todos contra todos · '}
            {capacity} jugadores · {nextStocks} vidas
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="console-btn" onClick={onClose}>{host ? 'Cancelar' : 'Cerrar'}</button>
            {host && <button type="button" data-gamepad-initial className="console-btn console-btn-primary" onClick={() => {
              sound.uiConfirm();
              send({
                type: 'roomConfig', mode, maxPlayers: capacity,
                teamSize: mode === 'tournament' ? teamSize : 1, stocks: nextStocks,
              });
              onClose();
            }}>Guardar cambios</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
