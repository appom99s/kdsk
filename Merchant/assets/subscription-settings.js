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
  const checkoutStatut = document.getElementById('checkoutAbonnementStatut');
  function rendreCatalogue(containerId, tiers, activePlanId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    tiers.filter(tier => tier.planId).forEach(tier => {
      const card = document.createElement('article');
      card.className = 'kadosk-plan';
      const titre = document.createElement('h3');
      titre.textContent = tier.label;
      const prix = document.createElement('p');
      prix.className = 'plan-price';
      prix.textContent = tier.price + ' MAD / mois';
      const avantages = document.createElement('p');
      avantages.className = 'plan-benefits';
      avantages.textContent = tier.cashiers + ' caissier' + (tier.cashiers > 1 ? 's' : '') + '\nCartes cadeaux illimitées\n0 % de commission';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'kadosk-bouton';
      button.textContent = tier.planId === activePlanId ? 'Formule active' : 'Choisir cette formule';
      button.disabled = tier.planId === activePlanId;
      button.addEventListener('click', async () => {
        button.disabled = true;
        checkoutStatut.textContent = 'Préparation du paiement sécurisé…';
        try {
          const result = await KADOSK_API.createSubscriptionCheckout(tier.planId);
          const url = new URL(result.url);
          if (url.protocol !== 'https:') throw Error('INVALID_URL');
          window.location.assign(url.href);
        } catch (error) {
          const messages = { ABONNEMENT_DEJA_ACTIF: 'Cette formule est déjà active.',
            MERCHANT_NOT_AUTHORIZED: 'Votre dossier doit être validé avant de souscrire.' };
          checkoutStatut.textContent = messages[error.message] || 'Le paiement est momentanément indisponible. Réessayez.';
          button.disabled = false;
        }
      });
      card.append(titre, prix, avantages, button); container.appendChild(card);
    });
  }

  function formaterDate(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  try {
    const info = await KADOSK_API.getSubscriptionInfo();
    const q = info.cardQuota || {};
    // Prix et formules vendables : Wix Pricing Plans en direct (repli local si injoignable).
    await window.KADOSK_PRICING_CONFIG.loadLivePlans();
    rendreCatalogue('catalogueAbonnements', window.KADOSK_PRICING_CONFIG.planTiers, q.cardPlanId);

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

    statut.textContent = q.source === 'TRIAL_EXPIRED' ? 'Votre essai de 30 jours est terminé. Choisissez une formule pour continuer.' : q.quotaReached
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
      cartesTexte.textContent = 'Cartes cadeaux illimitées';
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
