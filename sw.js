// ══════════════════════════════════════════════════════════════
// Kola Bro — Service Worker
//
// IMPORTANT: change CACHE_VERSION every time you deploy new code.
// This is the single most important line in this file — bumping it
// is what forces every user's phone to drop the old cached version
// and fetch your new one, instead of silently serving stale content
// forever (which was the bug you were hitting).
// ══════════════════════════════════════════════════════════════
const CACHE_VERSION = 'v2';
const CACHE_NAME = `kola-bro-${CACHE_VERSION}`;

// Only used as an offline fallback — NOT as the primary source of truth.
// The main pages are always fetched fresh from the network first (see below).
const OFFLINE_FALLBACK_URLS = [
    './',
    './index.html'
];

// ── Install: cache a minimal offline fallback set, activate immediately ──
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_FALLBACK_URLS))
    );
    self.skipWaiting(); // don't wait for old tabs to close before taking over
});

// ── Activate: delete every cache that isn't the current version ──
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim()) // take control of already-open tabs right away
    );
});

// ── Fetch: network-first for everything, cache is only an offline fallback ──
// This is the key behavior change. The old approach (cache-first) is what
// caused different users to get stuck on whatever version they installed
// with. Network-first means: always try to get the latest file first, and
// only fall back to the cached copy if the network request actually fails
// (e.g. genuinely offline).
self.addEventListener('fetch', (event) => {
    // Only handle GET requests — POST/PUT etc. (Firebase writes, API calls)
    // should never be intercepted by the service worker.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Got a fresh copy — update the offline-fallback cache with it
                // and serve the fresh copy immediately.
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Network failed (offline) — fall back to whatever we have cached.
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.htm');
                });
            })
    );
});

// ── Optional: let the page force an immediate update check ──
// The page can call navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'})
// to make a waiting new service worker activate right away instead of waiting
// for all tabs to close.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
