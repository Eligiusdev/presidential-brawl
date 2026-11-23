import { useEffect, useRef, type RefObject } from 'react';

type Direction = 'left' | 'right' | 'up' | 'down';

const controls = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"][tabindex]';
const repeatDelay = 320;
const repeatInterval = 115;

function directionOf(pad: Gamepad, previous: Direction | null): Direction | null {
  if (pad.buttons[12]?.pressed) return 'up';
  if (pad.buttons[13]?.pressed) return 'down';
  if (pad.buttons[14]?.pressed) return 'left';
  if (pad.buttons[15]?.pressed) return 'right';

  const [x = 0, y = 0] = pad.axes;
  const direction = Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
  return Math.max(Math.abs(x), Math.abs(y)) >= (direction === previous ? 0.38 : 0.56) ? direction : null;
}

function available(element: HTMLElement) {
  return !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"], [data-gamepad-ignore]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

function nearestControl(current: HTMLElement, candidates: HTMLElement[], direction: Direction) {
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const from = current.getBoundingClientRect();
  let nearest: HTMLElement | undefined;
  let best = Infinity;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const to = candidate.getBoundingClientRect();
    const dx = (to.left + to.right - from.left - from.right) / 2;
    const dy = (to.top + to.bottom - from.top - from.bottom) / 2;
    const ahead = (horizontal ? dx : dy) * sign;
    if (ahead < 4) continue;

    const perpendicular = Math.abs(horizontal ? dy : dx);
    const gap = horizontal
      ? Math.max(0, to.top - from.bottom, from.top - to.bottom)
      : Math.max(0, to.left - from.right, from.left - to.right);
    const score = ahead + perpendicular * 1.5 + gap * 3;
    if (score < best) {
      nearest = candidate;
      best = score;
    }
  }
  return nearest;
}

function adjustValue(control: HTMLElement, direction: Direction) {
  if (direction !== 'left' && direction !== 'right') return false;
  const delta = direction === 'left' ? -1 : 1;
  if (control instanceof HTMLSelectElement) {
    let index = control.selectedIndex + delta;
    while (control.options[index]?.matches(':disabled')) index += delta;
    if (!control.options[index]) return false;
    control.selectedIndex = index;
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (control instanceof HTMLInputElement && control.type === 'range' && !control.readOnly) {
    const previous = control.value;
    if (delta < 0) control.stepDown();
    else control.stepUp();
    if (previous === control.value) return false;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}

export function useMenuGamepad(
  rootRef: RefObject<HTMLElement | null>,
  screen: string,
  configOpen: boolean,
  onPause: () => void,
) {
  const currentState = useRef({ screen, configOpen, onPause });
  currentState.current = { screen, configOpen, onPause };

  useEffect(() => {
    let raf = 0;
    let padIndex = -1;
    let previousDirection: Direction | null = null;
    let previousButtons = [false, false, false];
    let repeatAt = 0;
    let resumeGuard = false;
    let focused: HTMLElement | undefined;

    const clearFocus = () => {
      focused?.removeAttribute('data-gamepad-focus');
      focused = undefined;
    };
    const focus = (target: HTMLElement) => {
      clearFocus();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      target.setAttribute('data-gamepad-focus', '');
      focused = target;
    };

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden || !document.hasFocus()) {
        padIndex = -1;
        resumeGuard = true;
        return;
      }
      const pads = Array.from(navigator.getGamepads?.() ?? []);
      const active = (pad: Gamepad | null | undefined): pad is Gamepad => Boolean(pad?.connected);
      const pad = pads.find(p => active(p) && p.index === padIndex)
        ?? pads.find(p => active(p) && (directionOf(p, null) !== null || [0, 1, 9].some(i => p.buttons[i]?.pressed)));
      if (!pad) {
        padIndex = -1;
        clearFocus();
        return;
      }

      const buttons = [0, 1, 9].map(i => Boolean(pad.buttons[i]?.pressed));
      const direction = directionOf(pad, previousDirection);
      const samePad = pad.index === padIndex;
      // A held button after returning to the tab should never activate an action.
      const initialized = !resumeGuard;
      const [confirm, back, start] = buttons.map((pressed, i) => initialized && pressed && !(samePad && previousButtons[i]));
      const moved = initialized && direction !== null &&
        (!samePad || direction !== previousDirection || now >= repeatAt);
      if (moved) repeatAt = now + (samePad && direction === previousDirection ? repeatInterval : repeatDelay);
      if (!buttons.some(Boolean) && !direction) resumeGuard = false;
      previousButtons = buttons;
      previousDirection = direction;
      padIndex = pad.index;
      if (!initialized || (!confirm && !back && !start && !moved)) return;

      const root = rootRef.current;
      if (!root) return;
      const { screen, configOpen, onPause } = currentState.current;
      const online = root.querySelector<HTMLElement>('[data-gamepad-online]');
      if (online?.hasAttribute('data-gamepad-playing')) {
        clearFocus();
        return;
      }
      const scope = online
        ?? (configOpen ? root.querySelector<HTMLElement>('[data-gamepad-config]') : null)
        ?? root.querySelector<HTMLElement>('[data-gamepad-overlay]');
      if (!online && !configOpen && start && (screen === 'PLAYING' || screen === 'PAUSED')) {
        onPause();
        return;
      }
      if (!scope && (screen === 'PLAYING' || screen === 'VS')) {
        clearFocus();
        return;
      }
      const menu = scope ?? root;
      if (back) {
        const exit = Array.from(menu.querySelectorAll<HTMLElement>('[data-gamepad-back]')).find(available);
        if (exit) exit.click();
        return;
      }

      const candidates = Array.from(menu.querySelectorAll<HTMLElement>(controls)).filter(available);
      const current = candidates.find(candidate => candidate === document.activeElement);
      if (!current) {
        const first = candidates.find(candidate => candidate.hasAttribute('data-gamepad-initial')) ?? candidates[0];
        if (first) focus(first);
      } else if (confirm) {
        if (current instanceof HTMLInputElement && current.type === 'text' && !current.readOnly) current.select();
        else current.click();
      } else if (moved && direction && !adjustValue(current, direction)) {
        const next = nearestControl(current, candidates, direction);
        if (next) focus(next);
      }
    }

    const suspend = () => {
      padIndex = -1;
      resumeGuard = true;
      clearFocus();
    };
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', suspend);
    document.addEventListener('pointerdown', clearFocus);
    document.addEventListener('keydown', clearFocus);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', suspend);
      document.removeEventListener('pointerdown', clearFocus);
      document.removeEventListener('keydown', clearFocus);
      clearFocus();
    };
  }, [rootRef, currentState]);
}
