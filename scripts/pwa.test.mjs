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
function registrationHarness(t, { readyState = 'complete', basePath = '', waiting = false, busy = false, enabled = 'true', origin = 'https://example.com', legacy = false, controlled = true, failRegister = false, cacheNames = [] } = {}) {
  const window = new Events(); const document = new Events(); const serviceWorker = new Events();
  let now = 1_000_000; let timerId = 0;
  const timers = new Map(); const observers = [];
  const clock = {
    Date: { now: () => now },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, due: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const advance = async (ms) => {
    await flush();
    const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      now = next[1].due; timers.delete(next[0]); next[1].fn(); await flush();
    }
    now = end; await flush();
  };
  const state = { marker: busy, dialog: false, editing: false, posts: [], reloads: 0, updates: 0, registrations: [], acknowledge: true, unregisters: 0, lookups: [], failRegister, cacheNames: [...cacheNames] };
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
  serviceWorker.controller = controlled ? { scriptURL: waitingWorker.scriptURL } : null;
  serviceWorker.register = async (url, options) => { state.registrations.push({ url: url.href, ...options }); if (state.failRegister) throw new TypeError('network'); return registration; };
  const navigator = { serviceWorker, onLine: true };
  const caches = { async keys() { return state.cacheNames; }, async delete(name) { state.cacheNames = state.cacheNames.filter((item) => item !== name); return true; } };
  const MutationObserver = class { constructor(callback) { observers.push(callback); } observe() {} };
  vm.runInNewContext(registrationSource, { URL, console, window, document, navigator, caches, CustomEvent, MessageChannel: TestChannel, MutationObserver, ...clock });
  return { state, window, document, serviceWorker, registration, waitingWorker, attributes, advance, mutate: () => observers.forEach((callback) => callback()), api: window.dravaPwa };
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

test('waiting updates apply silently after idle time and reload once without consuming user input', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await flush();
  assert.equal(harness.api.getState().updateAvailable, true); assert.equal(harness.state.posts.length, 0);
  await harness.advance(2999); assert.equal(harness.state.posts.length, 0);
  await harness.advance(1);
  assert.equal(harness.state.posts.length, 1);
  assert.equal(harness.state.posts[0].type, 'DRAVA_PWA_APPLY_UPDATE');
  assert.equal(harness.state.posts[0].automatic, true);
  assert.equal(harness.api.getState().applying, true);
  let prevented = false;
  harness.document.dispatchEvent({ type: 'click', preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, false);
  harness.registration.waiting = null;
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await harness.advance(50);
  assert.equal(harness.state.reloads, 1);
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await harness.advance(3000);
  assert.equal(harness.state.reloads, 1); assert.equal(harness.attributes.size, 0);
});

test('first installation does not reload, while a peer tab refreshes safely after replacement', async (t) => {
  const harness = registrationHarness(t, { controlled: false }); await flush();
  harness.serviceWorker.controller = harness.waitingWorker;
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await harness.advance(3000);
  assert.equal(harness.state.reloads, 0);
  const peer = registrationHarness(t); await peer.advance(3000);
  peer.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await peer.advance(50);
  assert.equal(peer.state.posts.length, 0); assert.equal(peer.state.reloads, 1);
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
  const harness = registrationHarness(t); await harness.advance(3000);
  harness.registration.waiting = harness.waitingWorker;
  for (const field of ['marker', 'dialog', 'editing']) {
    harness.state[field] = true; assert.equal(await harness.api.applyUpdate(), false); harness.state[field] = false;
  }
  for (const pathname of ['/payment-success/', '/payment-failure/', '/tiktok-payment/']) {
    harness.window.location.pathname = pathname; assert.equal(await harness.api.applyUpdate(), false);
  }
  harness.window.location.pathname = '/'; harness.window.location.search = '?order=private';
  assert.equal(await harness.api.applyUpdate(), false);
  harness.window.location.search = '';
  for (const hash of ['#order=private', '#card:test']) {
    harness.window.location.hash = hash; assert.equal(await harness.api.applyUpdate(), false);
  }
  harness.window.location.hash = '';
  harness.state.acknowledge = false;
  assert.equal(await harness.api.applyUpdate(), false);
  assert.equal(harness.api.getState().applying, false); assert.equal(harness.api.getState().blocked, true);
  harness.state.acknowledge = null;
  const pending = harness.api.applyUpdate(); await harness.advance(6000);
  assert.equal(await pending, false);
  assert.equal(harness.state.reloads, 0); assert.equal(harness.attributes.size, 0);
});

test('coordination messages send only readiness and never form or order data', async (t) => {
  const harness = registrationHarness(t); await harness.advance(3000);
  const replies = [];
  const probe = () => harness.serviceWorker.dispatchEvent({ type: 'message', source: harness.waitingWorker, data: { type: 'DRAVA_PWA_PREPARE' }, ports: [{ postMessage: (data) => replies.push(data) }] });
  harness.state.marker = true; probe(); assert.equal(replies[0].ready, false);
  harness.state.marker = false; probe(); assert.equal(replies[1].ready, true);
  assert.deepEqual(Object.keys(replies[1]), ['ready', 'automaticReload']); assert.equal(replies[1].automaticReload, true);
  assert.equal(harness.api.getState().applying, true);
  harness.serviceWorker.dispatchEvent({ type: 'message', source: harness.waitingWorker, data: { type: 'DRAVA_PWA_RELEASE' } });
  assert.equal(harness.api.getState().applying, false);
  harness.window.dispatchEvent({ type: 'offline' }); assert.equal(harness.api.getState().offline, true);
  harness.window.dispatchEvent({ type: 'online' }); assert.equal(harness.api.getState().offline, false);
});

test('downloads continue during checkout and activation resumes automatically after it closes', async (t) => {
  const harness = registrationHarness(t, { waiting: true, busy: true }); await harness.advance(3000);
  await harness.api.checkForUpdate();
  assert.equal(harness.state.updates, 1); assert.equal(harness.state.posts.length, 0);
  harness.state.marker = false; harness.mutate(); await harness.advance(50);
  assert.equal(harness.state.posts.length, 1);
});

test('a refused coordination attempt retries automatically without another interaction', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); harness.state.acknowledge = false;
  await harness.advance(3000); assert.equal(harness.state.posts.length, 1);
  harness.state.acknowledge = true;
  await harness.advance(14999); assert.equal(harness.state.posts.length, 1);
  await harness.advance(1); assert.equal(harness.state.posts.length, 2);
});

