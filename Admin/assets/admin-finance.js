(function () {
  KADOSK_ADMIN_NAV.rendre("finance");

  const kpiCommissions = document.getElementById("kpiCommissions");
  const kpiFactureTTC = document.getElementById("kpiFactureTTC");
  const kpiNombreFactures = document.getElementById("kpiNombreFactures");
  const kpiRemboursementsAttente = document.getElementById("kpiRemboursementsAttente");
  const conteneurAnomalies = document.getElementById("conteneurAnomalies");
  const conteneurCommissions = document.getElementById("conteneurCommissions");
  const champMerchantIdCommissions = document.getElementById("champMerchantIdCommissions");
  const champDateDebutCommissions = document.getElementById("champDateDebutCommissions");
  const champDateFinCommissions = document.getElementById("champDateFinCommissions");
  const boutonFiltrerCommissions = document.getElementById("boutonFiltrerCommissions");
  const boutonExporterCommissions = document.getElementById("boutonExporterCommissions");
  const resumeCACommissions = document.getElementById("resumeCACommissions");
  const boutonRelancerReconciliation = document.getElementById("boutonRelancerReconciliation");

  const conteneurFactureMensuelle = document.getElementById("conteneurFactureMensuelle");
  const conteneurFacturesMensuellesListe = document.getElementById("conteneurFacturesMensuellesListe");
  const champMerchantIdFactureMensuelle = document.getElementById("champMerchantIdFactureMensuelle");
  const champMoisFactureMensuelle = document.getElementById("champMoisFactureMensuelle");
  const champAnneeFactureMensuelle = document.getElementById("champAnneeFactureMensuelle");
  const boutonGenererFactureMensuelle = document.getElementById("boutonGenererFactureMensuelle");
  const boutonEnvoyerFactureMensuelleEmail = document.getElementById("boutonEnvoyerFactureMensuelleEmail");
  const messageStatutEnvoiEmail = document.getElementById("messageStatutEnvoiEmail");

  const champAeName = document.getElementById("champAeName");
  const champAeCnie = document.getElementById("champAeCnie");
  const champAeAddress = document.getElementById("champAeAddress");
  const champAeIce = document.getElementById("champAeIce");
  const champAeIf = document.getElementById("champAeIf");
  const champAeTaxePro = document.getElementById("champAeTaxePro");
  const champAeTel = document.getElementById("champAeTel");
  const champAeMail = document.getElementById("champAeMail");
  const boutonEnregistrerAe = document.getElementById("boutonEnregistrerAe");
  const messageStatutAe = document.getElementById("messageStatutAe");

  const NOMS_MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const MOYENS_PAIEMENT_LIBELLES = { ESPECE: "Espèce", CHEQUE: "Chèque", VIREMENT: "Virement" };

  function echapperHtml(valeur) {
    return String(valeur || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formaterMontant(valeur) {
    if (valeur === undefined || valeur === null) return "—";
    return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  async function chargerResume() {
    try {
      const resume = await KADOSK_API.getAdminFinanceSummary();
      kpiCommissions.textContent = formaterMontant(resume.totalCommissions);
      kpiFactureTTC.textContent = formaterMontant(resume.totalFactureTTC);
      kpiNombreFactures.textContent = resume.nombreFactures ?? "0";
      kpiRemboursementsAttente.textContent = resume.remboursementsEnAttente ?? "0";
    } catch (erreur) {
      console.error("Echec chargement résumé finance Admin :", erreur);
    }
  }

  const LIBELLES_ANOMALIE = {
    COMMISSION_MANQUANTE: "Commission manquante"
  };

  async function chargerReconciliation() {
    conteneurAnomalies.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminReconciliation();
      const anomalies = resultat.anomalies || [];
      if (!anomalies.length) {
        conteneurAnomalies.innerHTML = '<div class="adm-vide">Aucune anomalie détectée.</div>';
        return;
      }
      const lignes = anomalies
        .map(
          (a) => `
        <tr>
          <td><span class="adm-statut attente">${echapperHtml(LIBELLES_ANOMALIE[a.type] || a.type)}</span></td>
          <td><a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(a.orderNumber)}">${echapperHtml(a.orderNumber)}</a></td>
          <td>${echapperHtml(a.detail)}</td>
        </tr>`
        )
        .join("");
      conteneurAnomalies.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>Type</th><th>REF CMD</th><th>Détail</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    } catch (erreur) {
      console.error("Echec réconciliation financière Admin :", erreur);
      conteneurAnomalies.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  // Dernière page de commissions chargée (période/marchand sélectionnés) -
  // conservée pour l'export Excel, qui exporte exactement ce qui est affiché.
  // NOTE : getAdminCommissions reste paginé (30 lignes) - le résumé CA et
  // l'export ne portent donc que sur la page actuellement affichée, pas sur
  // l'intégralité de la période si elle dépasse 30 lignes.
  let derniereListeCommissions = [];

  function rendreResumeCACommissions(items) {
    if (!resumeCACommissions) return;
    if (!items.length) {
      resumeCACommissions.innerHTML = "";
      return;
    }
    const totalCA = items.reduce((somme, c) => somme + (Number(c.montantTTC) || 0), 0);
    const totalCommission = items.reduce((somme, c) => somme + (Number(c.montant) || 0), 0);
    resumeCACommissions.innerHTML =
      '<div><span style="color:var(--adm-texte-clair,#888);">Chiffre d\'affaires (page affichée)</span><br><strong>' + formaterMontant(totalCA) + "</strong></div>" +
      '<div><span style="color:var(--adm-texte-clair,#888);">Commission KADOSK</span><br><strong>' + formaterMontant(totalCommission) + "</strong></div>" +
      '<div><span style="color:var(--adm-texte-clair,#888);">Lignes</span><br><strong>' + items.length + "</strong></div>";
  }

  function exporterCommissionsExcel() {
    if (!window.XLSX) {
      alert("Export Excel indisponible pour le moment (bibliothèque non chargée). Merci de réessayer.");
      return;
    }
    const donnees = derniereListeCommissions.map((c) => ({
      "Marchand": c.merchantName || c.merchantId || "",
      "REF CMD": c.orderNumber || "",
      "Montant TTC (DH)": c.montantTTC !== null && c.montantTTC !== undefined ? c.montantTTC : "",
      "Taux (%)": c.taux || "",
      "Commission (DH)": c.montant !== null && c.montant !== undefined ? c.montant : "",
      "Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : ""
    }));
    const feuille = XLSX.utils.json_to_sheet(donnees);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Commissions");
    XLSX.writeFile(classeur, "kadosk-admin-commissions.xlsx");
  }

  async function chargerCommissions() {
    conteneurCommissions.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminCommissions(
        champMerchantIdCommissions.value,
        1,
        champDateDebutCommissions.value,
        champDateFinCommissions.value
      );
      const items = resultat.items || [];
      derniereListeCommissions = items;
      rendreResumeCACommissions(items);
      if (!items.length) {
        conteneurCommissions.innerHTML = '<div class="adm-vide">Aucune commission trouvée.</div>';
        return;
      }
      const lignes = items
        .map(
          (c) => `
        <tr>
          <td>${echapperHtml(c.merchantName || c.merchantId)}</td>
          <td>${echapperHtml(c.orderNumber)}</td>
          <td>${c.montantTTC !== null && c.montantTTC !== undefined ? formaterMontant(c.montantTTC) : "—"}</td>
          <td>${c.taux ? c.taux + " %" : "—"}</td>
          <td>${formaterMontant(c.montant)}</td>
          <td>${formaterDate(c.createdAt)}</td>
        </tr>`
        )
        .join("");
      conteneurCommissions.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>Marchand</th><th>REF CMD</th><th>Montant TTC</th><th>Taux</th><th>Commission</th><th>Date</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    } catch (erreur) {
      console.error("Echec chargement commissions Admin :", erreur);
      conteneurCommissions.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  function remplirSelectMois() {
    champMoisFactureMensuelle.innerHTML = NOMS_MOIS_FR
      .map((nom, index) => `<option value="${index + 1}">${nom}</option>`)
      .join("");
    const maintenant = new Date();
    champMoisFactureMensuelle.value = String(maintenant.getMonth() + 1);
    champAnneeFactureMensuelle.value = String(maintenant.getFullYear());
  }

  async function chargerFacturesMensuellesListe(merchantId) {
    conteneurFacturesMensuellesListe.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminMonthlyInvoicesList(merchantId);
      const items = resultat.items || [];
      if (!items.length) {
        conteneurFacturesMensuellesListe.innerHTML = '<div class="adm-vide">Aucune facture générée pour ce marchand.</div>';
        return;
      }
      const lignes = items
        .map(
          (f) => `
        <tr>
          <td>${echapperHtml(f.invoiceNumber)}</td>
          <td>${echapperHtml(NOMS_MOIS_FR[f.month - 1] || f.month)} ${f.year}</td>
          <td>${formaterMontant(f.commissionAmount)}</td>
          <td>${formaterMontant(f.subscriptionAmount)}</td>
          <td>${formaterMontant(f.totalAmount)}</td>
          <td><span class="adm-statut ${f.commissionPaymentStatus === "PAYE" ? "ok" : "attente"}">${f.commissionPaymentStatus === "PAYE" ? "Payée" : "Non payée"}</span></td>
          <td>${formaterDate(f.generatedAt)}</td>
        </tr>`
        )
        .join("");
      conteneurFacturesMensuellesListe.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>N° Facture</th><th>Mois</th><th>Commissions</th><th>Abonnement</th><th>Total</th><th>Statut commission</th><th>Générée le</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    } catch (erreur) {
      console.error("Echec chargement historique factures mensuelles Admin :", erreur);
      conteneurFacturesMensuellesListe.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  function libelleStatutAbonnementAdmin(facture) {
    if (facture.subscriptionPaymentCollected === true) return "Payé (Wix Pricing Plans)";
    if (facture.subscriptionPaymentCollected === false) return "Non payé (Wix Pricing Plans)";
    return "Statut non disponible";
  }

  function rendreFormulairePaiementCommission(facture, merchantId, annee, mois) {
    const estPaye = facture.commissionPaymentStatus === "PAYE";
    return `
      <div class="adm-panneau" style="margin:14px 0 0; padding:12px; background:rgba(0,0,0,0.02);">
        <h3 style="margin:0 0 8px; font-size:13px;">Statut de paiement de la commission</h3>
        <p style="font-size:12px; color:var(--adm-texte-clair,#888); margin:0 0 10px;">
          Statut actuel : <strong>${estPaye ? "Payée" : "Non payée"}</strong>
          ${estPaye ? " — " + echapperHtml((MOYENS_PAIEMENT_LIBELLES[facture.commissionPaymentMethod] || facture.commissionPaymentMethod || "")) + (facture.commissionPaymentReference ? " (réf. " + echapperHtml(facture.commissionPaymentReference) + ")" : "") : ""}
        </p>
        <div class="adm-toolbar" style="flex-wrap:wrap;">
          <select class="adm-input" id="champStatutPaiementCommission" style="max-width:150px;">
            <option value="NON_PAYE" ${!estPaye ? "selected" : ""}>Non payée</option>
            <option value="PAYE" ${estPaye ? "selected" : ""}>Payée</option>
          </select>
          <select class="adm-input" id="champMoyenPaiementCommission" style="max-width:150px;">
            <option value="ESPECE" ${facture.commissionPaymentMethod === "ESPECE" ? "selected" : ""}>Espèce</option>
            <option value="CHEQUE" ${facture.commissionPaymentMethod === "CHEQUE" ? "selected" : ""}>Chèque</option>
            <option value="VIREMENT" ${facture.commissionPaymentMethod === "VIREMENT" ? "selected" : ""}>Virement</option>
          </select>
          <input class="adm-input" id="champRefPaiementCommission" placeholder="Référence paiement" style="flex:1; min-width:180px;" value="${echapperHtml(facture.commissionPaymentReference || "")}" />
          <button class="adm-bouton" id="boutonEnregistrerPaiementCommission">Enregistrer</button>
        </div>
        <span id="messageStatutPaiementCommission" style="font-size:12px;"></span>

        <h3 style="margin:14px 0 4px; font-size:13px;">Statut de paiement de l'abonnement</h3>
        <p style="font-size:12px; color:var(--adm-texte-clair,#888); margin:0;">
          ${echapperHtml(libelleStatutAbonnementAdmin(facture))} — géré directement dans Wix Pricing Plans, non modifiable depuis KADOSK.
        </p>
      </div>`;
  }

  function attacherEcouteurPaiementCommission(merchantId, annee, mois) {
    const bouton = document.getElementById("boutonEnregistrerPaiementCommission");
    if (!bouton) return;
    bouton.addEventListener("click", async () => {
      const statut = document.getElementById("champStatutPaiementCommission").value;
      const moyen = document.getElementById("champMoyenPaiementCommission").value;
      const reference = document.getElementById("champRefPaiementCommission").value.trim();
      const messageStatut = document.getElementById("messageStatutPaiementCommission");
      messageStatut.textContent = "";
      bouton.disabled = true;
      try {
        await KADOSK_API.setAdminCommissionPaymentStatus(merchantId, annee, mois, statut, reference, moyen);
        messageStatut.textContent = "Enregistré.";
        messageStatut.style.color = "#2e7d32";
        genererFactureMensuelle();
      } catch (erreur) {
        console.error("Echec enregistrement statut paiement commission :", erreur);
        messageStatut.textContent = "Erreur lors de l'enregistrement.";
        messageStatut.style.color = "#c62828";
      } finally {
        bouton.disabled = false;
      }
    });
  }

  async function chargerListeMarchandsPourFiltres() {
    try {
      const resultat = await KADOSK_API.getAdminMerchantsFiltre();
      const items = resultat.items || [];
      const options = items
        .map((m) => `<option value="${echapperHtml(m.id)}">${echapperHtml(m.businessName)}</option>`)
        .join("");
      champMerchantIdCommissions.innerHTML = '<option value="">Tous les marchands</option>' + options;
      champMerchantIdFactureMensuelle.innerHTML = '<option value="">— Choisir un marchand —</option>' + options;
    } catch (erreur) {
      console.error("Echec chargement liste marchands (filtres Finance) :", erreur);
    }
  }

  async function genererFactureMensuelle() {
    const merchantId = champMerchantIdFactureMensuelle.value;
    if (!merchantId) {
      conteneurFactureMensuelle.innerHTML = '<div class="adm-vide">Merci de choisir un marchand.</div>';
      return;
    }
    const mois = Number(champMoisFactureMensuelle.value);
    const annee = Number(champAnneeFactureMensuelle.value);
    conteneurFactureMensuelle.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const facture = await KADOSK_API.getAdminMonthlyInvoice(merchantId, annee, mois);
      conteneurFactureMensuelle.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>N° Facture</th><th>Marchand</th><th>Commissions</th><th>Abonnement</th><th>Total Net à payer</th><th>PDF</th></tr></thead>
          <tbody>
            <tr>
              <td>${echapperHtml(facture.invoiceNumber)}</td>
              <td>${echapperHtml(facture.merchantBusinessName || merchantId)}</td>
              <td>${formaterMontant(facture.commissionAmount)}</td>
              <td>${formaterMontant(facture.subscriptionAmount)}</td>
              <td>${formaterMontant(facture.totalAmount)}</td>
              <td><a class="adm-lien-action" id="lienPdfFactureMensuelle">Télécharger</a></td>
            </tr>
          </tbody>
        </table>
        ${rendreFormulairePaiementCommission(facture, merchantId, annee, mois)}`;
      document.getElementById("lienPdfFactureMensuelle").addEventListener("click", () => {
        KADOSK_FACTURE_PDF.telecharger(facture);
      });
      attacherEcouteurPaiementCommission(merchantId, annee, mois);
      chargerFacturesMensuellesListe(merchantId);
    } catch (erreur) {
      console.error("Echec génération facture mensuelle Admin :", erreur);
      conteneurFactureMensuelle.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  async function chargerParametresAe() {
    try {
      const parametres = await KADOSK_API.getAdminAutoEntrepreneurSettings();
      champAeName.value = parametres.name || "";
      champAeCnie.value = parametres.cnie || "";
      champAeAddress.value = parametres.address || "";
      champAeIce.value = parametres.ice || "";
      champAeIf.value = parametres.ifNumber || "";
      champAeTaxePro.value = parametres.taxeProfessionnelleNumber || "";
      champAeTel.value = parametres.tel || "";
      champAeMail.value = parametres.mail || "";
    } catch (erreur) {
      console.error("Echec chargement infos Auto-Entrepreneur KADOSK :", erreur);
    }
  }

  async function enregistrerParametresAe() {
    messageStatutAe.textContent = "";
    boutonEnregistrerAe.disabled = true;
    try {
      await KADOSK_API.saveAdminAutoEntrepreneurSettings({
        name: champAeName.value.trim(),
        cnie: champAeCnie.value.trim(),
        address: champAeAddress.value.trim(),
        ice: champAeIce.value.trim(),
        ifNumber: champAeIf.value.trim(),
        taxeProfessionnelleNumber: champAeTaxePro.value.trim(),
        tel: champAeTel.value.trim(),
        mail: champAeMail.value.trim()
      });
      messageStatutAe.textContent = "Enregistré.";
      messageStatutAe.style.color = "#2e7d32";
    } catch (erreur) {
      console.error("Echec enregistrement infos Auto-Entrepreneur KADOSK :", erreur);
      messageStatutAe.textContent = "Erreur lors de l'enregistrement.";
      messageStatutAe.style.color = "#c62828";
    } finally {
      boutonEnregistrerAe.disabled = false;
    }
  }

  async function envoyerFactureMensuelleEmail() {
    const merchantId = champMerchantIdFactureMensuelle.value;
    if (!merchantId) {
      messageStatutEnvoiEmail.textContent = "Merci de choisir un marchand.";
      messageStatutEnvoiEmail.style.color = "#c62828";
      return;
    }
    const mois = Number(champMoisFactureMensuelle.value);
    const annee = Number(champAnneeFactureMensuelle.value);
    messageStatutEnvoiEmail.textContent = "Génération du PDF…";
    messageStatutEnvoiEmail.style.color = "";
    boutonEnvoyerFactureMensuelleEmail.disabled = true;
    try {
      // On régénère/récupère la facture pour être sûr d'avoir les données à
      // jour, on construit le PDF côté client (jsPDF n'existe pas côté Velo),
      // puis on l'uploade dans le Media Manager Wix avant d'envoyer l'email -
      // c'est cette URL uploadée qui sert de "pièce jointe" (voir la note
      // dans adminSecurity.web.js :: envoyerFactureMensuelleParEmailAdmin).
      const facture = await KADOSK_API.getAdminMonthlyInvoice(merchantId, annee, mois);
      const blob = KADOSK_FACTURE_PDF.genererBlob(facture);
      const nomFichier = KADOSK_FACTURE_PDF.nomFichier(facture);

      messageStatutEnvoiEmail.textContent = "Envoi en cours…";
      const { uploadUrl } = await KADOSK_API.getAdminInvoiceUploadUrl(nomFichier, "application/pdf", blob.size);
      const reponseUpload = await fetch(uploadUrl + "?filename=" + encodeURIComponent(nomFichier), {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: blob
      });
      if (!reponseUpload.ok) throw new Error("ECHEC_UPLOAD");
      const resultatUpload = await reponseUpload.json();
      const facturePdfUrl = resultatUpload.file && resultatUpload.file.url;

      await KADOSK_API.sendAdminMonthlyInvoiceEmail(merchantId, annee, mois, facturePdfUrl);
      messageStatutEnvoiEmail.textContent = "Facture envoyée par email.";
      messageStatutEnvoiEmail.style.color = "#2e7d32";
      genererFactureMensuelle();
    } catch (erreur) {
      console.error("Echec envoi facture mensuelle par email :", erreur);
      messageStatutEnvoiEmail.textContent = "Erreur lors de l'envoi.";
      messageStatutEnvoiEmail.style.color = "#c62828";
    } finally {
      boutonEnvoyerFactureMensuelleEmail.disabled = false;
    }
  }

  boutonFiltrerCommissions.addEventListener("click", chargerCommissions);
  if (boutonExporterCommissions) {
    boutonExporterCommissions.addEventListener("click", exporterCommissionsExcel);
  }
  boutonRelancerReconciliation.addEventListener("click", chargerReconciliation);
  boutonGenererFactureMensuelle.addEventListener("click", genererFactureMensuelle);
  boutonEnvoyerFactureMensuelleEmail.addEventListener("click", envoyerFactureMensuelleEmail);
  boutonEnregistrerAe.addEventListener("click", enregistrerParametresAe);

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    remplirSelectMois();
    chargerResume();
    chargerReconciliation();
    chargerListeMarchandsPourFiltres();
    chargerCommissions();
    chargerParametresAe();
  });
})();
