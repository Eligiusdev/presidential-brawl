import { Assets, Container, Particle, ParticleContainer, Rectangle, Sprite, Texture } from 'pixi.js';
import { PRESIDENT_ULTIMATES } from '../data/presidentUltimates';
import { ultimateArtFrame, ultimateArtMoves, ultimateArtRegion, ultimateArtSource, ultimateVisualState } from '../engine/ultimateSprites';
import type { MatchSnapshot } from '../network/matchState';
import { MAX_PLAYERS } from './wasmBridge';

const MOTES = 12;
const TRAINS = new Set(['ult_lincoln', 'ult_alfaro', 'ult_biden']);

export function createPixiUltimates(world: Container, dot: Texture, ring: Texture, streak: Texture, ownedTextures: Texture[]) {
  const art = new Map<string, Texture[]>();
  const sprites = Array.from({ length: MAX_PLAYERS }, () => {
    const ground = new Sprite(ring);
    const focal = new Sprite(Texture.EMPTY);
    const accent = new Sprite(streak);
    ground.anchor.set(.5);
    focal.anchor.set(.5);
    accent.anchor.set(.5);
    world.addChild(ground, focal, accent);
    return { ground, focal, accent };
  });
  const motes = new ParticleContainer({
    texture: dot,
    dynamicProperties: { position: true, vertex: true, color: true },
    boundsArea: new Rectangle(0, 0, 1440, 810),
  });
  const particles = Array.from({ length: MAX_PLAYERS * MOTES }, () => new Particle({ texture: dot, alpha: 0 }));
  motes.addParticle(...particles);
  world.addChild(motes);

  return {
    warmup(render: () => void) {
      const visible = motes.visible;
      motes.visible = true;
      render();
      motes.visible = visible;
    },
    async load(players: MatchSnapshot['players']) {
      const ids = new Set(players.map(p => PRESIDENT_ULTIMATES[p.fighterId]?.id).filter(id => id !== undefined));
      await Promise.allSettled([...ids].map(async id => {
        const entry = ultimateArtSource(id);
        if (!entry) return;
        const sheet = await Assets.load<Texture>(entry.url);
        const frames = Array.from({ length: entry.frames }, (_, frame) => {
          const [x, y, w, h] = entry.box ?? ultimateArtRegion(frame);
          const texture = new Texture({ source: sheet.source, frame: new Rectangle(x, y, w, h) });
          ownedTextures.push(texture);
          return texture;
        });
        art.set(id, frames);
      }));
    },
    sync(snapshot: MatchSnapshot) {
      let slot = 0;
      for (const zone of snapshot.zones ?? []) {
        const state = ultimateVisualState(zone.specialized);
        if (!state || slot >= sprites.length) continue;
        const { ultimate, origin, point, box, active, triggered } = state;
        const { spec } = ultimate;
        const { ground, focal, accent } = sprites[slot];
        const time = zone.t;
        const duration = Math.max(1, zone.dur);
        const progress = Math.min(1, time / duration);
        const opacity = Math.min(1, (time + 2) / 7, (duration - time + 6) / 12);
        const beat = Math.sin((time * spec.hits / duration % 1) * Math.PI);
        const facing = origin.face < 0 ? -1 : 1;
        const moving = ultimateArtMoves(ultimate);
        const train = TRAINS.has(spec.id);
        const frames = art.get(spec.id);
        const frame = ultimateArtFrame(ultimate, time, duration, triggered);
        const texture = frames?.[frame] ?? frames?.[0];
        const size = (train ? Math.max(186, box.w * 1.36) : Math.max(88, Math.min(256, Math.max(box.w, box.h) * .91)))
          * (active ? 1 + .075 * Math.sin(time * .37) : .93);
        const ratio = texture ? texture.width / texture.height : 1;
        const width = size * Math.min(1, ratio);
        const height = size / Math.max(1, ratio);
        const bob = moving ? Math.sin(time * .28) * 2 : -Math.sin(time * .13) * 5;
        focal.visible = Boolean(texture);
        if (texture) {
          if (focal.texture !== texture) focal.texture = texture;
          focal.position.set(point.x, point.y + bob);
          focal.scale.set(facing * width / texture.width, height / texture.height);
          focal.rotation = spec.primitive === 'dashStrike' ? (beat - .5) * .31 * facing
            : spec.primitive === 'spawnEntity' && !train ? Math.sin(time * .14) * .055 * facing : 0;
          focal.alpha = opacity * (active ? .98 : .66 + .18 * progress);
        }
        ground.visible = true;
        ground.position.set(point.x, point.y + height * .4);
        ground.width = width * (.74 + .18 * beat);
        ground.height = Math.max(8, height * .16);
        ground.tint = spec.colors[0];
        ground.alpha = opacity * .35;
        const beam = spec.primitive === 'spawnProjectile' || spec.primitive === 'dashStrike';
        accent.visible = triggered || !texture;
        const accentTexture = beam ? streak : ring;
        if (accent.texture !== accentTexture) accent.texture = accentTexture;
        accent.position.set(point.x, point.y);
        accent.width = width * (1 + .22 * beat);
        accent.height = beam ? 8 + beat * 10 : height * .81;
        accent.rotation = beam ? -.25 * facing : 0;
        accent.tint = spec.colors[1];
        accent.alpha = opacity * (active ? .51 : .22);
        for (let i = 0; i < MOTES; i++) {
          const particle = particles[slot * MOTES + i];
          const age = ((time + i * 5) % 42) / 42;
          const angle = i * 2.39996 + time * .13;
          particle.x = point.x + facing * (moving && i >= 6 ? -width * (.15 + age * .68) : Math.cos(angle) * width * (.33 + age * .49));
          particle.y = point.y + Math.sin(angle) * height * (.33 + age * .46);
          particle.scaleX = particle.scaleY = (3 + age * 6) / dot.width;
          particle.tint = spec.colors[i % 2];
          particle.alpha = opacity * (1 - age) * (active ? .85 : .44);
        }
        slot++;
      }
      motes.visible = slot > 0;
      for (let i = slot; i < sprites.length; i++) {
        const { ground, focal, accent } = sprites[i];
        ground.visible = focal.visible = accent.visible = false;
      }
      for (let i = slot * MOTES; i < particles.length; i++) particles[i].alpha = 0;
    },
  };
}