test('activity, blurred edits and composition postpone activation without storing customer data', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await harness.advance(2000);
  harness.document.dispatchEvent({ type: 'pointerdown' }); await harness.advance(2999);
  assert.equal(harness.state.posts.length, 0);
  const field = { matches: () => true, isConnected: true, value: 'private draft' };
  harness.document.dispatchEvent({ type: 'input', target: field }); await harness.advance(18000);
  assert.equal(harness.state.posts.length, 0);
  field.value = ''; harness.document.dispatchEvent({ type: 'input', target: field });
  harness.document.dispatchEvent({ type: 'compositionstart' }); await harness.advance(3000);
  assert.equal(harness.state.posts.length, 0);
  harness.document.dispatchEvent({ type: 'compositionend' }); await harness.advance(3000);
  assert.equal(harness.state.posts.length, 1);
  assert.equal(JSON.stringify(harness.state.posts).includes('private draft'), false);
});

test('pending reload survives a checkout opened after coordination and resumes when safe', async (t) => {
  const harness = registrationHarness(t, { waiting: true }); await harness.advance(3000);
  harness.state.marker = true; harness.registration.waiting = null;
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await harness.advance(15050);
  assert.equal(harness.state.reloads, 0); assert.equal(harness.api.getState().reloadPending, true);
  harness.state.marker = false; harness.mutate(); await harness.advance(50);
  assert.equal(harness.state.reloads, 1);
});

