import { Field, MAX_PLAYERS, STRIDE } from './wasmBridge';

interface Visibility {
  visible: boolean;
}

interface FighterVisual<Texture> {
  root: Visibility & { position: { set(x: number, y: number): unknown } };
  hud: Visibility;
  body: { scale: { x: number }; texture: Texture };
  poses: readonly Texture[];
  ultimate: { width: number };
  ultimateWidth: number;
  setStatus(damage: number, stocks: number): void;
}

// Accepts preallocated Pixi containers and sprites without owning the scene.
export function createFighterVisualSync<Texture>(visuals: readonly FighterVisual<Texture>[]) {
  const damage = new Float32Array(MAX_PLAYERS).fill(-1);
  const stocks = new Int8Array(MAX_PLAYERS).fill(-1);

  return (state: Float32Array) => {
    for (let slot = 0; slot < Math.min(visuals.length, MAX_PLAYERS); slot++) {
      const base = slot * STRIDE;
      const visual = visuals[slot];
      const visible = state[base + Field.Active] > 0;
      const lives = state[base + Field.Stocks];
      if (visual.root.visible !== visible) visual.root.visible = visible;
      if (visual.hud.visible !== (lives > 0)) visual.hud.visible = lives > 0;
      if (lives <= 0) continue;
      if (visible) {
        visual.root.position.set(state[base + Field.X], state[base + Field.Y]);
        const scale = Math.abs(visual.body.scale.x) * (state[base + Field.Facing] < 0 ? -1 : 1);
        if (visual.body.scale.x !== scale) visual.body.scale.x = scale;
        const texture = visual.poses[state[base + Field.Pose]] ?? visual.poses[0];
        if (texture !== undefined && visual.body.texture !== texture) visual.body.texture = texture;
      }
      const width = visual.ultimateWidth * state[base + Field.Ultimate];
      if (visual.ultimate.width !== width) visual.ultimate.width = width;
      const pct = Math.floor(state[base + Field.Damage]);
      if (damage[slot] !== pct || stocks[slot] !== lives) {
        damage[slot] = pct;
        stocks[slot] = lives;
        visual.setStatus(pct, lives);
      }
    }
  };
}
