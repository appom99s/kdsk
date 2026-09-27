(() => {
  'use strict';
  const menu = document.querySelector('.burger');
  const nav = document.getElementById('navigation');
  function closeMenu() {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Ouvrir le menu');
  }
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
  document.getElementById('year').textContent = new Date().getFullYear();

  // Grille tarifaire (1 dimension : nombre de caissiers + commission - cartes
  // cadeaux illimitées sur tout palier payant). Paliers et prix : catalogue
  // Wix Pricing Plans chargé en direct (KADOSK_PRICING_CONFIG.loadLivePlans),
  // repli sur pricing-config.js si Wix est injoignable. Le serveur reste seul
  // juge de la limite de caissiers et du prix facturé.
  const config = window.KADOSK_PRICING_CONFIG;
  // Cette même page (index.html) est servie à la fois depuis la racine du site
  // (qui réutilise Merchant/assets/*) et depuis Merchant/index.html : le lien
  // relatif vers signup.html doit donc s'adapter à l'emplacement réel.
  const inMerchantFolder = /\/Merchant(\/|$)/i.test(location.pathname);
  const signupHref = inMerchantFolder ? 'signup.html' : 'Merchant/signup.html';
  const planGrid = document.getElementById('plan-grid');
  if (config && planGrid) {
    function planCard(tier) {
      const card = document.createElement('article');
      card.className = 'plan-card' + (tier.key === 'BUSINESS' ? ' plan-card-highlight' : '');
      const title = document.createElement('h3');
      title.textContent = tier.label;
      const price = document.createElement('div');
      price.className = 'plan-price';
      price.textContent = tier.free ? 'Gratuit' : config.formatMad(tier.price) + '/mois';
      const meta = document.createElement('ul');
      meta.className = 'plan-meta';
      const cashierItem = document.createElement('li');
      cashierItem.textContent = tier.cashiers + ' caissier' + (tier.cashiers > 1 ? 's' : '');
      const cardsItem = document.createElement('li');
      cardsItem.textContent = tier.free ? 'Cartes illimitées pendant ' + config.trial.maxDays + ' jours' : 'Cartes cadeaux illimitées';
      const commissionItem = document.createElement('li');
      commissionItem.textContent = tier.free ? 'Sans engagement' : (tier.commission > 0 ? tier.commission + ' % de commission' : '0 % de commission');
      meta.append(cashierItem, cardsItem, commissionItem);
      if (tier.promotion) {
        const promo = document.createElement('p');
        promo.className = 'plan-promo';
        promo.textContent = tier.promotion;
        meta.after(promo);
      }
      const cta = document.createElement('a');
      cta.className = 'btn' + (tier.key === 'BUSINESS' ? ' gradient' : '');
      cta.href = signupHref + (tier.planId ? '?plan=' + encodeURIComponent(tier.planId) : '');
      cta.textContent = tier.free ? 'Tester gratuitement →' : 'Choisir ' + tier.label + ' →';
      card.append(title, price, meta, cta);
      return card;
    }

    function render() {
      planGrid.replaceChildren(...config.planTiers.map(planCard));
    }
    render();

    // Les prix/paliers affichés sont remplacés par ceux de Wix dès leur arrivée.
    config.loadLivePlans().then(applied => { if (applied) render(); });
  }

  // FAQ accordéon
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-q');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => { if (other !== item) other.classList.remove('open'); });
      item.classList.toggle('open', !isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
    });
  });
})();
