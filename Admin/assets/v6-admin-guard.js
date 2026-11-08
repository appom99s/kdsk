// V6 administrator authorization uses Supabase plus the existing server session proof.
(function () {
  'use strict';
  if (!KADOSK_AUTH.estConnecte()) { location.replace('admin-login.html'); return; }
  window.KADOSK_ADMIN_READY = KD6.appeler('admin.context').then(function (identity) {
    const badge = document.getElementById('admBadgeRole'); if (badge) badge.textContent = identity.subRole;
    const allowed = ['admin-paiements.html', 'admin-partenaires.html', 'admin-ia.html', 'admin-login.html'];
    document.querySelectorAll('.adm-sidebar a').forEach(a => { if (a.id !== 'admLienDeconnexion' && !allowed.includes(a.getAttribute('href'))) a.hidden = true; });
    document.dispatchEvent(new CustomEvent('kadosk:admin-ready', { detail: identity }));
    return identity;
  }).catch(function (error) {
    if (error.message === 'TWO_FACTOR_REQUIRED') location.replace('admin-2fa.html');
    else if (['NOT_AUTHENTICATED','SESSION_EXPIRED','ADMIN_SESSION_REQUIRED','ROLE_REQUIRED'].includes(error.message)) location.replace('admin-login.html');
    else document.dispatchEvent(new CustomEvent('kadosk:admin-error', { detail: error }));
    throw error;
  });
})();
