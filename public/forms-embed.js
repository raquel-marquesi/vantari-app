/*!
 * Vantari Forms Embed Snippet
 * Uso: <script async src="https://vantari-app.vercel.app/forms-embed.js" data-form="newsletter"></script>
 * Injeta um iframe responsivo com o formulário do Vantari no site externo.
 */
(function () {
  "use strict";

  var SCRIPT = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  if (!SCRIPT) return;

  var SLUG = SCRIPT.getAttribute("data-form");
  if (!SLUG) {
    console.warn("[Vantari Forms] missing data-form attribute");
    return;
  }

  // Detecta a origem do próprio script (ex.: https://vantari-app.vercel.app)
  var ORIGIN = (function () {
    try {
      var u = new URL(SCRIPT.src);
      return u.origin;
    } catch (e) {
      return "https://vantari-app.vercel.app";
    }
  })();

  // Forward UTMs/referrer da página hospedeira para o iframe
  var search = window.location.search || "";
  var iframeSrc = ORIGIN + "/f/" + encodeURIComponent(SLUG) + search;

  var container = document.createElement("div");
  container.style.cssText = "width:100%;max-width:520px;margin:0 auto;";

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.loading = "lazy";
  iframe.style.cssText = "width:100%;min-height:520px;border:0;display:block;";
  iframe.setAttribute("title", "Formulário Vantari");
  iframe.setAttribute("allow", "clipboard-write");

  container.appendChild(iframe);

  // Insere logo após o script tag
  if (SCRIPT.parentNode) {
    SCRIPT.parentNode.insertBefore(container, SCRIPT.nextSibling);
  } else {
    document.body.appendChild(container);
  }

  // Permite que o iframe peça redimensionamento via postMessage
  window.addEventListener("message", function (event) {
    if (event.origin !== ORIGIN) return;
    if (event.data && event.data.type === "vantari:form-resize" && typeof event.data.height === "number") {
      iframe.style.height = (event.data.height + 8) + "px";
    }
  });
})();
