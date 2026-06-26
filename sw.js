const CACHE_NAME = 'roux-command-v1';
const ASSETS = [
    './',
    './index.html',
    './river.html',
    './weather.html',
    './forecast.html',
    './prep.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Install Event - Caching app core shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching application assets');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Cleaning deprecated cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Stale-While-Revalidate Strategy for local files, Network-Only for APIs
self.addEventListener('fetch', (e) => {
    // Only intercept local relative assets, let external NOAA/USGS live APIs proceed straight to network
    if (!e.request.url.startsWith(self.location.origin)) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
