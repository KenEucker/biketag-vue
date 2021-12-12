import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)
