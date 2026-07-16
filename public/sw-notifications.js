self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { mensagem: event.data ? event.data.text() : '' };
  }

  const title = payload.titulo || payload.title || 'SMST Caninde';
  const options = {
    body: payload.mensagem || payload.body || '',
    icon: payload.icon || '/pwa-icon-192.png',
    badge: payload.badge || '/pwa-icon-192.png',
    tag: payload.notificationId || payload.id || `smst-${Date.now()}`,
    renotify: true,
    silent: false,
    data: {
      url: payload.link || payload.url || '/admin/dashboard',
      notificationId: payload.notificationId || payload.id || null,
      payload,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin/dashboard';
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'SMST_NOTIFICATION_CLICK',
            notificationId: event.notification.tag,
            url,
          });
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    }),
  );
});
