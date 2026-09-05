import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { generatePwa } from './generate-pwa.mjs';

const registrationSource = await readFile(new URL('../public/register-sw.js', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const flush = () => new Promise((resolve) => setImmediate(resolve));

class Events {
  listeners = new Map();
  addEventListener(type, handler, options) {
    const entries = this.listeners.get(type) || [];
    entries.push({ handler, options }); this.listeners.set(type, entries);
  }
  dispatchEvent(event) { for (const { handler } of this.listeners.get(event.type) || []) handler(event); }
}
class TestChannel {
  constructor() {
    const first = { close() {}, postMessage(data) { queueMicrotask(() => second.onmessage?.({ data })); } };
    const second = { close() {}, postMessage(data) { queueMicrotask(() => first.onmessage?.({ data })); } };
    this.port1 = first; this.port2 = second;
  }
}
function trackedTimers(t) {
  const ids = new Set();
  t.after(() => { for (const id of ids) clearTimeout(id); });
  return {
    setTimeout(fn, ms) { const id = setTimeout(fn, Math.min(ms, 50)); ids.add(id); return id; },
    clearTimeout(id) { clearTimeout(id); ids.delete(id); },
  };
}
function registrationHarness(t, { readyState = 'complete', basePath = '', waiting = false, busy = false, enabled = 'true', origin = 'https://example.com', legacy = false, cacheNames = [] } = {}) {
  const window = new Events(); const document = new Events(); const serviceWorker = new Events();
  const state = { marker: busy, dialog: false, editing: false, posts: [], reloads: 0, updates: 0, registrations: [], acknowledge: true, unregisters: 0, lookups: [], cacheNames: [...cacheNames] };
  const attributes = new Map();
  window.isSecureContext = true;
  window.location = { origin, hostname: new URL(origin).hostname, pathname: `${basePath}/`, hash: '', search: '', reload() { state.reloads++; } };
  document.readyState = readyState; document.visibilityState = 'visible';
  document.currentScript = { src: `${origin}${basePath}/register-sw.js`, dataset: { enabled } };
  document.documentElement = { setAttribute: (key, value) => attributes.set(key, value), removeAttribute: (key) => attributes.delete(key) };
  document.querySelector = () => state.marker || state.dialog ? {} : null;
  document.activeElement = { matches: () => state.editing };
  const waitingWorker = { scriptURL: `${origin}${basePath}/sw.js`, postMessage(data, ports) { state.posts.push(data); if (state.acknowledge !== null) ports[0].postMessage({ ok: state.acknowledge }); } };
  const registration = new Events(); registration.waiting = waiting ? waitingWorker : null;
  registration.active = legacy ? waitingWorker : null; registration.scope = `${origin}${basePath}/`;
  registration.unregister = async () => { state.unregisters++; return true; };
  serviceWorker.getRegistration = async (scope) => { state.lookups.push(scope); return registration; };
  registration.update = async () => { state.updates++; };
  serviceWorker.controller = { scriptURL: waitingWorker.scriptURL };
  serviceWorker.register = async (url, options) => { state.registrations.push({ url: url.href, ...options }); return registration; };
  const navigator = { serviceWorker, onLine: true };
  const caches = { async keys() { return state.cacheNames; }, async delete(name) { state.cacheNames = state.cacheNames.filter((item) => item !== name); return true; } };
  vm.runInNewContext(registrationSource, { URL, console, window, document, navigator, caches, CustomEvent, MessageChannel: TestChannel, ...trackedTimers(t) });
  return { state, window, document, serviceWorker, registration, waitingWorker, attributes, api: window.dravaPwa };
}

test('registration works before/after load in root or nested scopes without duplicate update requests', async (t) => {
  const development = registrationHarness(t, { enabled: 'false' });
  assert.equal(development.api, undefined);
  assert.equal(development.state.registrations.length, 0);
  for (const basePath of ['', '/drava', '/sites/drava']) {
    const harness = registrationHarness(t, { basePath }); await flush();
    assert.deepEqual(harness.state.registrations, [{ url: `https://example.com${basePath}/sw.js`, scope: `${basePath}/`, updateViaCache: 'none' }]);
    assert.equal(harness.state.updates, 0);
    await harness.api.checkForUpdate(); assert.equal(harness.state.updates, 1);
  }
  const early = registrationHarness(t, { readyState: 'interactive' });
  assert.equal(early.state.registrations.length, 0);
  assert.equal(early.window.listeners.get('load')[0].options.once, true);
  early.window.dispatchEvent({ type: 'load' }); await flush();
  assert.equal(early.state.registrations.length, 1);
});

test('updates wait for explicit action and only the requesting idle tab reloads', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await flush();
  assert.equal(harness.api.getState().updateAvailable, true); assert.equal(harness.state.posts.length, 0);
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' });
  assert.equal(harness.state.reloads, 0);
  const installed = registrationHarness(t, { waiting: true }); await flush();
  assert.equal(await installed.api.applyUpdate(), true);
  assert.equal(installed.state.posts[0].type, 'DRAVA_PWA_APPLY_UPDATE');
  assert.equal(installed.api.getState().applying, true);
  let prevented = false;
  installed.document.dispatchEvent({ type: 'click', preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, true);
  installed.serviceWorker.dispatchEvent({ type: 'controllerchange' });
  assert.equal(installed.state.reloads, 1);
  installed.serviceWorker.dispatchEvent({ type: 'controllerchange' });
  assert.equal(installed.state.reloads, 1);
  assert.equal(installed.attributes.size, 0);
});

test('development unregisters only its exact local DRAVA worker and deletes only that deployment cache', async (t) => {
  const names = ['drava-public-v4-root', 'drava-public-v4-/other-root', 'drava-public-v5:%2F:old', 'drava-public-v5:%2Fother:old', 'unrelated'];
  const local = registrationHarness(t, { enabled: 'false', origin: 'http://localhost:3000', legacy: true, cacheNames: names });
  await flush();
  assert.equal(local.api, undefined); assert.equal(local.state.unregisters, 1); assert.deepEqual(local.state.lookups, ['/']);
  assert.deepEqual(local.state.cacheNames, ['drava-public-v4-/other-root', 'drava-public-v5:%2Fother:old', 'unrelated']);
  assert.equal(local.state.reloads, 0); assert.equal(local.state.registrations.length, 0);
  const production = registrationHarness(t, { enabled: 'false', legacy: true, cacheNames: names });
  await flush(); assert.equal(production.state.unregisters, 0); assert.deepEqual(production.state.cacheNames, names);
  const foreign = registrationHarness(t, { enabled: 'false', origin: 'http://127.0.0.1:3000', basePath: '/drava', legacy: true, cacheNames: names });
  foreign.registration.active = { scriptURL: 'http://127.0.0.1:3000/another-worker.js' };
  await flush(); assert.equal(foreign.state.unregisters, 0); assert.deepEqual(foreign.state.cacheNames, names);
});

test('checkout selection, dialog, editing, private URLs and absent tab answers block activation without reloading', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await flush();
  for (const field of ['marker', 'dialog', 'editing']) {
    harness.state[field] = true; assert.equal(await harness.api.applyUpdate(), false); harness.state[field] = false;
  }
  for (const pathname of ['/payment-success/', '/payment-failure/', '/tiktok-payment/']) {
    harness.window.location.pathname = pathname; assert.equal(await harness.api.applyUpdate(), false);
  }
  harness.window.location.pathname = '/'; harness.window.location.search = '?order=private';
  assert.equal(await harness.api.applyUpdate(), false);
  harness.window.location.search = ''; harness.window.location.hash = '#order=private';
  assert.equal(await harness.api.applyUpdate(), false);
  harness.window.location.hash = '';
  harness.state.acknowledge = false;
  assert.equal(await harness.api.applyUpdate(), false);
  assert.equal(harness.api.getState().applying, false); assert.equal(harness.api.getState().blocked, true);
  harness.state.acknowledge = null;
  assert.equal(await harness.api.applyUpdate(), false);
  assert.equal(harness.state.reloads, 0); assert.equal(harness.attributes.size, 0);
});

test('coordination messages send only readiness and never form or order data', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await flush();
  const replies = [];
  const probe = () => harness.serviceWorker.dispatchEvent({ type: 'message', source: harness.waitingWorker, data: { type: 'DRAVA_PWA_PREPARE' }, ports: [{ postMessage: (data) => replies.push(data) }] });
  harness.state.marker = true; probe(); assert.equal(replies[0].ready, false);
  harness.state.marker = false; probe(); assert.equal(replies[1].ready, true);
  assert.deepEqual(Object.keys(replies[1]), ['ready']); assert.equal(harness.api.getState().applying, true);
  harness.serviceWorker.dispatchEvent({ type: 'message', source: harness.waitingWorker, data: { type: 'DRAVA_PWA_RELEASE' } });
  assert.equal(harness.api.getState().applying, false);
  harness.window.dispatchEvent({ type: 'offline' }); assert.equal(harness.api.getState().offline, true);
  harness.window.dispatchEvent({ type: 'online' }); assert.equal(harness.api.getState().offline, false);
});