test('private pages, offline state and edited elements protect a pending reload', async (t) => {
  const harness = registrationHarness(t); await harness.advance(3000);
  const field = { matches: () => true, isConnected: true, value: 'private draft' };
  harness.document.dispatchEvent({ type: 'input', target: field });
  harness.serviceWorker.dispatchEvent({ type: 'controllerchange' }); await harness.advance(18000);
  assert.equal(harness.state.reloads, 0);
  field.isConnected = false;
  harness.window.location.pathname = '/tiktok-payment/'; harness.mutate(); await harness.advance(15050);
  assert.equal(harness.state.reloads, 0);
  harness.window.dispatchEvent({ type: 'offline' });
  harness.window.location.pathname = '/'; harness.mutate(); await harness.advance(15000);
  assert.equal(harness.state.reloads, 0);
  harness.window.dispatchEvent({ type: 'online' }); await harness.advance(50);
  assert.equal(harness.state.reloads, 1);
});

test('visible long-lived sessions check periodically and resume on return without duplicate requests', async (t) => {
  const harness = registrationHarness(t); await harness.advance(600000);
  assert.equal(harness.state.updates, 1);
  harness.document.visibilityState = 'hidden'; await harness.advance(600000);
  assert.equal(harness.state.updates, 1);
  harness.document.visibilityState = 'visible';
  harness.document.dispatchEvent({ type: 'visibilitychange' });
  harness.window.dispatchEvent({ type: 'pageshow' }); await flush();
  assert.equal(harness.state.updates, 2);
  harness.window.dispatchEvent({ type: 'offline' }); await harness.advance(600000);
  assert.equal(harness.state.updates, 2);
  harness.window.dispatchEvent({ type: 'online' }); await flush();
  assert.equal(harness.state.updates, 3);
});

test('a worker already installing when registration resolves is activated without waiting for the next check', async (t) => {
  const harness = registrationHarness(t);
  const installing = new Events(); installing.state = 'installing';
  harness.registration.installing = installing; await harness.advance(3000);
  harness.registration.dispatchEvent({ type: 'updatefound' });
  assert.equal(installing.listeners.get('statechange').length, 1);
  harness.registration.waiting = harness.waitingWorker; installing.state = 'installed';
  installing.dispatchEvent({ type: 'statechange' }); await harness.advance(50);
  assert.equal(harness.state.posts.length, 1); assert.equal(harness.state.updates, 0);
});

test('initial registration failures recover after connectivity returns without duplicate registrations', async (t) => {
  const harness = registrationHarness(t, { failRegister: true }); await flush();
  assert.equal(harness.state.registrations.length, 1);
  harness.window.dispatchEvent({ type: 'offline' });
  harness.window.dispatchEvent({ type: 'pageshow' }); await flush();
  assert.equal(harness.state.registrations.length, 1);
  harness.state.failRegister = false;
  harness.window.dispatchEvent({ type: 'online' });
  harness.window.dispatchEvent({ type: 'pageshow' }); await flush();
  assert.equal(harness.state.registrations.length, 2);
  harness.window.dispatchEvent({ type: 'pageshow' }); await harness.advance(600000);
  assert.equal(harness.state.registrations.length, 2); assert.equal(harness.state.updates, 1);
});

