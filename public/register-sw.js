(() => {
  const scriptUrl = document.currentScript?.src;
  const enabled = document.currentScript?.dataset.enabled;
  if (!scriptUrl || !('serviceWorker' in navigator) || !window.isSecureContext || window.dravaPwa) return;
  const script = new URL(scriptUrl);
  if (script.origin !== window.location.origin) return;
  const workerUrl = new URL('sw.js', script);
  const scope = new URL('./', script).pathname;
  if (enabled !== 'true') {
    // A previously installed production worker must not pin a localhost dev
    // session. Touch only this exact DRAVA registration and its scoped caches.
    if (enabled === 'false' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      void (async () => {
        const previous = await navigator.serviceWorker.getRegistration(scope);
        const workers = previous ? [previous.active, previous.waiting, previous.installing].filter(Boolean) : [];
        if (!previous || previous.scope !== new URL(scope, script).href || !workers.length || workers.some((worker) => worker.scriptURL !== workerUrl.href)) return;
        if (!await previous.unregister()) return;
        const basePath = scope.slice(0, -1);
        const prefix = `drava-public-v5:${encodeURIComponent(basePath || '/')}:`;
        for (const name of await caches.keys()) {
          const legacy = /^drava-public-v[1-4]-(.*)$/.exec(name)?.[1] === (basePath || 'root');
          if (legacy || name.startsWith(prefix)) await caches.delete(name);
        }
      })().catch(() => undefined);
    }
    return;
  }
  let registration;
  let externalCheckoutActive = false;
  let requestingUpdate = false;
  let reloading = false;
  let unlockTimer;
  let lastChecked = 0;
  const state = { updateAvailable: false, applying: false, offline: navigator.onLine === false, blocked: false };
  const snapshot = () => ({ ...state });
  const publish = (change = {}) => {
    Object.assign(state, change);
    window.dispatchEvent(new CustomEvent('drava:pwa-state', { detail: snapshot() }));
  };
  const busy = () => {
    const publicHome = window.location.pathname === scope || window.location.pathname === `${scope}index.html`;
    const safeFragment = !window.location.hash || window.location.hash === '#tiktok' || /^#card:[a-z0-9-]+$/.test(window.location.hash);
    const active = document.activeElement;
    return externalCheckoutActive || !publicHome || !!window.location.search || !safeFragment ||
      !!document.querySelector('[data-drava-checkout-active="true"], [data-checkout-shell="shared"], [role="dialog"], dialog[open]') ||
      !!active?.matches('input, textarea, select, [contenteditable="true"]');
  };
  const release = () => {
    clearTimeout(unlockTimer);
    document.documentElement.removeAttribute('data-drava-pwa-updating');
    publish({ applying: false });
  };
  const lock = () => {
    document.documentElement.setAttribute('data-drava-pwa-updating', 'true');
    publish({ applying: true, blocked: false });
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => {
      requestingUpdate = false;
      release();
      publish({ blocked: true });
    }, 12000);
  };
  // A brief coordination lock closes the race between checking an idle tab and
  // activation. No form values, routes or order details are sent to the worker.
  const guardInteraction = (event) => {
    if (!state.applying) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  for (const type of ['pointerdown', 'click', 'keydown', 'submit']) document.addEventListener(type, guardInteraction, true);

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.source?.scriptURL !== workerUrl.href) return;
    if (event.data?.type === 'DRAVA_PWA_PREPARE' && event.ports?.[0]) {
      const ready = !busy();
      if (ready) lock();
      event.ports[0].postMessage({ ready });
    } else if (event.data?.type === 'DRAVA_PWA_RELEASE') release();
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // First installation, another tab's update and ordinary controller changes
    // never reload this page. Only this tab's explicit action can do so.
    const reload = requestingUpdate && !reloading && !busy();
    requestingUpdate = false;
    if (reload) reloading = true;
    release();
    publish({ updateAvailable: false, blocked: false });
    if (reload) window.location.reload();
  });
  window.addEventListener('drava:pwa-checkout', (event) => {
    if (typeof event.detail?.active === 'boolean') externalCheckoutActive = event.detail.active;
  });

  const checkForUpdate = async () => {
    if (!registration || state.offline || busy()) return;
    lastChecked = Date.now();
    try {
      await registration.update();
      publish({ updateAvailable: !!registration.waiting });
    } catch { /* An offline update check never disrupts the current application. */ }
  };
  const applyUpdate = async () => {
    if (!registration?.waiting || requestingUpdate || state.applying || state.offline || busy()) {
      publish({ blocked: true }); return false;
    }
    requestingUpdate = true;
    lock();
    const waiting = registration.waiting;
    const ok = await new Promise((resolve) => {
      const channel = new MessageChannel();
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true; clearTimeout(timeout); channel.port1.close(); resolve(result);
      };
      const timeout = setTimeout(() => finish(false), 6000);
      channel.port1.onmessage = (event) => finish(event.data?.ok === true);
      try { waiting.postMessage({ type: 'DRAVA_PWA_APPLY_UPDATE' }, [channel.port2]); }
      catch { finish(false); }
    });
    if (!ok && !reloading) {
      requestingUpdate = false; release(); publish({ blocked: true });
    }
    return ok;
  };
  window.dravaPwa = Object.freeze({ getState: snapshot, applyUpdate, checkForUpdate });
  publish();

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register(workerUrl, { scope, updateViaCache: 'none' });
      lastChecked = Date.now();
      publish({ updateAvailable: !!registration.waiting });
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) publish({ updateAvailable: !!registration.waiting });
        });
      });
    } catch { /* Registration failure must not block browsing or payment. */ }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', () => { void register(); }, { once: true });
  const checkIfStale = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastChecked > 10 * 60 * 1000) void checkForUpdate();
  };
  document.addEventListener('visibilitychange', checkIfStale);
  window.addEventListener('online', () => { publish({ offline: false }); checkIfStale(); });
  window.addEventListener('offline', () => publish({ offline: true }));
})();
