import { BitmapText, Container, Sprite, Texture } from 'pixi.js';
import { PRESIDENTS_DATA } from '../data/presidents';
import { TAG_HUD_STRIDE, TAG_HUD_MEMBER_STRIDE, TagHUDField, TagHUDMemberField } from './wasmBridge';

export function createPixiTagHUD(layer: Container, teams: readonly string[][], portrait: (id: string) => Texture) {
  const text = (value: string, size: number) => new BitmapText({
    text: value, style: { fontFamily: 'Arial', fontSize: size, fill: 0xffffff },
  });
  const clock = text('3:00', 28);
  clock.anchor.set(.5, 0);
  clock.position.set(720, 18);
  layer.addChild(clock);
  let lastSecond = -1;
  const cards = teams.map((team, seat) => team.map((id, member) => {
    const card = new Container();
    card.position.set((seat === 0 ? 18 : 790) + member * 211, 14);
    const panel = new Sprite(Texture.WHITE);
    panel.width = 205;
    panel.height = 76;
    const icon = new Sprite(portrait(id));
    icon.anchor.set(.5);
    icon.scale.set(48 / Math.max(icon.texture.width, icon.texture.height));
    icon.position.set(25, 35);
    const name = text(PRESIDENTS_DATA.find(fighter => fighter.id === id)?.name ?? id, 20);
    if (name.width > 147) name.scale.set(147 / name.width);
    name.position.set(50, 8);
    const status = text(' ', 18);
    status.position.set(50, 31);
    const blue = new Sprite(Texture.WHITE);
    const health = new Sprite(Texture.WHITE);
    blue.tint = 0x38bdf8;
    health.tint = 0xffcf65;
    for (const bar of [blue, health]) {
      bar.position.set(50, 58);
      bar.height = 8;
      bar.width = 0;
    }
    card.addChild(panel, icon, name, status, blue, health);
    layer.addChild(card);
    return { panel, status, blue, health, lastStatus: -1 };
  }));
  return (state: Uint32Array | null, tick: number) => {
    const seconds = Math.max(0, 180 - Math.floor(tick / 60));
    if (seconds !== lastSecond) {
      clock.text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      lastSecond = seconds;
    }
    if (!state) return;
    for (let seat = 0; seat < cards.length; seat++) {
      const team = seat * TAG_HUD_STRIDE;
      const active = state[team + TagHUDField.ActiveMember];
      for (let slot = 0; slot < cards[seat].length; slot++) {
        const card = cards[seat][slot];
        const member = team + TagHUDField.FirstMember + slot * TAG_HUD_MEMBER_STRIDE;
        const health = state[member + TagHUDMemberField.Health];
        const maximum = state[member + TagHUDMemberField.MaxHealth] || 1;
        const blue = state[member + TagHUDMemberField.BlueHealth];
        const cooldown = Math.ceil(state[member + TagHUDMemberField.AssistCooldown] / 60);
        const assist = slot < active ? 1 + slot : slot;
        const status = health === 0 ? 0 : slot === active ? 1 : assist * 10 + cooldown;
        if (status !== card.lastStatus) {
          card.lastStatus = status;
          card.panel.tint = status === 1 ? 0x395878 : 0x192638;
          card.status.text = status === 0 ? 'KO' : status === 1 ? 'Activo' :
            `A${assist} · ${cooldown ? `${cooldown} s` : 'Lista'}`;
        }
        const healthWidth = 145 * health / maximum;
        const blueWidth = 145 * (health + blue) / maximum;
        if (card.health.width !== healthWidth) card.health.width = healthWidth;
        if (card.blue.width !== blueWidth) card.blue.width = blueWidth;
      }
    }
  };
}
