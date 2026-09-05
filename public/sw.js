// This source is intentionally inert until generate-pwa.mjs injects a build manifest.
// No navigation, payment response, RSC payload or customer data is persisted.
const BUILD = /* DRAVA_PWA_BUILD */ null;
const workerPath = new URL(self.location.href).pathname;
const BASE_PATH = workerPath.endsWith('/sw.js') ? workerPath.slice(0, -6) : '';
const withBasePath = (pathname) => `${BASE_PATH}${pathname}`;
const CACHE_PREFIX = `drava-public-v5:${encodeURIComponent(BASE_PATH || '/')}:`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD?.version || 'unbuilt'}`;
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_ASSETS = 128;
const MAX_BUILD_BYTES = 8 * 1024 * 1024;
const OFFLINE_PATH = withBasePath('/offline.html');
const CACHE_PHASE_HEADER = 'X-Drava-Cache-Phase';
const ASSETS = new Map((BUILD?.assets || []).map(([path, digest, size]) => [withBasePath(path), { digest, size }]));
const BLOCKED_HEADERS = ['authorization', 'proxy-authorization', 'cookie', 'x-api-key', 'x-auth-token', 'range', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-url', 'x-nextjs-data'];
const privatePolicy = (headers) => /no-store|private/i.test(headers.get('cache-control') || '') || /(?:^|,)\s*(?:\*|cookie|authorization|rsc|next-router-state-tree)\s*(?:,|$)/i.test(headers.get('vary') || '');
const hex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

function validManifest() {
  return BUILD && /^[a-f0-9]{24}$/.test(BUILD.version) && ASSETS.size > 0 && ASSETS.size <= MAX_ASSETS &&
    ASSETS.has(OFFLINE_PATH) && Array.from(ASSETS.values()).every(({ digest, size }) => /^[a-f0-9]{64}$/.test(digest) && Number.isSafeInteger(size) && size > 0 && size <= MAX_ENTRY_BYTES) &&
    Array.from(ASSETS.values()).reduce((total, item) => total + item.size, 0) <= MAX_BUILD_BYTES &&
    BUILD.precache.every((path) => ASSETS.has(withBasePath(path)));
}
const MANIFEST_VALID = validManifest();

async function verifiedResponse(response, path) {
  const asset = ASSETS.get(path);
  if (!asset || !response.ok || response.status !== 200 || response.type !== 'basic' || response.redirected || privatePolicy(response.headers)) return null;
  if (response.url && new URL(response.url).href !== new URL(path, self.location.origin).href) return null;
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_ENTRY_BYTES)) return null;
  const copy = response.clone();
  const reader = copy.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > asset.size || size > MAX_ENTRY_BYTES) return null;
      chunks.push(part.value);
    }
  } finally {
    // Do not await cancellation of a tee while its browser-facing branch is unread.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (size !== asset.size) return null;
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))) !== asset.digest) return null;
  // Persist the known public bytes only, never echoed user headers, cookies or
  // request metadata. MIME comes from the build asset's extension.
  const mediaTypes = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', woff: 'font/woff', woff2: 'font/woff2' };
  const headers = new Headers({ 'Content-Type': mediaTypes[path.split('.').at(-1)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  return new Response(bytes, { status: 200, headers });
}

async function storePublicResponse(cache, request, response, initialPhase = 'active') {
  try {
    const pathname = new URL(request.url).pathname;
    const checked = await verifiedResponse(response, pathname);
    if (!checked) return false;
    const key = new Request(request.url, { credentials: 'omit', referrer: '', referrerPolicy: 'no-referrer' });
    if (pathname === OFFLINE_PATH) {
      // Only local lifecycle state can set this header. Never accept an upstream
      // phase or reset an activated cache when its public bytes are refreshed.
      const savedPhase = (await cache.match(key))?.headers.get(CACHE_PHASE_HEADER);
      checked.headers.set(CACHE_PHASE_HEADER, ['waiting', 'active', 'previous'].includes(savedPhase) ? savedPhase : initialPhase);
    }
    await cache.put(key, checked);
    // The manifest is the entry/byte bound. Remove any foreign entry in our cache.
    for (const key of await cache.keys()) if (!ASSETS.has(new URL(key.url).pathname) || new URL(key.url).search) await cache.delete(key);
    return true;
  } catch { return false; }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    if (!MANIFEST_VALID) throw new Error('Production PWA manifest required');
    const cache = await caches.open(CACHE_NAME);
    const pending = [...BUILD.precache];
    let failed = false;
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (pending.length && !failed) {
        const path = pending.shift();
        const request = new Request(new URL(withBasePath(path), self.location.origin), { credentials: 'omit', cache: path.startsWith('/_next/static/') ? 'force-cache' : 'reload', redirect: 'error' });
        try {
          if (!await storePublicResponse(cache, request, await fetch(request), 'waiting')) failed = true;
        } catch { failed = true; }
      }
    }));
    if (failed) { await caches.delete(CACHE_NAME); throw new Error('Public PWA assets unavailable'); }
    // An updated worker waits until all clients acknowledge coordinated activation.
  })());
});

async function previousCache() {
  const keys = await caches.keys();
  let previous;
  for (const key of keys.reverse()) {
    if (!key.startsWith(CACHE_PREFIX) || key === CACHE_NAME) continue;
    const phase = await cachePhase(key);
    // Historical v5 caches have no phase. Keep treating them as activated,
    // whereas an installed but superseded waiting version is never a fallback.
    if (phase === 'active' || phase === null) return key;
    if (phase === 'previous' && previous === undefined) previous = key;
  }
  return previous;
}

async function cachePhase(name) {
  const offline = await (await caches.open(name)).match(OFFLINE_PATH);
  // A cache is visible as soon as install opens it, before its first write.
  // Such incomplete installs must never displace an actually activated version.
  return offline ? offline.headers.get(CACHE_PHASE_HEADER) : 'waiting';
}

async function markCachePhase(name, phase) {
  const cache = await caches.open(name);
  const offline = await cache.match(OFFLINE_PATH);
  if (!offline) {
    if (name === CACHE_NAME) throw new Error('Public offline asset unavailable');
    return;
  }
  const headers = new Headers(offline.headers);
  headers.set(CACHE_PHASE_HEADER, phase);
  const key = new Request(new URL(OFFLINE_PATH, self.location.origin), { credentials: 'omit', referrer: '', referrerPolicy: 'no-referrer' });
  await cache.put(key, new Response(offline.body, { status: 200, headers }));
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const previous = await previousCache();
    await markCachePhase(CACHE_NAME, 'active');
    if (previous) await markCachePhase(previous, 'previous');
    const names = await caches.keys();
    for (const [index, name] of names.entries()) {
      const ownVersion = name.startsWith(CACHE_PREFIX);
      const oldFormat = /^drava-public-v[1-4]-(.*)$/.exec(name)?.[1] === (BASE_PATH || 'root');
      // A newer installation may overlap activation. Its waiting cache is still
      // needed; only older superseded waiting versions can be discarded here.
      if (ownVersion && index > names.indexOf(CACHE_NAME) && await cachePhase(name) === 'waiting') continue;
      if (oldFormat || (ownVersion && name !== CACHE_NAME && name !== previous)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

function excludedRequest(request, url) {
  const publicFragment = url.hash === '#tiktok' || /^#card:[a-z0-9-]+$/.test(url.hash);
  const privateFragment = url.hash && (request.mode !== 'navigate' || !publicFragment);
  return request.method !== 'GET' || url.origin !== self.location.origin || url.search || privateFragment || request.cache === 'no-store' ||
    BLOCKED_HEADERS.some((name) => request.headers.has(name)) || /text\/x-component/i.test(request.headers.get('accept') || '') ||
    /no-store|private/i.test(request.headers.get('cache-control') || '');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!MANIFEST_VALID || excludedRequest(request, url)) return;
  // Only the public home can show a dedicated offline document. Never cache HTML
  // navigations or substitute an offline page for a receipt, API or private route.
  if (request.mode === 'navigate') {
    if (url.pathname !== withBasePath('/') && url.pathname !== withBasePath('/index.html')) return;
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(OFFLINE_PATH) || Response.error();
    }));
    return;
  }
  const listed = ASSETS.has(url.pathname);
  const immutablePath = url.pathname.startsWith(withBasePath('/_next/static/')) && /\.(?:js|css|woff2?)$/.test(url.pathname);
  if (!listed && !immutablePath) return;
  let cacheWrite = Promise.resolve();
  const responsePromise = (async () => {
    let cache;
    try { cache = await caches.open(CACHE_NAME); } catch { return fetch(request); }
    const forceNetwork = request.cache === 'reload' || request.cache === 'no-cache';
    if (!forceNetwork) {
      const cached = listed ? await cache.match(request) : null;
      if (cached) return cached;
      if (immutablePath) {
        const previous = await previousCache();
        const old = previous ? await (await caches.open(previous)).match(request) : null;
        if (old) return old;
      }
    }
    const response = await fetch(request);
    // Do not delay the browser's response behind reading, hashing or writing its
    // clone. waitUntil keeps that bounded background write alive independently.
    if (listed) cacheWrite = storePublicResponse(cache, request, response);
    return response;
  })();
  event.respondWith(responsePromise);
  event.waitUntil(responsePromise.then(() => cacheWrite).catch(() => undefined));
});

function scopedClient(client) {
  try {
    const url = new URL(client.url);
    return url.origin === self.location.origin && url.pathname.startsWith(withBasePath('/'));
  } catch { return false; }
}

async function prepareClient(client, automatic) {
  // The worker cannot inspect forms or fragments; every tab must explicitly answer.
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let done = false;
    const finish = (ready) => {
      if (done) return;
      done = true; clearTimeout(timeout); channel.port1.close(); resolve(ready);
    };
    const timeout = setTimeout(() => finish(false), 2000);
    channel.port1.onmessage = (event) => finish(event.data?.ready === true && (!automatic || event.data?.automaticReload === true));
    try { client.postMessage({ type: 'DRAVA_PWA_PREPARE', ...(automatic ? { automatic: true } : {}) }, [channel.port2]); }
    catch { finish(false); }
  });
}

let applying = false;
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'DRAVA_PWA_APPLY_UPDATE' || !event.ports?.[0] || !event.source?.id || !scopedClient(event.source)) return;
  event.waitUntil((async () => {
    const port = event.ports[0];
    if (applying) { port.postMessage({ ok: false }); return; }
    applying = true;
    let clients = [];
    let success = false;
    try {
      clients = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(scopedClient);
      if (!clients.some((client) => client.id === event.source.id)) return;
      const automatic = event.data.automatic === true;
      const ready = await Promise.all(clients.map((client) => prepareClient(client, automatic)));
      // Recheck the set so a newly opened or changed tab cannot be silently skipped.
      const current = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(scopedClient);
      if (!ready.every(Boolean) || current.length !== clients.length || current.some((client) => !clients.some((old) => old.id === client.id && old.url === client.url))) return;
      await self.skipWaiting();
      success = true;
    } finally {
      port.postMessage({ ok: success });
      if (!success) for (const client of clients) client.postMessage({ type: 'DRAVA_PWA_RELEASE' });
      applying = false;
    }
  })());
});
