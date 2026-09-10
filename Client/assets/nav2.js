// Catégories KADOSK partagées (nom + icône), utilisées par categories.js pour
// le filtre catégorie et les icônes associées.
// NOTE : ce fichier gérait aussi une barre de navigation basse (#k2NavBas),
// retirée car redondante avec celle de assets/client-shell.js (chargé sur
// toutes les pages Client) - une seule barre de navigation mobile subsiste
// désormais, celle de client-shell.js (.client-mobile-nav).
(function () {
  const CATEGORIES = [
    { valeur: "Restaurants & Gastronomie", icone: "utensils" },
    { valeur: "Beauté & Bien-être", icone: "sparkles" },
    { valeur: "Gaming & Jeux vidéo", icone: "gamepad-2" },
    { valeur: "Mode & Accessoires", icone: "shopping-bag" },
    { valeur: "Shopping", icone: "shopping-bag" },
    { valeur: "Hôtels & Séjours", icone: "landmark" },
    { valeur: "Voyage & Loisirs", icone: "plane" },
    { valeur: "Cinéma & Divertissement", icone: "clapperboard" },
    { valeur: "Sport & Fitness", icone: "dumbbell" },
    { valeur: "Technologie", icone: "settings" },
    { valeur: "Maison & Décoration", icone: "sofa" }
  ];

  function iconePourCategorie(categorie) {
    const trouvee = CATEGORIES.find((c) => c.valeur === categorie);
    return trouvee ? trouvee.icone : "tag";
  }

  window.KADOSK_CATEGORIES = CATEGORIES;
  window.KADOSK_ICONE_CATEGORIE = iconePourCategorie;
})();
