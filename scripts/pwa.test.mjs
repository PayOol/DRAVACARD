import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const registrationSource = await readFile(new URL('../public/register-sw.js', import.meta.url), 'utf8')
const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')

function registrationHarness(readyState, basePath = '') {
  const registrations = []
  const listeners = new Map()
  let updates = 0
  vm.runInNewContext(registrationSource, {
    URL,
    console,
    document: { readyState, currentScript: { src: `https://example.com${basePath}/register-sw.js` } },
    window: { addEventListener: (event, callback, options) => listeners.set(event, { callback, options }) },
    navigator: {
      serviceWorker: {
        register(url, options) {
          registrations.push({ url: url.href, ...options })
          return Promise.resolve({ update: () => { updates += 1 } })
        },
      },
    },
  })
  return { registrations, listeners, updates: () => updates }
}

test('a lazily loaded registration script registers even after the load event', async () => {
  for (const basePath of ['', '/drava', '/sites/drava']) {
    const harness = registrationHarness('complete', basePath)
    await Promise.resolve()
    assert.deepEqual(harness.registrations, [{
      url: `https://example.com${basePath}/sw.js`,
      scope: `${basePath}/`,
      updateViaCache: 'none',
    }])
    assert.equal(harness.listeners.size, 0)
    assert.equal(harness.updates(), 1)
  }
})

test('an early registration script waits for load once', () => {
  const harness = registrationHarness('interactive')
  assert.equal(harness.registrations.length, 0)
  assert.equal(harness.listeners.get('load').options.once, true)
  harness.listeners.get('load').callback()
  assert.equal(harness.registrations.length, 1)
})

function workerHarness(basePath = '', responseCacheControl = 'public, max-age=31536000') {
  const listeners = new Map()
  const cacheWrites = []
  const requests = []
  const precached = []
  const deleted = []
  const response = {
    ok: true,
    type: 'basic',
    headers: new Headers({ 'cache-control': responseCacheControl }),
    clone() { return this },
  }
  vm.runInNewContext(workerSource, {
    URL,
    self: {
      location: new URL(`https://example.com${basePath}/sw.js`),
      addEventListener: (event, callback) => listeners.set(event, callback),
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      async open() {
        return {
          async addAll(urls) { precached.push(...urls) },
          async put(request) { cacheWrites.push(request.url) },
        }
      },
      async match() { return undefined },
      async keys() { return ['drava-public-v3-root', 'drava-public-v3-/drava', 'unrelated'] },
      async delete(name) { deleted.push(name) },
    },
    async fetch(request) { requests.push(request.url); return response },
  })
  return {
    cacheWrites, requests, precached, deleted,
    async lifecycle(event) {
      let work
      listeners.get(event)({ waitUntil: (promise) => { work = promise } })
      await work
    },
    async request(pathname, overrides = {}) {
      let work
      listeners.get('fetch')({
        request: {
          url: pathname.startsWith('https:') ? pathname : `https://example.com${basePath}${pathname}`,
          method: 'GET', mode: 'cors', cache: 'default', headers: new Headers(),
          ...overrides,
        },
        respondWith: (promise) => { work = promise },
      })
      await work
      return work !== undefined
    },
  }
}

test('the worker never caches payment, navigation, authenticated or dynamic requests', async () => {
  for (const basePath of ['', '/drava']) {
    const harness = workerHarness(basePath)
    for (const path of ['/api/orders/example', '/api/location', '/payment-success/', '/payment-failure/', '/manifest.json']) {
      assert.equal(await harness.request(path), false)
    }
    assert.equal(await harness.request('https://payments.example.com/api/orders/example'), false)
    assert.equal(await harness.request('/images/drava-icon-192.png?order=example'), false)
    assert.equal(await harness.request('/images/drava-icon-192.png', { method: 'POST' }), false)
    assert.equal(await harness.request('/images/drava-icon-192.png', { cache: 'no-store' }), false)
    assert.equal(await harness.request('/images/drava-icon-192.png', { headers: new Headers({ authorization: 'Bearer example' }) }), false)
    assert.equal(await harness.request('/payment-success/', { mode: 'navigate' }), true)
    assert.deepEqual(harness.cacheWrites, [])
    assert.deepEqual(harness.requests, [`https://example.com${basePath}/payment-success/`])
  }
})

test('the worker caches only allowlisted public assets and respects response cache policy', async () => {
  const harness = workerHarness('/drava')
  assert.equal(await harness.request('/images/drava-icon-192.png'), true)
  assert.equal(await harness.request('/_next/static/chunks/example.js'), true)
  assert.equal(harness.cacheWrites.length, 2)
  for (const policy of ['no-store', 'private, max-age=0']) {
    const privateHarness = workerHarness('/drava', policy)
    await privateHarness.request('/_next/static/chunks/example.js')
    assert.deepEqual(privateHarness.cacheWrites, [])
  }
})

test('installation respects the base path and activation preserves other deployments', async () => {
  const harness = workerHarness('/drava')
  await harness.lifecycle('install')
  assert.ok(harness.precached.length > 0)
  assert.ok(harness.precached.every((url) => url.startsWith('/drava/')))
  assert.ok(harness.precached.includes('/drava/apple-touch-icon.png'))
  assert.ok(!harness.precached.includes('/drava/manifest.json'))
  await harness.lifecycle('activate')
  assert.deepEqual(harness.deleted, ['drava-public-v3-/drava'])
})

test('install icons exist as correctly sized PNGs and remain inside any deployment base path', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'))
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'))
  for (const path of [manifest.id, manifest.start_url, manifest.scope, ...manifest.icons.map((icon) => icon.src)]) {
    assert.ok(new URL(path, 'https://example.com/sites/drava/manifest.json').pathname.startsWith('/sites/drava/'))
  }
  for (const icon of [...manifest.icons, { src: 'apple-touch-icon.png', sizes: '180x180' }]) {
    const contents = await readFile(new URL(`../public/${icon.src}`, import.meta.url))
    assert.equal(contents.subarray(1, 4).toString(), 'PNG')
    const [width, height] = icon.sizes.split('x').map(Number)
    assert.equal(contents.readUInt32BE(16), width)
    assert.equal(contents.readUInt32BE(20), height)
  }
})
