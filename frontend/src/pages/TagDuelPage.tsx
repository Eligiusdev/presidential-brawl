import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TouchControls } from '../components/TouchControls';
import { DEFAULT_P1_KEYS, DEFAULT_P2_KEYS } from '../config/defaultConfig';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import type { MatchSnapshot } from '../network/matchState';
import { loadWasmSim } from '../sim/wasmSim';
import type { PlayerAction } from '../types/game';

type Teams = [string[], string[]];
type Settings = { teams: Teams; stage: number; solo: boolean };
type Action = PlayerAction | 'assist1' | 'assist2';
const stepMs = 1000 / 60;
const bindings = new Map<string, { seat: number; action: Action }>();
for (const [seat, layout] of [DEFAULT_P1_KEYS, DEFAULT_P2_KEYS].entries()) {
  for (const [action, codes] of Object.entries(layout)) {
    for (const code of codes) bindings.set(code, { seat, action: action as PlayerAction });
  }
}
bindings.set('KeyQ', { seat: 0, action: 'assist1' });
bindings.set('KeyE', { seat: 0, action: 'assist2' });
bindings.set('BracketLeft', { seat: 1, action: 'assist1' });
bindings.set('BracketRight', { seat: 1, action: 'assist2' });

export function TagDuelPage() {
  const [teams, setTeams] = useState<Teams>([['bolivar', 'lincoln', 'aquiles'], ['washington', 'musashi', 'juana']]);
  const [stage, setStage] = useState(0);
  const [solo, setSolo] = useState(true);
  const [match, setMatch] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [winner, setWinner] = useState<number | null>(null);
  const arena = useRef<HTMLDivElement>(null);
  const touch = useRef(new Set<Action>());
  const touchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

  useEffect(() => {
    if (!match || !arena.current) return;
    const host = arena.current;
    let cancelled = false;
    let frameId = 0;
    let free: (() => void) | undefined;
    let destroy: (() => void) | undefined;
    const keys = new Set<string>();
    const clear = () => { keys.clear(); touch.current.clear(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.type === 'keyup') keys.delete(event.code);
      if (event.altKey || event.ctrlKey || event.metaKey || !bindings.has(event.code)) return;
      if (event.target instanceof Element && event.target.closest('button,a,select,input')) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') keys.add(event.code);
    };
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('keyup', keyboard, true);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);

    const boot = async () => {
      const [wasm, renderer] = await Promise.all([loadWasmSim(), import('../render/pixiCombat')]);
      if (cancelled) return;
      const readTeam = wasm.tagHUDView;
      const readScene = wasm.onlineRenderView;
      if (!readTeam || !readScene) throw Error('El Duelo 3v3 requiere la versión actual de Wasm.');
      const id = wasm.create(match.teams.flat(), match.stage, Date.now() & 0x7fffffff, {
        mode: match.solo ? 'tag-solo' : 'tag', items: 'off', hazard: 'off', hitstop: true,
      });
      if (typeof id !== 'number' || id < 1) throw Error('No se pudo crear el duelo.');
      free = () => wasm.free(id);
      const snapshot = () => wasm.snapshot(id) as MatchSnapshot & { winnerPi: number | null };
      const template = document.createElement('canvas');
      template.className = 'tag-duel-canvas pixel-canvas';
      const scene = await renderer.createPixiCombat(template, snapshot(), match.teams);
      if (cancelled) { scene.destroy(); return; }
      destroy = scene.destroy;
      scene.app.canvas.setAttribute('aria-label', 'Arena Duelo 3v3');
      host.appendChild(scene.app.canvas);
      scene.sync(readScene(id), snapshot(), readTeam(id));
      scene.app.render();
      setReady(true);

      let previous = performance.now();
      let elapsed = 0;
      const inputs: Action[][] = [[], []];
      const frame = (now: number) => {
        if (!document.hidden) elapsed += Math.min(stepMs * 5, now - previous);
        previous = now;
        if (elapsed >= stepMs) {
          inputs[0].length = inputs[1].length = 0;
          for (const key of keys) {
            const command = bindings.get(key);
            if (command && (!match.solo || command.seat === 0)) inputs[command.seat].push(command.action);
          }
          for (const action of touch.current) inputs[0].push(action);
          while (elapsed >= stepMs) {
            wasm.step(id, inputs);
            elapsed -= stepMs;
          }
          const state = snapshot();
          scene.sync(readScene(id), state, readTeam(id));
          scene.app.render();
          if (state.winnerPi === 0 || state.winnerPi === 1) {
            setWinner(state.winnerPi);
            return;
          }
        }
        frameId = requestAnimationFrame(frame);
      };
      frameId = requestAnimationFrame(frame);
    };
    void boot().catch((cause: unknown) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el duelo.');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('keyup', keyboard, true);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
      clear();
      destroy?.();
      free?.();
    };
  }, [match]);

  const start = () => {
    setReady(false);
    setWinner(null);
    setError('');
    setMatch({ teams, stage, solo });
  };
  const touchAction = (action: Action, down: boolean) => {
    if (down) touch.current.add(action);
    else touch.current.delete(action);
  };

  if (match) return <section className="tag-duel tag-duel-playing" aria-label="Duelo 3v3">
    <div className="tag-duel-arena" ref={arena} />
    <button type="button" className="console-btn tag-duel-exit" onClick={() => setMatch(null)}>Volver a equipos</button>
    {!ready && !error && <p role="status" className="tag-duel-message">Preparando los luchadores…</p>}
    {error && <p role="alert" className="tag-duel-message">{error}</p>}
    {winner !== null && <div className="tag-duel-message">
      <h2>Ganó el equipo {winner + 1}</h2>
      <button type="button" className="console-btn" onClick={start}>Revancha</button>
    </div>}
    {ready && winner === null && touchDevice && <>
      <TouchControls onAction={touchAction} techniques hasGun={false} />
      <div className="tag-duel-assists" aria-label="Asistencias">
        {(['assist1', 'assist2'] as const).map((action, i) => <button type="button" key={action} className="console-btn"
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchAction(action, true); }}
          onPointerUp={() => touchAction(action, false)} onPointerCancel={() => touchAction(action, false)}
          onLostPointerCapture={() => touchAction(action, false)}>
          A{i + 1}
        </button>)}
      </div>
    </>}
  </section>;

  return <section className="tag-duel tag-duel-selection" aria-labelledby="tag-title">
    <Link to="/combat">Volver a combate</Link>
    <h1 id="tag-title">Duelo 3v3</h1>
    <div className="tag-duel-teams">
      {teams.map((team, seat) => <fieldset key={seat}>
        <legend>Equipo {seat + 1}</legend>
        {team.map((id, slot) => <label key={slot}>{slot === 0 ? 'Titular' : `Reserva ${slot}`}
          <select value={id} onChange={event => {
            const picked = event.target.value;
            setTeams(current => current.map((roster, i) =>
              i === seat ? roster.map((fighter, member) => member === slot ? picked : fighter) : roster) as Teams);
          }}>
            {PRESIDENTS_DATA.map(fighter => <option key={fighter.id} value={fighter.id}
              disabled={team.some((other, index) => index !== slot && other === fighter.id)}>{fighter.name}</option>)}
          </select>
        </label>)}
      </fieldset>)}
    </div>
    <div className="tag-duel-teams">
      <label>Escenario <select value={stage} onChange={event => setStage(Number(event.target.value))}>
        {STAGES_DATA.map((item, index) => <option key={item.id} value={index}>{item.name}</option>)}
      </select></label>
      <label>Rival <select value={solo ? 'cpu' : 'local'} onChange={event => setSolo(event.target.value === 'cpu')}>
        <option value="cpu">CPU</option><option value="local">Jugador local</option>
      </select></label>
    </div>
    <p>A1/A2: Q y E para J1, [ y ] para J2. Pulsa para asistir o mantén para relevar.</p>
    <button type="button" className="console-btn" onClick={start}>Empezar duelo</button>
  </section>;
}
