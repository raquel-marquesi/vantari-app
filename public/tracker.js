/*!
 * Vantari Lead Tracker v1.0
 * Substitui o RD Station Lead Tracking.
 *
 * Instalação (colar antes do </body>):
 *   <script async src="https://app.vantari.com.br/tracker.js"
 *           data-endpoint="https://[PROJECT].supabase.co/functions/v1/track"></script>
 *
 * Identificar um lead programaticamente (após login/form):
 *   Vantari.identify({ email: "lead@x.com" })
 *   Vantari.identify({ lead_id: "uuid" })
 *
 * Disparar visita manual:
 *   Vantari.track()           // página atual
 *   Vantari.track("/outra")   // path customizado
 */
(function () {
  "use strict";

  // ───── Config ─────
  // Reserva fixa do endpoint: plugins de cache (ex. LiteSpeed Cache com
  // "Combine JS"/"Load JS Deferred") reescrevem a página combinando scripts
  // num bundle só. Isso faz `document.currentScript` deixar de apontar pra
  // tag original com o atributo data-endpoint (e o fallback por "último
  // <script> da página" pega o bundle combinado, que também não tem o
  // atributo) — o tracker morria silenciosamente em qualquer página com
  // esse tipo de otimização ativa, mesmo respondendo 200 OK normalmente.
  // Com a reserva abaixo, o data-endpoint da tag continua tendo prioridade
  // (permite trocar de projeto Supabase sem precisar reeditar este arquivo),
  // mas se não achar, usa o endereço de produção direto.
  var FALLBACK_ENDPOINT = "https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/track";
  var script      = document.currentScript || (function(){var s=document.getElementsByTagName("script");return s[s.length-1];})();
  var endpointAttr = script && script.getAttribute("data-endpoint");
  var endpoint = endpointAttr || FALLBACK_ENDPOINT;

  // Origem do app (mesma lógica do forms-embed.js): usada pra montar o
  // iframe /f/:slug do pop-up sem precisar hardcodar o domínio aqui.
  // Só confia em script.src quando achou o data-endpoint na tag — mesmo
  // motivo do FALLBACK_ENDPOINT acima: em páginas com "Combine JS" o
  // `script` capturado é o bundle combinado do plugin de cache, cujo .src
  // aponta pro domínio do WordPress, não do app.
  var FALLBACK_APP_ORIGIN = "https://vantari-app.vercel.app";
  var appOrigin = (function () {
    if (!endpointAttr) return FALLBACK_APP_ORIGIN;
    try { return new URL(script.src).origin; } catch (e) { return FALLBACK_APP_ORIGIN; }
  })();

  var COOKIE_NAME    = "_vantari_vid";
  var IDENTIFY_KEY   = "_vantari_id";
  var COOKIE_DAYS    = 365 * 2;
  var HEARTBEAT_SEC  = 30;
  var POPUP_SEEN_PREFIX = "_vantari_popup_seen_";

  // ───── Utils ─────
  function uid() {
    return "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function readCookie(name) {
    var m = document.cookie.match("(^|;)\\s*" + name + "=([^;]+)");
    return m ? decodeURIComponent(m[2]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days*864e5);
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function getVisitorId() {
    var vid = readCookie(COOKIE_NAME);
    if (!vid) { vid = uid(); setCookie(COOKIE_NAME, vid, COOKIE_DAYS); }
    return vid;
  }
  function getIdentity() {
    try { return JSON.parse(localStorage.getItem(IDENTIFY_KEY) || "{}"); }
    catch { return {}; }
  }
  function setIdentity(obj) {
    try { localStorage.setItem(IDENTIFY_KEY, JSON.stringify(obj)); } catch {}
  }
  function parseUTM() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source:   p.get("utm_source")   || undefined,
      utm_medium:   p.get("utm_medium")   || undefined,
      utm_campaign: p.get("utm_campaign") || undefined,
      utm_content:  p.get("utm_content")  || undefined,
      utm_term:     p.get("utm_term")     || undefined,
    };
  }
  // fbclid da URL + cookies _fbp/_fbc que o Meta Pixel (já instalado nas
  // LPs) seta sozinho no navegador — hoje nada do lado do Vantari lia ou
  // gravava isso, então se perdia pra sempre depois da sessão. _fbc é o
  // que a Conversions API espera em user_data; se o Pixel ainda não tiver
  // gravado o cookie (race condition no primeiro load), cai pro fallback
  // montado a partir do fbclid cru, no formato que a própria Meta usa.
  function parseFbIds() {
    var fbclid = new URLSearchParams(window.location.search).get("fbclid") || undefined;
    var fbp = readCookie("_fbp") || undefined;
    var fbc = readCookie("_fbc") || (fbclid ? ("fb.1." + Date.now() + "." + fbclid) : undefined);
    return { fbclid: fbclid, fbp: fbp, fbc: fbc };
  }
  function send(payload) {
    try {
      var body = JSON.stringify(payload);
      // fetch(keepalive) em vez de sendBeacon: sendBeacon falha silenciosamente
      // em alguns cenários de CORS/rede local (ex.: localhost <-> 127.0.0.1) sem
      // reportar erro algum. fetch com keepalive sobrevive à navegação da mesma
      // forma, mas negocia CORS corretamente e é mais confiável.
      // Devolve a resposta em JSON (usada por track() pra ler a config do
      // pop-up devolvida pela Edge Function) — se falhar, resolve null.
      return fetch(endpoint, {
        method: "POST",
        mode: "cors",
        keepalive: true,
        headers: { "Content-Type": "application/json", "X-Visitor-Id": payload.visitor_id },
        body: body,
      }).then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; /* swallow network errors */ });
    } catch (e) { return Promise.resolve(null); /* swallow */ }
  }

  // ───── Track + Heartbeat ─────
  var startedAt = Date.now();
  function track(pathOverride) {
    var id  = getIdentity();
    var utm = parseUTM();
    var fb  = parseFbIds();
    var url = pathOverride
      ? (location.hostname + pathOverride)
      : (location.hostname + location.pathname);
    send({
      url:        url,
      referrer:   document.referrer || undefined,
      visitor_id: getVisitorId(),
      email:      id.email   || undefined,
      lead_id:    id.lead_id || undefined,
      user_agent: navigator.userAgent,
      utm_source:   utm.utm_source,
      utm_medium:   utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content:  utm.utm_content,
      utm_term:     utm.utm_term,
      fbclid:       fb.fbclid,
      fbp:          fb.fbp,
      fbc:          fb.fbc,
    }).then(handleTrackResponse);
  }
  function heartbeat() {
    var id = getIdentity();
    send({
      url:        location.hostname + location.pathname,
      visitor_id: getVisitorId(),
      email:      id.email   || undefined,
      lead_id:    id.lead_id || undefined,
      duration_s: Math.floor((Date.now() - startedAt)/1000),
    });
  }

  // ───── Pop-ups (Etapa 5) ─────
  // A Edge Function /track já resolve a tracked_page de cada visita — se ela
  // tiver popup_enabled, devolve a config junto da resposta, sem endpoint
  // novo. Reaproveita o formulário público /f/:slug dentro de um iframe.
  var popupArmed   = false;
  var popupTimer   = null;
  var popupPending = null;

  function popupSeenKey(pageId) { return POPUP_SEEN_PREFIX + pageId; }
  function popupRecentlySeen(pageId, days) {
    try {
      var last = parseInt(localStorage.getItem(popupSeenKey(pageId)), 10);
      return !!last && (Date.now() - last) < (days * 86400000);
    } catch (e) { return false; }
  }
  function markPopupSeen(pageId) {
    try { localStorage.setItem(popupSeenKey(pageId), String(Date.now())); } catch (e) {}
  }

  function closePopup() {
    if (popupTimer) { clearTimeout(popupTimer); popupTimer = null; }
    document.removeEventListener("mouseout", onExitIntent);
    var el = document.getElementById("vantari-popup-overlay");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showPopup(cfg) {
    if (document.getElementById("vantari-popup-overlay")) return; // já aberto
    markPopupSeen(cfg.page_id);

    var overlay = document.createElement("div");
    overlay.id = "vantari-popup-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(14,26,36,.55);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;";
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closePopup(); });

    var box = document.createElement("div");
    box.style.cssText = "position:relative;width:100%;max-width:480px;background:#fff;border-radius:14px;box-shadow:0 20px 60px -12px rgba(0,0,0,.35);overflow:hidden;max-height:90vh;";

    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Fechar");
    closeBtn.style.cssText = "position:absolute;top:8px;right:10px;width:28px;height:28px;border:none;border-radius:50%;background:rgba(14,26,36,.08);color:#0E1A24;font-size:18px;line-height:1;cursor:pointer;z-index:1;";
    closeBtn.onclick = closePopup;

    var iframe = document.createElement("iframe");
    iframe.src = appOrigin + "/f/" + encodeURIComponent(cfg.form_slug) + location.search;
    iframe.style.cssText = "width:100%;height:520px;border:0;display:block;";
    iframe.setAttribute("title", "Formulário Vantari");

    box.appendChild(closeBtn);
    box.appendChild(iframe);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function onExitIntent(e) {
    // só dispara quando o mouse sai pelo topo da janela (indo em direção à
    // barra de endereço/abas) — evita abrir ao simplesmente sair pelas
    // laterais ou rodapé da página.
    if (e.clientY > 0) return;
    document.removeEventListener("mouseout", onExitIntent);
    showPopup(popupPending);
  }

  function armPopup(cfg) {
    if (!cfg || popupArmed) return;
    popupArmed = true;
    if (popupRecentlySeen(cfg.page_id, cfg.frequency_days || 7)) return;
    popupPending = cfg;
    if (cfg.trigger === "exit_intent") {
      document.addEventListener("mouseout", onExitIntent);
    } else {
      popupTimer = setTimeout(function () { showPopup(cfg); }, (cfg.trigger_value || 15) * 1000);
    }
  }

  function handleTrackResponse(data) {
    if (data && data.popup) armPopup(data.popup);
  }

  // Fecha o pop-up sozinho quando o formulário dentro do iframe é enviado
  // com sucesso (vantari-public-form.jsx manda esse postMessage). Precisa
  // de postMessage porque o iframe é de outro domínio — não dá pra ler o
  // DOM dele direto.
  window.addEventListener("message", function (event) {
    if (event.origin !== appOrigin) return;
    if (event.data && event.data.type === "vantari:form-submitted") closePopup();
  });

  // ───── SPA support (history change) ─────
  var lastPath = location.pathname;
  function patchHistory(method) {
    var orig = history[method];
    history[method] = function() {
      var r = orig.apply(this, arguments);
      window.dispatchEvent(new Event("vantari:locationchange"));
      return r;
    };
  }
  patchHistory("pushState"); patchHistory("replaceState");
  window.addEventListener("popstate", function(){ window.dispatchEvent(new Event("vantari:locationchange")); });
  window.addEventListener("vantari:locationchange", function() {
    if (location.pathname !== lastPath) {
      lastPath  = location.pathname;
      startedAt = Date.now();
      popupArmed = false;
      closePopup();
      track();
    }
  });

  // ───── API pública ─────
  window.Vantari = {
    identify: function(data) {
      var cur = getIdentity();
      setIdentity(Object.assign({}, cur, data || {}));
      // re-track pra associar a visita atual ao lead recém-identificado
      track();
    },
    reset: function() { setIdentity({}); },
    track: track,
  };

  // ───── Boot ─────
  // Chamar `track` direto como listener passa o objeto Event como
  // pathOverride (addEventListener injeta o evento como 1º argumento) —
  // isso corrompia a url gravada pra "hostname[object Event]" em toda
  // primeira visita que carregava com o DOM ainda em parsing.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { track(); });
  } else {
    track();
  }
  setInterval(heartbeat, HEARTBEAT_SEC * 1000);
  window.addEventListener("beforeunload", heartbeat);
})();
