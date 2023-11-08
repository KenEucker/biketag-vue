import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
declare let self: ServiceWorkerGlobalScope

// self.addEventListener('message', (event) => {
//   if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
// })

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)
