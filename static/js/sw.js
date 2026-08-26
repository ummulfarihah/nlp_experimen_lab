const CACHE_NAME = 'ummu-nlp-lab-v109.0';
const OFFLINE_URL = '/static/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/static/offline.html',
  '/manifest.json',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/charts.js',
  '/static/img/logo.png',
  '/static/img/logo-icon.png',
  '/static/img/favicon.png',
  '/static/img/favicon-64.png',
  '/static/img/favicon-128.png',
  '/static/img/pwa-icon-192.png',
  '/static/img/pwa-icon-512.png',
  '/static/img/pwa-icon-maskable.png',
  '/static/img/apple-touch-icon.png'
];

// Install Event - Pre-cache core shell & offline page, immediately activate without waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Purge all old versions & immediately claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting stale cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for explicit skipWaiting message from main application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - Network-First for HTML/Navigation, Stale-While-Revalidate for Static Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and backend API endpoints (direct network bypass)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Navigation / HTML Document Requests: Network-First with Offline Fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If server is healthy (200), cache it and return
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return networkResponse;
          }
          
          // If server returns gateway/tunnel error (502, 503, 504 from Ngrok when Colab is offline)
          if (networkResponse && networkResponse.status >= 500) {
            return caches.match(OFFLINE_URL).then((offlineRes) => {
              return offlineRes || networkResponse;
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // Network failed (offline / host unreachable) -> serve cached page or offline fallback
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match(OFFLINE_URL).then((offlineRes) => {
              return offlineRes || caches.match('/');
            });
          });
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Images, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});