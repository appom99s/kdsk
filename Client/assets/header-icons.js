// Pose les icônes favoris/panier dans l'en-tête .k2-topbar des pages qui n'ont
// qu'un logo (a-propos/aide/favoris/mon-compte/mes-commandes) - même logique
// que le poserIcone local déjà dupliqué dans categories.js/commercant-detail.js/
// commercants.js pour leur propre en-tête .k2-entete-catalogue, mais factorisée
// ici en un seul petit fichier partagé plutôt que redupliquée une 4e/5e/6e/7e/8e
// fois : ces 5 pages n'avaient JAMAIS ces icônes (voir etat.txt) et n'ont pas de
// script dédié assez conséquent pour justifier d'y coller cette logique chacune
// de leur côté. Les compteurs (badges) se posent déjà tout seuls ailleurs
// (favoris-data.js/panier2.js ciblent tout [data-favoris-badge]/[data-panier-badge]
// présent sur la page, sans dépendre de cette icône) - ce script ne fait que
// dessiner les 2 glyphes SVG.
(function () {
  function poserIcone(id, nom) {
    const el = document.getElementById(id);
    if (el && window.KADOSK_ICONE) el.innerHTML = KADOSK_ICONE(nom);
  }
  poserIcone("iconeFavorisHeader", "heart");
  poserIcone("iconePanierHeader", "shopping-cart");
})();
