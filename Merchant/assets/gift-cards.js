(function () {
  const corpsTable = document.getElementById("corpsTableCartes");
  const etatVide = document.getElementById("etatVideCartes");
  const filtres = document.querySelectorAll(".kadosk-filtre");
  const recherche = document.getElementById("rechercheCartes");
  const creationNom = document.getElementById("creationNom");
  const creationEmail = document.getElementById("creationEmail");
  const creationMontant = document.getElementById("creationMontant");
  const creationMessage = document.getElementById("creationMessage");
  const creationStatut = document.getElementById("creationStatut");
  const modalEmission = document.getElementById("modalEmissionCarte");
  const ouvrirEmission = document.getElementById("ouvrirEmissionCarte");
  const fermerEmission = document.getElementById("fermerEmissionCarte");
  const filtreDateDebut = document.getElementById("filtreDateDebut");
  const filtreDateFin = document.getElementById("filtreDateFin");
  const modalDetail = document.getElementById("modalDetailCarte");
  const detailCorps = document.getElementById("detailCarteCorps");
  const detailReference = document.getElementById("detailCarteReference");
  const clientsMarchandNoms = document.getElementById("clientsMarchandNoms");
  const clientsMarchandEmails = document.getElementById("clientsMarchandEmails");
  const clientsMarchandTelephones = document.getElementById("clientsMarchandTelephones");
  const creationTelephone = document.getElementById("creationTelephone");
  const blocCreationEmail = document.getElementById("blocCreationEmail");
  const blocCreationTelephone = document.getElementById("blocCreationTelephone");
  const canalEmail = document.getElementById("canalEmail");

  if(ouvrirEmission)ouvrirEmission.hidden=true;
  document.addEventListener('kadosk:permissions',e=>{const owner=e.detail.role==='OWNER';if(ouvrirEmission)ouvrirEmission.hidden=!owner;if(!owner && modalEmission)modalEmission.style.display='none';});
  KADOSK_NAV.chargerChromeInfo().then(info=>{if(ouvrirEmission)ouvrirEmission.hidden=info.role!=='OWNER';});
  let toutesLesCartes = [];
  let clientsMarchand = [];
  let filtreActif = "ALL";
  let rechercheActive = "";
  const echapperHtml = window.KADOSK_ECHAPPER_HTML || ((v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

  async function chargerClientsMarchand() {
    try {
      const resultat = await KADOSK_API.getMerchantGrowth();
      clientsMarchand = (resultat.clients || []).filter((client) => client.email || client.phone);
      clientsMarchandNoms.innerHTML = clientsMarchand.map((client) => '<option value="' + echapperHtml(client.name || client.email || client.phone) + '">' + echapperHtml(client.email || client.phone || "") + '</option>').join("");
      clientsMarchandEmails.innerHTML = clientsMarchand.filter((client) => client.email).map((client) => '<option value="' + echapperHtml(client.email) + '">' + echapperHtml(client.name || "") + '</option>').join("");
      clientsMarchandTelephones.innerHTML = clientsMarchand.filter((client) => client.phone).map((client) => '<option value="' + echapperHtml(client.phone) + '">' + echapperHtml(client.name || "") + '</option>').join("");
    } catch (erreur) {
      console.error("Chargement des clients privés du marchand impossible :", erreur);
      clientsMarchand = [];
    }
  }

  function completerClient(source) {
    const valeur = source.value.trim().toLocaleLowerCase("fr");
    const client = clientsMarchand.find((item) => String(item.email || "").toLocaleLowerCase("fr") === valeur || String(item.phone || "").toLocaleLowerCase("fr") === valeur || String(item.name || "").toLocaleLowerCase("fr") === valeur);
    if (!client) return;
    creationNom.value = client.name || creationNom.value;
    if (client.email) creationEmail.value = client.email;
    if (client.phone) creationTelephone.value = client.phone;
  }

  function formaterDate(valeur) {
    if (!valeur) return "—";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? String(valeur) : date.toLocaleDateString("fr-FR");
  }

  function formaterMontant(valeur) {
    if (valeur === null || valeur === undefined) return "—";
    return Number(valeur).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " DH";
  }

  function codeMasque(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "00***";
  }

  function statutDerive(carte) {
    if (carte.status === "REDEEMED") return "USED";
    if (carte.status === "EXPIRED") return "EXPIRED";
    if (carte.status === "ACTIVE" && Number(carte.remainingBalance) <= 0) return "USED";
    return carte.status;
  }

  function badgePourStatut(statutAffiche) {
    if (statutAffiche === "ACTIVE") return '<span class="kadosk-badge kadosk-badge-actif">Active</span>';
    if (statutAffiche === "USED") return '<span class="kadosk-badge kadosk-badge-neutre">Encaissée</span>';
    if (statutAffiche === "EXPIRED") return '<span class="kadosk-badge" style="background:var(--kadosk-danger-tint); color:var(--kadosk-danger);">Expirée</span>';
    return '<span class="kadosk-badge kadosk-badge-neutre">' + statutAffiche + "</span>";
  }

  function appliquerFiltreEtAfficher() {
    const listeFiltree = toutesLesCartes.filter((carte) => {
      const statutAffiche = statutDerive(carte);
      const correspondStatut = filtreActif === "ALL" ? statutAffiche !== "DRAFT" : statutAffiche === filtreActif;
      const texte = [carte.giftCardId, carte.buyerName, carte.buyerEmail].join(" ").toLocaleLowerCase("fr");
      const dateEmission = new Date(carte.activatedAt || carte.createdAt || 0);
      const apresDebut = !filtreDateDebut.value || dateEmission >= new Date(filtreDateDebut.value + "T00:00:00");
      const avantFin = !filtreDateFin.value || dateEmission <= new Date(filtreDateFin.value + "T23:59:59");
      return correspondStatut && apresDebut && avantFin && (!rechercheActive || texte.includes(rechercheActive));
    });

    corpsTable.innerHTML = "";

    if (listeFiltree.length === 0) {
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";

    listeFiltree.forEach((carte) => {
      const ligne = document.createElement("tr");
      const statutAffiche = statutDerive(carte);

      const tdCarte = document.createElement("td");
      tdCarte.textContent = "Carte " + codeMasque(carte.giftCardId);

      const tdClient = document.createElement("td");
      tdClient.textContent = carte.buyerName || carte.buyerEmail || "—";

      const tdCree = document.createElement("td");
      tdCree.textContent = formaterDate(carte.activatedAt || carte.createdAt);

      const tdInitial = document.createElement("td");
      tdInitial.textContent = carte.donneesIllisibles ? "Données illisibles" : formaterMontant(carte.initialBalance);
      if (carte.donneesIllisibles) tdInitial.style.color = "var(--kadosk-danger)";

      const tdRestant = document.createElement("td");
      tdRestant.textContent = carte.donneesIllisibles ? "—" : formaterMontant(carte.remainingBalance);

      const tdStatut = document.createElement("td");
      tdStatut.innerHTML = badgePourStatut(statutAffiche);

      ligne.appendChild(tdCarte);
      ligne.appendChild(tdClient);
      ligne.appendChild(tdCree);
      ligne.appendChild(tdInitial);
      ligne.appendChild(tdRestant);
      ligne.appendChild(tdStatut);
      const tdAction = document.createElement("td");
      tdAction.innerHTML = '<button class="kadosk-lien-voir-tout" type="button">Voir le détail</button>';
      ligne.appendChild(tdAction);
      ligne.style.cursor = "pointer";
      ligne.addEventListener("click", () => ouvrirDetailCarte(carte.giftCardId));

      corpsTable.appendChild(ligne);
    });
  }

  async function ouvrirDetailCarte(giftCardId) {
    modalDetail.style.display = "flex";
    detailReference.textContent = "Carte " + codeMasque(giftCardId);
    detailCorps.innerHTML = '<div class="kadosk-chargement-ligne"><span class="kadosk-spinner"></span> Chargement…</div>';
    try {
      const d = await KADOSK_API.getGiftCardDetail(giftCardId);
      const f = d.fraud || { score: 0, niveau: "FAIBLE", signaux: {} };
      const couleur = f.niveau === "FORT" ? "#b02a37" : f.niveau === "MOYEN" ? "#c77700" : "#1f8a5b";
      const historique = (d.history || []).slice(0, 12).map((h) => '<li><strong>' + echapperHtml(h.action || "Action") + '</strong> — ' + echapperHtml(formaterDate(h.createdAt)) + (h.success === false ? ' · Échec' : '') + (h.attemptedAmount !== null && h.attemptedAmount !== undefined && Number.isFinite(Number(h.attemptedAmount)) ? ' · ' + echapperHtml(formaterMontant(h.attemptedAmount)) : '') + '</li>').join("") || "<li>Aucun événement</li>";
      const access = await KADOSK_NAV.chargerChromeInfo();
      const boutons = access.role !== "OWNER" || d.fraudBlocked ? "" : d.status === "ACTIVE" ? '<button class="kadosk-bouton kadosk-bouton-secondaire" data-action-carte="SUSPEND">Suspendre</button><button class="kadosk-bouton kadosk-bouton-danger" data-action-carte="CANCEL">Annuler</button>' : d.status === "SUSPENDED" ? '<button class="kadosk-bouton" data-action-carte="REACTIVATE">Réactiver</button><button class="kadosk-bouton kadosk-bouton-danger" data-action-carte="CANCEL">Annuler</button>' : "";
      const signaux = [
        ["Solde dépassé", f.signaux.tentativesSoldeDepasse || 0],
        ["Échecs d’encaissement", f.signaux.echecsEncaissement || 0],
        ["Autre marchand", f.signaux.essaisAutreMarchand || 0],
        ["Échecs en 15 min", f.signaux.echecsRapides || 0],
        ["Montants invalides", f.signaux.montantsInvalides || 0],
        ["Carte indisponible", f.signaux.essaisCarteIndisponible || 0],
        ["Codes/signatures invalides", f.signaux.codesInvalides || 0],
        ["E-mail suspect", f.signaux.emailSuspect ? "Oui" : "Non"]
      ].map((s) => '<div><span>' + s[0] + '</span><strong>' + s[1] + '</strong></div>').join("");
      const plusHauteTentative = f.signaux.montantMaxTente !== null && f.signaux.montantMaxTente !== undefined && Number.isFinite(Number(f.signaux.montantMaxTente)) ? '<p class="kadosk-fraude-note">Plus haute tentative refusée : <strong>' + formaterMontant(f.signaux.montantMaxTente) + '</strong>.</p>' : '';
      detailCorps.innerHTML = '<div class="kadosk-detail-grille"><div><span>Client</span><strong>' + echapperHtml(d.buyerName || d.buyerEmail || "—") + '</strong></div><div><span>Statut</span><strong>' + echapperHtml(d.status || "—") + '</strong></div><div><span>Solde initial</span><strong>' + formaterMontant(d.initialBalance) + '</strong></div><div><span>Solde restant</span><strong>' + formaterMontant(d.remainingBalance) + '</strong></div></div><div class="kadosk-indice-fraude"><span>Indice de fraude</span><strong style="color:' + couleur + '">' + f.score + '/100 · ' + echapperHtml(f.niveau) + '</strong><div class="kadosk-fraude-signaux">' + signaux + '</div>' + plusHauteTentative + '<small>Un dépassement isolé est signalé sans suspendre automatiquement la carte. Le niveau fort exige des indices répétés ou combinés.</small></div><h3>Historique récent</h3><ul class="kadosk-historique-carte">' + historique + '</ul><div class="kadosk-ligne-boutons">' + boutons + '</div>';
      detailCorps.querySelectorAll("[data-action-carte]").forEach((b) => b.addEventListener("click", async () => {
        const action = b.dataset.actionCarte;
        const raison = window.prompt("Motif obligatoire de cette action :");
        if (!raison || !raison.trim()) return;
        if (!window.confirm("Confirmer cette action sur la carte ?")) return;
        b.disabled = true;
        try { await KADOSK_API.changeGiftCardStatus(giftCardId, action, raison.trim()); modalDetail.style.display = "none"; await chargerCartes(); }
        catch (e) { b.disabled = false; window.alert("Action impossible : " + (e.message || "erreur")); }
      }));
    } catch (e) { detailCorps.innerHTML = '<div class="kadosk-message-erreur">Impossible de charger le détail de cette carte.</div>'; }
  }

  async function chargerCartes() {
    corpsTable.innerHTML = '<tr><td colspan="7"><div class="kadosk-chargement-ligne"><span class="kadosk-spinner"></span> Chargement des cartes…</div></td></tr>';
    etatVide.style.display = "none";
    try {
      const resultat = await KADOSK_API.getAllGiftCards();
      toutesLesCartes = resultat.items || [];
      actualiserResume();
      appliquerFiltreEtAfficher();
    } catch (erreur) {
      console.error("Erreur chargement cartes cadeaux :", erreur);
      corpsTable.innerHTML = "";
      etatVide.style.display = "block";
      // DIAGNOSTIC TEMPORAIRE : affiche le détail réel de l'erreur (fourni par le
      // backend pour cet endpoint) directement dans la page, pour identifier la
      // cause sans devoir ouvrir les outils de développement à chaque fois.
      const messages = {
        FORBIDDEN_ROLE: "Vous n’avez pas l’autorisation de consulter les cartes cadeaux.",
        MERCHANT_NOT_FOUND: "Compte marchand introuvable.",
        MERCHANT_ACCOUNT_BLOCKED: "Le compte marchand est bloqué.",
        MERCHANT_AUTO_SUSPENDED: "Compte suspendu automatiquement : volume inhabituel de cartes générées. Contactez KADOSK pour le réactiver.",
        SESSION_EXPIREE: "Votre session a expiré. Reconnectez-vous."
      };
      etatVide.textContent = messages[erreur && erreur.message] || "Impossible de charger les cartes cadeaux. Réessayez dans quelques instants.";
    }
  }

  // --- Émission : montant (fixe enregistré ou libre) et design de la carte ---
  const zoneMontants = document.getElementById("creationMontants");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const aideMontantLibre = document.getElementById("aideMontantLibre");
  const zoneDesigns = document.getElementById("creationDesigns");
  const apercuEmission = document.getElementById("apercuEmission");
  const DESIGNS_EMISSION = [["saved", "Mon design"], ["classique", "Classique"], ["luxury", "Luxe"], ["botanical", "Botanique"], ["celebration", "Fête"], ["moroccan", "Marocain"], ["ocean", "Océan"], ["minimal", "Minimal"]];
  let offreEmission = null, designChoisi = "saved", montantLibreChoisi = false, carteApercu = null;

  function montantsFixes() {
    return String((offreEmission && offreEmission.presetAmounts) || "").split(",").map((v) => Number(v.trim())).filter((n) => n > 0 && n <= 1000);
  }
  function bornesLibres() {
    const o = offreEmission || {};
    const libre = !!o.freeAmountEnabled || !montantsFixes().length;
    return { libre, min: Number(o.freeAmountMin) || 1, max: Math.min(1000, Number(o.freeAmountMax) || 1000) };
  }
  function choix(zone, texte, actif, action) {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(actif)); b.textContent = texte;
    b.addEventListener("click", action);
    zone.append(b);
  }
  function rendreMontants() {
    if (!zoneMontants) return;
    zoneMontants.replaceChildren();
    const fixes = montantsFixes(), bornes = bornesLibres();
    if (!fixes.length) montantLibreChoisi = true;
    fixes.forEach((m) => choix(zoneMontants, m.toLocaleString("fr-FR") + " DH", !montantLibreChoisi && Number(creationMontant.value) === m, () => {
      montantLibreChoisi = false; creationMontant.value = String(m); rendreMontants(); majApercu();
    }));
    if (bornes.libre && fixes.length) choix(zoneMontants, "Montant libre", montantLibreChoisi, () => {
      montantLibreChoisi = true; creationMontant.value = ""; rendreMontants(); creationMontant.focus(); majApercu();
    });
    blocMontantLibre.hidden = !montantLibreChoisi;
    creationMontant.min = String(bornes.min); creationMontant.max = String(bornes.max);
    aideMontantLibre.textContent = "Entre " + bornes.min.toLocaleString("fr-FR") + " et " + bornes.max.toLocaleString("fr-FR") + " DH.";
  }
  // Même règle que le backend (designPourEmission) : design enregistré, classique ou thème.
  function designOffre(cle) {
    const o = offreEmission || {};
    const base = { accentColor: o.accentColor, pattern: o.pattern, font: o.font, backgroundType: o.backgroundType, backgroundImageUrl: o.backgroundImageUrl,
      gradientFrom: o.gradientFrom, gradientTo: o.gradientTo, gradientAngle: o.gradientAngle, design: { ...(o.design || {}) } };
    if (cle === "classique") return { ...base, backgroundType: "couleur", design: { ...base.design, theme: "" } };
    if (cle !== "saved") return { ...base, backgroundType: "theme", design: { ...base.design, theme: cle } };
    return base;
  }
  function rendreDesigns() {
    if (!zoneDesigns) return;
    zoneDesigns.replaceChildren();
    DESIGNS_EMISSION.forEach(([cle, texte]) => choix(zoneDesigns, texte, designChoisi === cle, () => { designChoisi = cle; rendreDesigns(); majApercu(); }));
  }
  function majApercu() {
    const R = window.KADOSK_GIFT_CARD_RENDERER;
    if (!R || !apercuEmission || !offreEmission) return;
    const donnees = { businessName: offreEmission.name || "Votre commerce", cardName: offreEmission.name || "", logoUrl: offreEmission.logoUrl, amount: Number(creationMontant.value) || null };
    if (!carteApercu) { carteApercu = R.creer(donnees, designOffre(designChoisi)); apercuEmission.replaceChildren(carteApercu); }
    else { R.majDonnees(carteApercu, donnees); R.majDesignOffre(carteApercu, designOffre(designChoisi)); }
  }
  async function preparerEmission() {
    try { offreEmission = await KADOSK_API.getOfferSettings(); } catch (_) { offreEmission = {}; }
    const fixes = montantsFixes();
    if (!creationMontant.value && fixes.length && !montantLibreChoisi) creationMontant.value = String(fixes[0]);
    rendreMontants(); rendreDesigns(); majApercu();
  }
  if (creationMontant) creationMontant.addEventListener("input", majApercu);

  const creationEnvoyer = document.getElementById('creationEnvoyer');
  let issuanceRequest=null;
  async function creerCarte() {
    const deliveryMode = "EMAIL";
    const amount = Number(creationMontant.value);
    const recipientEmail = creationEmail.value.trim();
    const recipientPhone = creationTelephone.value.trim();
    const recipientName = creationNom.value.trim();
    if (!recipientName || !amount || amount <= 0) {
      creationStatut.textContent = "Nom et montant valide sont obligatoires.";
      return;
    }
    const bornes = bornesLibres();
    if (!montantsFixes().includes(amount) && (!bornes.libre || amount < bornes.min || amount > bornes.max)) {
      creationStatut.textContent = bornes.libre ? "Le montant libre doit être entre " + bornes.min + " et " + bornes.max + " DH." : "Choisissez un des montants enregistrés.";
      return;
    }
    
    if (!recipientEmail) {
      creationStatut.textContent = "L’e-mail du client est obligatoire.";
      return;
    }
    creationEnvoyer.disabled = true;

    creationStatut.style.color = "";
    creationStatut.textContent = "Création en cours…";
    try {
      const paymentStatus=document.getElementById('creationPaiement').value;
      const fingerprint=JSON.stringify([amount,recipientEmail,recipientName,creationMessage.value.trim(),paymentStatus,designChoisi]);
      if(issuanceRequest && issuanceRequest.fingerprint!==fingerprint) throw Error('Reprenez la demande précédente avant de modifier ses informations.');
      issuanceRequest ||= {id:crypto.randomUUID(),fingerprint};
      const draft = await KADOSK_API.createMerchantGiftCardDraft(amount, recipientEmail, recipientName, creationMessage.value.trim(), deliveryMode, issuanceRequest.id, paymentStatus, designChoisi);
      const activated = await KADOSK_API.activateOrder(draft.orderItemId, recipientEmail, recipientName, creationMessage.value.trim(), deliveryMode, recipientPhone);
      {
        if (activated.emailSent === false) {
          creationStatut.style.color = "#b02a37";
          creationStatut.textContent = "Carte créée, envoi non confirmé : " + (activated.deliveryStatus || activated.emailError || "vérification nécessaire") + ". Ne créez pas une deuxième carte pour remplacer cet envoi.";
          await chargerCartes();
          return;
        } else {
          creationStatut.style.color = "#1faa6c";
          creationStatut.textContent = "Carte créée et envoyée au client par e-mail.";
        }
        if (modalEmission) modalEmission.style.display = "none";
      }
      issuanceRequest=null;
      document.getElementById("creationPaiement").value="UNSPECIFIED";
      creationNom.value = "";
      creationEmail.value = "";
      creationTelephone.value = "";
      creationMontant.value = "";
      montantLibreChoisi = false;
      creationMessage.value = "";
      await chargerCartes();
    } catch (erreur) {
      console.error("Erreur création carte marchand :", erreur);
      const messages = {
        MERCHANT_FINAL_APPROVAL_REQUIRED: "La validation finale du dossier est requise avant de créer une carte.",
        MERCHANT_PLAN_NOT_ACTIVE: "Votre abonnement marchand n’est pas actif.",
        QUOTA_CARTES_ATTEINT: "Vous avez atteint la limite de cartes de votre essai gratuit (10 cartes ou 30 jours). Passez à un abonnement payant pour continuer.",
        TWO_FACTOR_REQUIRED: "Validez la double authentification avant de créer la carte.",
        "2FA_ENROLLMENT_REQUIRED": "Activez la double authentification avant de créer la carte.",
        INVALID_AMOUNT_FOR_OFFER: "Ce montant n’est pas autorisé : choisissez un montant fixe enregistré ou un montant libre dans la fourchette de votre offre.",
        INVALID_DESIGN_CHOICE: "Design inconnu : choisissez un des designs proposés.",
        INVALID_INITIAL_BALANCE: "Le montant doit être compris entre 1 et 1 000 DH.",
        FORBIDDEN_ROLE: "Seul le propriétaire du compte peut créer une carte.",
        MERCHANT_ACCOUNT_BLOCKED: "Le compte marchand est bloqué.",
        MERCHANT_AUTO_SUSPENDED: "Compte suspendu automatiquement : volume inhabituel de cartes générées. Contactez KADOSK pour le réactiver.",
        MISSING_PARAMETERS: "E-mail invalide."
      };
      creationStatut.textContent = messages[erreur.message] || "Création impossible : " + (erreur.message || "erreur inconnue");
    } finally {
      creationEnvoyer.disabled = false;
    }
  }

  creationEnvoyer.addEventListener('click', creerCarte);
  creationNom.addEventListener("change", () => completerClient(creationNom));
  creationTelephone.addEventListener("change", () => completerClient(creationTelephone));
  creationEmail.addEventListener("change", () => completerClient(creationEmail));
  function ouvrirModalEmission() {
    modalEmission.style.display = "flex";
    preparerEmission();

    chargerClientsMarchand();
    creationNom.focus();
  }
  if (ouvrirEmission) ouvrirEmission.addEventListener("click", ouvrirModalEmission);
  // Raccourci "Créer une carte" du tableau de bord mobile (dashboard.html) :
  // ?creer=1 ouvre directement ce modal au chargement, sans étape
  // intermédiaire - le marchand n'a normalement aucune raison de lier
  // manuellement ce paramètre, il vient uniquement du lien fixe posé côté
  // dashboard.html.
  if (new URLSearchParams(window.location.search).get("creer") === "1") {
    ouvrirModalEmission();
  }
  if (fermerEmission) fermerEmission.addEventListener("click", () => { modalEmission.style.display = "none"; });
  if (modalEmission) modalEmission.addEventListener("click", (e) => { if (e.target === modalEmission) modalEmission.style.display = "none"; });
  const fermerDetail = document.getElementById("fermerDetailCarte");
  if (fermerDetail) fermerDetail.addEventListener("click", () => modalDetail.style.display = "none");
  if (modalDetail) modalDetail.addEventListener("click", (e) => { if (e.target === modalDetail) modalDetail.style.display = "none"; });
  [filtreDateDebut, filtreDateFin].filter(Boolean).forEach((champ) => champ.addEventListener("change", appliquerFiltreEtAfficher));

  function actualiserResume() {
    const publiees = toutesLesCartes.filter((c) => statutDerive(c) !== "DRAFT");
    const compter = (statut) => publiees.filter((c) => statutDerive(c) === statut).length;
    const total = (champ, filtre) => publiees
      .filter(filtre || (() => true))
      .reduce((somme, c) => somme + (Number(c[champ]) || 0), 0);
    const ecrire = (id, valeur) => { const el = document.getElementById(id); if (el) el.textContent = valeur; };
    ecrire("resumeActives", compter("ACTIVE"));
    ecrire("resumeUtilisees", compter("USED"));
    ecrire("resumeExpirees", compter("EXPIRED"));
    ecrire("resumeTotal", publiees.length);
    ecrire("resumeSoldeActif", "Solde " + formaterMontant(total("remainingBalance", c => statutDerive(c) === "ACTIVE")));
    ecrire("resumeValeurEmise", "Valeur " + formaterMontant(total("initialBalance")));
  }

  filtres.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      filtres.forEach((b) => b.classList.remove("actif"));
      bouton.classList.add("actif");
      filtreActif = bouton.getAttribute("data-filtre");
      appliquerFiltreEtAfficher();
    });
  });

  if (recherche) {
    recherche.addEventListener("input", () => {
      rechercheActive = recherche.value.trim().toLocaleLowerCase("fr");
      appliquerFiltreEtAfficher();
    });
  }

  chargerCartes();
})();
