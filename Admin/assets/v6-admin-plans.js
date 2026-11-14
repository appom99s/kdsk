(function () {
  'use strict';
  const host = document.getElementById('plans');
  const notice = document.getElementById('planMessage');
  const esc = KD6.esc;
  const errors = {
    PLAN_CONFLICT: 'Cette formule a changé. Rechargez les données avant de réessayer.',
    INVALID_QUOTA: 'Vérifiez les quotas saisis.',
    UNSUPPORTED_PRICE: 'Ce tarif nécessite une modification dans Wix.',
    ROLE_REQUIRED: 'La gestion des formules est réservée au super-administrateur.'
  };
  function report(error) {
    KD6.afficher(notice, errors[error.message] || KD6.message(error), 'erreur');
  }
  async function load() {
    host.replaceChildren();
    const rows = await KD6.appeler('admin.plans.list');
    for (const row of rows) {
      const section = document.createElement('section');
      section.className = 'v6-carte';
      section.innerHTML = '<h2>' + esc(row.name) + '</h2><form data-kind="quota">' +
        '<label>Caissiers actifs <input name="cashiers" type="number" min="0" max="1000" required value="' + row.quota.max_cashiers + '"></label> ' +
        '<label>Cartes émises par mois <input name="cards" type="number" min="0" max="100000" placeholder="Illimité" value="' + (row.quota.gift_card_limit ?? '') + '"></label>' +
        '<p>Un champ vide pour les cartes signifie illimité. Les quotas enregistrés s’appliquent aux prochaines émissions et invitations.</p>' +
        '<button class="v6-bouton">Enregistrer les quotas</button></form>';
      const quotaForm = section.querySelector('form');
      quotaForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = quotaForm.querySelector('button');
        button.disabled = true;
        try {
          const saved = await KD6.appeler('admin.plans.saveQuota', {
            planId: row.quota.plan_id, revision: row.quota.revision,
            maxCashiers: Number(quotaForm.elements.cashiers.value),
            giftCardLimit: quotaForm.elements.cards.value === '' ? null : Number(quotaForm.elements.cards.value)
          });
          row.quota = saved;
          KD6.afficher(notice, 'Quotas enregistrés.', 'ok');
        } catch (error) { report(error); }
        finally { button.disabled = false; }
      });
      for (const variant of row.variants) {
        const form = document.createElement('form');
        form.style.marginTop = '24px';
        const cycle = variant.billingTerms?.billingCycle;
        form.innerHTML = '<label>Prix ' + esc(variant.name || '') + ' (' + esc(row.currency || '') + ')' +
          (cycle ? ' — ' + esc(cycle.count + ' ' + cycle.period) : '') +
          ' <input name="price" type="number" min="0" max="9999999" step="0.0001" required value="' + esc(variant.amount ?? '') + '"></label> ' +
          '<button class="v6-bouton">Enregistrer le prix dans Wix</button>';
        form.querySelector('button').disabled = variant.amount == null;
        form.addEventListener('submit', async event => {
          event.preventDefault();
          const button = form.querySelector('button');
          button.disabled = true;
          try {
            const saved = await KD6.appeler('admin.plans.savePrice', { planId: row.quota.plan_id,
              revision: row.revision, variantId: variant.id, amount: form.elements.price.value });
            row.revision = saved.revision;
            form.elements.price.value = saved.amount;
            KD6.afficher(notice, 'Prix enregistré dans Wix.', 'ok');
          } catch (error) { report(error); }
          finally { button.disabled = variant.amount == null; }
        });
        section.append(form);
      }
      host.append(section);
    }
  }
  document.getElementById('reloadPlans').addEventListener('click', () => load().catch(report));
  window.KADOSK_ADMIN_READY.then(identity => {
    if (identity.subRole !== 'SUPER_ADMIN') throw Error('ROLE_REQUIRED');
    return load();
  }).catch(report);
})();
