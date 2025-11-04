/**
 * Service Worker avancé pour JobbingTrack
 * Support PWA complet avec cache intelligent et synchronisation offline
 */

const CACHE_NAME = 'jobbingtrack-v4.1.0';
const STATIC_CACHE_NAME = 'jobbingtrack-static-v4.1.0';
const DYNAMIC_CACHE_NAME = 'jobbingtrack-dynamic-v4.1.0';

// Ressources à mettre en cache statique
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
  '/favicon.svg'
];

// Ressources à mettre en cache dynamiquement
const API_CACHE_PATTERNS = [
  /\/api\/v1\/applications/,
  /\/api\/v1\/companies/,
  /\/api\/v1\/contacts/,
  /\/api\/v1\/interviews/,
  /\/api\/v1\/events/,
  /\/api\/v1\/notifications/
];

// Durées de cache par type de ressource
const CACHE_STRATEGIES = {
  static: {
    maxAge: 60 * 60 * 24 * 365, // 1 an
    maxEntries: 100
  },
  api: {
    maxAge: 60 * 60 * 24, // 24h
    maxEntries: 500
  },
  images: {
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    maxEntries: 200
  },
  fonts: {
    maxAge: 60 * 60 * 24 * 365, // 1 an
    maxEntries: 50
  }
};

// Install event - cache des ressources statiques
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('jobbingtrack-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - gestion intelligente du cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Stratégie pour les requêtes API
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Stratégie pour les ressources statiques
  if (STATIC_ASSETS.includes(url.pathname) ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Stratégie par défaut
  event.respondWith(handleDefaultRequest(request));
});

// Gestion des requêtes API avec cache intelligent
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);

  try {
    // Essayer d'abord le réseau
    const networkResponse = await fetch(request);

    // Si succès, mettre en cache et retourner
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    // Si échec réseau, essayer le cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache (API):', request.url);
      return cachedResponse;
    }

    // Si pas de cache, retourner erreur avec fallback offline
    return createOfflineResponse(request);

  } catch (error) {
    console.log('[SW] Network failed, trying cache (API):', request.url);

    // Réseau indisponible, utiliser le cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback offline pour les API
    return createOfflineResponse(request);
  }
}

// Gestion des ressources statiques
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Essayer le cache d'abord pour les ressources statiques
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Si pas en cache, essayer le réseau
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static resource:', request.url);
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Gestion par défaut
async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Retourner la page offline pour les requêtes de navigation
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const offlineResponse = await cache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Créer une réponse offline personnalisée
function createOfflineResponse(request) {
  const url = new URL(request.url);

  // Réponse offline spécifique selon le type d'API
  if (url.pathname.includes('/applications')) {
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Mode hors ligne - données non synchronisées',
      applications: [],
      cached: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname.includes('/contacts')) {
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Mode hors ligne - contacts non synchronisés',
      contacts: [],
      cached: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Réponse générique offline
  return new Response(JSON.stringify({
    success: false,
    offline: true,
    message: 'Service temporairement indisponible',
    cached: false
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          payload: status
        });
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED'
        });
      });
      break;

    case 'UPDATE_CACHE_STRATEGY':
      updateCacheStrategy(payload);
      break;
  }
});

// Obtenir le statut du cache
async function getCacheStatus() {
  try {
    const [staticCache, dynamicCache] = await Promise.all([
      caches.open(STATIC_CACHE_NAME),
      caches.open(DYNAMIC_CACHE_NAME)
    ]);

    const [staticKeys, dynamicKeys] = await Promise.all([
      staticCache.keys(),
      dynamicCache.keys()
    ]);

    return {
      static: {
        count: staticKeys.length,
        size: 'N/A'
      },
      dynamic: {
        count: dynamicKeys.length,
        size: 'N/A'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Vider tous les caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Error clearing caches:', error);
  }
}

// Mettre à jour la stratégie de cache
function updateCacheStrategy(strategy) {
  console.log('[SW] Cache strategy updated:', strategy);
  // Implémentation de la mise à jour de stratégie
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'jobbingtrack-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = '/';

  if (action === 'view-application' && data.applicationId) {
    url = `/applications/${data.applicationId}`;
  } else if (action === 'view-interview' && data.interviewId) {
    url = `/interviews/${data.interviewId}`;
  } else if (action === 'view-contact' && data.contactId) {
    url = `/contacts/${data.contactId}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-applications') {
    event.waitUntil(syncApplications());
  } else if (event.tag === 'sync-contacts') {
    event.waitUntil(syncContacts());
  } else if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

// Synchronisation des candidatures
async function syncApplications() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();

    const applicationRequests = requests.filter(req =>
      req.url.includes('/applications')
    );

    for (const request of applicationRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
          console.log('[SW] Application synced:', request.url);
        }
      } catch (error) {
        console.log('[SW] Failed to sync application:', request.url);
      }
    }
  } catch (error) {
    console.error('[SW] Error during application sync:', error);
  }
}

// Synchronisation des contacts
async function syncContacts() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();

    const contactRequests = requests.filter(req =>
      req.url.includes('/contacts')
    );

    for (const request of contactRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
          console.log('[SW] Contact synced:', request.url);
        }
      } catch (error) {
        console.log('[SW] Failed to sync contact:', request.url);
      }
    }
  } catch (error) {
    console.error('[SW] Error during contact sync:', error);
  }
}

// Synchronisation des événements
async function syncEvents() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();

    const eventRequests = requests.filter(req =>
      req.url.includes('/events')
    );

    for (const request of eventRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
          console.log('[SW] Event synced:', request.url);
        }
      } catch (error) {
        console.log('[SW] Failed to sync event:', request.url);
      }
    }
  } catch (error) {
    console.error('[SW] Error during event sync:', error);
  }
}

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');
