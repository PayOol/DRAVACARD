(() => {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__dravaInstallPrompt = event;
    window.dispatchEvent(new Event("drava:install-prompt-ready"));
  });
})();
