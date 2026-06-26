/**
 * AIWMC Quantis Service Worker
 * Network-first strategy for fresh content, cache fallback for offline
 * 
 * IMPORTANT: Increment CACHE_VERSION on every deployment to bust old caches
 */

const CACHE_VERSION = 'v3.1.0';
const STATIC_CACHE = `aiwmc-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aiwmc-dynamic-${CACHE_VERSION}`;

// Broadcast a NEW_VERSION_ACTIVE message to all clients after activation so
// the app can prompt the user to refresh and pick up new chunks.
function broadcastNewVersion() {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((c) => {
      try { c.postMessage({ type: 'NEW_VERSION_ACTIVE', version: CACHE_VERSION }); } catch (_) {}
    });
  });
}

// Only cache truly static assets
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache only essential static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force immediate activation - don't wait for old SW to close
  self.skipWaiting();
});

// Activate event - AGGRESSIVELY clean ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // Take control of ALL clients immediately, then tell them a new version is live.
  self.clients.claim().then(() => broadcastNewVersion());
});

// Fetch event - NETWORK-FIRST for HTML/JS, cache fallback only for offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API requests entirely - let them go through normally
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('sentry') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googletagmanager')
  ) {
    return;
  }

  // For navigation requests (HTML pages) - ALWAYS network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the fresh response for offline fallback only
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed - try cache as last resort
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // For JS/CSS assets - network first with cache fallback
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('/src/')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // For images and other static assets - cache first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
  
  // Allow app to request cache clear
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Cache clear requested');
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});