function workerHarness(t, basePath = '', extra = {}) {
  const origin = 'https://example.com';
  const content = new Map([
    ['/offline.html', new TextEncoder().encode('<!doctype html><title>DRAVA offline</title>')],
    ['/images/drava-icon-192.png', new TextEncoder().encode('public test icon')],
    ['/_next/static/chunks/abc123.js', new TextEncoder().encode('public immutable script')],
  ]);
  const config = { version: 'a'.repeat(24), assets: [...content].map(([name, bytes]) => [name, hash(bytes), bytes.length]), precache: ['/offline.html', '/images/drava-icon-192.png'] };
  const listeners = new Map(); const stores = new Map(); const calls = []; const deleted = [];
  const state = { skipWaiting: 0, claimed: 0, failNetwork: false, policy: 'public, max-age=31536000', corrupt: false, status: 200, redirected: false, type: 'basic', clients: [], releaseMessages: [], blockWrites: false, pendingWrites: [], storedRequests: [] };
  const canonical = (request) => new URL(typeof request === 'string' ? request : request.url, `${origin}${basePath}/`).href;
  const cacheStorage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name);
      return { async match(request) { return values.get(canonical(request))?.clone(); }, async put(request, response) { state.onWrite?.(); if (state.blockWrites) await new Promise((resolve) => state.pendingWrites.push(resolve)); state.storedRequests.push(request); values.set(canonical(request), response.clone()); }, async keys() { return [...values.keys()].map((url) => new Request(url)); }, async delete(request) { return values.delete(canonical(request)); } };
    },
    async keys() { return [...stores.keys()]; }, async delete(name) { deleted.push(name); return stores.delete(name); },
    async match() { throw new Error('Cross-deployment global cache lookup forbidden'); },
  };
  const self = {
    location: new URL(`${origin}${basePath}/sw.js`),
    addEventListener: (name, handler) => listeners.set(name, handler),
    async skipWaiting() { state.skipWaiting++; },
    clients: { async claim() { state.claimed++; }, async matchAll() { return typeof state.clients === 'function' ? state.clients() : state.clients; } },
  };
  const fetch = async (request) => {
    calls.push(request.url);
    if (state.failNetwork) throw new TypeError('offline');
    const name = new URL(request.url).pathname.slice(basePath.length);
    const bytes = state.corrupt ? 'different private content' : content.get(name) || 'network only document';
    const response = new Response(bytes, { status: state.status, headers: { 'cache-control': state.policy, ...(state.vary ? { vary: state.vary } : {}), ...(state.responseHeaders || {}) } });
    Object.defineProperties(response, { type: { value: state.type }, redirected: { value: state.redirected }, url: { value: request.url } });
    return response;
  };
  vm.runInNewContext(workerSource.replace('/* DRAVA_PWA_BUILD */ null', JSON.stringify(config)), { URL, Request, Response, Headers, crypto: webcrypto, self, caches: cacheStorage, fetch, MessageChannel: TestChannel, ...trackedTimers(t), ...extra });
  return {
    stores, calls, state, deleted, config, content, cacheStorage,
    async lifecycle(name, event = {}) {
      let work; listeners.get(name)({ ...event, waitUntil: (value) => { work = value; } }); if (work) await work;
    },
    request(pathname, overrides = {}, awaitWrites = true) {
      let work; let lifetime;
      const request = { url: pathname.startsWith('https:') ? pathname : `${origin}${basePath}${pathname}`, method: 'GET', mode: 'cors', cache: 'default', headers: new Headers(), ...overrides };
      listeners.get('fetch')({ request, respondWith: (value) => { work = value; }, waitUntil: (value) => { lifetime = value; } });
      if (!work) return undefined;
      work.lifetime = lifetime;
      return awaitWrites ? work.then(async (response) => { await lifetime; return response; }) : work;
    },
    client(id, ready = true, url = `${origin}${basePath}/`) {
      return { id, url, postMessage(data, ports) { if (data.type === 'DRAVA_PWA_PREPARE' && ready !== null) ports[0].postMessage({ ready }); else state.releaseMessages.push(data.type); } };
    },
  };
}

