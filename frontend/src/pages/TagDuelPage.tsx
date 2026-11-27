import { readGamepadActions } from '../input/gamepadActions';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TouchControls } from '../components/TouchControls';
import { DEFAULT_P1_KEYS, DEFAULT_P2_KEYS, PAD_BUTTON_LABELS } from '../config/defaultConfig';
import { PRESIDENTS_DATA } from '../data/presidents';
import { FighterSelectionCard } from '../components/FighterSelectionCard';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { useGame } from '../game/GameContext';
import { STAGES_DATA } from '../data/stages';
import type { MatchSnapshot } from '../network/matchState';
import { loadWasmSim } from '../sim/wasmSim';
import type { PlayerAction } from '../types/game';

type Teams = [string[], string[]];
type Settings = { teams: Teams; stage: number; solo: boolean; practice: boolean };
type Action = PlayerAction | 'assist1' | 'assist2';
const assistButtons = [8, 10] as const;
const assistActions = ['assist1', 'assist2'] as const;
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
  const { config } = useGame();
  const gamepad = useRef(config.controls);
  gamepad.current = config.controls;
  const [lesson, setLesson] = useState(0);
  const [teams, setTeams] = useState<Teams>([['bolivar', 'lincoln', 'aquiles'], ['washington', 'musashi', 'juana']]);
  const [stage, setStage] = useState(0);
  const [solo, setSolo] = useState(true);
  const [match, setMatch] = useState<Settings | null>(null);
  const [preview, setPreview] = useState({ seat: 0, slot: 0 });
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const arenaStage = STAGES_DATA[stage];
  const fighter = PRESIDENTS_DATA.find(item => item.id === teams[preview.seat][preview.slot]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [winner, setWinner] = useState<number | null>(null);
  const arena = useRef<HTMLDivElement>(null);
  const touch = useRef(new Set<Action>());
  const touchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const [padFamily, setPadFamily] = useState<"playstation" | "xbox" | "standard">("standard");
  useEffect(() => {
    const update = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find(item => item?.connected);
      const id = pad?.id ?? "";
      setPadFamily(/playstation|dualshock|dualsense|054c/i.test(id) ? "playstation" : /xbox|045e/i.test(id) ? "xbox" : "standard");
    };
    update();
    window.addEventListener("gamepadconnected", update);
    window.addEventListener("gamepaddisconnected", update);
    return () => { window.removeEventListener("gamepadconnected", update); window.removeEventListener("gamepaddisconnected", update); };
  }, []);

  useEffect(() => {
    const menu = dialog.current;
    if (paused && menu && !menu.open) menu.showModal();
    if (!paused && menu?.open) menu.close();
  }, [paused]);

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
      if (event.type === 'keydown' && event.code === 'Escape' && !event.repeat &&
          !pause.current && !host.parentElement?.querySelector('[data-tag-finished]')) {
        event.preventDefault();
        event.stopPropagation();
        clear();
        pause.current = true;
        setPaused(true);
        return;
      }
      if (pause.current) return;
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
        mode: match.solo && !match.practice ? 'tag-solo' : 'tag', items: 'off', hazard: 'off', hitstop: true,
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
      let assisted = false;
      let waitForPadRelease = true;
      const frame = (now: number) => {
        if (pause.current) {
          clear();
          waitForPadRelease = true;
          previous = now;
          elapsed = 0;
          frameId = requestAnimationFrame(frame);
          return;
        }
        if (!document.hidden) elapsed += Math.min(stepMs * 5, now - previous);
        previous = now;
        if (elapsed >= stepMs) {
          inputs[0].length = inputs[1].length = 0;
          for (const key of keys) {
            const command = bindings.get(key);
            if (command && (!match.solo || command.seat === 0)) inputs[command.seat].push(command.action);
          }
          for (const action of touch.current) inputs[0].push(action);
          let seat = 0;
          const pads = navigator.getGamepads?.() ?? [];
          if (waitForPadRelease && !Array.from(pads).some(pad => pad?.buttons.some(button => button.pressed))) {
            waitForPadRelease = false;
          }
          for (const pad of pads) {
            if (waitForPadRelease) break;
            if (!pad?.connected || seat >= (match.solo ? 1 : 2)) continue;
            const held = inputs[seat++];
            readGamepadActions(pad, gamepad.current, action => {
              if (!held.includes(action)) held.push(action);
            });
            for (let i = 0; i < assistButtons.length; i++) {
              if (pad.buttons[assistButtons[i]]?.pressed) held.push(assistActions[i]);
            }
          }
          while (elapsed >= stepMs) {
            wasm.step(id, inputs);
            elapsed -= stepMs;
          }
          const state = snapshot();
          scene.sync(readScene(id), state, readTeam(id));
          scene.app.render();
          if (match.practice) {
            if (!assisted && state.tagAssistIds?.[0]) { assisted = true; setLesson(1); }
            if (assisted && state.players[0]?.fighterId !== match.teams[0][0]) { setLesson(2); return; }
            if (state.tick >= 3600) { setLesson(3); return; }
          }
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

  const resume = () => {
    touch.current.clear();
    pause.current = false;
    setPaused(false);
  };
  const start = (practice = false) => {
    setLesson(0);
    resume();
    setReady(false);
    setWinner(null);
    setError('');
    setMatch({ teams, stage, solo: practice || solo, practice });
  };
  const touchAction = (action: Action, down: boolean) => {
    if (down) touch.current.add(action);
    else touch.current.delete(action);
  };

  const playing = ready && winner === null && lesson < 2 && !error;
  const restart = () => start(match?.practice);

  if (match) return <section data-gamepad-tag data-gamepad-playing={playing || undefined} className="tag-duel tag-duel-playing" aria-label="Duelo 3v3">
    <div className="tag-duel-arena" ref={arena} />
    <button type="button" className="console-btn tag-duel-exit" data-gamepad-tag-pause data-gamepad-back onClick={() => {
      if (!playing) { resume(); setMatch(null); return; }
      pause.current = true;
      setPaused(true);
    }}>{playing ? 'Pausa' : 'Volver a equipos'}</button>
    <dialog ref={dialog} className="m-auto max-h-[90dvh] w-[min(92vw,34rem)] overflow-auto rounded-xl bg-[#111e34] p-5 text-white backdrop:bg-black/70"
      aria-labelledby="tag-pause-title" onCancel={event => { event.preventDefault(); resume(); }}>
      <h2 id="tag-pause-title" className="text-xl font-bold">Duelo en pausa</h2>
      <TagControlGuide bindings={config.controls.gamepadBindings} family={padFamily} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="console-btn" autoFocus data-gamepad-back onClick={resume}>Continuar</button>
        <button type="button" className="console-btn" onClick={restart}>Reiniciar</button>
        <button type="button" className="console-btn" onClick={() => { resume(); setMatch(null); }}>Volver a equipos</button>
      </div>
    </dialog>
    {!ready && !error && <p role="status" className="tag-duel-message">Preparando los luchadores…</p>}
    {error && <p role="alert" className="tag-duel-message">{error}</p>}
    {winner !== null && <div data-tag-finished className="tag-duel-message">
      <h2>Ganó el equipo {winner + 1}</h2>
      <button type="button" className="console-btn" onClick={restart}>Revancha</button>
    </div>}
    {match.practice && ready && !paused && <div
      className={lesson < 2 ? 'pointer-events-none absolute left-1/2 top-[15%] z-20 w-max max-w-[90%] -translate-x-1/2 rounded bg-[#111e34] px-3 py-2 text-center text-sm' : 'tag-duel-message'}
      role="status" data-tag-finished={lesson >= 2 ? '' : undefined}>
      {['1/2 · Pulsa y suelta A1 para llamar a la reserva.', '2/2 · Cuando salga la asistencia, mantén A1 para relevar.',
        'Reto completado. Llamaste a la reserva y cambiaste de titular.', 'Se acabó el minuto. Puedes intentarlo de nuevo.'][lesson]}
      {lesson >= 2 && <button className="console-btn mx-auto mt-2 block" onClick={restart}>Repetir reto</button>}
    </div>}
    {playing && !paused && touchDevice && <>
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

  return <section data-gamepad-tag className="tag-duel tag-duel-selection" aria-labelledby="tag-title">
    <Link to="/combat" data-gamepad-back>Volver a combate</Link>
    <h1 id="tag-title">Duelo 3v3</h1>
    <div className="tag-duel-teams">
      {teams.map((team, seat) => <fieldset key={seat}>
        <legend>Equipo {seat + 1}</legend>
        {team.map((id, slot) => <label key={slot}>{slot === 0 ? 'Titular' : `Reserva ${slot}`}
          <select value={id} onFocus={() => setPreview({ seat, slot })} onChange={event => {
            setPreview({ seat, slot });
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
    <div className="tag-duel-teams">
      {fighter && <FighterSelectionCard fighter={fighter}
        label={`Equipo ${preview.seat + 1} · ${preview.slot === 0 ? 'Titular' : `Reserva ${preview.slot}`}`} selected />}
      <figure className="overflow-hidden rounded-lg bg-[#111e34]">
        <img className="aspect-video w-full object-cover" src={stageArtUrl(arenaStage.id, 'day')} alt="" />
        <figcaption className="p-2 text-sm">{arenaStage.name} · {arenaStage.city}</figcaption>
      </figure>
    </div>
    <details className="w-full max-w-[720px] rounded-lg bg-[#111e34] p-3">
      <summary className="cursor-pointer font-semibold">Controles del duelo</summary>
      <TagControlGuide bindings={config.controls.gamepadBindings} family={padFamily} />
    </details>
    <button type="button" className="console-btn" onClick={() => start()}>Empezar duelo</button>
    <button type="button" className="console-btn" onClick={() => start(true)}>Practicar asistencia y relevo · 1 minuto</button>
  </section>;
}

function TagControlGuide({ bindings, family }: {
  bindings: ReturnType<typeof useGame>['config']['controls']['gamepadBindings'];
  family: 'playstation' | 'xbox' | 'standard';
}) {
  const label = (index: number) => {
    const name = PAD_BUTTON_LABELS[index] ?? `Botón ${index + 1}`;
    const [left, right] = name.split(' / ');
    return family === 'playstation' ? left : family === 'xbox' ? right ?? left : name;
  };
  const labels = (action: PlayerAction) => bindings[action].map(label).join(', ') || 'Sin asignar';
  return <div className="mt-2 grid gap-2 text-sm">
    <p><strong>J1:</strong> WASD para moverte, J / H / K / N para L / M / H / S, L para esquivar, C para la definitiva y Q / E para A1 / A2.</p>
    <p><strong>J2:</strong> flechas para moverte, U / Núm. 4 / I / Núm. 5 para L / M / H / S, O para esquivar, M para la definitiva y [ / ] para A1 / A2.</p>
    <p><strong>Táctil:</strong> usa la cruceta y los botones de ataque. Pulsa A1 o A2 para asistir o mantén el botón para relevar.</p>
    <p><strong>Mando estándar:</strong> cruceta o stick para moverte. L: {labels('light')}; M: {labels('medium')}; H: {labels('heavy')}; S: {labels('special')}. A1: {label(8)}; A2: {label(10)}. {label(9)} pausa. {label(0)} confirma y {label(1)} vuelve.</p>
    <p><strong>Reflejo:</strong> pulsa S mientras te alejas del rival. <strong>Pausa:</strong> Esc o el botón Pausa.</p>
  </div>;
}
