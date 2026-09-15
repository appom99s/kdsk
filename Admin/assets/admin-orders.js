(function () {
  KADOSK_ADMIN_NAV.rendre("orders");

  const conteneurListe = document.getElementById("conteneurListe");
  const selectStatut = document.getElementById("selectStatut");
  const boutonFiltrer = document.getElementById("boutonFiltrer");
  const boutonRelancesAuto = document.getElementById("boutonRelancesAuto");
  const messageRelancesAuto = document.getElementById("messageRelancesAuto");

  function echapperHtml(valeur) {
    return String(valeur || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }
  function classeStatut(statut) {
    if (statut === "ACTIVE") return "ok";
    if (statut === "REFUSED" || statut === "EXPIRED") return "refuse";
    return "attente";
  }

  function rendreListe(items) {
    if (!items.length) {
      conteneurListe.innerHTML = '<div class="adm-vide">Aucune commande trouvée.</div>';
      return;
    }
    const lignes = items
      .map((c) => {
        const boutonRelance =
          c.status === "DRAFT"
            ? `<button class="adm-bouton secondaire adm-bouton-relance" data-order-item-id="${echapperHtml(c.orderItemId)}">Relancer${c.relanceCount ? " (" + c.relanceCount + ")" : ""}</button>`
            : c.relanceCount
              ? `<span style="font-size:12px; color:var(--adm-texte-clair,#888);">${c.relanceCount} relance(s)</span>`
              : "—";
        return `
        <tr>
          <td><a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(c.orderNumber)}">${echapperHtml(c.orderNumber)}</a></td>
          <td>${echapperHtml(c.merchantName)}</td>
          <td>${echapperHtml(c.buyerEmail)}</td>
          <td>${formaterMontant(c.totalAmount)}</td>
          <td><span class="adm-statut ${classeStatut(c.status)}">${echapperHtml(c.status)}</span></td>
          <td>${formaterDate(c.createdAt)}</td>
          <td>${boutonRelance}</td>
        </tr>`;
      })
      .join("");
    conteneurListe.innerHTML = `
      <table class="adm-table">
        <thead><tr><th>REF CMD</th><th>Marchand</th><th>Acheteur</th><th>Montant</th><th>Statut</th><th>Date</th><th>Relance</th></tr></thead>
        <tbody>${lignes}</tbody>
      </table>`;
    conteneurListe.querySelectorAll(".adm-bouton-relance").forEach((bouton) => {
      bouton.addEventListener("click", () => relancer(bouton));
    });
  }

  async function relancer(bouton) {
    const orderItemId = bouton.getAttribute("data-order-item-id");
    bouton.disabled = true;
    bouton.textContent = "Envoi…";
    try {
      await KADOSK_API.relancerCommandeDraft(orderItemId);
      bouton.textContent = "Relance envoyée ✓";
    } catch (erreur) {
      console.error("Echec relance marchand :", erreur);
      const messages = {
        LIGNE_NON_BROUILLON: "Cette ligne n'est plus en brouillon.",
        MERCHANT_EMAIL_MANQUANT: "Ce marchand n'a pas d'email renseigné."
      };
      bouton.textContent = messages[erreur.message] || "Erreur, réessayer";
      bouton.disabled = false;
    }
  }

  async function chargerListe() {
    conteneurListe.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminOrders(selectStatut.value, 1);
      rendreListe(resultat.items || []);
    } catch (erreur) {
      console.error("Echec chargement commandes Admin :", erreur);
      conteneurListe.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  async function lancerRelancesAuto() {
    boutonRelancesAuto.disabled = true;
    messageRelancesAuto.textContent = "Envoi en cours…";
    try {
      const resultat = await KADOSK_API.declencherRelancesAutomatiques();
      messageRelancesAuto.textContent = `${resultat.envoyees} relance(s) envoyée(s) sur ${resultat.traitees} commande(s) éligible(s)${resultat.echecs ? ", " + resultat.echecs + " échec(s)" : ""}.`;
      chargerListe();
    } catch (erreur) {
      console.error("Echec relances automatiques :", erreur);
      messageRelancesAuto.textContent = "Erreur lors du lancement des relances automatiques.";
    } finally {
      boutonRelancesAuto.disabled = false;
    }
  }

  boutonFiltrer.addEventListener("click", chargerListe);
  boutonRelancesAuto.addEventListener("click", lancerRelancesAuto);
  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    chargerListe();
  });
})();
