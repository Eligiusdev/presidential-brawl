const NAME_KEY = 'brawl-online-name';
const ID_KEY = 'brawl-online-client-id';

/** Stable per-browser identity, used by the server for bans. Never rotate it on reload. */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,80}$/.test(id)) {
      id = `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous-player';
  }
}

export function getPlayerName(): string {
  try { return (localStorage.getItem(NAME_KEY) ?? '').slice(0, 18); } catch { return ''; }
}

export function setPlayerName(name: string): string {
  const clean = name.trim().slice(0, 18);
  try {
    if (clean) localStorage.setItem(NAME_KEY, clean);
    else localStorage.removeItem(NAME_KEY);
  } catch {}
  return clean;
}
