import { Outlet, useLocation } from 'react-router-dom';
import { useGame } from './GameContext';
import { PerformancePanel } from '../components/PerformancePanel';
import { LandscapePrompt } from '../components/LandscapePrompt';
import { NetworkPanel } from '../components/NetworkPanel';
import { GameHUD } from '../components/GameHUD';
import { MatchSettingsModal } from '../components/MatchSettingsModal';
import { performanceMetricsEnabled } from '../engine/performanceMetrics';

export function GameLayout() {
  const g = useGame();
  const { screen, config, netOpenSignal, onlineIntent, clearOnlineIntent, onlineActive, loadingArt, canvasRef, arenaBackdropRef, appRef, crtClass } = g;
  const isConfig = useLocation().pathname.replace(/\/+$/, '') === '/config';
  const menuFrame = ['TITLE', 'SELECT', 'CUSTOMIZE'].includes(screen) || isConfig;
  const combatFrame = ['PLAYING', 'PAUSED', 'REPLAY'].includes(screen) && !isConfig;
  return (
    <main ref={appRef} className="apex-app">
      {loadingArt && <div className="match-art-status" role="status">Preparando luchadores…</div>}
      {performanceMetricsEnabled && <PerformancePanel />}
      <LandscapePrompt />
      <NetworkPanel config={config} openSignal={netOpenSignal} crtClass={crtClass} intent={onlineIntent} onIntentHandled={clearOnlineIntent} onOpenConfig={() => g.setConfigOpen(true)} onActive={active => { onlineActive.current = active; }} />
      <div className={`apex-frame ${menuFrame ? 'apex-frame-menu' : ''} ${combatFrame ? 'apex-frame-combat' : ''} ${crtClass}`}>
        <div ref={arenaBackdropRef} className="apex-arena-backdrop" aria-hidden="true" />
        <canvas ref={canvasRef} width={960} height={540} className="apex-arena pixel-canvas block h-full w-full object-contain" />
        <Outlet />
        {!isConfig && <GameHUD
          roster={g.roster} screen={screen} mode={g.mode} hud={g.hud} config={config}
          campaign={g.campaign} summary={g.summary} lastReplay={g.lastReplay}
          replayFrame={g.replayFrame} replayPaused={g.replayPaused} replaySpeed={g.replaySpeed} replayEnded={g.replayEnded}
          onToggleMute={g.handleToggleMute} onOpenConfig={() => g.setConfigOpen(true)} onOpenMatchConfig={() => g.setMatchConfigOpen(true)}
          onTogglePause={g.togglePause} onRestartMatch={g.onRestartMatch} onRematch={g.startVersus}
          onExitToSelect={g.onExitToSelect} onContinueCampaign={g.onContinueCampaign}
          onWatchLastReplay={(from) => g.startReplay(from)} onDownloadReplayJson={g.downloadReplayJson}
          onToggleReplayPause={() => g.setReplayPaused(p => !p)} onChangeReplaySpeed={g.setReplaySpeed}
          onRestartReplay={g.restartReplay} onExitReplay={g.exitReplay}
          onSwitchStageLive={g.onSwitchStageLive} onTouchAction={g.handleTouchAction}
        />}
      </div>
      <MatchSettingsModal
        open={g.matchConfigOpen}
        onClose={() => g.setMatchConfigOpen(false)}
        value={g.config.match}
        onChange={match => g.updateConfig({ ...g.config, match })}
        inMatch={screen === 'PLAYING' || screen === 'PAUSED'}
        onRestart={g.onRestartMatch}
      />
    </main>
  );
}
