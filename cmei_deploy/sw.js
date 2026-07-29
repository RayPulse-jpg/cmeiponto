const CACHE_NAME = 'folha-ponto-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './style.css',
    './script.js',
    './logo.png',
    './login_illustration.png'
];

// Instalação — cacheia os assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Ativação — limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — Network first para dados, Cache first para assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase e APIs externas — sempre network
    if (url.hostname.includes('firebase') || url.hostname.includes('gstatic')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Assets estáticos — cache first, fallback network
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    // Cachear nova resposta
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
