(() => {
  let appId = "/";
  try {
    appId = new URL(".", document.currentScript.src).pathname;
  } catch { /* Root scope also supports inline test environments. */ }
  const installedKey = `drava-pwa-installed:${appId}`;
  const remember = (installed) => {
    window.__dravaInstalled = installed;
    try {
      if (installed) window.localStorage.setItem(installedKey, "1");
      else window.localStorage.removeItem(installedKey);
    } catch { /* Keep the in-memory signal if storage is unavailable. */ }
  };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    // A fresh native offer means this browser can install the app again.
    remember(false);
    window.__dravaInstallPrompt = event;
    window.dispatchEvent(new Event("drava:install-prompt-ready"));
  });
  window.addEventListener("appinstalled", () => {
    remember(true);
    window.__dravaInstallPrompt = null;
    window.dispatchEvent(new Event("drava:install-state-change"));
  });
})();
