// KADOSK — configuration tarifaire (source unique côté frontend)
//
// IMPORTANT : ceci est la SEULE source de vérité pour l'AFFICHAGE des prix sur le
// site public (landing + configurateur d'abonnement). Elle ne doit jamais être
// recopiée ailleurs dans le frontend. Elle reste toutefois indicative : la
// validation et l'application réelles du quota/prix payé se font côté backend
// (moteur d'abonnement KADOSK, pas encore branché sur cette page) — voir
// docs/abonnements-equipe-kadosk.md pour l'ancien modèle (par nombre de
// caissiers) que ce nouveau modèle (par quota de cartes émises) remplace.
(function (global) {
  'use strict';

  var CARD_TIERS = [
    { cards: 50, price: 199 },
    { cards: 100, price: 249 },
    { cards: 250, price: 349 },
    { cards: 500, price: 499 },
    { cards: 1000, price: 699 },
    { cards: 2000, price: 999 },
    { cards: null, price: null, custom: true, label: '2000+' }
  ];

  var CASHIER_TIERS = [
    { cashiers: 1, price: 0, included: true },
    { cashiers: 2, price: 29 },
    { cashiers: 3, price: 69 },
    { cashiers: 5, price: 99 },
    { cashiers: null, price: null, custom: true, label: '10+' }
  ];

  var TRIAL = {
    maxCards: 10,
    maxDays: 30,
    maxCashiers: 1,
    requiresCard: false
  };

  var COMMISSION_DIRECT_SALES_PERCENT = 0;

  function formatMad(amount) {
    return amount.toLocaleString('fr-MA') + ' MAD';
  }

  global.KADOSK_PRICING_CONFIG = {
    cardTiers: CARD_TIERS,
    cashierTiers: CASHIER_TIERS,
    trial: TRIAL,
    directSalesCommissionPercent: COMMISSION_DIRECT_SALES_PERCENT,
    formatMad: formatMad
  };
})(window);
