/* Service Worker: App-Shell cachen, damit die App im Studio auch ohne Netz läuft. */
const CACHE = 'gymlog-v11';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/seed.js',
  './js/chart.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: sofort aus dem Cache (funktioniert offline im Studio),
   im Hintergrund wird die neue Version geholt und beim nächsten Start benutzt. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit || cache.match('./index.html'));
        return hit || net;
      })
    )
  );
});
