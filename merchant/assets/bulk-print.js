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
  download.addEventListener('click', async () => {
    if (!batch || !batch.cards.length) return;
    const cards = batch.cards.map(card => {
      const node = document.createElement('div');
      new QRCode(node, {text: card.code, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.H});
      const canvas = node.querySelector('canvas');
      if (!canvas) throw new Error('QR_RENDER_FAILED');
      const qr = canvas.toDataURL('image/png');
      return { ...card, qr };
    });
    download.disabled = true;
    let logo;
    try {
      const response = await fetch('assets/logo.png');
      if (!response.ok) throw Error('LOGO_UNAVAILABLE');
      const blob = await response.blob();
      logo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
    } catch (_) {
      status.textContent = 'Le logo ne peut pas être chargé. Réessayez le téléchargement.';
      download.disabled = false; return;
    }
    const html = KADOSK_PRINT.document(cards, logo);
    download.disabled = false;
    const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'kadosk-cartes-imprimables.html'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
})();