test('installation verifies public bytes, scopes the cache and never skips waiting automatically', async (t) => {
  for (const basePath of ['', '/DRAVACARD', '/sites/drava']) {
    const harness = workerHarness(t, basePath);
    await harness.lifecycle('install');
    assert.equal(harness.state.skipWaiting, 0);
    const [[name, values]] = harness.stores;
    assert.ok(name.startsWith(`drava-public-v5:${encodeURIComponent(basePath || '/')}:`));
    assert.deepEqual([...values.keys()].sort(), harness.config.precache.map((name) => `https://example.com${basePath}${name}`).sort());
    assert.equal(harness.stores.size, 1);
  }
});

test('failed, private, redirected or modified precache responses reject installation and discard only the incomplete cache', async (t) => {
  for (const change of [{ failNetwork: true }, { policy: 'private' }, { policy: 'no-store' }, { corrupt: true }, { redirected: true }, { type: 'opaque' }, { status: 404 }, { vary: 'Cookie' }, { vary: '*' }]) {
    const harness = workerHarness(t); Object.assign(harness.state, change);
    harness.stores.set('unrelated', new Map());
    await assert.rejects(harness.lifecycle('install'));
    assert.deepEqual([...harness.stores.keys()], ['unrelated']); assert.equal(harness.state.skipWaiting, 0);
  }
});

