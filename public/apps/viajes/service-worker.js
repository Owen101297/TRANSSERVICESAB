const CACHE_NAME = 'viajes-ab-v56';
const urlsToCache = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './manifest.json',
  './assets/logo.png',
  './assets/favicon-96x96.png',
  './assets/favicon.svg',
  './assets/favicon.ico',
  './assets/apple-touch-icon.png',
  './assets/site.webmanifest',
  // Librerías locales
  './lib/jspdf.umd.min.js',
  './lib/jspdf.plugin.autotable.min.js',
  './lib/xlsx.full.min.js',
  // CDNs requeridos
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://rsms.me/inter/inter.css'
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
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});