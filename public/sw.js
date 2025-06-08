const CACHE_NAME = 'noorhub-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/NQ-ICON.png',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate service worker
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
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync when connection is restored
  return Promise.resolve();
}

// Push notification handling
self.addEventListener('push', event => {
  let notificationData = {
    title: 'NoorHub',
    body: 'New notification from NoorHub',
    icon: '/NQ-ICON.png',
    badge: '/NQ-ICON.png',
    tag: 'noorhub-notification'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'NoorHub',
        body: data.body || data.message || 'New notification from NoorHub',
        icon: data.icon || '/NQ-ICON.png',
        badge: data.badge || '/NQ-ICON.png',
        tag: data.tag || 'noorhub-notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: data.data || {}
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: [200, 100, 200],
    actions: notificationData.actions,
    data: {
      ...notificationData.data,
      dateOfArrival: Date.now(),
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  let targetUrl = '/';

  // Handle different notification types
  if (notificationData) {
    if (notificationData.type === 'message') {
      targetUrl = '/workspace';
    } else if (notificationData.type === 'task') {
      targetUrl = '/dashboard';
    } else if (notificationData.url) {
      targetUrl = notificationData.url;
    }
  }

  // Handle action clicks
  if (event.action) {
    if (event.action === 'reply') {
      targetUrl = '/workspace';
    } else if (event.action === 'view') {
      targetUrl = notificationData.type === 'message' ? '/workspace' : '/dashboard';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: notificationData
          });
          return;
        }
      }
      // If no window is open, open a new one
      return clients.openWindow(targetUrl);
    })
  );
}); 