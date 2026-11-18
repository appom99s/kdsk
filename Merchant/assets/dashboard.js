// Dashboard V6.1, existing merchant theme; all business reads use V6 actions.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('dashboardContent')) return;
  let busy = false;
  const money = rows => {
    const totals = new Map();
    rows.forEach(r => { if (r.currency) totals.set(r.currency, (totals.get(r.currency) || 0) + Number(r.redeemed_minor || 0)); });
    return Array.from(totals, ([currency, value]) => KD6.argent(value, currency)).join(' · ') || 'Aucun encaissement';
  };
  const count = rows => rows.reduce((n,r) => n + Number(r.redemption_count || 0), 0);
  function list(id, rows) {
    $(id).replaceChildren();
    rows.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r.name + ' — ' + r.redemption_count + ' encaissement(s)' + (r.currency ? ' · ' + KD6.argent(r.redeemed_minor, r.currency) : '');
      $(id).appendChild(li);
    });
    if (!rows.length) $(id).textContent = 'Aucun point de vente. Ajoutez-en dans Démarrage.';
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    $('dashboardLoading').hidden = false;
    $('dashboardContent').hidden = true;
    $('dashboardContent').setAttribute('aria-busy','true');
    $('dashboardRetry').hidden = true;
    $('dashboardStatus').textContent = '';
    try {
      const c = await KD6.appeler('me.context');
      if (c.role === 'CASHIER') { window.location.href = 'scanner.html'; return; }
      if (c.role !== 'OWNER') throw new Error('ROLE_REQUIRED');
      KADOSK_NAV.definirRole(c.role, {v6Only:true});
      KADOSK_NAV.rendreEnteteDroite('kadoskEnteteDroite');
      document.querySelectorAll('[data-marchand-nom]').forEach(el => { el.textContent = c.businessName || 'Mon commerce'; });
      document.querySelectorAll('[data-marchand-role]').forEach(el => { el.textContent = 'Propriétaire'; });
      const now = new Date(), start = new Date(now), week = new Date(now);
      start.setHours(0,0,0,0); week.setDate(week.getDate()-6); week.setHours(0,0,0,0);
      const until = now.toISOString();
      const results = await Promise.all([
        KD6.appeler('locations.stats',{since:start.toISOString(),until}),
        KD6.appeler('locations.stats',{since:week.toISOString(),until}),
        KD6.appeler('subscription.status').then(data=>({data}),()=>({error:true}))
      ]);
      const [today, seven, subscription] = results;
      if (!Array.isArray(today) || !Array.isArray(seven)) throw new Error('ERREUR_SERVEUR');
      $('dbDate').textContent = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
      $('dbBonjour').textContent = 'Bonjour, ' + (c.businessName || 'votre commerce');
      $('kpiEncaisse').textContent = money(today);
      $('kpiTransactions').textContent = String(count(today));
      $('kpiActives').textContent = String(new Set(seven.map(r=>r.id)).size);
      $('kpiEncours').textContent = money(seven);
      $('dbTotalSemaine').textContent = money(seven);
      list('dbGraphique',seven);
      list('dbOperations',today);
      const entitlement = subscription.data && subscription.data.entitlement;
      $('dbAbonnement').textContent = subscription.error ? 'Lecture de l’abonnement indisponible' : entitlement ? entitlement.plan_name : 'Abonnement géré par Wix';
      $('dbQuotaTexte').textContent = entitlement ? (entitlement.gift_card_limit == null ? 'Cartes illimitées' : entitlement.gift_card_limit + ' cartes par mois') : 'Consultez Abonnement pour vérifier votre formule.';
      $('dbCaissiers').textContent = entitlement ? entitlement.max_cashiers + ' caissier(s) autorisé(s)' : '';
      $('dashboardContent').hidden = false;
    } catch(e) {
      if (['TWO_FACTOR_REQUIRED','2FA_ENROLLMENT_REQUIRED'].includes(e.message)) {
        window.location.href = 'two-factor.html?retour=dashboard.html';
      } else if (['SESSION_EXPIRED','SESSION_EXPIREE','NOT_AUTHENTICATED','SESSION_REQUIRED'].includes(e.message)) {
        KADOSK_AUTH.deconnecter();
      } else {
        $('dashboardStatus').textContent = e.message === 'MERCHANT_NOT_FOUND' ? 'Le commerce associé à ce compte est introuvable. Contactez KADOSK pour vérifier son rattachement.' : KD6.message(e);
        $('dashboardRetry').hidden = false;
      }
    } finally {
      busy = false;
      $('dashboardLoading').hidden = true;
      $('dashboardContent').setAttribute('aria-busy','false');
    }
  }
  if (!KADOSK_AUTH.estConnecte()) { window.location.href = 'login.html'; return; }
  KADOSK_NAV.rendreBarreLaterale('kadoskSidebar','CASHIER',{v6Only:true});
  document.addEventListener('click', e => { if(e.target.id === 'lienDeconnexion') KADOSK_AUTH.deconnecter(); });
  $('dashboardRetry').addEventListener('click',refresh);
  refresh();
})();
