// Étape 5 : confirmation de commande + révélation des coordonnées de virement.
// Le RIB de chaque marchand est une donnée confidentielle : il n'est montré
// qu'après connexion par code envoyé à l'e-mail de la commande (même mécanisme
// que "Mes commandes" - demanderCodeCommandes/confirmerCodeCommandes), jamais
// avant. Voir giftCardSecurity.web.js :: getMerchantPaymentInfoBySku pour la
// vérification serveur (jeton + commande + marchand doivent tous correspondre).
(function () {
  const blocConfirmation = document.getElementById("blocConfirmation");
  const etatIntrouvable = document.getElementById("etatIntrouvable");
  const texteNumeroCommande = document.getElementById("texteNumeroCommande");
  const listeRecapFinal = document.getElementById("listeRecapFinal");
  const texteTotalFinal = document.getElementById("texteTotalFinal");
  const texteEmailDestinataire = document.getElementById("texteEmailDestinataire");

  const carteConnexionPaiement = document.getElementById("carteConnexionPaiement");
  const texteEmailConnexion = document.getElementById("texteEmailConnexion");
  const inputCodePaiement = document.getElementById("inputCodePaiement");
  const messageErreurCodePaiement = document.getElementById("messageErreurCodePaiement");
  const btnValiderCodePaiement = document.getElementById("btnValiderCodePaiement");
  const btnRenvoyerCodePaiement = document.getElementById("btnRenvoyerCodePaiement");

  const blocPaiementParMarchand = document.getElementById("blocPaiementParMarchand");
  const listePaiement = document.getElementById("listePaiement");

  document.getElementById("k2IconeSucces").innerHTML = window.KADOSK_ICONE("check-circle");

  function obtenirOuCreerDeviceId() {
    return window.KADOSK_BUYER_SESSION.deviceId;
  }

  function lireSessionAcheteur() {
    return window.KADOSK_BUYER_SESSION.lire();
  }

  function enregistrerSessionAcheteur(token, email, expiresInDays) {
    window.KADOSK_BUYER_SESSION.definir(token, email, expiresInDays);
  }

  function effacerSessionAcheteur() {
    window.KADOSK_BUYER_SESSION.effacer();
  }

  // Même mécanisme "une seule session par compte" que Mes commandes
  // (BuyerDeviceSessions/jti, voir giftCardSecurity.web.js) : une connexion
  // plus récente sur un autre appareil invalide celle-ci. Détecté ici plutôt
  // qu'affiché comme une simple erreur par marchand.
  function estErreurSession(erreur) {
    return (
      !!erreur &&
      (erreur.message === "JETON_INVALIDE" ||
        erreur.message === "JETON_EXPIRE" ||
        erreur.message === "SESSION_REVOQUEE" ||
        erreur.message === "SESSION_INDISPONIBLE")
    );
  }

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

  function afficherCommande(commande) {
    blocConfirmation.style.display = "block";
    etatIntrouvable.style.display = "none";

    texteNumeroCommande.textContent = commande.orderNumber || "";
    texteEmailDestinataire.textContent = commande.forSelf ? "votre adresse" : commande.recipientEmail || "";

    listeRecapFinal.innerHTML = (commande.merchants || [])
      .map(
        (m) => `
      <div class="k2-confirmation-ligne">
        <span>${echapperHtml(m.businessName)}${m.quantity > 1 ? " × " + m.quantity : ""}</span>
        <span>${formaterMontant(m.subtotal)}</span>
      </div>`
      )
      .join("");

    texteTotalFinal.textContent = formaterMontant(commande.totalAmount);
  }

  function blocLigneRib(label, valeur) {
    const idUnique = "rib_" + Math.random().toString(36).slice(2, 9);
    return `
      <div class="k2-rib-label">${label}</div>
      <div class="k2-rib-valeur" id="${idUnique}">${echapperHtml(valeur)}</div>
      <button type="button" class="k2-btn-copier" data-copier="${idUnique}">${window.KADOSK_ICONE("copy")} Copier</button>
    `;
  }

  function rendreBlocPaiement(merchantLine, infosPaiement, orderNumber, token) {
    const div = document.createElement("div");
    div.className = "k2-rib-bloc";

    if (!infosPaiement) {
      div.innerHTML = `
        <div class="k2-rib-entete">
          <span>${echapperHtml(merchantLine.businessName)}</span>
        </div>
        <p style="font-size:12px;color:var(--k2-danger);margin-top:8px;">Coordonnées de paiement momentanément indisponibles pour ce marchand.</p>
      `;
      return div;
    }

    div.innerHTML = `
      <div class="k2-rib-entete">
        <span>${echapperHtml(infosPaiement.businessName || merchantLine.businessName)}</span>
        <div class="k2-rib-montant">${formaterMontant(merchantLine.subtotal)}</div>
      </div>
      <div class="k2-rib-table">
        ${infosPaiement.ribHolderName ? blocLigneRib("Titulaire", infosPaiement.ribHolderName) : ""}
        ${infosPaiement.bankName ? blocLigneRib("Banque", infosPaiement.bankName) : ""}
        ${infosPaiement.rib ? blocLigneRib("RIB", infosPaiement.rib) : ""}
      </div>
      <div data-zone-confirmation></div>
    `;

    div.querySelectorAll("[data-copier]").forEach((bouton) => {
      bouton.addEventListener("click", async () => {
        const texte = document.getElementById(bouton.dataset.copier).textContent;
        try {
          await navigator.clipboard.writeText(texte);
          const libelleOriginal = bouton.innerHTML;
          bouton.innerHTML = `${window.KADOSK_ICONE("check")} Copié`;
          setTimeout(() => (bouton.innerHTML = libelleOriginal), 1500);
        } catch (erreur) {
          console.error("Copie impossible :", erreur);
        }
      });
    });

    const zoneConfirmation = div.querySelector("[data-zone-confirmation]");

    function rendreEtatConfirmation(confirme) {
      if (confirme) {
        zoneConfirmation.innerHTML = `
          <p class="k2-btn-virement-confirme">${window.KADOSK_ICONE("check-circle")} Virement signalé</p>
          <p class="k2-statut-attente">En attente de validation du marchand</p>
          <a class="k2-btn k2-btn-secondaire" style="width:100%;margin-top:10px;text-align:center" target="_blank" rel="noopener" href="https://wa.me/212601100292?text=${encodeURIComponent("Bonjour, j’ai effectué le virement pour la commande " + orderNumber + " auprès de " + (infosPaiement.businessName || merchantLine.businessName || "votre établissement") + ", montant " + formaterMontant(merchantLine.subtotal) + ". Merci de confirmer sa réception.")}">Prévenir le marchand sur WhatsApp</a>
        `;
        return;
      }
      zoneConfirmation.innerHTML = `
        <button type="button" class="k2-btn k2-btn-secondaire" data-btn-confirmer style="width:100%;margin-top:10px;">
          J'ai effectué le virement
        </button>
        <p class="k2-statut-attente">En attente de validation du marchand</p>
      `;
      const bouton = zoneConfirmation.querySelector("[data-btn-confirmer]");
      bouton.addEventListener("click", async () => {
        bouton.disabled = true;
        const libelleOriginal = bouton.innerHTML;
        bouton.innerHTML = "Envoi...";
        try {
          await KADOSK_API.confirmerVirementEffectue(orderNumber, merchantLine.merchantId, token);
          rendreEtatConfirmation(true);
        } catch (erreur) {
          console.error("Erreur confirmation virement :", erreur);
          bouton.disabled = false;
          bouton.innerHTML = libelleOriginal;
        }
      });
    }
    rendreEtatConfirmation(!!infosPaiement.transferConfirmed);

    return div;
  }

  async function chargerPaiements(commande, session) {
    blocPaiementParMarchand.style.display = "block";
    listePaiement.innerHTML = `<div class="k2-etat"><span id="k2IconeChargementPaiement"></span><br />Chargement des coordonnées de virement...</div>`;
    const iconeChargement = document.getElementById("k2IconeChargementPaiement");
    if (iconeChargement) iconeChargement.innerHTML = window.KADOSK_ICONE("clock");

    // Les RIB sont indépendants : les charger en parallèle évite d'additionner
    // un aller-retour réseau par marchand sur les paniers multi-marchands.
    const resultats = await Promise.all((commande.merchants || []).map(async (ligne) => {
      try {
        const infos = await KADOSK_API.getMerchantPaymentInfo(ligne.merchantId, session.token, commande.orderNumber);
        return { bloc: rendreBlocPaiement(ligne, infos, commande.orderNumber, session.token) };
      } catch (erreur) {
        if (estErreurSession(erreur)) {
          return { erreurSession: erreur };
        }
        console.error("Erreur chargement RIB marchand :", ligne.merchantId, erreur);
        return { bloc: rendreBlocPaiement(ligne, null, commande.orderNumber, session.token) };
      }
    }));
    const sessionInvalide = resultats.find((resultat) => resultat.erreurSession);
    if (sessionInvalide) {
      gererSessionInvalidee(sessionInvalide.erreurSession);
      return;
    }
    listePaiement.innerHTML = "";
    resultats.forEach((resultat) => listePaiement.appendChild(resultat.bloc));
  }

  // Efface la session locale devenue invalide et réaffiche le bloc de connexion
  // par code, avec un message explicite plutôt qu'une erreur générique - et
  // redemande automatiquement un nouveau code (l'ancien code envoyé, s'il y en
  // avait un, correspondait à une autre session).
  function gererSessionInvalidee(erreur) {
    effacerSessionAcheteur();
    blocPaiementParMarchand.style.display = "none";
    listePaiement.innerHTML = "";
    carteConnexionPaiement.style.display = "block";
    texteEmailConnexion.textContent = buyerEmail;
    inputCodePaiement.value = "";
    codeDejaEnvoye = false;
    messageErreurCodePaiement.style.color = "";
    messageErreurCodePaiement.textContent =
      erreur && erreur.message === "SESSION_REVOQUEE"
        ? "Ce compte a été utilisé pour se connecter sur un autre appareil, merci de redemander un code."
        : "Votre session a expiré, merci de redemander un code.";
    messageErreurCodePaiement.style.display = "block";
    envoyerCode();
  }

  let commande = null;
  try {
    const brut = sessionStorage.getItem("kadosk_derniere_commande");
    commande = brut ? JSON.parse(brut) : null;
  } catch (erreur) {
    commande = null;
  }

  if (!commande || !commande.orderNumber) {
    etatIntrouvable.style.display = "block";
    return;
  }

  afficherCommande(commande);

  // Diagnostic temporaire et explicite de la réplication KADOSK -> Wix eCommerce.
  // Sans ce bloc, l'échec best-effort reste invisible puisque la commande KADOSK
  // elle-même est bien créée et la page affiche normalement "Merci".
  const diagnosticSyncWix = document.getElementById("diagnosticSyncWix");
  if (diagnosticSyncWix) {
    const sync = commande.wixOrderSync;
    diagnosticSyncWix.style.display = "block";
    if (sync && sync.ok === true) {
      diagnosticSyncWix.style.background = "#eaf8f1";
      diagnosticSyncWix.style.color = "#157347";
      diagnosticSyncWix.textContent = "Synchronisation Wix réussie — commande Wix " + (sync.wixOrderNumber || sync.wixOrderId || "créée") + ".";
    } else if (sync && sync.ok === false) {
      diagnosticSyncWix.style.background = "#fdecec";
      diagnosticSyncWix.style.color = "#b02a37";
      diagnosticSyncWix.textContent = "Synchronisation Wix échouée : " + (sync.erreur || "erreur inconnue") + ".";
    } else {
      diagnosticSyncWix.style.background = "#fff3cd";
      diagnosticSyncWix.style.color = "#664d03";
      diagnosticSyncWix.textContent = "Diagnostic Wix absent : le nouveau backend n'est probablement pas encore publié ou cette confirmation provient d'une ancienne commande.";
    }
  }

  // --- Connexion par code, nécessaire pour révéler le RIB ---
  const buyerEmail = String(commande.buyerEmail || "").trim().toLowerCase();
  let codeDejaEnvoye = false;

  async function envoyerCode() {
    if (!buyerEmail || codeDejaEnvoye) return;
    codeDejaEnvoye = true;
    try {
      await KADOSK_API.demanderCodeCommandes(buyerEmail);
    } catch (erreur) {
      console.error("Erreur envoi code paiement :", erreur);
    }
  }

  async function demarrerConnexionPaiement() {
    if (!buyerEmail) {
      // Ancienne commande stockée avant ce durcissement (sans buyerEmail) : on ne
      // peut pas connaître l'e-mail à re-vérifier - redirige vers "Mes commandes",
      // qui redemande un code normalement.
      blocPaiementParMarchand.style.display = "none";
      carteConnexionPaiement.style.display = "none";
      return;
    }

    const session = lireSessionAcheteur();
    if (session && session.email === buyerEmail) {
      await chargerPaiements(commande, session);
      return;
    }

    carteConnexionPaiement.style.display = "block";
    texteEmailConnexion.textContent = buyerEmail;
    await envoyerCode();
  }

  btnValiderCodePaiement.addEventListener("click", async () => {
    const code = inputCodePaiement.value.trim();
    messageErreurCodePaiement.style.display = "none";
    if (!/^\d{6}$/.test(code)) {
      messageErreurCodePaiement.textContent = "Merci de saisir le code à 6 chiffres reçu par e-mail.";
      messageErreurCodePaiement.style.display = "block";
      return;
    }
    btnValiderCodePaiement.disabled = true;
    const libelleOriginal = btnValiderCodePaiement.innerHTML;
    btnValiderCodePaiement.innerHTML = "Vérification...";
    try {
      const resultat = await KADOSK_API.confirmerCodeCommandes(buyerEmail, code, obtenirOuCreerDeviceId());
      enregistrerSessionAcheteur(resultat.token, buyerEmail, resultat.expiresInDays);
      carteConnexionPaiement.style.display = "none";
      await chargerPaiements(commande, { token: resultat.token, email: buyerEmail });
    } catch (erreur) {
      const messages = {
        CODE_INVALIDE: "Code incorrect, merci de réessayer.",
        CODE_EXPIRE: "Ce code a expiré, demandez-en un nouveau.",
        TROP_DE_TENTATIVES: "Trop de tentatives, merci de réessayer dans quelques minutes.",
        APPAREIL_INVALIDE: "Cet appareil ne peut pas être identifié. Rechargez la page.",
        SESSION_ENREGISTREMENT_ECHOUE: "Connexion temporairement indisponible. Demandez un nouveau code."
      };
      messageErreurCodePaiement.textContent = (erreur && messages[erreur.message]) || "Une erreur est survenue, merci de réessayer.";
      messageErreurCodePaiement.style.display = "block";
    } finally {
      btnValiderCodePaiement.disabled = false;
      btnValiderCodePaiement.innerHTML = libelleOriginal;
    }
  });

  inputCodePaiement.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") btnValiderCodePaiement.click();
  });

  btnRenvoyerCodePaiement.addEventListener("click", async () => {
    messageErreurCodePaiement.style.display = "none";
    try {
      await KADOSK_API.demanderCodeCommandes(buyerEmail);
      messageErreurCodePaiement.style.color = "#1faa6c";
      messageErreurCodePaiement.textContent = "Un nouveau code a été envoyé.";
      messageErreurCodePaiement.style.display = "block";
    } catch (erreur) {
      messageErreurCodePaiement.style.color = "";
      messageErreurCodePaiement.textContent = "Impossible de renvoyer un code pour le moment.";
      messageErreurCodePaiement.style.display = "block";
    }
  });

  document.addEventListener("kadosk:buyer-logged-in", demarrerConnexionPaiement);
  demarrerConnexionPaiement();
})();
