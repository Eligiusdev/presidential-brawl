export const MAX_PLAYERS = 8;
export const STRIDE = 8;

export enum Field {
  Active,
  X,
  Y,
  Facing,
  Pose,
  Damage,
  Ultimate,
  Stocks,
}

// A refresh writes into a shared scratch region. Consume it immediately before
// asking for another match's render state. The view itself does not copy data.
export function createRenderReader(memory: WebAssembly.Memory, refresh: (id: number) => number) {
  let view: Float32Array | null = null;
  return (id: number): Float32Array | null => {
    const pointer = refresh(id);
    if (pointer < 0) return null;
    const buffer = memory.buffer;
    if (!view || view.buffer !== buffer || view.byteOffset !== pointer) {
      view = new Float32Array(buffer, pointer, MAX_PLAYERS * STRIDE);
    }
    return view;
  };
}

export const TAG_HUD_STRIDE = 20;
export const TAG_HUD_MEMBER_STRIDE = 5;

export enum TagHUDField {
  MemberCount,
  ActiveMember,
  Ki,
  SparkingTicks,
  SparkingUsed,
  FirstMember,
}

export enum TagHUDMemberField {
  FighterId,
  Health,
  MaxHealth,
  BlueHealth,
  AssistCooldown,
}

export function createTagHUDReader(memory: WebAssembly.Memory, refresh: (id: number) => number) {
  let view: Uint32Array | null = null;
  return (id: number): Uint32Array | null => {
    const pointer = refresh(id);
    if (pointer < 0) return null;
    const buffer = memory.buffer;
    if (!view || view.buffer !== buffer || view.byteOffset !== pointer) {
      view = new Uint32Array(buffer, pointer, MAX_PLAYERS * TAG_HUD_STRIDE);
    }
    return view;
  };
}
