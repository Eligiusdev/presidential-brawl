import { AdaptiveRenderQuality } from '../engine/renderPerformance';
import { preloadMatchArt } from '../engine/matchArt';
import { clearPerformanceSamples, performanceMetricsEnabled, samplePerformance } from '../engine/performanceMetrics';
import { useMenuGamepad } from '../input/useMenuGamepad';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sound } from '../audio/soundEngine';
import {
  loadConfig, loadCustomPresidents, loadLastReplay, saveConfig, saveCustomPresidents, saveLastReplay,
} from '../config/defaultConfig';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import { GameEngine } from '../engine/gameEngine';
import { stageArtUrl, stageNightMix } from '../engine/stageAtmosphere';
import type { CampaignState, GameConfig, GameMode, GameScreenState, HudSnapshot, MatchReplayData, MatchSummary, PlayerAction, PresidentData } from '../types/game';

type Screen = GameScreenState;
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export interface GameCtx {
  config: GameConfig; updateConfig: (c: GameConfig) => void;
  customPresidents: PresidentData[]; roster: PresidentData[];
  lastReplay: MatchReplayData | null;
  screen: Screen; setScreen: SetState<Screen>;
  customizerReturn: 'TITLE' | 'SELECT'; customizerBase: PresidentData | undefined;
  campaignSelection: boolean; setCampaignSelection: SetState<boolean>;
  mode: GameMode; sel: [number, number]; setSel: SetState<[number, number]>;
  stageSel: number; setStageSel: (n: number) => void;
  vsAI: boolean; setVsAI: SetState<boolean>;
  configOpen: boolean; setConfigOpen: SetState<boolean>;
  hud: HudSnapshot | null; campaign: CampaignState | null; summary: MatchSummary | null;
  replayPaused: boolean; setReplayPaused: SetState<boolean>;
  replaySpeed: 0.5 | 1 | 2; setReplaySpeed: SetState<0.5 | 1 | 2>;
  replayEnded: boolean; replayFrame: number;
  netOpenSignal: number; setNetOpenSignal: SetState<number>;
  loadingArt: boolean; lesson: number | null;
  engineRef: RefObject<GameEngine | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  arenaBackdropRef: RefObject<HTMLDivElement | null>;
  appRef: RefObject<HTMLElement | null>;
  onlineActive: RefObject<boolean>;
  openCustomizer: (from: 'TITLE' | 'SELECT', editTarget?: PresidentData) => void;
  handleSaveCustom: (fighter: PresidentData) => void;
  handleDeleteCustom: (id: string) => void;
  startCampaign: () => void;
  startVersus: () => void;
  startTraining: (guided?: boolean) => void;
  togglePause: () => void;
  startReplay: (from: 'TITLE' | 'SELECT' | 'GAME_OVER' | 'CENSURE' | 'CHAMPION', replayObj?: MatchReplayData | null) => void;
  restartReplay: () => void;
  exitReplay: () => void;
  downloadReplayJson: () => void;
  handleToggleMute: () => void;
  handleTouchAction: (action: PlayerAction, active: boolean) => void;
  onContinueCampaign: () => void;
  onRestartMatch: () => void;
  onExitToSelect: () => void;
  onSwitchStageLive: (idx: number) => void;
  crtClass: string;
}

