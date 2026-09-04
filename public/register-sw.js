const registrationScriptUrl = document.currentScript?.src

if ('serviceWorker' in navigator && registrationScriptUrl) {
  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL('sw.js', registrationScriptUrl)
    const scope = new URL('./', registrationScriptUrl).pathname

    navigator.serviceWorker.register(serviceWorkerUrl, { scope, updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Service worker registration failed:', error))
  })
}
