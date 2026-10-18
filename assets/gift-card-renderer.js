// GiftCardRenderer — rendu unique de la carte cadeau KADOSK. Depuis V3.1 la carte
// a la forme de l'e-mail « Envoi carte cadeau » (format 2:1, titre, montant doré,
// « Le plaisir d'offrir ») : le dessin est délégué à shared/assets/gift-card-template.js,
// copie exacte du gabarit utilisé par le backend pour l'image de l'e-mail.
// Présentation uniquement : ce module ne reçoit jamais de code, PIN, hash ou jeton.
//
// Dépend de KADOSK_CARTE_VISUELLE (polices, couleurs historiques) et de
// KADOSK_CARTE_GABARIT : charger ce fichier après carte-visuelle.js et gift-card-template.js.
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

  // --- Rendu : gabarit SVG partagé avec l'e-mail ------------------------------
  // La carte affichée ici est EXACTEMENT celle envoyée par e-mail (même code,
  // shared/assets/gift-card-template.js <-> backend/giftCardTemplate.js).
  const G = () => window.KADOSK_CARTE_GABARIT || null;

  function injecterStyles() {
    if (document.getElementById("kd-gc-styles")) return;
    const style = document.createElement("style");
    style.id = "kd-gc-styles";
    style.textContent = `
.kd-gc{position:relative;display:block;width:100%;max-width:560px;margin:0 auto;aspect-ratio:2/1;border-radius:3.125%/6.25%;overflow:hidden;box-shadow:0 12px 32px rgba(15,35,30,.16),0 2px 6px rgba(15,35,30,.08);background:#1f3a34;line-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kd-gc.kadosk-carte-apercu{border:0;max-width:560px;padding:0}
.kd-gc.kadosk-carte-apercu::before{content:none;display:none}
.kd-gc>svg{display:block;width:100%;height:100%}
`;
    document.head.appendChild(style);
  }

  function construire(racine) {
    injecterStyles();
    racine.classList.add("kd-gc");
    racine.replaceChildren();
    racine.setAttribute("role", "img");
    const r = { donnees: {}, offre: {}, uid: "e" + (++compteurId) };
    racine.__kdGc = r;
    return r;
  }

  function dessiner(racine) {
    const r = racine.__kdGc;
    const gabarit = G();
    if (!r || !gabarit) return;
    const d = r.donnees;
    const vis = V();
    const police = vis && vis.POLICES[r.offre.font] ? r.offre.font : "poppins";
    if (vis) vis.chargerPolice(police);
    const nom = String(d.businessName || "").trim() || "Votre commerce";
    const svg = gabarit.construireSvg({
      merchantName: nom,
      cardTitle: String(d.cardName || "").trim() || nom,
      amount: d.hideAmount === true ? null : d.amount,
      currency: "DH",
      logoHref: urlSure(d.logoUrl),
      fontFamily: vis && vis.POLICES[police] ? vis.POLICES[police].famille : "'Poppins', sans-serif",
      uid: r.uid,
      design: r.offre
    });
    if (r.svgActuel !== svg) { racine.innerHTML = svg; r.svgActuel = svg; }
    racine.setAttribute("aria-label", "Carte cadeau " + nom);
  }

  function majDonnees(racine, donnees) {
    const r = racine.__kdGc || construire(racine);
    r.donnees = { ...(donnees || {}) };
    dessiner(racine);
    return r;
  }

  function majDesign(racine, source, estEtat) {
    const r = racine.__kdGc || construire(racine);
    const e = estEtat ? source : normaliser(source);
    r.offre = versOffre(e);
    if (e.backgroundType === "image") r.offre.backgroundImageUrl = e.backgroundImageUrl;
    dessiner(racine);
    const gabarit = G();
    const brut = gabarit ? gabarit.lisibilite(gabarit.normaliser(r.offre)) : { ton: "light", voile: "", ref: null };
    const lis = { ...brut, corrige: !!brut.voile && e.backgroundType !== "image" };
    racine.dataset.ton = lis.ton;
    racine.dataset.voile = lis.voile || "";
    racine.dataset.fond = e.backgroundType;
    racine.dataset.logo = e.logoSize;
    return { etat: e, lisibilite: lis };
  }

  // Crée une carte autonome. donnees : {businessName, logoUrl, amount, currency,
  // qr: "demo"|"placeholder"|"none", kadoskLogoSrc}. design : forme "offre".
  function creer(donnees, design) {
    const racine = document.createElement("div");
    racine.className = "kadosk-carte-apercu";
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
