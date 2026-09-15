(async () => {
  const statut = document.getElementById('abonnementStatut');
  if (!statut) return;
  const meta = document.getElementById('abonnementMeta');
  const formule = document.getElementById('abonnementFormule');
  const prix = document.getElementById('abonnementPrix');
  const renouvellement = document.getElementById('abonnementRenouvellement');
  const alertePaiement = document.getElementById('abonnementAlertePaiement');
  const blocCartes = document.getElementById('blocAbonnementCartes');
  const cartesLabel = document.getElementById('abonnementCartesLabel');
  const cartesTexte = document.getElementById('abonnementCartesTexte');
  const cartesProgress = document.getElementById('abonnementCartesProgress');
  const blocCaissiers = document.getElementById('blocAbonnementCaissiers');
  const caissiersTexte = document.getElementById('abonnementCaissiersTexte');
  const gererLien = document.getElementById('abonnementGererLien');

  function formaterDate(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  try {
    const info = await KADOSK_API.getSubscriptionInfo();
    const q = info.cardQuota || {};

    if (q.source === 'TRIAL' || q.source === 'TRIAL_EXPIRED') {
      formule.textContent = q.source === 'TRIAL_EXPIRED' ? 'Essai gratuit expiré' : 'Essai gratuit';
      prix.textContent = 'Gratuit';
      const finEssai = q.trialStartedAt ? new Date(new Date(q.trialStartedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
      renouvellement.textContent = finEssai ? formaterDate(finEssai) || '—' : 'Non démarré';
    } else if (q.source === 'PAID') {
      formule.textContent = q.cardPlanLabel || info.planName || 'Formule KADOSK';
      prix.textContent = (q.priceMAD != null ? q.priceMAD : info.subscriptionAmount) + ' ' + (info.subscriptionCurrency || 'MAD') + '/mois';
      renouvellement.textContent = formaterDate(q.periodEnd) || '—';
    } else {
      formule.textContent = info.planName || 'Formule KADOSK';
      prix.textContent = info.active ? info.subscriptionAmount + ' ' + (info.subscriptionCurrency || 'MAD') + '/mois' : 'Aucun abonnement actif';
      renouvellement.textContent = formaterDate(info.expirationDate) || '—';
    }
    meta.hidden = false;

    statut.textContent = q.quotaReached
      ? 'Quota de cartes atteint pour cette période. Changez de formule pour continuer à émettre des cartes.'
      : q.warningThresholdReached
        ? 'Vous approchez de votre quota de cartes pour cette période.'
        : (q.pendingChange && q.pendingChange.effectiveAt)
          ? 'Un changement de formule prendra effet le ' + (formaterDate(q.pendingChange.effectiveAt) || '—') + '.'
          : '';
    if (!statut.textContent) statut.hidden = true;

    alertePaiement.hidden = !(info.active && info.paymentCollected === false);

    if (Number.isFinite(q.quota)) {
      cartesLabel.textContent = q.source === 'TRIAL' ? 'Cartes cadeaux émises pendant l’essai' : 'Cartes cadeaux émises ce mois-ci';
      cartesTexte.textContent = q.used + ' / ' + q.quota + ' cartes émises · ' + q.remaining + ' disponibles';
      cartesProgress.max = q.quota;
      cartesProgress.value = q.used;
      cartesProgress.hidden = false;
    } else {
      cartesLabel.textContent = 'Cartes cadeaux émises';
      cartesTexte.textContent = q.used + ' cartes émises · quota illimité';
      cartesProgress.hidden = true;
    }
    blocCartes.hidden = false;

    caissiersTexte.textContent = info.activeCashiers + ' / ' + info.cashierLimit + ' caissiers actifs' +
      (info.remainingCashierSlots > 0 ? ' · ' + info.remainingCashierSlots + ' disponible' + (info.remainingCashierSlots > 1 ? 's' : '') : '');
    blocCaissiers.hidden = false;

    if (info.changePlanUrl) {
      try {
        const url = new URL(info.changePlanUrl);
        if (url.protocol === 'https:') { gererLien.href = url.href; gererLien.hidden = false; }
      } catch (_) { /* lien de gestion absent ou invalide : bouton laissé masqué */ }
    }
  } catch (_) {
    statut.hidden = false;
    statut.textContent = 'Abonnement indisponible. Actualisez la page pour réessayer.';
  }
})();
