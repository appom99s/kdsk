(function () {
  // L'authentification, la barre latérale, l'en-tête et la déconnexion sont
  // gérées par guard.js (chargé avant ce script).

  // AUDIT SÉCURITÉ : échappeur HTML local garanti - ne dépend plus de
  // window.KADOSK_ECHAPPER_HTML (défini par nav.js) avec repli silencieux sur "pas
  // d'échappement du tout" si ce script n'était pas chargé. statut.buyerName/
  // buyerEmail viennent d'une commande créée par un visiteur anonyme non authentifié
  // et sont affichés ici (ligneInfo) dans la page d'encaissement DU MARCHAND, qui
  // contient les jetons OAuth du marchand en localStorage - un nom non échappé y
  // serait un vecteur de vol de session (XSS stocké).
  function echapperHtml(valeur) {
    return String(valeur === null || valeur === undefined ? "" : valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // --- Sons de retour (succès / rejet) --------------------------------------
  // Générés directement via l'API Web Audio (deux tonalités synthétisées), sans
  // fichier audio externe à héberger. Les navigateurs exigent qu'un AudioContext
  // soit créé/repris suite à un vrai geste utilisateur : on le prépare donc au
  // premier clic sur la page (Rechercher, Encaisser).
  let contexteAudio = null;
  function prepareContexteAudio() {
    if (!contexteAudio) {
      const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClasse) return null;
      try {
        contexteAudio = new AudioContextClasse();
      } catch (erreur) {
        return null;
      }
    }
    if (contexteAudio.state === "suspended") {
      contexteAudio.resume().catch(() => {});
    }
    return contexteAudio;
  }

  function jouerTon(frequences, dureeParTon, typeOnde) {
    const ctx = prepareContexteAudio();
    if (!ctx) return;
    let tempsDepart = ctx.currentTime;
    frequences.forEach((frequence) => {
      const oscillateur = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillateur.type = typeOnde || "sine";
      oscillateur.frequency.setValueAtTime(frequence, tempsDepart);
      gain.gain.setValueAtTime(0.0001, tempsDepart);
      gain.gain.exponentialRampToValueAtTime(0.22, tempsDepart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, tempsDepart + dureeParTon);
      oscillateur.connect(gain);
      gain.connect(ctx.destination);
      oscillateur.start(tempsDepart);
      oscillateur.stop(tempsDepart + dureeParTon + 0.02);
      tempsDepart += dureeParTon;
    });
  }

  // Deux notes montantes, comme un "ding" de caisse - carte valide et acceptée.
  function jouerSonSucces() {
    jouerTon([880, 1320], 0.09, "sine");
  }

  // Une note grave et courte, comme un buzz de refus - carte invalide/rejetée.
  function jouerSonRejet() {
    jouerTon([180], 0.18, "square");
  }

  let codeCarteActuelle = null;

  // Copie UX du dernier solde renvoyé par la vérification. Elle sert uniquement à
  // bloquer une saisie manifestement trop élevée avant l'appel réseau ; le backend
  // refait obligatoirement le contrôle atomique sur le solde courant.
  let soldeAfficheActuel = null;

  const champCode = document.getElementById("champCode");
  const boutonRechercher = document.getElementById("boutonRechercher");
  const carteInfo = document.getElementById("carteInfo");
  const blocMontant = document.getElementById("blocMontant");
  const champMontant = document.getElementById("champMontant");
  const paveNumerique = document.getElementById("paveNumerique");
  const toucheEffacerPave = document.getElementById("toucheEffacerPave");
  const blocBoutonEncaisser = document.getElementById("blocBoutonEncaisser");
  const boutonEncaisser = document.getElementById("boutonEncaisser");
  const messageStatutEncaissement = document.getElementById("messageStatutEncaissement");
  const blocPin = document.getElementById("blocPin");
  const champPin = document.getElementById("champPin");
  // Clé d'idempotence d'un encaissement : réutilisée si le caissier réessaie le même
  // encaissement après une coupure, pour ne jamais débiter deux fois.
  let redemptionAttempt = null;

  const locationSelect = document.getElementById("champPointVente");
  KADOSK_API.cashierLocations().then(data => {
    locationSelect.replaceChildren();
    if (!data.locations.length) locationSelect.add(new Option('Établissement principal',''));
    else { locationSelect.add(new Option('Choisir un point de vente','')); data.locations.forEach(l => locationSelect.add(new Option(l.name,l.locationId))); }
  }).catch(() => { locationSelect.add(new Option('Points de vente indisponibles','')); });
  function afficherResultatOperation(type, texte) {
    messageStatutEncaissement.classList.remove("kadosk-resultat-operation", "succes", "erreur");
    if (type) messageStatutEncaissement.classList.add("kadosk-resultat-operation", type);
    messageStatutEncaissement.style.color = type === "succes" ? "#1faa6c" : type === "erreur" ? "#c0392b" : "";
    messageStatutEncaissement.textContent = texte || "";
  }

  // --- Pavé numérique tactile (mobile uniquement) pour le montant à encaisser ---
  // Sur mobile, le champ passe en lecture seule et ce pavé prend le relais du clavier du
  // téléphone (plus rapide à utiliser à la caisse). Sur desktop, le champ reste éditable
  // normalement et le pavé reste masqué.
  const REQUETE_MOBILE_PAVE = window.matchMedia("(max-width: 520px)");
  let saisieMontantDemarree = false;

  function activerPaveNumeriqueSiMobile() {
    if (!paveNumerique) return;
    if (!REQUETE_MOBILE_PAVE.matches) {
      paveNumerique.style.display = "none";
      champMontant.readOnly = false;
      return;
    }
    paveNumerique.style.display = "grid";
    champMontant.readOnly = true;
    saisieMontantDemarree = false;
  }

  function desactiverPaveNumerique() {
    if (!paveNumerique) return;
    paveNumerique.style.display = "none";
    champMontant.readOnly = false;
    saisieMontantDemarree = false;
  }

  // Si l'écran change de taille (rotation, redimensionnement) pendant qu'un montant est
  // affiché, on réévalue si le pavé doit apparaître ou disparaître.
  REQUETE_MOBILE_PAVE.addEventListener("change", () => {
    if (blocMontant.style.display !== "none") {
      activerPaveNumeriqueSiMobile();
    }
  });

  function appuyerToucheMontant(touche) {
    // La première frappe efface le montant pré-rempli (solde de la carte) pour repartir
    // d'une saisie neuve, comme sur un terminal de caisse classique.
    let valeurActuelle = saisieMontantDemarree ? champMontant.value : "";
    saisieMontantDemarree = true;

    if (touche === ",") {
      if (valeurActuelle.includes(",")) return;
      valeurActuelle = valeurActuelle === "" ? "0," : valeurActuelle + ",";
    } else if (valeurActuelle === "0") {
      // Évite les zéros non significatifs en tête ("00", "01"...).
      valeurActuelle = touche;
    } else {
      valeurActuelle += touche;
    }

    champMontant.value = valeurActuelle;
  }

  function effacerToucheMontant() {
    const valeurActuelle = saisieMontantDemarree ? champMontant.value : "";
    champMontant.value = valeurActuelle.slice(0, -1);
    saisieMontantDemarree = true;
  }

  // Garde défensive : si cashier.html n'a pas (encore) le pavé numérique, ne pas
  // planter tout le script pour autant - un getElementById manquant ici ne doit
  // jamais empêcher les boutons "Rechercher"/"Encaisser" plus bas de fonctionner.
  if (paveNumerique) {
    paveNumerique.querySelectorAll(".kadosk-touche-pave[data-touche]").forEach((touche) => {
      touche.addEventListener("click", () => appuyerToucheMontant(touche.dataset.touche));
    });
  }
  if (toucheEffacerPave) {
    toucheEffacerPave.addEventListener("click", effacerToucheMontant);
  }

  // --- Recherche (code permanent) et encaissement (PIN du client) ---

  const LIBELLES_PORTEE = {
    UNIVERSAL: "Universelle · valable chez tous les marchands KADOSK",
    DOMAIN: "Sectorielle",
    MERCHANT_ONLY: "Réservée à un marchand spécifique"
  };

  function formaterDateCarte(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-FR");
  }

  function ligneInfo(label, valeur) {
    return (
      '<div style="display:flex; justify-content:space-between; gap:12px; padding:5px 0; font-size:13px;">' +
      '<span style="color:var(--kadosk-texte-clair);">' + echapperHtml(label) + "</span>" +
      '<span style="font-weight:600; text-align:right;">' + echapperHtml(valeur) + "</span>" +
      "</div>"
    );
  }

  // Sécurité : le serveur (checkGiftCardStatus) ne renvoie plus jamais une réponse
  // pour une carte qui n'appartient pas à ce marchand - il lève la même erreur que
  // pour un code inexistant (voir le catch de rechercherCarte, "Carte introuvable.").
  // afficherDetailsCarte n'est donc appelée que pour une carte autorisée.
  function afficherDetailsCarte(statut) {
    const libellePortee = statut.scope === "DOMAIN" && statut.domain
      ? LIBELLES_PORTEE.DOMAIN + " · " + statut.domain
      : (LIBELLES_PORTEE[statut.scope] || LIBELLES_PORTEE.MERCHANT_ONLY);

    const dateExpiration = formaterDateCarte(statut.expirationDate);

    let html = "";
    html += ligneInfo("Solde disponible", statut.remainingBalance + " DH");
    if (statut.initialBalance !== null && statut.initialBalance !== undefined) {
      html += ligneInfo("Montant initial", statut.initialBalance + " DH");
    }
    html += ligneInfo("Titulaire", statut.buyerName || statut.buyerEmail || "Non renseigné");
    html += ligneInfo("Expiration", dateExpiration || "Sans date d'expiration");
    html += ligneInfo("Portée", libellePortee);

    carteInfo.innerHTML = html;
  }

  function reinitialiserFormulaire() {
    champCode.value = "";
    carteInfo.style.display = "none";
    carteInfo.innerHTML = "";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";
    blocPin.style.display = "none";
    champPin.value = "";
    messageStatutEncaissement.textContent = "";
    codeCarteActuelle = null;

    soldeAfficheActuel = null;
    desactiverPaveNumerique();
  }

  async function rechercherCarte() {
    const code = champCode.value.trim();
    messageStatutEncaissement.textContent = "";

    if (!code) {
      return;
    }

    carteInfo.style.display = "block";
    carteInfo.textContent = "Recherche en cours...";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";

    try {
      const statut = await KADOSK_API.checkGiftCard(code);

      if (statut.status === "DRAFT") {
        carteInfo.textContent = "Cette carte n'a pas encore été activée.";
        jouerSonRejet();
        return;
      }
      if (statut.expired) {
        carteInfo.textContent = "Cette carte a expiré.";
        jouerSonRejet();
        return;
      }
      if (statut.status === "SUSPENDED") {
        carteInfo.textContent = "Cette carte est suspendue temporairement. Contactez le support KADOSK.";
        jouerSonRejet();
        return;
      }
      if (statut.status === "CANCELLED") {
        carteInfo.textContent = "Cette carte a été annulée et ne peut plus être utilisée.";
        jouerSonRejet();
        return;
      }
      if (statut.status !== "ACTIVE") {
        carteInfo.textContent = "Cette carte a déjà été entièrement utilisée.";
        jouerSonRejet();
        return;
      }

      afficherDetailsCarte(statut);
      jouerSonSucces();

      codeCarteActuelle = code;
      soldeAfficheActuel = Number(statut.remainingBalance);
      champMontant.value = String(statut.remainingBalance).replace(".", ",");
      blocMontant.style.display = "block";
      blocBoutonEncaisser.style.display = "flex";
      activerPaveNumeriqueSiMobile();
      blocPin.style.display = "block";
      champPin.value = "";
      if (!champMontant.readOnly) {
        champMontant.focus();
      }
    } catch (erreur) {
      codeCarteActuelle = null;
      const codeErreur = erreur && erreur.message;
      // On distingue les erreurs qui n'ont rien à voir avec "ce code n'existe pas" -
      // les confondre a déjà causé une recherche qui semblait cassée sans raison visible.
      if (codeErreur === "TROP_DE_TENTATIVES") {
        carteInfo.textContent = "Trop de tentatives de vérification. Merci de réessayer plus tard.";
      } else if (codeErreur === "MERCHANT_PLAN_NOT_ACTIVE") {
        carteInfo.textContent = "Votre abonnement KADOSK n'est pas actif. Vérifiez la section Abonnement dans Mon entreprise.";
      } else if (codeErreur === "NOT_AUTHENTICATED" || codeErreur === "MERCHANT_NOT_FOUND" || codeErreur === "MERCHANT_ROLE_NOT_ASSIGNED") {
        carteInfo.textContent = "Session expirée. Merci de vous reconnecter.";
      } else {
        carteInfo.textContent = "Carte introuvable.";
        jouerSonRejet();
      }
    }
  }

  async function encaisser() {
    if (boutonEncaisser.disabled) return;
    if (!codeCarteActuelle) {
      return;
    }

    const montant = Number(String(champMontant.value).replace(",", "."));
    if (!montant || montant <= 0) {
      messageStatutEncaissement.textContent = "Merci d'indiquer un montant valide.";
      return;
    }
    if (Number.isFinite(soldeAfficheActuel) && montant > soldeAfficheActuel) {
      afficherResultatOperation("erreur", "Montant refusé : le solde affiché est de " + soldeAfficheActuel.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH.");
      champMontant.focus();
      champMontant.select();
      return;
    }

    const pin = champPin.value.trim();
    if (!/^\d{6}$/.test(pin)) {
      afficherResultatOperation("erreur", "Le client doit saisir son PIN à 6 chiffres.");
      champPin.focus();
      return;
    }

    boutonEncaisser.disabled = true;
    boutonEncaisser.setAttribute("aria-busy", "true");
    afficherResultatOperation("", "Vérification du PIN…");

    try {
      const attemptKey = [codeCarteActuelle, montant, locationSelect.value].join('|');
      if (!redemptionAttempt || redemptionAttempt.key !== attemptKey) redemptionAttempt = {key:attemptKey,id:crypto.randomUUID()};
      champPin.value = "";
      let reponse = await KADOSK_API.beginRedemption({code:codeCarteActuelle,amount:montant,requestId:redemptionAttempt.id,locationId:locationSelect.value,pin});
      // Le serveur débite dans le même appel ; une seule relecture couvre une réponse tardive.
      if (reponse.state !== 'COMPLETED' && reponse.requestId) reponse = await KADOSK_API.redemptionStatus(reponse.requestId);
      if (reponse.state !== 'COMPLETED') throw new Error(reponse.state === 'EXPIRED' ? 'CONFIRMATION_EXPIRED' : 'REDEMPTION_PENDING');
      const resultat = reponse.result;
      redemptionAttempt = null;

      reinitialiserFormulaire();

      afficherResultatOperation("succes", resultat.fullyRedeemed
        ? "Encaissement de " + resultat.amountRedeemed + " DH validé. Carte entièrement utilisée."
        : "Encaissement de " + resultat.amountRedeemed + " DH validé. Solde restant : " + resultat.remainingBalance + " DH.");

      messageStatutEncaissement.textContent += " Référence : " + resultat.reference;
      chargerHistoriqueTransactions();
    } catch (erreur) {
      afficherResultatOperation("erreur", KADOSK_SECURE_UI.error(erreur));
    } finally {
      boutonEncaisser.disabled = false;
      boutonEncaisser.removeAttribute("aria-busy");
    }
  }

  // --- Historique de MES transactions (voir getRecentTransactions côté
  // backend : filtré automatiquement à l'acteur connecté pour un caissier,
  // pas de filtre pour le propriétaire - accès de base, pas une permission
  // à cocher par l'owner, contrairement à Commandes/Cartes cadeaux). ---
  const listeTransactionsCashier = document.getElementById("listeTransactionsCashier");

  const LIBELLES_ACTION_TRANSACTION = {
    REDEEMED: "Encaissement",
    REDEEM_FAILED: "Encaissement échoué",
    CHECK_FAILED: "Vérification échouée"
  };

  function formaterDateTransaction(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR") + " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function masquerId(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "···";
  }

  async function chargerHistoriqueTransactions() {
    if (!listeTransactionsCashier || !window.KADOSK_API || !KADOSK_API.getRecentTransactions) return;
    try {
      const resultat = await KADOSK_API.getRecentTransactions("", 20);
      const entrees = (resultat && resultat.items) || [];
      if (entrees.length === 0) {
        listeTransactionsCashier.innerHTML = '<div class="kadosk-liste-vide">Aucune transaction pour le moment.</div>';
        return;
      }
      listeTransactionsCashier.innerHTML = entrees
        .map((entree) => {
          const libelleAction = LIBELLES_ACTION_TRANSACTION[entree.action] || entree.action;
          const couleur = entree.success ? "#1faa6c" : "#c0392b";
          const montant = entree.amount ? Number(entree.amount).toLocaleString("fr-FR") + " DH" : "";
          return (
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.06); font-size:13px;">' +
            '<div>' +
            '<div style="font-weight:600; color:' + couleur + ';">' + echapperHtml(libelleAction) + (entree.giftCardId ? " · " + echapperHtml(masquerId(entree.giftCardId)) : "") + "</div>" +
            '<div style="color:var(--kadosk-texte-clair);">' + formaterDateTransaction(entree.createdAt) + "</div>" +
            "</div>" +
            '<div style="font-weight:600;">' + echapperHtml(montant) + "</div>" +
            "</div>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement historique transactions cashier :", erreur);
      listeTransactionsCashier.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger l\'historique.</div>';
    }
  }

  chargerHistoriqueTransactions();

  boutonRechercher.addEventListener("click", rechercherCarte);
  boutonEncaisser.addEventListener("click", encaisser);
  champCode.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") rechercherCarte();
  });
  champMontant.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") encaisser();
  });

  champPin.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") encaisser();
  });
  document.addEventListener("click", prepareContexteAudio, { once: true });
  champCode.focus();
})();