function workerHarness(t, basePath = '', extra = {}) {
  const { version = 'a'.repeat(24), stores = new Map(), chunkName = 'abc123', ...runtime } = extra;
  const origin = 'https://example.com';
  const content = new Map([
    ['/offline.html', new TextEncoder().encode('<!doctype html><title>DRAVA offline</title>')],
    ['/images/drava-icon-192.png', new TextEncoder().encode('public test icon')],
    [`/_next/static/chunks/${chunkName}.js`, new TextEncoder().encode('public immutable script')],
  ]);
  const config = { version, assets: [...content].map(([name, bytes]) => [name, hash(bytes), bytes.length]), precache: ['/offline.html', '/images/drava-icon-192.png'] };
  const listeners = new Map(); const calls = []; const deleted = [];
  const state = { skipWaiting: 0, claimed: 0, failNetwork: false, policy: 'public, max-age=31536000', corrupt: false, status: 200, redirected: false, type: 'basic', clients: [], prepareMessages: [], releaseMessages: [], blockWrites: false, pendingWrites: [], storedRequests: [] };
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
  vm.runInNewContext(workerSource.replace('/* DRAVA_PWA_BUILD */ null', JSON.stringify(config)), { URL, Request, Response, Headers, crypto: webcrypto, self, caches: cacheStorage, fetch, MessageChannel: TestChannel, ...trackedTimers(t), ...runtime });
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
    client(id, ready = true, url = `${origin}${basePath}/`, automaticReload) {
      return { id, url, postMessage(data, ports) {
        if (data.type === 'DRAVA_PWA_PREPARE') {
          state.prepareMessages.push({ id, data });
          if (ready !== null) ports[0].postMessage({ ready, ...(automaticReload === undefined ? {} : { automaticReload }) });
        } else state.releaseMessages.push(data.type);
      } };
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
    assert.equal(values.get(`https://example.com${basePath}/offline.html`).headers.get('X-Drava-Cache-Phase'), 'waiting');
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
  for (const name of [`${prefix}oldest`, `${prefix}previous`]) harness.stores.get(name).set('https://example.com/drava/offline.html', new Response('legacy public offline document'));
  harness.stores.get(`${prefix}previous`).set('https://example.com/drava/_next/static/chunks/old.js', new Response('previous public chunk'));
  await harness.lifecycle('install'); await harness.lifecycle('activate');
  assert.deepEqual(harness.deleted.sort(), [`${prefix}oldest`, 'drava-public-v4-/drava'].sort());
  assert.equal(harness.state.claimed, 1);
  assert.equal(await (await harness.request('/_next/static/chunks/old.js')).text(), 'previous public chunk');
  assert.ok(harness.stores.has('drava-public-v5:%2F:other'));
});

test('activation retains the last actually active build instead of a superseded waiting build', async (t) => {
  const stores = new Map(); const prefix = 'drava-public-v5:%2Fdrava:';
  const make = (letter) => workerHarness(t, '/drava', { stores, version: letter.repeat(24), chunkName: letter });
  const key = (letter) => `${prefix}${letter.repeat(24)}`;
  const phase = (letter) => stores.get(key(letter))?.get('https://example.com/drava/offline.html')?.headers.get('X-Drava-Cache-Phase');
  const a = make('a'); await a.lifecycle('install'); await a.lifecycle('activate');
  await a.request('/_next/static/chunks/a.js');
  const b = make('b'); await b.lifecycle('install');
  const c = make('c'); await c.lifecycle('install');
  assert.equal(phase('a'), 'active'); assert.equal(phase('b'), 'waiting'); assert.equal(phase('c'), 'waiting');
  await c.lifecycle('activate');
  assert.deepEqual([...stores.keys()], [key('a'), key('c')]);
  assert.equal(phase('a'), 'previous'); assert.equal(phase('c'), 'active');
  c.state.failNetwork = true;
  assert.equal(await (await c.request('/_next/static/chunks/a.js')).text(), 'public immutable script');
  c.state.failNetwork = false; await c.request('/_next/static/chunks/c.js');
  const d = make('d'); await d.lifecycle('install'); await d.lifecycle('activate');
  assert.deepEqual([...stores.keys()], [key('c'), key('d')]);
  assert.equal(phase('c'), 'previous'); assert.equal(phase('d'), 'active');
  d.state.failNetwork = true;
  assert.equal(await (await d.request('/_next/static/chunks/c.js')).text(), 'public immutable script');
  await assert.rejects(d.request('/_next/static/chunks/a.js'), /offline/);
});

