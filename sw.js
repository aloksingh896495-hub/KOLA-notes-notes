const CACHE_NAME = 'kolabro-v1';
const OFFLINE_URL = '/';

// Files to cache for offline use
const PRECACHE_URLS = [
    '/',
    '/index.html'
];

// Install — cache core files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (Firebase, CDNs etc)
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache a copy of the response
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache
                return caches.match(event.request)
                    .then(cached => cached || caches.match(OFFLINE_URL));
            })
    );
});
