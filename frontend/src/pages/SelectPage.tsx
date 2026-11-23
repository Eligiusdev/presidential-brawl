import { CharacterSelect } from '../components/CharacterSelect';
import { useGame } from '../game/GameContext';

export function SelectPage() {
  const g = useGame();
  return (
    <CharacterSelect
      campaignSelection={g.campaignSelection}
      roster={g.roster}
      sel={g.sel}
      stageSel={g.stageSel}
      vsAI={g.vsAI}
      config={g.config}
      hasReplay={Boolean(g.lastReplay)}
      onChangeSel={g.setSel}
      onChangeStage={g.setStageSel}
      onToggleVsAI={() => g.setVsAI(v => !v)}
      onStartVersus={g.startVersus}
      onStartCampaign={g.startCampaign}
      onStartTraining={g.startTraining}
      onWatchLastReplay={() => g.startReplay('SELECT')}
      onOpenCustomizer={(editTarget) => g.openCustomizer('SELECT', editTarget)}
      onDeleteCustom={g.handleDeleteCustom}
      onOpenConfig={() => g.setConfigOpen(true)}
      onBack={() => { g.engineRef.current?.startAttractScene(); g.setScreen('TITLE'); }}
    />
  );
}
