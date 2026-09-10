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
  const creationEnvoyerEmail = document.getElementById("creationEnvoyerEmail");
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

  let toutesLesCartes = [];
  let clientsMarchand = [];
  let filtreActif = "ALL";
  let rechercheActive = "";
  const echapperHtml = window.KADOSK_ECHAPPER_HTML || ((v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

  async function chargerClientsMarchand() {
    try {
      const resultat = await KADOSK_API.getMerchantGrowth();
      clientsMarchand = (resultat.clients || []).filter((client) => client.email);
      clientsMarchandNoms.innerHTML = clientsMarchand.map((client) => '<option value="' + echapperHtml(client.name || client.email) + '">' + echapperHtml(client.email) + '</option>').join("");
      clientsMarchandEmails.innerHTML = clientsMarchand.map((client) => '<option value="' + echapperHtml(client.email) + '">' + echapperHtml(client.name || "") + '</option>').join("");
    } catch (erreur) {
      console.error("Chargement des clients privés du marchand impossible :", erreur);
      clientsMarchand = [];
    }
  }

  function completerClient(source) {
    const valeur = source.value.trim().toLocaleLowerCase("fr");
    const client = clientsMarchand.find((item) => String(item.email || "").toLocaleLowerCase("fr") === valeur || String(item.name || "").toLocaleLowerCase("fr") === valeur);
    if (!client) return;
    creationNom.value = client.name || creationNom.value;
    creationEmail.value = client.email || creationEmail.value;
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
      const boutons = d.status === "ACTIVE" ? '<button class="kadosk-bouton kadosk-bouton-secondaire" data-action-carte="SUSPEND">Suspendre</button><button class="kadosk-bouton kadosk-bouton-danger" data-action-carte="CANCEL">Annuler</button>' : d.status === "SUSPENDED" ? '<button class="kadosk-bouton" data-action-carte="REACTIVATE">Réactiver</button><button class="kadosk-bouton kadosk-bouton-danger" data-action-carte="CANCEL">Annuler</button>' : "";
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
        SESSION_EXPIREE: "Votre session a expiré. Reconnectez-vous."
      };
      etatVide.textContent = messages[erreur && erreur.message] || "Impossible de charger les cartes cadeaux. Réessayez dans quelques instants.";
    }
  }

  async function creerCarte(deliveryMode) {
    const amount = Number(creationMontant.value);
    const recipientEmail = creationEmail.value.trim();
    const recipientName = creationNom.value.trim();
    if (!recipientName || !recipientEmail || !amount || amount <= 0) {
      creationStatut.textContent = "Nom, e-mail et montant valide sont obligatoires.";
      return;
    }
    creationEnvoyerEmail.disabled = true;
    creationStatut.style.color = "";
    creationStatut.textContent = "Création en cours…";
    try {
      const draft = await KADOSK_API.createMerchantGiftCardDraft(amount, recipientEmail, recipientName, creationMessage.value.trim());
      const activated = await KADOSK_API.activateOrder(draft.orderItemId, recipientEmail, recipientName, creationMessage.value.trim(), deliveryMode);
      if (activated.emailSent === false) {
          creationStatut.style.color = "#b02a37";
          creationStatut.textContent = "Carte créée, mais l’e-mail n’a pas été envoyé : " + (activated.emailError || "erreur Wix") + ".";
      } else {
          creationStatut.textContent = "Carte créée et envoyée au client par e-mail.";
      }
      if (activated.emailSent !== false) creationStatut.style.color = "#1faa6c";
      creationNom.value = "";
      creationEmail.value = "";
      creationMontant.value = "";
      creationMessage.value = "";
      if (modalEmission) modalEmission.style.display = "none";
      await chargerCartes();
    } catch (erreur) {
      console.error("Erreur création carte marchand :", erreur);
      const messages = {
        MERCHANT_FINAL_APPROVAL_REQUIRED: "La validation finale du dossier est requise avant de créer une carte.",
        MERCHANT_PLAN_NOT_ACTIVE: "Votre abonnement marchand n’est pas actif.",
        TWO_FACTOR_REQUIRED: "Validez la double authentification avant de créer la carte.",
        "2FA_ENROLLMENT_REQUIRED": "Activez la double authentification avant de créer la carte.",
        INVALID_AMOUNT_FOR_OFFER: "Ce montant n’est pas autorisé dans votre offre.",
        INVALID_INITIAL_BALANCE: "Le montant doit être compris entre 1 et 1 000 DH.",
        FORBIDDEN_ROLE: "Seul le propriétaire du compte peut créer une carte.",
        MERCHANT_ACCOUNT_BLOCKED: "Le compte marchand est bloqué."
      };
      creationStatut.textContent = messages[erreur.message] || "Création impossible : " + (erreur.message || "erreur inconnue");
    } finally {
      creationEnvoyerEmail.disabled = false;
    }
  }

  creationEnvoyerEmail.addEventListener("click", () => creerCarte("EMAIL"));
  creationNom.addEventListener("change", () => completerClient(creationNom));
  creationEmail.addEventListener("change", () => completerClient(creationEmail));
  if (ouvrirEmission) ouvrirEmission.addEventListener("click", () => { modalEmission.style.display = "flex"; chargerClientsMarchand(); creationNom.focus(); });
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
