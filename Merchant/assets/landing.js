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

  // Configurateur d'abonnement (2 dimensions : cartes émises/mois + caissiers)
  // Source unique des chiffres : Merchant/assets/pricing-config.js (window.KADOSK_PRICING_CONFIG).
  const config = window.KADOSK_PRICING_CONFIG;
  // Cette même page (index.html) est servie à la fois depuis la racine du site
  // (qui réutilise Merchant/assets/*) et depuis Merchant/index.html : le lien
  // relatif vers signup.html doit donc s'adapter à l'emplacement réel.
  const inMerchantFolder = /\/Merchant(\/|$)/i.test(location.pathname);
  const signupHref = inMerchantFolder ? 'signup.html' : 'Merchant/signup.html';
  if (config) {
    const cardButtons = document.querySelectorAll('[data-card-tier]');
    const cashierButtons = document.querySelectorAll('[data-cashier-tier]');
    cardButtons.forEach((button, i) => {
      const tier = config.cardTiers[i];
      if (tier) button.textContent = tier.custom ? tier.label : tier.cards.toLocaleString('fr-FR');
    });
    cashierButtons.forEach((button, i) => {
      const tier = config.cashierTiers[i];
      if (tier) button.textContent = tier.custom ? tier.label : String(tier.cashiers);
    });
    let selectedCardIndex = 0;
    let selectedCashierIndex = 0;

    function render() {
      const cardTier = config.cardTiers[selectedCardIndex];
      const cashierTier = config.cashierTiers[selectedCashierIndex];
      const priceEl = document.getElementById('config-price');
      const noteEl = document.getElementById('config-note');
      const ctaEl = document.getElementById('config-cta');

      if (cardTier.custom || cashierTier.custom) {
        priceEl.textContent = 'Sur devis';
        noteEl.textContent = 'Volume important : parlons de votre projet pour une formule adaptée.';
        ctaEl.href = 'mailto:contact@kadosk.com?subject=' + encodeURIComponent('Formule KADOSK sur devis');
        ctaEl.textContent = 'Demander un devis →';
        return;
      }

      const total = cardTier.price + cashierTier.price;
      priceEl.textContent = config.formatMad(total);
      noteEl.textContent = cardTier.cards + ' nouvelles cartes cadeaux par mois · ' + cashierTier.cashiers + ' caissier' + (cashierTier.cashiers > 1 ? 's' : '') + (cashierTier.included ? ' inclus' : ' inclus dans cette option');
      ctaEl.href = signupHref;
      ctaEl.textContent = 'Tester gratuitement →';
    }

    cardButtons.forEach((button, index) => button.addEventListener('click', () => {
      selectedCardIndex = index;
      cardButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      render();
    }));
    cashierButtons.forEach((button, index) => button.addEventListener('click', () => {
      selectedCashierIndex = index;
      cashierButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      render();
    }));

    document.getElementById('config-price').setAttribute('aria-live', 'polite');
    render();
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
