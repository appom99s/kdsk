// GiftCardDesignEditor — éditeur visuel du design de la carte cadeau
// (Carte cadeau > Modifier la carte cadeau > Design). Composé de :
//   - GiftCardPreview        : aperçu en direct (shared/assets/gift-card-renderer.js)
//   - GiftCardThemeSelector  : vignettes de thèmes (rendues par le même moteur)
//   - GiftCardColorSelector  : couleur principale (préréglages + sélecteur natif)
//   - GiftCardPatternSelector: motif, opacité, densité
//   + fond personnalisé, couleur du texte, taille du logo, police.
//
// Tout se passe côté client : aucune requête pendant l'édition. La configuration
// n'est persistée que via "Utiliser ce design" / "Enregistrer" (settings.js,
// saveOfferSettings existant). Présentation uniquement : aucune donnée de sécurité
// (code, PIN, hash, QR réel) n'est reçue ni manipulée ici.
window.KADOSK_GC_EDITOR = (function () {
  "use strict";

  const R = window.KADOSK_GIFT_CARD_RENDERER;
  const VIS = window.KADOSK_CARTE_VISUELLE;
  const COULEURS = [
    ["#d4af37", "Or"],
    ["#7fb5ab", "Menthe KADOSK"],
    ["#00a6c7", "Turquoise"],
    ["#e67ea2", "Rose"],
    ["#7755e8", "Violet"],
    ["#e86a33", "Orange"]
  ];
  const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
  const TAILLE_IMAGE_MAX = 8 * 1024 * 1024;
  const IMAGE_MAX_PX = 1600;
  const ICONES = {
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
  };

  let racine = null;
  let carte = null;
  let etat = null;
  let initial = "";
  let historique = [];
  let position = -1;
  let donnees = { businessName: "", logoUrl: "", amount: null, amounts: [] };
  let montantChoisi = null;
  let enregistrement = null; // callback fourni par settings.js
  let dernierTheme = "minimal";
  let urlBlobApercu = "";
  const $ = (sel) => racine.querySelector(sel);
  const $$ = (sel) => Array.from(racine.querySelectorAll(sel));

  // --- Gabarit (contenu statique uniquement, jamais de donnée marchand) ---------
  function gabarit() {
    return `
<header class="kd-ed__header">
  <div class="kd-ed__title"><div class="kadosk-section-numero">2</div><div><h2>Design de la carte</h2><p>Choisissez un thème puis ajustez couleurs, motif et typographie. L’aperçu se met à jour instantanément.</p></div></div>
  <div class="kd-ed__history">
    <button type="button" class="kd-ed__icon-btn" data-action="undo" aria-label="Annuler" title="Annuler">${ICONES.undo}</button>
    <button type="button" class="kd-ed__icon-btn" data-action="redo" aria-label="Rétablir" title="Rétablir">${ICONES.redo}</button>
  </div>
</header>
<div class="kd-ed__layout">
  <div class="kd-ed__preview" aria-label="Aperçu en direct">
    <div class="kd-ed__preview-meta"><span class="kd-ed__badge">Aperçu en direct</span><div class="kd-ed__amounts" data-role="amounts"></div></div>
    <div class="kd-ed__stage" data-role="stage"></div>
    <p class="kd-ed__notice" data-role="notice" role="status" aria-live="polite"></p>
    <div class="kd-ed__locked">${ICONES.lock}<span>Le QR code est généré de façon sécurisée par KADOSK pour chaque carte ; celui de l’aperçu est une démonstration non fonctionnelle. La mention « Géré par KADOSK » est toujours affichée.</span></div>
  </div>
  <div class="kd-ed__controls">
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdThemeLbl">Thème</p>
      <div class="kd-ed__themes" data-role="themes" role="group" aria-labelledby="kdEdThemeLbl"></div>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdCouleurLbl">Couleur principale <small data-role="hex"></small></p>
      <div class="kd-ed__swatches" data-role="swatches" role="group" aria-labelledby="kdEdCouleurLbl"></div>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdFondLbl">Fond personnalisé</p>
      <div class="kd-ed__seg" data-role="fond" role="group" aria-labelledby="kdEdFondLbl">
        <button type="button" data-fond="theme">Thème</button>
        <button type="button" data-fond="uni">Couleur unie</button>
        <button type="button" data-fond="degrade">Dégradé</button>
        <button type="button" data-fond="image">Image</button>
      </div>
      <div class="kd-ed__sub" data-sub="uni" hidden>
        <label class="kd-ed__field"><input type="color" data-input="uni" aria-label="Couleur du fond"> Couleur du fond</label>
      </div>
      <div class="kd-ed__sub" data-sub="degrade" hidden>
        <div class="kd-ed__row">
          <label class="kd-ed__field"><input type="color" data-input="from" aria-label="Couleur 1"> Couleur 1</label>
          <label class="kd-ed__field"><input type="color" data-input="to" aria-label="Couleur 2"> Couleur 2</label>
        </div>
        <label class="kd-ed__range">Angle <input type="range" min="0" max="360" step="5" data-input="angle"><output data-output="angle"></output></label>
      </div>
      <div class="kd-ed__sub" data-sub="image" hidden>
        <div class="kd-ed__upload">
          <div class="kd-ed__thumb" data-role="thumb"></div>
          <button type="button" class="kd-ed__btn" data-action="upload">Choisir une image…</button>
          <input type="file" accept="image/jpeg,image/png,image/webp" data-input="file" hidden>
        </div>
        <p class="kd-ed__help">JPEG, PNG ou WEBP, 8 Mo max. L’image est redimensionnée et optimisée avant l’envoi ; un voile est ajouté automatiquement pour garder le texte lisible.</p>
        <p class="kd-ed__msg" data-role="upload-msg" role="status"></p>
      </div>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdMotifLbl">Motif</p>
      <div class="kd-ed__patterns" data-role="patterns" role="group" aria-labelledby="kdEdMotifLbl"></div>
      <div class="kd-ed__sub" data-role="pattern-opts">
        <label class="kd-ed__range">Opacité <input type="range" min="4" max="35" step="1" data-input="opacity"><output data-output="opacity"></output></label>
        <div class="kd-ed__seg" data-role="density" role="group" aria-label="Densité du motif">
          <button type="button" data-density="fine">Fin</button>
          <button type="button" data-density="normal">Normal</button>
          <button type="button" data-density="large">Large</button>
        </div>
      </div>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdTexteLbl">Couleur du texte</p>
      <div class="kd-ed__seg" data-role="text" role="group" aria-labelledby="kdEdTexteLbl">
        <button type="button" data-text="auto">Auto</button>
        <button type="button" data-text="light">Clair</button>
        <button type="button" data-text="dark">Foncé</button>
      </div>
      <p class="kd-ed__help">« Auto » choisit la couleur la plus lisible selon le fond.</p>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdLogoLbl">Taille du logo</p>
      <div class="kd-ed__seg" data-role="logo" role="group" aria-labelledby="kdEdLogoLbl">
        <button type="button" data-logo="small">Petit</button>
        <button type="button" data-logo="medium">Moyen</button>
        <button type="button" data-logo="large">Grand</button>
      </div>
      <p class="kd-ed__help">Le logo provient de votre profil (section Identité ci-dessus).</p>
    </div>
    <div class="kd-ed__group">
      <p class="kd-ed__label" id="kdEdPoliceLbl">Typographie</p>
      <div class="kd-ed__fonts" data-role="fonts" role="group" aria-labelledby="kdEdPoliceLbl"></div>
      <div class="kd-ed__sub"><select data-input="font" aria-label="Autres polices"></select></div>
    </div>
  </div>
</div>
<div class="kd-ed__savebar">
  <p class="kd-ed__status" data-role="status" role="status">Design enregistré</p>
  <div class="kd-ed__actions">
    <button type="button" class="kd-ed__btn kd-ed__btn--ghost" data-action="reset">Annuler les modifications</button>
    <button type="button" class="kd-ed__btn kd-ed__btn--primary" data-action="save">Utiliser ce design</button>
  </div>
</div>`;
  }

  // --- Construction ---------------------------------------------------------
  function monter(element, options) {
    if (!R || !element) return null;
    racine = element;
    racine.classList.add("kd-ed");
    racine.innerHTML = gabarit();
    enregistrement = options && options.onSave;
    etat = R.normaliser({});
    carte = document.createElement("div");
    $('[data-role="stage"]').append(carte);
    R.majDonnees(carte, { ...donnees, qr: "demo" });
    construireThemes();
    construireCouleurs();
    construireMotifs();
    construirePolices();
    brancher();
    rendre();
    return api;
  }

  // GiftCardThemeSelector : chaque vignette est une vraie carte rendue par le moteur.
  function construireThemes() {
    const zone = $('[data-role="themes"]');
    const themes = Object.keys(R.THEMES).map((k) => [k, R.THEMES[k].label, R.THEMES[k].hint]);
    themes.push(["classique", "Classique", "Le design KADOSK d’origine"]);
    themes.forEach(([cle, label, hint]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kd-ed__theme";
      b.dataset.theme = cle;
      const design = cle === "classique"
        ? { backgroundType: "couleur", accentColor: "#8ab6a9", font: "poppins" }
        : { backgroundType: "theme", design: { theme: cle }, accentColor: R.THEMES[cle].accent, font: R.THEMES[cle].font };
      const mini = R.creer({ businessName: "Votre commerce", amount: 500, qr: "demo" }, design);
      mini.setAttribute("aria-hidden", "true");
      mini.removeAttribute("role");
      const t = document.createElement("strong");
      t.textContent = label;
      const h = document.createElement("span");
      h.textContent = hint;
      b.append(mini, t, h);
      b.addEventListener("click", () => choisirTheme(cle));
      zone.append(b);
    });
  }

  // GiftCardColorSelector
  function construireCouleurs() {
    const zone = $('[data-role="swatches"]');
    COULEURS.forEach(([hex, nom]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kd-ed__swatch";
      b.style.background = hex;
      b.dataset.color = hex;
      b.setAttribute("aria-label", nom);
      b.title = nom;
      b.addEventListener("click", () => modifier({ accentColor: hex }));
      zone.append(b);
    });
    const picker = document.createElement("label");
    picker.className = "kd-ed__picker";
    picker.title = "Couleur personnalisée";
    const input = document.createElement("input");
    input.type = "color";
    input.dataset.input = "accent";
    input.setAttribute("aria-label", "Couleur personnalisée");
    picker.append(input);
    zone.append(picker);
  }

  // GiftCardPatternSelector
  function construireMotifs() {
    const zone = $('[data-role="patterns"]');
    R.MOTIFS.forEach(([cle, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kd-ed__pattern";
      b.dataset.pattern = cle;
      const i = document.createElement("i");
      if (cle !== "aucun" && VIS) {
        i.style.backgroundImage = 'url("' + VIS.svgVersDataUri(VIS.motifSvgComplet(cle, "#1f3a34", 0.55)) + '")';
      }
      const s = document.createElement("span");
      s.textContent = label;
      b.append(i, s);
      b.addEventListener("click", () => modifier({ pattern: cle }));
      zone.append(b);
    });
  }

  function construirePolices() {
    const zone = $('[data-role="fonts"]');
    R.POLICES_PRESETS.forEach(([, label, cle]) => {
      if (!VIS || !VIS.POLICES[cle]) return;
      VIS.chargerPolice(cle);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kd-ed__font";
      b.dataset.font = cle;
      const aa = document.createElement("b");
      aa.textContent = "Aa";
      aa.style.fontFamily = VIS.POLICES[cle].famille;
      const s = document.createElement("span");
      s.textContent = label;
      b.append(aa, s);
      b.addEventListener("click", () => modifier({ font: cle }));
      zone.append(b);
    });
    const select = $('[data-input="font"]');
    Object.keys(VIS ? VIS.POLICES : {}).forEach((cle) => {
      const o = document.createElement("option");
      o.value = cle;
      o.textContent = VIS.POLICES[cle].label;
      select.append(o);
    });
  }

  function brancher() {
    $('[data-action="undo"]').addEventListener("click", () => naviguer(-1));
    $('[data-action="redo"]').addEventListener("click", () => naviguer(1));
    $('[data-action="reset"]').addEventListener("click", () => {
      if (!initial) return;
      appliquer(JSON.parse(initial), true);
    });
    $('[data-action="save"]').addEventListener("click", enregistrer);

    $$('button[data-fond]').forEach((b) => b.addEventListener("click", () => choisirFond(b.dataset.fond)));
    $$('button[data-density]').forEach((b) => b.addEventListener("click", () => modifier({ patternDensity: b.dataset.density })));
    $$('button[data-text]').forEach((b) => b.addEventListener("click", () => modifier({ textMode: b.dataset.text })));
    $$('button[data-logo]').forEach((b) => b.addEventListener("click", () => modifier({ logoSize: b.dataset.logo })));

    // Champs continus : aperçu à chaque "input", une seule entrée d'historique au "change".
    const continu = (sel, lire) => {
      const champ = $(sel);
      champ.addEventListener("input", () => modifier(lire(champ), false));
      champ.addEventListener("change", () => memoriser());
    };
    continu('[data-input="accent"]', (c) => ({ accentColor: c.value }));
    continu('[data-input="uni"]', (c) => ({ gradientFrom: c.value, gradientTo: c.value }));
    continu('[data-input="from"]', (c) => ({ gradientFrom: c.value }));
    continu('[data-input="to"]', (c) => ({ gradientTo: c.value }));
    continu('[data-input="angle"]', (c) => ({ gradientAngle: Number(c.value) }));
    continu('[data-input="opacity"]', (c) => ({ patternOpacity: Number(c.value) / 100 }));
    $('[data-input="font"]').addEventListener("change", (e) => modifier({ font: e.target.value }));

    const fichier = $('[data-input="file"]');
    $('[data-action="upload"]').addEventListener("click", () => fichier.click());
    fichier.addEventListener("change", () => {
      const f = fichier.files && fichier.files[0];
      fichier.value = "";
      if (f) televerser(f);
    });
  }

  // --- Logique d'état ----------------------------------------------------------
  function fondUi() {
    if (etat.backgroundType === "degrade" && etat.gradientFrom === etat.gradientTo) return "uni";
    if (etat.backgroundType === "couleur") return "theme";
    return etat.backgroundType;
  }

  function choisirTheme(cle) {
    if (cle === "classique") {
      modifier({ backgroundType: "couleur", theme: "" });
      return;
    }
    const precedent = etat.theme && R.THEMES[etat.theme];
    const patch = { backgroundType: "theme", theme: cle };
    // Accent et police restent indépendants : on applique ceux du thème seulement
    // si le marchand n'avait pas personnalisé ceux du thème précédent.
    if (!precedent || etat.accentColor === precedent.accent || etat.backgroundType !== "theme") patch.accentColor = R.THEMES[cle].accent;
    if (!precedent || etat.font === precedent.font) patch.font = R.THEMES[cle].font;
    dernierTheme = cle;
    modifier(patch);
  }

  function choisirFond(type) {
    if (type === "theme") {
      modifier({ backgroundType: "theme", theme: etat.theme || dernierTheme });
    } else if (type === "uni") {
      const c = etat.backgroundType === "degrade" ? etat.gradientFrom : "#1f3a34";
      modifier({ backgroundType: "degrade", gradientFrom: c, gradientTo: c });
    } else if (type === "degrade") {
      const patch = { backgroundType: "degrade" };
      if (etat.gradientFrom === etat.gradientTo) patch.gradientTo = etat.gradientFrom === "#7fb5ab" ? "#1f3a34" : "#7fb5ab";
      modifier(patch);
    } else if (type === "image") {
      if (etat.backgroundImageUrl) modifier({ backgroundType: "image" });
      else {
        montrerSousPanneau("image");
        $('[data-action="upload"]').focus();
      }
    }
  }

  function modifier(patch, avecHistorique) {
    Object.assign(etat, patch);
    if (etat.theme) dernierTheme = etat.theme;
    etat.patternOpacity = Math.max(0.04, Math.min(0.35, etat.patternOpacity));
    rendre();
    if (avecHistorique !== false) memoriser();
  }

  function appliquer(nouvelEtat, avecHistorique) {
    etat = { ...nouvelEtat };
    rendre();
    if (avecHistorique) memoriser();
  }

  function memoriser() {
    const snap = JSON.stringify(etat);
    if (historique[position] === snap) return majStatut();
    historique = historique.slice(0, position + 1);
    historique.push(snap);
    if (historique.length > 60) historique.shift();
    position = historique.length - 1;
    majStatut();
  }

  function naviguer(pas) {
    const cible = position + pas;
    if (cible < 0 || cible >= historique.length) return;
    position = cible;
    etat = JSON.parse(historique[position]);
    rendre();
    majStatut();
  }

  function estModifie() {
    return !!initial && JSON.stringify(etat) !== initial;
  }

  function majStatut() {
    if (!racine) return;
    const st = $('[data-role="status"]');
    const modifie = estModifie();
    st.dataset.dirty = String(modifie);
    st.textContent = modifie ? "Modifications non enregistrées" : "Design enregistré";
    $('[data-action="undo"]').disabled = position <= 0;
    $('[data-action="redo"]').disabled = position >= historique.length - 1;
    $('[data-action="reset"]').disabled = !modifie;
  }

  // --- Rendu (mises à jour ciblées, sans reconstruire l'éditeur) ---------------
  function presse(sel, attr, valeur) {
    $$(sel).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[attr] === valeur)));
  }

  function montrerSousPanneau(type) {
    $$("[data-sub]").forEach((p) => { p.hidden = p.dataset.sub !== type; });
    presse("button[data-fond]", "fond", type);
  }

  function rendre() {
    if (!racine) return;
    const res = R.majDesign(carte, etat);

    const themeActif = etat.backgroundType === "theme" ? etat.theme : etat.backgroundType === "couleur" ? "classique" : "";
    presse("button[data-theme]", "theme", themeActif);
    presse("button[data-color]", "color", etat.accentColor);
    const picker = $(".kd-ed__picker");
    picker.setAttribute("aria-pressed", String(!COULEURS.some(([h]) => h === etat.accentColor)));
    $('[data-input="accent"]').value = etat.accentColor;
    $('[data-role="hex"]').textContent = etat.accentColor.toUpperCase();

    montrerSousPanneau(fondUi());
    $('[data-input="uni"]').value = etat.gradientFrom;
    $('[data-input="from"]').value = etat.gradientFrom;
    $('[data-input="to"]').value = etat.gradientTo;
    $('[data-input="angle"]').value = String(etat.gradientAngle);
    $('[data-output="angle"]').textContent = etat.gradientAngle + "°";
    $('[data-role="thumb"]').style.backgroundImage = etat.backgroundImageUrl ? 'url("' + etat.backgroundImageUrl.replace(/["\\\n\r]/g, "") + '")' : "none";

    presse("button[data-pattern]", "pattern", etat.pattern);
    $('[data-role="pattern-opts"]').hidden = etat.pattern === "aucun";
    const pct = Math.round(etat.patternOpacity * 100);
    $('[data-input="opacity"]').value = String(pct);
    $('[data-output="opacity"]').textContent = pct + " %";
    presse("button[data-density]", "density", etat.patternDensity);
    presse("button[data-text]", "text", etat.textMode);
    presse("button[data-logo]", "logo", etat.logoSize);
    presse("button[data-font]", "font", etat.font);
    $('[data-input="font"]').value = etat.font;

    const notice = $('[data-role="notice"]');
    if (res.lisibilite.corrige && etat.textMode !== "auto") {
      notice.dataset.type = "info";
      notice.textContent = "Lisibilité : un voile a été ajouté automatiquement pour que le texte reste lisible avec cette couleur.";
    } else if (etat.backgroundType === "image") {
      notice.dataset.type = "";
      notice.textContent = "Un voile de lisibilité est appliqué sur l’image.";
    } else if (res.lisibilite.corrige) {
      notice.dataset.type = "info";
      notice.textContent = "Lisibilité : un voile léger a été ajouté pour garder un bon contraste.";
    } else {
      notice.dataset.type = "";
      notice.textContent = "";
    }
    majStatut();
  }

  function rendreMontants() {
    const zone = $('[data-role="amounts"]');
    zone.replaceChildren();
    const liste = (donnees.amounts || []).slice(0, 4);
    if (!liste.includes(montantChoisi)) montantChoisi = liste[0] || null;
    liste.forEach((m) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m.toLocaleString("fr-FR") + " MAD";
      b.setAttribute("aria-pressed", String(m === montantChoisi));
      b.addEventListener("click", () => {
        montantChoisi = m;
        rendreMontants();
      });
      zone.append(b);
    });
    R.majDonnees(carte, { businessName: donnees.businessName, logoUrl: donnees.logoUrl, amount: montantChoisi || 500, qr: "demo" });
  }

  // --- Image de fond : validation, optimisation, envoi via le stockage KADOSK ----
  function msgUpload(texte, type) {
    const m = $('[data-role="upload-msg"]');
    m.textContent = texte;
    m.dataset.type = type || "";
  }

  function chargerImage(fichier) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("IMAGE_ILLISIBLE")); };
      img.src = url;
    });
  }

  // Ré-encode l'image via canvas : redimensionne, supprime les métadonnées (EXIF,
  // GPS…) et garantit qu'on n'envoie qu'une image, jamais le fichier d'origine.
  async function optimiser(fichier) {
    const { img, url } = await chargerImage(fichier);
    try {
      const echelle = Math.min(1, IMAGE_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const l = Math.max(1, Math.round(img.naturalWidth * echelle));
      const h = Math.max(1, Math.round(img.naturalHeight * echelle));
      const canvas = document.createElement("canvas");
      canvas.width = l;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, l, h);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.84));
      if (!blob) throw new Error("COMPRESSION_IMPOSSIBLE");
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function televerser(fichier) {
    msgUpload("");
    if (!TYPES_IMAGE.includes(fichier.type) || !/\.(jpe?g|png|webp)$/i.test(fichier.name || "")) {
      msgUpload("Format non supporté : JPEG, PNG ou WEBP uniquement.", "error");
      return;
    }
    if (fichier.size > TAILLE_IMAGE_MAX) {
      msgUpload("Fichier trop volumineux (8 Mo maximum).", "error");
      return;
    }
    const bouton = $('[data-action="upload"]');
    bouton.disabled = true;
    bouton.textContent = "Optimisation…";
    const avant = { ...etat };
    try {
      const blob = await optimiser(fichier);
      // Aperçu immédiat pendant l'envoi.
      if (urlBlobApercu) URL.revokeObjectURL(urlBlobApercu);
      urlBlobApercu = URL.createObjectURL(blob);
      modifier({ backgroundType: "image", backgroundImageUrl: urlBlobApercu }, false);
      bouton.textContent = "Envoi…";
      // Nom neutre : le nom de fichier d'origine n'est jamais transmis.
      const nom = "fond-carte-" + Date.now() + ".jpg";
      const { uploadUrl } = await KADOSK_API.getMediaUploadUrl(nom, "image/jpeg", blob.size);
      const reponse = await fetch(uploadUrl + "?filename=" + encodeURIComponent(nom), {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob
      });
      if (!reponse.ok) throw new Error("ECHEC_UPLOAD");
      const resultat = await reponse.json();
      const urlFinale = resultat && resultat.file && resultat.file.url;
      if (!urlFinale || !/^https:\/\//i.test(urlFinale)) throw new Error("REPONSE_UPLOAD_INATTENDUE");
      modifier({ backgroundType: "image", backgroundImageUrl: urlFinale });
      msgUpload("Image prête. Cliquez sur « Utiliser ce design » pour l’appliquer.", "ok");
    } catch (erreur) {
      console.error("Envoi de l'image de fond :", erreur);
      appliquer(avant, false);
      msgUpload(erreur && erreur.message === "IMAGE_ILLISIBLE" ? "Ce fichier n’est pas une image valide." : "Échec de l’envoi de l’image. Merci de réessayer.", "error");
    } finally {
      bouton.disabled = false;
      bouton.textContent = "Choisir une image…";
    }
  }

  async function enregistrer() {
    if (!enregistrement) return;
    if (/^blob:/.test(etat.backgroundImageUrl)) {
      msgUpload("Patientez jusqu’à la fin de l’envoi de l’image.", "error");
      return;
    }
    const bouton = $('[data-action="save"]');
    bouton.disabled = true;
    bouton.textContent = "Enregistrement…";
    try {
      const ok = await enregistrement();
      if (ok) {
        const st = $('[data-role="status"]');
        st.dataset.dirty = "false";
        st.textContent = "Design enregistré";
      }
    } finally {
      bouton.disabled = false;
      bouton.textContent = "Utiliser ce design";
    }
  }

  // --- API publique (utilisée par settings.js) ------------------------------------
  const api = {
    monter,
    // Charge la configuration enregistrée sans rien écrire côté serveur.
    charger(offre) {
      if (!racine) return;
      etat = R.normaliser(offre || {});
      if (etat.theme) dernierTheme = etat.theme;
      initial = JSON.stringify(etat);
      historique = [initial];
      position = 0;
      rendre();
    },
    // Données affichées (nom, logo, montants) : issues du formulaire existant.
    majDonnees(d) {
      if (!racine) return;
      donnees = { ...donnees, ...d };
      rendreMontants();
    },
    // Configuration à envoyer à saveOfferSettings (champs existants + design).
    lireDesign() {
      return etat ? R.versOffre(etat) : null;
    },
    estModifie,
    marquerEnregistre() {
      initial = JSON.stringify(etat);
      majStatut();
    },
    enAttenteUpload() {
      return !!etat && /^blob:/.test(etat.backgroundImageUrl);
    }
  };
  return api;
})();
