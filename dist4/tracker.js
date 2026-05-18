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
  var script   = document.currentScript || (function(){var s=document.getElementsByTagName("script");return s[s.length-1];})();
  var endpoint = script && script.getAttribute("data-endpoint");
  if (!endpoint) { console.warn("[Vantari] data-endpoint missing"); return; }

  var COOKIE_NAME    = "_vantari_vid";
  var IDENTIFY_KEY   = "_vantari_id";
  var COOKIE_DAYS    = 365 * 2;
  var HEARTBEAT_SEC  = 30;

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
  function send(payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Visitor-Id": payload.visitor_id },
          body: body, keepalive: true,
        });
      }
    } catch (e) { /* swallow */ }
  }

  // ───── Track + Heartbeat ─────
  var startedAt = Date.now();
  function track(pathOverride) {
    var id  = getIdentity();
    var utm = parseUTM();
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
    });
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", track);
  } else {
    track();
  }
  setInterval(heartbeat, HEARTBEAT_SEC * 1000);
  window.addEventListener("beforeunload", heartbeat);
})();
