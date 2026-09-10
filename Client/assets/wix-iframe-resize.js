// Signale au site Wix parent (via l'élément HTML iframe #htmlBoutique) la hauteur RÉELLE
// du contenu de cette page KADOSK, pour que le code Velo de la page Wix puisse agrandir
// l'élément en conséquence - objectif : que l'intégration occupe le maximum d'espace
// (largeur ET hauteur), sans bande vide ni barre de défilement interne à l'iframe.
//
// Fichier volontairement séparé de wix-bridge.js (jeton acheteur) : rôle différent
// (dimensionnement, pas authentification), et chargé sur TOUTES les pages Client
// (contrairement à wix-bridge.js, limité aux pages avec connexion membre) puisque la
// hauteur doit être recalculée à chaque page/état du parcours (catalogue, panier,
// checkout...).
//
// Voir le pendant côté Wix (code Velo à coller dans le panneau de code de la page qui
// contient l'élément htmlBoutique) : docs/velo-htmlBoutique-fullsize.js.
(function () {
  // Même règle de sécurité que wix-bridge.js : jamais "*", toujours le domaine réel du
  // site Wix qui embarque ces pages.
  const ORIGINES_WIX_AUTORISEES = new Set(["https://www.kadosk.com", "https://kadosk.com"]);
  function origineWixCible() {
    try {
      const origine = new URL(document.referrer).origin;
      if (ORIGINES_WIX_AUTORISEES.has(origine)) return origine;
    } catch (erreur) { /* repli canonique */ }
    return "https://www.kadosk.com";
  }

  function estDansIframe() {
    try {
      return window.self !== window.top;
    } catch (erreur) {
      // Accès à window.top bloqué par le navigateur = on est bien dans un iframe
      // cross-origin.
      return true;
    }
  }

  if (!estDansIframe()) return;

  let derniereHauteurEnvoyee = 0;

  function hauteurReelle() {
    const html = document.documentElement;
    const corps = document.body;
    return Math.max(
      html.scrollHeight,
      html.offsetHeight,
      html.clientHeight,
      corps ? corps.scrollHeight : 0,
      corps ? corps.offsetHeight : 0
    );
  }

  function envoyerHauteur() {
    const hauteur = hauteurReelle();
    // Évite de spammer le parent : un ResizeObserver/MutationObserver déclenche souvent
    // plusieurs fois pour un seul changement visuel réel.
    if (Math.abs(hauteur - derniereHauteurEnvoyee) < 2) return;
    derniereHauteurEnvoyee = hauteur;
    try {
      window.parent.postMessage({ type: "KADOSK_RESIZE", height: hauteur }, origineWixCible());
    } catch (erreur) {
      // Sans conséquence : le parent gardera simplement sa hauteur précédente.
    }
  }

  // Léger anti-rebond : plusieurs mutations rapprochées (ex. ouverture du panier +
  // reflow des cartes catalogue) ne doivent déclencher qu'un seul postMessage.
  let delaiEnCours = null;
  function planifierEnvoi() {
    if (delaiEnCours) clearTimeout(delaiEnCours);
    delaiEnCours = setTimeout(envoyerHauteur, 80);
  }

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(planifierEnvoi).observe(document.documentElement);
  }
  if (typeof MutationObserver === "function") {
    new MutationObserver(planifierEnvoi).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }
  window.addEventListener("load", planifierEnvoi);
  window.addEventListener("resize", planifierEnvoi);
  // Premier envoi immédiat (avant même "load") pour un premier ajustement rapide plutôt
  // que d'attendre le chargement complet des images.
  planifierEnvoi();
})();
