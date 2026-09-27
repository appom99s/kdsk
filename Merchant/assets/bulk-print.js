(function () {
  const create = document.getElementById('bulkCreate');
  const download = document.getElementById('bulkDownload');
  const status = document.getElementById('bulkStatus');
  const amountInput = document.getElementById('bulkAmount');
  const countInput = document.getElementById('bulkCount');
  let batch = null;
  let busy = false;
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function loadQr() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('QR_LIBRARY_UNAVAILABLE')); };
      document.head.appendChild(script);
    });
  }
  create.addEventListener('click', async () => {
    if (busy) return;
    const amount = Number(amountInput.value), count = Number(countInput.value);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000 || !Number.isInteger(count) || count < 1 || count > 10) {
      status.textContent = 'Choisissez un montant de 1 à 1 000 DH et de 1 à 10 cartes.';
      return;
    }
    busy = true; create.disabled = true;
    try {
      // Load the printer before creating any financial liability.
      await loadQr();
      if (!batch) batch = { amount, cards: [], ids: Array.from({length: count}, () => crypto.randomUUID()) };
      amountInput.disabled = countInput.disabled = true;
      for (let i = batch.cards.length; i < batch.ids.length; i++) {
        status.textContent = 'Émission ' + (i + 1) + ' / ' + batch.ids.length + '…';
        const draft = await KADOSK_API.createMerchantGiftCardDraft(batch.amount, '', '', '', 'PRINT', batch.ids[i]);
        const result = await KADOSK_API.activateOrder(draft.orderItemId, '', '', '', 'PRINT');
        if (!result.success || !result.pdfCard || !result.pdfCard.code) throw new Error('PRINT_RESPONSE_UNAVAILABLE');
        batch.cards.push(result.pdfCard);
        download.hidden = false;
      }
      status.textContent = batch.cards.length + ' cartes émises. Téléchargez le document avant de quitter la page.';
      create.textContent = 'Lot terminé';
    } catch (_) {
      status.textContent = (batch ? batch.cards.length : 0) + ' cartes confirmées. Émission interrompue : vous pouvez télécharger les cartes prêtes et reprendre le même lot. En cas de limite de requêtes, attendez une minute.';
      create.textContent = 'Reprendre le lot';
    } finally {
      busy = false;
      create.disabled = !!batch && batch.cards.length === batch.ids.length;
    }
  });
  download.addEventListener('click', () => {
    if (!batch || !batch.cards.length) return;
    const cards = batch.cards.map(card => {
      const node = document.createElement('div');
      new QRCode(node, {text: card.code, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.H});
      const canvas = node.querySelector('canvas');
      if (!canvas) throw new Error('QR_RENDER_FAILED');
      const qr = canvas.toDataURL('image/png');
      return '<article><h1>' + escape(card.merchantName) + '</h1><h2>Carte cadeau · ' + escape(card.amount) + ' DH</h2><img alt="QR de la carte" src="' + qr + '"><p>' + escape(card.code) + '</p><p>Référence : ' + escape(card.orderNumber) + '</p><p>' + (card.expirationDate ? 'Valable jusqu’au ' + escape(new Date(card.expirationDate).toLocaleDateString('fr-FR')) : 'Sans date d’expiration') + '</p></article>';
    }).join('');
    const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Cartes cadeaux à imprimer</title><style>body{font-family:Arial;background:#f7faf9;color:#1f3a34}article{padding:24px;margin:20px auto;border:2px solid #1f3a34;max-width:600px;text-align:center;break-inside:avoid}img{width:220px;height:220px}@media print{body{background:white}article{break-after:page}}</style><body>' + cards + '</body></html>';
    const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'kadosk-cartes-imprimables.html'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
})();
