import { TitleScreen } from '../components/TitleScreen';
import { useGame } from '../game/GameContext';

export function TitlePage() {
  const g = useGame();
  return (
    <TitleScreen
      hasReplay={Boolean(g.lastReplay)}
      onQuickSelect={() => { g.setCampaignSelection(false); g.setScreen('SELECT'); }}
      onStartCampaign={() => { g.setCampaignSelection(true); g.setScreen('SELECT'); }}
      onStartTutorial={() => g.startTraining(true)}
      onStartTraining={() => g.startTraining()}
      onWatchLastReplay={() => g.startReplay('TITLE')}
      onOpenCustomizer={() => g.openCustomizer('TITLE')}
      onOpenConfig={() => g.setConfigOpen(true)}
      onOpenOnline={() => g.setNetOpenSignal(n => n + 1)}
    />
  );
}
