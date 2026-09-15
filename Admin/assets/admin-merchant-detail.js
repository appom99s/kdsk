(function () {
  KADOSK_ADMIN_NAV.rendre("merchants");

  const conteneurDossier = document.getElementById("conteneurDossier");
  const modalFond = document.getElementById("modalFond");
  const modalTitre = document.getElementById("modalTitre");
  const modalRaison = document.getElementById("modalRaison");
  const modalErreur = document.getElementById("modalErreur");
  const modalAnnuler = document.getElementById("modalAnnuler");
  const modalConfirmer = document.getElementById("modalConfirmer");

  const parametres = new URLSearchParams(window.location.search);
  const merchantId = parametres.get("id");

  let actionEnCours = null;

  function echapperHtml(valeur) {
    return String(valeur === undefined || valeur === null ? "" : valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    if (statut === "Active" || statut === "Approved") return "ok";
    if (statut === "Rejected" || statut === "Suspended") return "refuse";
    if (statut === "Submitted" || statut === "Under Review" || statut === "PreApproved") return "attente";
    return "neutre";
  }
  function champ(label, valeur) {
    return `<div><strong>${label}</strong><br>${echapperHtml(valeur) || "—"}</div>`;
  }
  function panneau(titre, contenuHtml) {
    return `<div class="adm-panneau"><h2>${titre}</h2>${contenuHtml}</div>`;
  }
  function grille(champsHtml) {
    return `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:13.5px;">${champsHtml.join("")}</div>`;
  }

  const LIBELLES_ACTION = {
    PREAPPROVE: "Approuver le compte et envoyer l’invitation",
    APPROVE: "Valider définitivement le dossier",
    REJECT: "Rejeter ce marchand",
    SUSPEND: "Suspendre ce marchand",
    REACTIVATE: "Réactiver ce marchand"
  };

  function actionsDisponibles(statut) {
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

  function ouvrirModal(action) {
    actionEnCours = action;
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
      await KADOSK_API.setAdminMerchantStatus(merchantId, actionEnCours, raison);
      fermerModal();
      charger();
    } catch (erreur) {
      console.error("Echec changement de statut marchand :", erreur);
      modalErreur.textContent = "Echec de l'action : " + (erreur.message || "erreur inconnue");
    } finally {
      modalConfirmer.disabled = false;
    }
  });

  function rendreDossier(m) {
    const actions = actionsDisponibles(m.merchantStatus)
      .map(([action, libelle]) => `<button class="adm-bouton${action === "REJECT" || action === "SUSPEND" ? " secondaire" : ""}" data-action="${action}">${libelle}</button>`)
      .join(" ");

    const entete = `
      <div class="adm-panneau" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${m.logoUrl ? `<img src="${echapperHtml(m.logoUrl)}" alt="" style="width:48px; height:48px; border-radius:8px; object-fit:cover;">` : ""}
          <div>
            <div style="font-size:17px; font-weight:600;">${echapperHtml(m.businessName || m.legalName || "—")}</div>
            <div style="margin-top:4px;">
              <span class="adm-statut ${classeStatut(m.merchantStatus)}">${echapperHtml(m.merchantStatus || "—")}</span>
              ${m.adminBlocked ? ' <span class="adm-statut refuse">Bloqué</span>' : ""}
              ${m.adhesionStatus ? ` <span class="adm-statut neutre">Réseau KADOSK : ${echapperHtml(m.adhesionStatus)}</span>` : ""}
            </div>
          </div>
        </div>
        <div>${actions || ""}</div>
      </div>`;

    const alertes = [];
    if (m.rejectionReason) alertes.push(`<div class="adm-message-erreur">Motif de rejet : ${echapperHtml(m.rejectionReason)}</div>`);
    if (m.actionRequiredMessage) alertes.push(`<div class="adm-message-erreur">Action requise : ${echapperHtml(m.actionRequiredMessage)}</div>`);
    const blocAlertes = alertes.length ? panneau("Alertes", alertes.join("")) : "";

    const blocIdentite = panneau(
      "Identité légale",
      grille([
        champ("Raison sociale", m.legalName),
        champ("Nom commercial", m.businessName),
        champ("Forme juridique", m.legalForm),
        champ("ICE", m.ice),
        champ("RC", m.rc),
        champ("IF", m.ifNumber),
        champ("Taxe professionnelle", m.tp),
        champ("CNSS", m.cnss),
        champ("Date de création", formaterDate(m.companyCreationDate)),
        champ("Soumis le", formaterDate(m.submittedAt))
      ])
    );

    const blocRepresentant = panneau(
      "Représentant",
      grille([
        champ("Nom", (m.representativeFirstName || "") + " " + (m.representativeName || "")),
        champ("Fonction", m.representativePosition),
        champ("Téléphone", m.representativePhone),
        champ("Email", m.representativeEmail),
        champ("Date de naissance", formaterDate(m.representativeBirthDate)),
        champ("Pièce d'identité", (m.identityDocumentType || "—") + (m.identityDocumentNumber ? " · " + m.identityDocumentNumber : ""))
      ])
    );

    const blocAdresse = panneau(
      "Adresse & activité",
      grille([
        champ("Adresse", m.address),
        champ("Ville", m.city),
        champ("Région", m.region),
        champ("Pays", m.country),
        champ("Domaine d'activité", m.activityCategory),
        champ("Sous-catégorie", m.activitySubCategory),
        champ("Produits / services", m.productsServices),
        champ("Site web", m.website),
        champ("Instagram", m.instagram),
        champ("Facebook", m.facebook)
      ])
    );

    const blocOffre = panneau(
      "Offre Gift Card proposée",
      grille([
        champ("Types de cartes", Array.isArray(m.giftCardTypes) ? m.giftCardTypes.join(", ") : m.giftCardTypes),
        champ("Montants proposés", Array.isArray(m.proposedAmounts) ? m.proposedAmounts.join(", ") : m.proposedAmounts),
        champ("Montant personnalisé autorisé", m.customAmountAllowed ? "Oui" : "Non"),
        champ("Utilisation partielle autorisée", m.partialUsageAllowed ? "Oui" : "Non"),
        champ("Utilisable", m.usageLocation),
        champ("Nombre d'établissements", m.locationsCount),
        champ("Durée de validité souhaitée", m.validityPeriod)
      ])
    );

    const blocConformite = panneau(
      "Conformité",
      grille([
        champ("Exactitude certifiée", m.certifiedAccurate ? "Oui" : "Non"),
        champ("Conditions partenariat acceptées", m.acceptedPartnershipTerms ? "Oui" : "Non"),
        champ("Accepté le", formaterDate(m.acceptedAt))
      ])
    );

    const documentLien = (url, libelle) => {
      try {
        const propre = new URL(url);
        if (propre.protocol !== "https:") return "Lien invalide";
        return `<a href="${echapperHtml(propre.href)}" target="_blank" rel="noopener">Ouvrir ${libelle}</a>`;
      } catch (e) { return "Manquant"; }
    };
    const blocDocuments = panneau(
      "Documents de validation",
      grille([
        `<div><strong>RC</strong><br>${documentLien(m.documentRcUrl, "le document")}</div>`,
        `<div><strong>Pièce d'identité</strong><br>${documentLien(m.documentIdentityUrl, "le document")}</div>`,
        `<div><strong>Attestation RIB</strong><br>${documentLien(m.documentRibUrl, "le document")}</div>`
      ])
    );

    const blocRib = panneau(
      "Coordonnées bancaires (RIB)",
      grille([
        champ("Titulaire", m.ribHolderName),
        champ("Banque", m.bankName),
        champ("RIB", m.rib),
        champ("Statut RIB", m.ribStatus)
      ])
    );

    const utilisateursHtml = (m.utilisateurs || [])
      .map((u) => `<tr><td>${echapperHtml(u.role)}</td><td><span class="adm-statut ${u.status === "Active" ? "ok" : "attente"}">${echapperHtml(u.status)}</span></td></tr>`)
      .join("") || '<tr><td colspan="2" class="adm-vide">Aucun utilisateur secondaire</td></tr>';
    const blocUtilisateurs = panneau(
      "Utilisateurs marchand (Owner/Manager/Cashier)",
      `<table class="adm-table"><thead><tr><th>Rôle</th><th>Statut</th></tr></thead><tbody>${utilisateursHtml}</tbody></table>`
    );

    const blocActivite = panneau(
      "Activité",
      grille([
        champ("Commandes récentes (10 derniers jours affichés)", m.commandesRecentes),
        champ("Contrat en cours", m.contrat ? formaterDate(m.contrat.DateEcheance) : "Aucun")
      ])
    );

    // Champs sensibles (RIB/pièce d'identité) présents uniquement si le
    // sous-rôle appelant est Operations/Super Admin - voir dossierComplet côté
    // backend (getMerchantDetailAdmin). Absents pour Support/Finance.
    const dossierComplet = m.rc !== undefined;

    conteneurDossier.innerHTML =
      entete +
      blocAlertes +
      blocIdentite +
      blocRepresentant +
      blocAdresse +
      blocOffre +
      (dossierComplet ? blocConformite + blocDocuments + blocRib : "") +
      blocUtilisateurs +
      blocActivite;

    conteneurDossier.querySelectorAll("[data-action]").forEach((bouton) => {
      bouton.addEventListener("click", () => ouvrirModal(bouton.dataset.action));
    });
  }

  async function charger() {
    if (!merchantId) {
      conteneurDossier.innerHTML = '<div class="adm-panneau"><div class="adm-vide">Aucun marchand sélectionné.</div></div>';
      return;
    }
    conteneurDossier.innerHTML = '<div class="adm-panneau"><div class="adm-vide">Chargement…</div></div>';
    try {
      const m = await KADOSK_API.getAdminMerchantDetail(merchantId);
      rendreDossier(m);
    } catch (erreur) {
      console.error("Echec chargement dossier marchand :", erreur);
      conteneurDossier.innerHTML = '<div class="adm-panneau"><div class="adm-vide">Erreur de chargement. Merci de réessayer.</div></div>';
    }
  }

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    charger();
  });
})();
