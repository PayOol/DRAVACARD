const registrationScriptUrl = document.currentScript?.src

if ('serviceWorker' in navigator && registrationScriptUrl) {
  const registerServiceWorker = () => {
    const serviceWorkerUrl = new URL('sw.js', registrationScriptUrl)
    const scope = new URL('./', registrationScriptUrl).pathname

    navigator.serviceWorker.register(serviceWorkerUrl, { scope, updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Service worker registration failed:', error))
  }

  // next/script lazyOnload can execute after the load event has already fired.
  if (document.readyState === 'complete') {
    registerServiceWorker()
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true })
  }
}
