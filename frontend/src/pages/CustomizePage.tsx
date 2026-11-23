import { CharacterCustomizer } from '../components/CharacterCustomizer';
import { useGame } from '../game/GameContext';

export function CustomizePage() {
  const g = useGame();
  return (
    <CharacterCustomizer
      initialBase={g.customizerBase}
      onSave={g.handleSaveCustom}
      onDelete={g.customizerBase?.isCustom ? g.handleDeleteCustom : undefined}
      onClose={() => g.setScreen(g.customizerReturn)}
    />
  );
}
