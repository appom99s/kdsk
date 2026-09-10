// "Mon compte" est désormais l'UNIQUE point de connexion/déconnexion du site :
// un acheteur se connecte ici (code à 6 chiffres envoyé par e-mail) OU lors de la
// confirmation d'une commande (étape 5) - les deux écritures utilisent la même
// session éphémère partagée en mémoire, régénérée par Wix à chaque page,
// mes-commandes.js/etape5.js/favoris-data.js), donc une connexion faite d'un
// côté est immédiatement visible de l'autre, sans redemander de code. Une fois
// connecté, "Mes commandes" (mes-commandes.js) n'affiche plus sa propre étape
// d'identification : il se contente de lire cette session et d'afficher les
// commandes - "qui est connecté" est géré ici, une seule fois.
(function () {
  const CLE_PROFIL_CHECKOUT = "kadosk_checkout_profile_v1";
  document.getElementById("k2IconeUser").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("k2IconeUserConnecte").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("k2IconeMail").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeRecherche").innerHTML = window.KADOSK_ICONE("search");
  document.getElementById("k2IconeCommandes").innerHTML = window.KADOSK_ICONE("clipboard-list");
  document.getElementById("k2IconeCoeur").innerHTML = window.KADOSK_ICONE("heart");
  document.getElementById("k2IconeFleche1").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeFleche2").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeDeconnexion").innerHTML = window.KADOSK_ICONE("x");

  const profilNom = document.getElementById("profilNom");
  const profilTelephone = document.getElementById("profilTelephone");
  const profilEmail = document.getElementById("profilEmail");
  const btnSauverProfil = document.getElementById("btnSauverProfil");
  const messageProfil = document.getElementById("messageProfil");
  try {
    const profil = JSON.parse(localStorage.getItem(CLE_PROFIL_CHECKOUT) || "{}");
    profilNom.value = profil.buyerName || "";
    profilTelephone.value = profil.buyerPhone || "";
    profilEmail.value = profil.buyerEmail || "";
  } catch (_) {}
  btnSauverProfil.addEventListener("click", () => {
    const email = profilEmail.value.trim();
    const chiffres = profilTelephone.value.replace(/\D/g, "");
    if (!profilNom.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || chiffres.length < 8 || chiffres.length > 15) {
      messageProfil.textContent = "Vérifiez le nom, l’e-mail et le téléphone.";
      messageProfil.style.color = "var(--ui-danger)";
      messageProfil.style.display = "block";
      return;
    }
    try {
      localStorage.setItem(CLE_PROFIL_CHECKOUT, JSON.stringify({
        buyerName: profilNom.value.trim().slice(0, 100),
        buyerPhone: profilTelephone.value.trim().slice(0, 20),
        buyerEmail: email.slice(0, 254)
      }));
      messageProfil.textContent = "Coordonnées enregistrées sur cet appareil.";
      messageProfil.style.color = "var(--ui-success)";
      messageProfil.style.display = "block";
    } catch (_) {
      messageProfil.textContent = "Le stockage local n’est pas disponible sur cet appareil.";
      messageProfil.style.color = "var(--ui-danger)";
      messageProfil.style.display = "block";
    }
  });

  const carteEmail = document.getElementById("carteEmail");
  const inputEmail = document.getElementById("inputEmail");
  const btnRechercher = document.getElementById("btnRechercher");
  const messageErreur = document.getElementById("messageErreur");

  const carteCode = document.getElementById("carteCode");
  const inputCode = document.getElementById("inputCode");
  const btnValiderCode = document.getElementById("btnValiderCode");
  const btnRenvoyerCode = document.getElementById("btnRenvoyerCode");
  const btnChangerEmail = document.getElementById("btnChangerEmail");
  const texteEmailCode = document.getElementById("texteEmailCode");
  const messageErreurCode = document.getElementById("messageErreurCode");

  const carteConnecte = document.getElementById("carteConnecte");
  const texteEmailCompte = document.getElementById("texteEmailCompte");
  const btnOublier = document.getElementById("btnOublier");

  // --- Session acheteur PARTAGÉE (même clés que mes-commandes.js/etape5.js) ---
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

  function emailValide(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valeur || "").trim());
  }

  let emailEnCoursDeVerification = "";

  function afficherEtapeEmail() {
    carteEmail.style.display = "block";
    carteCode.style.display = "none";
    carteConnecte.style.display = "none";
    btnOublier.style.display = "none";
  }

  function afficherEtapeCode(email) {
    emailEnCoursDeVerification = email;
    texteEmailCode.textContent = email;
    carteEmail.style.display = "none";
    carteCode.style.display = "block";
    carteConnecte.style.display = "none";
    btnOublier.style.display = "none";
    messageErreurCode.style.display = "none";
    inputCode.value = "";
  }

  function afficherConnecte(email) {
    carteEmail.style.display = "none";
    carteCode.style.display = "none";
    carteConnecte.style.display = "block";
    texteEmailCompte.textContent = email;
    btnOublier.style.display = "block";
  }

  function demarrer() {
    const session = lireSessionAcheteur();
    if (session) {
      afficherConnecte(session.email);
    } else {
      afficherEtapeEmail();
    }
  }

  async function demanderCode() {
    const email = inputEmail.value.trim();
    messageErreur.style.display = "none";

    if (!emailValide(email)) {
      messageErreur.textContent = "Merci de saisir un e-mail valide.";
      messageErreur.style.display = "block";
      return;
    }

    btnRechercher.disabled = true;
    const libelleOriginal = btnRechercher.innerHTML;
    btnRechercher.innerHTML = "Envoi en cours...";

    try {
      await KADOSK_API.demanderCodeCommandes(email);
      afficherEtapeCode(email);
    } catch (erreur) {
      console.error("Erreur demande code :", erreur);
      messageErreur.textContent = "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
    } finally {
      btnRechercher.disabled = false;
      btnRechercher.innerHTML = libelleOriginal;
    }
  }

  async function validerCode() {
    const code = inputCode.value.trim();
    messageErreurCode.style.display = "none";

    if (!/^\d{6}$/.test(code)) {
      messageErreurCode.textContent = "Merci de saisir le code à 6 chiffres reçu par e-mail.";
      messageErreurCode.style.display = "block";
      return;
    }

    btnValiderCode.disabled = true;
    const libelleOriginal = btnValiderCode.innerHTML;
    btnValiderCode.innerHTML = "Vérification...";

    try {
      const resultat = await KADOSK_API.confirmerCodeCommandes(
        emailEnCoursDeVerification,
        code,
        obtenirOuCreerDeviceId()
      );
      enregistrerSessionAcheteur(resultat.token, emailEnCoursDeVerification, resultat.expiresInDays);
      afficherConnecte(emailEnCoursDeVerification);
    } catch (erreur) {
      const messages = {
        CODE_INVALIDE: "Code incorrect, merci de réessayer.",
        CODE_EXPIRE: "Ce code a expiré, demandez-en un nouveau.",
        TROP_DE_TENTATIVES: "Trop de tentatives, merci de réessayer dans quelques minutes."
      };
      messageErreurCode.textContent = (erreur && messages[erreur.message]) || "Une erreur est survenue, merci de réessayer.";
      messageErreurCode.style.display = "block";
    } finally {
      btnValiderCode.disabled = false;
      btnValiderCode.innerHTML = libelleOriginal;
    }
  }

  btnRechercher.addEventListener("click", demanderCode);
  inputEmail.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") demanderCode();
  });

  btnValiderCode.addEventListener("click", validerCode);
  inputCode.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") validerCode();
  });

  btnRenvoyerCode.addEventListener("click", async (evenement) => {
    evenement.preventDefault();
    messageErreurCode.style.display = "none";
    try {
      await KADOSK_API.demanderCodeCommandes(emailEnCoursDeVerification);
      messageErreurCode.style.color = "#1faa6c";
      messageErreurCode.textContent = "Un nouveau code a été envoyé.";
      messageErreurCode.style.display = "block";
    } catch (erreur) {
      messageErreurCode.style.color = "";
      messageErreurCode.textContent = "Impossible de renvoyer un code pour le moment.";
      messageErreurCode.style.display = "block";
    }
  });

  btnChangerEmail.addEventListener("click", (evenement) => {
    evenement.preventDefault();
    afficherEtapeEmail();
  });

  btnOublier.addEventListener("click", () => {
    effacerSessionAcheteur();
    afficherEtapeEmail();
  });

  // Membre Wix déjà connecté (site hébergeant KADOSK en iframe) : assets/wix-bridge.js
  // fournit directement une session acheteur en mémoire puis déclenche cet
  // événement - même session partagée, aucune saisie de code nécessaire.
  document.addEventListener("kadosk:buyer-logged-in", demarrer);

  demarrer();
})();
