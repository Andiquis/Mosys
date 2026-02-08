/**
 * Mosys - Sistema de Dinero Personal
 * Service Worker para funcionalidad offline
 */

const CACHE_NAME = 'mosys-v1.0.0'
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/movimientos.js',
  '/js/deudas.js',
  '/js/reportes.js',
  '/manifest.json',
  // CDN assets que se cachearán dinámicamente
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm',
]

// Estrategias de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
}

/**
 * Evento de instalación del Service Worker
 */
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando...')

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Cacheando archivos principales...')
        return cache.addAll(CACHE_ASSETS)
      })
      .then(() => {
        console.log('✅ Service Worker: Instalación completa')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('❌ Service Worker: Error en instalación:', error)
      })
  )
})

/**
 * Evento de activación del Service Worker
 */
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activando...')

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker: Activado correctamente')
        return self.clients.claim()
      })
  )
})

/**
 * Evento de interceptación de solicitudes (fetch)
 */
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar requests HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Determinar estrategia de cache según el tipo de recurso
  let strategy

  if (isAppShell(request)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST
  } else if (isAPIRequest(request)) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST
  } else if (isCDNResource(request)) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE
  } else {
    strategy = CACHE_STRATEGIES.CACHE_FIRST
  }

  event.respondWith(handleRequest(request, strategy))
})

/**
 * Maneja las solicitudes según la estrategia de cache
 */
async function handleRequest(request, strategy) {
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request)
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request)
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request)
      default:
        return await cacheFirst(request)
    }
  } catch (error) {
    console.error('❌ Service Worker: Error al manejar request:', error)
    return await fallbackResponse(request)
  }
}

/**
 * Estrategia Cache First
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    return await fallbackResponse(request)
  }
}

/**
 * Estrategia Network First
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    return await fallbackResponse(request)
  }
}

/**
 * Estrategia Stale While Revalidate
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  // Revalidar en background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.status === 200) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(error => {
      console.warn('Service Worker: Error al revalidar:', error)
    })

  // Retornar cache inmediatamente si existe, sino esperar la red
  return cachedResponse || fetchPromise
}

/**
 * Respuesta de fallback cuando todo falla
 */
async function fallbackResponse(request) {
  const url = new URL(request.url)

  // Fallback para páginas HTML
  if (request.destination === 'document') {
    const cache = await caches.open(CACHE_NAME)
    return (
      (await cache.match('/index.html')) ||
      new Response(
        '<!DOCTYPE html><html><head><title>Mosys - Offline</title></head><body><h1>Mosys</h1><p>Aplicación no disponible offline</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    )
  }

  // Fallback para imágenes
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    )
  }

  // Fallback genérico
  return new Response('Resource not available offline', {
    status: 503,
    statusText: 'Service Unavailable',
  })
}

/**
 * Determina si es un recurso del app shell
 */
function isAppShell(request) {
  const appShellUrls = ['/', '/index.html', '/css/', '/js/']
  return appShellUrls.some(url => request.url.includes(url))
}

/**
 * Determina si es una solicitud de API
 */
function isAPIRequest(request) {
  return request.url.includes('/api/') || request.method !== 'GET'
}

/**
 * Determina si es un recurso de CDN
 */
function isCDNResource(request) {
  const cdnDomains = [
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ]

  return cdnDomains.some(domain => request.url.includes(domain))
}

/**
 * Evento de sincronización en background
 */
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Evento de sincronización:', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

/**
 * Sincronización en background
 */
async function doBackgroundSync() {
  try {
    console.log('🔄 Service Worker: Ejecutando sincronización en background...')

    // Aquí se pueden sincronizar datos cuando se recupere la conexión
    // Por ejemplo: enviar datos pendientes a un servidor

    // Notificar a los clientes sobre la sincronización
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        timestamp: Date.now(),
      })
    })

    console.log('✅ Service Worker: Sincronización completada')
  } catch (error) {
    console.error('❌ Service Worker: Error en sincronización:', error)
  }
}

/**
 * Evento de notificación push
 */
self.addEventListener('push', event => {
  console.log('🔔 Service Worker: Notificación push recibida')

  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Mosys',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-96.png',
    tag: 'mosys-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir Mosys',
        icon: '/assets/icon-96.png',
      },
      {
        action: 'dismiss',
        title: 'Cerrar',
        icon: '/assets/icon-96.png',
      },
    ],
  }

  event.waitUntil(self.registration.showNotification('Mosys', options))
})

/**
 * Evento de click en notificación
 */
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Click en notificación')

  event.notification.close()

  if (event.action === 'open') {
    event.waitUntil(self.clients.openWindow('/'))
  }
})

/**
 * Evento de mensaje desde el cliente
 */
self.addEventListener('message', event => {
  console.log('💬 Service Worker: Mensaje recibido:', event.data)

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION_RESPONSE',
        version: CACHE_NAME,
      })
      break

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches
          .delete(CACHE_NAME)
          .then(() => {
            event.ports[0].postMessage({
              type: 'CACHE_CLEARED',
              success: true,
            })
          })
          .catch(error => {
            event.ports[0].postMessage({
              type: 'CACHE_CLEARED',
              success: false,
              error: error.message,
            })
          })
      )
      break
  }
})

/**
 * Evento de error
 */
self.addEventListener('error', event => {
  console.error('❌ Service Worker: Error general:', event.error)
})

/**
 * Evento de error no manejado
 */
self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker: Promise rechazada:', event.reason)
})

console.log('🚀 Service Worker: Cargado correctamente')
