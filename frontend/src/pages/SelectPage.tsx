import { useNavigate } from 'react-router-dom';
import { CharacterSelect } from '../components/CharacterSelect';
import { CampaignCharacterSelect } from '../components/CampaignCharacterSelect';
import { useGame } from '../game/GameContext';

export function SelectPage() {
  const g = useGame();
  const navigate = useNavigate();
  const onBack = () => { g.engineRef.current?.startAttractScene(); navigate('/combat'); };

  if (g.campaignSelection) {
    return (
      <CampaignCharacterSelect
        roster={g.roster}
        selected={g.sel[0]}
        onSelect={(idx) => g.setSel([idx, g.sel[1]])}
        onStart={g.startCampaign}
        onBack={onBack}
      />
    );
  }

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
      onOpenConfig={() => g.setConfigOpen(true)}
      onBack={onBack}
    />
  );
}
