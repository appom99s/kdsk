(function () {
  'use strict';
  var $ = id => document.getElementById(id);
  var token = new URLSearchParams(location.hash.slice(1)).get('jeton');
  history.replaceState(null, '', location.pathname);
  $('pinForm').hidden = !token;
  $('resetRequest').hidden = Boolean(token);
  $('resetRequest').addEventListener('submit', async function (event) {
    event.preventDefault(); const button = this.querySelector('button'); button.disabled = true;
    const contact = $('contact').value.trim();
    try {
      await KD6.appelerPublic('card.requestPinReset', { cardCode: $('cardCode').value,
        recipientEmail: contact.includes('@') ? contact : undefined,
        recipientPhone: contact.includes('@') ? undefined : contact });
      KD6.afficher($('pinMessage'), 'Si ces informations correspondent à une carte éligible, un lien sera envoyé à ses coordonnées enregistrées. Son traitement peut prendre jusqu’à une heure.', 'ok');
    } catch (error) { KD6.afficher($('pinMessage'), KD6.message(error), 'erreur'); }
    finally { button.disabled = false; }
  });
  $('pinForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    if ($('pin1').value !== $('pin2').value) { KD6.afficher($('pinMessage'), 'Les deux PIN ne correspondent pas.', 'erreur'); return; }
    $('pinEnvoyer').disabled = true;
    try {
      await KD6.appelerPublic('card.setPin', { token, pin: $('pin1').value });
      $('pin1').value = $('pin2').value = ''; token = null; $('pinForm').hidden = true;
      KD6.afficher($('pinMessage'), 'Votre PIN est enregistré. Conservez le QR reçu par e-mail pour payer en caisse. Une suspension décidée par le commerce reste applicable.', 'ok');
    } catch (error) {
      KD6.afficher($('pinMessage'), KD6.message(error), 'erreur');
      if (error.message === 'TOKEN_INVALID') $('resetRequest').hidden = false;
    } finally { $('pinEnvoyer').disabled = false; }
  });
})();
