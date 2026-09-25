import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installTopInset } from './ui/fullHeight'
import { installSync } from './sync/sync'

installTopInset()
installSync()

// Installed to a Home Screen, the app is mostly resumed rather than relaunched,
// and a service worker only looks for a new version when the page loads. An
// iPad left open for days kept showing a build from before the fixes it was
// being checked against. Looking again whenever the app comes back to the front
// means the next real launch opens the version that is live. It does not reload
// the page, so nothing is lost mid-lesson; offline, the check simply fails.
if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
