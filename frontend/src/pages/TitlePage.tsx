import { useNavigate } from 'react-router-dom';
import { TitleScreen } from '../components/TitleScreen';
import { useGame } from '../game/GameContext';

export function TitlePage() {
  const g = useGame();
  const navigate = useNavigate();
  return (
    <TitleScreen
      onOpenCombat={() => navigate('/combat')}
      onOpenGallery={() => navigate('/visualizar')}
      onOpenConfig={() => g.setConfigOpen(true)}
    />
  );
}
