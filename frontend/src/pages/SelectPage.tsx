import { useNavigate } from 'react-router-dom';
import { CharacterSelect } from '../components/CharacterSelect';
import { CampaignCharacterSelect } from '../components/CampaignCharacterSelect';
import { useGame } from '../game/GameContext';

export function SelectPage() {
  const g = useGame();
  const navigate = useNavigate();
  const onBack = () => { g.setTrainingSelection(null); g.engineRef.current?.startAttractScene(); navigate('/combat'); };

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

  if (g.trainingSelection) {
    const isTutorial = g.trainingSelection === 'tutorial';
    return (
      <CampaignCharacterSelect
        roster={g.roster}
        selected={g.sel[0]}
        onSelect={(idx) => g.setSel([idx, g.sel[1]])}
        onStart={() => { g.setTrainingSelection(null); g.startTraining(isTutorial); }}
        onBack={onBack}
        title={isTutorial ? 'Tutorial' : 'Entrenamiento'}
        subtitle={isTutorial ? 'Elige tu personaje para aprender a pelear' : 'Elige tu personaje para practicar'}
        buttonLabel={isTutorial ? 'INICIAR TUTORIAL' : 'INICIAR ENTRENAMIENTO'}
        statusText={isTutorial ? 'Aprende los controles básicos paso a paso' : 'Practica libremente contra un oponente'}
        tag={isTutorial ? 'Personaje de tutorial' : 'Personaje de entrenamiento'}
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
