(function () {
  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function poserIcone(id, nom) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = window.KADOSK_ICONE(nom);
  }
  poserIcone("iconeHamburger", "menu");
  poserIcone("iconeFermerMenu", "x");
  poserIcone("iconeFavorisHeader", "heart");
  poserIcone("iconePanierHeader", "shopping-cart");
  poserIcone("iconeCompteHeader", "user");
  poserIcone("iconeHeroCategories", "tag");

  const btnHamburger = document.getElementById("btnHamburger");
  const menuMobile = document.getElementById("menuMobile");
  const menuMobileFond = document.getElementById("menuMobileFond");
  const btnFermerMenu = document.getElementById("btnFermerMenu");
  function ouvrirMenuMobile() {
    menuMobile.classList.add("ouvert");
    menuMobileFond.classList.add("ouvert");
    menuMobile.setAttribute("aria-hidden", "false");
    btnHamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function fermerMenuMobile() {
    menuMobile.classList.remove("ouvert");
    menuMobileFond.classList.remove("ouvert");
    menuMobile.setAttribute("aria-hidden", "true");
    btnHamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (btnHamburger) {
    btnHamburger.addEventListener("click", ouvrirMenuMobile);
    btnFermerMenu.addEventListener("click", fermerMenuMobile);
    menuMobileFond.addEventListener("click", fermerMenuMobile);
    document.addEventListener("keydown", (evenement) => {
      if (evenement.key === "Escape") fermerMenuMobile();
    });
  }

  const etatChargement = document.getElementById("etatChargement");
  const grille = document.getElementById("grilleCategoriesFull");

  function appliquerCatalogue(resultat) {
    const marchands = (resultat && resultat.items) || [];
    etatChargement.style.display = "none";
    grille.style.display = "grid";

    const compteParCategorie = {};
    marchands.forEach((m) => {
      if (!m.activityCategory) return;
      compteParCategorie[m.activityCategory] = (compteParCategorie[m.activityCategory] || 0) + 1;
    });

    const categories = Object.keys(compteParCategorie).sort((a, b) => a.localeCompare(b, "fr"));

    if (categories.length === 0) {
      grille.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--k2-texte-clair);padding:20px;">Aucune catégorie disponible pour le moment.</p>`;
      return;
    }

    grille.innerHTML = categories
      .map((categorie) => {
        const icone = window.KADOSK_ICONE_CATEGORIE ? window.KADOSK_ICONE_CATEGORIE(categorie) : "tag";
        const nombre = compteParCategorie[categorie];
        return `
          <a class="k2-categorie-tuile-full" href="commercants.html?categorie=${encodeURIComponent(categorie)}">
            <span class="k2-icone-cat">${window.KADOSK_ICONE(icone)}</span>
            <span class="k2-categorie-tuile-full-nom">${echapperHtml(categorie)}</span>
            <span class="k2-categorie-tuile-full-compte">${nombre} commerçant${nombre > 1 ? "s" : ""}</span>
          </a>
        `;
      })
      .join("");
  }

  function gererEchecChargement(erreur) {
    console.error("Erreur chargement catégories :", erreur);
    etatChargement.textContent = "Impossible de charger les catégories pour le moment.";
  }

  function charger() {
    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue).catch(gererEchecChargement);
    } else {
      KADOSK_API.getActiveMerchants().then(appliquerCatalogue).catch(gererEchecChargement);
    }
  }
  charger();
})();
