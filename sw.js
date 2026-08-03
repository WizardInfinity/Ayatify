/**
 * Ayatify - Service Worker
 * Meng-cache "app shell" (HTML/CSS/JS/manifest/ikon) agar aplikasi bisa
 * dibuka kembali secara offline. Data Al-Qur'an dari API tetap diambil
 * dari jaringan saat online (dan sudah dicache terpisah lewat localStorage
 * di js/api.js untuk surah yang pernah dibuka).
 */
const CACHE_NAME = "ayatify-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/juz-data.js",
  "./js/api.js",
  "./js/store.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // App shell: cache-first agar aplikasi tetap terbuka saat offline
  const isAppShell = APP_SHELL.some((path) =>
    request.url.endsWith(path.replace("./", "/"))
  );
  if (isAppShell || request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              return res;
            })
            .catch(() => caches.match("./index.html"))
      )
    );
    return;
  }

  // Sumber lain (API, font, dll): network-first, fallback ke cache jika ada
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
