// KADOSK V6 — émission unitaire et gestion des cartes (propriétaire).
// Montant, quota du plan gratuit, devise et destinataire sont revalidés côté serveur.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('caMessage');
  var offre = null, choisi = null, cle = KD6.cle(), page = 0;
  var STATUTS = { ACTIVE: ['Active', 'ok'], PENDING_ACTIVATION: ['En attente du client', 'attente'], SUSPENDED: ['Suspendue', 'attente'],
    REDEEMED: ['Utilisée', 'ok'], EXPIRED: ['Expirée', 'erreur'], CANCELLED: ['Annulée', 'erreur'] };
  var cents = function (v) { var t = String(v || '').trim().replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null; };

  function rendreMontants() {
    var fixes = offre ? (offre.denominations_minor || []).map(Number) : [];
    var libre = !offre || offre.allow_custom_amount;
    $('caMontants').innerHTML = fixes.map(function (m) { return '<button type="button" data-m="' + m + '" aria-pressed="' + (choisi === m) + '">' + (m / 100).toLocaleString('fr-FR') + '</button>'; }).join('') +
      (libre ? '<button type="button" data-m="libre" aria-pressed="' + (choisi === 'libre') + '">Montant libre</button>' : '');
    $('caMontants').hidden = !fixes.length;
    $('caLibreChamp').hidden = fixes.length > 0 && choisi !== 'libre';
    $('caFourchette').textContent = offre && libre ? 'Entre ' + Number(offre.custom_min_minor) / 100 + ' et ' + Number(offre.custom_max_minor) / 100 + '.' : '';
  }

  $('caMontants').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-m]'); if (!b) return;
    choisi = b.dataset.m === 'libre' ? 'libre' : Number(b.dataset.m);
    rendreMontants();
  });

  async function lister() {
    try {
      var cartes = await KD6.appeler('cards.list', { status: $('caFiltre').value || undefined, limit: 51, offset: page * 50 });
      $('caPrecedent').disabled = page === 0; $('caSuivant').disabled = cartes.length <= 50;
      $('caPage').textContent = 'Page ' + (page + 1); cartes = cartes.slice(0, 50);
      $('caListe').innerHTML = cartes.length ? '<table class="v6-table"><thead><tr><th>Carte</th><th>Montant</th><th>Solde</th><th>Statut</th><th>Bénéficiaire</th><th></th></tr></thead><tbody>' +
        cartes.map(function (c) {
          var st = STATUTS[c.status] || [c.status, 'attente'];
          var actions = (c.status === 'ACTIVE' || c.status === 'PENDING_ACTIVATION' ? '<button type="button" class="v6-copier" data-a="SUSPENDED" data-id="' + c.id + '">Suspendre</button>' : '') +
            (c.status === 'SUSPENDED' ? '<button type="button" class="v6-copier" data-a="ACTIVE" data-id="' + c.id + '">Réactiver</button>' : '') +
            (['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'].indexOf(c.status) >= 0 ? '<button type="button" class="v6-copier" data-a="CANCELLED" data-id="' + c.id + '">Annuler</button>' : '') +
            (['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'].indexOf(c.status) >= 0 ? '<button type="button" class="v6-copier" data-resend="' + c.id + '">Renvoyer</button>' : '') + '<button type="button" class="v6-copier" data-h="' + c.id + '">Historique</button>';
          return '<tr><td data-label="Carte">…' + KD6.esc(c.display_suffix) + '</td><td data-label="Montant">' + KD6.argent(c.initial_amount_minor, c.currency) + '</td>' +
            '<td data-label="Solde">' + KD6.argent(c.balance_minor, c.currency) + '</td><td data-label="Statut"><span class="v6-pastille v6-pastille-' + st[1] + '">' + st[0] + '</span></td>' +
            '<td data-label="Bénéficiaire">' + KD6.esc([c.recipient_email, c.recipient_phone].filter(Boolean).join(' / ') || '—') + '<br><small>' + (c.delivered_at ? 'Accepté par Brevo' : 'Envoi en attente ou à reprendre') + '</small>' + '</td><td data-label="Actions">' + actions + '</td></tr>' +
            '<tr hidden data-hist="' + c.id + '"><td colspan="6"></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="v6-vide">Aucune carte.</p>';
    } catch (e) { $('caListe').innerHTML = ''; KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  $('caListe').addEventListener('click', async function (ev) {
    var a = ev.target.closest('button[data-a]'), h = ev.target.closest('button[data-h]');
    try {
      var resend = ev.target.closest('[data-resend]');
      if (resend) { await KD6.appeler('cards.resend', { cardId: resend.dataset.resend }); KD6.afficher(msg, 'Renvoi enregistré. Il sera traité automatiquement.', 'ok'); return; }
      if (a) {
        var motif = null;
        if (a.dataset.a === 'CANCELLED') {
          motif = window.prompt('Motif de l’annulation (obligatoire). Le solde restant sera annulé définitivement :');
          if (!motif) return;
        } else if (a.dataset.a === 'SUSPENDED') { motif = window.prompt('Motif de la suspension :') || 'Suspension par le commerce'; }
        await KD6.appeler('cards.status', { cardId: a.dataset.id, status: a.dataset.a, reason: motif });
        KD6.afficher(msg, 'Carte mise à jour.', 'ok'); lister();
      } else if (h) {
        var ligne = document.querySelector('tr[data-hist="' + h.dataset.h + '"]');
        if (!ligne.hidden) { ligne.hidden = true; return; }
        var TYPES = { ISSUE: 'Émission', REDEEM: 'Encaissement', ADJUST: 'Ajustement (admin)', CANCEL: 'Annulation', EXPIRE: 'Expiration' };
        var hist = await KD6.appeler('cards.history', { cardId: h.dataset.h });
        ligne.firstElementChild.innerHTML = hist.map(function (x) {
          return '<div class="v6-ligne"><span>' + KD6.date(x.created_at) + ' · ' + (TYPES[x.entry_type] || x.entry_type) + '</span><strong>' +
            (x.amount_minor > 0 ? '+' : '') + (Number(x.amount_minor) / 100).toFixed(2).replace('.', ',') + ' → solde ' + (Number(x.balance_after_minor) / 100).toFixed(2).replace('.', ',') + '</strong></div>';
        }).join('');
        ligne.hidden = false;
      }
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  });

  $('caEmettre').addEventListener('click', async function () {
    var b = this;
    var montant = typeof choisi === 'number' ? (choisi / 100).toFixed(2) : $('caMontant').value;
    if (!cents(montant)) { KD6.afficher(msg, 'Choisissez ou saisissez un montant.', 'erreur'); return; }
    b.disabled = true;
    try {
      var envoi = $('caEnvoi').value ? new Date($('caEnvoi').value).toISOString() : null;
      var exp = $('caExpiration').value ? new Date($('caExpiration').value + 'T23:59:59').toISOString() : null;
      var r = await KD6.appeler('cards.issue', { amount: montant, recipientEmail: $('caEmail').value, deliveryChannel: 'EMAIL', recipientName: $('caNom').value,
        senderName: $('caDe').value, message: $('caMessageClient').value, scheduledDeliveryAt: envoi, expiresAt: exp, idempotencyKey: cle });
      KD6.afficher(msg, r.scheduledDeliveryAt ? 'Carte créée : envoi programmé le ' + KD6.date(r.scheduledDeliveryAt) + '.' : (r.deliveryStatus === 'SENT' ? 'Carte créée : envoi accepté par Brevo.' : 'Carte créée. Envoi en attente ; reprise automatique prévue.'), 'ok');
      cle = KD6.cle(); // nouvelle émission = nouvelle clé
      ['caEmail', 'caNom', 'caDe', 'caMessageClient', 'caEnvoi', 'caExpiration', 'caMontant'].forEach(function (id) { $(id).value = ''; });
      lister();
    } catch (e) {
      var m = { RECIPIENT_EMAIL_INVALID: 'E-mail du bénéficiaire invalide.', INVALID_DELIVERY_SCHEDULE: 'Date d’envoi invalide (dans le futur, moins d’un an).',
        INVALID_EXPIRY: 'Date d’expiration invalide.', MERCHANT_NOT_ACTIVE: 'Votre compte doit être actif (abonnement) pour émettre.' };
      KD6.afficher(msg, m[e.message] || KD6.message(e), 'erreur');
    } finally { b.disabled = false; }
  });

  $('caFiltre').addEventListener('change', function () { page = 0; lister(); });
  $('caPrecedent').addEventListener('click', function () { if (page > 0) { page--; lister(); } });
  $('caSuivant').addEventListener('click', function () { page++; lister(); });
  KD6.appeler('cardSettings.get').then(function (s) { offre = s; choisi = s && (s.denominations_minor || []).length ? Number(s.denominations_minor[0]) : 'libre'; rendreMontants(); })
    .catch(function () { choisi = 'libre'; rendreMontants(); });
  lister();
})();