test('payment, query, authorization, RSC, no-store and private navigations never touch cache or receive an offline fallback', async (t) => {
  for (const basePath of ['', '/DRAVACARD']) {
    const harness = workerHarness(t, basePath); await harness.lifecycle('install'); harness.calls.length = 0;
    for (const path of ['/api/checkout', '/api/orders/status', '/api/providers', '/api/location', '/tiktok-payment/', '/payment-success/', '/payment-failure/', '/account/', '/manifest.json']) {
      assert.equal(harness.request(path), undefined); assert.equal(harness.request(path, { mode: 'navigate' }), undefined);
    }
    const staticPath = '/images/drava-icon-192.png';
    for (const extra of [{ method: 'POST' }, { cache: 'no-store' }, { headers: new Headers({ authorization: 'private' }) }, { headers: new Headers({ rsc: '1' }) }, { headers: new Headers({ accept: 'text/x-component' }) }, { headers: new Headers({ 'next-router-state-tree': 'private' }) }, { headers: new Headers({ range: 'bytes=0-2' }) }]) assert.equal(harness.request(staticPath, extra), undefined);
    for (const path of [`${staticPath}?order=secret`, '/?customer=secret', '/?_rsc=test', '/#order=secret', '/#customer=secret', 'https://other.example/_next/static/abc.js']) assert.equal(harness.request(path, { mode: 'navigate' }), undefined);
    assert.deepEqual(harness.calls, []);
  }
});

