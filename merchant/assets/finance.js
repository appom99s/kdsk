(function () {
  function poserIcone(id, nomIcone) {
    const el = document.getElementById(id);
    if (el && window.KADOSK_ICONES && window.KADOSK_ICONES[nomIcone]) {
      el.innerHTML = window.KADOSK_ICONES[nomIcone];
    }
  }

  poserIcone("iconeCA", "finances");
  poserIcone("iconeEncours", "cartes");
  poserIcone("iconeAttente", "commandes");

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  async function charger() {
    try {
      const resume = await KADOSK_API.getFinanceSummary();

      document.getElementById("valCA").textContent = formaterMontant(resume.totalRevenueEncaisse);
      document.getElementById("valTransactions").textContent =
        resume.totalTransactionsReussies +
        (resume.totalTransactionsReussies > 1 ? " transactions réussies" : " transaction réussie") +
        (resume.totalTransactionsEchouees ? " · " + resume.totalTransactionsEchouees + " refusée(s)" : "");

      document.getElementById("valEncours").textContent = formaterMontant(resume.activeCardsBalance);
      document.getElementById("valCartesActives").textContent =
        resume.activeCardsCount + (resume.activeCardsCount > 1 ? " cartes actives" : " carte active");

      document.getElementById("valAttente").textContent = formaterMontant(resume.pendingOrdersTotal);
      document.getElementById("valCommandesAttente").textContent =
        resume.pendingOrdersCount + (resume.pendingOrdersCount > 1 ? " commandes en attente" : " commande en attente");

      const blocConfiguree = document.getElementById("blocCommissionConfiguree");
      const blocNonConfiguree = document.getElementById("blocCommissionNonConfiguree");
      if (resume.commissionSystemConfigured) {
        blocConfiguree.style.display = "block";
        blocNonConfiguree.style.display = "none";
        document.getElementById("valTauxCommission").textContent = resume.commissionRate + " %";
        document.getElementById("valCommission").textContent = formaterMontant(resume.commissionAmount) + " DH";
        document.getElementById("valNet").textContent = formaterMontant(resume.netAmount) + " DH";
      } else {
        blocConfiguree.style.display = "none";
        blocNonConfiguree.style.display = "block";
      }
    } catch (erreur) {
      console.error("Erreur chargement résumé financier :", erreur);
    }
  }

  const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  function libelleMois(cleMois) {
    const [annee, mois] = cleMois.split("-").map(Number);
    if (!annee || !mois) return cleMois;
    return MOIS_FR[mois - 1] + " " + annee;
  }

  function codeMasque(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "00***";
  }

  const corpsTableCommissionMensuelle = document.getElementById("corpsTableCommissionMensuelle");
  const etatVideCommission = document.getElementById("etatVideCommission");
  const blocDetailCommissionMois = document.getElementById("blocDetailCommissionMois");
  const titreDetailCommissionMois = document.getElementById("titreDetailCommissionMois");
  const corpsTableDetailCommission = document.getElementById("corpsTableDetailCommission");
  const boutonFermerDetailCommission = document.getElementById("boutonFermerDetailCommission");

  const LIBELLES_STATUT_PAIEMENT_MOIS = {
    PAYE: "Payée",
    NON_PAYE: "Non payée"
  };

  function badgeStatutPaiement(statut) {
    if (!statut) return "—";
    const libelle = LIBELLES_STATUT_PAIEMENT_MOIS[statut] || statut;
    const classe = statut === "PAYE" ? "kadosk-badge-actif" : "kadosk-badge-attente";
    return '<span class="' + classe + '">' + libelle + "</span>";
  }

  const banniereStatutMoisDetail = document.getElementById("banniereStatutMoisDetail");

  async function afficherDetailMois(cleMois) {
    titreDetailCommissionMois.textContent = "Détail — " + libelleMois(cleMois);
    corpsTableDetailCommission.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';
    if (banniereStatutMoisDetail) banniereStatutMoisDetail.innerHTML = "";
    blocDetailCommissionMois.style.display = "block";
    blocDetailCommissionMois.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const resultat = await KADOSK_API.getCommissionDetail(cleMois);
      const lignes = resultat.items || [];

      // Un mois marqué "payé" par KADOSK vaut pour TOUTES les transactions de ce
      // mois (pas de suivi de paiement transaction par transaction) - voir
      // getDetailCommissionMois côté backend.
      if (banniereStatutMoisDetail) {
        banniereStatutMoisDetail.innerHTML = resultat.invoiceExists
          ? "Facture " + (resultat.invoiceNumber || "") + " — commission du mois : " + badgeStatutPaiement(resultat.commissionPaymentStatus)
          : "Facture pas encore générée pour ce mois.";
      }

      if (lignes.length === 0) {
        corpsTableDetailCommission.innerHTML = '<tr><td colspan="5">Aucune carte pour ce mois.</td></tr>';
        return;
      }

      corpsTableDetailCommission.innerHTML = lignes
        .map((ligne) => {
          const date = ligne.createdAt ? new Date(ligne.createdAt).toLocaleDateString("fr-FR") : "—";
          const commission = ligne.commissionAmount !== null && ligne.commissionAmount !== undefined
            ? formaterMontant(ligne.commissionAmount) + " DH"
            : "—";
          return (
            "<tr>" +
            "<td>Carte " + codeMasque(ligne.giftCardId) + "</td>" +
            "<td>" + date + "</td>" +
            "<td>" + formaterMontant(ligne.amount) + " DH</td>" +
            "<td>" + commission + "</td>" +
            "<td>" + badgeStatutPaiement(ligne.commissionPaymentStatus) + "</td>" +
            "</tr>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement détail commission mensuelle :", erreur);
      corpsTableDetailCommission.innerHTML = '<tr><td colspan="5">Impossible de charger le détail.</td></tr>';
    }
  }

  async function telechargerFactureDepuisMois(cleMois, evenement) {
    evenement.stopPropagation();
    const [annee, mois] = cleMois.split("-").map(Number);
    try {
      const facture = await KADOSK_API.getMonthlyInvoice(annee, mois);
      if (!facture || facture.exists === false) return;
      KADOSK_FACTURE_PDF.telecharger(facture);
    } catch (erreur) {
      console.error("Erreur téléchargement facture depuis le suivi mensuel :", erreur);
    }
  }

  async function chargerCommissionMensuelle() {
    try {
      const resultat = await KADOSK_API.getCommissionMonthly();
      const mois = resultat.items || [];

      if (mois.length === 0) {
        etatVideCommission.style.display = "block";
        corpsTableCommissionMensuelle.innerHTML = "";
        return;
      }
      etatVideCommission.style.display = "none";

      corpsTableCommissionMensuelle.innerHTML = mois
        .map((ligne) => {
          const commission = ligne.commissionAmount !== null && ligne.commissionAmount !== undefined
            ? formaterMontant(ligne.commissionAmount) + " DH"
            : "Non défini";
          // Facture + statut de paiement SUR LA MÊME LIGNE que le mois (voir
          // cahier des charges) : plus besoin d'ouvrir un panneau séparé pour
          // savoir si KADOSK a été payé pour ce mois.
          const facture = ligne.invoiceExists
            ? '<button class="kadosk-lien-voir-tout kadosk-bouton-facture-mois" data-mois-facture="' + ligne.month + '" style="background:none; border:none; padding:0; cursor:pointer;">Télécharger PDF</button>'
            : "—";
          return (
            '<tr class="kadosk-ligne-cliquable" data-mois="' + ligne.month + '" style="cursor:pointer;">' +
            "<td>" + libelleMois(ligne.month) + "</td>" +
            "<td>" + formaterMontant(ligne.totalRevenue) + " DH</td>" +
            "<td>" + ligne.transactionCount + "</td>" +
            "<td>" + commission + "</td>" +
            "<td>" + facture + "</td>" +
            "<td>" + badgeStatutPaiement(ligne.commissionPaymentStatus) + "</td>" +
            "</tr>"
          );
        })
        .join("");

      corpsTableCommissionMensuelle.querySelectorAll("tr[data-mois]").forEach((ligne) => {
        ligne.addEventListener("click", () => afficherDetailMois(ligne.getAttribute("data-mois")));
      });
      corpsTableCommissionMensuelle.querySelectorAll("[data-mois-facture]").forEach((bouton) => {
        bouton.addEventListener("click", (evenement) => telechargerFactureDepuisMois(bouton.getAttribute("data-mois-facture"), evenement));
      });
    } catch (erreur) {
      console.error("Erreur chargement suivi commission mensuelle :", erreur);
    }
  }

  if (boutonFermerDetailCommission) {
    boutonFermerDetailCommission.addEventListener("click", () => {
      blocDetailCommissionMois.style.display = "none";
    });
  }

  const corpsTableFinanceDetail = document.getElementById("corpsTableFinanceDetail");
  const etatVideFinanceDetail = document.getElementById("etatVideFinanceDetail");
  const champDateDebutFinanceDetail = document.getElementById("champDateDebutFinanceDetail");
  const champDateFinFinanceDetail = document.getElementById("champDateFinFinanceDetail");
  const boutonFiltrerFinanceDetail = document.getElementById("boutonFiltrerFinanceDetail");
  const boutonReinitialiserFinanceDetail = document.getElementById("boutonReinitialiserFinanceDetail");
  const boutonExporterFinanceDetail = document.getElementById("boutonExporterFinanceDetail");
  const resumeCAPeriode = document.getElementById("resumeCAPeriode");

  const LIBELLES_STATUT_VERSEMENT = {
    "À_DEFINIR_reversement_non_encore_modelise": "En attente (à définir)"
  };

  // Dernière liste chargée (période sélectionnée) - conservée pour l'export
  // Excel, qui exporte exactement ce qui est affiché à l'écran, sans refaire
  // d'appel réseau séparé.
  let derniereListeFinanceDetail = [];

  function rendreResumeCAPeriode(lignes) {
    if (!resumeCAPeriode) return;
    if (!lignes.length) {
      resumeCAPeriode.innerHTML = "";
      return;
    }
    const totalCA = lignes.reduce((somme, l) => somme + (Number(l.montantTTC) || 0), 0);
    const totalCommission = lignes.reduce((somme, l) => somme + (Number(l.montantCommission) || 0), 0);
    const totalNet = lignes.reduce((somme, l) => somme + (Number(l.montantNet) || 0), 0);
    resumeCAPeriode.innerHTML =
      '<div><span style="color:var(--kadosk-texte-clair);">Chiffre d\'affaires (période)</span><br><strong>' + formaterMontant(totalCA) + " DH</strong></div>" +
      '<div><span style="color:var(--kadosk-texte-clair);">Commission KADOSK</span><br><strong>' + formaterMontant(totalCommission) + " DH</strong></div>" +
      '<div><span style="color:var(--kadosk-texte-clair);">Net</span><br><strong>' + formaterMontant(totalNet) + " DH</strong></div>" +
      '<div><span style="color:var(--kadosk-texte-clair);">Commandes</span><br><strong>' + lignes.length + "</strong></div>";
  }

  function exporterFinanceDetailExcel() {
    if (!window.XLSX) {
      alert("Export Excel indisponible pour le moment (bibliothèque non chargée). Merci de réessayer.");
      return;
    }
    const lignes = derniereListeFinanceDetail;
    const donnees = lignes.map((ligne) => ({
      "REF CMD": ligne.orderNumber || "",
      "Montant TTC (DH)": ligne.montantTTC !== null && ligne.montantTTC !== undefined ? ligne.montantTTC : "",
      "Commission KADOSK (DH)": ligne.montantCommission !== null && ligne.montantCommission !== undefined ? ligne.montantCommission : "",
      "Net (DH)": ligne.montantNet !== null && ligne.montantNet !== undefined ? ligne.montantNet : "",
      "Statut versement": LIBELLES_STATUT_VERSEMENT[ligne.statutPaiementKadosk] || ligne.statutPaiementKadosk || "",
      "Date": ligne.createdAt ? new Date(ligne.createdAt).toLocaleDateString("fr-FR") : ""
    }));
    const feuille = XLSX.utils.json_to_sheet(donnees);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Finances");
    const dateDebut = champDateDebutFinanceDetail ? champDateDebutFinanceDetail.value : "";
    const dateFin = champDateFinFinanceDetail ? champDateFinFinanceDetail.value : "";
    const suffixe = dateDebut || dateFin ? "_" + (dateDebut || "debut") + "_a_" + (dateFin || "fin") : "";
    XLSX.writeFile(classeur, "kadosk-finances" + suffixe + ".xlsx");
  }

  async function chargerFinanceDetail() {
    if (!corpsTableFinanceDetail) return;
    const dateDebut = champDateDebutFinanceDetail ? champDateDebutFinanceDetail.value : "";
    const dateFin = champDateFinFinanceDetail ? champDateFinFinanceDetail.value : "";
    try {
      const resultat = await KADOSK_API.getFinanceDetail(dateDebut, dateFin);
      const lignes = resultat.items || [];
      derniereListeFinanceDetail = lignes;
      rendreResumeCAPeriode(lignes);

      if (lignes.length === 0) {
        etatVideFinanceDetail.style.display = "block";
        corpsTableFinanceDetail.innerHTML = "";
        return;
      }
      etatVideFinanceDetail.style.display = "none";

      corpsTableFinanceDetail.innerHTML = lignes
        .map((ligne) => {
          const date = ligne.createdAt ? new Date(ligne.createdAt).toLocaleDateString("fr-FR") : "—";
          const statut = LIBELLES_STATUT_VERSEMENT[ligne.statutPaiementKadosk] || ligne.statutPaiementKadosk || "—";
          return (
            "<tr>" +
            "<td>" + (ligne.orderNumber || "—") + "</td>" +
            "<td>" + (ligne.montantTTC !== null ? formaterMontant(ligne.montantTTC) + " DH" : "—") + "</td>" +
            "<td>" + (ligne.montantCommission !== null && ligne.montantCommission !== undefined ? formaterMontant(ligne.montantCommission) + " DH" : "—") + "</td>" +
            "<td>" + (ligne.montantNet !== null ? formaterMontant(ligne.montantNet) + " DH" : "—") + "</td>" +
            "<td><span class=\"kadosk-badge-attente\">" + statut + "</span></td>" +
            "<td>" + date + "</td>" +
            "</tr>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement détail finance par commande :", erreur);
      corpsTableFinanceDetail.innerHTML = '<tr><td colspan="6">Impossible de charger le détail.</td></tr>';
    }
  }

  const corpsTableFactures = document.getElementById("corpsTableFactures");
  const etatVideFactures = document.getElementById("etatVideFactures");
  const conteneurFactureMensuelle = document.getElementById("conteneurFactureMensuelle");
  const champMoisFacture = document.getElementById("champMoisFacture");
  const champAnneeFacture = document.getElementById("champAnneeFacture");
  const boutonAfficherFacture = document.getElementById("boutonAfficherFacture");

  const NOMS_MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  function remplirSelectMoisFacture() {
    if (!champMoisFacture) return;
    champMoisFacture.innerHTML = NOMS_MOIS_FR
      .map((nom, index) => '<option value="' + (index + 1) + '">' + nom + "</option>")
      .join("");
    const maintenant = new Date();
    champMoisFacture.value = String(maintenant.getMonth() + 1);
    champAnneeFacture.value = String(maintenant.getFullYear());
  }

  async function chargerFacturesGenerees() {
    if (!corpsTableFactures) return;
    try {
      const resultat = await KADOSK_API.getMyMonthlyInvoices();
      const lignes = resultat.items || [];

      if (lignes.length === 0) {
        etatVideFactures.style.display = "block";
        corpsTableFactures.innerHTML = "";
        return;
      }
      etatVideFactures.style.display = "none";

      corpsTableFactures.innerHTML = lignes
        .map((f) => {
          const date = f.generatedAt ? new Date(f.generatedAt).toLocaleDateString("fr-FR") : "—";
          return (
            "<tr>" +
            "<td>" + (f.invoiceNumber || "—") + "</td>" +
            "<td>" + (NOMS_MOIS_FR[f.month - 1] || f.month) + " " + f.year + "</td>" +
            "<td>" + formaterMontant(f.commissionAmount) + " DH</td>" +
            "<td>" + formaterMontant(f.subscriptionAmount) + " DH</td>" +
            "<td>" + formaterMontant(f.totalAmount) + " DH</td>" +
            "<td>" + date + "</td>" +
            "</tr>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement historique factures mensuelles :", erreur);
      corpsTableFactures.innerHTML = '<tr><td colspan="6">Impossible de charger les factures.</td></tr>';
    }
  }

  async function afficherFactureMensuelle() {
    if (!conteneurFactureMensuelle) return;
    const mois = Number(champMoisFacture.value);
    const annee = Number(champAnneeFacture.value);
    conteneurFactureMensuelle.innerHTML = '<div class="kadosk-liste-vide">Chargement…</div>';
    try {
      const facture = await KADOSK_API.getMonthlyInvoice(annee, mois);
      // Lecture seule côté marchand : si l'Admin n'a pas encore émis la
      // facture de ce mois, on ne la génère jamais ici - on l'affiche
      // seulement dès qu'elle existe.
      if (!facture || facture.exists === false) {
        conteneurFactureMensuelle.innerHTML =
          '<div class="kadosk-liste-vide">Facture pas encore disponible pour ce mois. Elle apparaîtra ici une fois émise par KADOSK.</div>';
        return;
      }
      const statutCommission = facture.commissionPaymentStatus === "PAYE" ? "Payée" : "Non payée";
      conteneurFactureMensuelle.innerHTML =
        '<table class="kadosk-table"><thead><tr><th>N° Facture</th><th>Commissions</th><th>Abonnement</th><th>Total Net à payer</th><th>Statut commission</th><th></th></tr></thead>' +
        "<tbody><tr>" +
        "<td>" + (facture.invoiceNumber || "—") + "</td>" +
        "<td>" + formaterMontant(facture.commissionAmount) + " DH</td>" +
        "<td>" + formaterMontant(facture.subscriptionAmount) + " DH</td>" +
        "<td>" + formaterMontant(facture.totalAmount) + " DH</td>" +
        "<td>" + statutCommission + "</td>" +
        '<td><button class="kadosk-lien-voir-tout" style="background:none; border:none; padding:0;" id="boutonTelechargerFactureMensuelle">Télécharger PDF</button></td>' +
        "</tr></tbody></table>";
      document.getElementById("boutonTelechargerFactureMensuelle").addEventListener("click", () => {
        KADOSK_FACTURE_PDF.telecharger(facture);
      });
    } catch (erreur) {
      console.error("Erreur affichage facture mensuelle :", erreur);
      conteneurFactureMensuelle.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger la facture.</div>';
    }
  }

  if (boutonAfficherFacture) {
    boutonAfficherFacture.addEventListener("click", afficherFactureMensuelle);
  }

  if (boutonFiltrerFinanceDetail) {
    boutonFiltrerFinanceDetail.addEventListener("click", chargerFinanceDetail);
  }
  if (boutonReinitialiserFinanceDetail) {
    boutonReinitialiserFinanceDetail.addEventListener("click", () => {
      if (champDateDebutFinanceDetail) champDateDebutFinanceDetail.value = "";
      if (champDateFinFinanceDetail) champDateFinFinanceDetail.value = "";
      chargerFinanceDetail();
    });
  }
  if (boutonExporterFinanceDetail) {
    boutonExporterFinanceDetail.addEventListener("click", exporterFinanceDetailExcel);
  }

  charger();
  chargerCommissionMensuelle();
  chargerFinanceDetail();
  remplirSelectMoisFacture();
  chargerFacturesGenerees();
})();
