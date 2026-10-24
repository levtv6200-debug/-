const CACHE_NAME = 'karta-prostranstva-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest'];
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    // Cache Three.js as an opaque response so the 360° viewer can also work offline.
    try {
      const response = await fetch(THREE_URL, { mode: 'no-cors', cache: 'reload' });
      if (response && (response.ok || response.type === 'opaque')) await cache.put(THREE_URL, response);
    } catch (e) {
      // If first installation happens without network, the viewer's library cannot be cached yet.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('karta-prostranstva-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin || request.url === THREE_URL) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: false });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
        return response;
      } catch (e) {
        if (url.origin === self.location.origin) {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        throw e;
      }
    })());
  }
});
