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

  window.KADOSK_ADMIN_READY = KADOSK_API.getAdminDashboard()
    .then((donnees) => {
      document.dispatchEvent(new CustomEvent("kadosk:admin-ready", { detail: donnees }));
      return donnees;
    })
    .catch((erreur) => {
      console.error("Accès Admin refusé :", erreur);
      if (erreur && (erreur.message === "NOT_ADMIN" || erreur.message === "NOT_AUTHENTICATED")) {
        window.location.href = "admin-login.html";
      } else {
        document.dispatchEvent(new CustomEvent("kadosk:admin-error", { detail: erreur }));
      }
      throw erreur;
    });
})();
