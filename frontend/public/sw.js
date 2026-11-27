const scope = new URL(self.registration.scope);
const prefix = `pbrawl-mobile-${scope.pathname}-`;
const index = new URL('index.html', scope).href;
let activeCache;
let activeKey;

async function shellCache() {
  if (activeCache) return activeCache;
  const version = new URL(self.location.href).searchParams.get('v');
  if (version) return caches.open(prefix + version);
  const keys = await caches.keys();
  const key = keys.filter(name => name.startsWith(prefix)).at(-1);
  return key ? caches.open(key) : undefined;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('pwa-shell.json', scope), { cache: 'reload' });
    if (!response.ok) throw new Error('Game shell unavailable');
    const { version, files } = await response.json();
    const expected = new URL(self.location.href).searchParams.get('v');
    if (expected && version !== expected) throw new Error('Incomplete game release');
    activeKey = prefix + version;
    const cache = await caches.open(activeKey);
    await cache.addAll(files.map(file => new Request(new URL(file, scope), { cache: 'reload' })));
    activeCache = cache;
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (activeKey) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== activeKey).map(key => caches.delete(key)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (path.startsWith('api/') || path === 'api' || path === 'pwa-shell.json') return;
  if (request.mode === 'navigate') {
    if (/\.[a-z0-9]+$/i.test(path) && path !== 'index.html') return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.status !== 404) return response;
        return (await (await shellCache())?.match(index)) ?? response;
      } catch {
        return (await (await shellCache())?.match(index)) ?? Response.error();
      }
    })());
    return;
  }
  if (!path.startsWith('assets/') && !path.startsWith('sim/')) return;
  event.respondWith((async () => {
    const cache = await shellCache();
    const cached = await cache?.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (cache && response.ok) {
      try { await cache.put(request, response.clone()); } catch { /* storage unavailable */ }
    }
    return response;
  })());
});
