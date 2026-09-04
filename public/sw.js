// Cache only versioned public assets. Navigations always prefer the network so
// security fixes and service-status changes cannot be pinned by an old cache.
const workerPath = new URL(self.location.href).pathname
const BASE_PATH = workerPath.endsWith('/sw.js') ? workerPath.slice(0, -'/sw.js'.length) : ''
const withBasePath = (pathname) => `${BASE_PATH}${pathname}`
const CACHE_NAME = `drava-public-v3-${BASE_PATH || 'root'}`
const CACHE_PREFIX = 'drava-'
const PRECACHE_URLS = [
  withBasePath('/manifest.json'),
  withBasePath('/favicon.svg'),
  withBasePath('/favicon-16x16.svg'),
  withBasePath('/favicon-32x32.svg'),
  withBasePath('/apple-touch-icon.svg'),
  withBasePath('/images/drava-icon-192.svg'),
  withBasePath('/images/drava-icon-512.svg'),
  withBasePath('/images/drava-logo.svg'),
  withBasePath('/images/card-generic.svg'),
  withBasePath('/images/mastercard.svg'),
  withBasePath('/images/visa.svg'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request))
    return
  }

  const isPrecached = PRECACHE_URLS.includes(url.pathname)
  const isHashedNextAsset = url.pathname.startsWith(withBasePath('/_next/static/'))
  if (!isPrecached && !isHashedNextAsset) return

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse

      const networkResponse = await fetch(request)
      if (networkResponse.ok && networkResponse.type === 'basic') {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }),
  )
})