const Ctx = createContext<GameCtx | null>(null);
export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame outside GameProvider');
  return v;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GameConfig>(() => loadConfig());
  const [customPresidents, setCustomPresidents] = useState<PresidentData[]>(() => loadCustomPresidents());
  const [lastReplay, setLastReplay] = useState<MatchReplayData | null>(() => loadLastReplay());
  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [customizerReturn, setCustomizerReturn] = useState<'TITLE' | 'SELECT'>('TITLE');
  const [replayReturn, setReplayReturn] = useState<'TITLE' | 'SELECT' | 'GAME_OVER' | 'CENSURE' | 'CHAMPION'>('GAME_OVER');
  const [customizerBase, setCustomizerBase] = useState<PresidentData | undefined>(undefined);
  const [campaignSelection, setCampaignSelection] = useState(false);
  const [mode, setMode] = useState<GameMode>('versus');
  const [sel, setSel] = useState<[number, number]>(() => {
    const i1 = PRESIDENTS_DATA.findIndex((p) => p.id === 'bolivar');
    const i2 = PRESIDENTS_DATA.findIndex((p) => p.id === 'robinson');
    return [i1 >= 0 ? i1 : 0, i2 >= 0 ? i2 : 3];
  });
  const onlineActive = useRef(false);
  const [stageSel, setStageSelState] = useState<number>(0);
  const [vsAI, setVsAI] = useState<boolean>(true);
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [replayPaused, setReplayPaused] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<0.5 | 1 | 2>(1);
  const [replayEnded, setReplayEnded] = useState<boolean>(false);
  const [replayFrame, setReplayFrame] = useState<number>(0);
  const [netOpenSignal, setNetOpenSignal] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const routeSync = useRef(false);

  const roster = useMemo(() => [...PRESIDENTS_DATA, ...customPresidents], [customPresidents]);

  const arenaBackdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const screenRef = useRef<GameScreenState>(screen);
  const configOpenRef = useRef<boolean>(configOpen);
  const replayPausedRef = useRef<boolean>(replayPaused);
  const replaySpeedRef = useRef<0.5 | 1 | 2>(replaySpeed);
  const campaignTimerRef = useRef<number | null>(null);
  const appRef = useRef<HTMLElement>(null);

  screenRef.current = screen;
  configOpenRef.current = configOpen;
  replayPausedRef.current = replayPaused;
  replaySpeedRef.current = replaySpeed;

  const screenToPath = useCallback((s: GameScreenState) => {
    if (s === 'TITLE') return '/';
    if (s === 'SELECT') return '/select';
    if (s === 'CUSTOMIZE') return '/customize';
    if (s === 'REPLAY') return '/replay';
    if (s === 'GAME_OVER') return '/result/defeat';
    if (s === 'CENSURE') return '/result/censure';
    if (s === 'CHAMPION') return '/result/champion';
    if (s === 'PLAYING' || s === 'PAUSED' || s === 'VS') return '/play';
    return null;
  }, []);

  useEffect(() => {
    const p = screenToPath(screen);
    if (!p) return;
    if (location.pathname !== p) { routeSync.current = true; navigate(p, { replace: false }); }
  }, [screen, screenToPath, navigate, location.pathname]);

  useEffect(() => {
    if (routeSync.current) { routeSync.current = false; return; }
    const p = location.pathname;
    if (p.startsWith('/room')) {
      setNetOpenSignal(n => n + 1);
      if (screenRef.current !== 'TITLE' && screenRef.current !== 'SELECT') setScreen('TITLE');
      return;
    }
    if (p.startsWith('/result/')) {
      const kind = p.split('/')[2];
      const map: Record<string, GameScreenState> = { defeat: 'GAME_OVER', censure: 'CENSURE', champion: 'CHAMPION' };
      const next = map[kind];
      if (next && next !== screenRef.current) setScreen(next);
      return;
    }
    const pathToScreen: Record<string, GameScreenState> = {
      '/': 'TITLE', '/select': 'SELECT', '/customize': 'CUSTOMIZE', '/replay': 'REPLAY',
    };
    if (p === '/play') {
      const cur = screenRef.current;
      if (cur === 'PLAYING' || cur === 'PAUSED' || cur === 'VS') return;
      // no active match - redirect to select
      routeSync.current = true; navigate('/select', { replace: true });
      return;
    }
    const next = pathToScreen[p];
    if (!next || next === screenRef.current) return;
    const cur = screenRef.current;
    if ((cur === 'PLAYING' || cur === 'PAUSED' || cur === 'VS') && next !== 'PLAYING') {
      engineRef.current?.clearAllInputs();
      engineRef.current?.startAttractScene();
    }
    setScreen(next);
  }, [location.pathname, navigate]);

  // Sync select params to URL
  useEffect(() => {
    if (screen !== 'SELECT') return;
    const params = new URLSearchParams();
    params.set('stage', String(stageSel));
    const p1 = roster[sel[0]]?.id; const p2 = roster[sel[1]]?.id;
    if (p1) params.set('p1', p1);
    if (p2) params.set('p2', p2);
    params.set('ai', vsAI ? '1' : '0');
    params.set('mode', campaignSelection ? 'campaign' : 'versus');
    const search = `?${params.toString()}`;
    if (location.pathname === '/select' && location.search !== search) {
      routeSync.current = true;
      navigate({ pathname: '/select', search }, { replace: true });
    }
  }, [screen, stageSel, sel, vsAI, campaignSelection, roster, location.pathname, location.search, navigate]);

  // Read select params from URL on navigation to /select
  useEffect(() => {
    if (location.pathname !== '/select') return;
    if (routeSync.current) { routeSync.current = false; return; }
    const params = new URLSearchParams(location.search);
    const p1 = params.get('p1'); const p2 = params.get('p2');
    const stage = params.get('stage'); const ai = params.get('ai'); const modeP = params.get('mode');
    if (p1) { const i = roster.findIndex(r => r.id === p1); if (i >= 0) setSel(cur => cur[0] === i ? cur : [i, cur[1]]); }
    if (p2) { const i = roster.findIndex(r => r.id === p2); if (i >= 0) setSel(cur => cur[1] === i ? cur : [cur[0], i]); }
    if (stage != null && !Number.isNaN(Number(stage))) { const n = Math.max(0, Math.min(STAGES_DATA.length - 1, Number(stage))); setStageSelState(cur => cur === n ? cur : n); }
    if (ai != null) setVsAI(cur => { const v = ai === '1'; return cur === v ? cur : v; });
    if (modeP === 'campaign') setCampaignSelection(cur => cur ? cur : true);
    else if (modeP === 'versus') setCampaignSelection(cur => !cur ? cur : false);
  }, [location.pathname, location.search, roster]);

  if (!engineRef.current) {
    engineRef.current = new GameEngine(config);
    engineRef.current.setRoster(roster);
  }

  useEffect(() => { engineRef.current?.setRoster(roster); }, [roster]);

  const updateConfig = useCallback((next: GameConfig) => {
    setConfig(next); saveConfig(next); engineRef.current?.updateConfig(next);
  }, []);

  const openCustomizer = useCallback((from: 'TITLE' | 'SELECT', editTarget?: PresidentData) => {
    setCustomizerReturn(from); setCustomizerBase(editTarget); setScreen('CUSTOMIZE');
  }, []);

  const handleSaveCustom = useCallback((fighter: PresidentData) => {
    setCustomPresidents((prev) => {
      const idx = prev.findIndex((p) => p.id === fighter.id);
      const next = idx >= 0 ? prev.map((p, i) => (i === idx ? fighter : p)) : [...prev, fighter];
      saveCustomPresidents(next);
      const nextRoster = [...PRESIDENTS_DATA, ...next];
      engineRef.current?.setRoster(nextRoster);
      const savedIdx = nextRoster.findIndex((p) => p.id === fighter.id);
      if (savedIdx >= 0) setSel((cur) => [savedIdx, cur[1] < nextRoster.length ? cur[1] : 0]);
      return next;
    });
    setScreen('SELECT');
  }, []);

  const handleDeleteCustom = useCallback((id: string) => {
    setCustomPresidents((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveCustomPresidents(next);
      const maxIdx = PRESIDENTS_DATA.length + next.length - 1;
      setSel((cur) => [Math.min(cur[0], maxIdx), Math.min(cur[1], maxIdx)]);
      return next;
    });
    setScreen('SELECT');
  }, []);

  const touchAt = useRef<number | null>(null);
  const matchLoading = useRef(false);
  const [loadingArt, setLoadingArt] = useState(false);
  const videoRef = useRef(config.video);
  videoRef.current = config.video;

  useEffect(() => {
    if (screen === 'SELECT') void preloadMatchArt([roster[sel[0]], roster[sel[1]]].filter(Boolean));
  }, [screen, roster, sel]);

  const startWithArt = useCallback(async (first: number, second: number, start: () => void) => {
    const engine = engineRef.current;
    if (!engine || matchLoading.current) return;
    const from = screenRef.current;
    matchLoading.current = true;
    setLoadingArt(true);
    let deadline = 0;
    try {
      await Promise.race([
        preloadMatchArt([engine.roster[first], engine.roster[second]].filter(Boolean)),
        new Promise<void>(resolve => { deadline = window.setTimeout(resolve, 1400); }),
      ]);
      if (from === screenRef.current && !onlineActive.current) {
        touchAt.current = null; clearPerformanceSamples(); start();
      }
    } finally {
      window.clearTimeout(deadline); matchLoading.current = false; setLoadingArt(false);
    }
  }, []);

  const launchCampaignRound = useCallback((camp: CampaignState) => {
    const engine = engineRef.current; if (!engine) return;
    engine.campaign = camp; setCampaign({ ...camp }); setMode('campaign'); setScreen('VS');
    void preloadMatchArt([engine.roster[camp.hero], engine.roster[camp.ladder[camp.round]]].filter(Boolean));
    sound.tone(200, 0.28, 'square', 200, 0.08);
    if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current);
    campaignTimerRef.current = window.setTimeout(() => {
      if (screenRef.current !== 'VS') return;
      void startWithArt(camp.hero, camp.ladder[camp.round], () => {
        engine.startMatch(camp.hero, camp.ladder[camp.round], camp.round % STAGES_DATA.length, true, 'campaign', camp.round);
        setScreen('PLAYING');
      });
    }, 2400);
  }, [startWithArt]);

  const startCampaign = useCallback(() => {
    const hero = Math.min(sel[0], roster.length - 1);
    const pool = roster.map((_, idx) => idx).filter((idx) => idx !== hero);
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const ladder = pool.slice(0, 7);
    launchCampaignRound({ hero, ladder, round: 0, score: 0, kos: 0, timeFrames: 0, continues: 0, lastRoundScore: 0 });
  }, [sel, roster, launchCampaignRound]);

  const startVersus = useCallback(() => {
    const engine = engineRef.current; if (!engine) return;
    engine.campaign = null; setCampaign(null); setSummary(null); setMode('versus');
    void startWithArt(sel[0], sel[1], () => { engine.startMatch(sel[0], sel[1], stageSel, vsAI, 'versus'); setScreen('PLAYING'); });
  }, [sel, stageSel, vsAI, startWithArt]);

  const guide = useRef<{ step: number; origin: number; direction: number; jumpTick: number; damage: number } | null>(null);
  const [lesson, setLesson] = useState<number | null>(null);
  const startTraining = useCallback((guided = false) => {
    const engine = engineRef.current; if (!engine) return;
    engine.campaign = null; setCampaign(null); setSummary(null); setMode('training');
    void startWithArt(sel[0], sel[1], () => {
      engine.startMatch(sel[0], sel[1], stageSel, false, 'training');
      const hero = engine.fighters[0];
      guide.current = guided === true ? { step: 0, origin: hero.x, direction: Math.sign(engine.fighters[1].x - hero.x), jumpTick: hero.jumpTick, damage: hero.damageDealt } : null;
      setLesson(guide.current?.step ?? null);
      setScreen('PLAYING');
    });
  }, [sel, stageSel, startWithArt]);

  const togglePause = useCallback(() => {
    if (screenRef.current === 'PLAYING') { setScreen('PAUSED'); engineRef.current?.clearAllInputs(); }
    else if (screenRef.current === 'PAUSED') setScreen('PLAYING');
  }, []);

  const startReplay = useCallback((from: 'TITLE' | 'SELECT' | 'GAME_OVER' | 'CENSURE' | 'CHAMPION', replayObj?: MatchReplayData | null) => {
    const target = replayObj ?? lastReplay; const engine = engineRef.current;
    if (!engine || !target) return;
    setReplayReturn(from); setReplayPaused(false); setReplaySpeed(1); setReplayEnded(false); setReplayFrame(0);
    engine.clearAllInputs(); engine.startReplay(target); setHud(engine.getHudSnapshot()); setScreen('REPLAY');
  }, [lastReplay]);

  const restartReplay = useCallback(() => {
    const engine = engineRef.current; if (!engine || !lastReplay) return;
    setReplayPaused(false); setReplayEnded(false); setReplayFrame(0);
    engine.startReplay(lastReplay); setHud(engine.getHudSnapshot());
  }, [lastReplay]);

  const exitReplay = useCallback(() => {
    const engine = engineRef.current; if (!engine) return;
    if (replayReturn === 'TITLE' || replayReturn === 'SELECT') engine.startAttractScene();
    setScreen(replayReturn);
  }, [replayReturn]);

  const downloadReplayJson = useCallback(() => {
    if (!lastReplay) return;
    const json = JSON.stringify(lastReplay, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `presidential-brawl-replay-${lastReplay.p1Id}-vs-${lastReplay.p2Id}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [lastReplay]);

  useEffect(() => {
    const engine = engineRef.current; if (!engine) return;
    engine.setCallbacks({
      onPauseToggle: () => { if (!configOpenRef.current) togglePause(); },
      onReplaySaved: (replay) => { saveLastReplay(replay); setLastReplay(replay); },
      onReplayEnd: () => { setReplayEnded(true); },
      onMatchEnd: (matchSummary) => {
        if (engine.campaign) {
          const camp = engine.campaign; camp.timeFrames += engine.T;
          if (matchSummary.winnerPi === 0) {
            const sec = matchSummary.durationSec; const stocksLeft = engine.fighters[0]?.stocks || 1;
            const pts = Math.round((1000 + Math.max(0, 150 - sec) * 15 + stocksLeft * 700) * (1 + camp.round * 0.15));
            camp.score += pts; camp.lastRoundScore = pts;
            if (camp.round === 6) { setCampaign({ ...camp }); setScreen('CHAMPION'); sound.win(); }
            else { camp.round++; launchCampaignRound(camp); }
          } else { setCampaign({ ...camp }); setScreen('CENSURE'); }
        } else { setSummary(matchSummary); setScreen('GAME_OVER'); }
      },
    });
  }, [togglePause, launchCampaignRound]);

  useEffect(() => {
    const engine = engineRef.current!;
    engine.updateConfig(config);
    engine.startAttractScene();
    const onKeyDown = (e: KeyboardEvent) => {
      if (onlineActive.current || configOpenRef.current || screenRef.current === 'CUSTOMIZE') return;
      if (screenRef.current === 'REPLAY') {
        if (!e.repeat && (e.code === 'Space' || e.code === 'KeyP')) { e.preventDefault(); setReplayPaused((p) => !p); }
        else if (!e.repeat && e.code === 'Escape') { e.preventDefault(); setReplayPaused((p) => !p); }
        return;
      }
      if (screenRef.current === 'PLAYING' && !e.repeat && e.code === 'F2') { e.preventDefault(); const next = (engine.stageIdx + 1) % STAGES_DATA.length; engine.switchStageLive(next); setHud(engine.getHudSnapshot()); return; }
      if (/^Arrow|Space/.test(e.code) || (e.code === 'Enter' && screenRef.current === 'PLAYING')) e.preventDefault();
      engine.handleKeyDown(e.code, e.repeat);
    };
    const onKeyUp = (e: KeyboardEvent) => { engine.handleKeyUp(e.code); };
    const onBlur = () => { engine.clearAllInputs(); };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);
    let raf = 0, last = performance.now(), acc = 0, hudTick = 0, halfSpeedToggle = 0;
    let adaptive = videoRef.current.adaptiveQuality !== false;
    const mobile = window.matchMedia('(pointer: coarse)').matches;
    let quality = new AdaptiveRenderQuality(adaptive, mobile);
    let lastPaint = 0, nextPaintAt = 0, lastScreen = '', backdropStage = '', backdropNight = -1;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rawDt = now - last; last = now; if (onlineActive.current) return;
      acc += Math.min(50, Math.max(0, rawDt));
      const curScreen = screenRef.current;
      const isAttract = curScreen === 'TITLE' || curScreen === 'SELECT';
      const shouldStepLive = !configOpenRef.current && (curScreen === 'PLAYING' || isAttract);
      const shouldStepReplay = !configOpenRef.current && curScreen === 'REPLAY' && !replayPausedRef.current && !engine.replayEnded;
      if (curScreen !== 'PLAYING') touchAt.current = null;
      const startedSimulation = performanceMetricsEnabled ? performance.now() : 0;
      let stepped = false;
      while (acc >= 16.667) {
        acc -= 16.667;
        if (shouldStepLive) {
          engine.step(isAttract);
          const task = guide.current; const hero = engine.fighters[0];
          if (!isAttract && task && hero && curScreen === 'PLAYING') {
            const walkingTowardRival = task.direction > 0 ? hero.curIn.right : hero.curIn.left;
            const complete = task.step === 0 ? walkingTowardRival && (hero.x - task.origin) * task.direction >= 48 : task.step === 1 ? hero.jumpTick > task.jumpTick : hero.damageDealt > task.damage;
            if (complete) { task.step++; task.jumpTick = hero.jumpTick; task.damage = hero.damageDealt; setLesson(task.step); if (task.step === 3) guide.current = null; }
          }
          stepped = true;
        } else if (shouldStepReplay) {
          const spd = replaySpeedRef.current;
          if (spd === 0.5) { halfSpeedToggle ^= 1; if (halfSpeedToggle === 1) engine.step(false); }
          else if (spd === 2) { engine.step(false); if (!engine.replayEnded) engine.step(false); }
          else engine.step(false);
        }
      }
      const simulationCost = startedSimulation ? performance.now() - startedSimulation : 0;
      const backdrop = arenaBackdropRef.current;
      if (backdrop) {
        const stageId = engine.stage.id;
        const night = stageNightMix(engine.config.video.stageTime, engine.T, engine.stageNightStart);
        if (stageId !== backdropStage) { backdropStage = stageId; backdrop.style.setProperty('--arena-day', `url("${stageArtUrl(stageId, 'day')}")`); backdrop.style.setProperty('--arena-night', `url("${stageArtUrl(stageId, 'night')}")`); }
        if (night !== backdropNight) { backdropNight = night; backdrop.style.setProperty('--arena-night-mix', String(night)); }
      }
      const fighting = curScreen === 'PLAYING' || curScreen === 'REPLAY';
      if (lastScreen !== curScreen) { lastPaint = 0; nextPaintAt = now; lastScreen = curScreen; }
      const nextAdaptive = videoRef.current.adaptiveQuality !== false;
      if (nextAdaptive !== adaptive) { adaptive = nextAdaptive; quality = new AdaptiveRenderQuality(adaptive, mobile); }
      if (canvasRef.current && curScreen !== 'CUSTOMIZE' && (now + .3 >= nextPaintAt)) {
        const start = performance.now();
        const period = 1000 / 60; nextPaintAt += Math.max(1, Math.floor((now - nextPaintAt) / period) + 1) * period;
        if (fighting && startedSimulation) samplePerformance('simulation', simulationCost);
        engine.render(canvasRef.current, quality.quality);
        const end = performance.now();
        if (fighting && lastPaint) { quality.record(now - lastPaint, end - start); samplePerformance('frame', now - lastPaint); samplePerformance('render', end - start); }
        if (stepped && curScreen === 'PLAYING' && touchAt.current !== null) { samplePerformance('touch', end - touchAt.current); touchAt.current = null; }
        lastPaint = now;
      }
      if (curScreen === 'PLAYING' || curScreen === 'PAUSED' || curScreen === 'REPLAY') {
        hudTick++; if (hudTick % 3 === 0) { setHud(engine.getHudSnapshot()); if (curScreen === 'REPLAY') setReplayFrame(engine.T); }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = () => { sound.init(); updateConfig({ ...config, audio: { ...config.audio, muted: !config.audio.muted } }); };
  const handleTouchAction = (action: PlayerAction, active: boolean) => { if (performanceMetricsEnabled && active && touchAt.current === null) touchAt.current = performance.now(); engineRef.current?.setTouchAction(action, active); };
  const setStageSel = (idx: number) => { setStageSelState(idx); if (idx < STAGES_DATA.length) engineRef.current?.setStage(idx); };

  const onContinueCampaign = () => { if (!campaign) return; launchCampaignRound({ ...campaign, continues: campaign.continues + 1 }); };
  const onRestartMatch = () => {
    if (campaign) { engineRef.current?.startMatch(campaign.hero, campaign.ladder[campaign.round], campaign.round % STAGES_DATA.length, true, 'campaign', campaign.round); setScreen('PLAYING'); }
    else if (mode === 'training') startTraining(lesson !== null);
    else startVersus();
  };
  const onExitToSelect = () => { guide.current = null; setLesson(null); if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current); engineRef.current?.startAttractScene(); setScreen('SELECT'); };
  const onSwitchStageLive = (idx: number) => { engineRef.current?.switchStageLive(idx); setHud(engineRef.current?.getHudSnapshot() ?? null); };

  const crtClass = config.video.crtFilter === 'scanlines' ? 'crt-scanlines' : config.video.crtFilter === 'pvm' ? 'crt-pvm' : '';
  useMenuGamepad(appRef, screen, configOpen, togglePause);

  const value: GameCtx = {
    config, updateConfig, customPresidents, roster, lastReplay, screen, setScreen,
    customizerReturn, customizerBase, campaignSelection, setCampaignSelection,
    mode, sel, setSel, stageSel, setStageSel, vsAI, setVsAI, configOpen, setConfigOpen,
    hud, campaign, summary, replayPaused, setReplayPaused, replaySpeed, setReplaySpeed,
    replayEnded, replayFrame, netOpenSignal, setNetOpenSignal, loadingArt, lesson,
    engineRef, canvasRef, arenaBackdropRef, appRef, onlineActive,
    openCustomizer, handleSaveCustom, handleDeleteCustom,
    startCampaign, startVersus, startTraining, togglePause,
    startReplay, restartReplay, exitReplay, downloadReplayJson,
    handleToggleMute, handleTouchAction, onContinueCampaign, onRestartMatch, onExitToSelect, onSwitchStageLive, crtClass,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