test('only a failed public home navigation gets offline content and no HTML navigation is stored', async (t) => {
  const harness = workerHarness(t, '/nested'); await harness.lifecycle('install');
  const values = [...harness.stores.values()][0]; const keys = [...values.keys()];
  const online = await harness.request('/', { mode: 'navigate' }); assert.equal(await online.text(), 'network only document');
  harness.state.failNetwork = true;
  const offline = await harness.request('/', { mode: 'navigate' }); assert.match(await offline.text(), /DRAVA offline/);
  for (const fragment of ['#tiktok', '#card:visa-basic']) {
    const reloaded = await harness.request(`/${fragment}`, { mode: 'navigate', cache: 'no-cache' });
    assert.match(await reloaded.text(), /DRAVA offline/);
  }
  assert.deepEqual([...values.keys()], keys);
  assert.equal(harness.request('/payment-success/', { mode: 'navigate' }), undefined);
});

test('public cache hits avoid network, runtime writes match the build manifest and response privacy is respected', async (t) => {
  const harness = workerHarness(t); await harness.lifecycle('install'); harness.calls.length = 0;
  await harness.request('/images/drava-icon-192.png'); assert.equal(harness.calls.length, 0);
  await harness.request('/_next/static/chunks/abc123.js'); assert.equal(harness.calls.length, 1);
  await harness.request('/_next/static/chunks/abc123.js'); assert.equal(harness.calls.length, 1);
  const values = [...harness.stores.values()][0]; assert.equal(values.size, 3);
  await harness.request('/_next/static/chunks/unknown.js'); assert.equal(values.size, 3);
  for (const policy of ['private, max-age=60', 'no-store']) {
    const privateHarness = workerHarness(t); privateHarness.state.policy = policy;
    await privateHarness.request('/_next/static/chunks/abc123.js'); assert.equal([...privateHarness.stores.values()][0].size, 0);
  }
  const corrupt = workerHarness(t); corrupt.state.corrupt = true;
  await corrupt.request('/_next/static/chunks/abc123.js'); assert.equal([...corrupt.stores.values()][0].size, 0);
});

test('runtime network response is immediately usable while waitUntil protects the asynchronous cache write', async (t) => {
  const harness = workerHarness(t);
  harness.state.blockWrites = true;
  const writeStarted = new Promise((resolve) => { harness.state.onWrite = resolve; });
  const work = harness.request('/_next/static/chunks/abc123.js', {}, false);
  const response = await work;
  assert.equal(await response.text(), 'public immutable script');
  let cacheFinished = false;
  work.lifetime.then(() => { cacheFinished = true; });
  await writeStarted;
  assert.equal(cacheFinished, false);
  assert.equal(harness.state.pendingWrites.length, 1);
  harness.state.pendingWrites[0]();
  await work.lifetime;
  assert.equal(cacheFinished, true);
  assert.equal([...harness.stores.values()][0].size, 1);
});

