const CACHE_NAME = 'cmv-hoteis-shell-v2';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Mantém a aplicação em rede e permite que o navegador reconheça o PWA como instalável.
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(fetch(event.request));
  }
});

void CACHE_NAME;
