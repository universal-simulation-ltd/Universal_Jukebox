// Pulled into the generated service worker (`workbox.importScripts` in
// vite.config.ts). A song's notification shown through the worker —
// `src/lib/trackNotify.ts`, on Chrome for Android and on a Home Screen web app
// — has no page to answer its tap, so the worker brings the player forward.
//
// ⚠️ Plain script, not a module: `importScripts` cannot load ES modules, and
// the worker Workbox generates is a classic one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w)
      return open ? open.focus() : self.clients.openWindow(self.registration.scope)
    }),
  )
})
