(function () {
  KADOSK_ADMIN_NAV.rendre("giftcards");

  const conteneurListe = document.getElementById("conteneurListe");
  const selectStatut = document.getElementById("selectStatut");
  const boutonFiltrer = document.getElementById("boutonFiltrer");

  const modalFond = document.getElementById("modalFond");
  const modalTitre = document.getElementById("modalTitre");
  const modalRaison = document.getElementById("modalRaison");
  const modalErreur = document.getElementById("modalErreur");
  const modalAnnuler = document.getElementById("modalAnnuler");
  const modalConfirmer = document.getElementById("modalConfirmer");

  let actionEnCours = null; // { giftCardId, action }

  function echapperHtml(valeur) {
    return String(valeur || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
    if (statut === "REDEEMED") return "neutre";
    if (statut === "EXPIRED" || statut === "SUSPENDED" || statut === "CANCELLED") return "refuse";
    return "attente";
  }
  function formaterMontant(valeur) {
    if (valeur === null || valeur === undefined || isNaN(Number(valeur))) return "—";
    return Number(valeur).toLocaleString("fr-FR") + " DH";
  }

  const LIBELLES_ACTION = {
    SUSPEND: "Suspendre cette carte",
    REACTIVATE: "Réactiver cette carte",
    CANCEL: "Annuler cette carte"
  };

  // N'affiche que des transitions cohérentes avec l'état actuel (voir
  // TRANSITIONS_STATUT_GIFT_CARD_ADMIN côté backend) : SUSPENDED/CANCELLED n'ont
  // de sens que depuis ACTIVE, REACTIVATE seulement depuis SUSPENDED - jamais
  // d'action proposée sur une carte REDEEMED/EXPIRED/DRAFT.
  function actionsDisponibles(statut) {
    if (statut === "ACTIVE") {
      return [["SUSPEND", "Suspendre"], ["CANCEL", "Annuler"]];
    }
    if (statut === "SUSPENDED") {
      return [["REACTIVATE", "Réactiver"], ["CANCEL", "Annuler"]];
    }
    return [];
  }

  function ouvrirModal(giftCardId, action) {
    actionEnCours = { giftCardId, action };
    modalTitre.textContent = LIBELLES_ACTION[action] || "Confirmer l'action";
    modalRaison.value = "";
    modalErreur.textContent = "";
    modalFond.style.display = "flex";
  }
  function fermerModal() {
    modalFond.style.display = "none";
    actionEnCours = null;
  }
  modalAnnuler.addEventListener("click", fermerModal);

  const LIBELLES_ERREUR_ACTION = {
    RAISON_OBLIGATOIRE: "La raison est obligatoire.",
    TRANSITION_INVALIDE: "Cette carte a changé d'état entre-temps - rechargez la liste.",
    CONCURRENT_MODIFICATION_RETRY: "Un encaissement a eu lieu au même moment - merci de réessayer.",
    GIFT_CARD_NOT_FOUND: "Carte introuvable."
  };

  modalConfirmer.addEventListener("click", async () => {
    if (!actionEnCours) return;
    const raison = modalRaison.value.trim();
    if (!raison) {
      modalErreur.textContent = "La raison est obligatoire.";
      return;
    }
    modalConfirmer.disabled = true;
    try {
      await KADOSK_API.setAdminGiftCardStatus(actionEnCours.giftCardId, actionEnCours.action, raison);
      fermerModal();
      chargerListe();
    } catch (erreur) {
      console.error("Echec changement de statut Gift Card :", erreur);
      modalErreur.textContent = LIBELLES_ERREUR_ACTION[erreur.message] || "Echec de l'action : " + (erreur.message || "erreur inconnue");
    } finally {
      modalConfirmer.disabled = false;
    }
  });

  function rendreListe(items) {
    if (!items.length) {
      conteneurListe.innerHTML = '<div class="adm-vide">Aucune Gift Card trouvée.</div>';
      return;
    }
    // Le code permanent en clair n'est jamais exposé ici (voir audit 6.6) - les
    // montants (initial/restant) sont en revanche déchiffrés côté backend pour
    // la supervision Admin.
    const lignes = items
      .map((c) => {
        const lienDetail = c.orderNumber
          ? `<a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(c.orderNumber)}">${echapperHtml(c.orderNumber)}</a>`
          : "—";
        return `
        <tr>
          <td>${lienDetail}</td>
          <td>${echapperHtml(c.merchantName || c.merchantId)}</td>
          <td><span class="adm-statut ${classeStatut(c.codeStatus)}">${echapperHtml(c.codeStatus)}</span></td>
          <td>${formaterMontant(c.initialBalance)}</td>
          <td>${formaterMontant(c.remainingBalance)}</td>
          <td>${formaterDate(c.expirationDate)}</td>
          <td>${formaterDate(c.createdAt)}</td>
          <td>${actionsDisponibles(c.codeStatus).map(([action, libelle]) => `<a class="adm-lien-action" data-id="${c.id}" data-action="${action}">${libelle}</a>`).join(" &nbsp;·&nbsp; ") || "—"}</td>
        </tr>`;
      })
      .join("");
    conteneurListe.innerHTML = `
      <table class="adm-table">
        <thead><tr><th>REF CMD (détail)</th><th>Marchand</th><th>Statut</th><th>Montant initial</th><th>Solde restant</th><th>Expiration</th><th>Créée le</th><th>Actions</th></tr></thead>
        <tbody>${lignes}</tbody>
      </table>`;
    conteneurListe.querySelectorAll("[data-action]").forEach((lien) => {
      lien.addEventListener("click", () => ouvrirModal(lien.dataset.id, lien.dataset.action));
    });
  }

  async function chargerListe() {
    conteneurListe.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminGiftCards(selectStatut.value, 1);
      rendreListe(resultat.items || []);
    } catch (erreur) {
      console.error("Echec chargement Gift Cards Admin :", erreur);
      conteneurListe.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  boutonFiltrer.addEventListener("click", chargerListe);
  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    chargerListe();
  });
})();