test('cache phase is local public metadata preserved through byte refreshes and rollback activation', async (t) => {
  const stores = new Map(); const prefix = 'drava-public-v5:%2F:';
  const make = (letter) => workerHarness(t, '', { stores, version: letter.repeat(24) });
  const key = (letter) => `${prefix}${letter.repeat(24)}`;
  const phase = (letter) => stores.get(key(letter)).get('https://example.com/offline.html').headers.get('X-Drava-Cache-Phase');
  const a = make('a'); a.state.responseHeaders = { 'X-Drava-Cache-Phase': 'active' };
  await a.lifecycle('install'); assert.equal(phase('a'), 'waiting');
  await a.request('/offline.html', { cache: 'reload' }); assert.equal(phase('a'), 'waiting');
  await a.lifecycle('activate'); assert.equal(phase('a'), 'active');
  a.state.responseHeaders = { 'X-Drava-Cache-Phase': 'waiting' };
  await a.request('/offline.html', { cache: 'reload' }); assert.equal(phase('a'), 'active');
  const b = make('b'); await b.lifecycle('install'); await b.lifecycle('activate');
  await a.request('/offline.html', { cache: 'reload' }); assert.equal(phase('a'), 'previous');
  // A rollback reuses the older cache object; creation order is no longer activation order.
  await a.lifecycle('activate'); assert.equal(phase('a'), 'active'); assert.equal(phase('b'), 'previous');
  const c = make('c'); await c.lifecycle('install'); await c.lifecycle('activate');
  assert.deepEqual([...stores.keys()], [key('a'), key('c')]);
  for (const values of stores.values()) {
    assert.equal(values.size, 2);
    assert.deepEqual([...values.keys()].sort(), ['https://example.com/images/drava-icon-192.png', 'https://example.com/offline.html']);
    assert.equal(values.get('https://example.com/images/drava-icon-192.png').headers.get('X-Drava-Cache-Phase'), null);
  }
});

test('activation preserves a newer installation in progress then removes the obsolete active cache when it activates', async (t) => {
  const stores = new Map(); const prefix = 'drava-public-v5:%2F:';
  const make = (letter) => workerHarness(t, '', { stores, version: letter.repeat(24) });
  const key = (letter) => `${prefix}${letter.repeat(24)}`;
  const a = make('a'); await a.lifecycle('install'); await a.lifecycle('activate');
  const b = make('b'); await b.lifecycle('install');
  const c = make('c'); c.state.blockWrites = true;
  const writeStarted = new Promise((resolve) => { c.state.onWrite = resolve; });
  const installing = c.lifecycle('install'); await writeStarted;
  assert.equal(stores.get(key('c')).size, 0);
  await b.lifecycle('activate');
  assert.deepEqual([...stores.keys()], [key('a'), key('b'), key('c')]);
  c.state.blockWrites = false;
  for (const resume of c.state.pendingWrites) resume();
  await installing;
  assert.equal(stores.get(key('c')).get('https://example.com/offline.html').headers.get('X-Drava-Cache-Phase'), 'waiting');
  await c.lifecycle('activate');
  assert.deepEqual([...stores.keys()], [key('b'), key('c')]);
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

test('automatic activation requires every scoped client to support safe reload while manual legacy activation remains compatible', async (t) => {
  for (const automaticReload of [undefined, false, 'true', true]) {
    const harness = workerHarness(t, '/drava');
    const client = harness.client('origin', true, 'https://example.com/drava/', true);
    harness.state.clients = [client, harness.client('second', true, 'https://example.com/drava/', automaticReload), harness.client('outside', false, 'https://example.com/elsewhere/')];
    const replies = [];
    await harness.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE', automatic: true }, source: client, ports: [{ postMessage: (data) => replies.push(data) }] });
    assert.equal(harness.state.skipWaiting, automaticReload === true ? 1 : 0);
    assert.equal(replies[0].ok, automaticReload === true);
    assert.equal(harness.state.prepareMessages.length, 2);
    for (const message of harness.state.prepareMessages) assert.deepEqual(JSON.parse(JSON.stringify(message.data)), { type: 'DRAVA_PWA_PREPARE', automatic: true });
    if (automaticReload !== true) assert.equal(harness.state.releaseMessages.filter((name) => name === 'DRAVA_PWA_RELEASE').length, 2);
  }
  const busy = workerHarness(t); const client = busy.client('origin', true, 'https://example.com/', true);
  busy.state.clients = [client, busy.client('busy', false, 'https://example.com/', true)];
  await busy.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE', automatic: true }, source: client, ports: [{ postMessage() {} }] });
  assert.equal(busy.state.skipWaiting, 0);
  const legacy = workerHarness(t); const oldClient = legacy.client('old'); legacy.state.clients = [oldClient];
  await legacy.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE' }, source: oldClient, ports: [{ postMessage() {} }] });
  assert.equal(legacy.state.skipWaiting, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.state.prepareMessages[0].data)), { type: 'DRAVA_PWA_PREPARE' });
});

