const CACHE_NAME = 'salario-Modular-cache-v29'; 
const urlsToCache = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'regras.js',
  'calculadora-regras.js',
  'manifest.json',
  'icons/icon-192-v2.png', 
  'icons/icon-512-v2.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith('index.html') || 
      requestUrl.pathname.endsWith('app.js') || 
      requestUrl.pathname.endsWith('regras.js') || 
      requestUrl.pathname.endsWith('calculadora-regras.js') || 
      requestUrl.pathname.endsWith('style.css') ||
      requestUrl.pathname.endsWith('/')) { 
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});










