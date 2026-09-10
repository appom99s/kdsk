(function () {
  // AUDIT SÉCURITÉ : échappeur HTML local garanti - ne dépend plus de
  // window.KADOSK_ECHAPPER_HTML (défini par nav.js) avec repli silencieux sur "pas
  // d'échappement du tout" si ce script n'était pas chargé ou pas encore exécuté.
  // buyerName/buyerEmail viennent d'une commande créée par un visiteur anonyme non
  // authentifié (placeGiftCardOrder) et sont affichés ici dans le tableau de bord DU
  // MARCHAND, qui contient les jetons OAuth du marchand en localStorage - un nom
  // d'acheteur non échappé y serait un vecteur de vol de session (XSS stocké).
  function echapperHtml(valeur) {
    return String(valeur === null || valeur === undefined ? "" : valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function poserIcone(id, nomIcone, taille) {
    const el = document.getElementById(id);
    if (el && window.KADOSK_ICONES && window.KADOSK_ICONES[nomIcone]) {
      el.innerHTML = window.KADOSK_ICONES[nomIcone];
      el.style.display = "inline-flex";
      if (taille) {
        const svg = el.querySelector("svg");
        if (svg) {
          svg.style.width = taille + "px";
          svg.style.height = taille + "px";
        }
      }
    }
  }

  poserIcone("iconeCA", "finances");
  poserIcone("iconeTransactions", "transactions");
  poserIcone("iconeAttente", "commandes");
  poserIcone("iconeEncours", "cartes");
  poserIcone("iconeScan", "qr", 28);
  poserIcone("iconeManuel", "clavier", 28);
  poserIcone("iconeCoche", "coche", 14);

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  function formaterDeltaPourcentage(aujourdhui, hier) {
    if (!hier) return null;
    const delta = ((aujourdhui - hier) / hier) * 100;
    return Math.round(delta);
  }

  function formaterDateHeure(valeurDate) {
    if (!valeurDate) return "";
    const date = new Date(valeurDate);
    return date.toLocaleDateString("fr-FR") + " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function appliquerStatistiques(stats) {
      document.getElementById("kpiCA").textContent = formaterMontant(stats.revenueToday);
      const deltaCA = formaterDeltaPourcentage(stats.revenueToday, stats.revenueYesterday);
      document.getElementById("kpiCADetail").innerHTML =
        deltaCA === null ? "" : (deltaCA >= 0 ? '<span class="hausse">↑ +' + deltaCA + '% </span>' : "↓ " + deltaCA + "% ") + "vs hier";

      document.getElementById("kpiTransactions").textContent = String(stats.transactionsToday);
      const deltaTx = formaterDeltaPourcentage(stats.transactionsToday, stats.transactionsYesterday);
      document.getElementById("kpiTransactionsDetail").innerHTML =
        deltaTx === null ? "" : (deltaTx >= 0 ? '<span class="hausse">↑ +' + deltaTx + '% </span>' : "↓ " + deltaTx + "% ") + "vs hier";

      document.getElementById("kpiEnAttente").textContent = formaterMontant(stats.pendingOrdersTotal);
      document.getElementById("kpiEnAttenteDetail").textContent =
        stats.pendingOrdersCount + (stats.pendingOrdersCount > 1 ? " commandes" : " commande");

      document.getElementById("kpiEncours").textContent = formaterMontant(stats.activeCardsBalance);
      document.getElementById("kpiEncoursDetail").textContent =
        stats.activeCardsCount + (stats.activeCardsCount > 1 ? " cartes actives" : " carte active");

      document.getElementById("apercuCartesActives").textContent = stats.activeCardsCount;
      document.getElementById("apercuEncours").textContent = formaterMontant(stats.activeCardsBalance) + " DH";
      document.getElementById("apercuCommandes").textContent = stats.pendingOrdersCount;
      document.getElementById("apercuUtilisees").textContent = stats.usedCardsCount || 0;
      document.getElementById("apercuExpirees").textContent = stats.expiredCardsCount || 0;

      renderAlertes(stats);
  }

  // Partage la clé de cache "dashboardStats" avec nav.js (sidebar/entête) : sur
  // dashboard.html, KADOSK_CACHE déduplique automatiquement la requête réseau
  // (voir assets/cache.js, requetesEnCours) - une seule requête part réellement,
  // et les KPI s'affichent instantanément depuis le cache en revenant sur cette
  // page, avant d'être rafraîchis en arrière-plan si besoin.
  function chargerStatistiques() {
    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("dashboardStats", KADOSK_API.getDashboardStats, appliquerStatistiques).catch((erreur) => {
        console.error("Erreur chargement statistiques :", erreur);
      });
    } else {
      KADOSK_API.getDashboardStats().then(appliquerStatistiques).catch((erreur) => {
        console.error("Erreur chargement statistiques :", erreur);
      });
    }
  }

  function renderAlertes(stats) {
    const conteneur = document.getElementById("listeAlertes");
    const alertes = [];

    if (stats.pendingOrdersCount > 0) {
      alertes.push({
        icone: "commandes",
        classe: "orange",
        texte:
          stats.pendingOrdersCount +
          (stats.pendingOrdersCount > 1 ? " commandes nécessitent" : " commande nécessite") +
          " votre traitement",
        lien: "orders.html"
      });
    }

    if (stats.pendingOrdersTotal > 0) {
      alertes.push({
        icone: "commandes",
        classe: "bleu",
        texte: "Votre solde à recevoir est de " + formaterMontant(stats.pendingOrdersTotal) + " DH",
        lien: "orders.html"
      });
    }

    if (alertes.length === 0) {
      conteneur.innerHTML = '<div class="kadosk-liste-vide">Aucune alerte pour le moment — tout est à jour.</div>';
      return;
    }

    conteneur.innerHTML = alertes
      .map(
        (alerte) =>
          '<a class="kadosk-alerte" href="' + alerte.lien + '">' +
          '<span class="kadosk-alerte-icone ' + alerte.classe + '">' + (window.KADOSK_ICONES[alerte.icone] || "") + "</span>" +
          '<span class="kadosk-alerte-texte">' + alerte.texte + "</span>" +
          "</a>"
      )
      .join("");
  }

  async function chargerCommandes() {
    const conteneur = document.getElementById("listeCommandes");
    try {
      const resultat = await KADOSK_API.getDraftOrders();
      const commandes = (resultat.items || []).slice(0, 5);

      if (commandes.length === 0) {
        conteneur.innerHTML = '<div class="kadosk-liste-vide">Aucune commande en attente</div>';
        return;
      }

      conteneur.innerHTML = commandes
        .map((commande) => {
          const initiale = echapperHtml((commande.buyerName || commande.buyerEmail || "?").trim().charAt(0).toUpperCase());
          return (
            '<div class="kadosk-liste-item">' +
            '<div class="kadosk-liste-icone">' + initiale + "</div>" +
            '<div class="kadosk-liste-corps">' +
            '<div class="kadosk-liste-titre">' + echapperHtml(commande.buyerName || commande.buyerEmail || "Client") + "</div>" +
            '<div class="kadosk-liste-sous-titre">' + formaterDateHeure(commande.createdAt) + "</div>" +
            "</div>" +
            '<div class="kadosk-liste-droite">' +
            '<div class="kadosk-liste-montant">' + formaterMontant(commande.initialBalance) + " DH</div>" +
            '<span class="kadosk-badge kadosk-badge-attente">En attente</span>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement commandes :", erreur);
      conteneur.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger les commandes</div>';
    }
  }

  const LIBELLES_ACTION = { REDEEMED: "Encaissement", REDEEM_FAILED: "Échec d'encaissement" };

  async function chargerTransactions() {
    const conteneur = document.getElementById("listeTransactions");
    try {
      const resultat = await KADOSK_API.getRecentTransactions(null, 5);
      const transactions = resultat.items || [];

      if (transactions.length === 0) {
        conteneur.innerHTML = '<div class="kadosk-liste-vide">Aucune transaction pour le moment</div>';
        return;
      }

      conteneur.innerHTML = transactions
        .map((entree) => {
          const codeMasque = window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(entree.giftCardId) : "00***";
          const badge = entree.success
            ? '<span class="kadosk-badge kadosk-badge-actif">Réussie</span>'
            : '<span class="kadosk-badge" style="background:var(--kadosk-danger-tint); color:var(--kadosk-danger);">Refusée</span>';
          return (
            '<div class="kadosk-liste-item">' +
            '<div class="kadosk-liste-icone">' + (window.KADOSK_ICONES.cartes || "") + "</div>" +
            '<div class="kadosk-liste-corps">' +
            '<div class="kadosk-liste-titre">' + (LIBELLES_ACTION[entree.action] || entree.action) + "</div>" +
            '<div class="kadosk-liste-sous-titre">Carte ' + codeMasque + " · " + formaterDateHeure(entree.createdAt) + "</div>" +
            "</div>" +
            '<div class="kadosk-liste-droite">' +
            '<div class="kadosk-liste-montant">' + formaterMontant(entree.amount) + " DH</div>" +
            badge +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement transactions :", erreur);
      conteneur.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger les transactions</div>';
    }
  }

  function construireGraphiqueSVG(points) {
    const largeur = 560;
    const hauteur = 180;
    const paddingBas = 24;
    const paddingHaut = 12;
    const paddingCote = 8;

    const valeurs = points.map((point) => point.total);
    const maxValeur = Math.max(1, Math.max.apply(null, valeurs));
    const zoneUtile = hauteur - paddingBas - paddingHaut;
    const pas = (largeur - paddingCote * 2) / (points.length - 1 || 1);

    const coordonnees = points.map((point, index) => {
      const x = paddingCote + pas * index;
      const y = paddingHaut + zoneUtile - (point.total / maxValeur) * zoneUtile;
      return { x, y, point };
    });

    const chemin = coordonnees.map((coord, index) => (index === 0 ? "M" : "L") + coord.x.toFixed(1) + " " + coord.y.toFixed(1)).join(" ");
    const cheminAire = chemin + " L" + coordonnees[coordonnees.length - 1].x.toFixed(1) + " " + (hauteur - paddingBas) +
      " L" + coordonnees[0].x.toFixed(1) + " " + (hauteur - paddingBas) + " Z";

    const cercles = coordonnees
      .map((coord) => '<circle cx="' + coord.x.toFixed(1) + '" cy="' + coord.y.toFixed(1) + '" r="3.5" fill="#6c4ce0" />')
      .join("");

    const etiquettes = coordonnees
      .map((coord) => {
        const jour = new Date(coord.point.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
        const libelle = jour.charAt(0).toUpperCase() + jour.slice(1).replace(".", "");
        return (
          '<text x="' + coord.x.toFixed(1) + '" y="' + (hauteur - 4) + '" font-size="10" fill="#6b6580" text-anchor="middle">' + libelle + "</text>"
        );
      })
      .join("");

    return (
      '<svg viewBox="0 0 ' + largeur + " " + hauteur + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="degradeCA" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#6c4ce0" stop-opacity="0.18" /><stop offset="100%" stop-color="#6c4ce0" stop-opacity="0" />' +
      "</linearGradient></defs>" +
      '<path d="' + cheminAire + '" fill="url(#degradeCA)" stroke="none" />' +
      '<path d="' + chemin + '" fill="none" stroke="#6c4ce0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />' +
      cercles +
      etiquettes +
      "</svg>"
    );
  }

  async function chargerGraphique() {
    const conteneur = document.getElementById("conteneurGraphique");
    try {
      const resultat = await KADOSK_API.getRevenueChart();
      const points = resultat.items || [];
      conteneur.innerHTML = construireGraphiqueSVG(points);

      const total7j = points.reduce((somme, point) => somme + (point.total || 0), 0);
      document.getElementById("apercuCA7j").textContent = formaterMontant(total7j) + " DH";
    } catch (erreur) {
      console.error("Erreur chargement graphique :", erreur);
      conteneur.innerHTML = '<div class="kadosk-liste-vide">Graphique indisponible</div>';
    }
  }

  chargerStatistiques();
  chargerCommandes();
  chargerTransactions();
  chargerGraphique();
})();
