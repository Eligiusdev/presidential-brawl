const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

/**
 * Keeps the desktop composition on smaller screens by scaling the whole app as
 * one canvas. The canvas always fills the screen width; in landscape its design
 * height follows the viewport aspect so there are no side letterboxes.
 */
export function installDesignViewport(): void {
  const apply = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scaled = width < DESIGN_WIDTH || height < DESIGN_HEIGHT;
    const scale = scaled ? width / DESIGN_WIDTH : 1;
    const designHeight = scaled && width > height
      ? Math.round(DESIGN_WIDTH * height / width)
      : DESIGN_HEIGHT;

    document.documentElement.style.setProperty('--app-scale', String(scale));
    document.documentElement.style.setProperty('--app-height', `${designHeight}px`);
    if (scaled) document.documentElement.setAttribute('data-scaled', 'true');
    else document.documentElement.removeAttribute('data-scaled');
  };

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
}
