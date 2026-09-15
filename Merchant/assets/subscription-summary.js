(async () => {
  const status = document.getElementById('quotaStatus');
  try {
    const info = await KADOSK_API.getSubscriptionInfo();
    const q = info.cardQuota;
    if (!q) throw new Error('QUOTA_UNAVAILABLE');
    status.textContent = (q.source === 'TRIAL' ? 'Essai gratuit : ' : '') + q.used +
      (q.quota == null ? ' cartes émises · quota illimité' : ' / ' + q.quota + ' cartes émises · ' + q.remaining + ' disponibles') +
      (q.quotaReached ? '. Quota atteint : adaptez votre formule pour continuer.' : '');
    const bar = document.getElementById('quotaProgress');
    if (q.quota != null && q.quota > 0) { bar.max = q.quota; bar.value = q.used; bar.hidden = false; bar.setAttribute('aria-label', 'Cartes émises sur votre quota'); }
    document.getElementById('quotaCashiers').textContent = info.activeCashiers + ' / ' + info.cashierLimit + ' caissiers actifs';
    if (info.changePlanUrl) {
      const url = new URL(info.changePlanUrl);
      if (url.protocol === 'https:') { const link = document.getElementById('quotaManage'); link.href = url.href; link.hidden = false; }
    }
  } catch (_) { status.textContent = 'Consommation indisponible. Actualisez la page pour réessayer.'; }
})();
