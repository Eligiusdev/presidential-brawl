const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

/**
 * Keeps the exact desktop composition on smaller screens by scaling the whole
 * app as one design canvas. Only sizes change — layouts breakpoints never fire.
 */
export function installDesignViewport(): void {
  const apply = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scaled = width < DESIGN_WIDTH || height < DESIGN_HEIGHT;
    const scale = scaled ? Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT) : 1;
    document.documentElement.style.setProperty('--app-scale', String(scale));
    if (scaled) document.documentElement.setAttribute('data-scaled', 'true');
    else document.documentElement.removeAttribute('data-scaled');
  };

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
}
