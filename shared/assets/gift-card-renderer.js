// GiftCardRenderer — rendu unique de la carte cadeau KADOSK (aperçu marchand,
// fiche commerçant, "Mes cartes"). Présentation uniquement : ce module ne reçoit
// jamais de code, PIN, hash ou jeton. La zone QR est un emplacement : l'appelant
// y insère le QR sécurisé existant ; sinon un QR de démonstration non
// fonctionnel est affiché.
//
// Thèmes, motifs et fonds sont générés en CSS/SVG inline (aucune image distante).
// Les couleurs de la carte sont explicites : le thème clair/sombre de l'interface
// ne modifie jamais la carte.
//
// Dépend de KADOSK_CARTE_VISUELLE (carte-visuelle.js) pour les motifs, les
// polices et la résolution des couleurs historiques : charger ce fichier après.
window.KADOSK_GIFT_CARD_RENDERER = (function () {
  "use strict";

  const V = () => window.KADOSK_CARTE_VISUELLE || null;
  const HEX = /^#[0-9a-f]{6}$/i;
  const TEXTE_CLAIR = "#ffffff";
  const TEXTE_SOMBRE = "#1f3a34";
  let compteurId = 0;

  // --- Thèmes intégrés ---------------------------------------------------------
  // bg : fond CSS ; decor(accent, uid) : SVG décoratif (valeurs internes + accent
  // hex validé uniquement) ; ref : couleur représentative pour le contraste.
  const THEMES = {
    luxury: {
      label: "Luxe",
      hint: "Premium, sombre et doré",
      accent: "#d4af37",
      font: "playfair",
      ref: "#13241f",
      bg: "radial-gradient(120% 95% at 100% 0%, #25463e 0%, rgba(37,70,62,0) 58%), linear-gradient(135deg, #0d1916 0%, #132520 52%, #0a110f 100%)",
      decor: (a) =>
        `<rect x="9" y="9" width="382" height="234" rx="15" fill="none" stroke="${a}" stroke-opacity=".38" stroke-width="1"/>` +
        `<circle cx="372" cy="26" r="96" fill="${a}" fill-opacity=".06"/>` +
        `<path d="M214 252C262 160 336 118 400 104" fill="none" stroke="${a}" stroke-opacity=".32" stroke-width="1"/>` +
        `<path d="M246 252C288 172 348 140 400 130" fill="none" stroke="${a}" stroke-opacity=".6" stroke-width="1.3"/>` +
        `<path d="M280 252C312 192 360 166 400 158" fill="none" stroke="${a}" stroke-opacity=".22" stroke-width="1"/>`
    },
    botanical: {
      label: "Botanique",
      hint: "Spa, bien-être, beauté",
      accent: "#6e9c84",
      font: "dmsans",
      ref: "#eef0e6",
      bg: "linear-gradient(140deg, #f7f3e8 0%, #eef0e5 55%, #dfe9e0 100%)",
      decor: (a) => {
        const f = "M0 0C22-26 62-26 86 0C62 26 22 26 0 0Z";
        return (
          `<circle cx="26" cy="236" r="64" fill="#b7d6cf" fill-opacity=".38"/>` +
          `<path d="M286 262C314 204 344 150 386 84" fill="none" stroke="#5f8a73" stroke-opacity=".45" stroke-width="1.6"/>` +
          `<g fill="#9dbfa9" fill-opacity=".5"><path transform="translate(300 214) rotate(-48)" d="${f}"/><path transform="translate(334 150) rotate(-62)" d="${f}"/></g>` +
          `<g fill="${a}" fill-opacity=".42"><path transform="translate(318 186) rotate(-128) scale(.9)" d="${f}"/><path transform="translate(356 110) rotate(-112) scale(.8)" d="${f}"/></g>` +
          `<g fill="#b7d6cf" fill-opacity=".7"><path transform="translate(372 64) rotate(-70) scale(.6)" d="${f}"/></g>`
        );
      }
    },
    celebration: {
      label: "Fête",
      hint: "Anniversaires, cadeaux",
      accent: "#7755e8",
      font: "poppins",
      ref: "#fbf1f7",
      bg: "linear-gradient(135deg, #fff4f1 0%, #fbeffb 50%, #eef4ff 100%)",
      decor: (a) =>
        `<circle cx="364" cy="24" r="72" fill="#f9c3d6" fill-opacity=".75"/>` +
        `<circle cx="24" cy="238" r="58" fill="#cdbdf6" fill-opacity=".6"/>` +
        `<circle cx="258" cy="16" r="20" fill="#bfe2fa" fill-opacity=".95"/>` +
        `<circle cx="210" cy="246" r="26" fill="#ffd3b2" fill-opacity=".8"/>` +
        `<path d="M146 228q9-12 18 0t18 0t18 0" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-opacity=".75"/>` +
        `<g fill="${a}" fill-opacity=".7"><rect x="226" y="58" width="7" height="7" transform="rotate(24 229 61)"/><rect x="372" y="138" width="6" height="6" transform="rotate(-18 375 141)"/><circle cx="330" cy="62" r="3"/></g>` +
        `<g fill="#f59a6b" fill-opacity=".8"><rect x="352" y="96" width="6" height="6" transform="rotate(40 355 99)"/><circle cx="188" cy="30" r="2.6"/></g>`
    },
    moroccan: {
      label: "Marocain",
      hint: "Restaurants, riads, artisanat",
      accent: "#d4af37",
      font: "playfair",
      ref: "#1b342e",
      bg: "linear-gradient(145deg, #1f3a34 0%, #193029 60%, #12251f 100%)",
      decor: (a, uid) =>
        `<defs><pattern id="m${uid}" width="36" height="36" patternUnits="userSpaceOnUse">` +
        `<g fill="none" stroke="${a}" stroke-width="1"><rect x="10" y="10" width="16" height="16"/><rect x="10" y="10" width="16" height="16" transform="rotate(45 18 18)"/><circle cx="18" cy="18" r="3"/></g></pattern>` +
        `<linearGradient id="g${uid}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
        `<mask id="k${uid}"><rect x="170" width="230" height="252" fill="url(#g${uid})"/></mask></defs>` +
        `<rect x="170" width="230" height="252" fill="url(#m${uid})" opacity=".3" mask="url(#k${uid})"/>` +
        `<path d="M316 252V132a42 42 0 0 1 84 0" fill="none" stroke="${a}" stroke-opacity=".5" stroke-width="1.4"/>` +
        `<rect x="9" y="9" width="382" height="234" rx="15" fill="none" stroke="${a}" stroke-opacity=".25"/>`
    },
    ocean: {
      label: "Océan",
      hint: "Voyage, hôtels, expériences",
      accent: "#7fe3d8",
      font: "montserrat",
      ref: "#0e6f8a",
      bg: "linear-gradient(160deg, #0a4a66 0%, #0e7490 55%, #2bb3b1 100%)",
      decor: (a) =>
        `<circle cx="352" cy="46" r="30" fill="#fff" fill-opacity=".13"/>` +
        `<path d="M0 168C80 138 160 198 240 168S360 138 400 158V252H0Z" fill="#fff" fill-opacity=".08"/>` +
        `<path d="M0 194C90 168 170 224 260 194S360 174 400 190V252H0Z" fill="${a}" fill-opacity=".26"/>` +
        `<path d="M0 222C100 200 180 246 280 222S372 206 400 216V252H0Z" fill="#fff" fill-opacity=".12"/>`
    },
    minimal: {
      label: "KADOSK Minimal",
      hint: "Sobre et universel",
      accent: "#7fb5ab",
      font: "inter",
      ref: "#f7faf9",
      bg: "linear-gradient(135deg, #f7faf9 0%, #f7faf9 60%, #eef5f2 100%)",
      decor: (a) =>
        `<circle cx="384" cy="-8" r="118" fill="#b7d6cf" fill-opacity=".5"/>` +
        `<circle cx="318" cy="46" r="34" fill="${a}" fill-opacity=".32"/>` +
        `<rect x="0" y="247" width="400" height="5" fill="${a}"/>`
    }
  };

  // Look historique "couleur" (fond crème + vague d'accent) : rendu à l'identique
  // pour les cartes déjà configurées avant l'éditeur de thèmes.
  const CLASSIQUE = {
    ref: "#fbfbf8",
    bg: "#fbfbf8",
    decor: (a) => `<path d="M-20 252V178Q200 118 420 178V252Z" fill="${a}" fill-opacity=".32"/>`
  };

  // Motifs proposés dans l'éditeur (clés partagées avec carte-visuelle.js et le backend).
  const MOTIFS = [
    ["aucun", "Aucun"],
    ["losanges", "Géométrique"],
    ["organique", "Organique"],
    ["vagues", "Vagues"],
    ["confettis", "Confettis"],
    ["marocain", "Marocain"],
    ["diagonales", "Lignes"],
    ["cercles", "Cercles"]
  ];
  const DENSITES = { fine: "60%", normal: "100%", large: "160%" };

  const POLICES_PRESETS = [
    ["modern", "Moderne", "montserrat"],
    ["elegant", "Élégant", "playfair"],
    ["minimal", "Minimal", "inter"],
    ["playful", "Ludique", "poppins"]
  ];

  const TAILLES_LOGO = ["small", "medium", "large"];

  // --- Couleurs ---------------------------------------------------------------
  function rgb(hex) {
    const v = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  }
  function luminance(hex) {
    const [r, g, b] = rgb(hex).map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contraste(l1, l2) {
    const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (a + 0.05) / (b + 0.05);
  }
  function melanger(h1, h2) {
    const a = rgb(h1), b = rgb(h2);
    return "#" + a.map((v, i) => Math.round((v + b[i]) / 2).toString(16).padStart(2, "0")).join("");
  }
  function hexOuVide(v) {
    const s = String(v || "").trim();
    return HEX.test(s) ? s.toLowerCase() : "";
  }
  function resoudreAccent(v, repli) {
    const h = hexOuVide(v);
    if (h) return h;
    const vis = V();
    if (v && vis) return vis.resoudreAccent(v).base;
    return repli || "#7fb5ab";
  }

  // URL d'image autorisée : https (médias KADOSK/Wix) ou aperçu local blob:.
  function urlSure(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    try {
      const u = new URL(s, window.location.href);
      if (u.protocol === "https:" || u.protocol === "blob:") return u.href;
    } catch (_) { /* ignorée */ }
    return "";
  }

  // --- Normalisation ----------------------------------------------------------
  // Accepte la forme "offre" renvoyée par l'API (champs historiques + design)
  // et renvoie un état complet et sûr.
  function normaliser(source) {
    const o = source || {};
    const ext = o.design && typeof o.design === "object" ? o.design : {};
    const theme = THEMES[ext.theme] ? ext.theme : "";
    const typesFond = ["theme", "couleur", "degrade", "image"];
    let backgroundType = typesFond.includes(o.backgroundType) ? o.backgroundType : "couleur";
    if (backgroundType === "theme" && !theme) backgroundType = "couleur";
    const opacite = Number(ext.patternOpacity);
    const vis = V();
    const police = o.font && vis && vis.POLICES[o.font] ? o.font : (theme ? THEMES[theme].font : "poppins");
    const motif = MOTIFS.some(([k]) => k === o.pattern) || (vis && vis.MOTIFS_LIBELLES[o.pattern]) ? o.pattern : "aucun";
    const angle = Number(o.gradientAngle);
    return {
      theme,
      accentColor: resoudreAccent(o.accentColor, theme ? THEMES[theme].accent : "#8ab6a9"),
      pattern: motif,
      patternOpacity: Number.isFinite(opacite) ? Math.max(0.04, Math.min(0.35, opacite)) : 0.15,
      patternDensity: DENSITES[ext.patternDensity] ? ext.patternDensity : "normal",
      font: police,
      textMode: ["auto", "light", "dark"].includes(ext.textMode) ? ext.textMode : "auto",
      logoSize: TAILLES_LOGO.includes(ext.logoSize) ? ext.logoSize : "medium",
      backgroundType,
      backgroundImageUrl: urlSure(o.backgroundImageUrl),
      gradientFrom: hexOuVide(o.gradientFrom) || "#1f3a34",
      gradientTo: hexOuVide(o.gradientTo) || "#7fb5ab",
      gradientAngle: Number.isFinite(angle) ? Math.max(0, Math.min(360, Math.round(angle))) : 135
    };
  }

  // Forme enregistrable (champs historiques + objet design), sans doublon.
  function versOffre(etat) {
    return {
      accentColor: etat.accentColor,
      pattern: etat.pattern,
      font: etat.font,
      backgroundType: etat.backgroundType,
      backgroundImageUrl: etat.backgroundType === "image" ? etat.backgroundImageUrl : "",
      gradientFrom: etat.backgroundType === "degrade" ? etat.gradientFrom : "",
      gradientTo: etat.backgroundType === "degrade" ? etat.gradientTo : "",
      gradientAngle: etat.gradientAngle,
      design: {
        theme: etat.theme,
        patternOpacity: Math.round(etat.patternOpacity * 100) / 100,
        patternDensity: etat.patternDensity,
        textMode: etat.textMode,
        logoSize: etat.logoSize
      }
    };
  }

  // --- Lisibilité ---------------------------------------------------------------
  // Détermine la couleur du texte et, si nécessaire, un voile de sécurité.
  function lisibilite(etat) {
    let ref = null;
    if (etat.backgroundType === "theme") ref = THEMES[etat.theme].ref;
    else if (etat.backgroundType === "couleur") ref = CLASSIQUE.ref;
    else if (etat.backgroundType === "degrade") ref = melanger(etat.gradientFrom, etat.gradientTo);
    if (!ref) {
      // Image : luminosité inconnue, voile systématique adapté au texte choisi.
      const ton = etat.textMode === "dark" ? "dark" : "light";
      return { ton, voile: ton === "light" ? "sombre" : "clair", ref: null, corrige: false };
    }
    const lFond = luminance(ref);
    const cClair = contraste(lFond, luminance(TEXTE_CLAIR));
    const cSombre = contraste(lFond, luminance(TEXTE_SOMBRE));
    const auto = cClair >= cSombre ? "light" : "dark";
    const ton = etat.textMode === "auto" ? auto : etat.textMode;
    const c = ton === "light" ? cClair : cSombre;
    // Si l'extrémité la plus défavorable d'un dégradé descend sous 3:1, voile léger.
    let pire = c;
    if (etat.backgroundType === "degrade") {
      const lt = luminance(ton === "light" ? TEXTE_CLAIR : TEXTE_SOMBRE);
      pire = Math.min(contraste(luminance(etat.gradientFrom), lt), contraste(luminance(etat.gradientTo), lt));
    }
    let voile = "";
    if (c < 4.5 || pire < 3) voile = ton === "light" ? "sombre" : "clair";
    return { ton, voile, ref, corrige: !!voile };
  }

  // --- QR de démonstration (non fonctionnel) -----------------------------------
  function qrDemo() {
    const n = 21, cases = [];
    const oeil = (x, y) => `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    let graine = 7;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dansOeil = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
        graine = (graine * 1103515245 + 12345) % 2147483648;
        if (!dansOeil && graine % 5 < 2) cases.push(`M${x} ${y}h1v1h-1z`);
      }
    }
    return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true"><g fill="#111">${oeil(0, 0)}${oeil(14, 0)}${oeil(0, 14)}<path d="${cases.join("")}"/></g></svg>`;
  }

  // --- Styles (injectés une seule fois) ----------------------------------------
  function injecterStyles() {
    if (document.getElementById("kd-gc-styles")) return;
    const style = document.createElement("style");
    style.id = "kd-gc-styles";
    style.textContent = `
.kd-gc{--kd-gc-accent:#7fb5ab;--kd-gc-text:#1f3a34;--kd-gc-font:'Poppins',sans-serif;position:relative;display:block;width:100%;max-width:520px;margin:0 auto;aspect-ratio:1.586;container-type:inline-size;border-radius:2.7% / 4.3%;overflow:hidden;isolation:isolate;color:var(--kd-gc-text);font-family:var(--kd-gc-font);box-shadow:0 12px 32px rgba(15,35,30,.16),0 2px 6px rgba(15,35,30,.08);background:#f7faf9;text-align:left;line-height:1.2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kd-gc.kadosk-carte-apercu{border:0;max-width:520px;padding:0}
.kd-gc.kadosk-carte-apercu::before{content:none;display:none}
.kd-gc.k2-carte-statut-active{outline:2px solid #c9a227;outline-offset:-2px}
.kd-gc.k2-carte-statut-redeemed{outline:2px solid #c0392b;outline-offset:-2px}
.kd-gc__bg,.kd-gc__decor,.kd-gc__pattern,.kd-gc__scrim{position:absolute;inset:0;pointer-events:none}
.kd-gc__bg{z-index:0;background-size:cover;background-position:center;transition:background .25s ease}
.kd-gc__decor{z-index:1;width:100%;height:100%}
.kd-gc__pattern{z-index:2;background-repeat:repeat;background-position:center}
.kd-gc__scrim{z-index:3;opacity:0;transition:opacity .2s ease}
.kd-gc[data-voile="sombre"] .kd-gc__scrim{opacity:1;background:linear-gradient(180deg,rgba(8,20,17,.55),rgba(8,20,17,.38) 55%,rgba(8,20,17,.5))}
.kd-gc[data-voile="clair"] .kd-gc__scrim{opacity:1;background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.6) 55%,rgba(255,255,255,.72))}
.kd-gc__content{position:absolute;inset:0;z-index:4;display:grid;grid-template-rows:auto 1fr auto;padding:4.6cqw 5.4cqw 4.2cqw}
.kd-gc__head{display:flex;flex-direction:column;align-items:flex-start;gap:1.1cqw;min-width:0;max-width:62%}
.kd-gc__logo{display:flex;align-items:center;justify-content:center;background:#fff;border-radius:2.2cqw;padding:1.2cqw 1.8cqw;box-shadow:0 1px 4px rgba(0,0,0,.12);height:9cqw;max-width:38cqw;min-width:9cqw;overflow:hidden}
.kd-gc[data-logo="small"] .kd-gc__logo{height:7cqw;max-width:30cqw;min-width:7cqw}
.kd-gc[data-logo="large"] .kd-gc__logo{height:11.5cqw;max-width:46cqw;min-width:11.5cqw}
.kd-gc__logo img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.kd-gc__logo-initiale{font:700 4.6cqw/1 var(--kd-gc-font);color:#1f3a34;letter-spacing:.02em}
.kd-gc__merchant{font-size:3.2cqw;font-weight:600;letter-spacing:.02em;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kd-gc__center{align-self:center;justify-self:center;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1cqw;max-width:62%;padding-top:1.5cqw}
.kd-gc__eyebrow{font-size:2.6cqw;font-weight:700;letter-spacing:.42em;padding-left:.42em;color:var(--kd-gc-eyebrow,var(--kd-gc-accent));display:flex;align-items:center;gap:2cqw;white-space:nowrap}
.kd-gc__eyebrow::before,.kd-gc__eyebrow::after{content:"";width:4.5cqw;height:1px;background:currentColor;opacity:.7}
.kd-gc__amount{font-size:8.6cqw;font-weight:700;line-height:1;white-space:nowrap;letter-spacing:-.01em}
.kd-gc__amount[hidden]{display:none}
.kd-gc__currency{font-size:4.2cqw;font-weight:600;margin-left:.25em;opacity:.9}
.kd-gc__foot{display:flex;align-items:flex-end;justify-content:space-between;gap:3cqw}
.kd-gc__brand{display:inline-flex;align-items:center;gap:1.3cqw;background:rgba(255,255,255,.94);border-radius:1.8cqw;padding:1cqw 1.8cqw;box-shadow:0 1px 3px rgba(0,0,0,.1);opacity:1}
.kd-gc__brand span{font:500 1.9cqw/1 Arial,sans-serif;color:#5b6f69;letter-spacing:.02em;white-space:nowrap}
.kd-gc__brand img{display:block;height:3.4cqw;width:auto;max-width:18cqw}
.kd-gc__qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1cqw;flex:0 0 auto}
.kd-gc .kd-gc__qr.kadosk-carte-apercu-qr-zone,.kd-gc__qr{position:relative;inset:auto;right:auto;bottom:auto;width:18cqw;height:18cqw;aspect-ratio:1/1;background:#fff;border-radius:2cqw;padding:1.6cqw;box-shadow:0 1px 4px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:1;filter:none;mix-blend-mode:normal;box-sizing:border-box}
.kd-gc__qr svg,.kd-gc__qr img,.kd-gc__qr canvas{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.kd-gc__qr button{font-size:1.9cqw!important}
.kd-gc__qr-demo{position:absolute;inset:auto 0 0 0;background:rgba(255,255,255,.92);font:700 1.5cqw/1.5 Arial,sans-serif;letter-spacing:.08em;color:#9a3b3b;text-align:center}
.kd-gc__qr-caption{font-size:1.75cqw;font-weight:500;white-space:nowrap;opacity:.92}
`;
    document.head.appendChild(style);
  }

  // --- Construction / mise à jour -------------------------------------------------
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function construire(racine) {
    injecterStyles();
    racine.classList.add("kd-gc");
    racine.replaceChildren();
    const r = {
      bg: el("div", "kd-gc__bg"),
      decor: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      pattern: el("div", "kd-gc__pattern"),
      scrim: el("div", "kd-gc__scrim"),
      content: el("div", "kd-gc__content"),
      logo: el("div", "kd-gc__logo"),
      merchant: el("div", "kd-gc__merchant"),
      eyebrow: el("div", "kd-gc__eyebrow"),
      amount: el("div", "kd-gc__amount"),
      nombre: el("span", "kadosk-carte-apercu-montant-nombre"),
      devise: el("span", "kd-gc__currency devise"),
      brand: el("div", "kd-gc__brand"),
      qr: el("div", "kd-gc__qr kadosk-carte-apercu-qr-zone"),
      caption: el("span", "kd-gc__qr-caption"),
      uid: ++compteurId
    };
    r.decor.setAttribute("class", "kd-gc__decor");
    r.decor.setAttribute("viewBox", "0 0 400 252");
    r.decor.setAttribute("preserveAspectRatio", "xMidYMid slice");
    r.decor.setAttribute("aria-hidden", "true");
    [r.bg, r.pattern, r.scrim].forEach((c) => c.setAttribute("aria-hidden", "true"));

    const head = el("div", "kd-gc__head");
    head.append(r.logo, r.merchant);
    const center = el("div", "kd-gc__center");
    r.eyebrow.textContent = "CARTE CADEAU";
    r.amount.append(r.nombre, r.devise);
    center.append(r.eyebrow, r.amount);

    // Attribution KADOSK obligatoire : toujours rendue, jamais paramétrable.
    const gere = el("span");
    gere.textContent = "Géré par";
    const logoK = el("img");
    logoK.alt = "KADOSK";
    logoK.decoding = "async";
    r.brand.append(gere, logoK);
    r.logoKadosk = logoK;

    const qrWrap = el("div", "kd-gc__qr-wrap");
    r.caption.textContent = "Scannez pour utiliser cette carte";
    qrWrap.append(r.qr, r.caption);
    const foot = el("div", "kd-gc__foot");
    foot.append(r.brand, qrWrap);

    r.content.append(head, center, foot);
    racine.append(r.bg, r.decor, r.pattern, r.scrim, r.content);
    racine.setAttribute("role", "img");
    racine.__kdGc = r;
    return r;
  }

  function majDonnees(racine, donnees) {
    const r = racine.__kdGc || construire(racine);
    const d = donnees || {};
    const nom = String(d.businessName || "").trim();
    r.merchant.textContent = nom || "Votre commerce";

    const logo = urlSure(d.logoUrl);
    if (logo !== r.logoActuel) {
      r.logoActuel = logo;
      r.logo.replaceChildren();
      if (logo) {
        const img = el("img");
        img.alt = nom ? "Logo " + nom : "Logo du commerce";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.src = logo;
        r.logo.append(img);
      } else {
        const initiale = el("span", "kd-gc__logo-initiale");
        initiale.textContent = (nom || "?").charAt(0).toUpperCase();
        r.logo.append(initiale);
      }
    } else if (!logo) {
      const initiale = r.logo.querySelector(".kd-gc__logo-initiale");
      if (initiale) initiale.textContent = (nom || "?").charAt(0).toUpperCase();
    }

    const montant = d.amount;
    const aMontant = montant !== undefined && montant !== null && montant !== "";
    r.amount.hidden = d.hideAmount === true;
    r.nombre.textContent = aMontant && Number(montant) > 0 ? Number(montant).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—";
    r.devise.textContent = d.currency || "MAD";
    r.logoKadosk.src = d.kadoskLogoSrc || "assets/logo.png";

    if (d.qr === "demo" && !r.qrDemo) {
      r.qrDemo = true;
      r.qr.innerHTML = qrDemo();
      const tag = el("span", "kd-gc__qr-demo");
      tag.textContent = "APERÇU";
      r.qr.append(tag);
    } else if (d.qr === "placeholder" && !r.qr.childNodes.length) {
      const vis = V();
      if (vis) r.qr.innerHTML = vis.HTML_PLACEHOLDER_QR;
    }
    racine.setAttribute("aria-label", "Carte cadeau" + (nom ? " " + nom : ""));
    return r;
  }

  function majDesign(racine, source, estEtat) {
    const r = racine.__kdGc || construire(racine);
    const e = estEtat ? source : normaliser(source);
    const accent = e.accentColor;
    racine.style.setProperty("--kd-gc-accent", accent);

    // Fond + décor
    let bg = "", decor = "";
    if (e.backgroundType === "theme") {
      bg = THEMES[e.theme].bg;
      decor = THEMES[e.theme].decor(accent, r.uid);
    } else if (e.backgroundType === "degrade") {
      bg = `linear-gradient(${e.gradientAngle}deg, ${e.gradientFrom}, ${e.gradientTo})`;
    } else if (e.backgroundType === "image" && e.backgroundImageUrl) {
      bg = `#1f3a34 url("${e.backgroundImageUrl.replace(/["\\\n\r]/g, "")}") center/cover no-repeat`;
    } else {
      bg = CLASSIQUE.bg;
      decor = CLASSIQUE.decor(accent);
    }
    if (r.bgActuel !== bg) { r.bg.style.background = bg; r.bgActuel = bg; }
    if (r.decorActuel !== decor) { r.decor.innerHTML = decor; r.decorActuel = decor; }

    // Lisibilité
    const lis = lisibilite(e);
    const texte = lis.ton === "light" ? TEXTE_CLAIR : TEXTE_SOMBRE;
    racine.style.setProperty("--kd-gc-text", texte);
    racine.dataset.ton = lis.ton;
    racine.dataset.voile = lis.voile || "";
    // Surtitre en accent seulement s'il reste lisible (≥ 3:1), sinon couleur du texte.
    const refEff = lis.voile === "sombre" ? "#0e1c18" : lis.voile === "clair" ? "#f4f6f5" : lis.ref;
    const accentLisible = refEff && contraste(luminance(accent), luminance(refEff)) >= 3;
    racine.style.setProperty("--kd-gc-eyebrow", accentLisible ? accent : texte);

    // Motif (jamais au-dessus du contenu : calque z-index 2 < contenu 4)
    const vis = V();
    const svg = e.pattern !== "aucun" && vis ? vis.motifSvgComplet(e.pattern, lis.ton === "light" ? "#ffffff" : accent, 1) : "";
    const motif = svg ? `url("${vis.svgVersDataUri(svg)}")` : "none";
    if (r.motifActuel !== motif) { r.pattern.style.backgroundImage = motif; r.motifActuel = motif; }
    r.pattern.style.opacity = String(e.patternOpacity * (lis.ton === "light" ? 1.2 : 1.6));
    r.pattern.style.backgroundSize = DENSITES[e.patternDensity];

    // Police
    if (vis && vis.POLICES[e.font]) {
      vis.chargerPolice(e.font);
      racine.style.setProperty("--kd-gc-font", vis.POLICES[e.font].famille);
    }
    racine.dataset.logo = e.logoSize;
    racine.dataset.fond = e.backgroundType;
    return { etat: e, lisibilite: lis };
  }

  // Crée une carte autonome. donnees : {businessName, logoUrl, amount, currency,
  // qr: "demo"|"placeholder"|"none", kadoskLogoSrc}. design : forme "offre".
  function creer(donnees, design) {
    const racine = el("div", "kadosk-carte-apercu");
    construire(racine);
    majDonnees(racine, donnees);
    majDesign(racine, design);
    return racine;
  }

  return {
    THEMES,
    MOTIFS,
    DENSITES,
    POLICES_PRESETS,
    TAILLES_LOGO,
    normaliser,
    versOffre,
    lisibilite,
    creer,
    majDonnees,
    majDesign: (racine, etat) => majDesign(racine, etat, true),
    majDesignOffre: (racine, offre) => majDesign(racine, offre, false),
    hexOuVide
  };
})();
