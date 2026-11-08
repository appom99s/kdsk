// KADOSK V6 — écran Abonnement (propriétaire).
// Le navigateur n'envoie que le choix (formule, périodicité) : prix, taxe,
// prorata, mode de paiement et activation sont calculés et contrôlés côté serveur.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var etat = { plans: null, statut: null, periode: 'MONTHLY', choix: null, devis: null, cleDemande: null };
  var msg = $('abMessage');

  function ligne(label, valeur) { return '<div class="v6-ligne"><span>' + KD6.esc(label) + '</span><strong>' + valeur + '</strong></div>'; }
  function pastille(texte, type) { return '<span class="v6-pastille v6-pastille-' + type + '">' + KD6.esc(texte) + '</span>'; }

  function prixTtc(p) { return p.amountMinor + Math.floor((p.amountMinor * p.taxRateBp + 5000) / 10000); }

  async function charger() {
    try {
      var r = await Promise.all([KD6.appeler('subscription.status'), KD6.appeler('subscription.plans')]);
      etat.statut = r[0]; etat.plans = r[1];
      rendreActuel(); rendreEnCours(); rendrePeriodes(); rendreFormules();
      await gererRetourPaypal();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  function rendreActuel() {
    var s = etat.statut.subscription;
    if (!s) { $('abActuel').innerHTML = '<p>Aucune formule active. Choisissez une formule ci-dessous (la formule Gratuit est disponible sans paiement).</p>'; return; }
    var statuts = { ACTIVE: ['Active', 'ok'], PAST_DUE: ['Échéance dépassée', 'attente'], EXPIRED: ['Expirée', 'erreur'], CANCELLED: ['Résiliée', 'erreur'], UNDER_REVIEW: ['En revue', 'attente'] };
    var st = statuts[s.status] || [s.status, 'attente'];
    $('abActuel').innerHTML =
      ligne('Formule', KD6.esc(s.plan ? s.plan.name : '—') + ' ' + pastille(st[0], st[1])) +
      ligne('Caissiers actifs inclus', s.plan && s.plan.max_active_cashiers != null ? String(s.plan.max_active_cashiers) : (s.custom_max_cashiers ? String(s.custom_max_cashiers) : 'Sur mesure')) +
      ligne('Cartes cadeaux', s.plan && s.plan.gift_card_limit != null ? s.plan.gift_card_limit + ' par mois' : 'Illimitées') +
      ligne('Périodicité', s.billing_period ? KD6.PERIODES[s.billing_period] : '—') +
      ligne('Fin de période', KD6.date(s.current_period_end));
  }

  function rendreEnCours() {
    var c = etat.statut.pendingChange, o = etat.statut.order;
    $('abEnCours').hidden = !c; $('abVirement').hidden = true; $('abPaypal').hidden = true;
    if (!c) return;
    var html = ligne('Nouvelle formule', KD6.esc(c.toPlan ? c.toPlan.name : '—') + (c.billingPeriod ? ' · ' + KD6.PERIODES[c.billingPeriod] : '')) +
      ligne('Statut', pastille(c.statusLabel, c.status === 'PENDING_VERIFICATION' || c.status === 'ACTIVATION_PENDING' ? 'attente' : 'attente')) +
      (c.totalMinor ? ligne('Montant', KD6.argent(c.totalMinor, c.currency)) : '') +
      (c.effectiveAt ? ligne('Prise d’effet', KD6.date(c.effectiveAt)) : '');
    if (o) html += ligne('Référence de paiement', '<span class="v6-reference">' + KD6.esc(o.paymentReference) + '</span>') +
      (o.wixOrderNumber ? ligne('Commande n°', KD6.esc(o.wixOrderNumber)) : '');
    html += '<p class="v6-aide">Votre formule actuelle reste active jusqu’à la confirmation du paiement.</p>';
    if (!o || o.paymentStatus === 'NOT_PAID') html += '<div class="v6-actions"><button type="button" class="v6-bouton v6-bouton-secondaire" id="abAnnuler">Annuler ce changement</button></div>';
    $('abEnCoursContenu').innerHTML = html;
    var annuler = $('abAnnuler');
    if (annuler) annuler.addEventListener('click', annulerChangement);
    if (o && o.paymentMethod === 'BANK_TRANSFER') chargerVirement(o);
    if (o && o.paymentMethod === 'PAYPAL' && o.paymentStatus === 'NOT_PAID') {
      $('abPaypal').hidden = false;
      $('abPaypalDetails').innerHTML = ligne('Montant', KD6.argent(o.amountMinor, o.currency)) + ligne('Référence', KD6.esc(o.paymentReference));
    }
  }

  async function chargerVirement(o) {
    $('abVirement').hidden = false;
    try {
      var i = await KD6.appeler('bank.instructions', { orderId: o.id });
      var b = i.bankAccount || {};
      $('abVirementDetails').innerHTML =
        ligne('Montant exact', '<span class="v6-reference">' + KD6.argent(i.amountMinor, i.currency) + '</span>') +
        ligne('Référence à indiquer', '<span class="v6-reference" id="abRefCopie">' + KD6.esc(i.paymentReference) + '</span> <button type="button" class="v6-copier" id="abCopier">Copier</button>') +
        ligne('Bénéficiaire', KD6.esc(b.beneficiary || '—')) + ligne('Banque', KD6.esc(b.bank || '—')) +
        ligne('RIB', KD6.esc(b.rib || '—')) + ligne('IBAN', KD6.esc(b.iban || '—')) + ligne('SWIFT', KD6.esc(b.swift || '—')) +
        (i.receipts && i.receipts.length ? ligne('Justificatifs déposés', String(i.receipts.length)) : '') +
        (i.paymentStatus === 'PENDING_VERIFICATION' ? '<div class="v6-message v6-message-attente">Justificatif reçu : vérification de la réception des fonds en cours.</div>' : '');
      $('abCopier').addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(i.paymentReference).then(function () { $('abCopier').textContent = 'Copié'; });
      });
      $('abFormJustificatif').onsubmit = function (ev) { ev.preventDefault(); envoyerJustificatif(o); };
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  async function empreinte(fichier) {
    try {
      var buf = await fichier.arrayBuffer();
      var h = await crypto.subtle.digest('SHA-256', buf);
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    } catch (_) { return null; }
  }

  async function envoyerJustificatif(o) {
    var fichier = $('abFichier').files[0];
    var bouton = $('abEnvoyerJustificatif');
    if (!fichier) { KD6.afficher(msg, 'Choisissez le fichier de votre avis de virement.', 'erreur'); return; }
    bouton.disabled = true; bouton.textContent = 'Envoi…';
    try {
      var u = await KD6.appeler('bank.receiptUploadUrl', { orderId: o.id, mimeType: fichier.type, sizeInBytes: fichier.size });
      var rep = await fetch(u.uploadUrl + '?filename=' + encodeURIComponent(u.fileName), { method: 'PUT', headers: { 'Content-Type': fichier.type }, body: fichier });
      if (!rep.ok) throw new Error('ECHEC_UPLOAD');
      var res = await rep.json();
      var url = res && res.file && res.file.url;
      if (!url) throw new Error('ECHEC_UPLOAD');
      await KD6.appeler('bank.uploadReceipt', { orderId: o.id, fileUrl: url, fileSha256: await empreinte(fichier),
        declaredAmount: $('abMontantDeclare').value || null, bankReference: $('abRefBanque').value || null });
      KD6.afficher(msg, 'Justificatif reçu. KADOSK vérifie la réception des fonds avant d’activer votre formule.', 'ok');
      await charger();
    } catch (e) { KD6.afficher(msg, e.message === 'ECHEC_UPLOAD' ? 'Échec de l’envoi du fichier. Réessayez.' : KD6.message(e), 'erreur'); }
    finally { bouton.disabled = false; bouton.textContent = 'Déposer le justificatif'; }
  }

  function rendrePeriodes() {
    var periodes = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
    $('abPeriodes').innerHTML = periodes.map(function (p) {
      return '<button type="button" data-p="' + p + '" aria-pressed="' + (p === etat.periode) + '">' + KD6.PERIODES[p] + '</button>';
    }).join('');
    $('abPeriodes').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { etat.periode = b.dataset.p; etat.choix = null; $('abDevis').hidden = true; rendrePeriodes(); rendreFormules(); });
    });
  }

  function rendreFormules() {
    var d = etat.plans;
    if (!d.countryVerified) KD6.afficher(msg, KD6.message({ message: 'COUNTRY_NOT_VERIFIED' }), 'info');
    var actuel = d.current && d.current.planId;
    $('abFormules').innerHTML = d.plans.map(function (p) {
      var prix = p.isFree ? null : p.prices.filter(function (x) { return x.billingPeriod === etat.periode; })[0];
      var libellePrix = p.isFree ? 'Gratuit' : (prix ? KD6.argent(prixTtc(prix), prix.currency) + ' <small>TTC</small>' : (p.code === 'ENTERPRISE' ? 'Sur devis' : '—'));
      var caisses = p.maxActiveCashiers == null ? 'Caissiers sur mesure' : (p.maxActiveCashiers + ' caissier' + (p.maxActiveCashiers > 1 ? 's' : '') + ' actif' + (p.maxActiveCashiers > 1 ? 's' : ''));
      var cartes = p.giftCardLimit == null ? 'Cartes cadeaux illimitées' : p.giftCardLimit + ' cartes par mois';
      var dispo = p.isFree || !!prix;
      return '<button type="button" class="v6-formule" data-code="' + p.code + '" aria-pressed="' + (etat.choix === p.code) + '"' + (dispo ? '' : ' disabled') + '>' +
        (p.id === actuel ? '<span class="v6-actuelle">Actuelle</span>' : '') +
        '<strong>' + KD6.esc(p.name) + '</strong><div class="v6-prix">' + libellePrix + '</div>' +
        '<ul class="v6-liste"><li>' + caisses + '</li><li>' + cartes + '</li><li>0 % de commission</li></ul></button>';
    }).join('');
    $('abFormules').querySelectorAll('.v6-formule').forEach(function (b) { b.addEventListener('click', function () { choisir(b.dataset.code); }); });
  }

  async function choisir(code) {
    etat.choix = code; etat.cleDemande = KD6.cle(); rendreFormules();
    try {
      var q = await KD6.appeler('subscription.quote', { planCode: code, billingPeriod: etat.periode });
      etat.devis = q;
      var html = '';
      if (!q.requiresPayment) {
        html = ligne('Paiement', 'Aucun') + ligne('Prise d’effet', KD6.date(q.effectiveAt));
      } else {
        html = ligne('Prix de la formule (HT)', KD6.argent(q.subtotalMinor, q.currency)) +
          (q.prorationCreditMinor ? ligne('Crédit au prorata', '− ' + KD6.argent(q.prorationCreditMinor, q.currency)) : '') +
          ligne('TVA', KD6.argent(q.taxMinor, q.currency)) + ligne('Total à payer', '<span class="v6-reference">' + KD6.argent(q.totalMinor, q.currency) + '</span>') +
          ligne('Mode de paiement', q.paymentMethod === 'BANK_TRANSFER' ? 'Virement bancaire (Maroc)' : 'PayPal') +
          ligne('Prise d’effet', KD6.date(q.effectiveAt)) + (q.newPeriodEnd ? ligne('Fin de période', KD6.date(q.newPeriodEnd)) : '');
      }
      $('abDevisDetails').innerHTML = html;
      $('abDevis').hidden = false;
    } catch (e) { $('abDevis').hidden = true; KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  async function confirmer() {
    var bouton = $('abConfirmer');
    bouton.disabled = true;
    try {
      // Même clé si l'utilisateur clique deux fois : une seule demande, une seule commande Wix.
      var r = await KD6.appeler('subscription.request', { planCode: etat.choix, billingPeriod: etat.periode, idempotencyKey: etat.cleDemande });
      KD6.afficher(msg, r.requiresPayment
        ? 'Commande créée (référence ' + r.paymentReference + '). ' + (r.paymentMethod === 'BANK_TRANSFER' ? 'Les coordonnées du virement sont affichées ci-dessus.' : 'Finalisez le paiement PayPal.')
        : 'Formule enregistrée.', 'ok');
      $('abDevis').hidden = true; etat.choix = null;
      await charger();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
    finally { bouton.disabled = false; }
  }

  async function annulerChangement() {
    if (!window.confirm('Annuler ce changement de formule ? Votre formule actuelle reste inchangée.')) return;
    try { await KD6.appeler('subscription.cancel', { changeId: etat.statut.pendingChange.id }); KD6.afficher(msg, 'Changement annulé.', 'ok'); await charger(); }
    catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  async function payerPaypal() {
    var b = $('abPayerPaypal'); b.disabled = true;
    try {
      var r = await KD6.appeler('paypal.start', { orderId: etat.statut.order.id });
      window.location.href = r.approvalUrl; // URL validée côté serveur (domaine PayPal uniquement)
    } catch (e) { b.disabled = false; KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  // Retour de PayPal : la capture et la vérification se font côté serveur.
  async function gererRetourPaypal() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('paypal') === 'annule') { KD6.afficher(msg, 'Paiement PayPal annulé. Votre commande reste en attente.', 'info'); return; }
    if (p.get('paypal') !== 'retour' || !p.get('commande')) return;
    history.replaceState(null, '', 'abonnement.html');
    KD6.afficher(msg, 'Vérification du paiement auprès de PayPal…', 'attente');
    try {
      var r = await KD6.appeler('paypal.capture', { orderId: p.get('commande') });
      KD6.afficher(msg, r.status === 'COMPLETED' ? 'Paiement confirmé par PayPal. Votre formule est activée.' :
        r.status === 'PENDING' ? 'Paiement en attente chez PayPal : activation dès sa confirmation.' : 'Le paiement n’a pas abouti.', r.status === 'COMPLETED' ? 'ok' : 'attente');
      var s = await KD6.appeler('subscription.status'); etat.statut = s; rendreActuel(); rendreEnCours();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  }

  $('abConfirmer').addEventListener('click', confirmer);
  $('abPayerPaypal').addEventListener('click', payerPaypal);
  charger();
})();
