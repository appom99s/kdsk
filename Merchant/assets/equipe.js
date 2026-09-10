(function () {
  const champNom = document.getElementById("champNomEquipe");
  const champEmail = document.getElementById("champEmailEquipe");
  const champRole = document.getElementById("champRoleEquipe");
  const champPeutValiderCommandes = document.getElementById("champPeutValiderCommandes");
  const champPeutVoirCartes = document.getElementById("champPeutVoirCartes");
  const boutonAjouter = document.getElementById("boutonAjouterEquipe");
  const messageStatut = document.getElementById("messageStatutEquipe");
  const corpsTable = document.getElementById("corpsTableEquipe");
  const etatVide = document.getElementById("etatVideEquipe");

  const modalFond = document.getElementById("modalConfirmerRetrait");
  const boutonAnnulerRetrait = document.getElementById("boutonAnnulerRetrait");
  const boutonConfirmerRetrait = document.getElementById("boutonConfirmerRetrait");

  const echapperHtml = window.KADOSK_ECHAPPER_HTML || ((v) => String(v || ""));

  const LIBELLES_ROLE = { CASHIER: "Caissier" };

  const LIBELLES_ERREUR = {
    INVALID_EMAIL: "Adresse e-mail invalide.",
    INVALID_TEAM_ROLE: "Rôle invalide.",
    NAME_REQUIRED: "Le nom est obligatoire.",
    TEAM_MEMBER_ALREADY_ADDED: "Cette personne fait déjà partie de votre équipe.",
    TEAM_MEMBER_NOT_FOUND: "Membre introuvable.",
    MERCHANT_PLAN_NOT_ACTIVE: "Votre abonnement doit être actif pour gérer votre équipe.",
    CASHIER_PLAN_LIMIT_REACHED: "La limite de caissiers de votre abonnement est atteinte. Passez à la formule supérieure pour ajouter cette personne."
  };

  // Petits badges texte pour la colonne "Accès" du tableau équipe - résume
  // en un coup d'oeil ce que ce caissier a le droit de faire en plus de
  // l'encaissement (toujours inclus, jamais affiché ici pour ne pas alourdir).
  function libellesAcces(u) {
    const acces = [];
    if (u.canValidateOrders) acces.push("Commandes");
    if (u.canViewGiftCards) acces.push("Cartes cadeaux");
    return acces.length ? acces.join(", ") : "Encaissement uniquement";
  }

  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  let idEnCoursDeRetrait = null;

  function rendreTable(items) {
    if (!items.length) {
      corpsTable.innerHTML = "";
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";
    corpsTable.innerHTML = items
      .map(
        (u) => `
      <tr>
        <td>${echapperHtml(u.name || "—")}</td>
        <td>${echapperHtml(u.email)}</td>
        <td>${echapperHtml(LIBELLES_ROLE[u.role] || u.role)}</td>
        <td>${echapperHtml(libellesAcces(u))}</td>
        <td>${formaterDate(u.invitedAt)}</td>
        <td><span class="kadosk-lien-action" data-retirer="${echapperHtml(u.id)}">Retirer</span></td>
      </tr>`
      )
      .join("");

    corpsTable.querySelectorAll("[data-retirer]").forEach((lien) => {
      lien.addEventListener("click", () => {
        idEnCoursDeRetrait = lien.dataset.retirer;
        modalFond.style.display = "flex";
      });
    });
  }

  async function chargerEquipe() {
    try {
      const resultat = await KADOSK_API.getTeamMembers();
      rendreTable(resultat.items || []);
    } catch (erreur) {
      console.error("Erreur chargement équipe :", erreur);
      corpsTable.innerHTML = "";
      etatVide.textContent = "Impossible de charger votre équipe.";
      etatVide.style.display = "block";
    }
  }

  async function chargerQuota() {
    const valeur = document.getElementById("quotaEquipeValeur");
    const detail = document.getElementById("quotaEquipeDetail");
    try {
      const abonnement = await KADOSK_API.getSubscriptionInfo();
      const utilises = Number(abonnement.activeCashiers) || 0;
      const limite = Number(abonnement.cashierLimit) || 0;
      valeur.textContent = utilises + " / " + limite + " caissier" + (limite > 1 ? "s" : "");
      detail.textContent = abonnement.remainingCashierSlots > 0
        ? abonnement.remainingCashierSlots + " place(s) disponible(s)"
        : "Limite atteinte — formule supérieure nécessaire";
      boutonAjouter.disabled = abonnement.remainingCashierSlots <= 0;
    } catch (erreur) {
      valeur.textContent = "Quota indisponible";
      detail.textContent = "Actualisez la page avant d’ajouter un caissier.";
    }
  }

  async function ajouterMembre() {
    messageStatut.style.color = "";
    messageStatut.textContent = "";

    const nom = champNom.value.trim();
    const email = champEmail.value.trim();
    const role = champRole.value;
    if (!nom) {
      messageStatut.textContent = "Le nom est obligatoire.";
      return;
    }
    if (!email) {
      messageStatut.textContent = "L'e-mail est obligatoire.";
      return;
    }

    boutonAjouter.disabled = true;
    try {
      const resultat = await KADOSK_API.inviteTeamMember(
        email,
        role,
        nom,
        champPeutValiderCommandes.checked,
        champPeutVoirCartes.checked
      );
      champNom.value = "";
      champEmail.value = "";
      champPeutValiderCommandes.checked = false;
      champPeutVoirCartes.checked = false;
      messageStatut.style.color = "#1faa6c";
      messageStatut.textContent = resultat && resultat.emailSent
        ? "Caissier ajouté. L’e-mail pour créer son mot de passe a été envoyé."
        : "Caissier ajouté, mais l’e-mail n’a pas pu être envoyé : " + ((resultat && resultat.emailError) || "erreur inconnue") + ".";
      chargerEquipe();
      chargerQuota();
    } catch (erreur) {
      console.error("Erreur ajout membre équipe :", erreur);
      messageStatut.style.color = "";
      messageStatut.textContent = LIBELLES_ERREUR[erreur.message] || "Échec de l'ajout : " + (erreur.message || "erreur inconnue");
    } finally {
      boutonAjouter.disabled = false;
    }
  }

  function fermerModal() {
    modalFond.style.display = "none";
    idEnCoursDeRetrait = null;
  }

  boutonAnnulerRetrait.addEventListener("click", fermerModal);

  boutonConfirmerRetrait.addEventListener("click", async () => {
    if (!idEnCoursDeRetrait) return;
    boutonConfirmerRetrait.disabled = true;
    try {
      await KADOSK_API.removeTeamMember(idEnCoursDeRetrait);
      fermerModal();
      chargerEquipe();
      chargerQuota();
    } catch (erreur) {
      console.error("Erreur retrait membre équipe :", erreur);
      fermerModal();
      messageStatut.style.color = "";
      messageStatut.textContent = LIBELLES_ERREUR[erreur.message] || "Échec du retrait : " + (erreur.message || "erreur inconnue");
    } finally {
      boutonConfirmerRetrait.disabled = false;
    }
  });

  boutonAjouter.addEventListener("click", ajouterMembre);

  chargerEquipe();
  chargerQuota();
})();
