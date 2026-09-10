(function () {
  // L'authentification, la barre latérale, l'en-tête et la déconnexion sont
  // gérées par guard.js (chargé avant ce script).

  const OB_FIELDS = {
    businessName:"obBusinessName", legalName:"obLegalName", legalForm:"obLegalForm", ice:"obIce", rc:"obRc", ifNumber:"obIf",
    representativeFirstName:"obRepFirstName", representativeName:"obRepName", representativePhone:"obRepPhone", representativeEmail:"obRepEmail",
    activityCategory:"obActivity", productsServices:"obProducts", address:"obAddress", city:"obCity", region:"obRegion", selectedPlanId:"obPlan",
    bankName:"obBank", ribHolderName:"obRibHolder", rib:"obRib", documentRcUrl:"obDocRc", documentIdentityUrl:"obDocIdentity", documentRibUrl:"obDocRib"
  };
  const obMessage = document.getElementById("obMessage");
  function lireOnboarding() {
    const profile = {};
    Object.keys(OB_FIELDS).forEach((key) => { profile[key] = document.getElementById(OB_FIELDS[key]).value.trim(); });
    profile.certifiedAccurate = document.getElementById("obCertified").checked;
    profile.acceptedPartnershipTerms = document.getElementById("obTerms").checked;
    profile.privacyConsent = document.getElementById("obPrivacy").checked;
    return profile;
  }
  function rendreChecklist(etat) {
    const zone = document.getElementById("onboardingChecklist");
    zone.innerHTML = (etat.tasks || []).map((t) => `<div style="font-size:12px;color:${t.complete ? '#14805e' : '#8a4960'}">${t.complete ? '✓' : '○'} ${t.label}</div>`).join("");
    document.getElementById("onboardingResume").textContent = `${etat.completed || 0}/${etat.total || 0} tâches terminées · Statut : ${etat.onboardingStatus || 'Draft'}`;
    document.getElementById("onboardingCommentaire").textContent = etat.comment ? "Commentaire KADOSK : " + etat.comment : "";
  }
  async function chargerOnboarding() {
    try {
      const [profile, etat] = await Promise.all([KADOSK_API.getMerchantProfile(), KADOSK_API.getOnboardingChecklist()]);
      Object.keys(OB_FIELDS).forEach((key) => { document.getElementById(OB_FIELDS[key]).value = profile[key] || ""; });
      document.getElementById("obCertified").checked = !!profile.certifiedAccurate;
      document.getElementById("obTerms").checked = !!profile.acceptedPartnershipTerms;
      rendreChecklist(etat);
      const verrouille = etat.onboardingStatus === "Submitted" || etat.merchantStatus === "Approved" || etat.merchantStatus === "Active";
      document.querySelectorAll("#onboardingForm input,#onboardingForm select,#blocOnboarding input[type=checkbox],#obSave,#obSubmit").forEach((el) => { el.disabled = verrouille; });
    } catch (e) { obMessage.textContent = "Impossible de charger le dossier : " + (e.message || "erreur"); }
  }
  async function sauverOnboarding(submit) {
    obMessage.textContent = "";
    try {
      const resultat = await KADOSK_API.saveMerchantProfile(lireOnboarding(), submit);
      obMessage.style.color = "#14805e";
      obMessage.textContent = submit ? "Dossier envoyé à KADOSK pour validation." : "Brouillon enregistré.";
      rendreChecklist({ ...resultat.checklist, onboardingStatus: resultat.onboardingStatus });
      if (submit) await chargerOnboarding();
    } catch (e) { obMessage.style.color = ""; obMessage.textContent = "Enregistrement refusé : " + (e.message || "dossier incomplet"); }
  }
  document.getElementById("obSave").addEventListener("click", () => sauverOnboarding(false));
  document.getElementById("obSubmit").addEventListener("click", () => sauverOnboarding(true));
  chargerOnboarding();

  const champNom = document.getElementById("champNom");
  const champDescription = document.getElementById("champDescription");
  const champLogoUrl = document.getElementById("champLogoUrl");
  const choixCouleurAccent = document.getElementById("choixCouleurAccent");
  const pastillesCouleur = choixCouleurAccent ? Array.from(choixCouleurAccent.querySelectorAll(".kadosk-pastille-couleur")) : [];
  const champCouleurLibre = document.getElementById("champCouleurLibre");
  let accentColorSelectionnee = "teal";

  // ---------------------------------------------------------------------------
  // Motif de fond / police / icône d'activité (voir assets/carte-visuelle.js pour
  // la bibliothèque partagée avec la vignette catalogue et le certificat PDF) -
  // mêmes clés que MOTIFS_CARTE_VALIDES/POLICES_CARTE_VALIDES/ICONES_ACTIVITE_VALIDES
  // côté backend (giftCardSecurity.web.js), à garder synchronisées.
  // ---------------------------------------------------------------------------
  const VISUELLE = window.KADOSK_CARTE_VISUELLE;
  const conteneurMotifs = document.getElementById("choixMotifCarte");
  const conteneurIcones = document.getElementById("choixIconeActivite");
  const champPoliceCarte = document.getElementById("champPoliceCarte");
  const texteIconeSuggeree = document.getElementById("texteIconeSuggeree");
  let motifSelectionne = "aucun";
  let policeSelectionnee = "poppins";
  let iconeSelectionnee = "cadeau";
  let iconeSuggeree = "cadeau";
  const MODELES_CARTE = {
    emeraude: { type: "degrade", from: "#0f766e", to: "#5eead4", accent: "#0f766e", motif: "points", police: "poppins" },
    crepuscule: { type: "degrade", from: "#4338ca", to: "#e879f9", accent: "#6d28d9", motif: "confettis", police: "montserrat" },
    sable: { type: "degrade", from: "#f4e4c1", to: "#b7791f", accent: "#92400e", motif: "cercles", police: "playfair" },
    nuit: { type: "degrade", from: "#111827", to: "#475569", accent: "#111827", motif: "diagonales", police: "spacemono" }
  };

  function construireGrilleMotifs() {
    if (!conteneurMotifs || !VISUELLE) return;
    conteneurMotifs.innerHTML = "";
    Object.keys(VISUELLE.MOTIFS_LIBELLES).forEach((cle) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "kadosk-swatch";
      bouton.title = VISUELLE.MOTIFS_LIBELLES[cle];
      bouton.dataset.motif = cle;
      if (cle === "aucun") {
        bouton.textContent = "—";
        bouton.style.fontSize = "11px";
        bouton.style.color = "var(--kadosk-texte-clair)";
      } else {
        const svg = VISUELLE.motifSvgComplet(cle, "#6b6580", 0.7);
        bouton.innerHTML = `<img src="${VISUELLE.svgVersDataUri(svg)}" alt="${VISUELLE.MOTIFS_LIBELLES[cle]}" />`;
      }
      bouton.addEventListener("click", () => selectionnerMotif(cle));
      conteneurMotifs.appendChild(bouton);
    });
  }

  function selectionnerMotif(cle) {
    motifSelectionne = cle;
    if (conteneurMotifs) {
      Array.from(conteneurMotifs.children).forEach((bouton) => {
        bouton.classList.toggle("selectionnee", bouton.dataset.motif === cle);
      });
    }
    actualiserApercu();
  }

  function construireGrilleIcones() {
    if (!conteneurIcones || !VISUELLE) return;
    conteneurIcones.innerHTML = "";
    Object.keys(VISUELLE.ICONES_LIBELLES).forEach((cle) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "kadosk-swatch";
      bouton.title = VISUELLE.ICONES_LIBELLES[cle];
      bouton.dataset.icone = cle;
      const svg = VISUELLE.iconeSvgComplet(cle, "#6c4ce0");
      bouton.innerHTML = `<img src="${VISUELLE.svgVersDataUri(svg)}" alt="${VISUELLE.ICONES_LIBELLES[cle]}" />`;
      if (cle === iconeSuggeree) {
        const badge = document.createElement("span");
        badge.className = "kadosk-swatch-badge";
        badge.textContent = "Suggéré";
        bouton.appendChild(badge);
      }
      bouton.addEventListener("click", () => selectionnerIcone(cle));
      conteneurIcones.appendChild(bouton);
    });
  }

  function selectionnerIcone(cle) {
    iconeSelectionnee = cle;
    if (conteneurIcones) {
      Array.from(conteneurIcones.children).forEach((bouton) => {
        bouton.classList.toggle("selectionnee", bouton.dataset.icone === cle);
      });
    }
    actualiserApercu();
  }

  function construireListePolices() {
    if (!champPoliceCarte || !VISUELLE) return;
    champPoliceCarte.innerHTML = "";
    Object.keys(VISUELLE.POLICES).forEach((cle) => {
      const option = document.createElement("option");
      option.value = cle;
      option.textContent = VISUELLE.POLICES[cle].label;
      champPoliceCarte.appendChild(option);
    });
    champPoliceCarte.addEventListener("change", () => {
      policeSelectionnee = champPoliceCarte.value;
      actualiserApercu();
    });
  }

  construireGrilleMotifs();
  construireListePolices();
  const champMontants = document.getElementById("champMontants");
  const champMontantLibreActif = document.getElementById("champMontantLibreActif");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const champMontantLibreMin = document.getElementById("champMontantLibreMin");
  const champMontantLibreMax = document.getElementById("champMontantLibreMax");
  const champExpiration = document.getElementById("champExpiration");
  const champVisible = document.getElementById("champVisible");
  const boutonEnregistrer = document.getElementById("boutonEnregistrer");
  const messageStatutParametres = document.getElementById("messageStatutParametres");
  const lienReinitialiserLogo = document.getElementById("lienReinitialiserLogo");
  const boutonUploaderLogo = document.getElementById("boutonUploaderLogo");
  const champFichierLogo = document.getElementById("champFichierLogo");
  const apercuLogoActuelImg = document.getElementById("apercuLogoActuelImg");
  const messageStatutLogo = document.getElementById("messageStatutLogo");

  const TYPES_LOGO_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  const TAILLE_LOGO_MAX_OCTETS = 5 * 1024 * 1024;

  const apercuLogoMarchand = document.getElementById("apercuLogoMarchand");
  const blocLogoMarchand = apercuLogoMarchand ? apercuLogoMarchand.parentElement : null;
  const apercuTitreCarte = document.getElementById("apercuTitreCarte");
  const apercuMontantCarte = document.getElementById("apercuMontantCarte");

  let logoEntrepriseParDefaut = "";

  const carteApercu = document.getElementById("carteApercu");

  const REGEX_COULEUR_HEX = /^#[0-9a-f]{6}$/i;

  // couleur : soit un preset ("teal", "violet"...), soit un hex libre (#RRGGBB).
  // Un seul état (accentColorSelectionnee) pour les deux cas - voir
  // assets/carte-visuelle.js côté rendu, qui accepte indifféremment l'un ou l'autre.
  function selectionnerCouleurAccent(couleur) {
    accentColorSelectionnee = couleur;
    const estPreset = pastillesCouleur.some((p) => p.dataset.couleur === couleur);
    pastillesCouleur.forEach((pastille) => {
      pastille.classList.toggle("selectionnee", pastille.dataset.couleur === couleur);
    });
    if (champCouleurLibre) {
      champCouleurLibre.classList.toggle("selectionnee", !estPreset);
      // Reflète toujours la couleur effective dans la pastille arc-en-ciel (même
      // un preset), pour que rouvrir le sélecteur système parte de la bonne teinte.
      const resolue = VISUELLE ? VISUELLE.resoudreAccent(couleur) : null;
      if (resolue) champCouleurLibre.value = resolue.base;
    }
    actualiserApercu();
  }

  pastillesCouleur.forEach((pastille) => {
    pastille.addEventListener("click", () => selectionnerCouleurAccent(pastille.dataset.couleur));
  });

  if (champCouleurLibre) {
    champCouleurLibre.addEventListener("input", () => {
      if (REGEX_COULEUR_HEX.test(champCouleurLibre.value)) {
        selectionnerCouleurAccent(champCouleurLibre.value);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Type de fond (couleur / dégradé / image) - voir assets/carte-visuelle.js,
  // appliquerAuxElements, pour le rendu, et TYPES_FOND_CARTE_VALIDES côté backend
  // (giftCardSecurity.web.js) pour la validation. Le badge "Géré par KADOSK" et
  // la zone QR restent fixes quel que soit le choix ici - jamais personnalisables.
  // ---------------------------------------------------------------------------
  const choixTypeFond = document.getElementById("choixTypeFond");
  const boutonsTypeFond = choixTypeFond ? Array.from(choixTypeFond.querySelectorAll("[data-type-fond]")) : [];
  const blocDegrade = document.getElementById("blocDegrade");
  const blocImageFond = document.getElementById("blocImageFond");
  const champGradientFrom = document.getElementById("champGradientFrom");
  const champGradientTo = document.getElementById("champGradientTo");
  const champGradientAngle = document.getElementById("champGradientAngle");
  const texteAngleDegrade = document.getElementById("texteAngleDegrade");
  const champBackgroundImageUrl = document.getElementById("champBackgroundImageUrl");
  const apercuFondActuelImg = document.getElementById("apercuFondActuelImg");
  const boutonUploaderFond = document.getElementById("boutonUploaderFond");
  const champFichierFond = document.getElementById("champFichierFond");
  const messageStatutFond = document.getElementById("messageStatutFond");

  const TYPES_LOGO_ACCEPTES_FOND = ["image/jpeg", "image/png", "image/webp"];
  const TAILLE_FOND_MAX_OCTETS = 5 * 1024 * 1024;

  let typeFondSelectionne = "couleur";

  function selectionnerTypeFond(type) {
    typeFondSelectionne = type;
    boutonsTypeFond.forEach((bouton) => {
      const actif = bouton.dataset.typeFond === type;
      bouton.className = "kadosk-bouton" + (actif ? "" : " kadosk-bouton-secondaire");
    });
    if (blocDegrade) blocDegrade.style.display = type === "degrade" ? "block" : "none";
    if (blocImageFond) blocImageFond.style.display = type === "image" ? "block" : "none";
    actualiserApercu();
  }

  boutonsTypeFond.forEach((bouton) => {
    bouton.addEventListener("click", () => selectionnerTypeFond(bouton.dataset.typeFond));
  });

  document.querySelectorAll("[data-modele]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const modele = MODELES_CARTE[bouton.dataset.modele];
      if (!modele) return;
      document.querySelectorAll("[data-modele]").forEach((b) => b.classList.toggle("selectionne", b === bouton));
      if (champGradientFrom) champGradientFrom.value = modele.from;
      if (champGradientTo) champGradientTo.value = modele.to;
      if (champGradientAngle) champGradientAngle.value = "135";
      if (texteAngleDegrade) texteAngleDegrade.textContent = "135°";
      selectionnerCouleurAccent(modele.accent);
      selectionnerMotif(modele.motif);
      selectionnerTypeFond(modele.type);
      policeSelectionnee = modele.police;
      if (champPoliceCarte) champPoliceCarte.value = modele.police;
      if (VISUELLE && VISUELLE.chargerPolice) VISUELLE.chargerPolice(modele.police);
      actualiserApercu();
    });
  });

  if (champGradientFrom) champGradientFrom.addEventListener("input", actualiserApercu);
  if (champGradientTo) champGradientTo.addEventListener("input", actualiserApercu);
  if (champGradientAngle) {
    champGradientAngle.addEventListener("input", () => {
      if (texteAngleDegrade) texteAngleDegrade.textContent = champGradientAngle.value + "°";
      actualiserApercu();
    });
  }

  function mettreAJourApercuFondActuel() {
    if (!apercuFondActuelImg || !champBackgroundImageUrl) return;
    const url = champBackgroundImageUrl.value.trim();
    if (url) {
      apercuFondActuelImg.src = url;
      apercuFondActuelImg.style.display = "block";
    } else {
      apercuFondActuelImg.style.display = "none";
    }
  }

  async function televerserFond(fichier) {
    if (!messageStatutFond) return;
    messageStatutFond.style.color = "";
    messageStatutFond.textContent = "";

    if (!fichier) return;

    if (!TYPES_LOGO_ACCEPTES_FOND.includes(fichier.type)) {
      messageStatutFond.textContent = "Format non supporté (PNG, JPEG ou WEBP uniquement).";
      return;
    }
    if (fichier.size > TAILLE_FOND_MAX_OCTETS) {
      messageStatutFond.textContent = "Fichier trop volumineux (5 Mo maximum).";
      return;
    }

    boutonUploaderFond.disabled = true;
    boutonUploaderFond.textContent = "Envoi en cours…";

    try {
      const { uploadUrl } = await KADOSK_API.getMediaUploadUrl(fichier.name, fichier.type, fichier.size);

      const reponse = await fetch(uploadUrl + "?filename=" + encodeURIComponent(fichier.name), {
        method: "PUT",
        headers: { "Content-Type": fichier.type },
        body: fichier
      });

      if (!reponse.ok) {
        throw new Error("ECHEC_UPLOAD");
      }

      const resultat = await reponse.json();
      const urlFinale = resultat && resultat.file && resultat.file.url;
      if (!urlFinale) {
        throw new Error("REPONSE_UPLOAD_INATTENDUE");
      }

      champBackgroundImageUrl.value = urlFinale;
      mettreAJourApercuFondActuel();
      actualiserApercu();
      messageStatutFond.style.color = "#1faa6c";
      messageStatutFond.textContent = "Image envoyée. Pensez à Enregistrer pour appliquer.";
    } catch (erreur) {
      console.error("Erreur upload fond de carte :", erreur);
      messageStatutFond.textContent = "Échec de l'envoi de l'image. Merci de réessayer.";
    } finally {
      boutonUploaderFond.disabled = false;
      boutonUploaderFond.textContent = "Choisir une image…";
      champFichierFond.value = "";
    }
  }

  if (boutonUploaderFond && champFichierFond) {
    boutonUploaderFond.addEventListener("click", () => champFichierFond.click());
    champFichierFond.addEventListener("change", () => televerserFond(champFichierFond.files[0]));
  }

  function actualiserVisibilite() {
    blocMontantLibre.style.display = champMontantLibreActif.checked ? "block" : "none";
  }

  function mettreAJourApercuLogoActuel() {
    if (!apercuLogoActuelImg) return;
    const url = champLogoUrl.value.trim();
    if (url) {
      apercuLogoActuelImg.src = url;
      apercuLogoActuelImg.style.display = "block";
    } else {
      apercuLogoActuelImg.style.display = "none";
    }
  }

  async function televerserLogo(fichier) {
    messageStatutLogo.style.color = "";
    messageStatutLogo.textContent = "";

    if (!fichier) return;

    if (!TYPES_LOGO_ACCEPTES.includes(fichier.type)) {
      messageStatutLogo.textContent = "Format non supporté (PNG, JPEG, WEBP ou SVG uniquement).";
      return;
    }
    if (fichier.size > TAILLE_LOGO_MAX_OCTETS) {
      messageStatutLogo.textContent = "Fichier trop volumineux (5 Mo maximum).";
      return;
    }

    boutonUploaderLogo.disabled = true;
    boutonUploaderLogo.textContent = "Envoi en cours…";

    try {
      const { uploadUrl } = await KADOSK_API.getMediaUploadUrl(fichier.name, fichier.type, fichier.size);

      const reponse = await fetch(uploadUrl + "?filename=" + encodeURIComponent(fichier.name), {
        method: "PUT",
        headers: { "Content-Type": fichier.type },
        body: fichier
      });

      if (!reponse.ok) {
        throw new Error("ECHEC_UPLOAD");
      }

      const resultat = await reponse.json();
      const urlFinale = resultat && resultat.file && resultat.file.url;
      if (!urlFinale) {
        throw new Error("REPONSE_UPLOAD_INATTENDUE");
      }

      champLogoUrl.value = urlFinale;
      mettreAJourApercuLogoActuel();
      actualiserApercu();
      messageStatutLogo.style.color = "#1faa6c";
      messageStatutLogo.textContent = "Logo envoyé. Pensez à Enregistrer pour appliquer.";
    } catch (erreur) {
      console.error("Erreur upload logo :", erreur);
      messageStatutLogo.textContent = "Échec de l'envoi du logo. Merci de réessayer.";
    } finally {
      boutonUploaderLogo.disabled = false;
      boutonUploaderLogo.textContent = "Choisir une image…";
      champFichierLogo.value = "";
    }
  }

  function actualiserApercu() {
    if (!apercuLogoMarchand) return;

    const logoUrl = champLogoUrl.value.trim();
    if (logoUrl) {
      apercuLogoMarchand.src = logoUrl;
      apercuLogoMarchand.style.display = "block";
      blocLogoMarchand.classList.add("a-un-logo");
    } else {
      apercuLogoMarchand.style.display = "none";
      blocLogoMarchand.classList.remove("a-un-logo");
    }

    apercuTitreCarte.textContent = champNom.value.trim() || "Nom de la carte cadeau";

    const premierMontant = champMontants.value
      .split(",")
      .map((valeur) => Number(valeur.trim()))
      .find((nombre) => !isNaN(nombre) && nombre > 0);
    apercuMontantCarte.textContent = premierMontant
      ? premierMontant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      : (champMontantLibreMin.value || "100");

    if (VISUELLE && carteApercu) {
      VISUELLE.appliquerAuxElements(carteApercu, {
        accentColor: accentColorSelectionnee,
        pattern: motifSelectionne,
        font: policeSelectionnee,
        activityIcon: iconeSelectionnee,
        backgroundType: typeFondSelectionne,
        backgroundImageUrl: champBackgroundImageUrl ? champBackgroundImageUrl.value.trim() : "",
        gradientFrom: champGradientFrom ? champGradientFrom.value : "",
        gradientTo: champGradientTo ? champGradientTo.value : "",
        gradientAngle: champGradientAngle ? Number(champGradientAngle.value) : 135
      });
    }
  }

  async function chargerParametres() {
    try {
      const parametres = await KADOSK_API.getOfferSettings();

      champNom.value = parametres.name || "";
      champDescription.value = parametres.description || "";
      champLogoUrl.value = parametres.logoUrl || "";

      motifSelectionne = parametres.pattern || "aucun";
      policeSelectionnee = parametres.font || "poppins";
      iconeSelectionnee = parametres.activityIcon || "cadeau";
      iconeSuggeree = parametres.suggestedActivityIcon || "cadeau";
      if (champPoliceCarte) champPoliceCarte.value = policeSelectionnee;
      if (conteneurMotifs) {
        Array.from(conteneurMotifs.children).forEach((bouton) => {
          bouton.classList.toggle("selectionnee", bouton.dataset.motif === motifSelectionne);
        });
      }
      construireGrilleIcones();
      selectionnerIcone(iconeSelectionnee);
      if (texteIconeSuggeree) {
        const libelleSuggere = VISUELLE ? VISUELLE.ICONES_LIBELLES[iconeSuggeree] : iconeSuggeree;
        texteIconeSuggeree.textContent = "Icône suggérée d'après votre catégorie d'activité : " + (libelleSuggere || "—") + ".";
      }

      selectionnerCouleurAccent(parametres.accentColor || "teal");

      // Garde défensive identique à celle du logo/visible ci-dessous : si
      // settings.html n'a pas encore été redéployé avec les champs de fond
      // (#choixTypeFond etc.), ne pas planter tout le chargement pour autant.
      if (champGradientFrom) champGradientFrom.value = parametres.gradientFrom || "#8ab6a9";
      if (champGradientTo) champGradientTo.value = parametres.gradientTo || "#4f7a6c";
      if (champGradientAngle) {
        const angle = parametres.gradientAngle || 135;
        champGradientAngle.value = angle;
        if (texteAngleDegrade) texteAngleDegrade.textContent = angle + "°";
      }
      if (champBackgroundImageUrl) {
        champBackgroundImageUrl.value = parametres.backgroundImageUrl || "";
        mettreAJourApercuFondActuel();
      }
      if (boutonsTypeFond.length) selectionnerTypeFond(parametres.backgroundType || "couleur");

      champMontants.value = parametres.presetAmounts || "";
      champMontantLibreActif.checked = !!parametres.freeAmountEnabled;
      champMontantLibreMin.value = parametres.freeAmountMin || "";
      champMontantLibreMax.value = parametres.freeAmountMax || "";
      champExpiration.value = parametres.expirationMonths || 0;
      // Garde défensive : si settings.html n'a pas encore été redéployé avec la
      // case "Visible dans le catalogue public KADOSK" (#champVisible), ne pas
      // planter tout le chargement du formulaire pour autant.
      if (champVisible) {
        champVisible.checked = parametres.visible !== false;
      }
      logoEntrepriseParDefaut = parametres.businessLogoUrl || "";

      actualiserVisibilite();
      actualiserApercu();
      mettreAJourApercuLogoActuel();
      actualiserResumeOffre();
    } catch (erreur) {
      console.error("Erreur chargement paramètres offre :", erreur);
      const detail = erreur && erreur.message ? " (" + erreur.message + ")" : "";
      messageStatutParametres.textContent = "Impossible de charger vos paramètres actuels." + detail;
    }
  }

  async function enregistrerParametres() {
    messageStatutParametres.textContent = "";

    if (!champNom.value.trim()) {
      messageStatutParametres.textContent = "Le nom de la carte cadeau est obligatoire.";
      return;
    }

    boutonEnregistrer.disabled = true;

    try {
      const resultat = await KADOSK_API.saveOfferSettings({
        name: champNom.value.trim(),
        description: champDescription.value.trim(),
        logoUrl: champLogoUrl.value.trim(),
        accentColor: accentColorSelectionnee,
        pattern: motifSelectionne,
        font: policeSelectionnee,
        activityIcon: iconeSelectionnee,
        backgroundType: typeFondSelectionne,
        backgroundImageUrl: champBackgroundImageUrl ? champBackgroundImageUrl.value.trim() : "",
        gradientFrom: champGradientFrom ? champGradientFrom.value : "",
        gradientTo: champGradientTo ? champGradientTo.value : "",
        gradientAngle: champGradientAngle ? Number(champGradientAngle.value) : 135,
        presetAmounts: champMontants.value.trim(),
        freeAmountEnabled: champMontantLibreActif.checked,
        freeAmountMin: champMontantLibreMin.value ? Number(champMontantLibreMin.value) : null,
        freeAmountMax: champMontantLibreMax.value ? Number(champMontantLibreMax.value) : null,
        expirationMonths: Number(champExpiration.value) || 0,
        // Idem : si l'élément n'existe pas encore côté HTML déployé, on envoie true
        // (visible par défaut, comportement identique à celui du backend quand le
        // paramètre est absent) plutôt que de faire planter tout l'enregistrement.
        visible: champVisible ? champVisible.checked : true
      });

      messageStatutParametres.style.color = "#1faa6c";
      messageStatutParametres.textContent = "Paramètres enregistrés.";
      actualiserResumeOffre();

      // Diagnostic visible directement ici (pas besoin d'aller chercher les logs
      // backend dans le Dashboard Wix) : la synchro du produit Wix Store est
      // best-effort et n'empêche jamais la sauvegarde ci-dessus, donc son échec
      // éventuel doit être signalé séparément plutôt que silencieusement ignoré.
      const syncWixStore = resultat && resultat.wixStoreSync;
      if (syncWixStore && syncWixStore.ok === false) {
        messageStatutParametres.style.color = "#c0392b";
        messageStatutParametres.textContent =
          "Paramètres enregistrés, mais la synchro Wix Store a échoué : " +
          (syncWixStore.erreur || syncWixStore.raison || "erreur inconnue") + ".";
      } else if (syncWixStore && syncWixStore.categorie && syncWixStore.categorie.ok === false) {
        messageStatutParametres.style.color = "#c0392b";
        messageStatutParametres.textContent =
          "Paramètres enregistrés, produit Wix Store synchronisé, mais la catégorie a échoué : " +
          (syncWixStore.categorie.erreur || syncWixStore.categorie.raison || "erreur inconnue") + ".";
      }
    } catch (erreur) {
      console.error("Erreur enregistrement paramètres offre :", erreur);
      messageStatutParametres.style.color = "";
      const detail = erreur && erreur.message ? " (" + erreur.message + ")" : "";
      messageStatutParametres.textContent = "Échec de l'enregistrement. Vérifiez vos champs." + detail;
    } finally {
      boutonEnregistrer.disabled = false;
    }
  }

  champMontantLibreActif.addEventListener("change", actualiserVisibilite);
  boutonEnregistrer.addEventListener("click", enregistrerParametres);

  function actualiserResumeOffre() {
    const nom = document.getElementById("resumeNomCarte");
    const description = document.getElementById("resumeDescriptionCarte");
    const montants = document.getElementById("resumeMontantsCarte");
    const expiration = document.getElementById("resumeExpirationCarte");
    const image = document.getElementById("resumeImageCarte");
    if (nom) nom.textContent = champNom.value.trim() || "Carte cadeau";
    if (description) description.textContent = champDescription.value.trim() || "Configurez votre offre.";
    if (montants) montants.textContent = champMontants.value.split(",").map((v) => v.trim()).filter(Boolean).map((v) => v + " MAD").join(", ") || (champMontantLibreActif.checked ? "Montant personnalisé" : "—");
    const mois = Number(champExpiration.value) || 0;
    if (expiration) expiration.textContent = mois ? mois + " mois après l’émission" : "N’expire jamais";
    if (image) {
      const logo = champLogoUrl.value.trim();
      image.innerHTML = logo ? '<img src="' + logo.replace(/"/g, "&quot;") + '" alt="" style="max-width:80%;max-height:80%;object-fit:contain">' : "Carte cadeau";
    }
  }

  const boutonModifierCarte = document.getElementById("boutonModifierCarte");
  const editeurCarteCadeau = document.getElementById("editeurCarteCadeau");
  if (boutonModifierCarte && editeurCarteCadeau) {
    boutonModifierCarte.addEventListener("click", () => {
      const ouvert = editeurCarteCadeau.style.display !== "none";
      editeurCarteCadeau.style.display = ouvert ? "none" : "grid";
      boutonModifierCarte.textContent = ouvert ? "Modifier la carte cadeau" : "Fermer l’éditeur";
      if (!ouvert) editeurCarteCadeau.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  [champNom, champDescription, champMontants, champMontantLibreMin, champExpiration].forEach((champ) => {
    champ.addEventListener("input", () => { actualiserApercu(); actualiserResumeOffre(); });
  });
  champMontantLibreActif.addEventListener("change", actualiserResumeOffre);

  if (boutonUploaderLogo && champFichierLogo) {
    boutonUploaderLogo.addEventListener("click", () => champFichierLogo.click());
    champFichierLogo.addEventListener("change", () => televerserLogo(champFichierLogo.files[0]));
  }

  if (lienReinitialiserLogo) {
    lienReinitialiserLogo.addEventListener("click", (evenement) => {
      evenement.preventDefault();
      champLogoUrl.value = logoEntrepriseParDefaut;
      mettreAJourApercuLogoActuel();
      actualiserApercu();
    });
  }

  chargerParametres();

  // Modèle de facture client (RC/IF/adresse) - formulaire indépendant de l'offre
  // Gift Card ci-dessus : son propre chargement/enregistrement pour qu'un échec
  // sur l'un ne bloque jamais l'autre.
  const champFactureRc = document.getElementById("champFactureRc");
  const champFactureIf = document.getElementById("champFactureIf");
  const champFactureAdresse = document.getElementById("champFactureAdresse");
  const champFactureCouleurPrincipale = document.getElementById("champFactureCouleurPrincipale");
  const champFactureCouleurAccent = document.getElementById("champFactureCouleurAccent");
  const boutonEnregistrerFacture = document.getElementById("boutonEnregistrerFacture");
  const messageStatutFacture = document.getElementById("messageStatutFacture");

  async function chargerModeleFacture() {
    if (!champFactureRc) return;
    try {
      const modele = await KADOSK_API.getInvoiceTemplate();
      champFactureRc.value = modele.rc || "";
      champFactureIf.value = modele.ifNumber || "";
      champFactureAdresse.value = modele.address || "";
      champFactureCouleurPrincipale.value = modele.primaryColor || "#172033";
      champFactureCouleurAccent.value = modele.accentColor || "#6c4ce0";
    } catch (erreur) {
      console.error("Erreur chargement modèle de facture :", erreur);
      messageStatutFacture.textContent = "Impossible de charger votre modèle de facture actuel.";
    }
  }

  async function enregistrerModeleFacture() {
    messageStatutFacture.style.color = "";
    messageStatutFacture.textContent = "";

    const rc = champFactureRc.value.trim();
    const ifNumber = champFactureIf.value.trim();
    const adresse = champFactureAdresse.value.trim();
    if (!rc || !ifNumber || !adresse) {
      messageStatutFacture.textContent = "RC, IF et adresse sont tous obligatoires.";
      return;
    }

    boutonEnregistrerFacture.disabled = true;
    try {
      await KADOSK_API.saveInvoiceTemplate({
        rc,
        ifNumber,
        address: adresse,
        primaryColor: champFactureCouleurPrincipale.value,
        accentColor: champFactureCouleurAccent.value
      });
      messageStatutFacture.style.color = "#1faa6c";
      messageStatutFacture.textContent = "Modèle de facture enregistré.";
    } catch (erreur) {
      console.error("Erreur enregistrement modèle de facture :", erreur);
      const detail = erreur && erreur.message ? " (" + erreur.message + ")" : "";
      messageStatutFacture.textContent = "Échec de l'enregistrement." + detail;
    } finally {
      boutonEnregistrerFacture.disabled = false;
    }
  }

  if (boutonEnregistrerFacture) {
    boutonEnregistrerFacture.addEventListener("click", enregistrerModeleFacture);
    chargerModeleFacture();
  }
})();
