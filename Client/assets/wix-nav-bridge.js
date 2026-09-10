/* Pont de routage bidirectionnel KADOSK <-> Wix. Wix reste propriétaire de
 * l'URL publique; les URLs techniques existantes restent inchangées. */
(function () {
  "use strict";
  const ORIGINES_WIX = new Set(["https://www.kadosk.com", "https://kadosk.com"]);
  function origineCible() {
    try {
      const origineParente = new URL(document.referrer).origin;
      if (ORIGINES_WIX.has(origineParente)) return origineParente;
    } catch (_) { /* referrer absent : domaine canonique ci-dessous */ }
    return "https://www.kadosk.com";
  }
  const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const RE_ID = /^[A-Za-z0-9_-]{1,128}$/;
  const RE_REFERENCE = /^[A-Za-z0-9_-]{1,80}$/;
  const ROUTES_FIXES = {
    boutique: "boutique-client.html", panier: "etape-3-recap.html",
    "mes-commandes": "mes-commandes.html",
    "mes-cartes": "mes-commandes.html?vue=cartes", favoris: "favoris.html",
    compte: "mon-compte.html"
  };

  function dansIframe() {
    try { return window.self !== window.top; } catch (_) { return true; }
  }
  function slugifier(v) {
    return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 100);
  }
  function fichier(url) {
    const morceaux = url.pathname.split("/");
    return morceaux[morceaux.length - 1] || "boutique-client.html";
  }
  function poster(data) {
    if (dansIframe()) window.parent.postMessage(data, origineCible());
  }

  // Point d'entrée pour les navigations déclenchées par des boutons JavaScript
  // (par exemple le tiroir panier), et pas seulement par des liens <a>.
  window.KADOSK_NAVIGUER_PUBLIC = function (path) {
    const chemins = [
      /^\/panier$/,
      /^\/check-out(?:\?checkoutId=[a-fA-F0-9-]{36})?$/,
      /^\/merchant\/[a-z0-9]+(?:-[a-z0-9]+)*$/
    ];
    if (typeof path !== "string" || !chemins.some(function (re) { return re.test(path); })) return false;
    if (!dansIframe()) return false;
    poster({ type: "KADOSK_NAVIGATE", path: path });
    return true;
  };

  let marchandsPromise;
  function marchands() {
    if (!marchandsPromise) {
      marchandsPromise = Promise.resolve().then(function () {
        return typeof KADOSK_API !== "undefined" && KADOSK_API.getActiveMerchants
          ? KADOSK_API.getActiveMerchants() : { items: [] };
      }).then(function (r) { return Array.isArray(r && r.items) ? r.items : []; })
        .catch(function () { return []; });
    }
    return marchandsPromise;
  }
  async function merchantPourId(id) {
    if (!RE_ID.test(String(id || ""))) return null;
    return (await marchands()).find(function (m) { return String(m.merchantId) === String(id); }) || null;
  }
  async function merchantPourSlug(slug) {
    if (!RE_SLUG.test(String(slug || ""))) return null;
    return (await marchands()).find(function (m) {
      return (m.slug || slugifier(m.businessName || m.name)) === slug;
    }) || null;
  }

  async function routeActuelle() {
    const nom = fichier(window.location), q = new URLSearchParams(window.location.search);
    if (nom === "boutique-client.html" || nom === "categories.html") return "/boutique";
    if (nom === "commercants.html") return q.get("categorie")
      ? "/categorie/" + slugifier(q.get("categorie")) : "/boutique";
    if (nom === "commercant-detail.html") {
      const m = await merchantPourId(q.get("merchantId"));
      return m ? "/merchant/" + (m.slug || slugifier(m.businessName || m.name)) : "/boutique";
    }
    if (nom === "etape-3-recap.html") return "/panier";
    if (nom === "etape-4-destinataire.html") {
      const id = q.get("checkoutId") || "";
      return "/check-out" + (/^[a-f0-9-]{36}$/i.test(id) ? "?checkoutId=" + encodeURIComponent(id) : "");
    }
    if (nom === "mes-commandes.html") return q.get("vue") === "cartes" ? "/mes-cartes" : "/mes-commandes";
    if (nom === "favoris.html") return "/favoris";
    if (nom === "mon-compte.html") return "/compte";
    return null;
  }

  async function cibleInterne(message) {
    if (!message || message.type !== "KADOSK_ROUTE") return null;
    const route = String(message.route || "").replace(/^\/+|\/+$/g, "");
    if (ROUTES_FIXES[route]) return ROUTES_FIXES[route];
    if (route === "checkout" || route === "check-out") {
      const id = String(message.checkoutId || "");
      return "etape-4-destinataire.html" + (/^[a-f0-9-]{36}$/i.test(id) ? "?checkoutId=" + encodeURIComponent(id) : "");
    }
    if (route === "merchant") {
      const slug = String(message.slug || "");
      const m = await merchantPourSlug(slug);
      // merchantId transmis par Wix n'est qu'un indice : le couple est toujours
      // revérifié contre le catalogue actif avant toute navigation/requête.
      if (!m || (message.merchantId && String(message.merchantId) !== String(m.merchantId))) return null;
      return "commercant-detail.html?merchantId=" + encodeURIComponent(m.merchantId);
    }
    if (route === "categorie") {
      const slug = String(message.slug || "");
      if (!RE_SLUG.test(slug)) return null;
      const nom = (await marchands()).map(function (m) { return m.activityCategory || ""; })
        .find(function (c) { return slugifier(c) === slug; });
      return nom ? "commercants.html?categorie=" + encodeURIComponent(nom) : null;
    }
    if (route === "commande" && RE_REFERENCE.test(String(message.reference || ""))) {
      // La référence n'accorde aucun accès; mes-commandes exige toujours le jeton.
      return "mes-commandes.html";
    }
    return null;
  }

  window.addEventListener("message", function (event) {
    if (!ORIGINES_WIX.has(event.origin)) return;
    cibleInterne(event.data).then(function (cible) {
      if (!cible) return poster({ type: "KADOSK_ROUTE_REJECTED" });
      const demandee = new URL(cible, window.location.href);
      if (fichier(demandee) + demandee.search !== fichier(window.location) + window.location.search) {
        window.location.replace(demandee.href);
      }
    }).catch(function () { poster({ type: "KADOSK_ROUTE_REJECTED" }); });
  });

  if (!dansIframe()) return;

  // Navigation initiée par un clic réel dans l'application. On prévient la
  // navigation technique de l'iframe : Wix change d'abord son URL publique, puis
  // le handshake KADOSK_ROUTE charge la bonne fiche dans la nouvelle iframe.
  document.addEventListener("click", function (event) {
    const lien = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!lien || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let url;
    try { url = new URL(lien.href, window.location.href); } catch (_) { return; }
    if (url.origin !== window.location.origin) return;
    const nom = fichier(url);
    if (nom === "etape-3-recap.html") {
      event.preventDefault();
      window.KADOSK_NAVIGUER_PUBLIC("/panier");
      return;
    }
    if (nom !== "commercant-detail.html") return;

    event.preventDefault();
    const cheminDirect = lien.dataset.kadoskPublicPath || "";
    if (/^\/merchant\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cheminDirect)) {
      // Le catalogue a déjà fourni le slug lors de son rendu : aucune seconde
      // requête réseau n'est nécessaire au moment du clic.
      poster({ type: "KADOSK_NAVIGATE", path: cheminDirect });
      return;
    }
    merchantPourId(url.searchParams.get("merchantId")).then(function (m) {
      if (!m) return poster({ type: "KADOSK_ROUTE_REJECTED", reason: "MERCHANT_NOT_FOUND" });
      const slug = m.slug || slugifier(m.businessName || m.name);
      if (!RE_SLUG.test(slug)) return poster({ type: "KADOSK_ROUTE_REJECTED", reason: "INVALID_SLUG" });
      window.KADOSK_NAVIGUER_PUBLIC("/merchant/" + slug);
    });
  }, true);

  routeActuelle().then(function (path) {
    poster({ type: "KADOSK_APP_READY", path: path || "/boutique" });
  });
})();
