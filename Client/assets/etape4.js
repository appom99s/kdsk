(function () {
  const inputNomDestinataire = document.getElementById("inputNomDestinataire");
  const inputNomAcheteur = document.getElementById("inputNomAcheteur");
  const inputTelephoneAcheteur = document.getElementById("inputTelephoneAcheteur");
  const inputEmailDestinataire = document.getElementById("inputEmailDestinataire");
  const champEmailDestinataire = document.getElementById("champEmailDestinataire");
  const labelNomDestinataire = document.getElementById("labelNomDestinataire");
  const labelEmailAcheteur = document.getElementById("labelEmailAcheteur");
  const labelMessage = document.getElementById("labelMessage");
  const inputMessage = document.getElementById("inputMessage");
  const compteurMessage = document.getElementById("compteurMessage");
  const inputEmailAcheteur = document.getElementById("inputEmailAcheteur");
  const btnPourMoi = document.getElementById("btnPourMoi");
  const btnPourAutre = document.getElementById("btnPourAutre");
  const listeRecap = document.getElementById("listeRecap");
  const texteTotal = document.getElementById("texteTotal");
  const messageErreur = document.getElementById("messageErreur");
  const btnRetour = document.getElementById("btnRetour");
  const btnValider = document.getElementById("btnValider");
  const inputConsentement = document.getElementById("inputConsentement");
  const inputConservationDonnees = document.getElementById("inputConservationDonnees");
  const checkoutReference = document.getElementById("checkoutReference");

  const checkoutIdUrl = new URLSearchParams(window.location.search).get("checkoutId") || "";
  let checkoutIdSession = "";
  try { checkoutIdSession = sessionStorage.getItem("kadosk_checkout_id") || ""; } catch (_) {}
  const checkoutIdValide = /^[a-f0-9-]{36}$/i.test(checkoutIdUrl) && checkoutIdUrl === checkoutIdSession;
  if (checkoutReference) {
    checkoutReference.textContent = checkoutIdValide ? "Session de commande : " + checkoutIdUrl : "";
  }

  // "Pour moi-même" / "Pour quelqu'un d'autre" : un choix explicite plutôt que de
  // deviner à partir d'une simple comparaison d'e-mails (fragile - faute de frappe,
  // casse différente...). Cette valeur est envoyée telle quelle au serveur, qui reste
  // la seule source de vérité pour RecipientEmail (voir creerCommandeMultiMarchand) :
  // même si ce choix était manipulé côté client, le serveur revalide/écrase toujours
  // RecipientEmail = BuyerEmail quand forSelf est vrai.
  let pourMoiMeme = true;

  document.getElementById("k2IconeUser").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("k2IconeMailDest").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeMessage").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeMailAcheteur").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeRetour").innerHTML = window.KADOSK_ICONE("arrow-left");
  document.getElementById("k2IconeCadenas").innerHTML = window.KADOSK_ICONE("shield-check");
  document.getElementById("k2IconeSecurite").innerHTML = window.KADOSK_ICONE("shield-check");

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

  function emailValide(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valeur || "").trim());
  }

  function telephoneValide(valeur) {
    const chiffres = String(valeur || "").replace(/\D/g, "");
    return chiffres.length >= 8 && chiffres.length <= 15;
  }

  function appliquerPourQui() {
    btnPourMoi.classList.toggle("actif", pourMoiMeme);
    btnPourAutre.classList.toggle("actif", !pourMoiMeme);

    if (pourMoiMeme) {
      champEmailDestinataire.style.display = "none";
      labelNomDestinataire.textContent = "Votre nom complet";
      labelEmailAcheteur.textContent = "Votre e-mail";
      labelMessage.textContent = "Note personnelle (optionnel)";
      inputNomDestinataire.placeholder = "Votre nom complet";
      if (!inputNomDestinataire.value.trim()) inputNomDestinataire.value = inputNomAcheteur.value.trim();
    } else {
      champEmailDestinataire.style.display = "";
      labelNomDestinataire.textContent = "Destinataire — Nom complet";
      labelEmailAcheteur.textContent = "Votre e-mail (pour suivre votre commande et recevoir la confirmation)";
      labelMessage.textContent = "Message personnalisé (optionnel)";
      inputNomDestinataire.placeholder = "Nom complet";
    }
  }

  btnPourMoi.addEventListener("click", () => {
    pourMoiMeme = true;
    appliquerPourQui();
  });
  btnPourAutre.addEventListener("click", () => {
    pourMoiMeme = false;
    appliquerPourQui();
  });

  // Si l'acheteur est déjà connecté sur "Mes commandes" (jeton local) - y compris via
  // le pont membre Wix quand cette page est intégrée en iframe dans le site Wix
  // principal, voir assets/wix-bridge.js, qui écrit ce même jeton - on pré-remplit son
  // e-mail par confort - simple lecture locale, jamais de décision de sécurité : le
  // serveur revalide toujours buyerEmail lui-même.
  function lireEmailAcheteurConnecte() {
    const session = window.KADOSK_BUYER_SESSION && window.KADOSK_BUYER_SESSION.lire();
    return session ? session.email : "";
  }

  // Le pont Wix (assets/wix-bridge.js) écrit la session de façon asynchrone,
  // potentiellement après le premier remplissage du formulaire - on complète alors le
  // champ e-mail acheteur SEULEMENT s'il est encore vide, pour ne jamais écraser une
  // saisie déjà faite par le visiteur.
  document.addEventListener("kadosk:buyer-logged-in", (evenement) => {
    if (!inputEmailAcheteur.value.trim() && evenement.detail && evenement.detail.email) {
      inputEmailAcheteur.value = evenement.detail.email;
    }
  });

  function rendreRecap() {
    const lignes = KADOSK_PANIER2.lire();
    listeRecap.innerHTML = lignes
      .map(
        (l) => `
      <div class="k2-confirmation-ligne">
        <span>${echapperHtml(l.name || l.businessName)}</span>
        <span>${formaterMontant((Number(l.montant) || 0) * (Number(l.quantite) || 1))}</span>
      </div>`
      )
      .join("");
    texteTotal.textContent = formaterMontant(KADOSK_PANIER2.totalGeneral());
  }

  function restaurerDestinataire() {
    const sauvegarde = KADOSK_PANIER2.lireDestinataire();
    // Par défaut "pour moi-même" si rien n'a encore été choisi (sauvegarde.forSelf
    // est undefined) : c'est le cas le plus courant et ça évite de forcer tout le
    // monde à remplir un e-mail destinataire séparé pour un achat classique.
    pourMoiMeme = sauvegarde.forSelf !== false;
    inputNomAcheteur.value = sauvegarde.buyerName || "";
    inputTelephoneAcheteur.value = sauvegarde.buyerPhone || "";
    inputNomDestinataire.value = sauvegarde.recipientName || (pourMoiMeme ? inputNomAcheteur.value : "");
    inputEmailDestinataire.value = sauvegarde.recipientEmail || "";
    inputMessage.value = sauvegarde.message || "";
    inputEmailAcheteur.value = sauvegarde.buyerEmail || lireEmailAcheteurConnecte() || "";
    compteurMessage.textContent = String(inputMessage.value.length);
    appliquerPourQui();
  }

  inputMessage.addEventListener("input", () => {
    compteurMessage.textContent = String(inputMessage.value.length);
  });
  inputNomAcheteur.addEventListener("input", () => {
    if (pourMoiMeme) inputNomDestinataire.value = inputNomAcheteur.value;
  });

  btnRetour.addEventListener("click", () => {
    window.location.href = "etape-3-recap.html";
  });

  btnValider.addEventListener("click", async () => {
    messageErreur.style.display = "none";

    const buyerName = inputNomAcheteur.value.trim();
    const buyerPhone = inputTelephoneAcheteur.value.trim();
    const recipientName = pourMoiMeme ? buyerName : inputNomDestinataire.value.trim();
    const message = inputMessage.value.trim();
    const buyerEmail = inputEmailAcheteur.value.trim();
    // "Pour moi-même" : un seul e-mail (le champ acheteur) sert aux deux usages -
    // le serveur revalide/écrase de toute façon RecipientEmail = BuyerEmail dans ce
    // cas (voir creerCommandeMultiMarchand), donc pas besoin de dupliquer la saisie.
    const recipientEmail = pourMoiMeme ? buyerEmail : inputEmailDestinataire.value.trim();

    if (!buyerName) {
      messageErreur.textContent = "Merci d’indiquer votre nom complet.";
      messageErreur.style.display = "block";
      inputNomAcheteur.focus();
      return;
    }
    if (!telephoneValide(buyerPhone)) {
      messageErreur.textContent = "Merci d’indiquer un numéro de téléphone valide.";
      messageErreur.style.display = "block";
      inputTelephoneAcheteur.focus();
      return;
    }
    if (!recipientName) {
      messageErreur.textContent = pourMoiMeme ? "Merci d'indiquer votre nom." : "Merci d'indiquer le nom du destinataire.";
      messageErreur.style.display = "block";
      return;
    }
    if (!inputConsentement.checked) {
      messageErreur.textContent = "Votre accord est nécessaire pour traiter la commande.";
      messageErreur.style.display = "block";
      inputConsentement.focus();
      return;
    }
    if (!emailValide(buyerEmail)) {
      messageErreur.textContent = pourMoiMeme
        ? "Merci d'indiquer votre e-mail."
        : "Merci d'indiquer votre e-mail pour recevoir la confirmation.";
      messageErreur.style.display = "block";
      return;
    }
    if (!pourMoiMeme && !emailValide(recipientEmail)) {
      messageErreur.textContent = "L'e-mail du destinataire n'est pas valide.";
      messageErreur.style.display = "block";
      return;
    }
    if (KADOSK_PANIER2.compterArticles() === 0) {
      window.location.href = "boutique-client.html";
      return;
    }

    KADOSK_PANIER2.enregistrerDestinataire({ buyerName, buyerPhone, buyerEmail, recipientName, recipientEmail, message, forSelf: pourMoiMeme });
    btnValider.disabled = true;
    const libelleOriginal = btnValider.innerHTML;
    btnValider.innerHTML = "Envoi en cours...";

    try {
      const resultat = await KADOSK_API.createOrder(
        KADOSK_PANIER2.articlesPourCommande(),
        buyerEmail,
        recipientName,
        recipientEmail,
        message,
        pourMoiMeme,
        buyerName,
        buyerPhone,
        inputConservationDonnees.checked
      );
      resultat.recipientEmail = recipientEmail;
      resultat.recipientName = recipientName;
      resultat.forSelf = pourMoiMeme;
      // Nécessaire à l'étape 5 pour pré-remplir/valider la connexion par code (le
      // RIB n'est révélé qu'après preuve de possession de CET e-mail précis) -
      // createOrder ne renvoie plus buyerEmail lui-même (jamais demandé), on le
      // connaît déjà ici puisque c'est ce formulaire qui vient de le soumettre.
      resultat.buyerEmail = buyerEmail;
      sessionStorage.setItem("kadosk_derniere_commande", JSON.stringify(resultat));
      sessionStorage.removeItem("kadosk_checkout_id");
      KADOSK_PANIER2.vider();
      window.location.href = "etape-5-confirmation.html";
    } catch (erreur) {
      console.error("Echec de la commande :", erreur);
      const messages = {
        INVALID_AMOUNT_FOR_OFFER: "Un des montants choisis n'est plus valide pour ce marchand. Retournez à l'étape 2.",
        MERCHANT_NOT_FOUND: "Un des marchands sélectionnés n'est plus disponible.",
        TROP_DE_COMMANDES: "Trop de commandes ont été passées récemment, merci de réessayer dans quelques minutes.",
        ERREUR_RESEAU: "Problème de connexion, merci de réessayer."
      };
      messageErreur.textContent = messages[erreur.message] || "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
      btnValider.disabled = false;
      btnValider.innerHTML = libelleOriginal;
      document.getElementById("k2IconeCadenas").innerHTML = window.KADOSK_ICONE("shield-check");
    }
  });

  if (KADOSK_PANIER2.compterArticles() === 0) {
    window.location.href = "boutique-client.html";
    return;
  }
  if (!KADOSK_PANIER2.toutesLignesOntUnMontant()) {
    window.location.href = "commercants.html";
    return;
  }

  restaurerDestinataire();
  rendreRecap();
})();
