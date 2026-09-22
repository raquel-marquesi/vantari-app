/*!
 * Vantari Web Push — Service Worker
 *
 * ⚠️ Este arquivo precisa estar hospedado na RAIZ do domínio onde os
 * visitantes vão receber a notificação (ex: https://vantari.com.br/vantari-push-sw.js).
 * Não basta linkar como <script src="...">, como o tracker.js — um Service
 * Worker só controla páginas da MESMA origem de onde ele foi servido, então
 * precisa ser um arquivo de verdade na raiz do vantari.com.br (upload via
 * WordPress/FTP), não pode ficar só em app.vantari.com.br.
 *
 * Instalação completa: ver docs/WEB_PUSH.md.
 */

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

// Alguns navegadores renovam a inscrição sozinhos (ex: troca de chave do
// provedor de push) e disparam esse evento — sem isso, a inscrição some
// silenciosamente do lado do navegador mas continua "ativa" no banco do
// Vantari, e os envios futuros pra ela sempre falhariam. Resubscreve com a
// mesma chave VAPID e manda direto pro push-subscribe (upsert por endpoint).
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
