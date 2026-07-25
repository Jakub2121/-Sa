const CACHE_NAME = 'forge-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html', // lub nazwa Twojego pliku HTML
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// Instalacja i zapisanie plików w pamięci telefonu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Serwowanie plików z pamięci cache, gdy brak internetu
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
