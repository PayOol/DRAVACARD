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
  let controlled = navigator.serviceWorker.controller?.scriptURL === workerUrl.href;
  let composing = false;
  let checking = false;
  let registering = false;
  let loaded = document.readyState === 'complete';
  let unlockTimer;
  let cycleTimer;
  let checkTimer;
  let lastChecked = 0;
  let nextAttempt = 0;
  const QUIET_MS = 3000;
  const RETRY_MS = 15000;
  const CHECK_MS = 10 * 60 * 1000;
  let quietUntil = Date.now() + QUIET_MS;
  const edited = new Set();
  const state = { updateAvailable: false, applying: false, offline: navigator.onLine === false, blocked: false, reloadPending: false };
  const snapshot = () => ({ ...state });
  const publish = (change = {}) => {
    Object.assign(state, change);
    window.dispatchEvent(new CustomEvent('drava:pwa-state', { detail: snapshot() }));
  };
  const busy = () => {
    const publicHome = window.location.pathname === scope || window.location.pathname === `${scope}index.html`;
    const safeFragment = !window.location.hash || window.location.hash === '#tiktok';
    const active = document.activeElement;
    for (const element of edited) {
      if (!element.isConnected || !(element.isContentEditable ? element.textContent : element.value)?.trim()) edited.delete(element);
    }
    return composing || edited.size > 0 || externalCheckoutActive || !publicHome || !!window.location.search || !safeFragment ||
      !!document.querySelector('[data-drava-checkout-active="true"], [data-checkout-shell="shared"], [role="dialog"], dialog[open]') ||
      !!active?.isContentEditable || !!active?.matches('input, textarea, select, [contenteditable="true"]');
  };
  const quiet = () => Date.now() >= quietUntil;
  const schedule = (delay = 0) => {
    clearTimeout(cycleTimer);
    if (reloading || state.offline || (!registration?.waiting && !state.reloadPending)) return;
    cycleTimer = setTimeout(() => { void automaticUpdate(); }, Math.max(50, delay, quietUntil - Date.now(), nextAttempt - Date.now()));
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
      nextAttempt = Date.now() + RETRY_MS;
      schedule();
    }, 12000);
  };
  // Coordination never consumes user input. If a form opens after readiness,
  // controllerchange keeps the current document until it can safely refresh.

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.source?.scriptURL !== workerUrl.href) return;
    if (event.data?.type === 'DRAVA_PWA_PREPARE' && event.ports?.[0]) {
      const ready = !state.offline && !state.reloadPending && !busy() && quiet();
      if (ready) lock();
      event.ports[0].postMessage({ ready, automaticReload: true });
    } else if (event.data?.type === 'DRAVA_PWA_RELEASE') {
      release();
      schedule(RETRY_MS);
    }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const nextControlled = navigator.serviceWorker.controller?.scriptURL === workerUrl.href;
    const replaced = controlled && nextControlled;
    controlled = nextControlled;
    requestingUpdate = false;
    release();
    publish({ updateAvailable: false, blocked: false });
    // First installation never reloads. Every updated tab remembers the need
    // to refresh, including when an input or checkout became active meanwhile.
    if (replaced && !reloading) {
      nextAttempt = 0;
      publish({ reloadPending: true });
      schedule();
    }
  });
  window.addEventListener('drava:pwa-checkout', (event) => {
    if (typeof event.detail?.active === 'boolean') externalCheckoutActive = event.detail.active;
    schedule();
  });

  const checkForUpdate = async () => {
    if (!registration || checking || state.offline) return;
    checking = true;
    try {
      await registration.update();
      lastChecked = Date.now();
      publish({ updateAvailable: !!registration.waiting });
    } catch { /* An offline update check never disrupts the current application. */ }
    finally { checking = false; schedule(); }
  };
  const applyUpdate = async () => {
    if (!registration?.waiting || requestingUpdate || state.applying || state.reloadPending || state.offline || busy() || !quiet()) {
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
      try { waiting.postMessage({ type: 'DRAVA_PWA_APPLY_UPDATE', automatic: true }, [channel.port2]); }
      catch { finish(false); }
    });
    if (!ok && !reloading) {
      requestingUpdate = false; release(); publish({ blocked: true });
      nextAttempt = Date.now() + RETRY_MS;
      schedule();
    }
    return ok;
  };
  const automaticUpdate = async () => {
    if (reloading || state.offline) return;
    if (busy() || !quiet()) { schedule(RETRY_MS); return; }
    if (state.reloadPending) {
      reloading = true;
      window.location.reload();
      return;
    }
    if (requestingUpdate || state.applying) return;
    if (registration?.waiting) await applyUpdate();
  };
  window.dravaPwa = Object.freeze({ getState: snapshot, applyUpdate, checkForUpdate });
  publish();

  const register = async () => {
    if (registration || registering || !loaded || state.offline) return;
    registering = true;
    try {
      registration = await navigator.serviceWorker.register(workerUrl, { scope, updateViaCache: 'none' });
      lastChecked = Date.now();
      publish({ updateAvailable: !!registration.waiting });
      schedule();
      const watched = new WeakSet();
      const watchInstalling = () => {
        const installing = registration.installing;
        if (!installing || watched.has(installing)) return;
        watched.add(installing);
        const installed = () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            publish({ updateAvailable: !!registration.waiting });
            schedule();
          }
        };
        installing.addEventListener('statechange', installed);
        installed();
      };
      registration.addEventListener('updatefound', watchInstalling);
      watchInstalling();
    } catch { /* Registration failure must not block browsing or payment. */ }
    finally { registering = false; }
  };
  if (loaded) void register();
  else window.addEventListener('load', () => { loaded = true; void register(); }, { once: true });
  const checkIfStale = () => {
    if (document.visibilityState === 'visible') {
      if (!registration) void register();
      else if (Date.now() - lastChecked >= CHECK_MS) void checkForUpdate();
    }
    schedule();
  };
  const activity = () => { quietUntil = Date.now() + QUIET_MS; schedule(); };
  for (const type of ['pointerdown', 'keydown', 'scroll', 'focusin', 'focusout']) document.addEventListener(type, activity, { capture: true, passive: true });
  const edit = (event) => {
    const target = event.target;
    if (target?.matches('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea, [contenteditable]')) edited.add(target);
    activity();
  };
  document.addEventListener('input', edit, true);
  document.addEventListener('change', edit, true);
  document.addEventListener('compositionstart', () => { composing = true; activity(); });
  document.addEventListener('compositionend', () => { composing = false; activity(); });
  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-drava-checkout-active', 'data-state', 'role', 'open'] });
  document.addEventListener('visibilitychange', checkIfStale);
  window.addEventListener('pageshow', checkIfStale);
  window.addEventListener('popstate', () => { activity(); });
  window.addEventListener('hashchange', () => { activity(); });
  window.addEventListener('online', () => { publish({ offline: false }); checkIfStale(); });
  window.addEventListener('offline', () => { publish({ offline: true }); clearTimeout(cycleTimer); });
  const periodicCheck = () => { checkIfStale(); checkTimer = setTimeout(periodicCheck, CHECK_MS); };
  checkTimer = setTimeout(periodicCheck, CHECK_MS);
  window.addEventListener('pagehide', () => { clearTimeout(cycleTimer); clearTimeout(checkTimer); });
  window.addEventListener('pageshow', () => { clearTimeout(checkTimer); checkTimer = setTimeout(periodicCheck, CHECK_MS); });
})();
