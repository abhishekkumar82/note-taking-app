// src/registerServiceWorker.js
// ─────────────────────────────────────────────────────────────────────────────
// Registers public/service-worker.js. Call registerServiceWorker() once,
// from main.jsx, after the app renders.
//
// FIX: Only register in PRODUCTION builds. In dev mode, the service worker's
// fetch interception fights with Vite's own dev-server WebSocket (used for
// Hot Module Replacement), causing "WebSocket handshake: Unexpected response
// code 400" and breaking HMR entirely. PWA installability/offline-shell
// caching only matters for the deployed/built app anyway — there's no need
// for it while running `npm run dev`.
// ─────────────────────────────────────────────────────────────────────────────

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service workers not supported in this browser");
    return;
  }

  // ⭐ Skip entirely in dev — import.meta.env.PROD is true only in `vite build`
  if (!import.meta.env.PROD) {
    console.log("[PWA] Skipping service worker registration in dev mode");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[PWA] Service worker registered:", registration.scope);
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  });
}