// Apply the visual preference before the document body is painted.
// Only a whitelisted theme name is stored; no customer or payment data.
(() => {
  let preference = 'system'
  try {
    const saved = localStorage.getItem('drava-theme')
    if (saved === 'light' || saved === 'dark') preference = saved
  } catch { /* Storage is optional. */ }
  const dark = preference === 'dark'
    || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.theme = preference
  root.style.colorScheme = dark ? 'dark' : 'light'
})()
