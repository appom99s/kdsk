(function () {
  KADOSK_ADMIN_NAV.rendre("transaction360");

  const champRefCmd = document.getElementById("champRefCmd");
  const boutonRechercher = document.getElementById("boutonRechercher");
  const conteneurResultat = document.getElementById("conteneurResultat");

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
      return new Date(valeur).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (erreur) {
      return "—";
    }
  }

  function panneau(titre, contenuHtml) {
    return `<div class="adm-panneau"><h2>${titre}</h2>${contenuHtml}</div>`;
  }

  function rendreResultat(donnees) {
    const commande = donnees.commande || {};
    const blocCommande = panneau(
      "Commande",
      `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13.5px;">
        <div><strong>Acheteur</strong><br>${echapperHtml(commande.buyerEmail)}</div>
        <div><strong>Montant total</strong><br>${formaterMontant(commande.totalAmount)}</div>
        <div><strong>Statut</strong><br><span class="adm-statut ${commande.status === "ACTIVE" ? "ok" : "attente"}">${echapperHtml(commande.status)}</span></div>
        <div><strong>Pour soi-même</strong><br>${commande.forSelf ? "Oui" : "Non"}</div>
        <div><strong>Créée le</strong><br>${formaterDate(commande.createdAt)}</div>
      </div>`
    );

    const lignesHtml = (donnees.lignes || [])
      .map(
        (l) => `
        <tr>
          <td>${echapperHtml(l.businessName)}</td>
          <td><span class="adm-statut ${l.status === "ACTIVE" ? "ok" : "attente"}">${echapperHtml(l.status)}</span></td>
          <td>${l.cardRedeemed ? '<span class="adm-statut neutre">Utilisée</span>' : "—"}</td>
          <td>${l.forSelf ? "Pour soi" : "Cadeau"}</td>
        </tr>`
      )
      .join("") || '<tr><td colspan="4" class="adm-vide">Aucune ligne</td></tr>';
    const blocLignes = panneau(
      "Gift Cards de cette commande",
      `<table class="adm-table"><thead><tr><th>Marchand</th><th>Statut</th><th>Utilisation</th><th>Type</th></tr></thead><tbody>${lignesHtml}</tbody></table>`
    );

    const paiementsHtml = (donnees.paiements || [])
      .map((p) => `<tr><td>${echapperHtml(p.statut)}</td><td>${formaterMontant(p.montant)}</td><td>${echapperHtml(p.reference)}</td></tr>`)
      .join("") || '<tr><td colspan="3" class="adm-vide">Aucun paiement enregistré</td></tr>';
    const blocPaiements = panneau(
      "Paiement",
      `<table class="adm-table"><thead><tr><th>Statut</th><th>Montant</th><th>Référence</th></tr></thead><tbody>${paiementsHtml}</tbody></table>`
    );

    const commissionsHtml = (donnees.commissions || [])
      .map((c) => `<tr><td>${echapperHtml(c.merchantName || c.merchantId)}</td><td>${c.taux ? c.taux + "%" : "—"}</td><td>${formaterMontant(c.montant)}</td></tr>`)
      .join("") || '<tr><td colspan="3" class="adm-vide">Aucune commission enregistrée</td></tr>';
    const blocCommissions = panneau(
      "Commissions",
      `<table class="adm-table"><thead><tr><th>Marchand</th><th>Taux</th><th>Montant</th></tr></thead><tbody>${commissionsHtml}</tbody></table>`
    );

    const remboursementsHtml = (donnees.remboursements || [])
      .map((r) => `<tr><td><span class="adm-statut ${r.statut === "Refunded" ? "ok" : "attente"}">${echapperHtml(r.statut)}</span></td><td>${formaterMontant(r.montant)}</td><td>${echapperHtml(r.raison)}</td></tr>`)
      .join("") || '<tr><td colspan="3" class="adm-vide">Aucune demande de remboursement</td></tr>';
    const blocRemboursements = panneau(
      "Remboursements",
      `<table class="adm-table"><thead><tr><th>Statut</th><th>Montant</th><th>Raison</th></tr></thead><tbody>${remboursementsHtml}</tbody></table>`
    );

    const journalHtml = (donnees.journal || [])
      .map((j) => `<tr><td>${echapperHtml(j.action)}</td><td>${j.success ? '<span class="adm-statut ok">Succès</span>' : '<span class="adm-statut refuse">Echec</span>'}</td><td>${formaterDate(j.createdAt)}</td></tr>`)
      .join("") || '<tr><td colspan="3" class="adm-vide">Aucune entrée de journal</td></tr>';
    const blocJournal = panneau(
      "Journal (GIFT_CARD_LOG)",
      `<table class="adm-table"><thead><tr><th>Action</th><th>Résultat</th><th>Date</th></tr></thead><tbody>${journalHtml}</tbody></table>`
    );

    conteneurResultat.innerHTML = blocCommande + blocLignes + blocPaiements + blocCommissions + blocRemboursements + blocJournal;
  }

  async function rechercher() {
    const refCmd = champRefCmd.value.trim();
    if (!refCmd) return;
    conteneurResultat.innerHTML = '<div class="adm-panneau"><div class="adm-vide">Recherche en cours…</div></div>';
    try {
      const resultat = await KADOSK_API.getAdminTransaction360(refCmd);
      rendreResultat(resultat);
    } catch (erreur) {
      console.error("Echec Transaction 360 :", erreur);
      const messages = {
        ORDER_NOT_FOUND: "Aucune commande trouvée pour cette REF CMD.",
        REF_CMD_REQUISE: "Merci de saisir une REF CMD."
      };
      conteneurResultat.innerHTML =
        '<div class="adm-panneau"><div class="adm-vide">' +
        (messages[erreur.message] || "Erreur de recherche. Merci de réessayer.") +
        "</div></div>";
    }
  }

  boutonRechercher.addEventListener("click", rechercher);
  champRefCmd.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") rechercher();
  });

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    const parametres = new URLSearchParams(window.location.search);
    const refPreselectionnee = parametres.get("ref");
    if (refPreselectionnee) {
      champRefCmd.value = refPreselectionnee;
      rechercher();
    }
  });
})();
