// Étape 3 : récapitulatif SIMPLE de la commande (marchand, montant, sous-total,
// total) - aucune coordonnée bancaire ici. Le RIB n'est plus jamais montré à ce
// stade (avant même que l'acheteur ait donné son e-mail) : il n'est désormais
// révélé qu'à l'étape 5, après une connexion par code envoyé par e-mail (voir
// etape5.js et giftCardSecurity.web.js :: getMerchantPaymentInfoBySku). Comme
// toutes les infos affichées ici (nom du marchand, montant, quantité) sont déjà
// connues localement (KADOSK_PANIER2), cette page ne fait plus aucun appel réseau.
(function () {
  const etatVide = document.getElementById("etatVide");
  const etatChargement = document.getElementById("etatChargement");
  const listeRib = document.getElementById("listeRib");
  const blocTotal = document.getElementById("blocTotal");
  const texteTotal = document.getElementById("texteTotal");
  const btnRetour = document.getElementById("btnRetour");
  const btnContinuer = document.getElementById("btnContinuer");

  document.getElementById("k2IconeRetour").innerHTML = window.KADOSK_ICONE("plus");
  document.getElementById("k2IconeContinuer").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeSecurite").innerHTML = window.KADOSK_ICONE("shield-check");

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

  function rendreLogo(logoUrl, nom) {
    return logoUrl
      ? `<img src="${echapperHtml(logoUrl)}" alt="${echapperHtml(nom)}" />`
      : `<span>${echapperHtml((nom || "?").slice(0, 1).toUpperCase())}</span>`;
  }

  function rendreLigne(ligne) {
    const nomAffiche = ligne.businessName || ligne.name || "";
    const quantite = Number(ligne.quantite) || 1;
    const sousTotal = (Number(ligne.montant) || 0) * quantite;
    const div = document.createElement("div");
    div.className = "k2-rib-bloc";
    div.dataset.ligne = ligne.ligneId;
    div.innerHTML = `
      <div class="k2-rib-entete">
        <div class="k2-rib-marchand">
          <div class="k2-rib-marchand-logo">${rendreLogo(ligne.logoUrl, nomAffiche)}</div>
          <span>${echapperHtml(nomAffiche)}</span>
        </div>
        <div class="k2-rib-montant" data-role="sous-total">${formaterMontant(sousTotal)}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <div>
          <p style="font-size:12.5px;color:var(--k2-texte-clair);margin:0 0 4px;">${formaterMontant(ligne.montant)} / carte</p>
          <div class="k2-qte-controle">
            <button type="button" class="k2-btn-rond" data-action="moins" aria-label="Diminuer la quantité">−</button>
            <span data-role="quantite">${quantite}</span>
            <button type="button" class="k2-btn-rond" data-action="plus" aria-label="Augmenter la quantité">+</button>
          </div>
        </div>
        <button type="button" class="k2-btn-supprimer" data-action="supprimer" title="Retirer cet article" aria-label="Retirer cet article">${
          window.KADOSK_ICONE ? window.KADOSK_ICONE("trash-2") : "✕"
        }</button>
      </div>
    `;

    const ligneId = ligne.ligneId;
    const ligneActuelle = () => KADOSK_PANIER2.lire().find((l) => l.ligneId === ligneId);

    div.querySelector('[data-action="moins"]').addEventListener("click", () => {
      const l = ligneActuelle();
      if (!l) return;
      const q = (Number(l.quantite) || 1) - 1;
      if (q < 1) {
        KADOSK_PANIER2.retirerLigne(ligneId);
      } else {
        KADOSK_PANIER2.definirQuantiteLigne(ligneId, q);
      }
      rafraichir();
    });
    div.querySelector('[data-action="plus"]').addEventListener("click", () => {
      const l = ligneActuelle();
      if (!l) return;
      KADOSK_PANIER2.definirQuantiteLigne(ligneId, (Number(l.quantite) || 1) + 1);
      rafraichir();
    });
    div.querySelector('[data-action="supprimer"]').addEventListener("click", () => {
      KADOSK_PANIER2.retirerLigne(ligneId);
      rafraichir();
    });

    return div;
  }

  function rafraichir() {
    listeRib.innerHTML = "";
    charger();
  }

  function charger() {
    const lignes = KADOSK_PANIER2.lire();
    etatChargement.style.display = "none";

    if (lignes.length === 0) {
      etatVide.style.display = "block";
      blocTotal.style.display = "none";
      btnContinuer.disabled = true;
      return;
    }
    etatVide.style.display = "none";
    btnContinuer.disabled = false;
    if (!KADOSK_PANIER2.toutesLignesOntUnMontant()) {
      window.location.href = "commercants.html";
      return;
    }

    lignes.forEach((ligne) => listeRib.appendChild(rendreLigne(ligne)));
    blocTotal.style.display = "flex";
    texteTotal.textContent = formaterMontant(KADOSK_PANIER2.totalGeneral());
  }

  // "Retour" ramène directement au catalogue (boutique-client.html, la page
  // d'accueil) pour ajouter un autre article : le récap ci-dessus permet
  // désormais lui-même de modifier quantité/suppression, plus besoin de
  // repasser par l'ancienne étape 2.
  btnRetour.addEventListener("click", () => {
    window.location.href = "boutique-client.html";
  });
  btnContinuer.addEventListener("click", () => {
    let checkoutId = "";
    try {
      checkoutId = sessionStorage.getItem("kadosk_checkout_id") || "";
      if (!/^[a-f0-9-]{36}$/i.test(checkoutId)) {
        checkoutId = window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              return (c === "x" ? r : (r & 3 | 8)).toString(16);
            });
        sessionStorage.setItem("kadosk_checkout_id", checkoutId);
      }
    } catch (_) {}
    const cheminPublic = "/check-out" + (checkoutId ? "?checkoutId=" + encodeURIComponent(checkoutId) : "");
    let embarque = false;
    try { embarque = window.self !== window.top; } catch (_) { embarque = true; }
    if (embarque) {
      let origine = "https://www.kadosk.com";
      try {
        const candidate = new URL(document.referrer).origin;
        if (candidate === "https://www.kadosk.com" || candidate === "https://kadosk.com") origine = candidate;
      } catch (_) {}
      window.parent.postMessage({ type: "KADOSK_NAVIGATE", path: cheminPublic }, origine);
    } else {
      window.location.href = "etape-4-destinataire.html" + (checkoutId ? "?checkoutId=" + encodeURIComponent(checkoutId) : "");
    }
  });

  charger();
})();
