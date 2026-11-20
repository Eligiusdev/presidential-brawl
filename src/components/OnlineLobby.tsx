import { useRef } from 'react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import type { RoomState } from '../network/matchState';
import { OnlineRoster } from './CharacterSelect';

export function OnlineLobby({ room, slot, send, leave }: {
  room: RoomState; slot: number; send: (message: object) => void; leave: () => void;
}) {
  const linkField = useRef<HTMLInputElement>(null);
  const self = room.players[slot];
  const host = room.hostSlot === slot;
  const ready = room.players.every(p => p?.ready && p.connected);
  const url = new URL(location.href);
  url.searchParams.set('room', room.code);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw Error();
      await navigator.clipboard.writeText(url.href);
    } catch { linkField.current?.select(); }
  };
  return <section data-gamepad-online className="online-screen online-lobby" aria-label="Selección en línea">
    <header>
      <div><h2>{room.maxPlayers === 2 ? 'Duelo' : room.maxPlayers === 8 ? 'Gran Campal' : 'Campal'} · {room.maxPlayers} jugadores</h2>
        <p>J{slot + 1} · Sala {room.code}</p></div>
      <button data-gamepad-back onClick={leave}>Salir</button>
    </header>
    <div className="online-slots">
      {room.players.map((p, index) => {
        const fighter = PRESIDENTS_DATA.find(f => f.id === p?.fighterId);
        return <article key={index} style={{ borderColor: p?.color }} aria-label={`Jugador ${index + 1}`}>
          <strong>J{index + 1}{room.hostSlot === index ? ' · Anfitrión' : ''}{index === slot ? ' · Tú' : ''}</strong>
          {fighter && <span>{fighter.name}</span>}
          <small>{p?.connected ? `${p.ready ? 'Listo' : 'Eligiendo'} · ${p.ping} ms` : p ? 'Reconectando…' : 'Puesto libre'}</small>
        </article>;
      })}
    </div>
    <div className="online-room-options">
      <label>Escenario <select value={room.stage} disabled={!host}
        onChange={e => send({ type: 'stage', stage: Number(e.target.value) })}>
        {STAGES_DATA.map((stage, i) => <option key={stage.id} value={i}>{stage.name}</option>)}
      </select></label>
      <input ref={linkField} readOnly aria-label="Enlace de invitación" value={url.href} onFocus={e => e.target.select()} />
      <button onClick={() => void copy()}>Copiar invitación</button>
    </div>
    <OnlineRoster pickedId={self?.fighterId ?? null} onPick={fighterId => send({ type: 'select', fighterId })} />
    <footer>
      <button disabled={!self?.fighterId} onClick={() => send({ type: 'ready', ready: !self?.ready })}>
        {self?.ready ? 'Cambiar disponibilidad' : 'Estoy listo'}
      </button>
      {host && <button disabled={!ready} onClick={() => send({ type: 'start' })}>Iniciar combate</button>}
    </footer>
  </section>;
}
