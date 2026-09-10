(function () {
  "use strict";
  const page = (location.pathname.split("/").pop() || "boutique-client.html").toLowerCase();
  const links = [
    ["boutique-client.html", "house", "Accueil"],
    ["commercants.html", "shopping-bag", "Commerçants"],
    ["mes-commandes.html", "credit-card", "Mes cartes"],
    ["mon-compte.html", "user", "Mon compte"]
  ];
  document.body.classList.add("client-shell");
  const nav = document.createElement("nav");
  nav.className = "client-mobile-nav";
  nav.setAttribute("aria-label", "Navigation principale");
  nav.innerHTML = links.map(([href, icon, label]) => {
    const visuel = window.KADOSK_ICONE ? window.KADOSK_ICONE(icon) : "";
    return `<a href="${href}" class="${page === href ? "is-active" : ""}"><span aria-hidden="true">${visuel}</span><span>${label}</span></a>`;
  }).join("");
  document.body.appendChild(nav);
}());