test('concurrent automatic requests share one coordination attempt and recheck newly opened clients', async (t) => {
  const harness = workerHarness(t); let answer; let preparations = 0;
  const client = { id: 'origin', url: 'https://example.com/', postMessage(data, ports) {
    if (data.type === 'DRAVA_PWA_PREPARE') { preparations++; answer = () => ports[0].postMessage({ ready: true, automaticReload: true }); }
  } };
  harness.state.clients = [client];
  const replies = [];
  const event = () => ({ data: { type: 'DRAVA_PWA_APPLY_UPDATE', automatic: true }, source: client, ports: [{ postMessage: (data) => replies.push(data) }] });
  const first = harness.lifecycle('message', event()); await flush();
  await harness.lifecycle('message', event());
  assert.equal(preparations, 1); assert.equal(replies[0].ok, false); assert.equal(harness.state.skipWaiting, 0);
  answer(); await first; assert.equal(replies[1].ok, true); assert.equal(harness.state.skipWaiting, 1);
  const changed = workerHarness(t); const original = changed.client('origin', true, 'https://example.com/', true); let reads = 0;
  changed.state.clients = () => ++reads === 1 ? [original] : [original, changed.client('new', true, 'https://example.com/', true)];
  await changed.lifecycle('message', { data: { type: 'DRAVA_PWA_APPLY_UPDATE', automatic: true }, source: original, ports: [{ postMessage() {} }] });
  assert.equal(changed.state.skipWaiting, 0); assert.ok(changed.state.releaseMessages.includes('DRAVA_PWA_RELEASE'));
});

async function buildFixture(t) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'drava-pwa-test-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  for (const name of ['offline.html', 'theme-init.js', 'favicon.svg', 'apple-touch-icon.png', 'images/drava-logo-transparent.svg', 'images/drava-icon-192.png', 'images/drava-icon-512.png', 'images/drava-icon-maskable-512.png', 'images/mastercard.svg', 'images/visa.svg', '_next/static/chunks/abc123.js', '_next/static/chunks/polyfills-abc.js', '_next/static/css/abc123.css', '_next/static/media/font.woff2']) {
    const filename = path.join(outDir, name); await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, `public fixture ${name}`);
  }
  await writeFile(path.join(outDir, 'index.html'), '<!doctype html><script src="/DRAVACARD/_next/static/chunks/abc123.js"></script><link href="/DRAVACARD/_next/static/css/abc123.css"><script src="/DRAVACARD/_next/static/chunks/polyfills-abc.js" noModule=""></script><script src="/DRAVACARD/?_rsc=private"></script>');
  await writeFile(path.join(outDir, 'manifest.json'), await readFile(new URL('../public/manifest.json', import.meta.url)));
  return outDir;
}

