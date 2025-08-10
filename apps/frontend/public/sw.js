// Production-grade Service Worker for AxonStreamAI
// Implements caching strategies, offline support, and performance optimization

const CACHE_NAME = 'axonstream-v1.0.0';
const STATIC_CACHE = 'axonstream-static-v1.0.0';
const DYNAMIC_CACHE = 'axonstream-dynamic-v1.0.0';
const API_CACHE = 'axonstream-api-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
  // Add critical images
  '/images/logo.svg',
  '/images/icons/',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/workflows',
  '/api/nodes',
  '/api/user/profile',
  '/api/organizations',
];

// Resources that should never be cached
const NEVER_CACHE = [
  '/api/auth/',
  '/api/admin/',
  '/api/security/',
  '/api/monitoring/',
];

// Cache duration settings (in seconds)
const CACHE_DURATIONS = {
  STATIC: 31536000, // 1 year
  DYNAMIC: 86400,   // 1 day
  API: 3600,        // 1 hour
  IMAGES: 604800,   // 1 week
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle static assets (CSS, JS, fonts) - Cache First
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache is still valid
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      const ageInSeconds = (now - cacheDate) / 1000;
      
      if (ageInSeconds < CACHE_DURATIONS.STATIC) {
        return cachedResponse;
      }
    }
    
    // Fetch from network and update cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static asset fetch failed:', error);
    
    // Return cached version if available
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle API requests - Network First with cache fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Never cache sensitive endpoints
  if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) {
    return fetch(request);
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request, {
      headers: {
        ...request.headers,
        'Cache-Control': 'no-cache',
      },
    });
    
    if (networkResponse.ok && CACHEABLE_APIS.some(path => url.pathname.startsWith(path))) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      const responseClone = networkResponse.clone();
      
      // Add timestamp header for cache validation
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-at', new Date().toISOString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers,
      });
      
      await cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: API request failed:', error);
    
    // Try to return cached version
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check cache age
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt) {
        const cacheAge = (new Date() - new Date(cachedAt)) / 1000;
        if (cacheAge < CACHE_DURATIONS.API) {
          // Add header to indicate this is from cache
          const headers = new Headers(cachedResponse.headers);
          headers.set('x-served-by', 'service-worker-cache');
          
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers,
          });
        }
      }
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'This request requires an internet connection',
        offline: true,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'x-served-by': 'service-worker-offline',
        },
      }
    );
  }
}

// Handle image requests - Stale While Revalidate
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      // Revalidate in background
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      }).catch(() => {
        // Ignore network errors during background revalidation
      });
      
      return cachedResponse;
    }
    
    // No cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Image request failed:', error);
    
    // Return placeholder image
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Image unavailable</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'x-served-by': 'service-worker-fallback',
        },
      }
    );
  }
}

// Handle navigation requests - Network First with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Navigation request failed:', error);
    
    // Try cached version
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AxonStreamAI - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html',
          'x-served-by': 'service-worker-offline',
        },
      }
    );
  }
}

// Handle other dynamic requests - Network First
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Dynamic request failed:', error);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Content not available offline', { status: 503 });
  }
}

// Utility functions
function isStaticAsset(url) {
  return (
    url.pathname.includes('/_next/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  );
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  return (
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.includes('/images/')
  );
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'workflow-sync') {
    event.waitUntil(syncWorkflows());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

// Sync workflows when back online
async function syncWorkflows() {
  try {
    // Get pending workflows from IndexedDB
    const pendingWorkflows = await getPendingWorkflows();
    
    for (const workflow of pendingWorkflows) {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });
        
        if (response.ok) {
          await removePendingWorkflow(workflow.id);
          console.log('Service Worker: Synced workflow:', workflow.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync workflow:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Workflow sync failed:', error);
  }
}

// Sync analytics when back online
async function syncAnalytics() {
  try {
    // Get pending analytics from IndexedDB
    const pendingAnalytics = await getPendingAnalytics();
    
    if (pendingAnalytics.length > 0) {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: pendingAnalytics }),
      });
      
      if (response.ok) {
        await clearPendingAnalytics();
        console.log('Service Worker: Synced analytics events:', pendingAnalytics.length);
      }
    }
  } catch (error) {
    console.error('Service Worker: Analytics sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/';
  
  if (data && data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
        
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
        
      case 'CACHE_URLS':
        cacheUrls(event.data.urls).then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
    }
  }
});

// Utility functions for IndexedDB operations
async function getPendingWorkflows() {
  // Implementation would use IndexedDB to store/retrieve pending workflows
  return [];
}

async function removePendingWorkflow(id) {
  // Implementation would remove workflow from IndexedDB
}

async function getPendingAnalytics() {
  // Implementation would use IndexedDB to store/retrieve pending analytics
  return [];
}

async function clearPendingAnalytics() {
  // Implementation would clear analytics from IndexedDB
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
}

console.log('Service Worker: Loaded successfully');