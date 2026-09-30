(function () {
  if (window.KADOSK_SPA) return;

  const PAGES = ["dashboard.html", "cashier.html", "orders.html", "transactions.html", "gift-cards.html", "growth.html", "finance.html", "business.html", "settings.html", "invoice-settings.html", "equipe.html"];
  const COMMUNS = new Set(["config.js", "auth.js", "api.js", "cache.js", "nav.js", "guard.js", "spa.js", "ui-system.js"]);
  const CONTROLEURS = new Set(["dashboard.js", "cashier.js", "orders.js", "transactions.js", "gift-cards.js", "growth.js", "finance.js", "business.js", "settings.js", "invoice-settings.js", "equipe.js", "subscription-summary.js", "subscription-settings.js", "bulk-print.js", "locations.js"]);
  const documents = new Map();
  const donnees = new Map();
  let generation = 0;
  function invaliderDonnees() {
    generation += 1;
    donnees.clear();
    if (window.KADOSK_CACHE) window.KADOSK_CACHE.clear();
  }
  let navigationEnCours = false;
  const repertoireMarchand = new URL(".", location.href).pathname;

  function nomFichier(url) {
    return String(url || "").split("?")[0].split("/").pop();
  }

  function estPageInterne(href) {
    try {
      const url = new URL(href, location.href);
      return url.origin === location.origin && new URL(".", url).pathname === repertoireMarchand && PAGES.includes(nomFichier(url.pathname));
    } catch (_) { return false; }
  }

  async function chargerDocument(url) {
    const cle = new URL(url, location.href).pathname;
    if (!documents.has(cle)) {
      documents.set(cle, fetch(url, { credentials: "same-origin" }).then((r) => {
        if (!r.ok) throw new Error("PAGE_LOAD_FAILED");
        return r.text();
      }).catch((e) => { documents.delete(cle); throw e; }));
    }
    return documents.get(cle);
  }

  async function executerScripts(doc) {
    const scripts = Array.from(doc.querySelectorAll("script[src]"));
    for (const source of scripts) {
      const src = source.getAttribute("src") || "";
      if (COMMUNS.has(nomFichier(src))) continue;
      const dejaCharge = Array.from(document.scripts).some((s) => nomFichier(s.src) === nomFichier(src));
      // Les contrôleurs IIFE doivent être rejoués pour brancher le nouveau DOM.
      // Les bibliothèques et helpers globaux ne doivent jamais être redéclarés.
      if (dejaCharge && !CONTROLEURS.has(nomFichier(src))) continue;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
          if (CONTROLEURS.has(nomFichier(src))) script.remove();
          resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }
  }

  async function synchroniserStyles(doc, urlPage) {
    const liens = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
    await Promise.all(liens.map((lien) => {
      const href = new URL(lien.getAttribute("href"), urlPage).href;
      if (Array.from(document.styleSheets).some((style) => style.href === href)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const nouveauLien = document.createElement("link");
        nouveauLien.rel = "stylesheet";
        nouveauLien.href = href;
        nouveauLien.dataset.kadoskPageStyle = "true";
        nouveauLien.onload = resolve;
        nouveauLien.onerror = reject;
        document.head.appendChild(nouveauLien);
      });
    }));
  }

  function actualiserNavigation(page) {
    document.querySelectorAll(".kadosk-nav-item").forEach((lien) => {
      lien.classList.toggle("actif", nomFichier(lien.getAttribute("href")) === page);
    });
  }

  async function naviguer(href, ajouterHistorique) {
    if (navigationEnCours) return;
    navigationEnCours = true;
    try {
      const url = new URL(href, location.href);
      const html = await chargerDocument(url.href);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const nouveauMain = doc.querySelector(".kadosk-main");
      const main = document.querySelector(".kadosk-main");
      if (!nouveauMain || !main) throw new Error("PAGE_CONTENT_MISSING");
      await synchroniserStyles(doc, url.href);
      main.replaceWith(document.importNode(nouveauMain, true));
      document.title = doc.title;
      if (ajouterHistorique) history.pushState({ kadoskSpa: true }, "", url.href);
      actualiserNavigation(nomFichier(url.pathname));
      window.scrollTo(0, 0);
      if (window.KADOSK_NAV) KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");
      await executerScripts(doc);
    } catch (erreur) {
      console.error("Navigation interne KADOSK échouée", erreur);
      location.href = href;
    } finally {
      navigationEnCours = false;
    }
  }

  // Cache JSON en mémoire : une première lecture alimente toutes les vues de la
  // session SPA. Après une mutation, seules les lectures sont invalidées.
  const api = typeof KADOSK_API !== "undefined" ? KADOSK_API : window.KADOSK_API;
  if (api) {
    // Small display resources only; permissions, subscriptions, balances,
    // financial history and large lists always use fresh server reads.
    const lectures = ["getOfferSettings", "getInvoiceTemplate", "getMerchantProfile"];
    lectures.forEach((nom) => {
      if (typeof api[nom] !== "function") return;
      const original = api[nom].bind(api);
      api[nom] = function (...args) {
        const cle = nom + ":" + JSON.stringify(args);
        const entree = donnees.get(cle);
        if (entree && Date.now() - entree.date < 30000) return Promise.resolve(entree.valeur);
        const version = generation;
        return original(...args).then((valeur) => {
          if (version === generation) donnees.set(cle, { valeur, date: Date.now() });
          return valeur;
        });
      };
    });
    const mutations = ["redeemGiftCard", "redeemQrTemporaire", "activateOrder", "createMerchantGiftCardDraft", "changeGiftCardStatus", "refuseOrder", "saveOfferSettings", "saveInvoiceTemplate", "saveMerchantProfile", "saveNetworkPreferences", "inviteTeamMember", "removeTeamMember", "saveMerchantGrowth", "requestCardPlanChange"];
    mutations.forEach((nom) => {
      if (typeof api[nom] !== "function") return;
      const original = api[nom].bind(api);
      api[nom] = async function () {
        const resultat = await original.apply(null, arguments);
        invaliderDonnees();
        if (canal) canal.postMessage({ type: "invalidate" });
        return resultat;
      };
    });

  }

  // Only invalidation signals cross tabs; never transfer merchant data or tokens.
  let canal = null;
  try {
    if (window.BroadcastChannel) {
      canal = new BroadcastChannel("kadosk-merchant-refresh");
      canal.onmessage = () => invaliderDonnees();
    }
  } catch (_) { /* Cross-tab messaging is optional. */ }
  // Revalider au retour sur l'onglet, mais seulement après une VRAIE absence - un
  // simple aller-retour de quelques secondes (survol d'un autre onglet, clic sur la
  // barre d'adresse, ouverture des outils de développement) ne doit pas redéclencher
  // un rechargement complet à chaque fois : c'était le comportement précédent
  // (invalidation sur CHAQUE `focus`), une des causes de lenteur ressentie signalées
  // par l'utilisateur pour un marchand qui jongle entre plusieurs onglets/applis.
  // Page Visibility (onglet masqué/affiché) plutôt que window focus/blur : ne se
  // déclenche que pour un vrai changement d'onglet/minimisation, pas pour chaque
  // perte de focus interne à la fenêtre.
  const SEUIL_ABSENCE_MS = 60000;
  let masqueDepuis = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      masqueDepuis = Date.now();
    } else if (masqueDepuis && Date.now() - masqueDepuis > SEUIL_ABSENCE_MS) {
      invaliderDonnees();
    }
  });

  document.addEventListener("click", (event) => {
    const lien = event.target.closest("a[href]");
    if (!lien || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || lien.target || lien.hasAttribute("download") || lien.hasAttribute("data-acces-verrouille")) return;
    if (!estPageInterne(lien.href)) return;
    event.preventDefault();
    naviguer(lien.href, true);
  });
  window.addEventListener("popstate", () => naviguer(location.href, false));
  // Prefetch page markup on intent instead of downloading every page at login.
  document.addEventListener("pointerover", (event) => {
    const lien = event.target.closest("a[href]");
    if (lien && !lien.hasAttribute("data-acces-verrouille") && estPageInterne(lien.href)) {
      chargerDocument(lien.href).catch(() => {});
    }
  });

  window.KADOSK_SPA = { naviguer, invaliderDonnees };
})();
