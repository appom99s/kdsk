(function () {
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const grille = document.getElementById("grilleFavoris");
  const texteNombreFavoris = document.getElementById("texteNombreFavoris");

  document.getElementById("k2IconeCoeurVide").innerHTML = window.KADOSK_ICONE("heart");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function rendreCarte(marchand) {
    const div = document.createElement("div");
    div.className = "k2-carte-select";
    div.style.cursor = "default";
    const nomAffiche = marchand.businessName || marchand.name || "";
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
      : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;

    div.innerHTML = `
      <button type="button" class="k2-favori-btn actif" data-retirer>${window.KADOSK_ICONE("heart")}</button>
      <a href="commercant-detail.html?merchantId=${encodeURIComponent(marchand.merchantId)}" style="display:contents;">
        <div class="k2-carte-select-logo">${logo}</div>
        <div class="k2-carte-select-nom">${echapperHtml(nomAffiche)}</div>
        ${marchand.name && marchand.name !== nomAffiche ? `<div class="k2-carte-select-entreprise">${echapperHtml(marchand.name)}</div>` : ""}
        <div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || "")}</div>
      </a>
      <button type="button" class="k2-btn k2-btn-secondaire" data-ajouter-panier style="width:100%; padding:8px; font-size:12.5px; margin-top:4px;">
        Ajouter au panier
      </button>
    `;

    div.querySelector("[data-retirer]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      KADOSK_FAVORIS.retirer(marchand.merchantId);
      div.remove();
      majCompteur();
    });

    div.querySelector("[data-ajouter-panier]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      // Le montant et la quantité sont choisis sur la fiche du commerçant avant
      // toute écriture dans le panier; aucune ligne incomplète n'est créée ici.
      window.location.href = "commercant-detail.html?merchantId=" + encodeURIComponent(marchand.merchantId);
    });

    return div;
  }

  function majCompteur() {
    texteNombreFavoris.textContent = String(grille.children.length);
    if (grille.children.length === 0) {
      etatVide.style.display = "block";
    }
  }

  async function charger() {
    const idsFavoris = KADOSK_FAVORIS.lire();
    etatChargement.style.display = "none";

    if (idsFavoris.length === 0) {
      etatVide.style.display = "block";
      return;
    }

    const appliquerCatalogue = (resultat) => {
      grille.innerHTML = "";
      const marchands = (resultat.items || []).filter((m) => idsFavoris.includes(m.merchantId));

      if (marchands.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      marchands.forEach((m) => grille.appendChild(rendreCarte(m)));
      etatVide.style.display = "none";
      majCompteur();
    };

    try {
      if (window.KADOSK_CACHE) await KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue);
      else appliquerCatalogue(await KADOSK_API.getActiveMerchants());
    } catch (erreur) {
      console.error("Erreur chargement favoris :", erreur);
      etatVide.style.display = "block";
    }
  }

  charger();
})();
