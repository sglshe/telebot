const CACHE_NAME = 'antichrist-v6.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/css/index.css',
  '/js/app.js',
  '/js/generators.js',
  '/js/terminal.js',
  '/js/animations.js',
  '/js/notifications.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
