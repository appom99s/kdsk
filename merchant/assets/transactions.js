(function () {
  const champRecherche = document.getElementById("champRecherche");
  const corpsTable = document.getElementById("corpsTableTransactions");
  const etatVide = document.getElementById("etatVideTransactions");
  const filtres = document.querySelectorAll(".kadosk-filtre");

  let toutesTransactions = [];
  let filtreActif = "ALL";
  let minuteurRecherche = null;

  const LIBELLES_ACTION = {
    REDEEMED: "Encaissement",
    REDEEM_FAILED: "Encaissement échoué",
    CHECK_FAILED: "Vérification échouée",
    ACTIVATED: "Activation"
  };

  const LIBELLES_RAISON = {
    GIFT_CARD_NOT_FOUND: "Code introuvable",
    CODE_INTROUVABLE: "Code introuvable",
    MERCHANT_NOT_AUTHORIZED: "Carte non acceptée par ce commerce",
    CARTE_EXPIREE: "Carte expirée",
    EXPIRED_GIFT_CARD: "Carte expirée",
    INSUFFICIENT_BALANCE: "Solde insuffisant",
    GIFT_CARD_NOT_ACTIVE: "Carte non active",
    TROP_DE_TENTATIVES: "Trop de tentatives, compte temporairement bloqué",
    RACHAT_PARTIEL: "Rachat partiel (solde restant)",
    SOLDE_EPUISE: "Solde épuisé"
  };

  function libelleRaison(raison) {
    if (!raison) return "—";
    return LIBELLES_RAISON[raison] || raison;
  }

  function formaterDate(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? String(valeur) : date.toLocaleString("fr-FR");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  function codeMasque(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "00***";
  }

  const LIBELLES_ROLE_ACTEUR = { OWNER: "Propriétaire", CASHIER: "Caissier" };

  // Traçabilité (voir enregistrerTransaction/ActorName côté backend) : le nom
  // est celui du membre d'équipe (ou "Propriétaire") saisi lors de l'ajout à
  // l'équipe, capturé au moment de chaque action - jamais recalculé après
  // coup, donc toujours correct même si ce membre est renommé ou retiré
  // depuis. Vide sur les transactions enregistrées avant l'ajout de ce champ.
  function libelleActeur(entree) {
    if (entree.actorName) return entree.actorName;
    if (entree.actorRole) return LIBELLES_ROLE_ACTEUR[entree.actorRole] || entree.actorRole;
    return "—";
  }

  function appliquerFiltreEtAfficher() {
    const listeFiltree = toutesTransactions.filter((entree) => {
      if (filtreActif === "SUCCESS") return !!entree.success;
      if (filtreActif === "FAILED") return !entree.success;
      return true;
    });

    corpsTable.innerHTML = "";

    if (listeFiltree.length === 0) {
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";

    listeFiltree.forEach((entree) => {
      const ligne = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formaterDate(entree.createdAt);

      const tdCarte = document.createElement("td");
      tdCarte.textContent = "Carte " + codeMasque(entree.giftCardId);

      const tdAction = document.createElement("td");
      tdAction.textContent = LIBELLES_ACTION[entree.action] || entree.action;

      const tdMontant = document.createElement("td");
      tdMontant.textContent = entree.amount ? formaterMontant(entree.amount) + " DH" : "—";

      const tdActeur = document.createElement("td");
      tdActeur.textContent = libelleActeur(entree);

      const tdResultat = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "kadosk-badge " + (entree.success ? "kadosk-badge-actif" : "kadosk-badge-neutre");
      if (!entree.success) badge.style.cssText = "background:var(--kadosk-danger-tint); color:var(--kadosk-danger);";
      badge.textContent = entree.success ? "Réussie" : "Refusée";
      tdResultat.appendChild(badge);

      const tdRaison = document.createElement("td");
      tdRaison.textContent = entree.success ? "—" : libelleRaison(entree.reason);
      if (!entree.success && entree.reason) tdRaison.style.color = "var(--kadosk-danger)";

      ligne.appendChild(tdDate);
      ligne.appendChild(tdCarte);
      ligne.appendChild(tdAction);
      ligne.appendChild(tdMontant);
      ligne.appendChild(tdActeur);
      ligne.appendChild(tdResultat);
      ligne.appendChild(tdRaison);

      corpsTable.appendChild(ligne);
    });
  }

  async function chargerTransactions(codeRecherche) {
    corpsTable.innerHTML = '<tr><td colspan="7"><div class="kadosk-chargement-ligne"><span class="kadosk-spinner"></span> Chargement…</div></td></tr>';
    etatVide.style.display = "none";
    try {
      const resultat = await KADOSK_API.getRecentTransactions(codeRecherche || null, 100);
      toutesTransactions = resultat.items || [];
      appliquerFiltreEtAfficher();
    } catch (erreur) {
      console.error("Erreur chargement transactions :", erreur);
      toutesTransactions = [];
      appliquerFiltreEtAfficher();
    }
  }

  champRecherche.addEventListener("input", () => {
    clearTimeout(minuteurRecherche);
    minuteurRecherche = setTimeout(() => {
      chargerTransactions(champRecherche.value.trim());
    }, 400);
  });

  filtres.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      filtres.forEach((b) => b.classList.remove("actif"));
      bouton.classList.add("actif");
      filtreActif = bouton.getAttribute("data-filtre");
      appliquerFiltreEtAfficher();
    });
  });

  chargerTransactions();
})();
