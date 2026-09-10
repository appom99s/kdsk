(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  // Menu minimal sûr pendant la résolution : visible pour Owner et Cashier,
  // sans exposer les rubriques réservées. chargerChromeInfo le remplace ensuite
  // par le menu complet Owner ou le menu filtré Cashier.
  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar", "CASHIER", {});
  KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");

  // ---------------------------------------------------------------------
  // Rôle + habillage marchand (nom/logo/palier), résolus AVANT toute autre
  // donnée : détermine si la page en cours est autorisée pour ce rôle
  // (caissier = encaissement uniquement, voir nav.js/filtrerGroupesPourRole)
  // et sert de vérification d'accès - un membre d'équipe retiré, à l'email
  // Wix non vérifié, ou sans rôle marchand assigné, ne doit avoir accès à
  // AUCUNE page (voir obtenirMarchandConfirme côté backend) : on le
  // déconnecte immédiatement plutôt que de laisser une page à moitié
  // fonctionnelle s'afficher.
  // ---------------------------------------------------------------------
  const PAGE_CASHIER = "cashier.html";
  // Base (toujours autorisée pour un caissier) : cashier.html (encaissement +
  // historique de ses propres transactions). Au-delà, chaque page n'est
  // accessible que si l'owner a coché la permission correspondante pour CE
  // caissier précis (checkboxes équipe.html) - voir permissions.validateOrders/
  // viewGiftCards renvoyées par getMerchantChromeInfo. Toute autre page
  // (dashboard, transactions, finance, business, settings, équipe...) reste
  // strictement réservée au propriétaire.
  const ACCES_CASHIER_PAR_PAGE = {
    "cashier.html": () => true,
    "orders.html": (permissions) => !!(permissions && permissions.validateOrders),
    "gift-cards.html": (permissions) => !!(permissions && permissions.viewGiftCards)
  };
  const ERREURS_ACCES_REVOQUE = [
    "EMAIL_NON_VERIFIE",
    "MERCHANT_NOT_FOUND",
    "MERCHANT_ROLE_NOT_ASSIGNED",
    "MERCHANT_PLAN_NOT_ACTIVE",
    "MERCHANT_ACCOUNT_BLOCKED",
    "MERCHANT_NOT_AUTHORIZED",
    "NOT_AUTHENTICATED",
    "SESSION_EXPIREE"
  ];

  KADOSK_NAV.chargerChromeInfo()
    .then(({ role, permissions }) => {
      if (role === "CASHIER") {
        const pageEnCours = window.location.pathname.split("/").pop() || "dashboard.html";
        const verificateur = ACCES_CASHIER_PAR_PAGE[pageEnCours];
        const autorise = !!(verificateur && verificateur(permissions));
        if (!autorise) {
          window.location.href = PAGE_CASHIER;
          return;
        }
      } else {
        // Données financières (chiffre d'affaires, cartes actives...) :
        // uniquement pour le propriétaire, jamais pour un caissier.
        KADOSK_NAV.chargerStatsPartagees();
      }
    })
    .catch((erreur) => {
      console.error("Chargement rôle/habillage marchand échoué :", erreur);
      const sidebar = document.getElementById("kadoskSidebar");
      if (sidebar) {
        const diagnostic = document.createElement("div");
        diagnostic.className = "kadosk-toast-acces";
        diagnostic.style.cssText = "position:static;margin:14px;color:#fff;background:#8a2530;";
        diagnostic.textContent = "Identification du compte impossible (" + ((erreur && (erreur.detail || erreur.message)) || "erreur") + "). Reconnexion nécessaire.";
        sidebar.appendChild(diagnostic);
      }
      if (erreur && ERREURS_ACCES_REVOQUE.includes(erreur.message)) {
        KADOSK_AUTH.deconnecter();
      }
    });

  // Ferme aussi un onglet déjà ouvert lorsqu'un Owner retire le caissier depuis
  // un autre appareil. Les endpoints sont déjà protégés côté serveur ; ce contrôle
  // périodique retire en plus immédiatement l'interface et les données affichées.
  setInterval(async () => {
    try {
      await KADOSK_API.getMerchantChromeInfo();
    } catch (erreur) {
      if (erreur && ERREURS_ACCES_REVOQUE.includes(erreur.message)) {
        KADOSK_AUTH.deconnecter();
      }
    }
  }, 30000);

  const lienDeconnexion = document.getElementById("lienDeconnexion");
  if (lienDeconnexion) {
    lienDeconnexion.addEventListener("click", () => {
      KADOSK_AUTH.deconnecter();
    });
  }

  // ---------------------------------------------------------------------
  // Déconnexion automatique après inactivité, gardée uniquement en mémoire.
  // ---------------------------------------------------------------------
  const IDLE_TIMEOUT_MINUTES = 20;
  let derniereActivite = Date.now();

  function enregistrerActivite() {
    derniereActivite = Date.now();
  }

  function inactifDepuisTropLongtemps() {
    return Date.now() - derniereActivite > IDLE_TIMEOUT_MINUTES * 60000;
  }

  enregistrerActivite();
  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach((evenement) => {
    window.addEventListener(evenement, enregistrerActivite, { passive: true });
  });

  setInterval(() => {
    if (inactifDepuisTropLongtemps()) {
      KADOSK_AUTH.deconnecter();
    }
  }, 30000);

  // ---------------------------------------------------------------------
  // Double authentification (2FA) : le serveur ne redemande un nouveau code
  // (ou la biométrie) que tous les 15 jours, pas à chaque connexion (voir
  // verifierBesoin2FA côté backend). Une fois vérifiée pour cette session
  // (marqueur sessionStorage posé par login-callback.html ou two-factor.html),
  // on ne rappelle plus le serveur à chaque changement de page — seul le tout
  // premier chargement de page après une connexion fait l'appel réseau.
  // ---------------------------------------------------------------------
  const PAGES_SANS_VERIF_2FA = ["two-factor.html", "login.html", "login-callback.html"];
  const pageActuelle = window.location.pathname.split("/").pop() || "dashboard.html";

  if (!PAGES_SANS_VERIF_2FA.includes(pageActuelle) && window.KADOSK_API) {
    if (!KADOSK_AUTH.verification2FAEffectuee()) {
      KADOSK_API.need2FA()
        .then((etat) => {
          if (etat && (etat.enrollmentRequired || (etat.enabled && etat.required))) {
            window.location.href = "two-factor.html?retour=" + encodeURIComponent(pageActuelle);
          } else {
            // 2FA non exigée : on marque la session comme vérifiée pour éviter
            // de rappeler le serveur à chaque page tant que la session dure.
            KADOSK_AUTH.marquerVerification2FA();
          }
        })
        .catch((erreur) => {
          console.error("Vérification 2FA indisponible :", erreur);
        });
    }
  }
})();
