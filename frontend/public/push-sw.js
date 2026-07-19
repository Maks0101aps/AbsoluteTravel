/* Web Push handlers, imported into the Workbox-generated service worker via
   `workbox.importScripts` in vite.config.ts. Runs in the SW global scope, so it
   works even when no app tab is open — that's the whole point of push. */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Absolute Travel';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || undefined,
    // With a tag set, replace the previous same-tag notification and re-alert.
    renotify: !!data.tag,
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an already-open tab (and route it) rather than opening a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              client.navigate(url);
            } catch (e) {
              /* cross-origin or not allowed — just focus */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