test('cache keys and responses exclude request referrers, contact details and arbitrary network headers', async (t) => {
  const harness = workerHarness(t);
  harness.state.responseHeaders = { 'x-customer-email': 'private@example.test', 'set-cookie': 'session=private' };
  await harness.request('/_next/static/chunks/abc123.js', { referrer: 'https://example.com/?order=private', headers: new Headers({ 'x-private-customer': 'private@example.test' }) });
  const saved = harness.state.storedRequests[0];
  assert.equal(saved.referrer, ''); assert.equal(saved.credentials, 'omit'); assert.equal(saved.referrerPolicy, 'no-referrer');
  assert.deepEqual([...saved.headers], []);
  const response = [...harness.stores.values()][0].values().next().value;
  assert.equal(response.headers.get('x-customer-email'), null); assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(harness.request('/_next/static/chunks/abc123.js', { headers: new Headers({ cookie: 'session=private' }) }), undefined);
});

test('activation retains one previous build for idle old tabs and preserves other deployment scopes', async (t) => {
  const harness = workerHarness(t, '/drava');
  const prefix = 'drava-public-v5:%2Fdrava:';
  for (const name of [`${prefix}oldest`, `${prefix}previous`, 'drava-public-v5:%2F:other', 'drava-public-v4-/drava', 'drava-public-v4-root', 'unrelated']) harness.stores.set(name, new Map());
  harness.stores.get(`${prefix}previous`).set('https://example.com/drava/_next/static/chunks/old.js', new Response('previous public chunk'));
  await harness.lifecycle('install'); await harness.lifecycle('activate');
  assert.deepEqual(harness.deleted.sort(), [`${prefix}oldest`, 'drava-public-v4-/drava'].sort());
  assert.equal(harness.state.claimed, 1);
  assert.equal(await (await harness.request('/_next/static/chunks/old.js')).text(), 'previous public chunk');
  assert.ok(harness.stores.has('drava-public-v5:%2F:other'));
});

test('explicit activation requires every in-scope client, blocks silent/busy or newly opened tabs and releases failed locks', async (t) => {
  for (const ready of [true, false, null]) {
    const harness = workerHarness(t); const client = harness.client('origin'); const second = harness.client('other', ready); const foreign = harness.client('foreign', false, 'https://example.com/other/');
    harness.state.clients = [client, second, foreign];
    const replies = [];
    await harness.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE' }, source: client, ports: [{ postMessage: (data) => replies.push(data) }] });
    // At root scope, /other/ belongs to the same registration and must also answer.
    assert.equal(harness.state.skipWaiting, 0); assert.equal(replies[0].ok, false);
  }
  const success = workerHarness(t, '/drava'); const client = success.client('origin');
  success.state.clients = [client, success.client('second'), success.client('outside', false, 'https://example.com/elsewhere/')];
  const replies = [];
  await success.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE' }, source: client, ports: [{ postMessage: (data) => replies.push(data) }] });
  assert.equal(success.state.skipWaiting, 1); assert.equal(replies[0].ok, true);
  const changed = workerHarness(t); const original = changed.client('origin'); let reads = 0;
  changed.state.clients = () => ++reads === 1 ? [original] : [original, changed.client('new')];
  await changed.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE' }, source: original, ports: [{ postMessage() {} }] });
  assert.equal(changed.state.skipWaiting, 0); assert.ok(changed.state.releaseMessages.includes('DRAVA_PWA_RELEASE'));
});

async function buildFixture(t) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'drava-pwa-test-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  for (const name of ['offline.html', 'theme-init.js', 'favicon.svg', 'apple-touch-icon.png', 'images/drava-logo-transparent.svg', 'images/drava-icon-192.png', 'images/drava-icon-512.png', 'images/drava-icon-maskable-512.png', 'images/mastercard.svg', 'images/visa.svg', '_next/static/chunks/abc123.js', '_next/static/chunks/polyfills-abc.js', '_next/static/css/abc123.css', '_next/static/media/font.woff2']) {
    const filename = path.join(outDir, name); await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, `public fixture ${name}`);
  }
  await writeFile(path.join(outDir, 'index.html'), '<!doctype html><script src="/DRAVACARD/_next/static/chunks/abc123.js"></script><link href="/DRAVACARD/_next/static/css/abc123.css"><script src="/DRAVACARD/_next/static/chunks/polyfills-abc.js" noModule=""></script><script src="/DRAVACARD/?_rsc=private"></script>');
  return outDir;
}

