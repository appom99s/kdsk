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
  window.KADOSK_ADMIN_READY = verification
    .then((donnees) => {
      try { if (donnees && donnees.subRole) sessionStorage.setItem(CLE_ROLE, donnees.subRole); } catch (_) { /* facultatif */ }
      document.dispatchEvent(new CustomEvent("kadosk:admin-ready", { detail: donnees }));
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
