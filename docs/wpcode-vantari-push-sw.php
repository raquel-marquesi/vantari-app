<?php
/**
 * Vantari Web Push — Service Worker via WPCode
 * ─────────────────────────────────────────────
 * Cola esse código como um snippet PHP no WPCode (mesmo plugin já usado
 * pro tracker.js). Ele faz o WordPress responder em
 * https://vantari.com.br/vantari-push-sw.js com o conteúdo do Service
 * Worker — sem precisar subir nenhum arquivo por FTP.
 *
 * Se algum dia o conteúdo do Service Worker mudar (ver
 * public/vantari-push-sw.js no repositório do código), é só colar a
 * versão nova aqui dentro do heredoc <<<'JS' ... JS e salvar de novo.
 */
add_action('init', function () {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if ($path !== '/vantari-push-sw.js') {
        return;
    }

    header('Content-Type: application/javascript; charset=utf-8');
    header('Cache-Control: no-cache');

    echo <<<'JS'
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* payload não era JSON — ignora */ }

  var title = data.title || "Vantari";
  var options = {
    body: data.body || "",
    icon: data.icon || "https://vantari.com.br/wp-content/uploads/favicon.png",
    badge: data.badge || undefined,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

var PUSH_SUBSCRIBE_ENDPOINT = "https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/push-subscribe";

self.addEventListener("pushsubscriptionchange", function (event) {
  var oldKey = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(oldKey ? { applicationServerKey: oldKey, userVisibleOnly: true } : { userVisibleOnly: true })
      .then(function (subscription) {
        var json = subscription.toJSON();
        return fetch(PUSH_SUBSCRIBE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
      })
      .catch(function () { /* sem chave antiga disponível — resubscreve na próxima visita via Vantari.enablePush() */ })
  );
});
JS;
    exit;
});
