// Facture d'ACHAT (marchand -> client), générée CÔTÉ NAVIGATEUR (jsPDF, voir la
// balise <script> CDN dans mes-commandes.html) - même approche que invoice-pdf.js
// et carte-cadeau-pdf.js, pour la même raison (le backend Velo classique ne
// supporte pas de génération PDF fiable). Distincte de KADOSK_FACTURE_PDF
// (invoice-pdf.js), qui couvre la facture de COMMISSION KADOSK -> marchand :
// ici le vendeur est le MARCHAND et l'acheteur est le CLIENT final.
// Le vendeur (businessName/RC/IF/adresse/logo) vient du modèle que le marchand
// a lui-même renseigné dans settings.html (voir getInvoiceTemplateMarchand /
// getCommandeParNumero côté backend) - jamais recalculé ici.
// Pas de ventilation HT/TVA sur la valeur faciale de la carte cadeau : même
// règle métier que la facture de commission (voir sa note "TVA appliquée sur la
// commission KADOSK uniquement") - la carte cadeau elle-même n'est pas
// considérée comme une vente taxable au moment de l'achat.
const KADOSK_FACTURE_ACHAT_PDF = (function () {
  function formaterMontant(valeur) {
    if (valeur === undefined || valeur === null) return "0,00";
    return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  function couleurRgb(hex, repli) {
    const propre = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(propre)) return repli;
    return [parseInt(propre.slice(0, 2), 16), parseInt(propre.slice(2, 4), 16), parseInt(propre.slice(4, 6), 16)];
  }

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

  async function telecharger(facture) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF non chargé - impossible de générer le PDF.");
      alert("Le générateur de PDF n'a pas pu se charger. Merci de réessayer.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margeGauche = 20;
    const couleurPrincipale = couleurRgb(facture.primaryColor, [20, 20, 20]);
    const couleurAccent = couleurRgb(facture.accentColor, [108, 76, 224]);
    let y = 20;

    const logoCharge = await chargerImageEnDataUrl(facture.logoUrl);
    if (logoCharge && logoCharge.dataUrl) {
      try {
        const hauteurLogo = 14;
        const largeurLogo = hauteurLogo * (logoCharge.largeur / logoCharge.hauteur);
        doc.addImage(logoCharge.dataUrl, "PNG", margeGauche, y - 6, largeurLogo, hauteurLogo);
      } catch (erreur) {
        console.error("Logo marchand ignoré (échec addImage) :", erreur);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...couleurPrincipale);
    doc.text(facture.businessName || "—", margeGauche + 24, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const identifiants = [];
    if (facture.rc) identifiants.push("RC " + facture.rc);
    if (facture.ifNumber) identifiants.push("IF " + facture.ifNumber);
    if (identifiants.length) doc.text(identifiants.join("  ·  "), margeGauche + 24, y + 6);
    if (facture.address) doc.text(facture.address, margeGauche + 24, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...couleurPrincipale);
    doc.text(String(facture.title || "FACTURE").toUpperCase(), 150, y, { align: "left" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Réf. " + (facture.orderNumber || "—"), 150, y + 7);
    doc.text("Date : " + formaterDate(facture.createdAt), 150, y + 13);
    if (Number(facture.dueDays) > 0) doc.text("Échéance : " + Number(facture.dueDays) + " jours", 150, y + 18);

    y += 26;
    doc.setDrawColor(...couleurAccent);
    doc.line(margeGauche, y, 190, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Facturé à", margeGauche, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(facture.buyerName || facture.buyerEmail || "—", margeGauche, y);
    if (facture.buyerName && facture.buyerEmail) {
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text(facture.buyerEmail, margeGauche, y);
    }

    y += 16;
    doc.setFillColor(245, 245, 245);
    doc.rect(margeGauche, y, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Désignation", margeGauche + 2, y + 5.5);
    doc.text("Qté", 150, y + 5.5, { align: "right" });
    doc.text("Montant TTC", 188, y + 5.5, { align: "right" });

    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.rect(margeGauche, y, 170, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("Carte cadeau " + (facture.cardName || facture.businessName || "—"), margeGauche + 2, y + 6.5);
    doc.text(String(facture.quantity || 1), 150, y + 6.5, { align: "right" });
    doc.text(formaterMontant(facture.subtotal) + " DH", 188, y + 6.5, { align: "right" });

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Total TTC", 150, y, { align: "right" });
    doc.text(formaterMontant(facture.subtotal) + " DH", 188, y, { align: "right" });

    y += 9;
    const paiementConfirme = String(facture.paymentStatus || "").toUpperCase() === "PAID";
    if (facture.showPaymentReceipt !== false) {
      doc.setFillColor(paiementConfirme ? 225 : 252, paiementConfirme ? 247 : 239, paiementConfirme ? 238 : 224);
      doc.roundedRect(120, y - 5, 68, 9, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(paiementConfirme ? 20 : 160, paiementConfirme ? 128 : 90, paiementConfirme ? 94 : 20);
      doc.text(paiementConfirme ? "REÇU - PAIEMENT CONFIRMÉ" : "PAIEMENT EN ATTENTE", 154, y + 1, { align: "center" });
    }

    y += 16;
    doc.setDrawColor(220, 220, 220);
    doc.line(margeGauche, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const notePaiement = String(facture.paymentNote || "").trim();
    const notePied = String(facture.footerNote || "").trim();
    if (notePaiement) doc.text(doc.splitTextToSize(notePaiement, 170), margeGauche, y);
    if (notePied) doc.text(doc.splitTextToSize(notePied, 170), margeGauche, y + (notePaiement ? 8 : 0));

    doc.save("Facture-" + (facture.orderNumber || "KADOSK") + "-" + (facture.businessName || "").replace(/[^a-z0-9]+/gi, "-") + ".pdf");
  }

  return { telecharger };
})();

// Les pages clientes vérifient explicitement cette API sur window avant de
// proposer le téléchargement. Un `const` global n'est pas une propriété de
// window dans les navigateurs modernes : on l'expose donc volontairement.
window.KADOSK_FACTURE_ACHAT_PDF = KADOSK_FACTURE_ACHAT_PDF;
