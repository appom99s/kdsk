// KADOSK V6 — validation manuelle des virements (admin avec permission payments.verify).
// Le serveur vérifie : rôle, absence de lien avec le marchand, montant, devise,
// référence bancaire unique, et n'active l'abonnement qu'une seule fois.
(function () {
  'use strict';
  if (window.KADOSK_ADMIN_NAV) KADOSK_ADMIN_NAV.rendre('paiements');
  var $ = function (id) { return document.getElementById(id); };
  var statut = 'PENDING_VERIFICATION';
  var msg = $('apMessage');

  function carte(o) {
    var recus = o.receipts.length ? o.receipts.map(function (r, i) {
      return '<div class="v6-ligne"><span>Justificatif ' + (i + 1) + ' · ' + KD6.date(r.uploadedAt) + '</span><strong>' +
        (r.viewUrl ? '<a href="' + KD6.esc(r.viewUrl) + '" target="_blank" rel="noopener noreferrer">Ouvrir</a>' : 'indisponible') +
        (r.declaredAmountMinor ? ' · déclaré ' + KD6.argent(r.declaredAmountMinor, o.currency) : '') +
        (r.declaredBankRef ? ' · réf. ' + KD6.esc(r.declaredBankRef) : '') + '</strong></div>';
    }).join('') : '<p class="v6-aide">Aucun justificatif déposé.</p>';
    var revue = o.paymentStatus === 'NEEDS_REVIEW';
    return '<article class="v6-carte" data-id="' + o.id + '">' +
      '<h2>' + KD6.esc(o.merchant ? o.merchant.business_name : '—') + ' <span class="v6-pastille v6-pastille-attente">' + KD6.esc(o.planName) + ' · ' + KD6.PERIODES[o.billingPeriod] + '</span></h2>' +
      '<div class="v6-ligne"><span>Montant attendu</span><strong class="v6-reference">' + KD6.argent(o.amountMinor, o.currency) + '</strong></div>' +
      '<div class="v6-ligne"><span>Référence</span><strong class="v6-reference">' + KD6.esc(o.paymentReference) + '</strong></div>' +
      '<div class="v6-ligne"><span>Commande Wix</span><strong>' + KD6.esc(o.wixOrderNumber || 'en cours de création') + '</strong></div>' +
      '<div class="v6-ligne"><span>Créée le</span><strong>' + KD6.date(o.createdAt) + '</strong></div>' + recus +
      (revue
        ? '<div class="v6-champ" style="margin-top:12px"><label>Décision sur l’écart (motif obligatoire)</label><textarea data-f="note" rows="2"></textarea></div>' +
          '<div class="v6-actions"><button type="button" class="v6-bouton" data-a="accepter">Accepter le montant reçu</button><button type="button" class="v6-bouton v6-bouton-danger" data-a="refuserEcart">Refuser</button></div>'
        : '<div class="v6-grille v6-grille-2" style="margin-top:12px">' +
          '<div class="v6-champ"><label>Montant reçu sur le compte (MAD)</label><input data-f="montant" inputmode="decimal" value="' + (o.amountMinor / 100).toFixed(2) + '" /></div>' +
          '<div class="v6-champ"><label>Référence de l’opération bancaire *</label><input data-f="ref" maxlength="60" autocomplete="off" /></div></div>' +
          '<label class="v6-aide" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-f="confirme" /> J’ai constaté la réception de ces fonds sur le relevé du compte KADOSK.</label>' +
          '<div class="v6-actions"><button type="button" class="v6-bouton" data-a="valider">Valider le paiement</button>' +
          '<button type="button" class="v6-bouton v6-bouton-secondaire" data-a="rejeter">Rejeter</button></div>') +
      '</article>';
  }

  async function charger() {
    $('apListe').innerHTML = '<p class="v6-vide">Chargement…</p>';
    try {
      var liste = await KD6.appeler('admin.payments.pending', { status: statut });
      $('apListe').innerHTML = liste.length ? liste.map(carte).join('') : '<p class="v6-vide">Aucune commande dans cette catégorie.</p>';
    } catch (e) { $('apListe').innerHTML = ''; KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  $('apListe').addEventListener('click', async function (ev) {
    var b = ev.target.closest('button[data-a]'); if (!b) return;
    var art = b.closest('article'), id = art.dataset.id;
    var champ = function (f) { var el = art.querySelector('[data-f="' + f + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
    b.disabled = true;
    try {
      if (b.dataset.a === 'valider') {
        if (!window.confirm('Confirmer la validation ? L’abonnement sera activé et la commande Wix marquée payée.')) return;
        var r = await KD6.appeler('admin.payments.validate', { orderId: id, amountReceived: champ('montant'), currency: 'MAD', bankReference: champ('ref'), fundsReceivedConfirmed: champ('confirme') === true });
        var textes = { CONFIRMED: 'Paiement validé.', ALREADY_CONFIRMED: 'Déjà validé : aucune nouvelle activation.', AMOUNT_MISMATCH: 'Montant différent : commande placée en revue.',
          TRANSACTION_ALREADY_USED: 'Cette référence bancaire a déjà servi pour une autre commande : alerte de fraude levée.', DUPLICATE_PAYMENT: 'Paiement en double enregistré, sans réactivation.', UNDER_REVIEW: 'Commande déjà en revue.' };
        KD6.afficher(msg, (textes[r.confirmation] || r.confirmation) + (r.activation === 'ACTIVATED' ? ' Abonnement activé.' : r.activation === 'SCHEDULED' ? ' Activation programmée.' : r.activation === 'ACTIVATION_FAILED' ? ' Activation en échec : incident ouvert, nouvel essai automatique.' : ''),
          r.confirmation === 'CONFIRMED' ? 'ok' : 'attente');
      } else if (b.dataset.a === 'rejeter') {
        var motif = window.prompt('Motif du rejet (envoyé au marchand) :'); if (!motif) return;
        await KD6.appeler('admin.payments.reject', { orderId: id, reason: motif });
        KD6.afficher(msg, 'Paiement rejeté. Le marchand est informé.', 'ok');
      } else {
        var r2 = await KD6.appeler('admin.payments.resolveReview', { orderId: id, decision: b.dataset.a === 'accepter' ? 'ACCEPT' : 'REJECT', note: champ('note') });
        KD6.afficher(msg, r2.decision === 'ACCEPT' ? 'Écart accepté.' + (r2.activation === 'ACTIVATED' ? ' Abonnement activé.' : '') : 'Écart refusé.', 'ok');
      }
      charger();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
    finally { b.disabled = false; }
  });

  $('apFiltres').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      statut = b.dataset.s;
      $('apFiltres').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      charger();
    });
  });
  charger();
})();
