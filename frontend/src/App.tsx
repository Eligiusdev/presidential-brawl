import { Navigate, Route, Routes } from 'react-router-dom';
import { GameProvider } from './game/GameContext';
import { GameLayout } from './game/GameLayout';
import { TitlePage } from './pages/TitlePage';
import { SelectPage } from './pages/SelectPage';
import { CustomizePage } from './pages/CustomizePage';
import { PlayPage } from './pages/PlayPage';
import { ReplayPage } from './pages/ReplayPage';
import { ResultPage } from './pages/ResultPage';

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route element={<GameLayout />}>
          <Route path="/" element={<TitlePage />} />
          <Route path="/select" element={<SelectPage />} />
          <Route path="/customize" element={<CustomizePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/replay" element={<ReplayPage />} />
          <Route path="/result/:kind" element={<ResultPage />} />
          <Route path="/room/*" element={<TitlePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </GameProvider>
  );
}
