/* ======================================================
   GameInfo – Service Worker (sw.js)
   Cache-first voor assets, network-first voor API calls
   ====================================================== */

const CACHE_NAME = 'gameinfo-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Installatie: pre-cache alle assets ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activatie: oude caches opruimen ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Oude cache verwijderd:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first voor assets, network voor API ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API → altijd via netwerk (geen cache)
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Alle andere requests → cache first, dan netwerk
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Alleen geldige responses cachen
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });

        return response;
      }).catch(() => {
        // Offline fallback voor HTML pagina's
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
