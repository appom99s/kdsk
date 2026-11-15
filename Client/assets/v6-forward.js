(function () {
  'use strict';
  var token = new URLSearchParams(location.hash.slice(1)).get('jeton');
  var form = document.getElementById('forwardForm'), status = document.getElementById('forwardStatus');
  history.replaceState(null, '', location.pathname);
  if (!/^[a-f0-9]{64}$/.test(token || '')) { form.hidden = true; KD6.afficher(status, 'Ouvrez le lien personnel reçu par e-mail.', 'erreur'); return; }
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); var button = document.getElementById('forwardSend');
    var email = document.getElementById('finalEmail').value.trim().toLowerCase();
    if (email !== document.getElementById('confirmEmail').value.trim().toLowerCase()) { KD6.afficher(status, 'Les deux adresses e-mail doivent être identiques.', 'erreur'); return; }
    button.disabled = true;
    try {
      var result = await KD6.appelerPublic('gift.forward', { token: token, recipientEmail: email, recipientName: document.getElementById('finalName').value, message: document.getElementById('personalMessage').value });
      form.reset(); form.hidden = true; token = null;
      KD6.afficher(status, result.status === 'ACCEPTED_PENDING_FINALIZATION' ? 'Email accepté par Brevo. La confirmation de livraison est en cours ; le lien reçu reste utilisable.' : 'Votre cadeau a été envoyé : email accepté par Brevo.', 'ok');
    } catch (error) {
      KD6.afficher(status, KD6.message(error), 'erreur');
      if (['FORWARD_ALREADY_SENT','TOKEN_INVALID'].includes(error.message)) { form.reset(); form.hidden = true; }
    } finally { button.disabled = false; }
  });
  window.addEventListener('pagehide', function () { document.getElementById('personalMessage').value = ''; });
})();
