// Zmieniaj numer wersji (np. v2, v3...), gdy wypuszczasz ważną aktualizację!
const CACHE_NAME = 'forge-cache-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// 1. INSTALACJA: Natychmiastowe przejście do nowego SW
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Wymusza aktywację nowej wersji bez czekania na zamknięcie karty
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. AKTYWACJA: Czyszczenie starych wersji Cache z pamięci
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Usuwanie starego cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Przejmuje kontrolę nad otwartymi kartami
  );
});

// 3. POBIERANIE (FETCH): Strategia Network-First z fallbackiem do Cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jeśli pobrano z sieci, zaktualizuj plik w pamięci podręcznej
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Brak sieci (OFFLINE) -> Serwuj zapisaną wersję z pamięci cache
        return caches.match(event.request);
      })
  );
});
