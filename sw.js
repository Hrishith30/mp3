// Service Worker for Background Audio Support
const CACHE_NAME = 'music-player-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache for music player');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve cached resources and handle audio
self.addEventListener('fetch', event => {
    // Handle audio files specially for background playback
    if (event.request.url.includes('.mp3') || event.request.url.includes('audio')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response for caching
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cached audio if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // For non-audio files, use cache-first strategy
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    }
});

// Background sync for audio playback
self.addEventListener('sync', event => {
    if (event.tag === 'background-audio-sync') {
        event.waitUntil(
            // Handle background audio sync
            console.log('Background audio sync triggered')
        );
    }
});

// Push notifications for audio controls (optional)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Music Player',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'music-player',
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Music Player', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Audio focus management
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'AUDIO_FOCUS') {
        // Handle audio focus requests
        console.log('Audio focus request received:', event.data);
    }
});

// Keep service worker alive for audio
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim all clients immediately
    return self.clients.claim();
});
