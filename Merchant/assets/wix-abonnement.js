(function () {
  'use strict';
  const content = document.getElementById('abActuel');
  KD6.appeler('subscription.status').then(function (data) {
    content.textContent = '';
    if (data.entitlement) {
      const rights = document.createElement('p');
      rights.textContent = data.entitlement.plan_name + ' : ' + data.entitlement.max_cashiers + ' caissier(s), ' +
        (data.entitlement.gift_card_limit == null ? 'cartes illimitées' : data.entitlement.gift_card_limit + ' cartes par mois') + '.';
      content.appendChild(rights);
    }
    if (!data.orders.length) { if (!data.entitlement) content.textContent = 'Aucun abonnement Wix trouvé pour ce compte.'; return; }
    const labels = { ACTIVE: 'Actif', PAUSED: 'Suspendu', CANCELED: 'Résilié', ENDED: 'Terminé', PENDING: 'En attente', DRAFT: 'Brouillon' };
    data.orders.forEach(function (order) {
      const line = document.createElement('p');
      line.textContent = (order.planName || 'Formule Wix') + ' — ' + (labels[order.status] || order.status || 'Statut indisponible');
      content.appendChild(line);
    });
  }).catch(function () { content.textContent = 'Lecture Wix indisponible. Aucun paiement n’a été lancé.'; });
  document.addEventListener('kd6:contexte', function (event) {
    document.getElementById('abLegacy').hidden = !event.detail.legacyAccess;
  });
})();
