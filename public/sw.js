// Service Worker for AnkiFlow
// Provides offline support, smart caching, and background sync

// Dynamic version — updated on each deploy
const APP_VERSION = '8.2.0';
const STATIC_CACHE = `ankiflow-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `ankiflow-dynamic-${APP_VERSION}`;

// Core assets to pre-cache (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/style.css',
  '/js/main.js',
  '/js/theme.js',
  '/icon.svg',
  '/icon-192.png',
  '/favicon-32.png',
];

// Install event — pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event — clean up ALL old version caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name.startsWith('ankiflow-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      // Notify all clients about the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// Fetch event — smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Stale-While-Revalidate for static assets (CSS, JS, images)
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Network First for HTML pages
  event.respondWith(networkFirst(request));
});

/**
 * Stale-While-Revalidate: serve from cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  return cachedResponse || fetchPromise;
}

/**
 * Network First: try network, fall back to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    // If navigating and nothing cached, return app shell
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
  }
});
