(function () {
  const PAR_PAGE = 8;

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
  poserIcone("iconeHeroCommercants", "shopping-bag");
  poserIcone("iconeFiltreRecherche", "search");
  poserIcone("iconeReset", "refresh-cw");
  poserIcone("iconeAv1", "shopping-bag");
  poserIcone("iconeAv2", "shield-check");
  poserIcone("iconeAv3", "check-circle");
  poserIcone("iconeAv4", "clock");

  // --- Menu mobile ---
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

  const inputRecherche = document.getElementById("inputRecherche");
  const selectCategorie = document.getElementById("selectCategorie");
  const selectDisponibilite = document.getElementById("selectDisponibilite");
  const selectTri = document.getElementById("selectTri");
  const btnReinitialiser = document.getElementById("btnReinitialiser");
  const texteResultats = document.getElementById("texteResultats");
  const etatVide = document.getElementById("etatVide");
  const grilleAnnuaire = document.getElementById("grilleAnnuaire");
  const listeMobile = document.getElementById("listeAnnuaireMobile");
  const pagination = document.getElementById("pagination");

  let tousLesMarchands = [];
  let pageActuelle = 1;

  function rendreLogo(marchand) {
    const nomAffiche = marchand.businessName || marchand.name || "";
    return marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
      : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;
  }

  function carteDesktop(marchand) {
    const nomAffiche = marchand.businessName || marchand.name || "";
    const favori = window.KADOSK_FAVORIS ? window.KADOSK_FAVORIS.estFavori(marchand.merchantId) : false;
    const div = document.createElement("div");
    div.className = "k2-carte-marchand-annuaire";
    div.innerHTML = `
      <button type="button" class="k2-favori-btn ${favori ? "actif" : ""}" data-favori aria-label="Ajouter ou retirer des favoris">${window.KADOSK_ICONE("heart")}</button>
      <div class="k2-carte-marchand-annuaire-logo">${rendreLogo(marchand)}</div>
      <p class="k2-carte-marchand-annuaire-nom">${echapperHtml(nomAffiche)}</p>
      <div class="k2-carte-marchand-annuaire-meta">
        <span>${echapperHtml(marchand.activityCategory || "")}</span>
        <span class="k2-statut-disponible">Disponible</span>
      </div>
      <a href="commercant-detail.html?merchantId=${encodeURIComponent(marchand.merchantId)}" class="k2-btn k2-btn-primaire">Voir les cartes</a>
    `;
    div.querySelector("[data-favori]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      const bouton = evenement.currentTarget;
      const actif = window.KADOSK_FAVORIS.basculer(marchand.merchantId);
      bouton.classList.toggle("actif", actif);
      if (window.KADOSK_FAVORIS.mettreAJourBadges) window.KADOSK_FAVORIS.mettreAJourBadges();
    });
    return div;
  }

  function ligneMobile(marchand) {
    const nomAffiche = marchand.businessName || marchand.name || "";
    const favori = window.KADOSK_FAVORIS ? window.KADOSK_FAVORIS.estFavori(marchand.merchantId) : false;
    const a = document.createElement("a");
    a.className = "k2-ligne-marchand-mobile";
    a.href = "commercant-detail.html?merchantId=" + encodeURIComponent(marchand.merchantId);
    a.innerHTML = `
      <div class="k2-ligne-marchand-mobile-logo">${rendreLogo(marchand)}</div>
      <div class="k2-ligne-marchand-mobile-corps">
        <p class="k2-ligne-marchand-mobile-nom">${echapperHtml(nomAffiche)}</p>
        <div class="k2-ligne-marchand-mobile-meta">
          <span>${echapperHtml(marchand.activityCategory || "")}</span>
          <span class="k2-statut-disponible">Disponible</span>
        </div>
      </div>
      <button type="button" class="k2-favori-btn ${favori ? "actif" : ""}" data-favori aria-label="Ajouter ou retirer des favoris">${window.KADOSK_ICONE("heart")}</button>
      <span class="k2-ligne-marchand-mobile-chevron">${window.KADOSK_ICONE("chevron-right")}</span>
    `;
    a.querySelector("[data-favori]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      evenement.stopPropagation();
      const bouton = evenement.currentTarget;
      const actif = window.KADOSK_FAVORIS.basculer(marchand.merchantId);
      bouton.classList.toggle("actif", actif);
      if (window.KADOSK_FAVORIS.mettreAJourBadges) window.KADOSK_FAVORIS.mettreAJourBadges();
    });
    return a;
  }

  function marchandsFiltres() {
    const recherche = (inputRecherche.value || "").trim().toLowerCase();
    const categorie = selectCategorie.value;
    let liste = tousLesMarchands.filter((m) => {
      const correspondRecherche =
        !recherche ||
        (m.name || "").toLowerCase().includes(recherche) ||
        (m.businessName || "").toLowerCase().includes(recherche) ||
        (m.activityCategory || "").toLowerCase().includes(recherche);
      const correspondCategorie = !categorie || m.activityCategory === categorie;
      // "Disponibilité" : le catalogue public ne renvoie déjà que les marchands
      // actifs pour la vente (voir listActiveMerchantOffers côté serveur) - il
      // n'existe donc aujourd'hui aucun marchand "indisponible" à filtrer. Le
      // filtre est conservé visuellement (fidélité à la maquette) mais n'a
      // qu'une seule valeur possible tant qu'aucun statut d'indisponibilité
      // n'est exposé publiquement côté backend.
      return correspondRecherche && correspondCategorie;
    });

    const tri = selectTri.value;
    if (tri === "nom-desc") {
      liste = liste.slice().sort((a, b) => (b.businessName || b.name || "").localeCompare(a.businessName || a.name || "", "fr"));
    } else if (tri === "nouveaute") {
      liste = liste.slice().sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
    } else {
      liste = liste.slice().sort((a, b) => (a.businessName || a.name || "").localeCompare(b.businessName || b.name || "", "fr"));
    }
    return liste;
  }

  function rendrePagination(total) {
    const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));
    if (pageActuelle > nbPages) pageActuelle = nbPages;
    pagination.innerHTML = "";
    if (nbPages <= 1) return;

    function bouton(libelle, page, options) {
      options = options || {};
      const b = document.createElement("button");
      b.type = "button";
      if (options.icone) b.innerHTML = window.KADOSK_ICONE(options.icone);
      else b.textContent = libelle;
      if (options.actif) b.classList.add("actif");
      b.disabled = !!options.disabled;
      b.addEventListener("click", () => {
        pageActuelle = page;
        rendreGrille();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      pagination.appendChild(b);
    }

    bouton("", pageActuelle - 1, { icone: "chevron-left", disabled: pageActuelle <= 1 });

    const pagesAAfficher = new Set([1, nbPages, pageActuelle, pageActuelle - 1, pageActuelle + 1]);
    let dernierAffiche = 0;
    for (let p = 1; p <= nbPages; p++) {
      if (!pagesAAfficher.has(p)) continue;
      if (p - dernierAffiche > 1) {
        const ellipse = document.createElement("span");
        ellipse.className = "k2-pagination-ellipse";
        ellipse.textContent = "…";
        pagination.appendChild(ellipse);
      }
      bouton(String(p), p, { actif: p === pageActuelle });
      dernierAffiche = p;
    }

    bouton("", pageActuelle + 1, { icone: "chevron-right", disabled: pageActuelle >= nbPages });
  }

  function rendreGrille() {
    const filtres = marchandsFiltres();
    const total = filtres.length;
    texteResultats.textContent = `${total} commerçant${total > 1 ? "s" : ""} trouvé${total > 1 ? "s" : ""}`;
    etatVide.style.display = total === 0 ? "block" : "none";

    const debut = (pageActuelle - 1) * PAR_PAGE;
    const page = filtres.slice(debut, debut + PAR_PAGE);

    grilleAnnuaire.innerHTML = "";
    listeMobile.innerHTML = "";
    page.forEach((m) => {
      grilleAnnuaire.appendChild(carteDesktop(m));
      listeMobile.appendChild(ligneMobile(m));
    });

    rendrePagination(total);
  }

  function remplirCategories() {
    const categoriesPresentes = Array.from(
      new Set(tousLesMarchands.map((m) => m.activityCategory).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));
    const parametresUrl = new URLSearchParams(window.location.search);
    const categorieInitiale = parametresUrl.get("categorie") || "";

    selectCategorie.innerHTML = '<option value="">Catégorie</option>';
    categoriesPresentes.forEach((categorie) => {
      const option = document.createElement("option");
      option.value = categorie;
      option.textContent = categorie;
      selectCategorie.appendChild(option);
    });
    if (categorieInitiale && categoriesPresentes.includes(categorieInitiale)) {
      selectCategorie.value = categorieInitiale;
    }
  }

  function appliquerCatalogue(resultat) {
    tousLesMarchands = (resultat && resultat.items) || [];
    remplirCategories();
    rendreGrille();
  }

  function gererEchecChargement(erreur) {
    console.error("Erreur chargement annuaire commerçants :", erreur);
    texteResultats.textContent = "Impossible de charger les commerçants pour le moment.";
  }

  [inputRecherche].forEach((el) =>
    el.addEventListener("input", () => {
      pageActuelle = 1;
      rendreGrille();
    })
  );
  [selectCategorie, selectDisponibilite, selectTri].forEach((el) =>
    el.addEventListener("change", () => {
      pageActuelle = 1;
      rendreGrille();
    })
  );
  btnReinitialiser.addEventListener("click", () => {
    inputRecherche.value = "";
    selectCategorie.value = "";
    selectDisponibilite.value = "";
    selectTri.value = "nom-asc";
    pageActuelle = 1;
    rendreGrille();
  });

  // Pré-filtres depuis l'URL (recherche/catégorie, ex. liens "idées cadeaux" ou
  // tuiles catégories) - appliqués après le chargement du catalogue.
  const parametresUrl = new URLSearchParams(window.location.search);
  const rechercheInitiale = parametresUrl.get("q");
  if (rechercheInitiale) inputRecherche.value = rechercheInitiale;

  function charger() {
    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue).catch(gererEchecChargement);
    } else {
      KADOSK_API.getActiveMerchants().then(appliquerCatalogue).catch(gererEchecChargement);
    }
  }
  charger();
})();
