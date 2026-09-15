// Panier du NOUVEAU parcours public en 5 étapes (étape-1 à étape-5, favoris,
// mes-commandes). Clé localStorage DIFFÉRENTE de assets/panier.js (kadosk_panier_v2
// au lieu de kadosk_panier_public) : on ne réutilise pas l'ancien module, qui autorise
// plusieurs lignes par marchand (un montant choisi dès l'ajout). Ici le modèle est
// différent et volontairement plus simple : UNE ligne par marchand sélectionné,
// created sans montant à l'étape 1 (le montant n'est choisi qu'à l'étape 2). Séparer
// les deux clés évite tout mélange avec l'ancien parcours (fiche-marchand.html /
// panier.html), qui reste en place tel quel.
const KADOSK_PANIER2 = (function () {
  const CLE_STOCKAGE = "kadosk_panier_v2";
  const CLE_DESTINATAIRE = "kadosk_destinataire_v2";

  // Identifiant STABLE d'une ligne = marchand + montant (et non plus le seul
  // marchand) : deux ajouts du même marchand au même montant fusionnent (même
  // ligneId, quantité cumulée - voir ajouterArticle), mais un montant différent
  // pour ce même marchand devient une ligne à part entière (ex. une carte 100 DH
  // ET une carte 200 DH chez le même commerçant dans le même panier).
  function cleLigne(merchantId, montant) {
    const montantNorm = Number(montant) > 0 ? Number(montant) : "sansmontant";
    return String(merchantId) + "::" + montantNorm;
  }

  function lire() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      const lignes = brut ? JSON.parse(brut) : [];
      if (!Array.isArray(lignes)) return [];
      // Rétro-compatibilité : les paniers déjà enregistrés avant l'introduction de
      // ligneId n'en ont pas encore - on le complète ici à la volée (jamais réécrit
      // sur disque juste pour ça, seulement si une action modifie réellement le panier).
      lignes.forEach((l) => {
        if (!l.ligneId) l.ligneId = cleLigne(l.merchantId, l.montant);
      });
      return lignes;
    } catch (erreur) {
      return [];
    }
  }

  function ecrire(lignes) {
    const total = lignes.reduce((n, l) => n + Number(l.quantite), 0);
    if (new Set(lignes.map(l => l.merchantId)).size > 1) {
      window.alert("Votre panier est réservé à un seul commerce. Terminez votre commande ou videz le panier avant de changer de commerce.");
      return false;
    }
    if (total > QUANTITE_MAX || lignes.some(l => !Number.isInteger(l.quantite) || l.quantite < 1)) {
      window.alert("Vous pouvez commander au maximum 5 cartes cadeaux par panier.");
      return false;
    }
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(lignes));
    } catch (erreur) {
      console.error("KADOSK_PANIER2 : impossible d'enregistrer le panier :", erreur);
    }
    mettreAJourBadges();
    return true;
  }

  // Étape 1 : sélectionner une carte (sans montant pour l'instant). N'ajoute rien si
  // le marchand est déjà sélectionné.
  function selectionner(marchand) {
    const lignes = lire();
    if (lignes.some((l) => l.merchantId === marchand.merchantId)) {
      return lignes;
    }
    lignes.push({
      ligneId: cleLigne(marchand.merchantId, null),
      merchantId: marchand.merchantId,
      businessName: marchand.businessName || marchand.name || "",
      name: marchand.name || marchand.businessName || "",
      logoUrl: marchand.logoUrl || "",
      category: marchand.category || "",
      accentColor: marchand.accentColor || "teal",
      montant: null,
      quantite: 1
    });
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  function deselectionner(merchantId) {
    const lignes = lire().filter((l) => l.merchantId !== merchantId);
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  function estSelectionne(merchantId) {
    return lire().some((l) => l.merchantId === merchantId);
  }

  function definirMontant(merchantId, montant) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.merchantId === merchantId);
    if (!ligne) return lignes;
    ligne.montant = Number(montant) > 0 ? Number(montant) : null;
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  // Plafond aligné sur la limite serveur (creerCommandeMultiMarchand) - garder les
  // deux synchronisés : le plafond client n'est qu'un confort d'UX, la vraie limite
  // est toujours revérifiée côté backend.
  const QUANTITE_MAX = 5;

  function definirQuantite(merchantId, quantite) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.merchantId === merchantId);
    if (!ligne) return lignes;
    ligne.quantite = Math.max(1, Math.min(QUANTITE_MAX, Math.floor(Number(quantite) || 1)));
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  function retirer(merchantId) {
    return deselectionner(merchantId);
  }

  // Point d'entrée du NOUVEAU parcours (commercant-detail.html) : montant et
  // quantité choisis directement sur la fiche marchand, AVANT l'ajout - contrairement
  // à selectionner()/definirMontant() (ancien parcours étape1/étape2, montant choisi
  // APRÈS). Fusionne automatiquement avec une ligne déjà existante pour ce même
  // marchand ET ce même montant (quantités cumulées, plafonnées à QUANTITE_MAX) - un
  // montant différent pour le même marchand crée volontairement une ligne séparée.
  function ajouterArticle(marchand) {
    const lignes = lire();
    const montantNorm = Number(marchand.montant) > 0 ? Number(marchand.montant) : null;
    const ligneId = cleLigne(marchand.merchantId, montantNorm);
    const quantiteAjoutee = Math.max(1, Math.floor(Number(marchand.quantite) || 1));
    const existante = lignes.find((l) => l.ligneId === ligneId);
    if (existante) {
      existante.quantite = Math.max(1, Math.min(QUANTITE_MAX, (Number(existante.quantite) || 1) + quantiteAjoutee));
    } else {
      lignes.push({
        ligneId,
        merchantId: marchand.merchantId,
        businessName: marchand.businessName || marchand.name || "",
        name: marchand.name || marchand.businessName || "",
        logoUrl: marchand.logoUrl || "",
        category: marchand.category || "",
        accentColor: marchand.accentColor || "teal",
        montant: montantNorm,
        quantite: Math.min(QUANTITE_MAX, quantiteAjoutee)
      });
    }
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  // Suppression/quantité PAR LIGNE (ligneId), utilisées par le tiroir panier et le
  // récap étape 3 - contrairement à retirer()/definirQuantite() (ancien parcours),
  // qui opèrent par marchand et ne conviennent plus si un même marchand a plusieurs
  // lignes (montants différents).
  function retirerLigne(ligneId) {
    const lignes = lire().filter((l) => l.ligneId !== ligneId);
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  function definirQuantiteLigne(ligneId, quantite) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.ligneId === ligneId);
    if (!ligne) return lignes;
    ligne.quantite = Math.max(1, Math.min(QUANTITE_MAX, Math.floor(Number(quantite) || 1)));
    if (!ecrire(lignes)) return lire();
    return lignes;
  }

  function vider() {
    ecrire([]);
    try {
      localStorage.removeItem(CLE_DESTINATAIRE);
    } catch (erreur) {
      // sans conséquence
    }
  }

  function compterArticles() {
    return lire().reduce((n, l) => n + (Number(l.quantite) || 1), 0);
  }

  function toutesLignesOntUnMontant() {
    const lignes = lire();
    return lignes.length > 0 && lignes.every((l) => Number(l.montant) > 0);
  }

  function totalGeneral() {
    return lire().reduce((total, l) => total + (Number(l.montant) || 0) * (Number(l.quantite) || 1), 0);
  }

  // Format attendu par le backend (creerCommandeMultiMarchand) : uniquement des
  // intentions (marchand/montant affiché/quantité) - jamais un sous-total ou un total,
  // recalculés côté serveur avant toute écriture.
  function articlesPourCommande() {
    return lire().map((l) => ({
      merchantId: l.merchantId,
      amount: Number(l.montant),
      quantity: Number(l.quantite) || 1
    }));
  }

  // Destinataire + message (étape 4) : saisis une seule fois pour tout le panier,
  // conservés séparément du panier lui-même le temps de la navigation entre étapes.
  function enregistrerDestinataire({ buyerName, buyerPhone, buyerEmail, recipientName, recipientEmail, message, forSelf }) {
    try {
      localStorage.setItem(
        CLE_DESTINATAIRE,
        JSON.stringify({
          buyerName: buyerName || "",
          buyerPhone: buyerPhone || "",
          buyerEmail: buyerEmail || "",
          recipientName: recipientName || "",
          recipientEmail: recipientEmail || "",
          message: message || "",
          // "Pour moi-même" (true) vs "pour quelqu'un d'autre" (false) - voir etape4.js.
          forSelf: forSelf !== false
        })
      );
    } catch (erreur) {
      console.error("KADOSK_PANIER2 : impossible d'enregistrer le destinataire :", erreur);
    }
  }

  function lireDestinataire() {
    try {
      const brut = localStorage.getItem(CLE_DESTINATAIRE);
      return brut ? JSON.parse(brut) : { buyerName: "", buyerPhone: "", buyerEmail: "", recipientName: "", recipientEmail: "", message: "", forSelf: true };
    } catch (erreur) {
      return { buyerName: "", buyerPhone: "", buyerEmail: "", recipientName: "", recipientEmail: "", message: "", forSelf: true };
    }
  }

  function mettreAJourBadges() {
    const total = compterArticles();
    document.querySelectorAll("[data-panier-badge]").forEach((el) => {
      el.hidden = total === 0;
      el.textContent = String(total);
      el.style.display = total > 0 ? "" : "none";
    });
  }

  return {
    QUANTITE_MAX,
    lire,
    selectionner,
    deselectionner,
    estSelectionne,
    definirMontant,
    definirQuantite,
    retirer,
    ajouterArticle,
    retirerLigne,
    definirQuantiteLigne,
    vider,
    compterArticles,
    toutesLignesOntUnMontant,
    totalGeneral,
    articlesPourCommande,
    enregistrerDestinataire,
    lireDestinataire,
    mettreAJourBadges
  };
})();

// IMPORTANT : un `const` au sommet d'un script classique crée une liaison de
// portée globale accessible par son nom nu (KADOSK_PANIER2.xxx() fonctionne
// partout ailleurs), mais n'ajoute PAS de propriété sur `window` - contrairement
// à `window.X = ...`. Or plusieurs endroits du code (dont le tiroir panier,
// assets/panier-tiroir.js) testent bien `window.KADOSK_PANIER2` comme garde
// défensive : sans cette ligne, ce test est TOUJOURS faux et ces endroits
// utilisent silencieusement un panier vide/par défaut. Attaché explicitement
// ici pour que ces vérifications fonctionnent réellement.
window.KADOSK_PANIER2 = KADOSK_PANIER2;

document.addEventListener("DOMContentLoaded", () => {
  KADOSK_PANIER2.mettreAJourBadges();
});
