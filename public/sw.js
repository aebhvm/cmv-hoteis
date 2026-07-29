const CACHE_NAME = 'cmv-hoteis-shell-v1';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// The app state stays network-first in the Neon API; this worker only enables installation.
void CACHE_NAME;
