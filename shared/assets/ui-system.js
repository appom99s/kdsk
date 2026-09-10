(function () {
  "use strict";
  // L'application utilise exclusivement le thème clair de la maquette KADOSK.
  delete document.documentElement.dataset.theme;
  try { localStorage.removeItem("kadosk_ui_theme"); } catch (_) {}

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.lang = document.documentElement.lang || "fr";

    document.querySelectorAll("input, select, textarea").forEach(function (field) {
      if (!field.id) return;
      const label = document.querySelector('label[for="' + CSS.escape(field.id) + '"]');
      if (!label) {
        const nearby = field.closest(".k2-champ, .kadosk-champ, .form-group");
        const implicit = nearby && nearby.querySelector("label");
        if (implicit && !implicit.htmlFor) implicit.htmlFor = field.id;
      }
      field.addEventListener("invalid", function () { field.setAttribute("aria-invalid", "true"); });
      field.addEventListener("input", function () { field.removeAttribute("aria-invalid"); });
    });

    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener"); rel.add("noreferrer");
      link.setAttribute("rel", Array.from(rel).join(" "));
    });

  });
})();
