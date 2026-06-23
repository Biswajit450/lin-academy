// sw.js - The Service Worker

const CACHE_NAME = 'lin-academy-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json'
    // Aap baad mein yahan apne images ya CSS ke links bhi add kar sakte hain
];

// 1. INSTALL EVENT - Caching core files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
        .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE EVENT - Cleaning up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. FETCH EVENT - Serving files from Cache or Network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Agar file cache mein hai toh wahan se do, warna internet se fetch karo
            return response || fetch(event.request);
        })
    );
});