/* 주문 상태 웹 푸시 - 푸시 이벤트 시 알림 표시 */
self.addEventListener('push', function (event) {
  if (!event.data) return;
  let payload = { title: '알림', body: '' };
  try {
    payload = event.data.json();
  } catch (_) {
    payload.body = event.data.text();
  }
  const options = {
    body: payload.body,
    icon: '/images/coffee_americano.png',
    badge: '/images/coffee_americano.png',
    tag: 'order-' + (payload.tag || Date.now()),
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(payload.title || '알림', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (self.clients.openWindow) {
        const url = '/';
        const focused = clientList.find(function (c) { return c.url.includes(url) && 'focus' in c; });
        if (focused) focused.focus();
        else self.clients.openWindow('/');
      }
    })
  );
});
