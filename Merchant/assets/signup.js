(() => {
  'use strict';
  const form = document.getElementById('trialForm');
  const errorEl = document.getElementById('signupError');
  const formWrap = document.getElementById('signupForm');
  const successWrap = document.getElementById('signupSuccess');
  const planSelect = document.getElementById('planId');
  const requestedPlan = new URLSearchParams(location.search).get('plan');
  function fillPlans() {
    const chosen = planSelect.value || requestedPlan;
    planSelect.replaceChildren(planSelect.options[0] || new Option('Gratuit — 10 cartes offertes', ''));
    (window.KADOSK_PRICING_CONFIG.planTiers || []).filter(t => t.planId).forEach(t => {
      planSelect.appendChild(new Option(t.label + ' · ' + t.cashiers + ' caissiers · ' + t.price + ' MAD/mois', t.planId));
    });
    if (Array.from(planSelect.options).some(o => o.value === chosen)) planSelect.value = chosen;
  }
  fillPlans();
  // Prix et formules disponibles : catalogue Wix en direct, repli sur la configuration locale.
  window.KADOSK_PRICING_CONFIG.loadLivePlans().then(applied => { if (applied) fillPlans(); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    errorEl.classList.remove('show');
    const submitButton = form.querySelector('.signup-submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours…';

    try {
      const businessName = document.getElementById('businessName').value.trim();
      const category = document.getElementById('category').value;
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();

      if (!businessName || !email) {
        throw new Error('CHAMPS_REQUIS');
      }

      await window.KADOSK_API.submitTrialRequest(businessName, category, email, phone, {
        representativeName: document.getElementById('representativeName').value.trim(),
        city: document.getElementById('city').value.trim(),
        planId: planSelect.value,
        acceptedTerms: document.getElementById('acceptedTerms').checked,
        privacyConsent: document.getElementById('privacyConsent').checked,
        marketingConsent: document.getElementById('marketingConsent').checked
      });
      formWrap.classList.add('hide');
      successWrap.classList.add('show');
    } catch (erreur) {
      errorEl.classList.add('show');
      submitButton.disabled = false;
      submitButton.textContent = 'Envoyer ma demande →';
    }
  });
})();
