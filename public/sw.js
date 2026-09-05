// Cache only public assets. Navigations always use the network so
// security fixes and service-status changes cannot be pinned by an old cache.
const workerPath = new URL(self.location.href).pathname
const BASE_PATH = workerPath.endsWith('/sw.js') ? workerPath.slice(0, -'/sw.js'.length) : ''
const withBasePath = (pathname) => `${BASE_PATH}${pathname}`
const CACHE_SCOPE = BASE_PATH || 'root'
const CACHE_NAME = `drava-public-v4-${CACHE_SCOPE}`
const CACHE_PREFIX = 'drava-public-'
const PRECACHE_URLS = [
  withBasePath('/favicon.svg'),
  withBasePath('/favicon-16x16.svg'),
  withBasePath('/favicon-32x32.svg'),
  withBasePath('/apple-touch-icon.png'),
  withBasePath('/images/drava-icon-192.png'),
  withBasePath('/images/drava-icon-512.png'),
  withBasePath('/images/drava-icon-maskable-512.png'),
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
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX)
            && cacheName.endsWith(`-${CACHE_SCOPE}`)
            && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET' || request.headers.has('authorization')) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request))
    return
  }

  // Query strings and no-store requests can carry sensitive or changing data.
  // They must never enter the static-asset cache, even on an allowlisted path.
  if (url.search || request.cache === 'no-store') return

  const isPrecached = PRECACHE_URLS.includes(url.pathname)
  const isHashedNextAsset = url.pathname.startsWith(withBasePath('/_next/static/'))
  if (!isPrecached && !isHashedNextAsset) return

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse

      const networkResponse = await fetch(request)
      const cacheControl = networkResponse.headers.get('cache-control') || ''
      if (networkResponse.ok && networkResponse.type === 'basic'
        && !/no-store|private/i.test(cacheControl)) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }),
  )
})
