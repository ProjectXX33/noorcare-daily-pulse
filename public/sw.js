// App version and cache configuration
const APP_VERSION = '1.7.1'; // Enhanced overtime timer with fire emoji and flexible work system
const CACHE_NAME = `noorhub-v${APP_VERSION}`;
const CACHE_VERSION_KEY = 'noorhub-cache-version';

// Enhanced static assets to cache for better mobile data support
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/NQ-ICON.png',
  '/manifest.json',
  '/notification-sound.mp3',
  // Add essential pages for offline use
  '/dashboard',
  '/check-in',
  '/shifts',
  '/tasks'
];

// Dynamic cache patterns with mobile data optimization
const cachePatterns = [
  /\.(?:js|css|html|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  // Cache essential API responses for offline functionality
  /^.*\/api\/shifts.*/,
  /^.*\/api\/users.*/
];

// Network timeout for mobile data connections
const NETWORK_TIMEOUT = 8000; // 8 seconds for slower mobile connections

// Enhanced fetch with mobile data optimization
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    )
  ]);
}

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
      // Force activation of new SW
      self.skipWaiting()
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
    // Clear all localStorage data related to the app (except user preferences and auth data)
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CLEAR_STORAGE',
        version: APP_VERSION,
        preserveKeys: [
          'theme', 
          'language', 
          'chatSoundEnabled',
          'preferredLanguage',
          'notificationPreferences',
          'chatPreferences'
        ] // Keep user preferences and let AppUpdateManager handle auth preservation
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
    // Fetch version info with release notes
    let versionInfo = null;
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (response.ok) {
        versionInfo = await response.json();
      }
    } catch (error) {
      console.warn('[SW] Could not fetch version info:', error);
    }

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_UPDATED',
        version: APP_VERSION,
        message: 'App has been updated! Refresh to get the latest version.',
        releaseNotes: versionInfo?.releaseNotes || [
          'Fixed critical Service Worker errors causing app startup issues',
          'Improved PWA reliability with proper service worker lifecycle management',
          'Enhanced app update system with better conflict resolution'
        ]
      });
    });
    
    console.log('[SW] Update notification sent to all clients');
  } catch (error) {
    console.error('[SW] Error notifying clients:', error);
  }
}

// Enhanced fetch strategy with mobile data optimization
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and chrome-extension requests
  if (url.origin !== self.location.origin || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests with mobile data optimization
  if (url.pathname.includes('/api/') || url.search.includes('supabase')) {
    event.respondWith(
      // Try cache first for API requests on slow connections
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetchWithTimeout(request, NETWORK_TIMEOUT)
          .then(response => {
            // Cache successful API responses for offline use
            if (response.ok && (url.pathname.includes('/shifts') || url.pathname.includes('/users'))) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response.clone());
              });
            }
            return response;
          })
          .catch(() => {
            // Return cached response if network fails
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response for API calls
            return new Response(JSON.stringify({ 
              error: 'Offline', 
              message: 'You are currently offline. Using cached data if available.' 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });

        // Return cached response immediately if available, then update cache in background
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
  
  // Handle app assets with cache-first strategy optimized for mobile
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached version if available (faster for mobile data)
      if (cachedResponse) {
        // Fetch fresh version in background for next time (with timeout)
        fetchWithTimeout(request, NETWORK_TIMEOUT).then(response => {
          if (response.ok && shouldCache(request)) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response.clone());
            });
          }
        }).catch(() => {
          console.log('[SW] Background update failed for:', request.url);
        });
        
        return cachedResponse;
      }
      
      // Fetch from network with timeout for mobile data
      return fetchWithTimeout(request, NETWORK_TIMEOUT).then(response => {
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
          return caches.match('/') || new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
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