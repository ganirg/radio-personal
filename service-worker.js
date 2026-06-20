// Service Worker for חפיצים: רדיו
// Strategy: network-first for the main HTML (so updates always show up),
// cache-first for static assets that rarely change (icons).
// This avoids the classic PWA trap of being stuck on a stale cached version
// after we ship a fix.

const CACHE_NAME = 'hafizim-radio-v1';
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests — let everything else (Spotify API,
  // RSS proxies, CDN fonts, audio streams) pass straight through untouched.
  if (url.origin !== self.location.origin) return;

  // The main document: always try the network first, so code changes are
  // never hidden behind a stale cache. Fall back to cache only if offline.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, since these rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
