(function () {
  'use strict';
  const money = n => Number(n).toLocaleString('fr-FR', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' DH';
  const messages = { PIN_INCORRECT:'PIN incorrect.', PIN_LOCKED:'Carte bloquée. Le client doit demander sa réactivation avec son code permanent, son PIN et un OTP e-mail.', PIN_SETUP_REQUIRED:'Le bénéficiaire doit créer son PIN dans Factures et sécurité.', REDEMPTION_PENDING:'Une confirmation est déjà en attente.', INSUFFICIENT_BALANCE:'Solde insuffisant.', GIFT_CARD_EXPIRED:'Carte expirée.', GIFT_CARD_ACTIVATION_REQUIRED:'Cette carte imprimée doit être attribuée à son bénéficiaire.', LOCATION_NOT_AUTHORIZED:'Point de vente non autorisé.', CLIENT_CONFIRMATION_REQUIRED:'La confirmation du client est nécessaire.', CONCURRENT_MODIFICATION_RETRY:'La carte a changé. Vérifiez le résultat avant de réessayer.', CONFIRMATION_EXPIRED:'Cette demande a expiré.', TROP_DE_TENTATIVES:'Veuillez patienter avant de réessayer.', GIFT_CARD_SUSPENDED:'Carte bloquée.', GIFT_CARD_NOT_FOUND:'Carte introuvable pour ce commerce.', GIFT_CARD_NOT_ACTIVE:'Carte inactive ou déjà utilisée.', INVALID_REDEEM_AMOUNT:'Montant invalide.', PIN_INVALID:'Le PIN doit comporter 6 chiffres.', PERMANENT_CODE_REQUIRED:'Saisissez le code permanent de la carte.', TWO_FACTOR_REQUIRED:'Validez la double authentification puis réessayez.', MERCHANT_ACCOUNT_BLOCKED:'Compte marchand bloqué.', SESSION_EXPIREE:'Session expirée : reconnectez-vous.', COLLECTION_MANQUANTE:'Configuration KADOSK incomplète (collection des encaissements absente). Contactez l’administrateur.', ERREUR_RESEAU:'Connexion perdue. Vérifiez le résultat dans « Mes dernières transactions » avant de réessayer.' };
  // Code inconnu : on l'affiche (ex. ERREUR_SERVEUR · 500) pour pouvoir diagnostiquer, sans jamais l'inventer.
  const error = e => messages[e?.message] || ('Opération impossible (' + [e?.message || 'ERREUR_INCONNUE', e?.status].filter(Boolean).join(' · ') + '). Vérifiez « Mes dernières transactions » avant de réessayer.');
  function sheet(title) {
    const dialog = document.createElement('dialog'); dialog.className = 'kadosk-sheet';
    const heading = document.createElement('h2'); heading.textContent = title; heading.id = 'card-dialog-' + crypto.randomUUID(); dialog.setAttribute('aria-labelledby', heading.id);
    dialog.append(heading); document.body.append(dialog); dialog.showModal(); return dialog;
  }
  function button(parent, text, action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; parent.append(b); return b; }
  function pin(title, description, submit) {
    return new Promise((resolve,reject) => {
      const d = sheet(title), p = document.createElement('p'); p.textContent = description; d.append(p);
      const input = document.createElement('input'); input.type = 'password'; input.inputMode = 'numeric'; input.autocomplete = 'off'; input.maxLength = 6; input.pattern = '[0-9]{6}'; input.className = 'pin-input'; input.setAttribute('aria-label','PIN de six chiffres'); d.append(input);
      const keys = document.createElement('div'); keys.className = 'pin-keypad'; d.append(keys);
      ['1','2','3','4','5','6','7','8','9','Effacer','0','Vider'].forEach(key => button(keys,key,() => { input.value = key === 'Effacer' ? input.value.slice(0,-1) : key === 'Vider' ? '' : (input.value + key).slice(0,6); }));
      const status = document.createElement('p'); status.setAttribute('role','status'); d.append(status); let finished = false, busy = false;
      button(d,'Annuler',() => { if (!busy) d.close(); });
      const confirm = button(d,'Confirmer',async () => {
        if (busy || !/^\d{6}$/.test(input.value)) { status.textContent = 'Saisissez six chiffres.'; return; }
        busy = true; confirm.disabled = true; status.textContent = 'Vérification…';
        let value = input.value; input.value = '';
        try { const result = await submit(value); value = ''; finished = true; d.close(); resolve(result); }
        catch (e) { value = ''; status.textContent = error(e); }
        finally { busy = false; confirm.disabled = false; }
      });
      d.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
      d.onclose = () => { input.value = ''; d.remove(); if (!finished) reject(new Error('CANCELLED')); }; input.focus();
    });
  }
  window.KADOSK_SECURE_UI = {pin,error};
}());
