const CACHE_NAME = 'quran-tutor-static-v1';
const OFFLINE_URL = '/offline.html';
const SAFE_STATIC_ASSETS = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SAFE_STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('quran-tutor-static-') && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Navigations always use the network and are never placed in the cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Only the explicitly listed public icons are served from the static cache.
  // API, authentication, payment, classroom, and private data requests pass through.
  if (SAFE_STATIC_ASSETS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
    );
  }
});
