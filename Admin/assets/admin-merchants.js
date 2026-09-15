(function () {
  KADOSK_ADMIN_NAV.rendre("merchants");

  const conteneurListe = document.getElementById("conteneurListe");
  const champRecherche = document.getElementById("champRecherche");
  const selectStatut = document.getElementById("selectStatut");
  const boutonRechercher = document.getElementById("boutonRechercher");

  const modalFond = document.getElementById("modalFond");
  const modalTitre = document.getElementById("modalTitre");
  const modalRaison = document.getElementById("modalRaison");
  const modalErreur = document.getElementById("modalErreur");
  const modalAnnuler = document.getElementById("modalAnnuler");
  const modalConfirmer = document.getElementById("modalConfirmer");

  let actionEnCours = null; // { merchantId, action }

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function classeStatut(statut) {
    if (statut === "Active" || statut === "Approved") return "ok";
    if (statut === "Rejected" || statut === "Suspended") return "refuse";
    if (statut === "Submitted" || statut === "Under Review" || statut === "PreApproved") return "attente";
    return "neutre";
  }

  const LIBELLES_ACTION = {
    PREAPPROVE: "Approuver le compte et envoyer l’invitation",
    APPROVE: "Valider définitivement le dossier",
    REJECT: "Rejeter ce marchand",
    SUSPEND: "Suspendre ce marchand",
    REACTIVATE: "Réactiver ce marchand"
  };

  function ouvrirModal(merchantId, action) {
    actionEnCours = { merchantId, action };
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

  modalConfirmer.addEventListener("click", async () => {
    if (!actionEnCours) return;
    const raison = modalRaison.value.trim();
    if (!raison) {
      modalErreur.textContent = "La raison est obligatoire.";
      return;
    }
    modalConfirmer.disabled = true;
    try {
      await KADOSK_API.setAdminMerchantStatus(actionEnCours.merchantId, actionEnCours.action, raison);
      fermerModal();
      chargerListe();
    } catch (erreur) {
      console.error("Echec changement de statut marchand :", erreur);
      modalErreur.textContent = "Echec de l'action : " + (erreur.message || "erreur inconnue");
    } finally {
      modalConfirmer.disabled = false;
    }
  });

  function actionsDisponibles(statut) {
    // N'affiche que des transitions cohérentes avec l'état actuel - évite de
    // proposer "Approuver" sur un marchand déjà actif, par exemple.
    if (statut === "Submitted" || statut === "Under Review") {
      return [["PREAPPROVE", "1re approbation"], ["REJECT", "Rejeter"]];
    }
    if (statut === "PreApproved") {
      return [["APPROVE", "2e approbation"], ["REJECT", "Rejeter"]];
    }
    if (statut === "Active" || statut === "Approved") {
      return [["SUSPEND", "Suspendre"]];
    }
    if (statut === "Suspended") {
      return [["REACTIVATE", "Réactiver"]];
    }
    return [];
  }

  function rendreListe(items) {
    if (!items.length) {
      conteneurListe.innerHTML = '<div class="adm-vide">Aucun marchand trouvé.</div>';
      return;
    }
    const lignes = items
      .map((m) => {
        const actions = actionsDisponibles(m.merchantStatus)
          .map(([action, libelle]) => `<a class="adm-lien-action" data-id="${m.id}" data-action="${action}">${libelle}</a>`)
          .join(" &nbsp;·&nbsp; ");
        return `
        <tr>
          <td><a class="adm-lien-action" href="admin-merchant-detail.html?id=${encodeURIComponent(m.id)}">${echapperHtml(m.businessName || m.legalName || "—")}</a></td>
          <td>${echapperHtml(m.city || "—")}</td>
          <td><span class="adm-statut ${classeStatut(m.merchantStatus)}">${echapperHtml(m.merchantStatus || "—")}</span></td>
          <td>${m.adminBlocked ? '<span class="adm-statut refuse">Bloqué</span>' : ""}</td>
          <td>${actions || "—"}</td>
        </tr>`;
      })
      .join("");
    conteneurListe.innerHTML = `
      <table class="adm-table">
        <thead><tr><th>Marchand</th><th>Ville</th><th>Statut</th><th></th><th>Actions</th></tr></thead>
        <tbody>${lignes}</tbody>
      </table>`;
    conteneurListe.querySelectorAll("[data-action]").forEach((lien) => {
      lien.addEventListener("click", () => ouvrirModal(lien.dataset.id, lien.dataset.action));
    });
  }

  async function chargerListe() {
    conteneurListe.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminMerchants(champRecherche.value.trim(), selectStatut.value, 1);
      rendreListe(resultat.items || []);
    } catch (erreur) {
      console.error("Echec chargement marchands :", erreur);
      conteneurListe.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  boutonRechercher.addEventListener("click", chargerListe);
  champRecherche.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") chargerListe();
  });

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    chargerListe();
  });
})();
