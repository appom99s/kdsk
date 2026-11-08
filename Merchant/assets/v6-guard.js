// KADOSK V6 — garde des écrans V6 (abonnement, scanner, démarrage).
// guard.js (V3) exige une fiche marchand CMS : un marchand créé en V6 (Supabase)
// en serait déconnecté. Ici, le rôle vient du serveur V6 (me.context) ; ce
// script ne sert qu'à l'affichage et aux redirections, l'accès réel est
// contrôlé par chaque action côté serveur.
(function () {
  'use strict';
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';
  var PAGES_CAISSIER = ['scanner.html'];

  if (!window.KADOSK_AUTH || !KADOSK_AUTH.lireSessionBridge()) {
    window.location.href = 'login.html?retour=' + encodeURIComponent(page);
    return;
  }
  if (window.KADOSK_NAV) {
    KADOSK_NAV.rendreBarreLaterale('kadoskSidebar', 'CASHIER', {});
    KADOSK_NAV.rendreEnteteDroite('kadoskEnteteDroite');
  }
  document.addEventListener('click', function (ev) {
    if (ev.target && ev.target.id === 'lienDeconnexion') KADOSK_AUTH.deconnecter();
  });

  KD6.appeler('me.context').then(function (c) {
    if (window.KADOSK_NAV && KADOSK_NAV.definirRole) KADOSK_NAV.definirRole(c.role, { v6Only: !c.legacyAccess });
    document.querySelectorAll('[data-marchand-role]').forEach(function (el) { el.textContent = c.role === 'OWNER' ? 'Propriétaire' : 'Accès caissier'; });
    document.querySelectorAll('[data-marchand-nom]').forEach(function (el) { el.textContent = c.businessName || 'Mon commerce'; });
    if (c.role === 'CASHIER' && PAGES_CAISSIER.indexOf(page) < 0) window.location.href = 'scanner.html';
    document.dispatchEvent(new CustomEvent('kd6:contexte', { detail: c }));
  }).catch(function (e) {
    if (['NOT_AUTHENTICATED', 'SESSION_EXPIRED', 'SESSION_EXPIREE', 'SESSION_REQUIRED'].indexOf(e.message) >= 0) { KADOSK_AUTH.deconnecter(); return; }
    if (e.message === 'TWO_FACTOR_REQUIRED') { window.location.href = 'two-factor.html?retour=' + encodeURIComponent(page); return; }
    var main = document.querySelector('.kadosk-main');
    if (main) { var message = document.createElement('div'); message.className = 'v6-message v6-message-erreur'; message.textContent = KD6.message(e); main.prepend(message); }
  });
})();
