// Certificat cadeau PDF (section 4 de l'audit) - généré CÔTÉ NAVIGATEUR (jsPDF,
// voir la balise <script> CDN dans mes-commandes.html), pour la même raison que
// invoice-pdf.js : le backend Velo classique ne supporte pas de génération PDF
// fiable. VOLONTAIREMENT décoratif : ne contient JAMAIS le code permanent de la
// carte ni de QR d'encaissement - la vraie mécanique de rachat reste le QR
// temporaire anti-rejeu (voir modalQr dans mes-commandes.js) ou le code reçu par
// email à l'activation (activateGiftCardAndSend). Ce PDF sert uniquement de
// support imprimable/partageable. Pour une émission directe explicitement choisie
// par l'owner, carte.code est fourni une seule fois et imprimé dans le document.
const KADOSK_CARTE_CADEAU_PDF = (function () {
  // Couleur d'accent : appuyée sur assets/carte-visuelle.js (même résolution
  // preset/hex que l'aperçu settings.html et la vignette catalogue) - le
  // marchand choisit SA couleur une seule fois, réutilisée ici pour le dégradé
  // du PDF, quel que soit un preset historique ou un hex libre.
  function hexVersRgbTableau(hex) {
    const v = String(hex || "").replace("#", "");
    return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
  }
  const COULEUR_HAUT_DEFAUT = [17, 24, 39];

  // Approximation de police : jsPDF ne sait dessiner qu'avec ses 3 polices
  // intégrées (helvetica/times/courier, chacune normal/bold/italic) - pas de
  // vrai rendu des 6 polices curatées de settings.html sans embarquer des
  // fichiers TTF (lourd, hors scope). On choisit la police intégrée la plus
  // proche de l'esprit de chaque police curatée.
  const POLICE_PDF_PAR_CLE = {
    poppins: { police: "helvetica", styleTitre: "bold", styleTexte: "normal" },
    montserrat: { police: "helvetica", styleTitre: "bold", styleTexte: "normal" },
    raleway: { police: "helvetica", styleTitre: "normal", styleTexte: "normal" },
    playfair: { police: "times", styleTitre: "bolditalic", styleTexte: "italic" },
    pacifico: { police: "times", styleTitre: "italic", styleTexte: "italic" },
    spacemono: { police: "courier", styleTitre: "bold", styleTexte: "normal" }
  };
  function resolvePolicePdf(cle) {
    return POLICE_PDF_PAR_CLE[cle] || POLICE_PDF_PAR_CLE.poppins;
  }

  function formaterDate(valeur) {
    if (!valeur) return "";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    } catch (erreur) {
      return "";
    }
  }

  function formaterMontant(valeur) {
    const montant = Number(valeur);
    if (!Number.isFinite(montant)) return "—";
    // Les espaces insécables produits par Intl ne sont pas pris en charge par
    // les polices intégrées de jsPDF et s'affichaient comme des barres obliques.
    return montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
      .replace(/[\u00a0\u202f]/g, " ");
  }

  // Charge une image distante (logo marchand) en dataURL pour jsPDF.addImage,
  // qui ne sait pas travailler directement avec une URL distante. Best-effort :
  // en cas d'échec (CORS, image absente...), on continue sans logo plutôt que
  // de bloquer tout le téléchargement du certificat.
  function chargerImageEnDataUrl(url) {
    return new Promise((resolve) => {
      if (!url) { resolve(null); return; }
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve({ dataUrl: canvas.toDataURL("image/png"), largeur: img.naturalWidth, hauteur: img.naturalHeight });
          } catch (erreur) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      } catch (erreur) {
        resolve(null);
      }
    });
  }

  // Rastérise un SVG (motif ou icône, voir assets/carte-visuelle.js) en PNG via
  // canvas, pour pouvoir l'insérer avec doc.addImage - jsPDF ne sait pas dessiner
  // de SVG directement. Même technique que chargerImageEnDataUrl ci-dessus, mais
  // à partir d'un SVG inline plutôt que d'une URL distante.
  function rasteriserSvg(svgString, largeurPx, hauteurPx) {
    const VISUELLE = window.KADOSK_CARTE_VISUELLE;
    if (!svgString || !VISUELLE) return Promise.resolve(null);
    return VISUELLE.svgVersDataUrlPng(svgString, largeurPx, hauteurPx);
  }

  async function telecharger(carte) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF non chargé - impossible de générer le PDF.");
      alert("Le générateur de PDF n'a pas pu se charger. Merci de réessayer.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const VISUELLE = window.KADOSK_CARTE_VISUELLE;
    // Format paysage, proportions proches d'une vraie carte cadeau physique.
    const doc = new jsPDF({ unit: "mm", format: [210, 120], orientation: "landscape" });

    // Fond dégradé simulé par bandes (jsPDF ne supporte pas les vrais dégradés
    // sans plugin) - la couleur basse reflète l'accentColor choisie par le
    // marchand dans settings.html (presets historiques OU hex libre désormais -
    // voir assets/carte-visuelle.js, même résolution que l'aperçu éditeur et la
    // vignette catalogue) ; à défaut de choix, on retombe sur "teal".
    const accentResolu = VISUELLE ? VISUELLE.resoudreAccent(carte.accentColor) : { base: "#8ab6a9" };
    const COULEUR_HAUT = COULEUR_HAUT_DEFAUT;
    const COULEUR_BAS = hexVersRgbTableau(accentResolu.base);
    const police = resolvePolicePdf(carte.font);
    const largeur = 210;
    const hauteur = 120;

    const [logoCharge, kadoskLogoCharge, motifCharge, iconeCharge] = await Promise.all([
      chargerImageEnDataUrl(carte.logoUrl),
      chargerImageEnDataUrl("assets/logo.png"),
      // Motif de fond : blanc semi-transparent, superposé au dégradé (mêmes
      // clés que MOTIFS_CARTE_VALIDES côté backend).
      VISUELLE && carte.pattern && carte.pattern !== "aucun"
        ? rasteriserSvg(VISUELLE.motifSvgComplet(carte.pattern, "#ffffff", 0.16), 1200, 686)
        : Promise.resolve(null),
      // Icône d'activité : badge décoratif haut-gauche (mêmes clés que
      // ICONES_ACTIVITE_VALIDES côté backend).
      VISUELLE
        ? rasteriserSvg(VISUELLE.iconeSvgComplet(carte.activityIcon || "cadeau", accentResolu.base), 160, 160)
        : Promise.resolve(null)
    ]);

    const etapes = 40;
    for (let i = 0; i < etapes; i++) {
      const t = i / (etapes - 1);
      const r = Math.round(COULEUR_HAUT[0] + (COULEUR_BAS[0] - COULEUR_HAUT[0]) * t);
      const g = Math.round(COULEUR_HAUT[1] + (COULEUR_BAS[1] - COULEUR_HAUT[1]) * t);
      const b = Math.round(COULEUR_HAUT[2] + (COULEUR_BAS[2] - COULEUR_HAUT[2]) * t);
      doc.setFillColor(r, g, b);
      doc.rect(0, (hauteur / etapes) * i, largeur, hauteur / etapes + 0.5, "F");
    }

    // Motif de fond en surimpression (voir Promise.all ci-dessus) - plein cadre,
    // sous le texte et les badges.
    if (motifCharge) {
      try {
        doc.addImage(motifCharge, "PNG", 0, 0, largeur, hauteur);
      } catch (erreur) {
        console.error("Motif de fond ignoré (échec addImage) :", erreur);
      }
    }

    // Badge icône d'activité, haut-gauche : médaillon blanc (cohérent avec le
    // médaillon logo marchand à droite), remplace l'ancien texte "KADOSK" - le
    // vrai logo KADOSK est maintenant épinglé en bas à gauche (voir plus bas),
    // exactement comme sur l'aperçu web (.kadosk-carte-apercu-logo-kadosk).
    if (iconeCharge) {
      try {
        const cote = 16;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 8, cote, cote, 2, 2, "F");
        const marge = 3;
        doc.addImage(iconeCharge, "PNG", 14 + marge, 8 + marge, cote - marge * 2, cote - marge * 2);
      } catch (erreur) {
        console.error("Icône d'activité ignorée (échec addImage) :", erreur);
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(230, 230, 240);
    doc.text("CARTE CADEAU", 14 + (iconeCharge ? 20 : 0), 14);

    // Logo marchand (settings.html > GiftCardLogoUrl) en haut à droite, dans un
    // médaillon blanc pour rester lisible quel que soit l'accentColor choisi.
    if (logoCharge && logoCharge.dataUrl) {
      try {
        const cote = 18;
        const cx = largeur - 14 - cote;
        const cy = 8;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx, cy, cote, cote, 2, 2, "F");
        const ratio = logoCharge.largeur / logoCharge.hauteur;
        let w = cote - 4;
        let h = w / ratio;
        if (h > cote - 4) { h = cote - 4; w = h * ratio; }
        doc.addImage(logoCharge.dataUrl, "PNG", cx + (cote - w) / 2, cy + (cote - h) / 2, w, h);
      } catch (erreur) {
        console.error("Logo marchand ignoré (échec addImage) :", erreur);
      }
    }

    doc.setFont(police.police, police.styleTitre);
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(carte.businessName || "—", 14, 45);

    doc.setFont(police.police, police.styleTitre);
    doc.setFontSize(34);
    doc.text(formaterMontant(carte.amount) + " DH", 14, 65);

    doc.setFont(police.police, police.styleTexte);
    doc.setFontSize(10);
    doc.setTextColor(230, 230, 240);
    let yInfos = 78;
    if (!carte.forSelf && carte.recipientName) {
      doc.text("À l'attention de : " + carte.recipientName, 14, yInfos);
      yInfos += 6;
    }
    if (carte.message) {
      const lignesMessage = doc.splitTextToSize(carte.message, 120);
      doc.text(lignesMessage, 14, yInfos);
      yInfos += lignesMessage.length * 5;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(210, 210, 225);
    const infosBas = [];
    if (carte.expirationDate) infosBas.push("Valable jusqu'au " + formaterDate(carte.expirationDate));
    infosBas.push("Réf. commande : " + (carte.orderNumber || "—"));
    doc.text(infosBas.join("   ·   "), 14, Math.max(yInfos + 4, 84));

    if (carte.code) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(68, 92, 126, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 95);
      doc.text("CODE PERMANENT - UTILISABLE EN MAGASIN", 131, 98, { align: "center" });
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 25);
      doc.text(String(carte.code), 131, 105, { align: "center" });
    }

    // Logo KADOSK épinglé en bas à gauche, dans un médaillon blanc - exactement
    // la même position que .kadosk-carte-apercu-logo-kadosk sur l'aperçu web
    // (settings.html), pour que le certificat PDF corresponde à ce que le
    // marchand a validé dans son aperçu.
    const badgeL = 46;
    const badgeH = 16;
    const badgeX = 12;
    const badgeY = hauteur - 12 - badgeH;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(badgeX, badgeY, badgeL, badgeH, 2, 2, "F");
    if (kadoskLogoCharge && kadoskLogoCharge.dataUrl) {
      try {
        const h = badgeH - 8;
        const ratio = kadoskLogoCharge.largeur / kadoskLogoCharge.hauteur;
        const w = Math.min(h * ratio, badgeL - 8);
        doc.addImage(kadoskLogoCharge.dataUrl, "PNG", badgeX + 4, badgeY + 3, w, h);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.2);
        doc.setTextColor(107, 101, 128);
        doc.text("GÉRÉ PAR KADOSK", badgeX + 4, badgeY + badgeH - 2.5);
      } catch (erreur) {
        console.error("Logo KADOSK ignoré (échec addImage) :", erreur);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 39, 35);
        doc.text("KADOSK", badgeX + 4, badgeY + badgeH / 2 + 1.5);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 39, 35);
      doc.text("KADOSK", badgeX + 4, badgeY + badgeH / 2 + 1.5);
    }

    doc.save("Carte-cadeau-" + (carte.businessName || "KADOSK").replace(/[^a-z0-9]+/gi, "-") + ".pdf");
  }

  return { telecharger };
})();
