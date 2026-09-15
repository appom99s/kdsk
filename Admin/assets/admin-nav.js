// Barre latérale Admin, commune à toutes les pages admin-*.html. Construite en
// JS (pas dupliquée en HTML sur chaque page) pour garder un seul endroit à
// modifier si la navigation change - même principe que assets/nav.js côté
// marchand.
const KADOSK_ADMIN_NAV = (function () {
  const ITEMS = [
    { id: "dashboard", href: "admin-dashboard.html", label: "Dashboard" },
    { id: "merchants", href: "admin-merchants.html", label: "Marchands" },
    { id: "orders", href: "admin-orders.html", label: "Commandes" },
    { id: "giftcards", href: "admin-giftcards.html", label: "Gift Cards" },
    { id: "transaction360", href: "admin-transaction-360.html", label: "Transaction 360°" },
    { id: "finance", href: "admin-finance.html", label: "Finance" }
  ];

  function rendre(idActif) {
    const sidebar = document.getElementById("admSidebar");
    if (!sidebar) return;
    const liens = ITEMS.map(
      (item) =>
        `<a class="adm-nav-item${item.id === idActif ? " actif" : ""}" href="${item.href}">${item.label}</a>`
    ).join("");
    sidebar.innerHTML = `
      <div class="adm-sidebar-titre">KAD<span>OSK</span> · Admin</div>
      ${liens}
      <div class="adm-nav-section">Compte</div>
      <a class="adm-nav-item" href="#" id="admLienDeconnexion">Déconnexion</a>
    `;
    const lienDeconnexion = document.getElementById("admLienDeconnexion");
    if (lienDeconnexion) {
      lienDeconnexion.addEventListener("click", (evenement) => {
        evenement.preventDefault();
        KADOSK_AUTH.deconnecter("/Admin/admin-login.html");
      });
    }
  }

  return { rendre };
})();
