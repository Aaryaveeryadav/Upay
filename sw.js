/* Upay service worker — offline shell + public asset caching (v26ab).
   API responses are deliberately never stored: they can be user-specific. */
const VERSION = 'upay-v26d8';
const ASSET_CACHE = VERSION + '-assets';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/assets/brand/kritin-logo.png',
  '/assets/brand/kritin-icon-192.png',
  '/assets/brand/kritin-icon-512.png',
  '/assets/css/app.css?v=26d8',
  '/assets/js/boot.js?v=26d8',
  '/assets/js/app.js?v=26d8',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  // Other applications on the same origin may own other caches.
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('upay-v') && k !== VERSION && k !== ASSET_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    ev.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ offline: true }), {
      status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    })));
    return;
  }
  // Large source PDFs are not cached. Let the browser/server handle range
  // requests directly; Cache.put cannot store partial (206) responses.
  if ((url.pathname.startsWith('/assets/papers/') || url.pathname.startsWith('/assets/books/')) && /\.pdf$/i.test(url.pathname)) return;
  if (url.pathname === '/' || url.pathname === '/index.html') {
    ev.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(req);
        if (response.ok) await cache.put('/', response.clone());
        return response;
      } catch (_) {
        return (await cache.match('/')) || new Response('Kritin Upay is offline and the page has not been saved yet.', { status: 503 });
      }
    })());
    return;
  }
  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|json|webmanifest)$/.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    const network = fetch(req).then(async response => {
      if (response.ok) {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(req, response.clone());
      }
      return response;
    }).catch(() => null);
    // Keep the revalidation alive after a cached response has been returned.
    ev.waitUntil(network.then(() => undefined));
    ev.respondWith((async () => {
      const shell = await caches.open(VERSION);
      const assets = await caches.open(ASSET_CACHE);
      return (await shell.match(req)) || (await assets.match(req)) || (await network)
        || new Response('This asset is not available offline.', { status: 503 });
    })());
  }
});
