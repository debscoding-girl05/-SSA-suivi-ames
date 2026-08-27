// Service worker minimal — uniquement pour les notifications push (pas de
// cache offline). Reçoit un JSON { title, body, url } envoyé par le serveur
// (voir server/src/utils/push.js).

self.addEventListener('push', (event) => {
  let data = { title: 'Suivi des Âmes', body: 'Nouvelle notification.', url: '/notifications' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Payload non-JSON — on garde le message par défaut plutôt que de planter.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