test('generation is deterministic from public build bytes, respects the base path and never precaches pages or RSC', async (t) => {
  const outDir = await buildFixture(t);
  const first = await generatePwa({ outDir, basePath: '/DRAVACARD' }); const sw = await readFile(path.join(outDir, 'sw.js'), 'utf8');
  const manifest = await readFile(path.join(outDir, 'manifest.json'), 'utf8');
  assert.deepEqual(await generatePwa({ outDir, basePath: '/DRAVACARD' }), first);
  assert.equal(await readFile(path.join(outDir, 'sw.js'), 'utf8'), sw);
  assert.equal(await readFile(path.join(outDir, 'manifest.json'), 'utf8'), manifest);
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

test('publication manifest keeps one matching identity for root, nested paths and local origins', async (t) => {
  const outDir = await buildFixture(t);
  const input = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  for (const { basePath, siteUrl, expected } of [
    { basePath: '', siteUrl: 'https://drava.click', expected: 'https://drava.click/' },
    { basePath: '/DRAVACARD/', siteUrl: 'https://drava.click', expected: 'https://drava.click/DRAVACARD/' },
    { basePath: '/sites/drava', siteUrl: 'https://preview.example/build/', expected: 'https://preview.example/sites/drava/' },
    { basePath: '/preview', siteUrl: 'http://localhost:3000', expected: 'http://localhost:3000/preview/' },
    { basePath: '', siteUrl: 'http://127.0.0.1:3000', expected: 'http://127.0.0.1:3000/' },
    { basePath: '/', siteUrl: 'http://[::1]:3000/', expected: 'http://[::1]:3000/' },
  ]) {
    const first = await generatePwa({ outDir, basePath, siteUrl });
    const contents = await readFile(path.join(outDir, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(contents);
    const manifestUrl = new URL('manifest.json', expected);
    const startUrl = new URL(manifest.start_url, manifestUrl);
    // The main id is resolved against start_url's origin, never manifestUrl's directory.
    assert.equal(new URL(manifest.id, startUrl.origin).href, expected);
    assert.equal(startUrl.href, expected);
    assert.equal(new URL(manifest.scope, manifestUrl).href, expected);
    assert.deepEqual(manifest.related_applications, [{ platform: 'webapp', url: './manifest.json', id: expected }]);
    assert.equal(new URL(manifest.related_applications[0].url, manifestUrl).href, manifestUrl.href);
    // The related id must parse without a base, as Chromium's desktop lookup does.
    assert.equal(new URL(manifest.related_applications[0].id).href, expected);
    assert.equal(manifest.prefer_related_applications, false);
    assert.deepEqual(manifest.icons, input.icons);
    assert.equal(manifest.name, input.name);
    assert.deepEqual(await generatePwa({ outDir, basePath, siteUrl }), first);
    assert.equal(await readFile(path.join(outDir, 'manifest.json'), 'utf8'), contents);
    const sw = await readFile(path.join(outDir, 'sw.js'), 'utf8');
    const config = JSON.parse(sw.match(/const BUILD = (\{[^\n]+\});/)[1]);
    assert.ok(!config.assets.some(([name]) => name === '/manifest.json'));
  }
  const before = await generatePwa({ outDir, siteUrl: 'https://drava.click' });
  assert.notEqual((await generatePwa({ outDir, siteUrl: 'https://preview.example' })).version, before.version);
});

test('publication origin uses the configured default and rejects unsafe URLs before writing output', async (t) => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });
  const outDir = await buildFixture(t);
  process.env.NEXT_PUBLIC_SITE_URL = 'https://configured.example';
  await generatePwa({ outDir, basePath: '/app' });
  assert.equal(JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8')).related_applications[0].id, 'https://configured.example/app/');
  delete process.env.NEXT_PUBLIC_SITE_URL;
  await generatePwa({ outDir, basePath: '' });
  assert.equal(JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8')).related_applications[0].id, 'https://drava.click/');
  const manifest = await readFile(path.join(outDir, 'manifest.json'), 'utf8');
  const sw = await readFile(path.join(outDir, 'sw.js'), 'utf8');
  for (const siteUrl of ['', null, 1, 'not-a-url', '/relative/', 'file:///tmp/app', 'javascript:alert(1)', 'ftp://example.com/', 'https://user@example.com', 'https://user:pass@example.com', 'https://@example.com/', 'https://example.com/?key=value', 'https://example.com/#private', 'https://example.com/?', 'https://example.com/#', ' https://example.com/', 'https://example.com/\n']) {
    await assert.rejects(generatePwa({ outDir, siteUrl }), /Invalid PWA site URL/);
    assert.equal(await readFile(path.join(outDir, 'manifest.json'), 'utf8'), manifest);
    assert.equal(await readFile(path.join(outDir, 'sw.js'), 'utf8'), sw);
  }
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
  assert.equal(manifest.id, '/');
  assert.equal(manifest.prefer_related_applications, false);
  assert.deepEqual(manifest.related_applications, [{ platform: 'webapp', url: './manifest.json', id: 'https://drava.click/' }]);
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const name of [manifest.start_url, manifest.scope, ...manifest.icons.map((icon) => icon.src)]) assert.ok(new URL(name, 'https://example.com/sites/drava/manifest.json').pathname.startsWith('/sites/drava/'));
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
