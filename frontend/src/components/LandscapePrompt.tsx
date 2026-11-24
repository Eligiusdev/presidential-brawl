import { Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

export function LandscapePrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const mobilePortrait = window.matchMedia('(orientation: portrait) and (any-pointer: coarse)');
    const update = () => setShow(mobilePortrait.matches);
    update();
    mobilePortrait.addEventListener('change', update);
    return () => mobilePortrait.removeEventListener('change', update);
  }, []);

  const enterLandscape = async () => {
    try {
      const orientation = screen.orientation as LockableOrientation | undefined;
      if (!orientation?.lock) {
        setManual(true);
        return;
      }
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      await orientation.lock('landscape');
    } catch {
      setManual(true);
    }
  };

  if (!show || dismissed) return null;
  return <aside className="landscape-prompt" aria-label="Orientación del juego">
    <Smartphone className="landscape-phone" size={28} aria-hidden="true" />
    <div>
      <strong>Juega en horizontal</strong>
      {manual && <p role="status">Gira el teléfono. Si la pantalla está bloqueada, activa la rotación automática.</p>}
    </div>
    <button type="button" onClick={() => void enterLandscape()}>Pantalla completa</button>
    <button type="button" className="landscape-dismiss" aria-label="Continuar en vertical" onClick={() => setDismissed(true)}>×</button>
  </aside>;
}
