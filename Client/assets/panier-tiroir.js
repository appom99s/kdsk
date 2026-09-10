// Tiroir panier latéral (cart drawer) — composant partagé, utilisé depuis la
// page détail marchand (commercant-detail.html) juste après l'ajout d'une
// carte au panier. Réutilise intégralement KADOSK_PANIER2 (assets/panier2.js) :
// aucun nouvel état, juste un affichage. Les boutons proposent "Finaliser
// l'achat" (-> etape-3-recap.html, qui lit déjà KADOSK_PANIER2.lire() telle
// quelle) ou "Ajouter un autre article" (ferme simplement le tiroir, laisse
// l'utilisateur continuer à naviguer sur la page courante).
(function () {
  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  let fond = null;
  let tiroir = null;
  let corps = null;
  let btnFermer = null;
  let btnFinaliser = null;
  let btnAjouterAutre = null;
  let totalEl = null;

  function construireSiBesoin() {
    if (tiroir) return;

    fond = document.createElement("div");
    fond.className = "k2-tiroir-fond";
    fond.setAttribute("data-tiroir-fond", "");

    tiroir = document.createElement("aside");
    tiroir.className = "k2-tiroir";
    tiroir.setAttribute("role", "dialog");
    tiroir.setAttribute("aria-label", "Mon panier");
    tiroir.innerHTML = `
      <div class="k2-tiroir-entete">
        <h2>Mon panier</h2>
        <button type="button" class="k2-btn-rond" data-tiroir-fermer aria-label="Fermer le panier"><span data-icone-fermer></span></button>
      </div>
      <div class="k2-tiroir-corps" data-tiroir-corps></div>
      <div class="k2-tiroir-pied">
        <div class="k2-tiroir-total">
          <span>Total</span>
          <span class="valeur" data-tiroir-total>0,00 DH</span>
        </div>
        <button type="button" class="k2-btn k2-btn-primaire" data-tiroir-finaliser>Finaliser l'achat</button>
        <button type="button" class="k2-btn k2-btn-secondaire" data-tiroir-autre>Ajouter un autre article</button>
      </div>
    `;

    document.body.appendChild(fond);
    document.body.appendChild(tiroir);

    corps = tiroir.querySelector("[data-tiroir-corps]");
    totalEl = tiroir.querySelector("[data-tiroir-total]");
    btnFermer = tiroir.querySelector("[data-tiroir-fermer]");
    btnFinaliser = tiroir.querySelector("[data-tiroir-finaliser]");
    btnAjouterAutre = tiroir.querySelector("[data-tiroir-autre]");

    if (window.KADOSK_ICONE) {
      tiroir.querySelector("[data-icone-fermer]").innerHTML = window.KADOSK_ICONE("x");
    }

    btnFermer.addEventListener("click", fermer);
    fond.addEventListener("click", fermer);
    document.addEventListener("keydown", (evenement) => {
      if (evenement.key === "Escape") fermer();
    });
    btnFinaliser.addEventListener("click", () => {
      if (!window.KADOSK_NAVIGUER_PUBLIC || !window.KADOSK_NAVIGUER_PUBLIC("/panier")) {
        window.location.href = "etape-3-recap.html";
      }
    });
    btnAjouterAutre.addEventListener("click", fermer);
  }

  function rendreContenu() {
    const lignes = window.KADOSK_PANIER2 ? KADOSK_PANIER2.lire() : [];
    if (lignes.length === 0) {
      corps.innerHTML = `<p style="font-size:13.5px;color:var(--k2-texte-clair);text-align:center;padding:24px 0;">Votre panier est vide.</p>`;
      btnFinaliser.disabled = true;
    } else {
      corps.innerHTML = lignes
        .map((ligne) => {
          const nomAffiche = ligne.businessName || ligne.name || "";
          const logo = ligne.logoUrl
            ? `<img src="${echapperHtml(ligne.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
            : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;
          const quantite = Number(ligne.quantite) || 1;
          const total = (Number(ligne.montant) || 0) * quantite;
          return `
            <div class="k2-tiroir-ligne" data-ligne="${echapperHtml(ligne.ligneId)}">
              <div class="k2-tiroir-ligne-logo">${logo}</div>
              <div class="k2-tiroir-ligne-corps">
                <p class="k2-tiroir-ligne-nom">${echapperHtml(nomAffiche)}</p>
                <p class="k2-tiroir-ligne-meta">${formaterMontant(ligne.montant)} / carte</p>
                <div class="k2-qte-controle">
                  <button type="button" class="k2-btn-rond" data-action="moins" aria-label="Diminuer la quantité">−</button>
                  <span data-role="quantite">${quantite}</span>
                  <button type="button" class="k2-btn-rond" data-action="plus" aria-label="Augmenter la quantité">+</button>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                <div class="k2-tiroir-ligne-montant">${formaterMontant(total)}</div>
                <button type="button" class="k2-btn-supprimer" data-action="supprimer" title="Retirer cet article" aria-label="Retirer cet article">${
                  window.KADOSK_ICONE ? window.KADOSK_ICONE("trash-2") : "✕"
                }</button>
              </div>
            </div>
          `;
        })
        .join("");
      btnFinaliser.disabled = false;

      corps.querySelectorAll("[data-ligne]").forEach((elLigne) => {
        const ligneId = elLigne.dataset.ligne;
        const ligneActuelle = () => KADOSK_PANIER2.lire().find((l) => l.ligneId === ligneId);

        elLigne.querySelector('[data-action="moins"]').addEventListener("click", () => {
          const l = ligneActuelle();
          if (!l) return;
          const q = (Number(l.quantite) || 1) - 1;
          if (q < 1) {
            KADOSK_PANIER2.retirerLigne(ligneId);
          } else {
            KADOSK_PANIER2.definirQuantiteLigne(ligneId, q);
          }
          rendreContenu();
        });
        elLigne.querySelector('[data-action="plus"]').addEventListener("click", () => {
          const l = ligneActuelle();
          if (!l) return;
          KADOSK_PANIER2.definirQuantiteLigne(ligneId, (Number(l.quantite) || 1) + 1);
          rendreContenu();
        });
        elLigne.querySelector('[data-action="supprimer"]').addEventListener("click", () => {
          KADOSK_PANIER2.retirerLigne(ligneId);
          rendreContenu();
        });
      });
    }
    totalEl.textContent = formaterMontant(window.KADOSK_PANIER2 ? KADOSK_PANIER2.totalGeneral() : 0);
  }

  function ouvrir() {
    construireSiBesoin();
    rendreContenu();
    fond.classList.add("ouvert");
    tiroir.classList.add("ouvert");
    document.body.style.overflow = "hidden";
  }

  function fermer() {
    if (!tiroir) return;
    fond.classList.remove("ouvert");
    tiroir.classList.remove("ouvert");
    document.body.style.overflow = "";
  }

  window.KADOSK_TIROIR = { ouvrir, fermer, rafraichir: () => tiroir && rendreContenu() };
})();
