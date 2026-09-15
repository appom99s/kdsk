// Génération de la facture mensuelle KADOSK -> marchand (régime auto-entrepreneur,
// exonéré de TVA - Art 91-II-1° du CGI) en PDF, entièrement CÔTÉ NAVIGATEUR (jsPDF,
// chargé en CDN par la page hôte - voir la balise <script> dans finance.html/
// admin-finance.html). Reproduit fidèlement le modèle papier fourni : vrai logo
// bilingue "Auto-entrepreneur" (voir assets/kadosk-ae-logo.js, extrait du modèle
// et embarqué en base64 - jsPDF côté navigateur ne peut pas charger une image
// depuis un fichier local), date, numéro de facture encadré, Client/Adresse,
// tableau 4 colonnes à EXACTEMENT 2 lignes (Commissions du mois + Abonnement),
// ligne "Montant en dirhams exonéré de la TVA / Total Net à payer", montant en
// toutes lettres, Signature, puis le bloc fixe des mentions légales
// Auto-Entrepreneur de KADOSK en bas de la page 1.
// À PARTIR DE LA PAGE 2 : l'arrêté détaillé de TOUTES les transactions de
// commission du mois (REF CMD / date / montant payé par le client / commission),
// qui composent le total "Commissions du mois" de la page 1.
// Les montants viennent TOUJOURS de la facture déjà figée côté serveur
// (genererOuRecupererFactureMensuelleAdmin) - ce module ne fait que les mettre
// en page, il ne recalcule jamais rien.
const KADOSK_FACTURE_PDF = (function () {
  const NOMS_MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  function formaterMontant(valeur) {
    if (valeur === undefined || valeur === null) return "0,00";
    return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formaterDate(valeur) {
    if (!valeur) return "…… / …… / ……………";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "…… / …… / ……………";
    }
  }
  function nomMoisFr(mois) {
    const index = Number(mois) - 1;
    return NOMS_MOIS_FR[index] || "";
  }

  // Conversion d'un montant en toutes lettres (français), pour la ligne
  // "ARRETE LA PRESENTE FACTURE A LA SOMME DE : # ... #" du modèle.
  const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
    "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function centainesEnLettres(n) {
    let mots = "";
    const c = Math.floor(n / 100);
    const reste = n % 100;
    if (c > 0) {
      mots += (c > 1 ? UNITES[c] + " " : "") + "cent" + (c > 1 && reste === 0 ? "s" : "") + (reste > 0 ? " " : "");
    }
    if (reste > 0) {
      if (reste < 20) {
        mots += UNITES[reste];
      } else {
        const d = Math.floor(reste / 10);
        const u = reste % 10;
        if (d === 7 || d === 9) {
          mots += DIZAINES[d - 1] + "-" + UNITES[10 + u];
        } else {
          mots += DIZAINES[d] + (u > 0 ? (u === 1 && d !== 8 ? " et un" : "-" + UNITES[u]) : (d === 8 ? "s" : ""));
        }
      }
    }
    return mots.trim();
  }

  function entierEnLettresFr(nombre) {
    let n = Math.floor(Math.abs(Number(nombre) || 0));
    if (n === 0) return "zéro";
    const tranches = [
      { valeur: 1000000000, nom: "milliard" },
      { valeur: 1000000, nom: "million" },
      { valeur: 1000, nom: "mille" }
    ];
    let mots = "";
    for (const tranche of tranches) {
      const q = Math.floor(n / tranche.valeur);
      if (q > 0) {
        mots += (q > 1 ? centainesEnLettres(q) + " " : (tranche.nom === "mille" ? "" : "un ")) + tranche.nom + (q > 1 && tranche.nom !== "mille" ? "s" : "") + " ";
        n %= tranche.valeur;
      }
    }
    if (n > 0) mots += centainesEnLettres(n);
    return mots.trim();
  }

  function montantEnLettresFr(montant) {
    const valeur = Number(montant) || 0;
    const dirhams = Math.floor(valeur);
    const centimes = Math.round((valeur - dirhams) * 100);
    let texte = entierEnLettresFr(dirhams) + " dirham" + (dirhams > 1 ? "s" : "");
    if (centimes > 0) {
      texte += " et " + entierEnLettresFr(centimes) + " centime" + (centimes > 1 ? "s" : "");
    }
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  // `facture` = la réponse de KADOSK_API.getMonthlyInvoice / getAdminMonthlyInvoice :
  // { invoiceNumber, year, month, generatedAt, merchantBusinessName, merchantAddress,
  //   commissionAmount, subscriptionAmount, subscriptionPlanName, totalAmount,
  //   commissionPaymentStatus, commissionPaymentReference, commissionPaymentMethod,
  //   commissionPaidAt, subscriptionPaymentStatus, subscriptionPaymentCollected,
  //   commissionLines: [{orderNumber, date, montantPaye, tauxApplique, montantCommission}],
  //   kadosk: { name, cnie, address, ice, ifNumber, taxeProfessionnelleNumber, tel, mail } }
  function nomFichier(facture) {
    return "Facture-KADOSK-" + (facture.invoiceNumber || "") + "-" + (facture.year || "") + "-" + String(facture.month || "").padStart(2, "0") + ".pdf";
  }

  // Construit le document jsPDF en mémoire, sans le télécharger ni l'exposer -
  // réutilisé à la fois pour le téléchargement direct (telecharger) et pour la
  // pièce jointe envoyée par email par l'Admin (voir genererBlob, utilisé par
  // assets/admin-finance.js :: envoyerFactureMensuelleEmail).
  function construireDocument(facture) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("JSPDF_NON_CHARGE");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margeGauche = 20;
    const margeDroite = 190;
    const largeurPage = 210;
    const largeurTableau = margeDroite - margeGauche;
    const kadosk = facture.kadosk || {};
    const libelleMois = nomMoisFr(facture.month) + " " + facture.year;
    let y = 16;

    // --- En-tête : vrai logo bilingue "Auto-entrepreneur" centré, date à droite ---
    if (typeof KADOSK_LOGO_AE_BASE64 === "string") {
      const largeurLogo = 20;
      const hauteurLogo = 21.7; // ratio réel du logo source (126x137)
      doc.addImage(KADOSK_LOGO_AE_BASE64, "JPEG", (largeurPage - largeurLogo) / 2, y, largeurLogo, hauteurLogo);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Date : " + formaterDate(facture.generatedAt), margeDroite, y + 4, { align: "right" });

    y += 30;

    // --- Numéro de facture encadré ---
    doc.setFillColor(238, 238, 238);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margeGauche, y, 90, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Facture numéro " + (facture.invoiceNumber || "—"), margeGauche + 3, y + 6.8);

    y += 20;

    // --- Client / Adresse (récupérés automatiquement depuis la fiche marchand) ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Client :", margeGauche, y);
    doc.text(facture.merchantBusinessName || "—", margeGauche + 22, y);
    y += 7;
    doc.text("Adresse :", margeGauche, y);
    doc.text(facture.merchantAddress || "—", margeGauche + 22, y);

    y += 12;

    // --- Tableau : Désignation / Quantité / Prix unitaire / Total - EXACTEMENT 2 lignes ---
    const colX = [margeGauche, margeGauche + 90, margeGauche + 120, margeGauche + 150];
    const colLargeurs = [90, 30, 30, 20];
    const hauteurEntete = 8;
    const hauteurLigne = 9;

    doc.setFillColor(150, 150, 150);
    doc.rect(margeGauche, y, largeurTableau, hauteurEntete, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Désignation", colX[0] + 2, y + 5.5);
    doc.text("Quantité", colX[1] + colLargeurs[1] / 2, y + 5.5, { align: "center" });
    doc.text("Prix unitaire", colX[2] + colLargeurs[2] / 2, y + 5.5, { align: "center" });
    doc.text("Total", colX[3] + colLargeurs[3] - 2, y + 5.5, { align: "right" });
    y += hauteurEntete;

    const lignes = [
      {
        designation: "Commissions du mois - " + libelleMois,
        quantite: "1",
        prixUnitaire: facture.commissionAmount,
        total: facture.commissionAmount
      },
      {
        designation: "Abonnement" + (facture.subscriptionPlanName ? " (" + facture.subscriptionPlanName + ")" : "") + " - " + libelleMois,
        quantite: "1",
        prixUnitaire: facture.subscriptionAmount,
        total: facture.subscriptionAmount
      }
    ];

    doc.setDrawColor(210, 210, 210);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    lignes.forEach((ligne) => {
      doc.rect(margeGauche, y, largeurTableau, hauteurLigne);
      doc.text(ligne.designation, colX[0] + 2, y + 6);
      doc.text(ligne.quantite, colX[1] + colLargeurs[1] / 2, y + 6, { align: "center" });
      doc.text(formaterMontant(ligne.prixUnitaire), colX[2] + colLargeurs[2] / 2, y + 6, { align: "center" });
      doc.text(formaterMontant(ligne.total), colX[3] + colLargeurs[3] - 2, y + 6, { align: "right" });
      y += hauteurLigne;
    });

    y += 10;

    // --- Montant exonéré de TVA / Total Net à payer ---
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(margeGauche, y, 90, 10, "FD");
    doc.rect(margeGauche + 90, y, 45, 10, "FD");
    doc.rect(margeGauche + 135, y, largeurTableau - 135, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text("Montant en dirhams exonéré de la TVA¹", margeGauche + 2, y + 6.5);
    doc.text("Total Net à payer", margeGauche + 92, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(formaterMontant(facture.totalAmount) + " DH", margeDroite - 2, y + 6.5, { align: "right" });

    y += 18;

    // --- Montant en toutes lettres ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("ARRETE LA PRESENTE FACTURE A LA SOMME DE :", margeGauche, y);
    y += 7;
    doc.text("# " + montantEnLettresFr(facture.totalAmount) + " #", margeGauche, y);

    y += 16;
    doc.text("Signature :", margeDroite - 30, y);

    // --- Pied de page 1 : footnote + mentions légales Auto-Entrepreneur KADOSK ---
    let yPied = 258;
    doc.setDrawColor(60, 60, 60);
    doc.line(margeGauche, yPied, margeGauche + 30, yPied);
    yPied += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text("¹Art 91 – II – 1° du Code Général des Impôts.", margeGauche, yPied);
    yPied += 3;
    doc.setDrawColor(150, 150, 150);
    doc.line(margeGauche, yPied, margeDroite, yPied);

    yPied += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("Auto Entrepreneur : " + (kadosk.name || "—") + "    CNIE : " + (kadosk.cnie || "—"), margeGauche, yPied);
    yPied += 6;
    doc.text("Adresse : " + (kadosk.address || "—"), margeGauche, yPied);
    yPied += 6;
    doc.text("ICE (N° d'inscription au registre national de l'auto-entrepreneur) : " + (kadosk.ice || "—"), margeGauche, yPied);
    yPied += 6;
    doc.text("IF : " + (kadosk.ifNumber || "—") + "    Taxe professionnelle N° : " + (kadosk.taxeProfessionnelleNumber || "—"), margeGauche, yPied);
    yPied += 6;
    doc.text("TEL : " + (kadosk.tel || "—") + "    Mail : " + (kadosk.mail || "—"), margeGauche, yPied);

    // --- Page 2 et suivantes : arrêté détaillé de toutes les transactions du mois ---
    const commissionLines = facture.commissionLines || [];
    if (commissionLines.length > 0) {
      const colDetailX = [margeGauche, margeGauche + 55, margeGauche + 95, margeGauche + 135];
      const colDetailLargeurs = [55, 40, 40, 35];
      const hauteurLigneDetail = 7;
      const hautMaxContenu = 275;
      let pageCourante = 1;

      function dessinerEnTeteDetail(yDepart) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text("Arrêté détaillé des transactions - " + libelleMois, margeGauche, yDepart);
        let yy = yDepart + 8;
        doc.setFillColor(150, 150, 150);
        doc.rect(margeGauche, yy, largeurTableau, hauteurLigneDetail, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("REF CMD", colDetailX[0] + 2, yy + 5);
        doc.text("Date", colDetailX[1] + 2, yy + 5);
        doc.text("Montant payé client", colDetailX[2] + colDetailLargeurs[2] - 2, yy + 5, { align: "right" });
        doc.text("Commission", colDetailX[3] + colDetailLargeurs[3] - 2, yy + 5, { align: "right" });
        return yy + hauteurLigneDetail;
      }

      doc.addPage();
      let yDetail = dessinerEnTeteDetail(20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.setDrawColor(225, 225, 225);

      commissionLines.forEach((ligne, index) => {
        if (yDetail + hauteurLigneDetail > hautMaxContenu) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("Page " + pageCourante, largeurPage / 2, 290, { align: "center" });
          doc.addPage();
          pageCourante += 1;
          yDetail = dessinerEnTeteDetail(20);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(30, 30, 30);
        }
        if (index % 2 === 1) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margeGauche, yDetail, largeurTableau, hauteurLigneDetail, "F");
        }
        doc.text(String(ligne.orderNumber || "—"), colDetailX[0] + 2, yDetail + 5);
        doc.text(formaterDate(ligne.date), colDetailX[1] + 2, yDetail + 5);
        doc.text(
          ligne.montantPaye !== null && ligne.montantPaye !== undefined ? formaterMontant(ligne.montantPaye) + " DH" : "—",
          colDetailX[2] + colDetailLargeurs[2] - 2, yDetail + 5, { align: "right" }
        );
        doc.text(formaterMontant(ligne.montantCommission) + " DH", colDetailX[3] + colDetailLargeurs[3] - 2, yDetail + 5, { align: "right" });
        yDetail += hauteurLigneDetail;
      });

      // Ligne de total, en cohérence avec "Commissions du mois" de la page 1.
      yDetail += 3;
      doc.setDrawColor(180, 180, 180);
      doc.line(margeGauche, yDetail, margeDroite, yDetail);
      yDetail += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      doc.text("Total commissions du mois", colDetailX[0], yDetail);
      doc.text(formaterMontant(facture.commissionAmount) + " DH", margeDroite, yDetail, { align: "right" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Page " + pageCourante, largeurPage / 2, 290, { align: "center" });
    }

    return doc;
  }

  function telecharger(facture) {
    let doc;
    try {
      doc = construireDocument(facture);
    } catch (erreur) {
      console.error("jsPDF non chargé - impossible de générer le PDF.", erreur);
      alert("Le générateur de PDF n'a pas pu se charger. Merci de réessayer.");
      return;
    }
    doc.save(nomFichier(facture));
  }

  // Renvoie le PDF sous forme de Blob (jamais téléchargé) - utilisé pour
  // l'uploader vers le Media Manager Wix avant de l'attacher à l'email
  // d'envoi de facture (voir envoyerFactureMensuelleParEmailAdmin côté
  // backend, qui reçoit l'URL obtenue après cet upload).
  function genererBlob(facture) {
    const doc = construireDocument(facture);
    return doc.output("blob");
  }

  return { telecharger, genererBlob, nomFichier, montantEnLettresFr };
})();
