// En-tête "marketplace" partagé - deux usages selon la page :
// 1) Ligne "recherche + catégories" ajoutée sous l'en-tête existant (voir
//    kadosk2.css :: .k2-shop-header-search-row), sur la plupart des pages.
// 2) boutique-client.html (accueil) : recherche intégrée directement dans
//    .shop-header (voir .k2-shop-header-search-inline) + icônes panier/compte
//    du nouvel en-tête complet (voir .k2-shop-nav-row) - sans pastilles de
//    catégorie ici (une section "Nos catégories" dédiée existe sur la page).
// Un seul petit script partagé plutôt que de dupliquer cette logique par
// page : la recherche est un vrai <form action="commercants.html" method="get">
// (soumission native, aucun JS requis pour ça - commercants.js lit déjà ?q=
// au chargement, voir rechercheInitiale/inputRecherche) ; seules les icônes
// et les éventuelles pastilles de catégorie ont besoin d'être posées en JS.
// poserIcone() est silencieux (no-op) si un élément n'existe pas sur la page
// courante - ce même script peut donc tourner partout sans condition.
(function () {
  function poserIcone(id, nom) {
    const el = document.getElementById(id);
    if (el && window.KADOSK_ICONE) el.innerHTML = KADOSK_ICONE(nom);
  }
  poserIcone("iconeRechercheHeaderTop", "search");
  poserIcone("iconePanierHeader", "shopping-cart");
  poserIcone("iconeCompteHeader", "user");
  // Bandeau "pourquoi KADOSK" + illustration du bandeau promo, tous deux
  // uniquement présents sur boutique-client.html (accueil) - no-op ailleurs.
  poserIcone("iconeTrustCadeau", "gift");
  poserIcone("iconeTrustRapide", "clock");
  poserIcone("iconeTrustSecurise", "shield-check");
  poserIcone("iconeTrustSuivi", "qr-code");
  poserIcone("iconePromoBanner", "sparkles");

  const categorieActive = new URLSearchParams(window.location.search).get("categorie") || "";

  const conteneurPastilles = document.getElementById("pillsCategoriesHeader");
  if (conteneurPastilles && window.KADOSK_CATEGORIES) {
    conteneurPastilles.innerHTML =
      window.KADOSK_CATEGORIES.map((cat) => {
        const actif = cat.valeur === categorieActive;
        return (
          '<a class="k2-categorie-pill' + (actif ? " actif" : "") + '" href="commercants.html?categorie=' +
          encodeURIComponent(cat.valeur) + '">' +
          (window.KADOSK_ICONE ? KADOSK_ICONE(cat.icone) : "") +
          "<span>" + cat.valeur + "</span></a>"
        );
      }).join("") +
      '<a class="k2-categorie-pill k2-categorie-pill-toutes" href="categories.html">Toutes les catégories →</a>';
  }

  // Section "Nos catégories" (accueil uniquement) : mêmes catégories que les
  // pastilles ci-dessus, présentées en grille d'icônes façon marketplace.
  const grilleCategories = document.getElementById("grilleCategoriesAccueil");
  if (grilleCategories && window.KADOSK_CATEGORIES) {
    grilleCategories.innerHTML = window.KADOSK_CATEGORIES.map((cat) =>
      '<a class="k2-categorie-tuile-accueil" href="commercants.html?categorie=' +
      encodeURIComponent(cat.valeur) + '">' +
      (window.KADOSK_ICONE ? KADOSK_ICONE(cat.icone) : "") +
      "<span>" + cat.valeur + "</span></a>"
    ).join("");
  }
})();
