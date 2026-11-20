export function roomSocketUrl() {
  const local = /^(?:localhost$|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/;
  const configured = local.test(location.hostname) ? '' : import.meta.env.VITE_ROOM_API_BASE_URL;
  const url = new URL('/api/rooms/ws', configured || location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
