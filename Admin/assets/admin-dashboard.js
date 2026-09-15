(function () {
  KADOSK_ADMIN_NAV.rendre("dashboard");

  const LABELS_SOUS_ROLE = {
    SUPER_ADMIN: "Super Admin",
    FINANCE_ADMIN: "Finance Admin",
    SUPPORT_ADMIN: "Support Admin",
    OPERATIONS_ADMIN: "Operations Admin",
    SECURITY_ADMIN: "Security Admin"
  };

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    const donnees = evenement.detail || {};
    document.getElementById("admBadgeRole").textContent = LABELS_SOUS_ROLE[donnees.subRole] || donnees.subRole || "Admin";
    document.getElementById("kpiMerchants").textContent = donnees.merchantsActifs ?? "—";
    document.getElementById("kpiDisponibles").textContent = (donnees.giftCards && donnees.giftCards.disponibles) ?? "—";
    document.getElementById("kpiUtilisees").textContent = (donnees.giftCards && donnees.giftCards.utilisees) ?? "—";
    document.getElementById("kpiExpirees").textContent = (donnees.giftCards && donnees.giftCards.expirees) ?? "—";
    document.getElementById("kpiTickets").textContent = donnees.ticketsOuverts ?? "—";
    document.getElementById("kpiRemboursements").textContent = donnees.remboursementsEnAttente ?? "—";
    const alertes = donnees.securityAlerts || { items: [] };
    const panneauAlertes = document.getElementById("panneauAlertesSecurite");
    if (panneauAlertes && Array.isArray(alertes.items) && alertes.items.length) {
      panneauAlertes.style.display = "block";
      document.getElementById("compteurAlertesSecurite").textContent = "(" + (alertes.count || alertes.items.length) + ")";
      const corps = document.getElementById("corpsAlertesSecurite");
      corps.innerHTML = "";
      alertes.items.forEach((alerte) => {
        const tr = document.createElement("tr");
        [
          alerte.createdAt ? new Date(alerte.createdAt).toLocaleString("fr-FR") : "—",
          alerte.type || "—",
          alerte.endpoint || "—",
          alerte.ip || "—",
          alerte.deviceId || alerte.userAgent || "—",
          alerte.severity || "—"
        ].forEach((valeur) => {
          const td = document.createElement("td");
          td.textContent = valeur;
          tr.appendChild(td);
        });
        corps.appendChild(tr);
      });
    }
  });

  document.addEventListener("kadosk:admin-error", () => {
    document.querySelector(".adm-main").innerHTML =
      '<div class="adm-vide">Impossible de charger le dashboard. Merci de réessayer.</div>';
  });
})();
