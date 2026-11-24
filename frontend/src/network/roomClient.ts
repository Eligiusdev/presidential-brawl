export interface RoomSummary {
  code: string;
  mode: 'ffa' | 'champion' | 'tournament';
  teamSize: number;
  stocks: number;
  stage: number;
  players: number;
  connected: number;
  maxPlayers: 2 | 4 | 6 | 8;
  playing: boolean;
  updated: string;
}

export type OnlineIntent =
  | { type: 'create'; maxPlayers: 2 | 4 | 6 | 8; mode: 'ffa' | 'champion' | 'tournament'; teamSize: number; stocks?: number }
  | { type: 'join'; code: string };

export function roomApiUrl(path = '') {
  const local = /^(?:localhost$|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/;
  const configured = local.test(location.hostname) ? '' : import.meta.env.VITE_ROOM_API_BASE_URL;
  return new URL(`/api${path}`, configured || location.origin).href;
}

export function roomSocketUrl() {
  const url = new URL(roomApiUrl('/rooms/ws'));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

export async function fetchRoomList(signal?: AbortSignal): Promise<RoomSummary[]> {
  const res = await fetch(roomApiUrl('/rooms'), { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { rooms?: RoomSummary[] };
  return Array.isArray(data.rooms) ? data.rooms : [];
}

export function subscribeRoomList(onRooms: (rooms: RoomSummary[]) => void, onError?: () => void): () => void {
  const source = new EventSource(roomApiUrl('/rooms/events'));
  source.addEventListener('rooms', event => {
    try {
      const data = JSON.parse((event as MessageEvent<string>).data) as { rooms?: RoomSummary[] };
      if (Array.isArray(data.rooms)) onRooms(data.rooms);
    } catch {}
  });
  source.onerror = () => onError?.();
  return () => source.close();
}
