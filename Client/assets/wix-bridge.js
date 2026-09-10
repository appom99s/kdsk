// ---------------------------------------------------------------------------
// Pont avec le site Wix principal, pour le cas où une page KADOSK (boutique.html,
// etape-4-destinataire.html, mes-commandes.html...) est intégrée dans une page Wix via
// l'élément "HTML iframe" (Embed a Site). Objectif : si le visiteur est déjà connecté
// en tant que membre Wix sur le site parent, il est reconnu automatiquement dans "Mes
// commandes" - SANS revérification par le code à 6 chiffres.
//
// Comment c'est sécurisé (important à comprendre avant de toucher ce fichier) :
// - Le jeton acheteur reçu ici n'est jamais fabriqué côté client. Il vient du webMethod
//   giftCardSecurity.web.js :: genererJetonAcheteurPourMembreWix, protégé par
//   Permissions.SiteMember - Wix lui-même vérifie que l'appelant est un membre
//   authentifié AVANT que ce webMethod ne s'exécute, et l'e-mail utilisé est TOUJOURS
//   celui de la session Wix réelle (jamais une valeur transmise par la page).
// - C'est donc un VRAI jeton "Mes commandes" (même mécanisme que login par code par
//   e-mail), pas juste un pré-remplissage : une fois reçu, l'acheteur est réellement
//   connecté, comme s'il avait tapé son code.
// - Ce fichier ne fait QUE relayer ce jeton déjà signé par le serveur - il ne décide
//   jamais lui-même de qui est connecté.
// - Un message qui ne vient pas EXACTEMENT du domaine Wix attendu est ignoré.
//
// Mise en place côté Wix (une fois, dans l'Éditeur Wix, sur la page qui contient
// l'élément HTML iframe) :
//   1. Ajouter l'élément "Intégrer un site" (HTML iframe), pointer son "src" vers la
//      page KADOSK concernée, lui donner un ID (ex. htmlBoutique).
//   2. Dans le code de la page Wix (panneau Velo), coller :
//
//        import { genererJetonAcheteurPourMembreWix } from 'backend/giftCardSecurity.web';
//
//        $w.onReady(function () {
//          $w('#htmlBoutique').onMessage(async (event) => {
//            // IMPORTANT (mise à jour "une seule session par appareil") : le message
//            // envoyé par ce fichier n'est plus la chaîne 'KADOSK_READY' mais un objet
//            // { type: 'KADOSK_READY', deviceId }. Ce code Wix Editor DOIT être mis à
//            // jour en même temps que ce fichier, sinon le pont ne fonctionnera plus.
//            if (!event.data || event.data.type !== 'KADOSK_READY') return;
//            try {
//              const resultat = await genererJetonAcheteurPourMembreWix(event.data.deviceId);
//              $w('#htmlBoutique').postMessage({ type: 'KADOSK_BUYER_TOKEN', ...resultat });
//            } catch (e) {
//              // Visiteur non connecté en tant que membre Wix - rien à envoyer,
//              // la page KADOSK reste sur son flux normal (email + code).
//            }
//          });
//        });
//
//   (Le "KADOSK_READY" évite une course : on n'appelle le webMethod qu'une fois la
//   page KADOSK prête à recevoir le résultat. Le deviceId permet au serveur de lier
//   cette connexion à l'appareil courant, comme pour la connexion par code email -
//   voir giftCardSecurity.web.js :: enregistrerSessionAppareil.)
// ---------------------------------------------------------------------------
(function () {
  // À REMPLACER par le domaine RÉEL du site Wix qui embarque ces pages - jamais "*"
  // (voir avertissement officiel Wix : un targetOrigin/origin générique permettrait à
  // n'importe quel site tiers d'envoyer ou d'intercepter ce message).
  const ORIGINES_WIX_AUTORISEES = new Set(["https://www.kadosk.com", "https://kadosk.com"]);
  function origineWixCible() {
    try {
      const origine = new URL(document.referrer).origin;
      if (ORIGINES_WIX_AUTORISEES.has(origine)) return origine;
    } catch (erreur) { /* repli canonique */ }
    return "https://www.kadosk.com";
  }
  function obtenirOuCreerDeviceId() {
    return window.KADOSK_BUYER_SESSION.deviceId;
  }

  function estDansIframe() {
    try {
      return window.self !== window.top;
    } catch (erreur) {
      // Accès à window.top bloqué par le navigateur = on est bien dans un iframe
      // cross-origin.
      return true;
    }
  }

  if (!estDansIframe()) return;

  function enregistrerSessionAcheteur(token, email, expiresInDays) {
    return !!window.KADOSK_BUYER_SESSION.definir(token, email, expiresInDays);
  }

  window.addEventListener("message", (evenement) => {
    // Rejette tout message qui ne vient pas EXACTEMENT du site Wix attendu - c'est
    // la seule vraie protection ici, ne jamais l'assouplir.
    if (!ORIGINES_WIX_AUTORISEES.has(evenement.origin)) return;
    const donnees = evenement.data;
    if (!donnees || donnees.type !== "KADOSK_BUYER_TOKEN" || !donnees.token || !donnees.email) return;

    // Le parent vient de faire émettre ce jeton par le backend. Cette émission
    // remplace le JTI précédent dans BuyerDeviceSessions : même si l'ancien jeton
    // local n'est pas encore expiré chronologiquement, il est désormais révoqué.
    // Il faut donc toujours enregistrer le jeton entrant, sauf s'il est strictement
    // identique, sinon la liste peut se charger avec l'ancien jeton puis la facture
    // échouer quelques secondes plus tard avec SESSION_REVOQUEE.
    const existant = window.KADOSK_BUYER_SESSION.lire();
    if (existant && existant.token === donnees.token) return;
    if (enregistrerSessionAcheteur(donnees.token, donnees.email, donnees.expiresInDays)) {
      document.dispatchEvent(new CustomEvent("kadosk:buyer-logged-in", { detail: { email: donnees.email } }));
    }
  });

  // Signale au parent que cette page est prête à recevoir le jeton, en transmettant
  // le deviceId de cet appareil (voir enregistrerSessionAppareil côté serveur) - le
  // code Wix Editor doit relayer ce deviceId à genererJetonAcheteurPourMembreWix
  // (voir instructions de mise en place ci-dessus).
  try {
    window.parent.postMessage({ type: "KADOSK_READY", deviceId: obtenirOuCreerDeviceId() }, origineWixCible());
  } catch (erreur) {
    // Sans conséquence : le pont ne fonctionnera simplement pas pour cette visite.
  }
})();
