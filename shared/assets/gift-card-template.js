// Gabarit SVG de la carte cadeau (forme de l'e-mail), côté navigateur.
// Copie identique : 02-WIX-VELO/backend/giftCardTemplate.js.
window.KADOSK_CARTE_GABARIT = (function () {
  "use strict";
// ---- DEBUT DU GABARIT PARTAGE (copie identique navigateur / backend Velo) ----
// Forme unique de la carte cadeau KADOSK : celle de l'e-mail « Envoi carte
// cadeau » (VSH1cpD). L'éditeur marchand affiche exactement ce SVG et le
// backend génère le même SVG pour cardFrontImageUrl. Toute modification doit
// être faite dans les deux fichiers (vérifié par 03-VERIFICATION/verify-release.py).
const GC_LARGEUR = 640;
const GC_HAUTEUR = 320;
const GC_TEXTE_CLAIR = "#ffffff";
const GC_TEXTE_SOMBRE = "#1f3a34";
const GC_OR = "#f5dfa4";
const GC_PRESETS_ACCENT = {
  teal: { base: "#8ab6a9", fonce: "#4f7a6c" },
  violet: { base: "#6c4ce0", fonce: "#4b2fb3" },
  orange: { base: "#f5a623", fonce: "#b06b00" },
  bleu: { base: "#2f80ed", fonce: "#1f5fc0" },
  rose: { base: "#e0629c", fonce: "#a83f74" }
};
// Fonds des thèmes en dégradés SVG (équivalents des fonds CSS de l'éditeur) ;
// décor dessiné dans un repère 400x252 puis mis à l'échelle de la carte.
const GC_THEMES = {
  luxury: { ref: "#13241f", angle: 135, stops: [["#0d1916", 0], ["#132520", 0.52], ["#0a110f", 1]],
    decor: (a) => `<rect x="9" y="9" width="382" height="234" rx="15" fill="none" stroke="${a}" stroke-opacity=".38" stroke-width="1"/><circle cx="372" cy="26" r="96" fill="${a}" fill-opacity=".06"/><path d="M214 252C262 160 336 118 400 104" fill="none" stroke="${a}" stroke-opacity=".32" stroke-width="1"/><path d="M246 252C288 172 348 140 400 130" fill="none" stroke="${a}" stroke-opacity=".6" stroke-width="1.3"/><path d="M280 252C312 192 360 166 400 158" fill="none" stroke="${a}" stroke-opacity=".22" stroke-width="1"/>` },
  botanical: { ref: "#eef0e6", angle: 140, stops: [["#f7f3e8", 0], ["#eef0e5", 0.55], ["#dfe9e0", 1]],
    decor: (a) => { const f = "M0 0C22-26 62-26 86 0C62 26 22 26 0 0Z"; return `<circle cx="26" cy="236" r="64" fill="#b7d6cf" fill-opacity=".38"/><path d="M286 262C314 204 344 150 386 84" fill="none" stroke="#5f8a73" stroke-opacity=".45" stroke-width="1.6"/><g fill="#9dbfa9" fill-opacity=".5"><path transform="translate(300 214) rotate(-48)" d="${f}"/><path transform="translate(334 150) rotate(-62)" d="${f}"/></g><g fill="${a}" fill-opacity=".42"><path transform="translate(318 186) rotate(-128) scale(.9)" d="${f}"/><path transform="translate(356 110) rotate(-112) scale(.8)" d="${f}"/></g><g fill="#b7d6cf" fill-opacity=".7"><path transform="translate(372 64) rotate(-70) scale(.6)" d="${f}"/></g>`; } },
  celebration: { ref: "#fbf1f7", angle: 135, stops: [["#fff4f1", 0], ["#fbeffb", 0.5], ["#eef4ff", 1]],
    decor: (a) => `<circle cx="364" cy="24" r="72" fill="#f9c3d6" fill-opacity=".75"/><circle cx="24" cy="238" r="58" fill="#cdbdf6" fill-opacity=".6"/><circle cx="258" cy="16" r="20" fill="#bfe2fa" fill-opacity=".95"/><circle cx="210" cy="246" r="26" fill="#ffd3b2" fill-opacity=".8"/><path d="M146 228q9-12 18 0t18 0t18 0" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-opacity=".75"/><g fill="${a}" fill-opacity=".7"><rect x="226" y="58" width="7" height="7" transform="rotate(24 229 61)"/><rect x="372" y="138" width="6" height="6" transform="rotate(-18 375 141)"/><circle cx="330" cy="62" r="3"/></g>` },
  moroccan: { ref: "#1b342e", angle: 145, stops: [["#1f3a34", 0], ["#193029", 0.6], ["#12251f", 1]],
    decor: (a, u) => `<defs><pattern id="gcm${u}" width="36" height="36" patternUnits="userSpaceOnUse"><g fill="none" stroke="${a}" stroke-width="1"><rect x="10" y="10" width="16" height="16"/><rect x="10" y="10" width="16" height="16" transform="rotate(45 18 18)"/><circle cx="18" cy="18" r="3"/></g></pattern></defs><rect x="170" width="230" height="252" fill="url(#gcm${u})" opacity=".22"/><path d="M316 252V132a42 42 0 0 1 84 0" fill="none" stroke="${a}" stroke-opacity=".5" stroke-width="1.4"/><rect x="9" y="9" width="382" height="234" rx="15" fill="none" stroke="${a}" stroke-opacity=".25"/>` },
  ocean: { ref: "#0e6f8a", angle: 160, stops: [["#0a4a66", 0], ["#0e7490", 0.55], ["#2bb3b1", 1]],
    decor: (a) => `<circle cx="352" cy="46" r="30" fill="#fff" fill-opacity=".13"/><path d="M0 168C80 138 160 198 240 168S360 138 400 158V252H0Z" fill="#fff" fill-opacity=".08"/><path d="M0 194C90 168 170 224 260 194S360 174 400 190V252H0Z" fill="${a}" fill-opacity=".26"/><path d="M0 222C100 200 180 246 280 222S372 206 400 216V252H0Z" fill="#fff" fill-opacity=".12"/>` },
  minimal: { ref: "#f7faf9", angle: 135, stops: [["#f7faf9", 0], ["#f7faf9", 0.6], ["#eef5f2", 1]],
    decor: (a) => `<circle cx="384" cy="-8" r="118" fill="#b7d6cf" fill-opacity=".5"/><circle cx="318" cy="46" r="34" fill="${a}" fill-opacity=".32"/><rect x="0" y="247" width="400" height="5" fill="${a}"/>` }
};
// Motifs : mêmes clés que carte-visuelle.js et MOTIFS_CARTE_VALIDES (backend).
const GC_MOTIFS = {
  points: (c, id, t) => `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="${t}"><circle cx="4" cy="4" r="2.4" fill="${c}"/></pattern>`,
  vagues: (c, id, t) => `<pattern id="${id}" width="60" height="24" patternUnits="userSpaceOnUse" patternTransform="${t}"><path d="M0 12 Q15 0 30 12 T60 12" fill="none" stroke="${c}" stroke-width="2.4"/></pattern>`,
  diagonales: (c, id, t) => `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="${t} rotate(35)"><rect x="0" y="0" width="6" height="18" fill="${c}"/></pattern>`,
  cercles: (c, id, t) => `<pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="${t}"><circle cx="24" cy="24" r="18" fill="none" stroke="${c}" stroke-width="2"/><circle cx="24" cy="24" r="9" fill="none" stroke="${c}" stroke-width="2"/></pattern>`,
  losanges: (c, id, t) => `<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="${t}"><path d="M16 2 L30 16 L16 30 L2 16 Z" fill="none" stroke="${c}" stroke-width="2"/></pattern>`,
  grille: (c, id, t) => `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="${t}"><path d="M22 0 L0 0 L0 22" fill="none" stroke="${c}" stroke-width="1.4"/></pattern>`,
  confettis: (c, id, t) => `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="${t}"><circle cx="6" cy="8" r="2" fill="${c}"/><rect x="22" y="4" width="5" height="5" fill="${c}" transform="rotate(20 24.5 6.5)"/><path d="M14 26 L18 34 L10 34 Z" fill="${c}"/><circle cx="33" cy="24" r="1.6" fill="${c}"/></pattern>`,
  organique: (c, id, t) => `<pattern id="${id}" width="64" height="48" patternUnits="userSpaceOnUse" patternTransform="${t}"><path d="M8 30C14 16 28 14 34 22C40 30 30 40 20 38C12 36 6 38 8 30Z" fill="${c}"/><path d="M42 10C50 4 60 8 58 16C56 22 46 22 42 18" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></pattern>`,
  marocain: (c, id, t) => `<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="${t}"><g fill="none" stroke="${c}" stroke-width="1.4"><rect x="10" y="10" width="16" height="16"/><rect x="10" y="10" width="16" height="16" transform="rotate(45 18 18)"/></g></pattern>`
};
const GC_DENSITES = { fine: 0.6, normal: 1, large: 1.6 };
const GC_LOGOS = { small: [84, 54], medium: [104, 68], large: [132, 84] };

function gcHex(v) {
  const s = String(v || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(s) ? s : "";
}
function gcRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function gcAssombrir(hex, f) {
  return "#" + gcRgb(hex).map((c) => Math.max(0, Math.min(255, Math.round(c * (1 - f)))).toString(16).padStart(2, "0")).join("");
}
function gcMelanger(a, b) {
  const x = gcRgb(a), y = gcRgb(b);
  return "#" + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, "0")).join("");
}
function gcLuminance(hex) {
  const [r, g, b] = gcRgb(hex).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function gcContraste(h1, h2) {
  const a = gcLuminance(h1), b = gcLuminance(h2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function gcAccent(v) {
  const s = String(v || "").trim().toLowerCase();
  if (GC_PRESETS_ACCENT[s]) return GC_PRESETS_ACCENT[s];
  const h = gcHex(s);
  return h ? { base: h, fonce: gcAssombrir(h, 0.32) } : GC_PRESETS_ACCENT.teal;
}
function gcXml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}
function gcLignesTitre(titre, maxLignes, maxCar) {
  const mots = String(titre || "").trim().split(/\s+/).filter(Boolean);
  const lignes = [];
  let ligne = "", places = 0;
  for (const mot of mots) {
    const essai = ligne ? ligne + " " + mot : mot;
    if (essai.length > maxCar && ligne) {
      lignes.push(ligne);
      if (lignes.length === maxLignes) break;
      ligne = mot;
    } else ligne = essai;
    places++;
  }
  if (lignes.length < maxLignes && ligne) lignes.push(ligne);
  if (places < mots.length && lignes.length) {
    const d = lignes[lignes.length - 1];
    lignes[lignes.length - 1] = d.length > maxCar - 1 ? d.slice(0, maxCar - 1) + "…" : d + "…";
  }
  return lignes.length ? lignes : [""];
}
function gcMontant(v) {
  if (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0) return "—";
  return String(Math.round(Number(v) * 100) / 100);
}

// Normalise un design (forme « offre » : champs historiques + objet design).
function gcNormaliserDesign(d) {
  const o = d || {};
  const ext = o.design && typeof o.design === "object" ? o.design : {};
  const theme = GC_THEMES[ext.theme] ? ext.theme : "";
  let type = ["couleur", "degrade", "image", "theme"].includes(o.backgroundType) ? o.backgroundType : "couleur";
  if (type === "theme" && !theme) type = "couleur";
  const op = Number(ext.patternOpacity);
  const angle = Number(o.gradientAngle);
  return {
    type, theme,
    accent: gcAccent(o.accentColor),
    from: gcHex(o.gradientFrom) || "#1f3a34",
    to: gcHex(o.gradientTo) || "#7fb5ab",
    angle: Number.isFinite(angle) ? Math.max(0, Math.min(360, Math.round(angle))) : 135,
    image: String(o.backgroundImageHref || o.backgroundImageUrl || ""),
    motif: GC_MOTIFS[o.pattern] ? o.pattern : "",
    opacite: Number.isFinite(op) ? Math.max(0.04, Math.min(0.35, op)) : 0.15,
    densite: GC_DENSITES[ext.patternDensity] || 1,
    texte: ["light", "dark"].includes(ext.textMode) ? ext.textMode : "auto",
    logo: GC_LOGOS[ext.logoSize] || GC_LOGOS.medium
  };
}

// Couleur du texte et voile de lisibilité (contraste WCAG).
function gcLisibilite(e) {
  let ref = null;
  if (e.type === "couleur") ref = e.accent.fonce;
  else if (e.type === "degrade") ref = gcMelanger(e.from, e.to);
  else if (e.type === "theme") ref = GC_THEMES[e.theme].ref;
  if (!ref || (e.type === "image" && !e.image)) {
    const ton = e.texte === "dark" ? "dark" : "light";
    return { ton, voile: ton === "light" ? "sombre" : "clair", ref: null };
  }
  const cClair = gcContraste(ref, GC_TEXTE_CLAIR), cSombre = gcContraste(ref, GC_TEXTE_SOMBRE);
  const ton = e.texte === "auto" ? (cClair >= cSombre ? "light" : "dark") : e.texte;
  const texte = ton === "light" ? GC_TEXTE_CLAIR : GC_TEXTE_SOMBRE;
  let pire = gcContraste(ref, texte);
  if (e.type === "degrade") pire = Math.min(gcContraste(e.from, texte), gcContraste(e.to, texte));
  const voile = gcContraste(ref, texte) < 4.5 || pire < 3 ? (ton === "light" ? "sombre" : "clair") : "";
  return { ton, voile, ref };
}

// p : { merchantName, cardTitle, amount, currency, logoHref, fontFamily, uid, design, qrCode? }
function construireSvgCarteCadeau(p) {
  const e = gcNormaliserDesign(p.design);
  const lis = gcLisibilite(e);
  const u = String(p.uid || "0").replace(/[^a-z0-9]/gi, "");
  const L = GC_LARGEUR, H = GC_HAUTEUR;
  const clair = lis.ton === "light";
  const texte = clair ? GC_TEXTE_CLAIR : GC_TEXTE_SOMBRE;
  const fondRef = lis.voile === "sombre" ? "#0e1c18" : lis.voile === "clair" ? "#f4f6f5" : lis.ref;
  const or = clair ? GC_OR : (fondRef && gcContraste(e.accent.fonce, fondRef) >= 3 ? e.accent.fonce : GC_TEXTE_SOMBRE);
  const police = gcXml(p.fontFamily || "'Poppins', Arial, sans-serif");
  const sans = "Arial, Helvetica, sans-serif";
  const nom = String(p.merchantName || "").trim();
  const defs = [`<clipPath id="gcc${u}"><rect width="${L}" height="${H}" rx="20"/></clipPath>`];
  const calques = [];

  // Fond
  const degrade = (stops, angle) => {
    const a = (angle * Math.PI) / 180, dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
    const f = (n) => (Math.round(n * 1000) / 1000);
    defs.push(`<linearGradient id="gcf${u}" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}">` +
      stops.map(([c, o]) => `<stop offset="${o}" stop-color="${c}"/>`).join("") + `</linearGradient>`);
    return `<rect width="${L}" height="${H}" fill="url(#gcf${u})"/>`;
  };
  if (e.type === "degrade") calques.push(degrade([[e.from, 0], [e.to, 1]], e.angle));
  else if (e.type === "theme") calques.push(degrade(GC_THEMES[e.theme].stops, GC_THEMES[e.theme].angle));
  else if (e.type === "image" && e.image) {
    calques.push(`<rect width="${L}" height="${H}" fill="#1f3a34"/>`);
    calques.push(`<image href="${gcXml(e.image)}" xlink:href="${gcXml(e.image)}" x="0" y="0" width="${L}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`);
  } else calques.push(`<rect width="${L}" height="${H}" fill="${e.accent.fonce}"/>`);

  // Décor : celui du thème, sinon la diagonale signature de l'e-mail.
  if (e.type === "theme") calques.push(`<g transform="scale(${L / 400} ${H / 252})">${GC_THEMES[e.theme].decor(e.accent.base, u)}</g>`);
  else calques.push(`<polygon points="470,0 ${L},0 ${L},${H} 340,${H}" fill="${e.accent.base}" opacity="0.18"/>`);

  // Motif (sous le texte)
  if (e.motif) {
    defs.push(GC_MOTIFS[e.motif](clair ? "#ffffff" : e.accent.base, "gcp" + u, `scale(${e.densite})`));
    const op = Math.min(0.6, e.opacite * (clair ? 1.2 : 1.6));
    calques.push(`<rect width="${L}" height="${H}" fill="url(#gcp${u})" opacity="${Math.round(op * 100) / 100}"/>`);
  }
  // Voile de lisibilité
  if (lis.voile === "sombre") calques.push(`<rect width="${L}" height="${H}" fill="#08141a" opacity="0.42"/>`);
  else if (lis.voile === "clair") calques.push(`<rect width="${L}" height="${H}" fill="#ffffff" opacity="0.62"/>`);

  // Logo du commerce (ou nom) en haut à gauche
  const [lw, lh] = e.logo;
  if (p.logoHref) {
    calques.push(`<rect x="32" y="28" width="${lw}" height="${lh}" rx="12" fill="#ffffff"/>` +
      `<image href="${gcXml(p.logoHref)}" xlink:href="${gcXml(p.logoHref)}" x="44" y="40" width="${lw - 24}" height="${lh - 24}" preserveAspectRatio="xMidYMid meet"/>`);
  } else {
    calques.push(`<text x="32" y="62" font-family="${sans}" font-size="20" font-weight="700" fill="${texte}">${gcXml(nom)}</text>`);
  }
  const yLabel = Math.max(128, 28 + lh + 30);
  const lignes = gcLignesTitre(p.cardTitle || nom || "Carte cadeau", 2, 20);
  const yTitre = yLabel + 48;
  const yMontant = Math.min(H - 48, yTitre + (lignes.length - 1) * 40 + 60);
  calques.push(`<text x="${L - 32}" y="44" text-anchor="end" font-family="${sans}" font-size="11" letter-spacing="3" fill="${texte}" opacity="0.85">LE PLAISIR D’OFFRIR</text>`);
  calques.push(`<text x="32" y="${yLabel}" font-family="${sans}" font-size="11" letter-spacing="3" fill="${texte}">${gcXml(("CARTE CADEAU · " + nom).toUpperCase())}</text>`);
  calques.push(`<text x="32" y="${yTitre}" font-family="${police}" font-size="34" font-weight="700" fill="${texte}">` +
    lignes.map((l, i) => `<tspan x="32" dy="${i ? 40 : 0}">${gcXml(l)}</tspan>`).join("") + `</text>`);
  calques.push(`<text x="32" y="${yMontant}" font-family="${sans}" font-size="34" font-weight="700" fill="${or}">${gcXml(gcMontant(p.amount))}<tspan font-size="16" dx="4">${gcXml(p.currency || "DH")}</tspan></text>`);
  calques.push(`<text x="32" y="${H - 18}" font-family="${sans}" font-size="11" fill="${texte}" opacity="0.85">Une attention qui fait toute la différence.</text>`);
  calques.push(`<text x="${L - 32}" y="${H - 18}" text-anchor="end" font-family="${sans}" font-size="10" letter-spacing="1" fill="${texte}" opacity="0.7">GÉRÉ PAR KADOSK</text>`);
  // QR du code permanent (e-mail uniquement) : scanné à la caisse, puis le client saisit son PIN.
  if (p.qrCode) {
    calques.push(gcQrSvg(p.qrCode, L - 136, 124, 104));
    calques.push(`<text x="${L - 84}" y="244" text-anchor="middle" font-family="${sans}" font-size="9" letter-spacing="1" fill="${texte}" opacity="0.85">SCANNER À LA CAISSE</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-label="${gcXml("Carte cadeau " + nom)}">` +
    `<defs>${defs.join("")}</defs><g clip-path="url(#gcc${u})">${calques.join("")}</g></svg>`;
}
// QR code (mode octet, correction M, versions 1 à 10) pour le code PERMANENT de
// la carte, lu par le scanner de la caisse. Aucune dépendance externe.
function gcQrMatrice(texte) {
  const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLOCS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const octets = Array.from(unescape(encodeURIComponent(String(texte))), (c) => c.charCodeAt(0));
  const modulesBruts = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const nbDonnees = (v) => Math.floor(modulesBruts(v) / 8) - ECC[v] * BLOCS[v];
  let v = 1;
  while (v <= 10 && 4 + (v < 10 ? 8 : 16) + 8 * octets.length > nbDonnees(v) * 8) v++;
  if (v > 10) throw new Error("QR_TROP_LONG");
  const bits = [];
  const ajout = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  ajout(4, 4); ajout(octets.length, v < 10 ? 8 : 16); octets.forEach((b) => ajout(b, 8));
  const capacite = nbDonnees(v) * 8;
  ajout(0, Math.min(4, capacite - bits.length)); ajout(0, (8 - (bits.length % 8)) % 8);
  for (let p = 0xec; bits.length < capacite; p ^= 0xec ^ 0x11) ajout(p, 8);
  const donnees = [];
  for (let i = 0; i < bits.length; i += 8) { let x = 0; for (let j = 0; j < 8; j++) x = (x << 1) | bits[i + j]; donnees.push(x); }
  const mult = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; };
  const diviseur = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let racine = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = mult(r[j], racine); if (j + 1 < deg) r[j] ^= r[j + 1]; } racine = mult(racine, 2); } return r; };
  const reste = (data, div) => { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mult(c, f); }); } return r; };
  const nb = BLOCS[v], eccLg = ECC[v], brut = Math.floor(modulesBruts(v) / 8), nbCourts = nb - (brut % nb), lgCourt = Math.floor(brut / nb), div = diviseur(eccLg);
  const blocs = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = donnees.slice(k, k + lgCourt - eccLg + (i < nbCourts ? 0 : 1)); k += dat.length;
    const ecc = reste(dat, div); if (i < nbCourts) dat.push(0); blocs.push(dat.concat(ecc));
  }
  const final = [];
  for (let i = 0; i < blocs[0].length; i++) blocs.forEach((b, j) => { if (i !== lgCourt - eccLg || j >= nbCourts) final.push(b[i]); });

  const taille = v * 4 + 17;
  const m = Array.from({ length: taille }, () => new Array(taille).fill(false));
  const f = Array.from({ length: taille }, () => new Array(taille).fill(false));
  const fixe = (x, y, noir) => { m[y][x] = noir; f[y][x] = true; };
  for (let i = 0; i < taille; i++) { fixe(6, i, i % 2 === 0); fixe(i, 6, i % 2 === 0); }
  [[3, 3], [taille - 4, 3], [3, taille - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < taille && y >= 0 && y < taille) fixe(x, y, d !== 2 && d !== 4);
    }
  });
  if (v > 1) {
    const n = Math.floor(v / 7) + 2, pas = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, pos = [6];
    for (let p = taille - 7; pos.length < n; p -= pas) pos.splice(1, 0, p);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fixe(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const format = (masque) => {
    const data = masque; // niveau M = 00
    let r = data; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((data << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) fixe(8, i, bit(i));
    fixe(8, 7, bit(6)); fixe(8, 8, bit(7)); fixe(7, 8, bit(8));
    for (let i = 9; i < 15; i++) fixe(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) fixe(taille - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) fixe(8, taille - 15 + i, bit(i));
    fixe(8, taille - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const noir = ((b >>> i) & 1) === 1, a = taille - 11 + (i % 3), c = Math.floor(i / 3); fixe(a, c, noir); fixe(c, a, noir); }
  }
  let k = 0;
  for (let droite = taille - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5;
    for (let vert = 0; vert < taille; vert++) for (let j = 0; j < 2; j++) {
      const x = droite - j, montant = ((droite + 1) & 2) === 0, y = montant ? taille - 1 - vert : vert;
      if (!f[y][x] && k < final.length * 8) { m[y][x] = ((final[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  const MASQUES = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  const appliquer = (n) => { for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) if (!f[y][x] && MASQUES[n](x, y)) m[y][x] = !m[y][x]; };
  const penalite = () => {
    let p = 0, noirs = 0;
    for (let y = 0; y < taille; y++) for (const sens of [0, 1]) {
      let suite = 1;
      for (let x = 1; x < taille; x++) {
        const a = sens ? m[x][y] : m[y][x], b = sens ? m[x - 1][y] : m[y][x - 1];
        if (a === b) { suite++; if (suite === 5) p += 3; else if (suite > 5) p++; } else suite = 1;
      }
    }
    for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) {
      if (m[y][x]) noirs++;
      if (x < taille - 1 && y < taille - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
    return p + Math.floor(Math.abs(noirs * 20 - taille * taille * 10) / (taille * taille)) * 10;
  };
  let meilleur = 0, score = Infinity;
  for (let n = 0; n < 8; n++) { appliquer(n); format(n); const s = penalite(); if (s < score) { score = s; meilleur = n; } appliquer(n); }
  appliquer(meilleur); format(meilleur);
  return m;
}

// Bloc SVG (fond blanc + modules) d'un QR placé en (x, y) sur un carré de « cote ».
function gcQrSvg(texte, x, y, cote) {
  const m = gcQrMatrice(texte), n = m.length, marge = 2, pas = cote / (n + marge * 2);
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) d += "M" + (c + marge) + " " + (r + marge) + "h1v1h-1z";
  return `<rect x="${x}" y="${y}" width="${cote}" height="${cote}" rx="10" fill="#ffffff"/>` +
    `<path transform="translate(${x} ${y}) scale(${Math.round(pas * 10000) / 10000})" d="${d}" fill="#111111" shape-rendering="crispEdges"/>`;
}
// ---- FIN DU GABARIT PARTAGE ----
  return { construireSvg: construireSvgCarteCadeau, normaliser: gcNormaliserDesign, lisibilite: gcLisibilite, LARGEUR: GC_LARGEUR, HAUTEUR: GC_HAUTEUR };
})();
