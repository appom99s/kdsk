// Garde d'accès Admin : à inclure sur CHAQUE page admin-*.html (après
// config.js/auth.js/api.js). Vérifie que le membre Wix connecté a bien une
// entrée AdminUsers côté serveur (voir adminSecurity.web.js ::
// obtenirAdminConfirme) avant d'afficher quoi que ce soit - jamais une
// simple vérification de connexion Wix Member seule, qui ne suffit pas ici
// (un marchand connecté n'est pas forcément Admin).
(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "admin-login.html";
    return;
  }

  // Seul le tableau de bord a besoin des compteurs ; les autres pages ne
  // vérifient que l'identité admin (appel léger), ce qui accélère chaque
  // changement de page. Le sous-rôle mis en cache sert uniquement à
  // l'affichage immédiat du badge : l'accès reste décidé par le serveur.
  const CLE_ROLE = "kadosk_admin_role_affichage";
  const page = window.location.pathname.split("/").pop() || "admin-dashboard.html";
  try {
    const role = sessionStorage.getItem(CLE_ROLE);
    const badge = document.getElementById("admBadgeRole");
    if (role && badge) badge.textContent = role;
  } catch (_) { /* stockage indisponible */ }
  const verification = page === "admin-dashboard.html" ? KADOSK_API.getAdminDashboard() : KADOSK_API.getAdminIdentity();
  // Donnée changée en arrière-plan (api.js) : la page se redessine avec la version
  // à jour, sauf si une fenêtre est ouverte ou qu'une saisie est en cours.
  let dernierDetail = null, saisieEnCours = false, minuterieMaj = null;
  document.addEventListener("input", () => { saisieEnCours = true; }, true);
  document.addEventListener("kadosk:donnees-maj", () => {
    clearTimeout(minuterieMaj);
    minuterieMaj = setTimeout(() => {
      const actif = document.activeElement;
      const modalOuvert = Array.from(document.querySelectorAll(".adm-modal-fond")).some((m) => m.style.display && m.style.display !== "none");
      if (!dernierDetail || saisieEnCours || modalOuvert || document.querySelector("dialog[open]") || (actif && actif.matches && actif.matches("input, select, textarea"))) return;
      document.dispatchEvent(new CustomEvent("kadosk:admin-ready", { detail: dernierDetail }));
    }, 400);
  });
  window.KADOSK_ADMIN_READY = verification
    .then((donnees) => {
      try { if (donnees && donnees.subRole) sessionStorage.setItem(CLE_ROLE, donnees.subRole); } catch (_) { /* facultatif */ }
      dernierDetail = donnees;
      document.dispatchEvent(new CustomEvent("kadosk:admin-ready", { detail: donnees }));
      // Précharge une fois par session les listes des autres pages (affichage immédiat ensuite).
      setTimeout(() => {
        if (!KADOSK_API.precharger) return;
        KADOSK_API.precharger([
          () => KADOSK_API.getAdminMerchants("", "", 1), () => KADOSK_API.getAdminGiftCards("", 1),
          () => KADOSK_API.getAdminFinanceSummary(), () => KADOSK_API.getAdminMerchantsFiltre(),
          () => KADOSK_API.getAdminReconciliation(), () => KADOSK_API.getAdminAutoEntrepreneurSettings()
        ]);
      }, 1200);
      return donnees;
    })
    .catch((erreur) => {
      console.error("Accès Admin refusé :", erreur);
      try { sessionStorage.removeItem(CLE_ROLE); } catch (_) { /* facultatif */ }
      if (erreur && erreur.message === "TWO_FACTOR_REQUIRED") { window.location.href = "admin-2fa.html"; }
      else if (erreur && (erreur.message === "NOT_ADMIN" || erreur.message === "NOT_AUTHENTICATED")) {
        window.location.href = "admin-login.html";
      } else {
        document.dispatchEvent(new CustomEvent("kadosk:admin-error", { detail: erreur }));
      }
      throw erreur;
    });
})();
