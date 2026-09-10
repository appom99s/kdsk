// Bibliothèque de design partagée pour la carte cadeau : couleur d'accent (libre,
// hex, ou presets historiques), motif de fond ("vecteur"), police, icône
// d'activité. Un seul jeu de données/rendu, réutilisé par settings.html (aperçu
// éditeur), boutique.js (vignette catalogue) et carte-cadeau-pdf.js (certificat
// PDF, via rastérisation canvas des mêmes SVG - voir svgVersDataUrlPng ci-dessous).
// Doit rester synchronisé avec les listes normaliserCouleurCarte/MOTIFS_CARTE_VALIDES/
// POLICES_CARTE_VALIDES/ICONES_ACTIVITE_VALIDES côté backend (giftCardSecurity.web.js) -
// toute clé ajoutée ici doit l'être aussi côté serveur, et inversement.
window.KADOSK_CARTE_VISUELLE = (function () {
  // --- Couleur d'accent -----------------------------------------------------
  // Presets historiques (mêmes valeurs que assets/style.css --kadosk-teal/violet/
  // orange/bleu/rose et .kadosk-carte-apercu[data-accent=...]) + couleur libre hex.
  const PRESETS_ACCENT = {
    teal: { base: "#8ab6a9", fonce: "#4f7a6c" },
    violet: { base: "#6c4ce0", fonce: "#4b2fb3" },
    orange: { base: "#f5a623", fonce: "#b06b00" },
    bleu: { base: "#2f80ed", fonce: "#1f5fc0" },
    rose: { base: "#e0629c", fonce: "#a83f74" }
  };
  const REGEX_HEX = /^#[0-9a-f]{6}$/i;

  function hexVersRgb(hex) {
    const v = hex.replace("#", "");
    return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
  }
  function rgbVersHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }
  function assombrirHex(hex, facteur) {
    const { r, g, b } = hexVersRgb(hex);
    return rgbVersHex(r * (1 - facteur), g * (1 - facteur), b * (1 - facteur));
  }

  // Renvoie {base, fonce} en hex, quelle que soit la valeur reçue (preset connu,
  // hex libre, ou vide/inconnue -> repli sur "teal").
  function resoudreAccent(valeur) {
    const v = String(valeur || "").trim().toLowerCase();
    if (PRESETS_ACCENT[v]) return PRESETS_ACCENT[v];
    if (REGEX_HEX.test(v)) return { base: v, fonce: assombrirHex(v, 0.32) };
    return PRESETS_ACCENT.teal;
  }

  // --- Motifs de fond ("vecteur") --------------------------------------------
  // Chaque motif est une fonction (couleurHex, opacite) -> balisage SVG <pattern>
  // interne, prêt à être injecté comme fond plein-cadre (viewBox 0 0 300 200,
  // proportions 3:2 = celles de .kadosk-carte-apercu).
  const MOTIFS = {
    aucun: () => "",
    points: (c, o) => `
      <pattern id="p" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="2.4" fill="${c}" opacity="${o}"/>
      </pattern>`,
    vagues: (c, o) => `
      <pattern id="p" width="60" height="24" patternUnits="userSpaceOnUse">
        <path d="M0 12 Q15 0 30 12 T60 12" fill="none" stroke="${c}" stroke-width="2.4" opacity="${o}"/>
      </pattern>`,
    diagonales: (c, o) => `
      <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect x="0" y="0" width="6" height="18" fill="${c}" opacity="${o}"/>
      </pattern>`,
    cercles: (c, o) => `
      <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="24" cy="24" r="18" fill="none" stroke="${c}" stroke-width="2" opacity="${o}"/>
        <circle cx="24" cy="24" r="9" fill="none" stroke="${c}" stroke-width="2" opacity="${o}"/>
      </pattern>`,
    losanges: (c, o) => `
      <pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="none" stroke="${c}" stroke-width="2" opacity="${o}"/>
      </pattern>`,
    grille: (c, o) => `
      <pattern id="p" width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M22 0 L0 0 L0 22" fill="none" stroke="${c}" stroke-width="1.4" opacity="${o}"/>
      </pattern>`,
    confettis: (c, o) => `
      <pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="8" r="2" fill="${c}" opacity="${o}"/>
        <rect x="22" y="4" width="5" height="5" fill="${c}" opacity="${o}" transform="rotate(20 24.5 6.5)"/>
        <path d="M14 26 L18 34 L10 34 Z" fill="${c}" opacity="${o}"/>
        <circle cx="33" cy="24" r="1.6" fill="${c}" opacity="${o}"/>
      </pattern>`
  };
  const LIBELLES_MOTIF = {
    aucun: "Aucun",
    points: "Points",
    vagues: "Vagues",
    diagonales: "Diagonales",
    cercles: "Cercles",
    losanges: "Losanges",
    grille: "Grille",
    confettis: "Confettis"
  };

  // SVG complet (viewBox 300x200, proportions de la carte) pour un motif donné,
  // utilisable directement comme background-image (data URI) ou rastérisé (PDF).
  function motifSvgComplet(cle, couleurHex, opacite) {
    const fabrique = MOTIFS[cle] || MOTIFS.aucun;
    const contenuPattern = fabrique(couleurHex, opacite == null ? 0.5 : opacite);
    if (!contenuPattern) return "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
      <defs>${contenuPattern}</defs>
      <rect width="300" height="200" fill="url(#p)"/>
    </svg>`;
  }

  function svgVersDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  // --- Icône d'activité --------------------------------------------------------
  // Traits simples monochromes (currentColor), viewBox 0 0 24 24, cohérents avec
  // le style déjà utilisé pour l'icône cadeau existante de .kadosk-carte-apercu.
  const ICONES = {
    cadeau: `<path d="M4 8h16v4H4z"/><path d="M6 12h12v9H6z"/><path d="M12 8v13"/><path d="M12 8c-2-4-7-3-6 0 .6 1.7 3 2 6 0z"/><path d="M12 8c2-4 7-3 6 0-.6 1.7-3 2-6 0z"/>`,
    restaurant: `<path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M7 3v7"/><path d="M10 3v7"/><path d="M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v8"/>`,
    cafe: `<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 3c0 1.5-1.5 1.5-1.5 3M11 3c0 1.5-1.5 1.5-1.5 3"/>`,
    boulangerie: `<ellipse cx="12" cy="14" rx="9" ry="6"/><path d="M6 14c0-3 3-9 6-9s6 6 6 9"/>`,
    beaute: `<path d="M12 2c2 3 5 5 5 9a5 5 0 0 1-10 0c0-4 3-6 5-9z"/><path d="M8 20h8"/>`,
    mode: `<path d="M8 4l4 3 4-3 3 4-3 2v11H8V10L5 8z"/>`,
    sport: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>`,
    technologie: `<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>`,
    sante: `<path d="M12 21s-7-4.4-9.5-9C.8 8 3 4 7 4c2.2 0 3.8 1.3 5 3 1.2-1.7 2.8-3 5-3 4 0 6.2 4 4.5 8-2.5 4.6-9.5 9-9.5 9z"/>`,
    voyage: `<path d="M2 16l20-7-8 8-3 5-2-6-6-2z"/>`,
    loisirs: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 6V4h8v2M3 11h18"/>`,
    epicerie: `<path d="M3 6h2l2 12h11l2-9H6"/><circle cx="9" cy="21" r="1.2"/><circle cx="17" cy="21" r="1.2"/>`,
    maison: `<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>`,
    boutique: `<path d="M4 8l1-4h14l1 4"/><path d="M4 8v11h16V8"/><path d="M9 19v-6h6v6"/>`
  };
  const LIBELLES_ICONE = {
    cadeau: "Cadeau",
    restaurant: "Restaurant",
    cafe: "Café",
    boulangerie: "Boulangerie",
    beaute: "Beauté",
    mode: "Mode",
    sport: "Sport",
    technologie: "Technologie",
    sante: "Santé",
    voyage: "Voyage",
    loisirs: "Loisirs",
    epicerie: "Épicerie",
    maison: "Maison",
    boutique: "Boutique"
  };

  function iconeSvgComplet(cle, couleurHex) {
    const trace = ICONES[cle] || ICONES.cadeau;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${couleurHex}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${trace}</svg>`;
  }

  // --- Polices ------------------------------------------------------------
  // Liste courte curatée (décision produit) - chargées à la demande depuis
  // Google Fonts (une seule fois par police, jamais bloquant : en cas d'échec de
  // chargement, le navigateur retombe simplement sur la police de secours).
  const POLICES = {
    poppins: { label: "Poppins (par défaut)", famille: "'Poppins', sans-serif", google: "Poppins:wght@600;800" },
    playfair: { label: "Playfair Display (élégant)", famille: "'Playfair Display', serif", google: "Playfair+Display:wght@700;800" },
    montserrat: { label: "Montserrat (moderne)", famille: "'Montserrat', sans-serif", google: "Montserrat:wght@600;800" },
    pacifico: { label: "Pacifico (manuscrit)", famille: "'Pacifico', cursive", google: "Pacifico" },
    raleway: { label: "Raleway (épuré)", famille: "'Raleway', sans-serif", google: "Raleway:wght@600;800" },
    spacemono: { label: "Space Mono (technique)", famille: "'Space Mono', monospace", google: "Space+Mono:wght@700" }
  };

  const policesChargees = {};
  function chargerPolice(cle) {
    const police = POLICES[cle];
    if (!police || policesChargees[cle]) return;
    policesChargees[cle] = true;
    try {
      const lien = document.createElement("link");
      lien.rel = "stylesheet";
      lien.href = "https://fonts.googleapis.com/css2?family=" + police.google + "&display=swap";
      document.head.appendChild(lien);
    } catch (erreur) {
      // Best-effort : une police non chargée retombe simplement sur la police
      // de secours définie dans la font-family CSS (voir "famille" ci-dessus).
    }
  }

  // --- Application au DOM (aperçu éditeur / vignette catalogue) --------------
  // Applique accentColor/pattern/font/activityIcon/fond (couleur|dégradé|image) à
  // un conteneur `.kadosk-carte-apercu` (ou compatible) déjà présent dans le DOM.
  // Seule la mise en page - position du logo KADOSK (bas gauche) et de la zone QR
  // (bas droite), voir style.css/kadosk2.css - reste fixe et non personnalisable ;
  // tout le reste (couleur, motif, police, icône, fond) est au choix du marchand.
  function appliquerAuxElements(
    conteneur,
    { accentColor, pattern, font, activityIcon, backgroundType, backgroundImageUrl, gradientFrom, gradientTo, gradientAngle } = {}
  ) {
    if (!conteneur) return;

    const accent = resoudreAccent(accentColor);
    conteneur.style.setProperty("--kadosk-teal", accent.base);
    conteneur.style.setProperty("--kadosk-teal-fonce", accent.fonce);
    // On retire un éventuel data-accent hérité (presets) : les variables inline
    // ci-dessus prennent maintenant le dessus dans tous les cas (hex ou preset).
    if (conteneur.dataset) delete conteneur.dataset.accent;

    // --- Fond (couleur unie / dégradé / image) ---------------------------------
    // Type "couleur" (historique) : pas de calque de fond dédié, la vague en
    // accent ci-dessous suffit, le fond du conteneur reste la charte KADOSK (#fbfbf8).
    // "degrade"/"image" : un calque plein cadre, toujours SOUS le motif, la vague,
    // et les deux zones fixes (logo KADOSK / QR) qui restent des blocs opaques
    // indépendants par-dessus dans tous les cas.
    //
    // Aucun de ces calques n'a de z-index positif explicite : comme le motif
    // existant, ils restent au même "niveau" de pile (0/auto) que TOUT le reste du
    // contenu de la carte (logo marchand, titre, montant, vague, badge KADOSK, QR)
    // - c'est l'ORDRE D'INSERTION DANS LE DOM qui détermine seul l'empilement
    // visuel ici. On les insère donc dans l'ordre INVERSE de la pile souhaitée
    // (motif d'abord, puis voile, puis fond en dernier), puisque chaque
    // insertBefore(el, conteneur.firstChild) place l'élément tout en tête,
    // repoussant les précédents plus haut dans la pile visuelle : le dernier
    // inséré des trois (fond) se retrouve donc tout en bas, sous voile puis motif,
    // eux-mêmes toujours sous le contenu réel (jamais touché, inséré une seule
    // fois au chargement de la page, donc toujours après ces trois calques).
    const typeFond = backgroundType === "degrade" || backgroundType === "image" ? backgroundType : "couleur";
    conteneur.dataset.fond = typeFond;

    const cleMotif = pattern && MOTIFS[pattern] ? pattern : "aucun";
    let zoneMotif = conteneur.querySelector(".kadosk-carte-apercu-motif");
    if (!zoneMotif) {
      zoneMotif = document.createElement("div");
      zoneMotif.className = "kadosk-carte-apercu-motif";
      zoneMotif.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:0;";
      conteneur.insertBefore(zoneMotif, conteneur.firstChild);
    }

    // Voile de lisibilité automatique (voir style.css/kadosk2.css,
    // .kadosk-carte-apercu-voile) : uniquement visible en mode image (via le
    // sélecteur [data-fond="image"]), jamais réglable par le marchand - garantit
    // que le titre reste lisible quelle que soit la photo choisie. Inséré APRÈS
    // le motif ci-dessus pour se retrouver EN DESSOUS de lui une fois en place
    // (voir note d'ordre d'insertion plus haut).
    let zoneVoile = conteneur.querySelector(".kadosk-carte-apercu-voile");
    if (!zoneVoile) {
      zoneVoile = document.createElement("div");
      zoneVoile.className = "kadosk-carte-apercu-voile";
      conteneur.insertBefore(zoneVoile, conteneur.firstChild);
    }

    // Fond proprement dit, inséré EN DERNIER pour finir tout en bas de la pile.
    let zoneFond = conteneur.querySelector(".kadosk-carte-apercu-fond");
    if (!zoneFond) {
      zoneFond = document.createElement("div");
      zoneFond.className = "kadosk-carte-apercu-fond";
      conteneur.insertBefore(zoneFond, conteneur.firstChild);
    }
    if (typeFond === "degrade" && gradientFrom && gradientTo) {
      const angle = Number.isFinite(Number(gradientAngle)) ? Number(gradientAngle) : 135;
      zoneFond.style.backgroundImage = `linear-gradient(${angle}deg, ${gradientFrom}, ${gradientTo})`;
    } else if (typeFond === "image" && backgroundImageUrl) {
      zoneFond.style.backgroundImage = `url('${backgroundImageUrl}')`;
    } else {
      zoneFond.style.backgroundImage = "none";
    }

    if (cleMotif === "aucun") {
      zoneMotif.style.backgroundImage = "none";
    } else {
      // Sur un fond image/dégradé, le motif est dessiné en blanc semi-transparent
      // (plutôt qu'en couleur d'accent) pour rester visible sur n'importe quelle
      // photo/dégradé, au lieu de se fondre dedans.
      const couleurMotif = typeFond === "couleur" ? accent.base : "#ffffff";
      const opaciteMotif = typeFond === "couleur" ? 0.45 : 0.35;
      const svg = motifSvgComplet(cleMotif, couleurMotif, opaciteMotif);
      zoneMotif.style.backgroundImage = "url('" + svgVersDataUri(svg) + "')";
      zoneMotif.style.backgroundSize = "cover";
    }

    // La vague décorative en bas de carte appartient au look "couleur unie" -
    // elle est masquée en mode dégradé/image (voir style.css/kadosk2.css,
    // [data-fond="degrade"]/[data-fond="image"] .kadosk-carte-apercu-vague).

    const clePolice = font && POLICES[font] ? font : "poppins";
    chargerPolice(clePolice);
    conteneur.style.setProperty("--kadosk-carte-police", POLICES[clePolice].famille);
    const titre = conteneur.querySelector(".kadosk-carte-apercu-titre");
    if (titre) titre.style.fontFamily = POLICES[clePolice].famille;

    const cleIcone = activityIcon && ICONES[activityIcon] ? activityIcon : "cadeau";
    const zoneCadeau = conteneur.querySelector(".kadosk-carte-apercu-cadeau");
    if (zoneCadeau) {
      zoneCadeau.outerHTML =
        `<svg class="kadosk-carte-apercu-cadeau" viewBox="0 0 24 24" fill="none" stroke="var(--kadosk-teal)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONES[cleIcone] || ICONES.cadeau}</svg>`;
    }
  }

  // --- Rastérisation (pour carte-cadeau-pdf.js, qui ne sait pas dessiner de SVG
  // directement - jsPDF a besoin d'une image bitmap via addImage). ---------------
  function svgVersDataUrlPng(svgString, largeurPx, hauteurPx) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = largeurPx;
            canvas.height = hauteurPx;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, largeurPx, hauteurPx);
            resolve(canvas.toDataURL("image/png"));
          } catch (erreur) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = svgVersDataUri(svgString);
      } catch (erreur) {
        resolve(null);
      }
    });
  }

  // Placeholder de la zone QR (voir .kadosk-carte-apercu-qr-zone dans style.css) -
  // même balisage que settings.html, réutilisé partout où une carte visuelle est
  // construite dynamiquement (ex. mes-commandes.js) avant qu'un QR réel n'y soit
  // inséré (voir remplacerZoneQrParImage/remplacerZoneQrParPlaceholder ci-dessous).
  const HTML_PLACEHOLDER_QR = `
    <div class="kadosk-carte-apercu-qr-zone-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/></svg>
      <span>QR</span>
    </div>`;

  // Construit un élément .kadosk-carte-apercu complet et autonome (structure +
  // design appliqué), pour les endroits qui affichent une carte en dehors de
  // settings.html (dont le balisage HTML statique existe déjà) - typiquement
  // mes-commandes.js ("Mes cartes" côté client). La zone QR est toujours créée
  // vide (placeholder) : c'est à l'appelant d'y insérer le vrai bouton/QR selon
  // le contexte (carte à soi, offerte, déjà utilisée...), voir zoneQr() ci-dessous.
  function creerElementCarte({
    businessName,
    cardName,
    amount,
    currency,
    logoUrl,
    accentColor,
    pattern,
    font,
    activityIcon,
    backgroundType,
    backgroundImageUrl,
    gradientFrom,
    gradientTo,
    gradientAngle
  } = {}) {
    const conteneur = document.createElement("div");
    conteneur.className = "kadosk-carte-apercu";
    conteneur.innerHTML = `
      <div class="kadosk-carte-apercu-logo-marchand${logoUrl ? " a-un-logo" : ""}">
        ${logoUrl ? `<img src="${logoUrl}" alt="" />` : ""}
      </div>
      <div class="kadosk-carte-apercu-titre"></div>
      <svg class="kadosk-carte-apercu-cadeau" viewBox="0 0 24 24" fill="none" stroke="var(--kadosk-teal)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONES.cadeau}</svg>
      <div class="kadosk-carte-apercu-montant-bloc">
        <div class="kadosk-carte-apercu-montant-label"><span class="trait"></span> MONTANT <span class="trait"></span></div>
        <div class="kadosk-carte-apercu-montant-valeur"><span class="kadosk-carte-apercu-montant-nombre"></span> <span class="devise"></span></div>
      </div>
      <div class="kadosk-carte-apercu-vague"></div>
      <div class="kadosk-carte-apercu-logo-kadosk">
        <img src="assets/logo.png" alt="KADOSK" />
        <span>GÉRÉ PAR KADOSK</span>
      </div>
      <div class="kadosk-carte-apercu-qr-zone">${HTML_PLACEHOLDER_QR}</div>
    `;

    const titre = conteneur.querySelector(".kadosk-carte-apercu-titre");
    if (titre) titre.textContent = cardName || businessName || "";
    const nombre = conteneur.querySelector(".kadosk-carte-apercu-montant-nombre");
    if (nombre) nombre.textContent = amount !== undefined && amount !== null ? Number(amount).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—";
    const devise = conteneur.querySelector(".devise");
    if (devise) devise.textContent = currency || "MAD";

    appliquerAuxElements(conteneur, { accentColor, pattern, font, activityIcon, backgroundType, backgroundImageUrl, gradientFrom, gradientTo, gradientAngle });
    return conteneur;
  }

  // Renvoie la zone QR d'une carte construite par creerElementCarte, pour que
  // l'appelant y insère son propre contenu (bouton "Voir le QR", badge "carte
  // utilisée", image de QR déjà généré...).
  function zoneQr(conteneur) {
    return conteneur ? conteneur.querySelector(".kadosk-carte-apercu-qr-zone") : null;
  }

  return {
    PRESETS_ACCENT,
    MOTIFS_LIBELLES: LIBELLES_MOTIF,
    ICONES_LIBELLES: LIBELLES_ICONE,
    POLICES,
    HTML_PLACEHOLDER_QR,
    resoudreAccent,
    assombrirHex,
    motifSvgComplet,
    iconeSvgComplet,
    svgVersDataUri,
    svgVersDataUrlPng,
    chargerPolice,
    appliquerAuxElements,
    creerElementCarte,
    zoneQr
  };
})();
