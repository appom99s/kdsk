(function () {
  'use strict';
  const money = n => Number(n).toLocaleString('fr-FR', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' DH';
  const messages = { PIN_INCORRECT:'PIN incorrect.', PIN_LOCKED:'Carte bloquée. Le client doit demander sa réactivation avec son code permanent, son PIN et un OTP e-mail.', PIN_SETUP_REQUIRED:'Le bénéficiaire doit créer son PIN dans Factures et sécurité.', REDEMPTION_PENDING:'Une confirmation est déjà en attente.', QR_CODE_EXPIRE:'QR expiré. Demandez au client de générer un nouveau QR.', QR_CODE_DEJA_UTILISE:'Ce QR a déjà été utilisé. Demandez un nouveau QR.', INSUFFICIENT_BALANCE:'Solde insuffisant.', GIFT_CARD_EXPIRED:'Carte expirée.', GIFT_CARD_ACTIVATION_REQUIRED:'Cette carte imprimée doit être attribuée à son bénéficiaire.', LOCATION_NOT_AUTHORIZED:'Point de vente non autorisé.', CLIENT_CONFIRMATION_REQUIRED:'La confirmation du client est nécessaire.', CONCURRENT_MODIFICATION_RETRY:'La carte a changé. Vérifiez le résultat avant de réessayer.', CONFIRMATION_EXPIRED:'Cette demande a expiré.', TROP_DE_TENTATIVES:'Veuillez patienter avant de réessayer.', GIFT_CARD_SUSPENDED:'Carte bloquée.' };
  const error = e => messages[e?.message] || 'Connexion perdue ou opération indisponible. Réessayez pour vérifier le résultat.';
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
  async function clientPending(container, orderItemId, token, openedAt = 0) {
    const response = await KADOSK_API.clientRedemption(orderItemId,token), r = response.pending;
    if (!container.isConnected) return null;
    if (r?.state === 'COMPLETED' && new Date(r.createdAt).getTime() < openedAt) { container.replaceChildren(); container.dataset.request = ''; return null; }
    if (!r || !['PENDING','CONFIRMED','COMPLETED'].includes(r.state)) { container.replaceChildren(); container.dataset.request = ''; return r; }
    // Do not replace a focused confirmation button on each poll.
    if (container.dataset.request === r.requestId + r.state) return r;
    container.dataset.request = r.requestId + r.state; container.replaceChildren();
    const title = document.createElement('h3'); title.textContent = r.state === 'COMPLETED' ? 'Paiement confirmé' : 'Confirmer le paiement'; container.append(title);
    const merchant = document.createElement('p'); merchant.textContent = [r.merchantName,r.locationName].filter(Boolean).join(' · '); container.append(merchant);
    const amount = document.createElement('strong'); amount.className='payment-amount'; amount.textContent=money(r.amount); container.append(amount);
    const text = document.createElement('p'); text.style.whiteSpace = 'pre-line'; text.textContent = `Solde avant : ${money(r.balanceBefore)}\nSolde après : ${money(r.balanceAfter)}`; container.append(text);
    if (r.state === 'COMPLETED') { text.textContent += '\nRéférence : ' + r.requestId; return r; }
    if (r.state === 'CONFIRMED') { text.textContent += '\nAccord transmis. En attente de finalisation par la caisse.'; return r; }
    const status = document.createElement('p'); status.setAttribute('role','status'); container.append(status);
    clearInterval(container.deadlineTimer);
    const tick = () => {
      const seconds = Math.max(0,Math.ceil((new Date(r.expiresAt).getTime()-Date.now())/1000));
      status.textContent = `Cette demande expire dans 00:${String(seconds).padStart(2,'0')}`;
      if (!seconds || !status.isConnected) {clearInterval(container.deadlineTimer);container.querySelectorAll('button').forEach(b=>b.disabled=true);}
    };
    tick(); container.deadlineTimer = setInterval(tick,1000);
    async function decide(approved) {
      container.querySelectorAll('button').forEach(b => b.disabled = true);
      try { await KADOSK_API.decideRedemption(orderItemId,token,r.requestId,approved,r.amount); container.dataset.request = ''; await clientPending(container,orderItemId,token); }
      catch (e) { status.textContent = error(e); container.querySelectorAll('button').forEach(b => b.disabled = false); }
    }
    button(container,'Confirmer ' + money(r.amount),() => decide(true)); button(container,'Refuser',() => decide(false)); return r;
  }
  async function cashier(data) {
    let response;
    if (data.payload) response = await KADOSK_API.beginRedemption(data);
    else response = await pin('Confirmation par PIN','Passez le téléphone au client pour saisir son code PIN. Montant : ' + money(data.amount), value => KADOSK_API.beginRedemption({...data,pin:value}));
    if (response.state === 'COMPLETED') return response.result;
    const d = sheet('Confirmation du client'), status = document.createElement('p'); status.setAttribute('role','status'); d.append(status);
    button(d,'Fermer',() => d.close());
    try {
      while (d.open) {
        status.textContent = `${money(data.amount)} — en attente de confirmation sur le téléphone du client.\nLa demande expire à ${new Date(response.expiresAt).toLocaleTimeString('fr-FR')}.`;
        await new Promise(resolve => setTimeout(resolve,2000));
        response = await KADOSK_API.redemptionStatus(response.requestId);
        if (response.state === 'COMPLETED') return response.result;
        if (response.state === 'REFUSED' || response.state === 'EXPIRED') throw new Error('CONFIRMATION_EXPIRED');
      }
      throw new Error('CANCELLED');
    } finally { d.close(); d.remove(); }
  }
  async function detail(card, token) {
    const d = sheet(card.businessName || 'Ma carte'), status = document.createElement('p'); status.setAttribute('role','status'); status.textContent = 'Chargement…'; d.append(status);
    button(d,'Fermer',() => d.close()); d.onclose = () => d.remove();
    try {
      const history = await KADOSK_API.cardHistory(card.orderItemId,token);
      status.textContent = `Solde : ${money(history.remainingBalance)} · Valeur initiale : ${money(history.initialBalance)}\nUtilisé : ${money(history.initialBalance-history.remainingBalance)}\n${history.expirationDate ? 'Expiration : '+new Date(history.expirationDate).toLocaleDateString('fr-FR') : 'Sans date d’expiration'}`;
      const progress = document.createElement('progress'); progress.max = history.initialBalance || 1; progress.value = history.initialBalance-history.remainingBalance; progress.setAttribute('aria-label','Montant utilisé'); d.append(progress);
      button(d,history.pinConfigured ? 'Réinitialiser le PIN' : 'Créer mon PIN',async () => {
        try {
          if (history.pinConfigured) { await KADOSK_API.setCardPin(card.orderItemId,token,null); status.textContent = 'Nouveau PIN envoyé à votre adresse e-mail. L’ancien est invalidé.'; }
          else { await pin('Votre PIN confidentiel','Choisissez six chiffres.',value => KADOSK_API.setCardPin(card.orderItemId,token,value)); status.textContent = 'PIN enregistré. Gardez-le confidentiel.'; }
        } catch(e) { status.textContent = error(e); }
      });
      const list = document.createElement('ul'); d.append(list);
      const created = document.createElement('li'); created.textContent = (history.createdAt ? new Date(history.createdAt).toLocaleDateString('fr-FR')+' · ' : '')+'Carte activée · +' + money(history.initialBalance); list.append(created);
      history.entries.forEach(entry => { const li = document.createElement('li'); li.textContent = `${new Date(entry.date).toLocaleDateString('fr-FR')} · ${entry.merchantName} · −${money(entry.amount)}`; list.append(li); });
      const offer = await KADOSK_API.getGiftCardOffer(history.merchantId), help = document.createElement('section'); d.append(help); window.KADOSK_CARD_HELP?.render(help,offer);
    } catch (e) { status.textContent = error(e); }
  }
  window.KADOSK_SECURE_UI = {pin,clientPending,cashier,detail,error};
}());
