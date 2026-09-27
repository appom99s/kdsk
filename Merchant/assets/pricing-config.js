// KADOSK — configuration tarifaire (affichage public)
//
// Modèle (2026-09-27) : cartes cadeaux illimitées sur tout abonnement payant,
// différenciation uniquement par le nombre de caissiers et la commission
// KADOSK. Les prix, cycles et promotions viennent EN DIRECT de Wix Pricing
// Plans via la route publique /_functions/publicPlans (voir getPublicPlans
// dans backend/giftCardSecurity.web.js), qui ne renvoie que les paliers
// vendables et déclarés côté KADOSK (caissiers/commission). Le tableau
// ci-dessous ne sert que de REPLI d'affichage si Wix est injoignable : la
// facturation réelle et les limites appliquées sont toujours décidées côté
// serveur.
(function (global) {
  'use strict';

  var GRATUIT = { key: 'GRATUIT', label: 'Gratuit', price: 0, free: true, cashiers: 1, commission: null };

  var PLAN_TIERS = [
    GRATUIT,
    { key: 'NORMAL', label: 'Normal', price: 99, cashiers: 2, commission: 9, planId: '5cd676ec-3081-4ae8-8042-c0f42cdc5bac' },
    { key: 'SILVER', label: 'Silver', price: 249, cashiers: 5, commission: 5, planId: '7e885de1-fa5a-4aeb-890b-52d34e606632' },
    { key: 'GOLD', label: 'Gold', price: 449, cashiers: 10, commission: 0, planId: '33e79ea4-64ea-47c9-8aa4-1004f07641cb' }
  ];

  var TRIAL = {
    maxCards: 10,
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
