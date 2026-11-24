const CACHE_NAME = 'splim-shell-v2';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_FILES = [
  APP_ROOT.href,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icons/splim-icon.svg', APP_ROOT).href,
  new URL('icons/splim-icon-maskable.svg', APP_ROOT).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('splim-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(APP_ROOT.href, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(APP_ROOT.href);
          return cached || Response.error();
        })
    );
    return;
  }

  if (APP_FILES.includes(url.href)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
