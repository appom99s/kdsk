(() => {
  'use strict';
  const order = new URLSearchParams(location.search).get('commande');
  const login = document.getElementById('invoiceLogin');
  const codeForm = document.getElementById('invoiceCodeForm');
  const content = document.getElementById('invoiceContent');
  const status = document.getElementById('invoiceStatus');
  let email = '';
  // Message précis selon le code renvoyé par le serveur (plus de « erreur 500 » muette).
  function messageErreur(erreur) {
    const code = erreur && erreur.message;
    if (code === 'ORDER_NOT_FOUND') return 'Aucune commande ne correspond à cette adresse e-mail.';
    if (code === 'INVOICE_UNAVAILABLE') return 'La facture de cette commande n’est pas encore disponible.';
    if (code === 'JETON_INVALIDE' || code === 'JETON_EXPIRE' || code === 'SESSION_REVOQUEE') return 'Votre vérification a expiré. Saisissez à nouveau votre e-mail.';
    if (code === 'TROP_DE_REQUETES') return 'Trop de tentatives. Réessayez dans une minute.';
    return 'Facture momentanément indisponible. Réessayez dans quelques instants.';
  }
  const money = n => Number(n || 0).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' });
  function field(list, label, value) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value || '—'; list.append(dt, dd);
  }
  async function display(token) {
    content.hidden = true; content.replaceChildren();
    const detail = await KADOSK_API.getOrderByNumber(order, token);
    for (const merchant of detail.merchants || []) {
      if (!merchant.invoice) continue;
      const article = document.createElement('article'), title = document.createElement('h2'), list = document.createElement('dl');
      title.textContent = merchant.invoice.businessName || merchant.businessName;
      field(list, 'Commande', detail.orderNumber);
      field(list, 'Acheteur', detail.buyerName);
      field(list, 'E-mail', detail.buyerEmail);
      field(list, 'Cartes cadeaux', merchant.quantity + ' × ' + money(merchant.amount));
      field(list, 'Montant', money(merchant.subtotal));
      field(list, 'Paiement', detail.paymentStatus === 'PAID' ? 'Payé — déclaré par le marchand' : detail.paymentStatus === 'UNPAID' ? 'Non payé — déclaré par le marchand' : 'Non renseigné');
      const button = document.createElement('button'); button.className = 'kadosk-bouton'; button.textContent = 'Télécharger la facture';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await KADOSK_FACTURE_ACHAT_PDF.telecharger({ ...merchant.invoice, orderNumber: detail.orderNumber, buyerName: detail.buyerName, buyerEmail: detail.buyerEmail, cardName: merchant.cardName, quantity: merchant.quantity, subtotal: merchant.subtotal, totalAmount: detail.totalAmount, createdAt: detail.createdAt, paymentStatus: detail.paymentStatus, items: (merchant.cards || []).map(c => ({ amount: merchant.amount, status: c.redeemed ? 'Utilisée' : 'Active' })) });
        } catch (_) { status.textContent = 'Téléchargement indisponible. Réessayez.'; }
        finally { button.disabled = false; }
      });
      article.append(title, list, button); content.append(article);
    }
    if (!content.childElementCount) throw Error('INVOICE_UNAVAILABLE');
    login.hidden = codeForm.hidden = true; content.hidden = false; status.textContent = '';
  }
  login.addEventListener('submit', async e => {
    e.preventDefault(); const button = login.querySelector('button'); button.disabled = true;
    email = document.getElementById('invoiceEmail').value.trim().toLowerCase();
    try { await KADOSK_API.demanderCodeCommandes(email); login.hidden = true; codeForm.hidden = false; status.textContent = 'Saisissez le code reçu par e-mail.'; }
    catch (_) { status.textContent = 'Envoi indisponible. Réessayez dans quelques instants.'; }
    finally { button.disabled = false; }
  });
  codeForm.addEventListener('submit', async e => {
    e.preventDefault(); const button = codeForm.querySelector('button'); button.disabled = true;
    try {
      const result = await KADOSK_API.confirmerCodeCommandes(email, document.getElementById('invoiceCode').value.trim(), KADOSK_BUYER_SESSION.deviceId);
      KADOSK_BUYER_SESSION.definir(result.token, email, result.expiresInDays);
      try { await display(result.token); }
      catch (erreur) { status.textContent = messageErreur(erreur); }
    } catch (_) { status.textContent = 'Code invalide ou expiré.'; }
    finally { button.disabled = false; }
  });
  document.getElementById('invoiceChangeEmail').addEventListener('click', () => { login.hidden = false; codeForm.hidden = true; document.getElementById('invoiceCode').value = ''; });
  if (!order || order.length > 120) { login.hidden = true; status.textContent = 'Lien incomplet. Ouvrez la facture depuis Factures et sécurité.'; return; }
  // The reference in the URL grants no access; the server checks the buyer token.
  const session = KADOSK_BUYER_SESSION.lire();
  if (session) display(session.token).catch((erreur) => { login.hidden = false; status.textContent = messageErreur(erreur); });
})();
