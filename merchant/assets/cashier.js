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
  // premier clic sur la page (onglets, Rechercher, Encaisser) pour qu'il soit déjà
  // prêt quand un son doit être joué automatiquement après un scan caméra.
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
  // Rempli uniquement quand la carte affichée vient d'un QR temporaire (30s,
  // anti-rejeu) plutôt que d'un code permanent scanné/saisi - voir boucleScan()
  // et encaisser() plus bas. Jamais les deux en même temps que codeCarteActuelle.
  let payloadQrActuel = null;
  // Copie UX du dernier solde renvoyé par la vérification. Elle sert uniquement à
  // bloquer une saisie manifestement trop élevée avant l'appel réseau ; le backend
  // refait obligatoirement le contrôle atomique sur le solde courant.
  let soldeAfficheActuel = null;
  const PREFIXE_QR_TEMPORAIRE = "KDSKQR1:";

  const ongletScan = document.getElementById("ongletScan");
  const ongletManuel = document.getElementById("ongletManuel");
  const panneauScan = document.getElementById("panneauScan");
  const panneauManuel = document.getElementById("panneauManuel");
  const blocVideoScan = document.getElementById("blocVideoScan");
  const videoScan = document.getElementById("videoScan");
  const canvasScan = document.getElementById("canvasScan");
  const messageStatutScan = document.getElementById("messageStatutScan");
  const boutonArreterScan = document.getElementById("boutonArreterScan");
  const boutonRescanner = document.getElementById("boutonRescanner");

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

  function afficherResultatOperation(type, texte) {
    messageStatutEncaissement.classList.remove("kadosk-resultat-operation", "succes", "erreur");
    if (type) messageStatutEncaissement.classList.add("kadosk-resultat-operation", type);
    messageStatutEncaissement.style.color = type === "succes" ? "#1faa6c" : type === "erreur" ? "#c0392b" : "";
    messageStatutEncaissement.textContent = texte || "";
  }

  if (window.KADOSK_ICONES) {
    const iconeOngletScan = document.getElementById("iconeOngletScan");
    const iconeOngletManuel = document.getElementById("iconeOngletManuel");
    if (iconeOngletScan) iconeOngletScan.innerHTML = window.KADOSK_ICONES.qr || "";
    if (iconeOngletManuel) iconeOngletManuel.innerHTML = window.KADOSK_ICONES.clavier || "";
  }

  // --- Scanner QR ---
  let fluxCamera = null;
  let idAnimationScan = null;
  let scanEnCours = false;
  // Bug trouvé : demarrerScan() n'avait aucune protection contre les appels en double.
  // Sur mobile, la fenêtre d'autorisation caméra du système fait passer la page en
  // "cachée" puis "visible" (document.hidden bascule), ce qui déclenche le listener
  // visibilitychange plus bas et relance demarrerScan() une seconde fois PENDANT que
  // le premier appel attend encore la réponse de getUserMedia. Deux négociations
  // caméra concurrentes sur le même appareil peuvent alors se sérialiser côté
  // système et prendre jusqu'à ~30 secondes avant qu'un flux utilisable arrive -
  // ce n'est donc pas le matériel qui est lent, c'est le site qui redemandait la
  // caméra une deuxième fois sans s'en rendre compte. Ces deux drapeaux empêchent
  // ce doublon et referment proprement un flux obtenu trop tard si entre-temps on a
  // demandé l'arrêt du scan.
  let demarrageEnCours = false;
  let annulationDemandee = false;
  const contexteCanvas = canvasScan.getContext("2d", { willReadFrequently: true });

  function afficherOngletScan() {
    ongletScan.classList.add("actif");
    ongletManuel.classList.remove("actif");
    panneauScan.style.display = "block";
    panneauManuel.style.display = "none";
    reinitialiserFormulaire();
    demarrerScan();
  }

  function afficherOngletManuel() {
    ongletManuel.classList.add("actif");
    ongletScan.classList.remove("actif");
    panneauManuel.style.display = "block";
    panneauScan.style.display = "none";
    arreterScan();
    reinitialiserFormulaire();
    champCode.focus();
  }

  async function demarrerScan() {
    // Empêche deux négociations caméra simultanées (voir l'explication plus haut) :
    // si un démarrage est déjà en cours, ou si la caméra tourne déjà, on ne fait rien.
    if (demarrageEnCours || fluxCamera) {
      return;
    }
    demarrageEnCours = true;
    annulationDemandee = false;

    afficherEtatCameraActive();

    if (!window.jsQR) {
      messageStatutScan.textContent = "Le scanner QR n'a pas pu se charger. Utilisez la saisie manuelle.";
      demarrageEnCours = false;
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      messageStatutScan.textContent = "La caméra n'est pas disponible sur cet appareil. Utilisez la saisie manuelle.";
      demarrageEnCours = false;
      return;
    }

    // Sur certains téléphones, l'activation peut malgré tout prendre quelques secondes
    // (matériel qui se réveille) : on affiche juste un message pour que ça ne semble
    // pas figé si ça prend du temps.
    const avertissementLenteur = setTimeout(() => {
      if (!scanEnCours) {
        messageStatutScan.textContent = "Ça prend plus de temps que prévu… (vérifiez qu'aucune autre application n'utilise la caméra)";
      }
    }, 6000);

    try {
      messageStatutScan.textContent = "Initialisation de la caméra…";
      let flux;
      try {
        flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
      } catch (erreurContrainte) {
        // Repli : "ideal" est censé être un simple souhait (jamais une exigence
        // stricte), mais certains navigateurs/webviews échouent quand même dessus -
        // typiquement un ordinateur qui n'a qu'une seule caméra (jamais "environment"),
        // ou certains navigateurs mobiles pointilleux. On retente sans cette
        // contrainte plutôt que d'abandonner directement sur la première caméra
        // disponible, réellement utilisable.
        if (
          erreurContrainte &&
          (erreurContrainte.name === "OverconstrainedError" || erreurContrainte.name === "ConstraintNotSatisfiedError")
        ) {
          flux = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw erreurContrainte;
        }
      }

      if (annulationDemandee) {
        // Le scan a été arrêté (page cachée, changement d'onglet...) pendant qu'on
        // attendait la caméra : on referme ce flux tout de suite au lieu de s'en
        // servir, pour ne jamais laisser deux flux caméra ouverts en même temps.
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }

      fluxCamera = flux;
      videoScan.srcObject = fluxCamera;
      await videoScan.play();
      messageStatutScan.textContent = "Visez le QR code de la carte cadeau.";
      scanEnCours = true;
      idAnimationScan = requestAnimationFrame(boucleScan);
    } catch (erreur) {
      // Message précis selon la cause réelle (loggée pour diagnostic) plutôt qu'un
      // seul message générique qui masque si c'est un refus, une absence de caméra,
      // ou une caméra déjà occupée par une autre application/onglet.
      console.error("Erreur accès caméra (scan QR) :", erreur && erreur.name, erreur && erreur.message, erreur);
      if (erreur && erreur.name === "NotAllowedError") {
        messageStatutScan.textContent =
          "Accès à la caméra refusé. Autorisez la caméra pour ce site dans les paramètres de votre navigateur, ou utilisez la saisie manuelle.";
      } else if (erreur && erreur.name === "NotFoundError") {
        messageStatutScan.textContent = "Aucune caméra détectée sur cet appareil. Utilisez la saisie manuelle.";
      } else if (erreur && erreur.name === "NotReadableError") {
        messageStatutScan.textContent =
          "La caméra est déjà utilisée par une autre application ou un autre onglet. Fermez-la puis réessayez, ou utilisez la saisie manuelle.";
      } else {
        messageStatutScan.textContent = "Accès à la caméra refusé ou indisponible. Utilisez la saisie manuelle.";
      }
    } finally {
      clearTimeout(avertissementLenteur);
      demarrageEnCours = false;
    }
  }

  function arreterScan() {
    annulationDemandee = true;
    scanEnCours = false;
    if (idAnimationScan) {
      cancelAnimationFrame(idAnimationScan);
      idAnimationScan = null;
    }
    if (fluxCamera) {
      fluxCamera.getTracks().forEach((piste) => piste.stop());
      fluxCamera = null;
    }
    videoScan.srcObject = null;
  }

  // La caméra reste allumée pendant la recherche du QR code, et se coupe dès
  // qu'un code est détecté (pas de relance automatique : le marchand décide
  // quand scanner la carte suivante via le bouton "Scanner une autre carte").
  function afficherEtatCameraActive() {
    blocVideoScan.style.display = "block";
    boutonArreterScan.style.display = "inline-flex";
    boutonRescanner.style.display = "none";
  }

  function afficherEtatCameraArretee() {
    arreterScan();
    blocVideoScan.style.display = "none";
    boutonArreterScan.style.display = "none";
    boutonRescanner.style.display = "inline-flex";
  }

  function boucleScan() {
    if (!scanEnCours) return;

    if (videoScan.readyState === videoScan.HAVE_ENOUGH_DATA) {
      canvasScan.width = videoScan.videoWidth;
      canvasScan.height = videoScan.videoHeight;
      contexteCanvas.drawImage(videoScan, 0, 0, canvasScan.width, canvasScan.height);

      try {
        const imageData = contexteCanvas.getImageData(0, 0, canvasScan.width, canvasScan.height);
        const resultat = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (resultat && resultat.data) {
          const codeDetecte = resultat.data.trim();
          if (codeDetecte) {
            messageStatutScan.textContent = "Code détecté, vérification en cours…";
            afficherEtatCameraArretee();
            if (codeDetecte.startsWith(PREFIXE_QR_TEMPORAIRE)) {
              // QR temporaire anti-rejeu (voir "Mes commandes" côté acheteur) : jamais
              // le code permanent, jamais saisi manuellement - uniquement via ce scan.
              rechercherCarteParQr(codeDetecte);
            } else {
              champCode.value = codeDetecte;
              rechercherCarte();
            }
            return;
          }
        }
      } catch (erreur) {
        // image pas encore exploitable, on continue la boucle
      }
    }

    idAnimationScan = requestAnimationFrame(boucleScan);
  }

  // Prépare/débloque l'AudioContext dès le premier vrai geste utilisateur sur la
  // page, pour que les sons déclenchés plus tard automatiquement (après un scan
  // caméra détecté en dehors d'un clic direct) puissent bien être joués.
  panneauScan.addEventListener("click", prepareContexteAudio, { once: true });
  panneauManuel.addEventListener("click", prepareContexteAudio, { once: true });

  ongletScan.addEventListener("click", afficherOngletScan);
  ongletManuel.addEventListener("click", afficherOngletManuel);
  boutonArreterScan.addEventListener("click", afficherOngletManuel);
  boutonRescanner.addEventListener("click", () => {
    reinitialiserFormulaire();
    demarrerScan();
  });

  window.addEventListener("beforeunload", arreterScan);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      arreterScan();
    } else if (panneauScan.style.display !== "none" && boutonRescanner.style.display === "none") {
      // On ne relance la caméra automatiquement que si elle était censée
      // être active (pas si un code vient d'être trouvé et la caméra coupée volontairement).
      demarrerScan();
    }
  });

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

  // --- Recherche et encaissement (partagés entre scan et saisie manuelle) ---

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
    messageStatutEncaissement.textContent = "";
    codeCarteActuelle = null;
    payloadQrActuel = null;
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
      if (panneauManuel.style.display !== "none" && !champMontant.readOnly) {
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

  // Même rôle que rechercherCarte(), mais pour un QR temporaire anti-rejeu : le
  // payload change toutes les 30s, donc pas de champ de saisie manuelle possible
  // ici - uniquement déclenché depuis boucleScan() ci-dessus.
  async function rechercherCarteParQr(payload) {
    codeCarteActuelle = null;
    payloadQrActuel = null;
    messageStatutEncaissement.textContent = "";

    carteInfo.style.display = "block";
    carteInfo.textContent = "Vérification en cours...";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";

    try {
      const statut = await KADOSK_API.checkQrTemporaire(payload);

      afficherDetailsCarte(statut);
      jouerSonSucces();

      payloadQrActuel = payload;
      soldeAfficheActuel = Number(statut.remainingBalance);
      champMontant.value = String(statut.remainingBalance).replace(".", ",");
      blocMontant.style.display = "block";
      blocBoutonEncaisser.style.display = "flex";
      activerPaveNumeriqueSiMobile();
    } catch (erreur) {
      payloadQrActuel = null;
      const codeErreur = erreur && erreur.message;
      if (codeErreur === "QR_CODE_EXPIRE") {
        carteInfo.textContent = "Ce QR a expiré (il se renouvelle toutes les 30s) — redemandez au client de le rafraîchir et rescannez.";
      } else if (codeErreur === "GIFT_CARD_SUSPENDED") {
        carteInfo.textContent = "Cette carte est suspendue temporairement. Contactez le support KADOSK.";
      } else if (codeErreur === "GIFT_CARD_CANCELLED") {
        carteInfo.textContent = "Cette carte a été annulée et ne peut plus être utilisée.";
      } else if (codeErreur === "TROP_DE_TENTATIVES") {
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
    if (!codeCarteActuelle && !payloadQrActuel) {
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

    boutonEncaisser.disabled = true;

    try {
      // Le payload d'un QR temporaire expire ~30-60s après affichage : si le
      // marchand tarde entre le scan et le clic "Encaisser", l'appel ci-dessous
      // échoue avec QR_CODE_EXPIRE plutôt que d'encaisser sur un état obsolète -
      // c'est le comportement voulu (anti-rejeu), pas un bug.
      const resultat = payloadQrActuel
        ? await KADOSK_API.redeemQrTemporaire(payloadQrActuel, montant)
        : await KADOSK_API.redeemGiftCard(codeCarteActuelle, montant);

      // reinitialiserFormulaire() vide messageStatutEncaissement (voir sa
      // définition) - on réinitialise donc D'ABORD le formulaire, puis on affiche
      // le message de confirmation ENSUITE, sinon il était effacé dans la même
      // frappe avant que le caissier ait pu le voir.
      const enModeScan = panneauScan.style.display !== "none";
      reinitialiserFormulaire();
      if (enModeScan) {
        boutonRescanner.style.display = "inline-flex";
      }

      afficherResultatOperation("succes", resultat.fullyRedeemed
        ? "Encaissement de " + resultat.amountRedeemed + " DH validé. Carte entièrement utilisée."
        : "Encaissement de " + resultat.amountRedeemed + " DH validé. Solde restant : " + resultat.remainingBalance + " DH.");

      chargerHistoriqueTransactions();
    } catch (erreur) {
      const codeErreurEncaissement = erreur && erreur.message;
      afficherResultatOperation("erreur", codeErreurEncaissement === "QR_CODE_EXPIRE"
        ? "Le QR a expiré avant l'encaissement (il se renouvelle toutes les 30s) — redemandez au client de le rafraîchir et rescannez."
        : codeErreurEncaissement === "TROP_DE_TENTATIVES"
        ? "Trop de tentatives. Merci de réessayer plus tard."
        : codeErreurEncaissement === "GIFT_CARD_SUSPENDED"
        ? "Cette carte a été suspendue entre-temps. Contactez le support KADOSK."
        : codeErreurEncaissement === "GIFT_CARD_CANCELLED"
        ? "Cette carte a été annulée entre-temps et ne peut plus être utilisée."
        : "L'encaissement a échoué. Merci de réessayer.");
    } finally {
      boutonEncaisser.disabled = false;
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

  // --- Démarrage : onglet initial selon ?mode= ---
  const modeInitial = new URLSearchParams(window.location.search).get("mode");
  if (modeInitial === "manual") {
    afficherOngletManuel();
  } else {
    afficherOngletScan();
  }
})();