test('generation is deterministic from public build bytes, respects the base path and never precaches pages or RSC', async (t) => {
  const outDir = await buildFixture(t);
  const first = await generatePwa({ outDir, basePath: '/DRAVACARD' }); const sw = await readFile(path.join(outDir, 'sw.js'), 'utf8');
  assert.deepEqual(await generatePwa({ outDir, basePath: '/DRAVACARD' }), first);
  assert.equal(await readFile(path.join(outDir, 'sw.js'), 'utf8'), sw);
  const config = JSON.parse(sw.match(/const BUILD = (\{[^\n]+\});/)[1]);
  assert.ok(config.precache.includes('/_next/static/chunks/abc123.js'));
  assert.ok(!config.precache.includes('/_next/static/chunks/polyfills-abc.js'));
  assert.ok(config.assets.some(([name]) => name === '/_next/static/chunks/polyfills-abc.js'));
  assert.ok(!config.precache.some((name) => /\.png$/.test(name)));
  assert.ok(config.assets.some(([name]) => name === '/images/drava-icon-512.png'));
  assert.ok(config.assets.every(([name]) => !name.includes('?') && (name === '/offline.html' || !/\.html$/.test(name))));
  assert.ok(!config.precache.includes('/')); assert.ok(!config.precache.includes('/index.html'));
  assert.ok(!config.assets.some(([name]) => name.includes('payment') || name.includes('api/')));
  await writeFile(path.join(outDir, '_next/static/chunks/abc123.js'), 'changed public chunk');
  assert.notEqual((await generatePwa({ outDir, basePath: '/DRAVACARD' })).version, first.version);
  await assert.rejects(generatePwa({ outDir, basePath: '/../private' }));
});

test('generator enforces file/cache size bounds and never writes outside its export', async (t) => {
  const outDir = await buildFixture(t);
  await writeFile(path.join(outDir, '_next/static/chunks/abc123.js'), Buffer.alloc(1024 * 1024 + 1));
  await assert.rejects(generatePwa({ outDir }), /size budget/);
  assert.ok(!workerSource.includes('Date.now()'));
});

test('install icons have correct PNG dimensions and scoped URLs; offline document keeps original logo and no financial actions', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const name of [manifest.id, manifest.start_url, manifest.scope, ...manifest.icons.map((icon) => icon.src)]) assert.ok(new URL(name, 'https://example.com/sites/drava/manifest.json').pathname.startsWith('/sites/drava/'));
  for (const icon of [...manifest.icons, { src: 'apple-touch-icon.png', sizes: '180x180' }]) {
    const bytes = await readFile(new URL(`../public/${icon.src}`, import.meta.url)); const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG'); assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
  }
  const offline = await readFile(new URL('../public/offline.html', import.meta.url), 'utf8');
  assert.ok(offline.includes('<title>Drava — Hors connexion / Offline</title>'));
  assert.ok(offline.includes('<h1>Vous êtes hors connexion</h1>'));
  assert.ok(offline.includes('Cette page ne confirme aucun paiement.'));
  assert.doesNotMatch(offline, /Ã|â€|\uFFFD/);
  assert.match(offline, /images\/drava-logo-transparent\.svg/); assert.match(offline, /lang="en"/);
  assert.doesNotMatch(offline, /<form|maximum-scale|user-scalable|orderToken|localStorage|sessionStorage/);
  assert.match(offline, /href="\.\/"/);
  assert.match(offline, /<script src="theme-init\.js"><\/script>/);
  assert.match(offline, /default-src 'none'; script-src 'self'/);
  assert.equal((offline.match(/<script/g) || []).length, 1);
});
