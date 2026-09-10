// Favoris : stockage LOCAL en source de vérité immédiate (localStorage, marche
// sans connexion), avec synchronisation best-effort vers le compte acheteur
// (collection BuyerFavorites, voir giftCardSecurity.web.js) dès qu'un jeton
// acheteur valide est présent - obtenu par n'importe quel moyen existant (code
// email "Mes commandes"/étape 5 du checkout, membre Wix via wix-bridge.js). Un
// visiteur non connecté garde un fonctionnement 100% local, inchangé.
const KADOSK_FAVORIS = (function () {
  const CLE_STOCKAGE = "kadosk_favoris_v2";

  function lire() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      const ids = brut ? JSON.parse(brut) : [];
      return Array.isArray(ids) ? ids : [];
    } catch (erreur) {
      return [];
    }
  }

  function ecrire(ids) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(ids));
    } catch (erreur) {
      console.error("KADOSK_FAVORIS : impossible d'enregistrer :", erreur);
    }
  }

  function estFavori(merchantId) {
    return lire().includes(merchantId);
  }

  function lireTokenAcheteurValide() {
    const session = window.KADOSK_BUYER_SESSION && window.KADOSK_BUYER_SESSION.lire();
    return session ? session.token : null;
  }

  function basculer(merchantId) {
    const ids = lire();
    const index = ids.indexOf(merchantId);
    let actif;
    if (index === -1) {
      ids.push(merchantId);
      actif = true;
    } else {
      ids.splice(index, 1);
      actif = false;
    }
    ecrire(ids);

    // Miroir best-effort côté compte si l'acheteur est connecté (voir
    // giftCardSecurity.web.js :: basculerFavoriAcheteur) - jamais bloquant/attendu :
    // l'état local ci-dessus reste TOUJOURS la source de vérité immédiate pour
    // l'affichage, ce miroir ne fait que le faire suivre sur les autres appareils.
    const token = lireTokenAcheteurValide();
    if (token && window.KADOSK_API && KADOSK_API.basculerFavoriAcheteur) {
      KADOSK_API.basculerFavoriAcheteur(merchantId, token).catch((erreur) => {
        console.error("KADOSK_FAVORIS : échec de synchronisation compte (bascule) :", erreur);
      });
    }

    return actif;
  }

  // Fusionne les favoris locaux (visiteur non connecté jusqu'ici) avec ceux déjà
  // enregistrés sur le compte, puis réécrit le résultat fusionné en local - appelé
  // automatiquement au chargement de toute page si un jeton acheteur valide est
  // déjà présent (voir DOMContentLoaded plus bas), donc sans dépendre d'un point de
  // connexion précis (code email, membre Wix, pont iframe...).
  async function synchroniser() {
    const token = lireTokenAcheteurValide();
    if (!token || !window.KADOSK_API || !KADOSK_API.fusionnerFavorisLocaux) return;
    try {
      const resultat = await KADOSK_API.fusionnerFavorisLocaux(lire(), token);
      const fusionnes = (resultat && resultat.items) || [];
      ecrire(fusionnes);
      mettreAJourBadges();
    } catch (erreur) {
      console.error("KADOSK_FAVORIS : échec de synchronisation compte :", erreur);
    }
  }

  function retirer(merchantId) {
    ecrire(lire().filter((id) => id !== merchantId));
  }

  // Même convention que KADOSK_PANIER2.mettreAJourBadges (assets/panier2.js) :
  // tout élément [data-favoris-badge] présent sur la page (ex. header) affiche
  // le nombre de favoris et se masque à zéro.
  function mettreAJourBadges() {
    const total = lire().length;
    document.querySelectorAll("[data-favoris-badge]").forEach((el) => {
      el.textContent = String(total);
      el.style.display = total > 0 ? "" : "none";
    });
  }

  return { lire, estFavori, basculer, retirer, mettreAJourBadges, synchroniser };
})();

// Voir le commentaire équivalent dans assets/panier2.js : un `const` top-level
// n'est pas une propriété de `window`. Plusieurs pages (accueil.js et les
// nouvelles pages boutique/catégories/commerçants) testent `window.KADOSK_FAVORIS`
// avant de l'utiliser - sans cette ligne, ce test échoue toujours et un clic sur
// le cœur "favori" plantait silencieusement (window.KADOSK_FAVORIS.basculer sur
// `undefined`).
window.KADOSK_FAVORIS = KADOSK_FAVORIS;

document.addEventListener("DOMContentLoaded", () => {
  KADOSK_FAVORIS.mettreAJourBadges();
  // Best-effort, silencieux : ne bloque jamais l'affichage de la page en cours.
  KADOSK_FAVORIS.synchroniser();
});
