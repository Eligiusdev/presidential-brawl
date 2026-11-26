const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export function installDesignViewport(): void {
  const root = document.documentElement;
  const coarsePointer = window.matchMedia('(any-pointer: coarse)');
  let frame = 0;

  const apply = () => {
    frame = 0;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 620 || (height <= 520 && width <= 1024) ||
      (coarsePointer.matches && Math.min(width, height) <= 850);
    const scaled = !mobile && (width < DESIGN_WIDTH || height < DESIGN_HEIGHT);
    const scale = scaled ? Math.min(1, width / DESIGN_WIDTH) : 1;

    root.toggleAttribute('data-mobile', mobile);
    root.style.setProperty('--app-scale', String(scale));
    root.style.setProperty('--app-height', `${scaled && width > height ? Math.round(DESIGN_WIDTH * height / width) : DESIGN_HEIGHT}px`);
    if (scaled) root.setAttribute('data-scaled', 'true');
    else root.removeAttribute('data-scaled');
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  coarsePointer.addEventListener('change', schedule);
}
