// KADOSK V6 — utilitaires navigateur communs aux nouveaux écrans.
// Aucune décision d'accès ici : tout est contrôlé par le serveur.
(function (global) {
  'use strict';

  var MESSAGES = {
    RECIPIENT_PHONE_INVALID: 'Indiquez un numéro international, par exemple +212600000000.',
    RECIPIENT_EMAIL_INVALID: 'Indiquez une adresse e-mail valide.',
    CONFIG_MISSING: 'Le service attend sa configuration. Contactez KADOSK.',
    LOGO_FILE_INVALID: 'Choisissez une image PNG, JPEG ou WebP de 2 Mo maximum.',
    NOT_AUTHENTICATED: 'Veuillez vous connecter.',
    SESSION_EXPIREE: 'Votre session a expiré. Reconnectez-vous.',
    SESSION_EXPIRED: 'Votre session a expiré. Reconnectez-vous.',
    TWO_FACTOR_REQUIRED: 'Une vérification en deux étapes est requise.',
    ROLE_REQUIRED: 'Cette action n’est pas autorisée pour votre compte.',
    PERMISSION_REQUIRED: 'Vous n’avez pas la permission nécessaire.',
    RATE_LIMITED: 'Trop de tentatives. Réessayez dans quelques minutes.',
    COUNTRY_NOT_VERIFIED: 'Votre pays n’est pas encore vérifié par KADOSK : le paiement sera disponible après vérification.',
    PENDING_CHANGE_EXISTS: 'Un changement de formule est déjà en cours. Finalisez-le ou annulez-le d’abord.',
    CASHIER_CAPACITY_EXCEEDED: 'Trop de caissiers actifs pour cette formule. Désactivez-en avant de changer.',
    PLAN_UNAVAILABLE: 'Cette formule n’est pas disponible.',
    PRICE_NOT_CONFIGURED: 'Le tarif de cette formule n’est pas encore configuré.',
    ENTERPRISE_QUOTE_REQUIRED: 'La formule Enterprise est proposée sur devis : contactez KADOSK.',
    PRICE_MISMATCH: 'Le tarif a changé. Rechargez la page.',
    ORDER_NOT_FOUND: 'Commande introuvable.',
    ORDER_NOT_AWAITING_PAYMENT: 'Cette commande n’attend plus de paiement.',
    RECEIPT_ALREADY_USED: 'Ce justificatif a déjà été déposé.',
    RECEIPT_URL_INVALID: 'Le fichier doit être déposé via le téléversement KADOSK.',
    PAYPAL_NOT_CONFIGURED: 'Le paiement PayPal n’est pas encore disponible.',
    CARD_NOT_FOUND: 'Carte introuvable pour ce commerce.',
    INVALID_CARD_CODE: 'Code de carte illisible.',
    PIN_INVALID: 'PIN incorrect.',
    PIN_LOCKED: 'Carte temporairement verrouillée après plusieurs PIN incorrects.',
    PIN_SETUP_REQUIRED: 'Le client n’a pas encore activé sa carte (PIN non créé).',
    PIN_FORMAT_INVALID: 'Le PIN comporte 6 chiffres.',
    PIN_TOO_WEAK: 'PIN trop simple : évitez les suites et chiffres répétés.',
    INSUFFICIENT_BALANCE: 'Solde insuffisant.',
    INVALID_AMOUNT: 'Montant invalide.',
    INVALID_AMOUNT_FOR_OFFER: 'Ce montant ne fait pas partie de votre offre.',
    CARD_NOT_ACTIVE: 'Cette carte n’est pas active.',
    CARD_EXPIRED: 'Cette carte a expiré.',
    LOCATION_NOT_AUTHORIZED: 'Point de vente non autorisé pour votre compte.',
    DEVICE_VERIFICATION_REQUIRED: 'Cet appareil doit être vérifié avant d’encaisser.',
    CODE_INVALID: 'Code incorrect.',
    VERIFICATION_EXPIRED: 'Code expiré. Demandez-en un nouveau.',
    IDEMPOTENCY_CONFLICT: 'Opération déjà utilisée avec d’autres données. Recommencez.',
    TOKEN_INVALID: 'Lien invalide ou expiré.',
    GIFT_CARD_LIMIT_REACHED: 'Limite de cartes du plan gratuit atteinte ce mois-ci.',
    FUNDS_CONFIRMATION_REQUIRED: 'Confirmez avoir constaté la réception des fonds.',
    SELF_VALIDATION_FORBIDDEN: 'Vous ne pouvez pas valider un paiement d’un commerce dont vous êtes membre.',
    BANK_REFERENCE_REQUIRED: 'Indiquez la référence bancaire du virement reçu.',
    REASON_REQUIRED: 'Un motif détaillé est requis.',
    ERREUR_RESEAU: 'Connexion impossible. Vérifiez votre réseau.',
    ERREUR_SERVEUR: 'Service momentanément indisponible.'
  };

  function message(err) {
    var code = (err && (err.message || err.code)) || 'ERREUR_SERVEUR';
    return MESSAGES[code] || ('Opération impossible (' + code + ').');
  }

  function cle() {
    var a = new Uint8Array(16);
    (global.crypto || global.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function argent(minor, devise) {
    var v = (Number(minor) || 0) / 100;
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise || 'MAD' }).format(v); }
    catch (_) { return v.toFixed(2).replace('.', ',') + ' ' + (devise || ''); }
  }

  function date(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function afficher(el, texte, type) {
    if (!el) return;
    el.className = 'v6-message v6-message-' + (type || 'info');
    el.textContent = texte;
    el.hidden = !texte;
  }

  // Appel authentifié (passerelle de session V3 → kadoskV6).
  async function appeler(action, params) {
    if (!global.KADOSK_API || typeof global.KADOSK_API.v6 !== 'function') throw new Error('ERREUR_SERVEUR');
    var r = await global.KADOSK_API.v6(action, params || {});
    return r && Object.prototype.hasOwnProperty.call(r, 'data') ? r.data : r;
  }

  // Appel public (demande partenaire, PIN client) : pas de session membre.
  async function appelerPublic(action, params) {
    var base = (global.KADOSK_CONFIG && global.KADOSK_CONFIG.siteBaseUrl) || 'https://www.kadosk.com';
    var res;
    try {
      res = await fetch(base + '/_functions/kadoskV6Public', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, params: params || {} }) });
    } catch (_) { throw new Error('ERREUR_RESEAU'); }
    var body = {};
    try { body = await res.json(); } catch (_) { body = {}; }
    if (!res.ok) throw new Error(body.error || 'ERREUR_SERVEUR');
    return body.data;
  }

  var PERIODES = { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel' };

  global.KD6 = { appeler: appeler, appelerPublic: appelerPublic, message: message, cle: cle, argent: argent, date: date, esc: esc, afficher: afficher, PERIODES: PERIODES };
})(window);
