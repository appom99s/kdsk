(function () {
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const etatErreur = document.getElementById("etatErreur");
  const grille = document.getElementById("grilleMarchands");

  // Authentification silencieuse : si la page Wix hôte (ma-boutique.page.js) détecte
  // que le visiteur est déjà connecté sur www.kadosk.com, elle transmet un jeton de
  // session via postMessage. On complète alors le flow PKCE pour obtenir un vrai token
  // vérifié, sans jamais redemander de connexion au visiteur. En cas d'absence de ce
  // message (page non connectée, ou pas intégrée dans le composant HTML de Ma boutique),
  // la boutique continue de fonctionner normalement en mode invité.
  window.addEventListener("message", async (event) => {
    const origineWix = (() => {
      try { return new URL(window.KADOSK_CONFIG.siteBaseUrl).origin; } catch (_) { return ""; }
    })();
    if (!origineWix || event.origin !== origineWix || event.source !== window.parent) return;
    const donnees = event && event.data;
    if (!donnees || donnees.type !== "KADOSK_SESSION_TOKEN" || !donnees.sessionToken) {
      return;
    }
    if (KADOSK_AUTH.estConnecte()) {
      // Déjà authentifié pour cette session navigateur - pas besoin de relancer le flow.
      return;
    }
    try {
      await KADOSK_AUTH.demarrerAutorisationMembrePourBoutique(donnees.sessionToken);
      // demarrerAutorisationMembrePourBoutique redirige la page (dans l'iframe) vers
      // Wix pour terminer l'autorisation - rien d'autre à faire ici, l'exécution
      // s'arrête à la navigation.
    } catch (erreur) {
      console.error("Authentification silencieuse boutique échouée :", erreur);
      // On n'affiche rien à l'utilisateur : le parcours invité reste disponible.
    }
  });

  // Signale à la page Wix hôte (si cette page est bien intégrée via le composant HTML
  // "Ma boutique") que le script est chargé et prêt à recevoir le jeton de session -
  // évite une situation où la page hôte enverrait le message avant que ce script ait pu
  // poser son écouteur ci-dessus.
  if (window.parent && window.parent !== window) {
    try {
      const origineWix = new URL(window.KADOSK_CONFIG.siteBaseUrl).origin;
      window.parent.postMessage({ type: "KADOSK_BOUTIQUE_READY" }, origineWix);
    } catch (erreur) {
      // Pas intégré dans un composant compatible, ou restriction du navigateur - sans
      // conséquence, le mode invité reste pleinement fonctionnel.
    }
  }

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function charger() {
    try {
      const resultat = await KADOSK_API.getActiveMerchants();
      const marchands = resultat.items || [];

      etatChargement.style.display = "none";

      if (marchands.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      grille.innerHTML = marchands
        .map(
          (m) => `
        <a class="kadosk-carte-marchand" href="fiche-marchand.html?merchantId=${encodeURIComponent(m.merchantId)}" data-accent="${echapperHtml(m.accentColor)}">
          <div class="kadosk-carte-marchand-logo">
            ${m.logoUrl ? `<img src="${echapperHtml(m.logoUrl)}" alt="${echapperHtml(m.businessName)}" />` : `<span>${echapperHtml((m.businessName || "?").slice(0, 1).toUpperCase())}</span>`}
          </div>
          <div class="kadosk-carte-marchand-nom">${echapperHtml(m.name || m.businessName)}</div>
          <div class="kadosk-carte-marchand-desc">${echapperHtml(m.description || m.businessName)}</div>
        </a>
      `
        )
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement boutique :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Impossible de charger les commerces pour le moment.";
    }
  }

  charger();
})();
