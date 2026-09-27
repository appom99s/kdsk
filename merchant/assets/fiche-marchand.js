(function () {
  const parametres = new URLSearchParams(window.location.search);
  const merchantId = parametres.get("merchantId");

  const etatChargement = document.getElementById("etatChargement");
  const etatErreur = document.getElementById("etatErreur");
  const sectionOffre = document.getElementById("sectionOffre");

  const logoMarchand = document.getElementById("logoMarchand");
  const badgeCategorie = document.getElementById("badgeCategorie");
  const nomBoutique = document.getElementById("nomBoutique");
  const descriptionCarte = document.getElementById("descriptionCarte");
  const lienConditions = document.getElementById("lienConditions");
  const texteExpiration = document.getElementById("texteExpiration");
  const boutonsMontants = document.getElementById("boutonsMontants");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const inputMontantLibre = document.getElementById("inputMontantLibre");
  const btnMoins = document.getElementById("btnMoins");
  const btnPlus = document.getElementById("btnPlus");
  const texteQuantite = document.getElementById("texteQuantite");
  const texteTotalPartiel = document.getElementById("texteTotalPartiel");
  const inputNomClient = document.getElementById("inputNomClient");
  const inputEmailClient = document.getElementById("inputEmailClient");
  const inputMessage = document.getElementById("inputMessage");
  const compteurMessage = document.getElementById("compteurMessage");
  const btnAjouterPanier = document.getElementById("btnAjouterPanier");
  const messageAjout = document.getElementById("messageAjout");

  const logoRecap = document.getElementById("logoRecap");
  const nomRecap = document.getElementById("nomRecap");
  const prixRecap = document.getElementById("prixRecap");
  const quantiteRecap = document.getElementById("quantiteRecap");
  const totalRecap = document.getElementById("totalRecap");
  const texteUtilisable = document.getElementById("texteUtilisable");

  const QUANTITE_MIN = 1;
  const QUANTITE_MAX = 1;

  let offre = null;
  let montantSelectionne = null;
  let montantLibreActif = false;
  let quantite = 1;

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

  function rendreLogo(cible, businessName, logoUrl) {
    if (logoUrl) {
      cible.innerHTML = `<img src="${echapperHtml(logoUrl)}" alt="${echapperHtml(businessName)}" />`;
    } else {
      cible.textContent = (businessName || "?").slice(0, 1).toUpperCase();
    }
  }

  function majBoutonAjouter() {
    btnAjouterPanier.disabled = !montantSelectionne || montantSelectionne <= 0;
  }

  function majTotaux() {
    const total = (montantSelectionne || 0) * quantite;
    texteTotalPartiel.textContent = formaterMontant(total);
    prixRecap.textContent = formaterMontant(total);
    quantiteRecap.textContent = String(quantite);
    totalRecap.textContent = formaterMontant(total);
  }

  function selectionnerMontant(montant, boutonElement) {
    montantSelectionne = montant;
    montantLibreActif = false;
    inputMontantLibre.value = "";
    document.querySelectorAll(".kadosk-montant-bouton").forEach((b) => b.classList.remove("actif"));
    if (boutonElement) boutonElement.classList.add("actif");
    majBoutonAjouter();
    majTotaux();
  }

  async function charger() {
    if (!merchantId) {
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Lien invalide : commerce introuvable.";
      return;
    }

    try {
      offre = await KADOSK_API.getGiftCardOffer(merchantId);

      etatChargement.style.display = "none";
      sectionOffre.style.display = "grid";

      rendreLogo(logoMarchand, offre.businessName, offre.logoUrl);
      rendreLogo(logoRecap, offre.businessName, offre.logoUrl);

      if (offre.activityCategory) {
        badgeCategorie.textContent = offre.activityCategory;
        badgeCategorie.style.display = "inline-block";
      }

      nomBoutique.textContent = offre.businessName;
      nomRecap.textContent = offre.businessName + " — Carte cadeau";
      descriptionCarte.textContent = offre.description || `Carte cadeau utilisable chez ${offre.businessName}.`;
      texteUtilisable.textContent = `Valable chez ${offre.businessName}.`;

      const spanExpiration = texteExpiration.querySelector("span");
      spanExpiration.textContent =
        offre.expirationMonths > 0
          ? `Carte valable ${offre.expirationMonths} mois à compter de la date d'achat`
          : "Carte sans date de péremption";

      boutonsMontants.innerHTML = (offre.presetAmounts || [])
        .map((montant) => `<button type="button" class="kadosk-montant-bouton" data-montant="${montant}">${montant} DH</button>`)
        .join("");

      boutonsMontants.querySelectorAll(".kadosk-montant-bouton").forEach((bouton) => {
        bouton.addEventListener("click", () => selectionnerMontant(Number(bouton.dataset.montant), bouton));
      });

      if (offre.freeAmountEnabled) {
        blocMontantLibre.style.display = "block";
      }

      majTotaux();
    } catch (erreur) {
      console.error("Erreur chargement offre :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Ce commerce n'accepte pas de commande de carte cadeau pour le moment.";
    }
  }

  inputMontantLibre.addEventListener("input", () => {
    const valeur = Number(inputMontantLibre.value);
    if (valeur > 0) {
      montantLibreActif = true;
      montantSelectionne = valeur;
      document.querySelectorAll(".kadosk-montant-bouton").forEach((b) => b.classList.remove("actif"));
    } else {
      montantLibreActif = false;
      montantSelectionne = null;
    }
    majBoutonAjouter();
    majTotaux();
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

  inputMessage.addEventListener("input", () => {
    compteurMessage.textContent = String(inputMessage.value.length);
  });

  btnAjouterPanier.addEventListener("click", () => {
    if (!montantSelectionne || montantSelectionne <= 0) return;

    if (montantLibreActif && (montantSelectionne < offre.freeAmountMin || montantSelectionne > offre.freeAmountMax)) {
      messageAjout.textContent = `Le montant doit être entre ${offre.freeAmountMin} et ${offre.freeAmountMax} MAD.`;
      messageAjout.style.color = "var(--kadosk-danger)";
      return;
    }

    KADOSK_PANIER.ajouter({
      merchantId,
      businessName: offre.businessName,
      logoUrl: offre.logoUrl,
      montant: montantSelectionne,
      quantite
    });

    // Les infos destinataire (nom/email/message) sont saisies ici pour le confort,
    // mais restent à confirmer sur panier.html au moment du paiement (un panier peut
    // regrouper plusieurs marchands, chacun avec son propre virement).
    window.location.href = "panier.html";
  });

  charger();
})();
