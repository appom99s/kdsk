(function () {
  // Echappement HTML pour toute donnée saisie par un tiers non authentifié (nom/email
  // acheteur venant des commandes publiques, etc.) avant insertion via innerHTML.
  // Ne jamais concaténer une valeur non fiable dans du HTML sans passer par cette fonction.
  function echapperHtml(texte) {
    return String(texte === null || texte === undefined ? "" : texte)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  window.KADOSK_ECHAPPER_HTML = echapperHtml;

  // Icônes SVG minimalistes (trait, currentColor) réutilisées dans la sidebar,
  // les cartes KPI et les alertes pour rester cohérent visuellement.
  const ICONES = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    encaisser:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    commandes:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 7v5l3.3 2"/></svg>',
    transactions:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.2-3.2"/><path d="M20 16H7l3.2 3.2"/></svg>',
    cartes:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h5"/></svg>',
    finances:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="11" width="3.4" height="10"/><rect x="10.3" y="6" width="3.4" height="15"/><rect x="15.6" y="14" width="3.4" height="7"/></svg>',
    entreprise:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="18" rx="1"/><path d="M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01"/><path d="M16 10h4v11h-4"/></svg>',
    parametres:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.9-1.3-2-3.4-2.2.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2a7.6 7.6 0 0 0-2.6 1.5l-2.2-.7-2 3.4L4.6 10a7.5 7.5 0 0 0 0 3l-1.9 1.3 2 3.4 2.2-.7c.76.66 1.64 1.17 2.6 1.5l.5 2h4l.5-2c.96-.33 1.84-.84 2.6-1.5l2.2.7 2-3.4-1.9-1.3z"/></svg>',
    cloche:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 14.5 18 8Z"/><path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2"/></svg>',
    clavier:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>',
    coche:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    croix:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    portefeuille:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-4a2 2 0 1 0 0 4"/></svg>',
    banque:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6"/><path d="M5 10v9M10 10v9M14 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
    aide:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.8"/><path d="M12 17h.01"/></svg>',
    equipe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15 14c2.6 0 5 1.9 5 5.2"/></svg>'
  };

  const GROUPES = [
    {
      titre: null,
      items: [{ fichier: "dashboard.html", libelle: "Dashboard", icone: "dashboard" }]
    },
    {
      titre: "Encaisser",
      items: [{ fichier: "cashier.html", libelle: "Encaisser une carte", icone: "encaisser" }]
    },
    {
      titre: "Commandes",
      items: [{ fichier: "orders.html", libelle: "En attente", icone: "commandes", badge: "pendingOrdersCount" }]
    },
    {
      titre: "Transactions",
      items: [{ fichier: "transactions.html", libelle: "Toutes les transactions", icone: "transactions" }]
    },
    {
      titre: "Cartes cadeaux",
      items: [{ fichier: "gift-cards.html", libelle: "Cartes cadeaux", icone: "cartes" }]
    },
    {
      titre: "Clients",
      items: [{ fichier: "growth.html", libelle: "Clients & croissance", icone: "equipe" }]
    },
    {
      titre: "Finances",
      items: [{ fichier: "finance.html", libelle: "Finances", icone: "finances" }]
    },
    {
      titre: "Paramètres",
      items: [
        { fichier: "business.html", libelle: "Mon entreprise", icone: "entreprise" },
        { fichier: "settings.html", libelle: "Offre carte cadeau", icone: "parametres" },
        { fichier: "invoice-settings.html", libelle: "Personnalisation facture", icone: "finances" },
        { fichier: "equipe.html", libelle: "Équipe", icone: "equipe" }
      ]
    }
  ];

  function pageActuelle() {
    const segments = window.location.pathname.split("/");
    return segments[segments.length - 1] || "dashboard.html";
  }

  // Le caissier voit toute l'architecture de la plateforme afin de comprendre
  // les fonctions disponibles. Les liens non autorisés restent verrouillés et
  // aucune donnée n'est chargée : les contrôles serveur demeurent la référence.
  function filtrerGroupesPourRole(role, permissions) {
    if (role !== "CASHIER") return GROUPES;
    const acces = permissions || {};
    return GROUPES.filter((groupe) => {
      if (groupe.titre === "Encaisser") return true;
      if (groupe.titre === "Commandes") return !!acces.validateOrders;
      if (groupe.titre === "Cartes cadeaux") return !!acces.viewGiftCards;
      return false;
    });
  }

  function pageAutoriseePourCaissier(fichier, permissions) {
    const acces = permissions || {};
    if (fichier === "cashier.html") return true;
    if (fichier === "orders.html") return !!acces.validateOrders;
    if (fichier === "gift-cards.html") return !!acces.viewGiftCards;
    return false;
  }

  function rendreBarreLaterale(conteneurId, role, permissions) {
    const conteneur = document.getElementById(conteneurId || "kadoskSidebar");
    if (!conteneur) return;

    const actuelle = pageActuelle();
    const groupesAffiches = filtrerGroupesPourRole(role, permissions);

    let html =
      '<div class="kadosk-sidebar-logo"><img src="assets/logo.png" alt="KADOSK" /></div>' +
      '<div class="kadosk-sidebar-marchand">' +
      '<div class="kadosk-sidebar-marchand-logo" data-marchand-logo-conteneur>' +
      '<img data-marchand-logo src="" alt="" style="display:none;" />' +
      '<span data-marchand-logo-initiale>M</span>' +
      "</div>" +
      '<div class="kadosk-sidebar-marchand-info">' +
      '<div class="kadosk-sidebar-marchand-nom" data-marchand-nom>Chargement du compte…</div>' +
      '<span class="kadosk-badge-role" data-marchand-role>Accès marchand</span>' +
      '<span class="kadosk-badge-palier" data-marchand-palier style="display:none;"></span>' +
      "</div>" +
      "</div>";

    groupesAffiches.forEach((groupe) => {
      html += '<div class="kadosk-nav-groupe">';
      if (groupe.titre) {
        html += '<p class="kadosk-nav-titre-groupe">' + groupe.titre + "</p>";
      }
      groupe.items.forEach((page) => {
        const verrouille = role === "CASHIER" && !pageAutoriseePourCaissier(page.fichier, permissions);
        const classe = (page.fichier === actuelle ? "kadosk-nav-item actif" : "kadosk-nav-item") + (verrouille ? " kadosk-nav-verrouille" : "");
        const badgeSpan = page.badge ? '<span class="kadosk-nav-badge" data-badge="' + page.badge + '" style="display:none;"></span>' : "";
        html +=
          '<a class="' + classe + '" href="' + page.fichier + '"' + (verrouille ? ' data-acces-verrouille="true" aria-disabled="true" title="Accès réservé au propriétaire"' : '') + '>' +
          (ICONES[page.icone] || "") +
          "<span>" + page.libelle + "</span>" +
          (verrouille ? '<span class="kadosk-nav-cadenas" aria-hidden="true">🔒</span>' : "") +
          badgeSpan +
          "</a>";
      });
      html += "</div>";
    });

    conteneur.innerHTML = html;

    conteneur.querySelectorAll("[data-acces-verrouille]").forEach((lien) => {
      lien.addEventListener("click", (evenement) => {
        evenement.preventDefault();
        const ancien = document.getElementById("kadoskMessageAcces");
        if (ancien) ancien.remove();
        const message = document.createElement("div");
        message.id = "kadoskMessageAcces";
        message.className = "kadosk-toast-acces";
        message.textContent = "Cette rubrique est visible, mais son contenu est réservé au propriétaire.";
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3200);
      });
    });

    initialiserMenuMobile(conteneur);
  }

  // ---------------------------------------------------------------------
  // Menu mobile : la sidebar (toujours présente dans le HTML de chaque page)
  // devient un tiroir hors écran sous ~860px. On ajoute un bouton hamburger
  // dans l'entête et un overlay pour fermer au clic en dehors, sans avoir à
  // toucher chaque page HTML (elles appellent déjà rendreBarreLaterale).
  // ---------------------------------------------------------------------
  function initialiserMenuMobile(sidebar) {
    if (document.getElementById("kadoskBoutonMenu")) return;

    const entete = document.querySelector(".kadosk-entete");
    if (!entete) return;

    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.id = "kadoskBoutonMenu";
    bouton.className = "kadosk-bouton-menu-mobile";
    bouton.setAttribute("aria-label", "Ouvrir le menu");
    bouton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    entete.insertBefore(bouton, entete.firstChild);

    const overlay = document.createElement("div");
    overlay.id = "kadoskSidebarOverlay";
    overlay.className = "kadosk-sidebar-overlay";
    document.body.appendChild(overlay);

    function ouvrirMenu() {
      sidebar.classList.add("ouverte");
      overlay.classList.add("visible");
    }

    function fermerMenu() {
      sidebar.classList.remove("ouverte");
      overlay.classList.remove("visible");
    }

    bouton.addEventListener("click", () => {
      if (sidebar.classList.contains("ouverte")) {
        fermerMenu();
      } else {
        ouvrirMenu();
      }
    });

    overlay.addEventListener("click", fermerMenu);

    sidebar.querySelectorAll("a.kadosk-nav-item").forEach((lien) => {
      lien.addEventListener("click", fermerMenu);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) fermerMenu();
    });
  }

  function initiales(nom) {
    if (!nom) return "M";
    const mots = nom.trim().split(/\s+/).slice(0, 2);
    return mots.map((mot) => mot[0].toUpperCase()).join("") || "M";
  }

  const LIBELLES_PALIER = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };
  const COULEURS_PALIER = { BRONZE: "#a5652d", SILVER: "#8a95a5", GOLD: "#e0b23c" };

  function rendreInfosMarchand(stats) {
    const nom = (stats && stats.merchantName) || "Compte marchand";
    const initialesNom = initiales(nom);

    document.querySelectorAll("[data-marchand-nom]").forEach((el) => {
      el.textContent = nom;
    });
    document.querySelectorAll("[data-marchand-avatar]").forEach((el) => {
      el.textContent = initialesNom;
    });

    const logoUrl = stats && stats.merchantLogoUrl;
    document.querySelectorAll("[data-marchand-logo]").forEach((img) => {
      if (logoUrl) {
        img.src = logoUrl;
        img.style.display = "block";
      } else {
        img.style.display = "none";
      }
    });
    document.querySelectorAll("[data-marchand-logo-initiale]").forEach((span) => {
      span.textContent = initialesNom;
      span.style.display = logoUrl ? "none" : "flex";
    });

    const palier = stats && stats.subscriptionTier;
    document.querySelectorAll("[data-marchand-palier]").forEach((badge) => {
      if (palier && LIBELLES_PALIER[palier]) {
        badge.textContent = LIBELLES_PALIER[palier];
        badge.style.background = COULEURS_PALIER[palier] + "26";
        badge.style.color = COULEURS_PALIER[palier];
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    });

    const abonnementActif = !!(stats && stats.subscriptionActive);
    const nomOffre = (stats && stats.subscriptionPlanName) || (palier && LIBELLES_PALIER[palier]) || "";
    document.querySelectorAll("[data-marchand-abonnement]").forEach((badge) => {
      badge.textContent = abonnementActif
        ? "Abonnement actif" + (nomOffre ? " · " + nomOffre : "")
        : "Abonnement inactif";
      badge.style.color = abonnementActif ? "#14805e" : "#b02a37";
    });
  }

  // Applique les stats (badges "commandes en attente" + infos marchand nom/logo/
  // palier) partout où elles sont utilisées sur la page - sidebar ET entête - en
  // un seul passage sur le document entier plutôt que deux passages scopés à
  // chaque conteneur séparément.
  function appliquerStatsPartagees(stats) {
    document.querySelectorAll("[data-badge]").forEach((badgeEl) => {
      const cle = badgeEl.getAttribute("data-badge");
      const valeur = stats[cle];
      if (valeur) {
        badgeEl.textContent = valeur;
        badgeEl.style.display = badgeEl.classList.contains("kadosk-cloche-badge") ? "flex" : "inline-block";
      } else {
        badgeEl.style.display = "none";
      }
    });
    rendreInfosMarchand(stats);
  }

  let chargementStatsDemarre = false;
  let promesseChromeInfo = null;
  let roleCourant = null;
  let permissionsCourantes = null;

  // Habillage de page (nom/logo/palier marchand) + rôle/permissions de
  // l'appelant, via getMerchantChromeInfo (accessible à OWNER ET CASHIER,
  // contrairement à getDashboardStats qui est verrouillé propriétaire - voir
  // giftCardSecurity.web.js). Doit être appelé et RÉSOLU avant
  // chargerStatsPartagees (données financières, propriétaire uniquement) et
  // avant toute décision de filtrage de nav/redirection (voir guard.js).
  // Renvoie une Promise de {role, permissions} - PARTAGÉE entre tous les
  // appelants (guard.js, et les pages comme orders.js qui ont aussi besoin
  // des permissions pour filtrer leurs propres onglets) : sans ce partage,
  // un appelant arrivant après guard.js mais avant que le réseau ait répondu
  // recevrait un instantané prématuré (role/permissions encore null) au lieu
  // d'attendre la même résolution.
  function chargerChromeInfo() {
    function etatActuel() {
      return { role: roleCourant, permissions: permissionsCourantes };
    }

    if (!window.KADOSK_API || !KADOSK_API.getMerchantChromeInfo) {
      return Promise.resolve(etatActuel());
    }
    if (promesseChromeInfo) {
      return promesseChromeInfo;
    }

    function appliquer(infos) {
      rendreInfosMarchand(infos);
      roleCourant = (infos && infos.role) || null;
      permissionsCourantes = (infos && infos.permissions) || null;
      document.querySelectorAll("[data-marchand-role]").forEach((el) => {
        el.textContent = roleCourant === "CASHIER" ? "Accès caissier" : "Propriétaire";
      });
      // Re-rendu de la sidebar une fois le rôle/les permissions connus, pour
      // filtrer les sections non autorisées (voir filtrerGroupesPourRole).
      rendreBarreLaterale("kadoskSidebar", roleCourant, permissionsCourantes);
      // La cloche (commandes en attente, voir rendreEnteteDroite) appelle
      // listMyDraftGiftCards - verrouillée à la permission "validateOrders"
      // côté backend (voir giftCardSecurity.web.js). Un caissier sans cette
      // permission ne doit même pas voir l'icône (elle échouerait de toute
      // façon, mais on la masque plutôt que de laisser une erreur au clic).
      const cloche = document.getElementById("kadoskCloche");
      if (cloche) {
        const acces = permissionsCourantes || {};
        const autorise = roleCourant !== "CASHIER" || !!acces.validateOrders;
        cloche.style.display = autorise ? "" : "none";
        // Le compteur de commandes en attente (badge cloche + badge sidebar,
        // voir actualiserCommandesEnAttente) est indépendant de
        // chargerStatsPartagees (verrouillée propriétaire, jamais appelée pour
        // un caissier) : sans cet appel ici, un caissier autorisé à valider les
        // commandes ne voyait JAMAIS de badge, même avec des commandes en
        // attente - un des symptômes de "l'icône notification ne marche pas".
        if (autorise) actualiserCommandesEnAttente();
      }
    }

    // Le rôle et les permissions sont des données d'autorisation : jamais de
    // stale-while-revalidate ici. Une valeur en cache permettait à un caissier
    // retiré de conserver temporairement son menu et empêchait la révocation
    // immédiate de prendre effet dans un onglet déjà ouvert.
    const promesse = KADOSK_API.getMerchantChromeInfo()
      .catch(async (erreurChrome) => {
        // Secours strictement Owner : getDashboardStats est protégé côté serveur
        // par exigerProprietaire. Un caissier ne peut donc jamais utiliser ce
        // fallback pour obtenir le menu complet.
        try {
          const statsOwner = await KADOSK_API.getDashboardStats();
          return {
            ...statsOwner,
            role: "OWNER",
            permissions: { validateOrders: true, viewGiftCards: true }
          };
        } catch (erreurOwner) {
          throw erreurChrome;
        }
      })
      .then((infos) => {
        appliquer(infos);
        return infos;
      });

    promesseChromeInfo = promesse.then(
      () => etatActuel(),
      (erreur) => {
        // Un échec ne doit pas coincer les appelants suivants sur une promesse
        // définitivement rejetée (ex. un onglet resterait masqué pour toujours
        // après une erreur réseau passagère) - on réarme pour permettre un
        // nouvel essai au prochain appel.
        promesseChromeInfo = null;
        throw erreur;
      }
    );
    return promesseChromeInfo;
  }

  // À appeler UNE SEULE FOIS par page, après que rendreBarreLaterale ET
  // rendreEnteteDroite ont toutes les deux construit leur DOM (voir guard.js) -
  // remplace les deux appels réseau indépendants et redondants qu'il y avait
  // avant (un par fonction, pour exactement la même donnée) par un seul, mis en
  // cache via KADOSK_CACHE : la sidebar et l'entête s'affichent instantanément
  // avec la dernière valeur connue en changeant de page marchand, pendant qu'une
  // requête en arrière-plan vérifie s'il y a du nouveau (commandes en attente,
  // palier d'abonnement changé, etc.).
  // Données financières (chiffre d'affaires, cartes actives...) réservées au
  // propriétaire - voir getMerchantDashboardStats/exigerProprietaire côté
  // backend. Ne JAMAIS appeler pour un caissier (guard.js s'en assure).
  function chargerStatsPartagees() {
    if (chargementStatsDemarre || !window.KADOSK_API) return;
    if (roleCourant === "CASHIER") return;
    chargementStatsDemarre = true;

    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("dashboardStats", KADOSK_API.getDashboardStats, appliquerStatsPartagees).catch(() => {});
    } else {
      // Garde défensive : si cache.js n'est pas (encore) chargé sur cette page,
      // on retombe simplement sur un appel réseau direct, sans caching.
      KADOSK_API.getDashboardStats().then(appliquerStatsPartagees).catch(() => {});
    }
  }

  // Compteur + liste "commandes en attente" (badge cloche, badge sidebar "En
  // attente", et contenu du panneau cloche) - source UNIQUE : getDraftOrders
  // (verrouillée à la permission "validateOrders", accessible au propriétaire
  // ET au caissier autorisé, contrairement à getDashboardStats qui est
  // verrouillée propriétaire et jamais appelée pour un caissier). Remplace
  // l'ancien chargerNotifications() qui ne s'exécutait qu'UNE SEULE FOIS par
  // chargement de page (variable commandesChargees jamais réinitialisée) : rouvrir
  // le panneau après avoir accepté/refusé une commande affichait donc une liste
  // périmée - un des symptômes de "l'actualisation ne marche pas"/"l'icône
  // notification ne marche pas". Exposée publiquement (voir window.KADOSK_NAV)
  // pour que orders.js puisse forcer un rafraîchissement immédiat après une
  // action d'acceptation/refus, sans attendre une réouverture du panneau.
  let commandesEnAttenteEnCours = false;
  function actualiserCommandesEnAttente() {
    if (!window.KADOSK_API || !KADOSK_API.getDraftOrders) return Promise.resolve();
    if (commandesEnAttenteEnCours) return Promise.resolve();
    commandesEnAttenteEnCours = true;

    return KADOSK_API.getDraftOrders()
      .then((resultat) => {
        const items = resultat.items || [];

        document.querySelectorAll('[data-badge="pendingOrdersCount"]').forEach((badgeEl) => {
          if (items.length) {
            badgeEl.textContent = items.length;
            badgeEl.style.display = badgeEl.classList.contains("kadosk-cloche-badge") ? "flex" : "inline-block";
          } else {
            badgeEl.style.display = "none";
          }
        });

        const liste = document.getElementById("kadoskClocheListe");
        if (liste) {
          const commandesAffichees = items.slice(0, 5);
          if (commandesAffichees.length === 0) {
            liste.innerHTML = '<div class="kadosk-liste-vide">Aucune commande en attente</div>';
          } else {
            liste.innerHTML = commandesAffichees
              .map(
                (commande) =>
                  '<a class="kadosk-cloche-item" href="orders.html">' +
                  '<div class="kadosk-cloche-item-titre">' + echapperHtml(commande.buyerName || commande.buyerEmail || "Client") + "</div>" +
                  '<div class="kadosk-cloche-item-detail">' + formaterMontantNotif(commande.initialBalance) + " DH · " + formaterDateNotif(commande.createdAt) + "</div>" +
                  "</a>"
              )
              .join("");
          }
        }
      })
      .catch((erreur) => {
        console.error("KADOSK_NAV : échec du rafraîchissement des commandes en attente :", erreur);
        const liste = document.getElementById("kadoskClocheListe");
        if (liste && liste.innerHTML.indexOf("Chargement") !== -1) {
          liste.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger les commandes</div>';
        }
      })
      .finally(() => {
        commandesEnAttenteEnCours = false;
      });
  }

  function formaterDateNotif(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR") + " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function formaterMontantNotif(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  function rendreEnteteDroite(conteneurId) {
    const conteneur = document.getElementById(conteneurId || "kadoskEnteteDroite");
    if (!conteneur) return;

    conteneur.innerHTML =
      '<div class="kadosk-cloche" id="kadoskCloche">' + ICONES.cloche +
      '<span class="kadosk-cloche-badge" data-badge="pendingOrdersCount" style="display:none;"></span>' +
      '<div class="kadosk-cloche-panneau" id="kadoskClochePanneau" style="display:none;">' +
      '<div class="kadosk-cloche-entete">Commandes en attente</div>' +
      '<div id="kadoskClocheListe"><div class="kadosk-liste-vide">Chargement…</div></div>' +
      '<a href="orders.html" class="kadosk-cloche-voir-tout">Voir toutes les commandes</a>' +
      "</div>" +
      "</div>" +
      '<div class="kadosk-utilisateur">' +
      '<div class="kadosk-utilisateur-nom">' +
      '<div class="nom" data-marchand-nom>Chargement du compte…</div>' +
      '<div class="role"><span data-marchand-abonnement>Abonnement…</span> · <span id="lienDeconnexion" class="kadosk-lien-deconnexion">Déconnexion</span></div>' +
      "</div>" +
      '<div class="kadosk-avatar" data-marchand-avatar>M</div>' +
      "</div>";

    // Le chargement des stats (badges + infos marchand) partagées entre la sidebar
    // et cette entête est déclenché une seule fois par chargerStatsPartagees(),
    // appelée par guard.js APRÈS que les deux zones existent dans le DOM - voir
    // plus bas. On ne le fait pas ici pour éviter le double appel réseau qu'il y
    // avait avant (une fois par rendreBarreLaterale, une fois par
    // rendreEnteteDroite, pour exactement la même donnée).

    const cloche = document.getElementById("kadoskCloche");
    const panneau = document.getElementById("kadoskClochePanneau");
    const liste = document.getElementById("kadoskClocheListe");

    if (cloche) {
      cloche.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        const estOuvert = panneau.style.display !== "none";
        panneau.style.display = estOuvert ? "none" : "block";
        // Toujours réémettre une requête à l'ouverture (plus de garde "chargé une
        // seule fois") : sinon rouvrir le panneau après avoir traité une commande
        // (voir orders.js) réaffichait la liste périmée du tout premier chargement.
        if (!estOuvert) {
          liste.innerHTML = '<div class="kadosk-liste-vide">Chargement…</div>';
          actualiserCommandesEnAttente();
        }
      });
      panneau.addEventListener("click", (evenement) => evenement.stopPropagation());
      document.addEventListener("click", () => {
        panneau.style.display = "none";
      });
    }

  }

  // Identifiant réduit affiché au marchand à la place du vrai code de la carte
  // (jamais renvoyé par le backend) : ex. "KDSK-A1B2-..." -> "A1***".
  function masquerIdentifiantCarte(giftCardId) {
    const brut = (giftCardId || "").replace(/-/g, "");
    return (brut.slice(0, 2).toUpperCase() || "00") + "***";
  }

  window.KADOSK_ICONES = ICONES;
  window.KADOSK_MASQUER_ID = masquerIdentifiantCarte;
  window.KADOSK_NAV = {
    rendreBarreLaterale,
    rendreEnteteDroite,
    chargerChromeInfo,
    chargerStatsPartagees,
    actualiserCommandesEnAttente
  };
})();
