(function () {
  "use strict";
  if (window.jsQR) return;
  const sources = [
    "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js"
  ];
  function charger(index) {
    if (window.jsQR || index >= sources.length) return;
    const script = document.createElement("script");
    script.src = sources[index];
    script.defer = true;
    script.referrerPolicy = "no-referrer";
    script.onerror = function () { script.remove(); charger(index + 1); };
    document.head.appendChild(script);
  }
  charger(0);
})();
