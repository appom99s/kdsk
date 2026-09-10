(function () {
  const parametres = new URLSearchParams(window.location.search);
  const merchantId = parametres.get("merchantId");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
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
  poserIcone("iconeAdresse", "map-pin");
  poserIcone("iconeAjouter", "shopping-cart");
  poserIcone("k2IconeSecurite", "shield-check");
  poserIcone("iconeMontantLibre", "pencil");

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

  const etatChargement = document.getElementById("etatChargement");
  const etatErreur = document.getElementById("etatErreur");
  const detailContenu = document.getElementById("detailContenu");
  const filArianeNom = document.getElementById("filArianeNom");
  const logoMarchand = document.getElementById("logoMarchand");
  const badgeCategorie = document.getElementById("badgeCategorie");
  const nomBoutique = document.getElementById("nomBoutique");
  const descriptionCarte = document.getElementById("descriptionCarte");
  const texteExpiration = document.getElementById("texteExpiration");
  const blocAdresse = document.getElementById("blocAdresse");
  const texteAdresse = document.getElementById("texteAdresse");
  const carteMap = document.getElementById("carteMap");
  const zoneCarteVisuelle = document.getElementById("zoneCarteVisuelle");
  const boutonsMontants = document.getElementById("boutonsMontants");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const inputMontantLibre = document.getElementById("inputMontantLibre");
  const btnMoins = document.getElementById("btnMoins");
  const btnPlus = document.getElementById("btnPlus");
  const texteQuantite = document.getElementById("texteQuantite");
  const texteTotal = document.getElementById("texteTotal");
  const btnAjouterPanier = document.getElementById("btnAjouterPanier");
  const messageAjout = document.getElementById("messageAjout");

  const QUANTITE_MIN = 1;
  const QUANTITE_MAX = (window.KADOSK_PANIER2 && KADOSK_PANIER2.QUANTITE_MAX) || 1;

  let offre = null;
  let montantSelectionne = null;
  let montantLibreActif = false;
  let quantite = 1;
  let elementCarteVisuelle = null;

  function majCarteVisuelle() {
    if (elementCarteVisuelle) {
      const nombre = elementCarteVisuelle.querySelector(".kadosk-carte-apercu-montant-nombre");
      if (nombre) nombre.textContent = montantSelectionne > 0 ? Number(montantSelectionne).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—";
    }
  }

  function majBoutonAjouter() {
    btnAjouterPanier.disabled = !montantSelectionne || montantSelectionne <= 0;
  }

  function majTotaux() {
    const total = (montantSelectionne || 0) * quantite;
    texteTotal.textContent = formaterMontant(total);
  }

  function selectionnerMontant(montant, boutonElement) {
    montantSelectionne = montant;
    montantLibreActif = false;
    inputMontantLibre.value = "";
    document.querySelectorAll(".k2-montant-bouton-brand").forEach((b) => b.classList.remove("actif"));
    if (boutonElement) boutonElement.classList.add("actif");
    majBoutonAjouter();
    majTotaux();
    majCarteVisuelle();
  }

  async function charger() {
    if (!merchantId) {
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Lien invalide : commerçant introuvable.";
      return;
    }

    try {
      offre = await KADOSK_API.getGiftCardOffer(merchantId);

      etatChargement.style.display = "none";
      detailContenu.style.display = "grid";

      const nomAffiche = offre.businessName || offre.name || "";
      filArianeNom.textContent = nomAffiche;
      nomBoutique.textContent = nomAffiche;
      logoMarchand.innerHTML = offre.logoUrl
        ? `<img src="${echapperHtml(offre.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
        : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;

      if (offre.activityCategory) {
        badgeCategorie.textContent = offre.activityCategory;
        badgeCategorie.style.display = "inline-block";
      }

      descriptionCarte.textContent = offre.description || `Carte cadeau utilisable chez ${nomAffiche}.`;
      texteExpiration.textContent =
        offre.expirationMonths > 0
          ? `Carte valable ${offre.expirationMonths} mois à compter de la date d'achat.`
          : "Carte sans date de péremption.";

      // Adresse publique du commerce (renseignée par le marchand à l'onboarding,
      // voir getGiftCardOfferPublic) - PAS une donnée confidentielle comme le RIB
      // (adresse de virement bancaire, elle jamais affichée ici) : c'est
      // l'adresse physique de la boutique, utile pour la localiser sur une carte.
      // Pas de coordonnées GPS dans le modèle de données actuel : la carte utilise
      // donc une recherche Google Maps par adresse texte (pas de clé API requise),
      // suffisant pour situer le commerce sans exposer sa position exacte au mètre près.
      const adresseAffichee = [offre.address, offre.city].filter(Boolean).join(", ") || offre.address || offre.city || "";
      if (adresseAffichee) {
        texteAdresse.textContent = adresseAffichee;
        blocAdresse.style.display = "block";
        const requeteMap = [offre.address, offre.city, offre.region].filter(Boolean).join(", ");
        carteMap.innerHTML = `<iframe src="https://www.google.com/maps?q=${encodeURIComponent(requeteMap)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Localisation de ${echapperHtml(nomAffiche)}"></iframe>`;
        const lienItineraire = document.createElement("a");
        lienItineraire.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(requeteMap);
        lienItineraire.target = "_blank";
        lienItineraire.rel = "noopener";
        lienItineraire.textContent = "Ouvrir dans Google Maps";
        lienItineraire.style.cssText = "display:inline-block;margin-top:8px;color:var(--k2-primary);font-weight:600;";
        blocAdresse.appendChild(lienItineraire);
      }

      elementCarteVisuelle = KADOSK_CARTE_VISUELLE.creerElementCarte({
        businessName: offre.businessName,
        cardName: offre.name,
        amount: null,
        currency: "DH",
        logoUrl: offre.logoUrl,
        accentColor: offre.accentColor,
        pattern: offre.pattern,
        font: offre.font,
        activityIcon: offre.activityIcon,
        backgroundType: offre.backgroundType,
        backgroundImageUrl: offre.backgroundImageUrl,
        gradientFrom: offre.gradientFrom,
        gradientTo: offre.gradientTo,
        gradientAngle: offre.gradientAngle
      });
      zoneCarteVisuelle.appendChild(elementCarteVisuelle);

      boutonsMontants.innerHTML = (offre.presetAmounts || [])
        .map((montant) => `<button type="button" class="k2-montant-bouton-brand" data-montant="${montant}">${montant} DH</button>`)
        .join("");
      boutonsMontants.querySelectorAll(".k2-montant-bouton-brand").forEach((bouton) => {
        bouton.addEventListener("click", () => selectionnerMontant(Number(bouton.dataset.montant), bouton));
      });

      if (offre.freeAmountEnabled) {
        blocMontantLibre.style.display = "flex";
      }

      majTotaux();
    } catch (erreur) {
      console.error("Erreur chargement fiche commerçant :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Ce commerçant n'accepte pas de commande de carte cadeau pour le moment.";
    }
  }

  inputMontantLibre.addEventListener("input", () => {
    const valeur = Number(inputMontantLibre.value);
    if (valeur > 0) {
      montantLibreActif = true;
      montantSelectionne = valeur;
      document.querySelectorAll(".k2-montant-bouton-brand").forEach((b) => b.classList.remove("actif"));
    } else {
      montantLibreActif = false;
      montantSelectionne = null;
    }
    majBoutonAjouter();
    majTotaux();
    majCarteVisuelle();
  });

  btnMoins.addEventListener("click", () => {
    if (quantite > QUANTITE_MIN) {
      quantite -= 1;
      texteQuantite.textContent = String(quantite);
      majTotaux();
    }
  });
  btnPlus.addEventListener("click", () => {
    if (quantite < QUANTITE_MAX) {
      quantite += 1;
      texteQuantite.textContent = String(quantite);
      majTotaux();
    }
  });

  btnAjouterPanier.addEventListener("click", () => {
    if (!montantSelectionne || montantSelectionne <= 0) {
      return;
    }
    if (montantLibreActif && (montantSelectionne < offre.freeAmountMin || montantSelectionne > offre.freeAmountMax)) {
      messageAjout.textContent = `Le montant doit être entre ${offre.freeAmountMin} et ${offre.freeAmountMax} DH.`;
      messageAjout.style.color = "var(--k2-danger)";
      return;
    }

    // Réutilise intégralement KADOSK_PANIER2 (assets/panier2.js) - étape-3-recap
    // à étape-5-confirmation fonctionnent déjà sur cet état, sans aucune
    // modification : seul le point d'entrée change (choix du montant/quantité
    // directement ici plutôt qu'à l'étape 1/2 de l'ancien parcours).
    // ajouterArticle fusionne automatiquement avec une ligne déjà présente pour ce
    // même marchand ET ce même montant (quantités cumulées) - un second passage sur
    // cette fiche avec le même montant n'écrase donc plus la quantité précédente,
    // il s'y ajoute. Un montant différent crée une ligne à part.
    KADOSK_PANIER2.ajouterArticle({
      merchantId,
      businessName: offre.businessName,
      name: offre.name,
      logoUrl: offre.logoUrl,
      category: offre.activityCategory,
      accentColor: offre.accentColor,
      montant: montantSelectionne,
      quantite
    });

    messageAjout.textContent = "";
    if (window.KADOSK_TIROIR) {
      KADOSK_TIROIR.ouvrir();
    } else {
      window.location.href = "etape-3-recap.html";
    }
  });

  charger();
})();
