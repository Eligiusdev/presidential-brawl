import 'pixi.js/prepare';
import { Application, Assets, BitmapText, Container, ImageSource, Rectangle, Sprite, Texture } from 'pixi.js';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import { fighterAtlasArt } from '../engine/fighterSprites';
import { stageArtUrl } from '../engine/stageAtmosphere';
import type { MatchSnapshot } from '../network/matchState';
import { createFighterVisualSync } from './syncFighterVisuals';
import { createPixiUltimates } from './pixiUltimates';
import { createArenaAtlas } from './pixiArenaArt';
import { Field, MAX_PLAYERS, STRIDE } from './wasmBridge';

const clips = ['guard', 'walk', 'jump', 'walk', 'slash', 'hurt'] as const;
const WIDTH = 1440;
const HEIGHT = 810;
const BAR_WIDTH = 140;

export async function createPixiCombat(target: HTMLCanvasElement, initial: MatchSnapshot) {
  const app = new Application();
  const ownedTextures: Texture[] = [];
  const ownedSources: ImageSource[] = [];
  let arenaAtlas: ReturnType<typeof createArenaAtlas> | undefined;
  const destroy = () => {
    app.destroy({ removeView: true }, { children: true });
    for (const texture of ownedTextures) texture.destroy(false);
    for (const source of ownedSources) source.destroy();
    arenaAtlas?.destroy();
  };

  await app.init({
    width: 960, height: 540, autoStart: false, antialias: false,
    preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    backgroundColor: 0x10182a,
  });
  app.ticker.remove(app.render, app);
  app.ticker.maxFPS = 0;
  try {
    const world = new Container();
    const hud = new Container();
    const viewport = new Container();
    viewport.scale.set(960 / WIDTH);
    viewport.addChild(world, hud);
    app.stage.addChild(viewport);
    const stage = STAGES_DATA[initial.stage] ?? STAGES_DATA[0];
    const background = new Sprite(await Assets.load<Texture>(stageArtUrl(stage.id, initial.world.stageNightStart ? 'night' : 'day')));
    background.width = WIDTH;
    background.height = HEIGHT;
    world.addChild(background);
    const art = createArenaAtlas(stage, Number(Boolean(initial.world.stageNightStart)), background.texture);
    arenaAtlas = art;
    const platforms = Array.from({ length: 16 }, (_, slot) => art.platform(slot > 0));
    const shots = Array.from({ length: 80 }, () => new Sprite(Texture.EMPTY));
    const particles = Array.from({ length: 128 }, () => art.particle());
    const hazards = Array.from({ length: 16 }, () => new Sprite(Texture.WHITE));
    for (const hazard of hazards) {
      hazard.tint = 0xff4538;
      world.addChild(hazard);
    }
    for (const platform of platforms) world.addChild(platform);

    const { dot, ring, streak } = art.effectTextures;
    const ultimates = createPixiUltimates(world, dot, ring, streak, ownedTextures);
    const ultimateArtReady = ultimates.load(initial.players);

    const ids = new Array<string>(MAX_PLAYERS).fill('');
    initial.players.forEach((player, index) => {
      const slot = (player as { pi?: number }).pi ?? index;
      ids[slot] = player.fighterId;
    });
    const atlasById = new Map([...new Set(ids.filter(Boolean))].map(id => {
      const fighter = PRESIDENTS_DATA.find(data => data.id === id) ?? PRESIDENTS_DATA[0];
      return [id, (async () => {
        const art = await fighterAtlasArt(fighter);
        if (!art) throw new Error(`Missing fighter atlas: ${id}`);
        const source = new ImageSource({ resource: art.atlas });
        ownedSources.push(source);
        return clips.map(clip => {
          const animation = art.meta.animations[clip] ?? art.meta.animations.guard;
          const pose = art.meta.poses[animation.frames[0].pose];
          const [x, y, width, height] = pose.region;
          const texture = new Texture({ source, frame: new Rectangle(x, y, width, height),
            defaultAnchor: { x: pose.anchor[0] / width, y: pose.anchor[1] / height } });
          ownedTextures.push(texture);
          return { texture, scale: pose.scale };
        });
      })()] as const;
    }));
    // Wait for every upload source before constructing or destroying the scene.
    const atlasResults = await Promise.allSettled(atlasById.values());
    await ultimateArtReady;
    const failed = atlasResults.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    const visuals = await Promise.all(ids.map(async (id, slot) => {
      const fighter = PRESIDENTS_DATA.find(data => data.id === id);
      const atlas = await atlasById.get(id);
      const root = new Container();
      const body = new Sprite(atlas?.[0].texture ?? Texture.EMPTY);
      body.scale.set(atlas?.[0].scale ?? 1);
      root.visible = false;
      root.addChild(body);
      world.addChild(root);
      const card = new Container();
      card.position.set(14 + slot * 177, 12);
      card.visible = false;
      const panel = new Sprite(Texture.WHITE);
      panel.tint = 0x121d33;
      panel.width = 156;
      panel.height = 56;
      panel.alpha = .9;
      const label = new BitmapText({ text: fighter?.name ?? '', style: { fontFamily: 'Arial', fontSize: 15, fill: 0xffffff } });
      label.position.set(8, 5);
      if (label.width > 140) label.scale.set(140 / label.width);
      const status = new BitmapText({ text: '0% · 3 vidas', style: { fontFamily: 'Arial', fontSize: 17, fill: 0xffffff } });
      status.position.set(8, 24);
      const track = new Sprite(Texture.WHITE);
      track.tint = 0x293b5b;
      track.position.set(8, 47);
      track.width = BAR_WIDTH;
      track.height = 4;
      const ultimate = new Sprite(Texture.WHITE);
      ultimate.tint = 0xffce51;
      ultimate.position.copyFrom(track.position);
      ultimate.height = 4;
      ultimate.width = 0;
      card.addChild(panel, label, status, track, ultimate);
      hud.addChild(card);
      return { root, hud: card, body, poses: atlas?.map(pose => pose.texture) ?? [], atlas,
        ultimate, ultimateWidth: BAR_WIDTH,
        setStatus: (damage: number, stocks: number) => { status.text = `${damage}% · ${stocks} vidas`; },
      };
    }));
    for (const shot of shots) world.addChild(shot);
    for (const particle of particles) world.addChild(particle);
    const sync = createFighterVisualSync(visuals);
    const fallback = new Float32Array(MAX_PLAYERS * STRIDE);
    app.canvas.className = target.className;
    app.canvas.setAttribute('aria-label', 'Arena multijugador WebGL');
    app.canvas.dataset.renderer = 'pixi';
    const scene = {
      app,
      sync(state: Float32Array | null, snapshot: MatchSnapshot) {
        if (!state) {
          fallback.fill(0);
          for (let index = 0; index < snapshot.players.length; index++) {
            const p = snapshot.players[index];
            const b = ((p as { pi?: number }).pi ?? index) * STRIDE;
            fallback[b + Field.Active] = p.dead === 0 && p.stocks > 0 ? 1 : 0;
            fallback[b + Field.X] = p.x + p.w / 2;
            fallback[b + Field.Y] = p.y + p.h;
            fallback[b + Field.Facing] = (p as { face?: number }).face ?? p.facing;
            fallback[b + Field.Pose] = p.stun > 0 ? 5 : p.atk ? 4 : p.dashT > 0 ? 3 : !p.on ? 2 : Math.abs(p.vx) > .4 ? 1 : 0;
            fallback[b + Field.Damage] = p.damage;
            fallback[b + Field.Ultimate] = Math.max(0, Math.min(1, p.ultCharge / 100));
            fallback[b + Field.Stocks] = p.stocks;
          }
          state = fallback;
        }
        sync(state);
        for (let i = 0; i < visuals.length; i++) {
          const { body, atlas } = visuals[i];
          const pose = atlas?.[state[i * STRIDE + Field.Pose]];
          if (pose) {
            body.anchor.copyFrom(pose.texture.defaultAnchor!);
            body.scale.set(body.scale.x < 0 ? -pose.scale : pose.scale, pose.scale);
          }
        }
        ultimates.sync(snapshot);
        const main = snapshot.world.main;
        const ledges = snapshot.world.plats;
        for (let i = 0; i < platforms.length; i++) {
          const geometry = i === 0 ? main : ledges?.[i - 1];
          const sprite = platforms[i];
          sprite.visible = Boolean(geometry);
          if (geometry) {
            sprite.position.set(geometry.x, geometry.y);
            sprite.width = geometry.w;
            sprite.height = ('h' in geometry ? Number(geometry.h) : 16) || 16;
          }
        }
        for (let i = 0; i < shots.length; i++) {
          const shot = snapshot.projectiles?.[i];
          const sprite = shots[i];
          sprite.visible = Boolean(shot);
          if (shot) {
            const texture = art.projectile(shot.kind);
            if (sprite.texture !== texture) sprite.texture = texture;
            sprite.tint = shot.kind === 'pulse' && shot.ownerColor ? shot.ownerColor : 0xffffff;
            const direction = shot.dir < 0 || (shot.dir == null && shot.vx < 0) ? -1 : 1;
            sprite.width = shot.w;
            sprite.height = shot.h;
            sprite.scale.x = direction * Math.abs(sprite.scale.x);
            sprite.position.set(shot.x + (direction < 0 ? shot.w : 0), shot.y);
          }
        }
        const zones = (snapshot as MatchSnapshot & { telegraph?: { zones: { x: number; y: number; w: number; h: number }[] } }).telegraph?.zones;
        for (let i = 0; i < hazards.length; i++) {
          const zone = zones?.[i];
          const sprite = hazards[i];
          sprite.visible = Boolean(zone);
          if (zone) {
            sprite.alpha = snapshot.tick % 6 < 3 ? .32 : .16;
            sprite.position.set(zone.x, zone.y);
            sprite.width = zone.w;
            sprite.height = zone.h;
          }
        }
        const effects = snapshot.world.particles;
        for (let i = 0; i < particles.length; i++) {
          const effect = effects?.[i];
          const sprite = particles[i];
          sprite.visible = Boolean(effect);
          if (effect) {
            sprite.position.set(effect.x, effect.y);
            sprite.width = sprite.height = Math.max(1, effect.z * 2);
            sprite.alpha = Math.max(0, Math.min(1, effect.l / Math.max(1, effect.m)));
            sprite.tint = effect.col;
          }
        }
      },
      destroy,
    };
    scene.sync(null, initial);
    await app.renderer.prepare.upload([app.stage, ...ownedTextures, dot]);
    ultimates.warmup(() => app.render());
    return scene;
  } catch (error) {
    destroy();
    throw error;
  }
}
