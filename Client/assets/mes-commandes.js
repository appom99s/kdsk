(function () {
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const listeCommandes = document.getElementById("listeCommandes");

  const carteNonConnecte = document.getElementById("carteNonConnecte");
  const messageErreur = document.getElementById("messageErreur");

  // Deux onglets une fois connecté : "Mes commandes" (liste simple) et "Mes cartes"
  // (cartes visuelles + zone QR temporaire) - voir plus bas.
  const ongletsMesComptes = document.getElementById("ongletsMesComptes");
  const ongletCommandes = document.getElementById("ongletCommandes");
  const ongletCartes = document.getElementById("ongletCartes");
  const panneauCommandes = document.getElementById("panneauCommandes");
  const panneauCartes = document.getElementById("panneauCartes");
  const etatChargementCartes = document.getElementById("etatChargementCartes");
  const etatVideCartes = document.getElementById("etatVideCartes");
  const grilleCartes = document.getElementById("grilleCartes");
  const cartesMobileSeulement = document.getElementById("cartesMobileSeulement");

  function estTelephoneReel() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") return navigator.userAgentData.mobile;
    return /Android|iPhone|iPod|IEMobile|Windows Phone|Mobile/i.test(navigator.userAgent || "");
  }

  // ---------------------------------------------------------------------------
  // Identité acheteur : l'identification (code à 6 chiffres envoyé par e-mail) est
  // gérée entièrement par "Mon compte" (assets/mon-compte.js) - point de connexion
  // unique du site, réutilisé aussi lors de la confirmation de commande (étape 5).
  // Cette page ne fait que LIRE la session déjà établie ailleurs (même clé
  // mémoire uniquement) : si elle est absente, on invite simplement à
  // se connecter depuis Mon compte plutôt que de dupliquer ici tout un formulaire
  // email/code.
  // ---------------------------------------------------------------------------
  function lireSessionAcheteur() {
    return window.KADOSK_BUYER_SESSION.lire();
  }

  function effacerSessionAcheteur() {
    window.KADOSK_BUYER_SESSION.effacer();
  }

  function afficherNonConnecte() {
    carteNonConnecte.style.display = "block";
    messageErreur.style.display = "none";
    ongletsMesComptes.style.display = "none";
    panneauCartes.style.display = "none";
    panneauCommandes.style.display = "block";
    listeCommandes.innerHTML = "";
    etatVide.style.display = "none";
    grilleCartes.innerHTML = "";
    grilleCartes.style.height = "";
    elementsCartesParId.clear();
    ordreCartes = [];
    etatVideCartes.style.display = "none";
    cartesChargees = false;
  }

  function afficherConnecte(email) {
    carteNonConnecte.style.display = "none";
    ongletsMesComptes.style.display = "flex";
    const parametres = new URLSearchParams(window.location.search);
    const vueDemandee = parametres.get("view") || parametres.get("vue");
    if (vueDemandee === "orders" || parametres.get("commande")) activerOngletCommandes();
    else activerOngletCartes();
  }

  // ---------------------------------------------------------------------------
  // Bascule entre les deux onglets - "Mes cartes" est chargé une seule fois (à la
  // première ouverture de l'onglet), pas à chaque clic.
  // ---------------------------------------------------------------------------
  let cartesChargees = false;
  let sessionActuelle = null;

  function activerOngletCommandes() {
    ongletCommandes.classList.add("k2-btn-primaire");
    ongletCommandes.classList.remove("k2-btn-secondaire");
    ongletCartes.classList.add("k2-btn-secondaire");
    ongletCartes.classList.remove("k2-btn-primaire");
    panneauCommandes.style.display = "block";
    panneauCartes.style.display = "none";
  }

  function activerOngletCartes() {
    ongletCartes.classList.add("k2-btn-primaire");
    ongletCartes.classList.remove("k2-btn-secondaire");
    ongletCommandes.classList.add("k2-btn-secondaire");
    ongletCommandes.classList.remove("k2-btn-primaire");
    panneauCartes.style.display = "block";
    panneauCommandes.style.display = "none";
    const mobile = estTelephoneReel();
    cartesMobileSeulement.style.display = mobile ? "none" : "block";
    grilleCartes.style.display = mobile ? "flex" : "none";
    etatVideCartes.style.display = "none";
    etatChargementCartes.style.display = "none";
    if (!mobile) return;
    if (!cartesChargees && sessionActuelle) {
      chargerCartes(sessionActuelle);
    }
  }

  ongletCommandes.addEventListener("click", activerOngletCommandes);
  ongletCartes.addEventListener("click", activerOngletCartes);

  // ---------------------------------------------------------------------------
  // QR temporaire (30s, anti-rejeu) : chaque carte déjà acceptée par le marchand
  // (identifiée par orderItemId, renvoyé par getMesCartesParEmail - voir onglet "Mes
  // cartes" plus bas) peut afficher un QR qui se renouvelle automatiquement - voir
  // KADOSK_API.getQrTemporaire / giftCardSecurity.web.js. Le code permanent n'est
  // jamais transmis ni affiché ici.
  // ---------------------------------------------------------------------------
  const modalQr = document.getElementById("modalQr");
  const btnFermerQr = document.getElementById("btnFermerQr");
  const qrCanvasZone = document.getElementById("qrCanvasZone");
  const qrEtatTexte = document.getElementById("qrEtatTexte");

  let minuteurQr = null;
  let instanceQr = null;
  let soldeQrPrecedent = null;

  function chargerLibQRCode() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function arreterRafraichissementQr() {
    if (minuteurQr) {
      clearInterval(minuteurQr);
      minuteurQr = null;
    }
  }

  function fermerModalQr() {
    arreterRafraichissementQr();
    modalQr.style.display = "none";
  }

  btnFermerQr.addEventListener("click", fermerModalQr);
  modalQr.addEventListener("click", (evenement) => {
    if (evenement.target === modalQr) fermerModalQr();
  });

  // Durée d'affichage du message de confirmation avant fermeture automatique du
  // modal, une fois l'encaissement détecté côté client.
  const DELAI_FERMETURE_APRES_ENCAISSEMENT_MS = 3000;

  // Met à jour le montant affiché sur la carte de la pile "Mes cartes" (sans
  // attendre un rechargement complet - voir chargerCartes) une fois qu'on sait
  // qu'un encaissement vient de se produire, pour que l'utilisateur retrouve
  // directement le bon solde en refermant le modal.
  function mettreAJourSoldeCarte(orderItemId, nouveauSolde) {
    const el = elementsCartesParId.get(orderItemId);
    if (!el) return;
    const nombre = el.querySelector(".kadosk-carte-apercu-montant-nombre");
    if (nombre) {
      nombre.textContent = Number(nouveauSolde || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    }
  }

  // Affiche la confirmation "QR scanné avec succès" une fois l'encaissement détecté
  // (par baisse de solde, voir rafraichirQr, ou par GIFT_CARD_ALREADY_REDEEMED sur
  // épuisement total), stoppe le sondage et referme le modal automatiquement après
  // un court délai le temps que l'utilisateur lise la confirmation.
  function afficherSuccesEncaissement(orderItemId, soldeRestant, epuise) {
    arreterRafraichissementQr();
    const icone = window.KADOSK_ICONE ? window.KADOSK_ICONE("check") : "";
    qrCanvasZone.innerHTML = `<div class="k2-qr-succes">${icone}</div>`;
    qrEtatTexte.innerHTML =
      `<strong style="color:#1f8a4c;">QR très bien scanné !</strong><br />` +
      (epuise
        ? "Carte entièrement utilisée."
        : "Encaissement enregistré" + (soldeRestant !== null && soldeRestant !== undefined ? " — nouveau solde : " + formaterMontant(soldeRestant) : "") + ".");
    if (soldeRestant !== null && soldeRestant !== undefined) {
      mettreAJourSoldeCarte(orderItemId, soldeRestant);
    }
    setTimeout(() => {
      if (modalQr.style.display !== "none") fermerModalQr();
    }, DELAI_FERMETURE_APRES_ENCAISSEMENT_MS);
  }

  async function rafraichirQr(orderItemId, token) {
    try {
      const resultat = await KADOSK_API.getQrTemporaire(orderItemId, token);

      // Détection d'un encaissement (même partiel) survenu depuis le dernier sondage :
      // CardRedeemed ne bascule qu'au solde totalement épuisé (voir
      // genererCodeQRTemporaire), donc un simple rachat partiel ne renvoie jamais
      // GIFT_CARD_ALREADY_REDEEMED. On compare plutôt le solde dénormalisé d'un appel
      // à l'autre : s'il a baissé, le QR affiché vient d'être utilisé côté caisse
      // (anti-rejeu déjà actif serveur) - on affiche la confirmation tout de suite au
      // lieu d'attendre le prochain pas TOTP (jusqu'à 30s).
      if (
        soldeQrPrecedent !== null &&
        resultat.remainingBalance !== null &&
        resultat.remainingBalance !== undefined &&
        resultat.remainingBalance < soldeQrPrecedent
      ) {
        afficherSuccesEncaissement(orderItemId, resultat.remainingBalance, false);
        return;
      }
      if (resultat.remainingBalance !== null && resultat.remainingBalance !== undefined) {
        soldeQrPrecedent = resultat.remainingBalance;
      }

      if (!instanceQr) {
        qrCanvasZone.innerHTML = "";
        instanceQr = new window.QRCode(qrCanvasZone, {
          text: resultat.payload,
          width: 200,
          height: 200,
          colorDark: "#1f3a34",
          colorLight: "#ffffff"
        });
      } else {
        instanceQr.clear();
        instanceQr.makeCode(resultat.payload);
      }

      qrEtatTexte.textContent = `Renouvellement dans ${resultat.expiresInSeconds}s...`;
    } catch (erreur) {
      console.error("Erreur génération QR temporaire :", erreur);
      // Épuisement total détecté sur ce sondage : CardRedeemed vient de basculer,
      // donc c'est aussi une confirmation d'encaissement réussi (juste le dernier),
      // pas une erreur à proprement parler du point de vue de l'acheteur.
      if (erreur && erreur.message === "GIFT_CARD_ALREADY_REDEEMED" && soldeQrPrecedent !== null && soldeQrPrecedent > 0) {
        afficherSuccesEncaissement(orderItemId, 0, true);
        return;
      }
      const message =
        erreur && erreur.message === "GIFT_CARD_EXPIRED"
          ? "Cette carte a expiré."
          : erreur && erreur.message === "GIFT_CARD_ALREADY_REDEEMED"
          ? "Cette carte a déjà été entièrement utilisée."
          : erreur && erreur.message === "GIFT_CARD_NOT_ACTIVATED"
          ? "Cette carte n'a pas encore été activée."
          : "Impossible d'afficher le QR pour le moment.";
      qrCanvasZone.innerHTML = "";
      qrEtatTexte.textContent = message;
      arreterRafraichissementQr();
    }
  }

  async function ouvrirModalQr(orderItemId, token) {
    instanceQr = null;
    soldeQrPrecedent = null;
    qrCanvasZone.innerHTML = '<div class="k2-spinner"></div>';
    qrEtatTexte.textContent = "";
    modalQr.style.display = "flex";

    try {
      await chargerLibQRCode();
    } catch (erreur) {
      qrCanvasZone.innerHTML = "";
      qrEtatTexte.textContent = "Impossible de charger le générateur de QR.";
      return;
    }

    await rafraichirQr(orderItemId, token);
    arreterRafraichissementQr();
    // Sondage rapproché (2s) : au-delà du renouvellement TOTP (30s), sert surtout à
    // détecter un encaissement (baisse de solde, voir rafraichirQr) au plus vite après
    // un scan en caisse, pour faire disparaître le QR utilisé quasi instantanément
    // plutôt que d'attendre jusqu'à 30s.
    minuteurQr = setInterval(() => rafraichirQr(orderItemId, token), 2000);
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  function formaterDate(valeur) {
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    } catch (erreur) {
      return "";
    }
  }

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Onglet "Mes commandes" : liste simple, une ligne par commande - marchand(s),
  // montant, date. Rien d'autre (pas de détail par carte, pas de facture ici - voir
  // l'onglet "Mes cartes" pour le design/QR de chaque carte).
  function rendreLigneCommande(commande, token) {
    const div = document.createElement("article");
    div.className = "client-order-card";
    const commandeDemandee = new URLSearchParams(window.location.search).get("commande");
    if (commandeDemandee && commandeDemandee === commande.orderNumber) div.classList.add("client-order-card--target");
    const marchands = commande.merchants && commande.merchants.length ? commande.merchants.join(", ") : "—";
    const statutCommande = String(commande.status || "DRAFT").toUpperCase();
    const statutPaiement = String(commande.paymentStatus || "NOT_PAID").toUpperCase();
    const libellesCommande = {
      DRAFT: "En attente",
      PARTIAL: "Partiellement validée",
      ACTIVE: "Validée",
      REFUSED: "Annulée"
    };
    const libellesPaiement = {
      PAID: "Payée",
      NOT_PAID: "Paiement en attente",
      PARTIALLY_PAID: "Partiellement payée",
      REFUNDED: "Remboursée",
      PARTIALLY_REFUNDED: "Partiellement remboursée",
      CANCELED: "Annulée",
      CANCELLED: "Annulée",
      FAILED: "Paiement échoué"
    };
    const classePaiement = statutPaiement === "PAID"
      ? "is-paid"
      : (statutPaiement === "FAILED" || statutPaiement === "CANCELED" || statutPaiement === "CANCELLED" || statutPaiement.includes("REFUND"))
        ? "is-cancelled"
        : "is-pending";
    div.innerHTML = `
      <div class="client-order-card__logo" aria-hidden="true">${echapperHtml(marchands.slice(0, 1).toUpperCase())}</div>
      <div class="client-order-card__body">
        <div class="client-order-card__topline">
          <span class="client-order-card__number">Commande ${echapperHtml(commande.orderNumber || "")}</span>
          <span class="client-payment-badge ${classePaiement}">${echapperHtml(libellesPaiement[statutPaiement] || statutPaiement)}</span>
        </div>
        <h2 class="client-order-card__merchant">${echapperHtml(marchands)}</h2>
        <div class="client-order-card__meta">
          <span>${formaterDate(commande.createdAt)}</span>
          <span>${Number(commande.itemsCount || 0)} carte${Number(commande.itemsCount || 0) > 1 ? "s" : ""}</span>
          <span>${echapperHtml(libellesCommande[statutCommande] || statutCommande)}</span>
        </div>
        <strong class="client-order-card__amount">${formaterMontant(commande.totalAmount)}</strong>
        <div class="client-order-card__actions"><button type="button" class="k2-qr-bouton-ligne" data-facture-commande>Télécharger la facture et le reçu</button><span data-etat-facture aria-live="polite"></span></div>
      </div>
    `;
    const boutonFacture = div.querySelector("[data-facture-commande]");
    const etatFacture = div.querySelector("[data-etat-facture]");
    boutonFacture.addEventListener("click", async () => {
      boutonFacture.disabled = true;
      try {
        const detail = await KADOSK_API.getOrderByNumber(commande.orderNumber, token);
        let facturesGenerees = 0;
        for (const marchand of detail.merchants || []) {
          if (!marchand.invoice || !window.KADOSK_FACTURE_ACHAT_PDF) continue;
          await window.KADOSK_FACTURE_ACHAT_PDF.telecharger({
            ...marchand.invoice,
            orderNumber: detail.orderNumber,
            buyerEmail: detail.recipientEmail,
            buyerName: detail.recipientName,
            cardName: marchand.cardName,
            quantity: marchand.quantity,
            subtotal: marchand.subtotal,
            totalAmount: detail.totalAmount,
            createdAt: detail.createdAt,
            paymentStatus: detail.paymentStatus,
            items: (marchand.cards || []).map((carte) => ({ amount: marchand.amount, status: carte.redeemed ? "Utilisée" : "Active" }))
          });
          facturesGenerees++;
        }
        if (!facturesGenerees) throw new Error("INVOICE_NOT_AVAILABLE");
        etatFacture.textContent = facturesGenerees > 1 ? facturesGenerees + " factures téléchargées." : "Facture téléchargée.";
      } catch (erreur) {
        console.error("Facture client indisponible :", erreur);
        if (erreur && (erreur.message === "SESSION_REVOQUEE" || erreur.message === "JETON_EXPIRE" || erreur.message === "JETON_INVALIDE")) {
          effacerSessionAcheteur();
          afficherNonConnecte();
          messageErreur.textContent = "Votre session a été renouvelée ou a expiré. Reconnectez-vous depuis Mon compte, puis relancez le téléchargement.";
          messageErreur.style.display = "block";
        } else {
          etatFacture.textContent = erreur && erreur.message === "INVOICE_NOT_AVAILABLE" ? "La facture de cette commande n’est pas encore disponible." : "Téléchargement impossible. Réessayez.";
        }
      } finally {
        boutonFacture.disabled = false;
      }
    });
    return div;
  }

  async function chargerCommandes(session) {
    listeCommandes.innerHTML = "";
    etatVide.style.display = "none";
    etatChargement.style.display = "block";

    try {
      const resultat = await KADOSK_API.getOrdersByEmail(session.token);
      const commandes = resultat.items || [];
      etatChargement.style.display = "none";

      if (commandes.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      commandes.forEach((c) => listeCommandes.appendChild(rendreLigneCommande(c, session.token)));
      const cible = listeCommandes.querySelector(".client-order-card--target");
      if (cible) cible.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (erreur) {
      etatChargement.style.display = "none";
      // Un jeton invalide/expiré ne devrait normalement pas arriver avant l'échéance
      // affichée, mais si le serveur le rejette on revient proprement au formulaire de
      // recherche plutôt que d'afficher une erreur générique en boucle.
      if (
        erreur &&
        (erreur.message === "JETON_INVALIDE" ||
          erreur.message === "JETON_EXPIRE" ||
          erreur.message === "SESSION_REVOQUEE" ||
          erreur.message === "SESSION_INDISPONIBLE")
      ) {
        effacerSessionAcheteur();
        afficherNonConnecte();
        messageErreur.textContent =
          erreur.message === "SESSION_REVOQUEE"
            ? "Ce compte a été utilisé pour se connecter sur un autre appareil, merci de vous reconnecter depuis Mon compte."
            : "Votre session a expiré, merci de vous reconnecter depuis Mon compte.";
        messageErreur.style.display = "block";
        return;
      }
      console.error("Erreur recherche commandes :", erreur);
      messageErreur.textContent = "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
    }
  }

  // ---------------------------------------------------------------------------
  // Onglet "Mes cartes" : vue à plat de toutes les cartes déjà acceptées par un
  // marchand (voir getMesCartesParEmail), chacune dessinée avec le VRAI design choisi
  // par le marchand (couleur/logo, voir settings.html + carte-visuelle.js). La zone QR
  // réservée dans ce design (voir .kadosk-carte-apercu-qr-zone, style.css) accueille le
  // bouton qui génère le QR temporaire (30s, anti-rejeu) - jamais le code permanent,
  // qui n'est ni transmis ni affiché ici (voir genererCodeQRTemporaire côté serveur).
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Pile façon Apple Wallet : les cartes sont empilées, chacune ne laissant dépasser
  // qu'une bande du haut de la carte précédente (PILE_PEEK_PX) - taper sur une carte
  // qui n'est pas au premier plan la fait remonter en avant, avec une transition CSS
  // sur "top" (les éléments DOM sont créés une seule fois et réutilisés - c'est ce qui
  // permet l'animation : recréer le HTML à chaque tri empêcherait toute transition).
  // ---------------------------------------------------------------------------
  const PILE_PEEK_PX = 54;
  let ordreCartes = [];
  const elementsCartesParId = new Map();

  function mettreAJourPile() {
    ordreCartes.forEach((orderItemId, index) => {
      const el = elementsCartesParId.get(orderItemId);
      if (!el) return;
      el.style.top = index * PILE_PEEK_PX + "px";
      el.style.zIndex = String(index + 1);
      el.classList.toggle("k2-carte-pile-front", index === ordreCartes.length - 1);
    });
    const premierId = ordreCartes[0];
    const premierEl = premierId && elementsCartesParId.get(premierId);
    const hauteurCarte = premierEl ? premierEl.offsetHeight : 0;
    grilleCartes.style.height = Math.max(0, ordreCartes.length - 1) * PILE_PEEK_PX + hauteurCarte + "px";
  }

  function amenerAuPremierPlan(orderItemId) {
    const index = ordreCartes.indexOf(orderItemId);
    if (index === -1 || index === ordreCartes.length - 1) return;
    ordreCartes.splice(index, 1);
    ordreCartes.push(orderItemId);
    mettreAJourPile();
  }

  function rendreCarteMesCartes(carte, token) {
    const wrapper = document.createElement("div");
    wrapper.className = "k2-carte-pile-item";
    wrapper.style.cssText = "position:absolute; left:0; right:0;";
    wrapper.addEventListener("click", (evenement) => {
      // Un clic sur un vrai contrôle (bouton QR, bouton PDF) ne doit pas être
      // interprété comme "faire remonter la carte" - seul un clic sur la carte
      // elle-même (bande visible ou carte au premier plan) déclenche la remontée.
      if (evenement.target.closest("button")) return;
      amenerAuPremierPlan(carte.orderItemId);
    });

    const VISUELLE = window.KADOSK_CARTE_VISUELLE;
    if (VISUELLE) {
      // Le montant affiché sur la carte est le SOLDE ACTUEL (remainingBalance), pas le
      // montant initial de l'achat - voir getMesCartesParEmail. Reflète tout rachat
      // déjà effectué en caisse, partiel ou total.
      const soldeAffiche = carte.remainingBalance !== undefined && carte.remainingBalance !== null ? carte.remainingBalance : carte.amount;
      const elCarte = VISUELLE.creerElementCarte({
        businessName: carte.businessName,
        cardName: carte.cardName,
        amount: soldeAffiche,
        currency: carte.currency,
        logoUrl: carte.logoUrl,
        accentColor: carte.accentColor,
        pattern: carte.pattern,
        font: carte.font,
        activityIcon: carte.activityIcon,
        backgroundType: carte.backgroundType,
        backgroundImageUrl: carte.backgroundImageUrl,
        gradientFrom: carte.gradientFrom,
        gradientTo: carte.gradientTo,
        gradientAngle: carte.gradientAngle
      });
      // Contour de statut : rouge si déjà rachetée/épuisée (redeemed), or sinon -
      // voir les règles .k2-carte-statut-* dans kadosk2.css.
      elCarte.classList.add(carte.redeemed ? "k2-carte-statut-redeemed" : "k2-carte-statut-active");
      const zoneQr = VISUELLE.zoneQr(elCarte);
      if (zoneQr) {
        // "Mes cartes" liste toute carte dont je suis le DESTINATAIRE (RecipientEmail,
        // voir getMesCartesParEmail) - un achat pour moi-même aussi bien qu'un cadeau
        // reçu d'un tiers (carte.forSelf === false, voir badge plus bas). Dans les deux
        // cas uniquement deux états possibles ici : épuisée, ou QR.
        if (carte.redeemed) {
          zoneQr.innerHTML = `<div class="k2-carte-qr-zone-badge">Carte utilisée</div>`;
        } else {
          zoneQr.innerHTML = `<button type="button" class="k2-qr-bouton-carte" data-orderitemid="${echapperHtml(carte.orderItemId)}">${window.KADOSK_ICONE ? window.KADOSK_ICONE("qr-code") : ""}<span>QR</span></button>`;
          const boutonQr = zoneQr.querySelector("[data-orderitemid]");
          if (boutonQr) {
            boutonQr.addEventListener("click", (evenement) => {
              evenement.stopPropagation();
              ouvrirModalQr(boutonQr.dataset.orderitemid, token);
            });
          }
        }
      }
      wrapper.appendChild(elCarte);

      if (!carte.forSelf) {
        const noteCadeau = document.createElement("div");
        noteCadeau.style.cssText = "font-size:11px; color:var(--k2-texte-clair); text-align:center; margin-top:4px;";
        noteCadeau.textContent = "Reçue en cadeau";
        wrapper.appendChild(noteCadeau);
      }

      if (!carte.redeemed && soldeAffiche < carte.amount) {
        const noteSolde = document.createElement("div");
        noteSolde.style.cssText = "font-size:11px; color:var(--k2-texte-clair); text-align:center; margin-top:4px;";
        noteSolde.textContent = "Montant initial : " + formaterMontant(carte.amount);
        wrapper.appendChild(noteSolde);
      }
    }

    // Certificat cadeau décoratif (jamais un instrument d'encaissement - voir
    // carte-cadeau-pdf.js), disponible même pour une carte offerte à quelqu'un
    // d'autre : c'est justement ce PDF que l'acheteur veut imprimer/transmettre.
    const boutonPdf = document.createElement("button");
    boutonPdf.type = "button";
    boutonPdf.className = "k2-qr-bouton-ligne";
    boutonPdf.style.cssText = "margin-top:8px; width:100%; justify-content:center; font-size:11px;";
    boutonPdf.textContent = "Certificat PDF";
    boutonPdf.addEventListener("click", async () => {
      if (!window.KADOSK_CARTE_CADEAU_PDF) {
        console.error("Générateur de certificat PDF non chargé.");
        return;
      }
      await window.KADOSK_CARTE_CADEAU_PDF.telecharger({
        businessName: carte.cardName || carte.businessName,
        amount: carte.amount,
        forSelf: true,
        recipientName: "",
        message: carte.message || "",
        expirationDate: carte.expirationDate,
        orderNumber: carte.orderNumber,
        logoUrl: carte.logoUrl || "",
        accentColor: carte.accentColor || "teal",
        pattern: carte.pattern || "aucun",
        font: carte.font || "poppins",
        activityIcon: carte.activityIcon || "cadeau"
      });
    });
    wrapper.appendChild(boutonPdf);

    return wrapper;
  }

  async function chargerCartes(session) {
    if (!estTelephoneReel()) return;
    grilleCartes.innerHTML = "";
    grilleCartes.style.height = "";
    elementsCartesParId.clear();
    ordreCartes = [];
    etatVideCartes.style.display = "none";
    etatChargementCartes.style.display = "block";

    try {
      const resultat = await KADOSK_API.getMesCartesByEmail(session.token);
      const cartes = resultat.items || [];
      etatChargementCartes.style.display = "none";
      cartesChargees = true;

      if (cartes.length === 0) {
        etatVideCartes.style.display = "block";
        return;
      }

      // Ordre initial de la pile = ordre reçu (le plus récent en dernier, donc au
      // premier plan) - voir getMesCartesParEmail, déjà trié par date décroissante ;
      // on inverse ici pour que la carte la plus récente soit celle visible en entier.
      // Les cartes déjà rachetées/épuisées (redeemed) sont ensuite reléguées à
      // l'arrière de la pile (indices bas => zIndex bas, voir mettreAJourPile) :
      // partition stable qui préserve l'ordre chronologique DANS chaque groupe,
      // avec les cartes encore utilisables devant et la plus récente au premier plan.
      const cartesTriees = cartes.slice().reverse();
      const cartesActives = cartesTriees.filter((c) => !c.redeemed);
      const cartesRedeemed = cartesTriees.filter((c) => c.redeemed);
      cartesRedeemed
        .concat(cartesActives)
        .forEach((c) => {
          const el = rendreCarteMesCartes(c, session.token);
          elementsCartesParId.set(c.orderItemId, el);
          ordreCartes.push(c.orderItemId);
          grilleCartes.appendChild(el);
        });
      mettreAJourPile();
    } catch (erreur) {
      etatChargementCartes.style.display = "none";
      if (
        erreur &&
        (erreur.message === "JETON_INVALIDE" ||
          erreur.message === "JETON_EXPIRE" ||
          erreur.message === "SESSION_REVOQUEE" ||
          erreur.message === "SESSION_INDISPONIBLE")
      ) {
        effacerSessionAcheteur();
        afficherNonConnecte();
        messageErreur.textContent =
          erreur.message === "SESSION_REVOQUEE"
            ? "Ce compte a été utilisé pour se connecter sur un autre appareil, merci de vous reconnecter depuis Mon compte."
            : "Votre session a expiré, merci de vous reconnecter depuis Mon compte.";
        messageErreur.style.display = "block";
        return;
      }
      console.error("Erreur recherche cartes :", erreur);
      etatVideCartes.textContent = "Une erreur est survenue, merci de réessayer.";
      etatVideCartes.style.display = "block";
    }
  }

  // Si la page est intégrée dans un site Wix via iframe et que le visiteur est déjà
  // membre Wix connecté, assets/wix-bridge.js écrit directement une VRAIE session
  // acheteur dans localStorage (jeton signé par le serveur via
  // genererJetonAcheteurPourMembreWix, Permissions.SiteMember) puis déclenche cet
  // événement - il ne s'agit pas d'un simple pré-remplissage, l'acheteur est
  // réellement connecté, sans code à 6 chiffres. On relance donc simplement la même
  // logique qu'au chargement de la page.
  document.addEventListener("kadosk:buyer-logged-in", () => {
    demarrerConnexion();
  });

  async function demarrerConnexion() {
    const session = lireSessionAcheteur() || await window.KADOSK_BUYER_SESSION.attendre(8000);
    if (session) {
      sessionActuelle = session;
      afficherConnecte(session.email);
      await chargerCommandes(session);
    } else {
      afficherNonConnecte();
    }
  }

  demarrerConnexion();
})();
