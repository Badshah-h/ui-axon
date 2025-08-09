// Service Worker for AxonStreamAI
// Provides offline support, caching, and background sync

const CACHE_NAME = 'axonstream-v1';
const STATIC_CACHE_NAME = 'axonstream-static-v1';
const DYNAMIC_CACHE_NAME = 'axonstream-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  // Add other static assets
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/workflows',
  '/api/agents',
  '/api/tools',
  '/api/templates',
];

// Maximum cache size (number of items)
const MAX_CACHE_SIZE = 100;

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,    // 1 day
  API: 5 * 60 * 1000,              // 5 minutes
};

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('axonstream-')) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

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
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle API requests with cache-first strategy for GET requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_APIs.some(api => url.pathname.startsWith(api));
  
  if (!isCacheable) {
    // For non-cacheable APIs, try network first
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      console.error('Service Worker: API request failed', error);
      return new Response(
        JSON.stringify({ error: 'Network error', offline: true }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  try {
    // Try cache first for cacheable APIs
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date'));
      const isExpired = Date.now() - cacheDate.getTime() > CACHE_DURATION.API;
      
      if (!isExpired) {
        console.log('Service Worker: Serving from cache', request.url);
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response for caching
      const responseClone = response.clone();
      
      // Add cache metadata
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      // Cache the response
      cache.put(request, cachedResponse);
      
      // Limit cache size
      limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_SIZE);
    }
    
    return response;
    
  } catch (error) {
    console.error('Service Worker: API request failed', error);
    
    // Try to serve from cache as fallback
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving stale cache due to network error', request.url);
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Service unavailable', 
        offline: true,
        message: 'This feature requires an internet connection'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.error('Service Worker: Static asset request failed', error);
    
    // Try cache as fallback
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response(
        '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle dynamic requests (pages, etc.) with network-first strategy
async function handleDynamicRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
      limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_SIZE);
    }
    
    return response;
    
  } catch (error) {
    console.error('Service Worker: Dynamic request failed', error);
    
    // Try cache as fallback
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response(
        getOfflineHTML(),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    return new Response('Page not available offline', { status: 503 });
  }
}

// Utility functions
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname === '/manifest.json' ||
         pathname.startsWith('/_next/static/');
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Remove oldest entries
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AxonStreamAI - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        p {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        .retry-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }
        .features {
          margin-top: 2rem;
          text-align: left;
        }
        .feature {
          margin: 0.5rem 0;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🌐</div>
        <h1>You're Offline</h1>
        <p>AxonStreamAI needs an internet connection to work properly. Some features may be limited while offline.</p>
        
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
        
        <div class="features">
          <h3>Available Offline:</h3>
          <div class="feature">• View cached workflows</div>
          <div class="feature">• Browse saved templates</div>
          <div class="feature">• Access documentation</div>
        </div>
      </div>
      
      <script>
        // Auto-retry when online
        window.addEventListener('online', () => {
          window.location.reload();
        });
        
        // Show online status
        function updateStatus() {
          if (navigator.onLine) {
            window.location.reload();
          }
        }
        
        setInterval(updateStatus, 5000);
      </script>
    </body>
    </html>
  `;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'workflow-sync') {
    event.waitUntil(syncWorkflows());
  } else if (event.tag === 'error-sync') {
    event.waitUntil(syncErrors());
  }
});

async function syncWorkflows() {
  try {
    // Get pending workflows from IndexedDB
    const pendingWorkflows = await getPendingWorkflows();
    
    for (const workflow of pendingWorkflows) {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow.data)
        });
        
        if (response.ok) {
          await removePendingWorkflow(workflow.id);
          console.log('Service Worker: Synced workflow', workflow.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync workflow', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

async function syncErrors() {
  try {
    // Get pending error reports from IndexedDB
    const pendingErrors = await getPendingErrors();
    
    for (const error of pendingErrors) {
      try {
        const response = await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error.data)
        });
        
        if (response.ok) {
          await removePendingError(error.id);
          console.log('Service Worker: Synced error report', error.id);
        }
      } catch (syncError) {
        console.error('Service Worker: Failed to sync error', syncError);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error sync failed', error);
  }
}

// IndexedDB helpers (simplified - in production, use a proper IndexedDB wrapper)
async function getPendingWorkflows() {
  // Implementation would use IndexedDB to get pending workflows
  return [];
}

async function removePendingWorkflow(id) {
  // Implementation would remove workflow from IndexedDB
}

async function getPendingErrors() {
  // Implementation would use IndexedDB to get pending errors
  return [];
}

async function removePendingError(id) {
  // Implementation would remove error from IndexedDB
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have new workflow updates',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Workflows',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('AxonStreamAI', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/workflows')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker: Loaded successfully');