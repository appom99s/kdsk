// KADOSK V6 — caisse : scan QR + PIN. Tous les contrôles (rôle, marchand,
// point de vente, appareil, PIN, solde, double débit) sont faits côté serveur.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('scMessage');
  var flux = null, boucle = null, detecteur = null, code = null, cle = null;
  var JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';

  function vider() { code = null; cle = null; $('scEncaissement').hidden = true; $('scPin').value = ''; $('scMontant').value = ''; }

  async function preparer() {
    try {
      var dev = await KD6.appeler('cashier.device.start');
      if (dev && dev.status === 'VERIFICATION_REQUIRED') { $('scAppareil').hidden = false; $('scCaisse').hidden = true; return; }
      var lieux = await KD6.appeler('cashier.locations');
      $('scLieu').innerHTML = lieux.length ? lieux.map(function (l) { return '<option value="' + l.id + '">' + KD6.esc(l.name + (l.city ? ' — ' + l.city : '')) + '</option>'; }).join('')
        : '<option value="">Aucun point de vente attribué</option>';
      if (!lieux.length) KD6.afficher(msg, 'Aucun point de vente ne vous est attribué : contactez le responsable du commerce.', 'erreur');
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  async function validerAppareil() {
    try {
      await KD6.appeler('cashier.device.verify', { code: $('scCodeAppareil').value.trim() });
      $('scAppareil').hidden = true; $('scCaisse').hidden = false;
      KD6.afficher(msg, 'Appareil vérifié.', 'ok');
      preparer();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  function chargerJsqr() {
    return new Promise(function (ok, ko) {
      if (window.jsQR) return ok();
      var s = document.createElement('script'); s.src = JSQR_URL; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
    });
  }

  async function demarrer() {
    if (flux) return;
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (_) { flux = null; KD6.afficher(msg, 'Caméra indisponible ou refusée : saisissez le code manuellement.', 'erreur'); return; }
    var video = $('scVideo'); video.srcObject = flux; $('scZoneScan').hidden = false;
    video.play().catch(function () {});
    if ('BarcodeDetector' in window) { try { detecteur = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (_) { detecteur = null; } }
    if (!detecteur) { try { await chargerJsqr(); } catch (_) { arreter(); KD6.afficher(msg, 'Lecteur QR indisponible : saisissez le code.', 'erreur'); return; } }
    var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
    boucle = setInterval(async function () {
      if (!flux || video.readyState < 2) return;
      try {
        var valeur = null;
        if (detecteur) { var r = await detecteur.detect(video); valeur = r && r[0] && r[0].rawValue; }
        else {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0);
          var img = ctx.getImageData(0, 0, canvas.width, canvas.height); var q = window.jsQR(img.data, img.width, img.height);
          valeur = q && q.data;
        }
        if (valeur) { arreter(); $('scCode').value = valeur; rechercher(); }
      } catch (_) { /* image suivante */ }
    }, 250);
  }

  function arreter() {
    if (boucle) clearInterval(boucle); boucle = null;
    if (flux) flux.getTracks().forEach(function (t) { t.stop(); }); flux = null;
    $('scZoneScan').hidden = true;
  }

  async function rechercher() {
    var saisi = $('scCode').value.trim();
    // Carte V3 (code permanent KDSK-…) : traitée par l'écran d'encaissement V3.
    if (/^KDSK-/i.test(saisi)) { window.location.href = 'cashier.html#code=' + encodeURIComponent(saisi); return; }
    try {
      var info = await KD6.appeler('redeem.lookup', { code: saisi, locationId: $('scLieu').value });
      code = saisi; cle = KD6.cle();
      var statuts = { ACTIVE: 'Active', PENDING_ACTIVATION: 'En attente d’activation par le client', SUSPENDED: 'Suspendue', CANCELLED: 'Annulée', EXPIRED: 'Expirée', REDEEMED: 'Entièrement utilisée' };
      $('scCarteInfo').innerHTML = '<div class="v6-ligne"><span>Carte</span><strong>…' + KD6.esc(info.displaySuffix) + '</strong></div>' +
        '<div class="v6-ligne"><span>Statut</span><strong>' + KD6.esc(statuts[info.status] || info.status) + '</strong></div>' +
        (info.expiresAt ? '<div class="v6-ligne"><span>Validité</span><strong>' + KD6.date(info.expiresAt) + '</strong></div>' : '');
      $('scEncaissement').hidden = false;
      KD6.afficher(msg, info.status === 'ACTIVE' ? '' : 'Cette carte ne peut pas être encaissée en l’état.', info.status === 'ACTIVE' ? 'info' : 'attente');
      $('scMontant').focus();
    } catch (e) { vider(); KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  async function encaisser() {
    var b = $('scEncaisser'); b.disabled = true;
    var pin = $('scPin').value;
    $('scPin').value = ''; // effacé dès l'envoi
    try {
      // Même clé en cas de nouvel essai (coupure réseau) : jamais deux débits.
      var r = await KD6.appeler('redeem.confirm', { code: code, amount: $('scMontant').value, pin: pin, locationId: $('scLieu').value, idempotencyKey: cle });
      var montant = r.currency ? KD6.argent(r.amountMinor, r.currency) : ((r.amountMinor / 100).toFixed(2).replace('.', ','));
      KD6.afficher(msg, (r.result === 'ALREADY_REDEEMED' ? 'Déjà encaissé : ' : 'Encaissé : ') + montant + '. Le client reçoit son nouveau solde par e-mail.', 'ok');
      vider();
    } catch (e) {
      var txt = KD6.message(e);
      if (e.message === 'PIN_INVALID') txt += ' Le client peut réessayer.';
      // Un refus métier n'a rien débité : nouvelle clé pour la tentative suivante.
      if (['PIN_INVALID', 'INSUFFICIENT_BALANCE', 'INVALID_AMOUNT'].indexOf(e.message) >= 0) cle = KD6.cle();
      KD6.afficher(msg, txt, 'erreur');
    } finally { b.disabled = false; }
  }

  $('scDemarrer').addEventListener('click', demarrer);
  $('scArreter').addEventListener('click', arreter);
  $('scRechercher').addEventListener('click', rechercher);
  $('scEncaisser').addEventListener('click', encaisser);
  $('scNouvelle').addEventListener('click', function () { vider(); $('scCode').value = ''; KD6.afficher(msg, '', 'info'); });
  $('scValiderAppareil').addEventListener('click', validerAppareil);
  document.addEventListener('visibilitychange', function () { if (document.hidden) arreter(); });
  window.addEventListener('pagehide', arreter);
  preparer();
})();
