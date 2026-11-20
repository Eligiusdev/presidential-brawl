import { GameConfig, KeyBindings, MatchReplayData, PixelResolutionPreset, PlayerAction, PresidentData } from '../types/game';

export const DEFAULT_P1_KEYS: KeyBindings = {
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['KeyW'],
  down: ['KeyS'],
  light: ['KeyJ'],
  heavy: ['KeyK'],
  dash: ['KeyL'],
  ult: ['KeyC', 'Space'],
  reload: ['KeyR'],
};

export const DEFAULT_P2_KEYS: KeyBindings = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  jump: ['ArrowUp'],
  down: ['ArrowDown'],
  light: ['KeyU', 'Numpad1'],
  heavy: ['KeyI', 'Numpad2'],
  dash: ['KeyO', 'Numpad3'],
  ult: ['KeyM', 'Numpad0', 'Enter'],
  reload: ['Slash', 'NumpadDecimal'],
};

export const DEFAULT_CONFIG: GameConfig = {
  video: {
    pixelPreset: 'modern',
    crtFilter: 'scanlines',
    dynamicLighting: true,
    pixelOutlines: true,
    particleDensity: 'high',
    shakeIntensity: 1.0,
    hitstopEnabled: true,
    showHitboxes: false,
  },
  match: {
    stocks: 3,
    knockbackMultiplier: 1.0,
    gravityMultiplier: 1.0,
    hazardFrequency: 'normal',
    itemSpawnRate: 'normal',
    voteGainMultiplier: 1.0,
    startFullVote: false,
    aiDifficulty: 1,
  },
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.65,
    sfxVolume: 0.85,
    muted: false,
  },
  controls: {
    p1: DEFAULT_P1_KEYS,
    p2: DEFAULT_P2_KEYS,
    touchMode: 'auto',
    touchScale: 1.0,
    gamepadVibration: true,
  },
};

export const PIXEL_PRESET_DIMS: Record<PixelResolutionPreset, { w: number; h: number; label: string; desc: string }> = {
  retro: { w: 480, h: 270, label: 'Retro CPS-1 (480×270)', desc: 'Pixel art clásico de recreativa 16-bit' },
  modern: { w: 640, h: 360, label: '16-Bit Arcade HD (640×360)', desc: 'Sprites CPS-1 1:1 con sombreado Bayer y detalle muscular' },
  ultra: { w: 960, h: 540, label: 'Hi-Bit Nítido (960×540)', desc: 'Máxima definición pixelada con contornos cromáticos' },
};

export const ACTION_LABELS: Record<PlayerAction, string> = {
  left: 'Mover Izquierda',
  right: 'Mover Derecha',
  jump: 'Saltar (x3)',
  down: 'Bajar / Caída rápida',
  light: 'Ataque Ligero / Disparar',
  heavy: 'Especial (arriba / neutro / abajo)',
  dash: 'Dash / Esquive',
  ult: 'Ultimate (Decreto Supremo)',
  reload: 'Recargar Arma',
};

const STORAGE_KEY = 'presidential_brawl_apex_config_v2';
const CUSTOM_ROSTER_KEY = 'presidential_brawl_custom_fighters_v1';
const LAST_REPLAY_KEY = 'presidential_brawl_last_replay_v1';

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw);
    return {
      video: { ...DEFAULT_CONFIG.video, ...(parsed.video || {}) },
      match: { ...DEFAULT_CONFIG.match, ...(parsed.match || {}) },
      audio: { ...DEFAULT_CONFIG.audio, ...(parsed.audio || {}) },
      controls: {
        ...DEFAULT_CONFIG.controls,
        ...(parsed.controls || {}),
        p1: { ...DEFAULT_P1_KEYS, ...(parsed.controls?.p1 || {}) },
        p2: { ...DEFAULT_P2_KEYS, ...(parsed.controls?.p2 || {}) },
      },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(cfg: GameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore storage quota errors
  }
}

export function loadCustomPresidents(): PresidentData[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROSTER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPresidents(list: PresidentData[]): void {
  try {
    localStorage.setItem(CUSTOM_ROSTER_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLastReplay(): MatchReplayData | null {
  try {
    const raw = localStorage.getItem(LAST_REPLAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.version === 1 || parsed.version === 2 || parsed.version === 3 || parsed.version === 4) && Array.isArray(parsed.keyframes)) {
      return parsed as MatchReplayData;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastReplay(replay: MatchReplayData): void {
  try {
    localStorage.setItem(LAST_REPLAY_KEY, JSON.stringify(replay));
  } catch {
    // ignore storage quota errors
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  const map: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'ESPACIO',
    Enter: 'ENTER',
    ShiftLeft: 'SHIFT IZQ',
    ShiftRight: 'SHIFT DER',
    ControlLeft: 'CTRL',
    Slash: '/',
    NumpadDecimal: 'NUM .',
  };
  return map[code] || code;
}
