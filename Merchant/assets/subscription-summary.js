(async () => {
  const status = document.getElementById('quotaStatus');
  try {
    const info = await KADOSK_API.getSubscriptionInfo();
    const q = info.cardQuota;
    if (!q) throw new Error('QUOTA_UNAVAILABLE');
    status.textContent = q.source === 'TRIAL_EXPIRED'
      ? 'Essai terminé : choisissez une formule pour continuer.'
      : (q.source === 'TRIAL' ? 'Essai de 30 jours · ' : '') + 'Cartes cadeaux illimitées';
    const bar = document.getElementById('quotaProgress');
    if (q.quota != null && q.quota > 0) { bar.max = q.quota; bar.value = q.used; bar.hidden = false; bar.setAttribute('aria-label', 'Cartes émises sur votre quota'); }
    document.getElementById('quotaCashiers').textContent = info.activeCashiers + ' / ' + info.cashierLimit + ' caissiers actifs';
    if (info.changePlanUrl) {
      const url = new URL(info.changePlanUrl);
      if (url.protocol === 'https:') { const link = document.getElementById('quotaManage'); link.href = url.href; link.hidden = false; }
    }
  } catch (_) { status.textContent = 'Consommation indisponible. Actualisez la page pour réessayer.'; }
})();
