(() => {
  'use strict';
  const form = document.getElementById('trialForm');
  const errorEl = document.getElementById('signupError');
  const formWrap = document.getElementById('signupForm');
  const successWrap = document.getElementById('signupSuccess');

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

      await window.KADOSK_API.submitTrialRequest(businessName, category, email, phone);
      formWrap.classList.add('hide');
      successWrap.classList.add('show');
    } catch (erreur) {
      errorEl.classList.add('show');
      submitButton.disabled = false;
      submitButton.textContent = 'Envoyer ma demande →';
    }
  });
})();
