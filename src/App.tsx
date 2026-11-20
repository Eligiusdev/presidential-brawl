import { LandscapePrompt } from './components/LandscapePrompt';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from './audio/soundEngine';
import { roomRequest, type RoomLobby, type RoomSession } from './network/roomClient';
import { NetworkPanel } from './components/NetworkPanel';
import { CharacterCustomizer } from './components/CharacterCustomizer';
import { CharacterSelect } from './components/CharacterSelect';
import { ConfigModal } from './components/ConfigModal';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import {
  loadConfig,
  loadCustomPresidents,
  loadLastReplay,
  saveConfig,
  saveCustomPresidents,
  saveLastReplay,
} from './config/defaultConfig';
import { PRESIDENTS_DATA } from './data/presidents';
import { STAGES_DATA } from './data/stages';
import { GameEngine } from './engine/gameEngine';
import {
  CampaignState,
  GameConfig,
  GameMode,
  GameScreenState,
  HudSnapshot,
  MatchReplayData,
  MatchSummary,
  PlayerAction,
  PresidentData,
} from './types/game';

export default function App() {
  const [config, setConfig] = useState<GameConfig>(() => loadConfig());
  const [customPresidents, setCustomPresidents] = useState<PresidentData[]>(() => loadCustomPresidents());
  const [lastReplay, setLastReplay] = useState<MatchReplayData | null>(() => loadLastReplay());
  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [customizerReturn, setCustomizerReturn] = useState<'TITLE' | 'SELECT'>('TITLE');
  const [replayReturn, setReplayReturn] = useState<'TITLE' | 'SELECT' | 'GAME_OVER' | 'CENSURE' | 'CHAMPION'>('GAME_OVER');
  const [customizerBase, setCustomizerBase] = useState<PresidentData | undefined>(undefined);
  const [mode, setMode] = useState<GameMode>('versus');
  const [sel, setSel] = useState<[number, number]>(() => {
    const i1 = PRESIDENTS_DATA.findIndex((p) => p.id === 'bolivar');
    const i2 = PRESIDENTS_DATA.findIndex((p) => p.id === 'robinson');
    return [i1 >= 0 ? i1 : 0, i2 >= 0 ? i2 : 3];
  });
  const [remoteRoom, setRemoteRoom] = useState<RoomSession | null>(null);
  const [remoteFighter, setRemoteFighter] = useState<string | null>(null);
  const [roomError, setRoomError] = useState('');
  const remoteMatch = useRef<RoomSession | null>(null);
  const startingMatch = useRef(false);
  const onHostRoom = useCallback((room: RoomSession | null, lobby: RoomLobby) => {
    setRemoteRoom(room);
    setRemoteFighter(room ? lobby.fighterId : null);
    const index = PRESIDENTS_DATA.findIndex(f => f.id === lobby.fighterId);
    if (room && index >= 0) {
      setVsAI(false);
      setSel(previous => [previous[0], index]);
      setRoomError('');
    }
  }, []);
  useEffect(() => {
    if (screen === 'PLAYING' || screen === 'PAUSED' || !remoteMatch.current) return;
    const room = remoteMatch.current;
    remoteMatch.current = null;
    void roomRequest(`/${room.code}/match`, room, { playing: false })
      .catch(error => setRoomError(error.message));
  }, [screen]);
  const [stageSel, setStageSel] = useState<number>(0);
  const [vsAI, setVsAI] = useState<boolean>(true);
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [replayPaused, setReplayPaused] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<0.5 | 1 | 2>(1);
  const [replayEnded, setReplayEnded] = useState<boolean>(false);
  const [replayFrame, setReplayFrame] = useState<number>(0);

  const roster = useMemo(() => [...PRESIDENTS_DATA, ...customPresidents], [customPresidents]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const screenRef = useRef<GameScreenState>(screen);
  const configOpenRef = useRef<boolean>(configOpen);
  const replayPausedRef = useRef<boolean>(replayPaused);
  const replaySpeedRef = useRef<0.5 | 1 | 2>(replaySpeed);
  const campaignTimerRef = useRef<number | null>(null);

  screenRef.current = screen;
  configOpenRef.current = configOpen;
  replayPausedRef.current = replayPaused;
  replaySpeedRef.current = replaySpeed;

  if (!engineRef.current) {
    engineRef.current = new GameEngine(config);
    engineRef.current.setRoster(roster);
  }

  useEffect(() => {
    engineRef.current?.setRoster(roster);
  }, [roster]);

  const updateConfig = useCallback((next: GameConfig) => {
    setConfig(next);
    saveConfig(next);
    engineRef.current?.updateConfig(next);
  }, []);

  const openCustomizer = useCallback((from: 'TITLE' | 'SELECT', editTarget?: PresidentData) => {
    setCustomizerReturn(from);
    setCustomizerBase(editTarget);
    setScreen('CUSTOMIZE');
  }, []);

  const handleSaveCustom = useCallback(
    (fighter: PresidentData) => {
      setCustomPresidents((prev) => {
        const idx = prev.findIndex((p) => p.id === fighter.id);
        const next = idx >= 0 ? prev.map((p, i) => (i === idx ? fighter : p)) : [...prev, fighter];
        saveCustomPresidents(next);
        const nextRoster = [...PRESIDENTS_DATA, ...next];
        engineRef.current?.setRoster(nextRoster);
        const savedIdx = nextRoster.findIndex((p) => p.id === fighter.id);
        if (savedIdx >= 0) {
          setSel((cur) => [savedIdx, cur[1] < nextRoster.length ? cur[1] : 0]);
        }
        return next;
      });
      setScreen('SELECT');
    },
    []
  );

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

  const launchCampaignRound = useCallback((camp: CampaignState) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.campaign = camp;
    setCampaign({ ...camp });
    setMode('campaign');
    setScreen('VS');
    sound.tone(200, 0.28, 'square', 200, 0.08);
    if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current);
    campaignTimerRef.current = window.setTimeout(() => {
      if (screenRef.current !== 'VS') return;
      engine.startMatch(camp.hero, camp.ladder[camp.round], camp.round % STAGES_DATA.length, true, 'campaign', camp.round);
      setScreen('PLAYING');
    }, 2400);
  }, []);

  const startCampaign = useCallback(() => {
    const hero = Math.min(sel[0], roster.length - 1);
    const pool = roster.map((_, idx) => idx).filter((idx) => idx !== hero);
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    const ladder = pool.slice(0, 7);
    const camp: CampaignState = {
      hero,
      ladder,
      round: 0,
      score: 0,
      kos: 0,
      timeFrames: 0,
      continues: 0,
      lastRoundScore: 0,
    };
    launchCampaignRound(camp);
  }, [sel, roster, launchCampaignRound]);

  const startVersus = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (startingMatch.current) return;
    let opponent = sel[1];
    if (remoteRoom) {
      startingMatch.current = true;
      setRoomError('');
      try {
        const lobby: RoomLobby = await roomRequest(`/${remoteRoom.code}/match`, remoteRoom, { playing: true });
        opponent = PRESIDENTS_DATA.findIndex(f => f.id === lobby.fighterId);
        if (opponent < 0) {
          await roomRequest(`/${remoteRoom.code}/match`, remoteRoom, { playing: false });
          throw new Error('J2 debe elegir un luchador del plantel oficial.');
        }
        remoteMatch.current = remoteRoom;
      } catch (error) {
        setRoomError((error as Error).message);
        return;
      } finally { startingMatch.current = false; }
    }
    engine.campaign = null;
    setCampaign(null);
    setSummary(null);
    setMode('versus');
    engine.startMatch(sel[0], opponent, stageSel, remoteRoom ? false : vsAI, 'versus');
    setScreen('PLAYING');
  }, [sel, stageSel, vsAI, remoteRoom]);

  const startTraining = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.campaign = null;
    setCampaign(null);
    setSummary(null);
    setMode('training');
    engine.startMatch(sel[0], sel[1], stageSel, false, 'training');
    setScreen('PLAYING');
  }, [sel, stageSel]);

  const togglePause = useCallback(() => {
    if (screenRef.current === 'PLAYING') {
      setScreen('PAUSED');
      engineRef.current?.clearAllInputs();
    } else if (screenRef.current === 'PAUSED') {
      setScreen('PLAYING');
    }
  }, []);

  const startReplay = useCallback(
    (from: 'TITLE' | 'SELECT' | 'GAME_OVER' | 'CENSURE' | 'CHAMPION', replayObj?: MatchReplayData | null) => {
      const target = replayObj ?? lastReplay;
      const engine = engineRef.current;
      if (!engine || !target) return;
      setReplayReturn(from);
      setReplayPaused(false);
      setReplaySpeed(1);
      setReplayEnded(false);
      setReplayFrame(0);
      engine.clearAllInputs();
      engine.startReplay(target);
      setHud(engine.getHudSnapshot());
      setScreen('REPLAY');
    },
    [lastReplay]
  );

  const restartReplay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !lastReplay) return;
    setReplayPaused(false);
    setReplayEnded(false);
    setReplayFrame(0);
    engine.startReplay(lastReplay);
    setHud(engine.getHudSnapshot());
  }, [lastReplay]);

  const exitReplay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (replayReturn === 'TITLE' || replayReturn === 'SELECT') {
      engine.startAttractScene();
    }
    setScreen(replayReturn);
  }, [replayReturn]);

  const downloadReplayJson = useCallback(() => {
    if (!lastReplay) return;
    const json = JSON.stringify(lastReplay, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presidential-brawl-replay-${lastReplay.p1Id}-vs-${lastReplay.p2Id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [lastReplay]);

  // Wire engine callbacks
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setCallbacks({
      onPauseToggle: () => {
        if (!configOpenRef.current) togglePause();
      },
      onReplaySaved: (replay) => {
        saveLastReplay(replay);
        setLastReplay(replay);
      },
      onReplayEnd: () => {
        setReplayEnded(true);
      },
      onMatchEnd: (matchSummary) => {
        if (engine.campaign) {
          const camp = engine.campaign;
          camp.timeFrames += engine.T;
          if (matchSummary.winnerPi === 0) {
            const sec = matchSummary.durationSec;
            const stocksLeft = engine.fighters[0]?.stocks || 1;
            const pts = Math.round((1000 + Math.max(0, 150 - sec) * 15 + stocksLeft * 700) * (1 + camp.round * 0.15));
            camp.score += pts;
            camp.lastRoundScore = pts;
            if (camp.round === 6) {
              setCampaign({ ...camp });
              setScreen('CHAMPION');
              sound.win();
            } else {
              camp.round++;
              launchCampaignRound(camp);
            }
          } else {
            setCampaign({ ...camp });
            setScreen('CENSURE');
          }
        } else {
          setSummary(matchSummary);
          setScreen('GAME_OVER');
        }
      },
    });
  }, [togglePause, launchCampaignRound]);

  // Global keyboard & blur listeners + 60fps simulation loop
  useEffect(() => {
    const engine = engineRef.current!;
    engine.updateConfig(config);
    engine.startAttractScene();

    const onKeyDown = (e: KeyboardEvent) => {
      if (configOpenRef.current || screenRef.current === 'CUSTOMIZE') return;
      if (screenRef.current === 'REPLAY') {
        if (!e.repeat && (e.code === 'Space' || e.code === 'KeyP')) {
          e.preventDefault();
          setReplayPaused((p) => !p);
        } else if (!e.repeat && e.code === 'Escape') {
          e.preventDefault();
          setReplayPaused((p) => !p);
        }
        return;
      }
      if (screenRef.current === 'PLAYING' && !e.repeat && e.code === 'F2') {
        e.preventDefault();
        const next = (engine.stageIdx + 1) % STAGES_DATA.length;
        engine.switchStageLive(next);
        setHud(engine.getHudSnapshot());
        return;
      }
      if (/^Arrow|Space/.test(e.code) || (e.code === 'Enter' && screenRef.current === 'PLAYING')) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.code, e.repeat);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };

    const onBlur = () => {
      engine.clearAllInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudTick = 0;
    let halfSpeedToggle = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rawDt = now - last;
      last = now;
      acc += Math.min(50, Math.max(0, rawDt));

      const curScreen = screenRef.current;
      const isAttract = curScreen === 'TITLE' || curScreen === 'SELECT';
      const shouldStepLive = !configOpenRef.current && (curScreen === 'PLAYING' || isAttract);
      const shouldStepReplay =
        !configOpenRef.current && curScreen === 'REPLAY' && !replayPausedRef.current && !engine.replayEnded;

      while (acc >= 16.667) {
        acc -= 16.667;
        if (shouldStepLive) {
          engine.step(isAttract);
        } else if (shouldStepReplay) {
          const spd = replaySpeedRef.current;
          if (spd === 0.5) {
            halfSpeedToggle ^= 1;
            if (halfSpeedToggle === 1) engine.step(false);
          } else if (spd === 2) {
            engine.step(false);
            if (!engine.replayEnded) engine.step(false);
          } else {
            engine.step(false);
          }
        }
      }

      if (canvasRef.current && curScreen !== 'CUSTOMIZE') {
        engine.render(canvasRef.current);
      }

      if (curScreen === 'PLAYING' || curScreen === 'PAUSED' || curScreen === 'REPLAY') {
        hudTick++;
        if (hudTick % 3 === 0) {
          setHud(engine.getHudSnapshot());
          if (curScreen === 'REPLAY') {
            setReplayFrame(engine.T);
          }
        }
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = () => {
    sound.init();
    updateConfig({
      ...config,
      audio: { ...config.audio, muted: !config.audio.muted },
    });
  };

  const handleTouchAction = (action: PlayerAction, active: boolean) => {
    engineRef.current?.setTouchAction(action, active);
  };

  const crtClass =
    config.video.crtFilter === 'scanlines'
      ? 'crt-scanlines'
      : config.video.crtFilter === 'pvm'
        ? 'crt-pvm'
        : '';

  return (
    <main className="apex-app">
      <LandscapePrompt />
      {roomError && <div role="alert" className="network-panel"><p>{roomError}</p>
        <button type="button" onClick={() => setRoomError('')}>Cerrar</button></div>}
      <NetworkPanel matchActive={!!remoteMatch.current && (screen === 'PLAYING' || screen === 'PAUSED')}
        onHostRoom={onHostRoom} hideLaunch={['PLAYING', 'PAUSED', 'REPLAY'].includes(screen)} canvas={canvasRef} onInput={(actions) => engineRef.current?.setRemoteActions(actions)} />
      {/* 16:9 Isolated Pixel-Art Game Stage */}
      <div className={`apex-frame ${['TITLE', 'SELECT', 'CUSTOMIZE'].includes(screen) ? 'apex-frame-menu' : ''} ${['PLAYING', 'PAUSED', 'REPLAY'].includes(screen) ? 'apex-frame-combat' : ''} ${crtClass}`}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="apex-arena pixel-canvas block h-full w-full object-contain"
        />

        {screen === 'TITLE' && (
          <TitleScreen
            hasReplay={Boolean(lastReplay)}
            onQuickSelect={() => setScreen('SELECT')}
            onStartCampaign={startCampaign}
            onStartTraining={startTraining}
            onWatchLastReplay={() => startReplay('TITLE')}
            onOpenCustomizer={() => openCustomizer('TITLE')}
            onOpenConfig={() => setConfigOpen(true)}
          />
        )}

        {screen === 'SELECT' && (
          <CharacterSelect
            roster={roster}
            sel={sel}
            stageSel={stageSel}
            vsAI={vsAI}
            config={config}
            hasReplay={Boolean(lastReplay)}
            remoteOpponent={!!remoteRoom}
            remoteReady={!!remoteFighter}
            onChangeSel={next => setSel(current => remoteRoom ? [next[0], current[1]] : next)}
            onChangeStage={(idx) => {
              setStageSel(idx);
              if (idx < STAGES_DATA.length) engineRef.current?.setStage(idx);
            }}
            onToggleVsAI={() => setVsAI((v) => !v)}
            onStartVersus={startVersus}
            onStartCampaign={startCampaign}
            onStartTraining={startTraining}
            onWatchLastReplay={() => startReplay('SELECT')}
            onOpenCustomizer={(editTarget) => openCustomizer('SELECT', editTarget)}
            onDeleteCustom={handleDeleteCustom}
            onOpenConfig={() => setConfigOpen(true)}
            onBack={() => {
              engineRef.current?.startAttractScene();
              setScreen('TITLE');
            }}
          />
        )}

        {screen === 'CUSTOMIZE' && (
          <CharacterCustomizer
            initialBase={customizerBase}
            onSave={handleSaveCustom}
            onDelete={customizerBase?.isCustom ? handleDeleteCustom : undefined}
            onClose={() => setScreen(customizerReturn)}
          />
        )}

        <GameHUD
          roster={roster}
          screen={screen}
          mode={mode}
          hud={hud}
          config={config}
          campaign={campaign}
          summary={summary}
          lastReplay={lastReplay}
          replayFrame={replayFrame}
          replayPaused={replayPaused}
          replaySpeed={replaySpeed}
          replayEnded={replayEnded}
          onToggleMute={handleToggleMute}
          onOpenConfig={() => setConfigOpen(true)}
          onTogglePause={togglePause}
          onRestartMatch={() => {
            if (campaign) {
              engineRef.current?.startMatch(
                campaign.hero,
                campaign.ladder[campaign.round],
                campaign.round % STAGES_DATA.length,
                true,
                'campaign',
                campaign.round
              );
              setScreen('PLAYING');
            } else if (mode === 'training') {
              startTraining();
            } else {
              startVersus();
            }
          }}
          onRematch={startVersus}
          onExitToSelect={() => {
            if (campaignTimerRef.current) window.clearTimeout(campaignTimerRef.current);
            engineRef.current?.startAttractScene();
            setScreen('SELECT');
          }}
          onContinueCampaign={() => {
            if (!campaign) return;
            const nextCamp = { ...campaign, continues: campaign.continues + 1 };
            launchCampaignRound(nextCamp);
          }}
          onWatchLastReplay={(from) => startReplay(from)}
          onDownloadReplayJson={downloadReplayJson}
          onToggleReplayPause={() => setReplayPaused((p) => !p)}
          onChangeReplaySpeed={setReplaySpeed}
          onRestartReplay={restartReplay}
          onExitReplay={exitReplay}
          onSwitchStageLive={(idx) => {
            engineRef.current?.switchStageLive(idx);
            setHud(engineRef.current?.getHudSnapshot() ?? null);
          }}
          onTouchAction={handleTouchAction}
        />

        {configOpen && (
          <ConfigModal
            config={config}
            onChange={updateConfig}
            onClose={() => setConfigOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
