// App version and cache configuration
const APP_VERSION = '1.0.1749490871392'; // Update this version when deploying new changes
const CACHE_NAME = `noorhub-v${APP_VERSION}`;
const CACHE_VERSION_KEY = 'noorhub-cache-version';

// Static assets to cache
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/NQ-ICON.png',
  '/manifest.json',
  '/notification-sound.mp3'
];

// Dynamic cache patterns
const cachePatterns = [
  /\.(?:js|css|html|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/
];

// Install service worker and clear old caches
self.addEventListener('install', event => {
  console.log(`[SW] Installing version ${APP_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Cache new assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching app assets');
        return cache.addAll(urlsToCache);
      }),
      // Store version info
      self.clients.claim(),
      self.skipWaiting() // Force activation of new SW
    ])
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
  console.log(`[SW] Activating version ${APP_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Clear all old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Clear all stored data for fresh start
      clearStorageData(),
      // Take control of all clients
      self.clients.claim(),
      // Notify clients about update
      notifyClientsOfUpdate()
    ])
  );
});

// Clear storage data for fresh app state
async function clearStorageData() {
  try {
    // Clear all localStorage data related to the app (except user preferences)
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CLEAR_STORAGE',
        version: APP_VERSION,
        preserveKeys: ['theme', 'language', 'chatSoundEnabled'] // Keep user preferences
      });
    });
    
    console.log('[SW] Storage data clearing initiated');
  } catch (error) {
    console.error('[SW] Error clearing storage:', error);
  }
}

// Notify all clients about the update
async function notifyClientsOfUpdate() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_UPDATED',
        version: APP_VERSION,
        message: 'App has been updated! Refresh to get the latest version.'
      });
    });
    
    console.log('[SW] Update notification sent to all clients');
  } catch (error) {
    console.error('[SW] Error notifying clients:', error);
  }
}

// Enhanced fetch strategy with cache management
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and chrome-extension requests
  if (url.origin !== self.location.origin || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests differently (always fetch fresh)
  if (url.pathname.includes('/api/') || url.search.includes('supabase')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline response for API calls
        return new Response(JSON.stringify({ 
          error: 'Offline', 
          message: 'You are currently offline' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Handle app assets with cache-first strategy
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        // Fetch fresh version in background for next time
        fetch(request).then(response => {
          if (response.ok && shouldCache(request)) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response.clone());
            });
          }
        }).catch(() => {});
        
        return cachedResponse;
      }
      
      // Fetch from network
      return fetch(request).then(response => {
        // Cache successful responses
        if (response.ok && shouldCache(request)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/') || new Response('Offline');
        }
        throw new Error('Network unavailable');
      });
    })
  );
});

// Determine if request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Cache static assets
  return cachePatterns.some(pattern => pattern.test(url.pathname)) ||
         url.pathname === '/' ||
         request.destination === 'document';
}

// Handle version check requests from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheCleared: true
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  console.log('[SW] Background sync triggered');
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

console.log(`[SW] Service Worker loaded - Version ${APP_VERSION}`); 