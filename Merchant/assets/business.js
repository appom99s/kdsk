(function () {
  const CHAMPS_DOSSIER_FINAL = {
    businessName: "Nom commercial", legalName: "Raison sociale", legalForm: "Forme juridique", ice: "ICE", rc: "Registre du commerce", ifNumber: "Identifiant fiscal",
    representativeName: "Nom du représentant", representativePhone: "Téléphone", representativeEmail: "E-mail",
    activityCategory: "Domaine d’activité", productsServices: "Produits / services", address: "Adresse", city: "Ville", region: "Région",
    bankName: "Banque", ribHolderName: "Titulaire du RIB", rib: "RIB", selectedPlanId: "Identifiant de l’abonnement",
    documentRcUrl: "Lien document RC", documentIdentityUrl: "Lien pièce d’identité", documentRibUrl: "Lien attestation RIB"
  };

  async function initialiserDossierFinal() {
    const section = document.getElementById("dossierFinalSection");
    const form = document.getElementById("dossierFinalForm");
    const message = document.getElementById("dossierMessage");
    if (!section || !form) return;
    try {
      const [profil, etat] = await Promise.all([KADOSK_API.getMerchantProfile(), KADOSK_API.getOnboardingChecklist()]);
      if (!(etat.merchantStatus === "PreApproved" || etat.onboardingStatus === "AccountInvited" || etat.onboardingStatus === "FinalSubmitted")) return;
      section.style.display = "block";
      form.innerHTML = Object.entries(CHAMPS_DOSSIER_FINAL).map(([key, label]) =>
        '<div class="kadosk-champ"><label for="dossier-' + key + '">' + label + '</label><input id="dossier-' + key + '" data-dossier-key="' + key + '"></div>'
      ).join("");
      Object.keys(CHAMPS_DOSSIER_FINAL).forEach((key) => {
        const el = form.querySelector('[data-dossier-key="' + key + '"]');
        el.value = profil[key] || "";
      });
      document.getElementById("dossierCertified").checked = !!profil.certifiedAccurate;
      document.getElementById("dossierTerms").checked = !!profil.acceptedPartnershipTerms;
      document.getElementById("dossierFinalResume").textContent = (etat.completed || 0) + "/" + (etat.total || 0) + " éléments complétés.";
      if (etat.onboardingStatus === "FinalSubmitted") {
        section.querySelectorAll("input,button").forEach((el) => { el.disabled = true; });
        message.style.color = "#14805e";
        message.textContent = "Dossier envoyé, en attente de la deuxième approbation KADOSK.";
      }
    } catch (erreur) {
      console.error("Erreur chargement dossier final :", erreur);
    }
  }

  const boutonDossier = document.getElementById("dossierSubmit");
  if (boutonDossier) boutonDossier.addEventListener("click", async () => {
    const payload = {};
    document.querySelectorAll("[data-dossier-key]").forEach((el) => { payload[el.dataset.dossierKey] = el.value.trim(); });
    payload.certifiedAccurate = document.getElementById("dossierCertified").checked;
    payload.acceptedPartnershipTerms = document.getElementById("dossierTerms").checked;
    payload.privacyConsent = document.getElementById("dossierPrivacy").checked;
    const message = document.getElementById("dossierMessage");
    boutonDossier.disabled = true;
    try {
      await KADOSK_API.saveMerchantProfile(payload, true);
      message.style.color = "#14805e";
      message.textContent = "Dossier envoyé pour la deuxième approbation.";
      document.getElementById("dossierFinalSection").querySelectorAll("input,button").forEach((el) => { el.disabled = true; });
    } catch (erreur) {
      message.textContent = "Dossier incomplet ou invalide : " + (erreur.message || "erreur inconnue");
      boutonDossier.disabled = false;
    }
  });
  initialiserDossierFinal();
  function texte(id, valeur) {
    const el = document.getElementById(id);
    if (el) el.textContent = valeur || "—";
  }

  const LIBELLES_STATUT_RIB = {
    NOT_SUBMITTED: "Non renseigné",
    PENDING_VERIFICATION: "En attente de vérification",
    CHANGE_PENDING: "Modification en attente de vérification",
    VERIFIED: "Vérifié"
  };

  async function chargerProfil() {
    try {
      const profil = await KADOSK_API.getMerchantProfile();

      texte("pBusinessName", profil.businessName);
      texte("pLegalName", profil.legalName);
      texte("pLegalForm", profil.legalForm);
      texte("pIce", profil.ice);
      texte("pRc", profil.rc);
      texte("pIf", profil.ifNumber);

      texte("pRepName", [profil.representativeFirstName, profil.representativeName].filter(Boolean).join(" "));
      texte("pRepPhone", profil.representativePhone);
      texte("pRepEmail", profil.representativeEmail);

      texte("pCategory", profil.activityCategory);
      texte("pSubCategory", profil.activitySubCategory);
      const descriptionTemp = document.createElement("div");
      descriptionTemp.innerHTML = String(profil.activityDescription || "");
      texte("pDescription", descriptionTemp.textContent || descriptionTemp.innerText || "");
      texte("pProducts", profil.productsServices);

      texte("pAddress", profil.address);
      texte("pCity", [profil.city, profil.region].filter(Boolean).join(", "));
      const lienMaps = document.getElementById("pMapsLink");
      const adresseMaps = [profil.address, profil.city, profil.region, profil.country].filter(Boolean).join(", ");
      if (lienMaps) {
        lienMaps.href = adresseMaps ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(adresseMaps) : "#";
        lienMaps.style.display = adresseMaps ? "inline" : "none";
      }
      texte("pWebsite", profil.website);

      texte("pBankName", profil.bankName);
      texte("pRib", profil.rib);
      texte("pRibHolder", profil.ribHolderName);
      texte("pRibStatus", LIBELLES_STATUT_RIB[profil.ribStatus] || profil.ribStatus || "Non renseigné");

      texte("pSubCategoryReseau", profil.activitySubCategory);
      const toggleAcceptUniversal = document.getElementById("toggleAcceptUniversal");
      const toggleAcceptDomain = document.getElementById("toggleAcceptDomain");
      if (toggleAcceptUniversal) toggleAcceptUniversal.checked = !!profil.acceptsUniversalCards;
      if (toggleAcceptDomain) toggleAcceptDomain.checked = !!profil.acceptsDomainCards;
    } catch (erreur) {
      console.error("Erreur chargement profil marchand :", erreur);
    }
  }

  // -------------------------------------------------------------------
  // Réseau KADOSK : acceptation des cartes universelles / par domaine.
  // -------------------------------------------------------------------
  const toggleAcceptUniversal = document.getElementById("toggleAcceptUniversal");
  const toggleAcceptDomain = document.getElementById("toggleAcceptDomain");
  const messageStatutReseau = document.getElementById("messageStatutReseau");

  async function enregistrerPreferencesReseau() {
    messageStatutReseau.style.color = "";
    messageStatutReseau.textContent = "";
    try {
      await KADOSK_API.saveNetworkPreferences(toggleAcceptUniversal.checked, toggleAcceptDomain.checked);
      messageStatutReseau.style.color = "#1faa6c";
      messageStatutReseau.textContent = "Préférences enregistrées.";
    } catch (erreur) {
      console.error("Erreur enregistrement préférences réseau :", erreur);
      messageStatutReseau.textContent = "Échec de l'enregistrement. Merci de réessayer.";
      // On restaure l'état précédent en rechargeant le profil réel.
      chargerProfil();
    }
  }

  if (toggleAcceptUniversal) toggleAcceptUniversal.addEventListener("change", enregistrerPreferencesReseau);
  if (toggleAcceptDomain) toggleAcceptDomain.addEventListener("change", enregistrerPreferencesReseau);

  // -------------------------------------------------------------------
  // Double authentification (2FA) par application TOTP.
  // -------------------------------------------------------------------
  const totpEtatDesactive = document.getElementById("totpEtatDesactive");
  const totpEtatEnrolement = document.getElementById("totpEtatEnrolement");
  const totpEtatActif = document.getElementById("totpEtatActif");
  const totpQrCode = document.getElementById("totpQrCode");
  const totpSecretTexte = document.getElementById("totpSecretTexte");
  const champCode2FAConfirmation = document.getElementById("champCode2FAConfirmation");
  const champCode2FADesactivation = document.getElementById("champCode2FADesactivation");
  const bouton2FAActiver = document.getElementById("bouton2FAActiver");
  const bouton2FAConfirmer = document.getElementById("bouton2FAConfirmer");
  const bouton2FAAnnuler = document.getElementById("bouton2FAAnnuler");
  const bouton2FADesactiver = document.getElementById("bouton2FADesactiver");
  const messageStatut2FA = document.getElementById("messageStatut2FA");

  function afficherEtat2FA(etat) {
    if (!totpEtatDesactive) return;
    totpEtatDesactive.style.display = etat === "desactive" ? "block" : "none";
    totpEtatEnrolement.style.display = etat === "enrolement" ? "block" : "none";
    totpEtatActif.style.display = etat === "actif" ? "block" : "none";
  }

  async function chargerEtat2FA() {
    if (!totpEtatDesactive) return;
    afficherEtat2FA("chargement");
    if (messageStatut2FA) {
      messageStatut2FA.style.color = "";
      messageStatut2FA.textContent = "Chargement de l’état de sécurité…";
    }
    try {
      const etat = await KADOSK_API.need2FA();
      afficherEtat2FA(etat && etat.enabled ? "actif" : "desactive");
      afficherEtatBiometrie(!!(etat && etat.biometricEnabled));
      if (messageStatut2FA) messageStatut2FA.textContent = "";
    } catch (erreur) {
      console.error("Erreur chargement état 2FA :", erreur);
      afficherEtat2FA("chargement");
      if (messageStatut2FA) messageStatut2FA.textContent = "État de sécurité indisponible. Actualisez pour réessayer.";
    }
  }

  async function activer2FA() {
    messageStatut2FA.style.color = "";
    messageStatut2FA.textContent = "";
    bouton2FAActiver.disabled = true;
    try {
      const resultat = await KADOSK_API.start2FA();
      totpSecretTexte.value = resultat.secretBase32 || "";
      totpQrCode.innerHTML = "";
      if (window.QRCode && resultat.otpauthUrl) {
        new QRCode(totpQrCode, { text: resultat.otpauthUrl, width: 180, height: 180 });
      }
      champCode2FAConfirmation.value = "";
      afficherEtat2FA("enrolement");
    } catch (erreur) {
      console.error("Erreur démarrage activation 2FA :", erreur);
      messageStatut2FA.textContent = "Impossible de démarrer l'activation. Réessayez.";
    } finally {
      bouton2FAActiver.disabled = false;
    }
  }

  async function confirmer2FA() {
    messageStatut2FA.style.color = "";
    messageStatut2FA.textContent = "";
    const code = champCode2FAConfirmation.value.trim();
    if (!/^\d{6}$/.test(code)) {
      messageStatut2FA.textContent = "Merci de saisir les 6 chiffres du code.";
      return;
    }
    bouton2FAConfirmer.disabled = true;
    try {
      await KADOSK_API.confirm2FA(code);
      messageStatut2FA.style.color = "#1faa6c";
      messageStatut2FA.textContent = "Double authentification activée.";
      afficherEtat2FA("actif");
    } catch (erreur) {
      console.error("Erreur confirmation 2FA :", erreur);
      messageStatut2FA.textContent = "Code invalide. Merci de réessayer.";
    } finally {
      bouton2FAConfirmer.disabled = false;
    }
  }

  async function desactiver2FA() {
    messageStatut2FA.style.color = "";
    messageStatut2FA.textContent = "";
    const code = champCode2FADesactivation.value.trim();
    if (!/^\d{6}$/.test(code)) {
      messageStatut2FA.textContent = "Merci de saisir les 6 chiffres du code.";
      return;
    }
    bouton2FADesactiver.disabled = true;
    try {
      await KADOSK_API.disable2FA(code);
      champCode2FADesactivation.value = "";
      messageStatut2FA.style.color = "#1faa6c";
      messageStatut2FA.textContent = "Double authentification désactivée.";
      afficherEtat2FA("desactive");
    } catch (erreur) {
      console.error("Erreur désactivation 2FA :", erreur);
      if (erreur.message === "TROP_DE_TENTATIVES") {
        messageStatut2FA.textContent = "Trop de tentatives échouées. Réessayez dans 15 minutes.";
      } else {
        messageStatut2FA.textContent = "Code invalide. Merci de réessayer.";
      }
    } finally {
      bouton2FADesactiver.disabled = false;
    }
  }

  if (bouton2FAActiver) bouton2FAActiver.addEventListener("click", activer2FA);
  if (bouton2FAConfirmer) bouton2FAConfirmer.addEventListener("click", confirmer2FA);
  if (bouton2FAAnnuler) bouton2FAAnnuler.addEventListener("click", () => afficherEtat2FA("desactive"));
  if (bouton2FADesactiver) bouton2FADesactiver.addEventListener("click", desactiver2FA);

  // -------------------------------------------------------------------
  // Biométrie (Face ID / Touch ID / Windows Hello) : alternative à la
  // saisie du code TOTP, activable une fois la 2FA elle-même activée.
  // -------------------------------------------------------------------
  const biometrieEtatDesactive = document.getElementById("biometrieEtatDesactive");
  const biometrieEtatActive = document.getElementById("biometrieEtatActive");
  const champCode2FADesactivationBiometrie = document.getElementById("champCode2FADesactivationBiometrie");
  const boutonBiometrieActiver = document.getElementById("boutonBiometrieActiver");
  const boutonBiometrieDesactiver = document.getElementById("boutonBiometrieDesactiver");
  const messageStatutBiometrie = document.getElementById("messageStatutBiometrie");

  function afficherEtatBiometrie(activee) {
    if (!biometrieEtatDesactive) return;
    biometrieEtatDesactive.style.display = activee ? "none" : "block";
    biometrieEtatActive.style.display = activee ? "block" : "none";
  }

  async function activerBiometrie() {
    if (!messageStatutBiometrie) return;
    messageStatutBiometrie.style.color = "";
    messageStatutBiometrie.textContent = "";

    if (!window.KADOSK_WEBAUTHN || !window.PublicKeyCredential) {
      messageStatutBiometrie.textContent = "Cet appareil ou ce navigateur ne prend pas en charge la biométrie.";
      return;
    }

    // DIAGNOSTIC TEMPORAIRE : on affiche la raison précise (pas seulement oui/non) pour
    // pouvoir diagnostiquer directement depuis un mobile, sans outils de développement.
    const diagnostic = await KADOSK_WEBAUTHN.diagnostiquerBiometrieSurCetAppareil();
    if (!diagnostic.disponible) {
      messageStatutBiometrie.textContent = "Biométrie indisponible : " + diagnostic.raison;
      return;
    }

    boutonBiometrieActiver.disabled = true;
    boutonBiometrieActiver.textContent = "Activation...";

    try {
      const depart = await KADOSK_API.startBiometricEnrollment();
      const enregistrement = await KADOSK_WEBAUTHN.creerCredentialEnregistrement(depart);
      const libelleAppareil =
        (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "Cet appareil";

      await KADOSK_API.confirmBiometricEnrollment(
        enregistrement.credentialId,
        enregistrement.publicKeySpkiBase64,
        enregistrement.algorithm,
        enregistrement.clientDataJSON,
        libelleAppareil
      );

      messageStatutBiometrie.style.color = "#1faa6c";
      messageStatutBiometrie.textContent = "Biométrie activée sur cet appareil.";
      afficherEtatBiometrie(true);
    } catch (erreur) {
      console.error("Erreur activation biométrique :", erreur);
      messageStatutBiometrie.textContent = "Activation annulée ou impossible. Merci de réessayer.";
    } finally {
      boutonBiometrieActiver.disabled = false;
      boutonBiometrieActiver.textContent = "Activer sur cet appareil";
    }
  }

  async function desactiverBiometrieCourante() {
    if (!messageStatutBiometrie) return;
    messageStatutBiometrie.style.color = "";
    messageStatutBiometrie.textContent = "";

    const code = champCode2FADesactivationBiometrie.value.trim();
    if (!/^\d{6}$/.test(code)) {
      messageStatutBiometrie.textContent = "Merci de saisir les 6 chiffres du code de votre application d'authentification.";
      return;
    }

    boutonBiometrieDesactiver.disabled = true;
    try {
      await KADOSK_API.disableBiometric(code);
      champCode2FADesactivationBiometrie.value = "";
      messageStatutBiometrie.style.color = "#1faa6c";
      messageStatutBiometrie.textContent = "Biométrie désactivée.";
      afficherEtatBiometrie(false);
    } catch (erreur) {
      console.error("Erreur désactivation biométrique :", erreur);
      if (erreur.message === "TROP_DE_TENTATIVES") {
        messageStatutBiometrie.textContent = "Trop de tentatives échouées. Réessayez dans 15 minutes.";
      } else {
        messageStatutBiometrie.textContent = "Code invalide. Merci de réessayer.";
      }
    } finally {
      boutonBiometrieDesactiver.disabled = false;
    }
  }

  if (boutonBiometrieActiver) boutonBiometrieActiver.addEventListener("click", activerBiometrie);
  if (boutonBiometrieDesactiver) boutonBiometrieDesactiver.addEventListener("click", desactiverBiometrieCourante);

  const LIBELLES_PALIER = {};
  const COULEURS_PALIER = {};

  const LIBELLES_STATUT_PAIEMENT = {
    PAID: "Encaissé",
    REFUNDED: "Remboursé",
    FAILED: "Échec du paiement",
    UNPAID: "Non payé",
    PENDING: "En attente"
  };

  function formaterDateAbonnement(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-FR");
  }

  async function chargerAbonnement() {
    const lienChanger = document.getElementById("lienChangerAbonnement");
    try {
      const infos = await KADOSK_API.getSubscriptionInfo();

      const elTier = document.getElementById("pPlanTier");
      if (infos.tier && LIBELLES_PALIER[infos.tier]) {
        elTier.textContent = LIBELLES_PALIER[infos.tier] + (infos.planName ? " (" + infos.planName + ")" : "");
        elTier.style.color = COULEURS_PALIER[infos.tier];
        elTier.style.fontWeight = "800";
      } else {
        elTier.textContent = infos.active ? (infos.planName || "Abonnement actif") : "Aucun abonnement actif";
      }

      texte(
        "pPlanCommission",
        infos.commissionRate !== null && infos.commissionRate !== undefined
          ? infos.commissionRate + " %"
          : "Non défini"
      );

      const dateExpiration = formaterDateAbonnement(infos.expirationDate);
      texte("pPlanExpiration", infos.recurring && !dateExpiration ? "Tant que non résilié" : dateExpiration);

      if (!infos.active) {
        texte("pPlanRenewal", "—");
      } else if (infos.recurring) {
        texte("pPlanRenewal", infos.autoRenew ? "Renouvellement automatique" : "Ne se renouvelle pas (résilié)");
      } else {
        texte("pPlanRenewal", "Paiement unique");
      }

      const elPaiement = document.getElementById("pPlanPaiement");
      if (elPaiement) {
        if (!infos.active) {
          elPaiement.textContent = "—";
          elPaiement.style.color = "";
        } else if (infos.paymentCollected) {
          elPaiement.textContent = "Encaissé";
          elPaiement.style.color = "#1faa6c";
        } else {
          elPaiement.textContent = LIBELLES_STATUT_PAIEMENT[infos.paymentStatus] || "Non encaissé";
          elPaiement.style.color = "var(--kadosk-danger)";
        }
      }

      if (lienChanger && infos.changePlanUrl) {
        lienChanger.href = infos.changePlanUrl;
      }
      texte("pPlanCashiers", (infos.activeCashiers || 0) + " / " + (infos.cashierLimit || 0) + " utilisés");
    } catch (erreur) {
      console.error("Erreur chargement abonnement :", erreur);
      texte("pPlanTier", "Indisponible");
    }
  }

  const mdpEtape1 = document.getElementById("mdpEtape1");
  const mdpEtape2 = document.getElementById("mdpEtape2");
  const champNouveauMdp = document.getElementById("champNouveauMdp");
  const champConfirmationMdp = document.getElementById("champConfirmationMdp");
  const champCodeMdp = document.getElementById("champCodeMdp");
  const boutonDemanderCode = document.getElementById("boutonDemanderCode");
  const boutonConfirmerMdp = document.getElementById("boutonConfirmerMdp");
  const messageStatutMdp = document.getElementById("messageStatutMdp");

  async function demanderCode() {
    messageStatutMdp.style.color = "";
    messageStatutMdp.textContent = "";

    const motDePasse = champNouveauMdp.value;
    const confirmation = champConfirmationMdp.value;

    if (!motDePasse || motDePasse.length < 8) {
      messageStatutMdp.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
      return;
    }
    if (motDePasse !== confirmation) {
      messageStatutMdp.textContent = "Les mots de passe ne correspondent pas.";
      return;
    }

    boutonDemanderCode.disabled = true;
    boutonDemanderCode.textContent = "Envoi en cours...";

    try {
      await KADOSK_API.requestPasswordChange(motDePasse);
      mdpEtape1.style.display = "none";
      mdpEtape2.style.display = "block";
      champCodeMdp.focus();
    } catch (erreur) {
      console.error("Erreur demande code changement mot de passe :", erreur);
      messageStatutMdp.textContent = "Une erreur est survenue. Merci de réessayer.";
    } finally {
      boutonDemanderCode.disabled = false;
      boutonDemanderCode.textContent = "Recevoir un code par email";
    }
  }

  async function confirmerCode() {
    messageStatutMdp.style.color = "";
    messageStatutMdp.textContent = "";

    const code = champCodeMdp.value.trim();
    if (!code) {
      messageStatutMdp.textContent = "Merci de saisir le code reçu par email.";
      return;
    }

    boutonConfirmerMdp.disabled = true;
    boutonConfirmerMdp.textContent = "Vérification...";

    try {
      await KADOSK_API.confirmPasswordChange(code);
      messageStatutMdp.style.color = "#1faa6c";
      messageStatutMdp.textContent = "Mot de passe mis à jour avec succès.";
      champNouveauMdp.value = "";
      champConfirmationMdp.value = "";
      champCodeMdp.value = "";
      mdpEtape2.style.display = "none";
      mdpEtape1.style.display = "block";
    } catch (erreur) {
      console.error("Erreur confirmation changement mot de passe :", erreur);
      messageStatutMdp.textContent = "Code invalide ou expiré.";
    } finally {
      boutonConfirmerMdp.disabled = false;
      boutonConfirmerMdp.textContent = "Confirmer le changement";
    }
  }

  boutonDemanderCode.addEventListener("click", demanderCode);
  boutonConfirmerMdp.addEventListener("click", confirmerCode);

  chargerProfil();
  chargerAbonnement();
  chargerEtat2FA();
})();
