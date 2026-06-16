// Kola Bro Service Worker — enables "Add to Home Screen" / "Install App" in Chrome
// This is the minimum required for PWA installability: a registered SW with a fetch handler.

const CACHE_NAME = 'kola-bro-cache-v1';
const CORE_ASSETS = [
  './index.html'
];

// Install: pre-cache the core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: try cache first for the app shell, otherwise go to network.
// Falls back to cache if the network fails (basic offline support).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Don't try to cache cross-origin or non-OK responses
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone)).catch(() => {});
          return response;
        })
        .catch(() => cached);
    })
  );
});
