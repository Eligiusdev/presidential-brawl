import { Outlet } from 'react-router-dom';
import { useGame } from './GameContext';
import { PerformancePanel } from '../components/PerformancePanel';
import { LandscapePrompt } from '../components/LandscapePrompt';
import { NetworkPanel } from '../components/NetworkPanel';
import { ConfigModal } from '../components/ConfigModal';
import { GameHUD } from '../components/GameHUD';
import { performanceMetricsEnabled } from '../engine/performanceMetrics';

export function GameLayout() {
  const g = useGame();
  const { screen, config, netOpenSignal, setNetOpenSignal, onlineActive, loadingArt, canvasRef, arenaBackdropRef, appRef, crtClass } = g;
  return (
    <main ref={appRef} className="apex-app">
      {loadingArt && <div className="match-art-status" role="status">Preparando luchadores…</div>}
      {performanceMetricsEnabled && <PerformancePanel />}
      <LandscapePrompt />
      <NetworkPanel config={config} openSignal={netOpenSignal} onActive={active => { onlineActive.current = active; }} />
      <div className={`apex-frame ${['TITLE', 'SELECT', 'CUSTOMIZE'].includes(screen) ? 'apex-frame-menu' : ''} ${['PLAYING', 'PAUSED', 'REPLAY'].includes(screen) ? 'apex-frame-combat' : ''} ${crtClass}`}>
        <div ref={arenaBackdropRef} className="apex-arena-backdrop" aria-hidden="true" />
        <canvas ref={canvasRef} width={960} height={540} className="apex-arena pixel-canvas block h-full w-full object-contain" />
        <Outlet />
        <GameHUD
          roster={g.roster} screen={screen} mode={g.mode} hud={g.hud} config={config}
          campaign={g.campaign} summary={g.summary} lastReplay={g.lastReplay}
          replayFrame={g.replayFrame} replayPaused={g.replayPaused} replaySpeed={g.replaySpeed} replayEnded={g.replayEnded}
          onToggleMute={g.handleToggleMute} onOpenConfig={() => g.setConfigOpen(true)}
          onTogglePause={g.togglePause} onRestartMatch={g.onRestartMatch} onRematch={g.startVersus}
          onExitToSelect={g.onExitToSelect} onContinueCampaign={g.onContinueCampaign}
          onWatchLastReplay={(from) => g.startReplay(from)} onDownloadReplayJson={g.downloadReplayJson}
          onToggleReplayPause={() => g.setReplayPaused(p => !p)} onChangeReplaySpeed={g.setReplaySpeed}
          onRestartReplay={g.restartReplay} onExitReplay={g.exitReplay}
          onSwitchStageLive={g.onSwitchStageLive} onTouchAction={g.handleTouchAction}
        />
        {g.configOpen && <ConfigModal config={config} onChange={g.updateConfig} onClose={() => g.setConfigOpen(false)} />}
      </div>
    </main>
  );
}
