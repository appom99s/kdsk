// KADOSK — configuration tarifaire (affichage public)
//
// Modèle (2026-09-27) : cartes cadeaux illimitées sur tout abonnement payant,
// différenciation uniquement par le nombre de caissiers. Commission : 0 %. Les prix, cycles et promotions viennent EN DIRECT de Wix Pricing
// Plans via la route publique /_functions/publicPlans (voir getPublicPlans
// dans backend/giftCardSecurity.web.js), qui ne renvoie que les paliers
// vendables et déclarés côté KADOSK (caissiers/commission). Le tableau
// ci-dessous ne sert que de REPLI d'affichage si Wix est injoignable : la
// facturation réelle et les limites appliquées sont toujours décidées côté
// serveur.
(function (global) {
  'use strict';

  var GRATUIT = { key: 'GRATUIT', label: 'Gratuit', price: 0, free: true, cashiers: 1, commission: 0 };

  var PLAN_TIERS = [
    GRATUIT,
    { key: 'STARTER', label: 'Starter', price: 299, cashiers: 1, commission: 0, planId: '04c91516-7a6c-46ef-b047-5cfcd8560e4c' },
    { key: 'ESSENTIEL', label: 'Essentiel', price: 599, cashiers: 3, commission: 0, planId: 'eb963ebe-0868-4bbe-be67-7a60a00b4e0b' },
    { key: 'BUSINESS', label: 'Business', price: 999, cashiers: 6, commission: 0, planId: '0ad4eb1b-b6ee-4c5a-bb9e-24a1751bb057' },
    { key: 'PREMIUM', label: 'Premium', price: 1549, cashiers: 10, commission: 0, planId: '4835a00f-340c-42e1-8417-6d00293749e3' },
    { key: 'ENTERPRISE', label: 'Enterprise', price: 2299, cashiers: 15, commission: 0, planId: '161469e8-6d86-44d9-bc20-06e70b1bbf9d' },
    { key: 'RESEAU', label: 'Réseau', price: 3899, cashiers: 25, commission: 0, planId: '834e74fd-1346-4ff7-9fc5-df5af470faeb' }
  ];

  var TRIAL = {
    maxCards: null,
    maxDays: 30,
    maxCashiers: 1,
    requiresCard: false
  };

  function formatMad(amount) {
    return amount.toLocaleString('fr-MA') + ' MAD';
  }

  var config = {
    planTiers: PLAN_TIERS,
    trial: TRIAL,
    formatMad: formatMad,
    live: false
  };

  // Reconstruit les paliers payants depuis le catalogue Wix (Gratuit reste
  // local, aucun plan Wix ne le représente) : un palier ajouté côté serveur
  // apparaît sans modifier ce fichier.
  function applyLivePlans(plans) {
    var paid = plans.filter(function (p) { return p.kind === 'CASHIER_TIER' && p.cashierLimit > 0; })
      .sort(function (a, b) { return a.cashierLimit - b.cashierLimit; })
      .map(function (p) {
        return { key: p.tier, label: p.name, price: p.price, cashiers: p.cashierLimit, commission: p.commissionRate, planId: p.planId, promotion: p.promotion, perks: p.perks, freeTrialDays: p.freeTrialDays, live: true };
      });
    if (!paid.length) return false;
    config.planTiers = [GRATUIT].concat(paid);
    config.live = true;
    return true;
  }

  // Résout true si le catalogue Wix a été appliqué, false si le repli local reste en place.
  config.loadLivePlans = function () {
    var base = global.KADOSK_CONFIG && global.KADOSK_CONFIG.siteBaseUrl;
    if (!base || typeof fetch !== 'function') return Promise.resolve(false);
    return fetch(base + '/_functions/publicPlans', { headers: { Accept: 'application/json' } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { return !!(data && data.available && Array.isArray(data.plans) && applyLivePlans(data.plans)); })
      .catch(function () { return false; });
  };

  global.KADOSK_PRICING_CONFIG = config;
})(window);
