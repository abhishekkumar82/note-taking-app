// public/service-worker.js
// ─────────────────────────────────────────────────────────────────────────────
// Minimal service worker — caches the app SHELL (HTML/CSS/JS bundle) so the
// app itself can load even with zero network connection. Actual DATA
// (notes, diary entries) is handled separately by IndexedDB + syncEngine.js,
// NOT by this service worker — that separation keeps each piece simple:
//   - Service worker = "can the app boot up at all offline?"
//   - IndexedDB       = "is the user's data available offline?"
//
// Strategy: cache-first for the app shell, network-first (with cache
// fallback) for everything else. We deliberately do NOT cache API responses
// here — IndexedDB is the single source of truth for data, avoiding having
// two separate offline caches that could drift out of sync with each other.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = "writeup-shell-v1";

// Core app shell files — adjust if your build output differs significantly.
// Vite's hashed bundle filenames mean we can't hardcode them here, so we
// rely on runtime caching (see fetch handler) for JS/CSS, and only
// precache the guaranteed-stable entry points.
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept API calls or websocket upgrade requests — those go
  // straight to the network (and IndexedDB handles offline data access
  // at the application layer, not here).
  if (
    request.url.includes("/api/") ||
    request.url.includes("/socket.io/") ||
    request.url.includes("/auth/")
  ) {
    return; // let the browser handle it normally
  }

  // Network-first for navigation requests (HTML), falling back to cache
  // when offline — ensures users always get the latest app shell when
  // online, but the app still boots when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Cache-first for static assets (JS/CSS/images/fonts) — these are
  // content-hashed by Vite, so a cached version is always valid for its URL.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Don't cache opaque/error responses
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
