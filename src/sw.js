import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim()
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => Promise.all(
        clients.map(client => {
          try { return client.navigate(client.url); } catch { return Promise.resolve(); }
        })
      ))
  );
});

// HTML toujours récupéré depuis le réseau en priorité
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ networkTimeoutSeconds: 3, cacheName: 'html-cache' })
);

// Supabase : NetworkFirst
registerRoute(
  /^https:\/\/aiesvzdvlownkcjbkgjv\.supabase\.co\/.*/i,
  new NetworkFirst({ networkTimeoutSeconds: 10, cacheName: 'supabase-cache' })
);
