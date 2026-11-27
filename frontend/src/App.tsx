import { Navigate, Route, Routes } from 'react-router-dom';
import { GameProvider } from './game/GameContext';
import { GameLayout } from './game/GameLayout';
import { TitlePage } from './pages/TitlePage';
import { SelectPage } from './pages/SelectPage';
import { CombatMenuPage } from './pages/CombatMenuPage';
import { TagDuelPage } from './pages/TagDuelPage';
import { OnlinePage } from './pages/OnlinePage';
import { GalleryPage } from './pages/GalleryPage';
import { PlayPage } from './pages/PlayPage';
import { ReplayPage } from './pages/ReplayPage';
import { ResultPage } from './pages/ResultPage';
import { ConfigPage } from './pages/ConfigPage';

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<GameLayout />}>
          <Route index element={<TitlePage />} />
          <Route path="combat" element={<CombatMenuPage />} />
          <Route path="tag" element={<TagDuelPage />} />
          <Route path="online" element={<OnlinePage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="visualizar" element={<Navigate to="/gallery" replace />} />
          <Route path="select" element={<SelectPage />} />
          <Route path="play" element={<PlayPage />} />
          <Route path="replay" element={<ReplayPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="result" element={<ResultPage />} />
          <Route path="result/:kind" element={<ResultPage />} />
          <Route path="room/:code" element={<TitlePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </GameProvider>
  );
}
