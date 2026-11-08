// KADOSK V6 — assistant de démarrage et réglages V6 (profil, points de vente,
// caissiers, montants). Données et contrôles côté serveur (Supabase via Velo).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('deMessage');
  var ANCRES = { profile: '#deProfil', locations: '#deLieux', cashiers: '#deCaissiers', card: '#deOffre', subscription: 'abonnement.html', payment: 'abonnement.html' };
  var cents = function (v) { var t = String(v || '').trim().replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null; };
  var lieux = [], lieuModifie = null;
  var ok = function (t) { KD6.afficher(msg, t, 'ok'); };
  var ko = function (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); };

  async function etapes() {
    var o = await KD6.appeler('onboarding.get');
    var faits = o.steps.filter(function (s) { return s.done; }).length;
    $('deTitre').textContent = 'Bienvenue, ' + o.merchant.businessName;
    if (o.merchant.logoUrl) { $('deLogoApercu').src = o.merchant.logoUrl; $('deLogoApercu').hidden = false; }
    [['dePfAdresse', 'address'], ['dePfVille', 'city'], ['dePfTel', 'phone'], ['dePfActivite', 'activity']].forEach(function (p) {
      if (!$(p[0]).value && o.merchant[p[1]]) $(p[0]).value = o.merchant[p[1]];
    });
    $('deResume').textContent = o.completed ? 'Configuration terminée : vous pouvez émettre et encaisser vos cartes.' : faits + ' étape(s) sur ' + o.steps.length + ' terminée(s).';
    $('deJauge').style.width = Math.round(faits / o.steps.length * 100) + '%';
    $('deEtapes').innerHTML = o.steps.map(function (s) {
      return '<li class="' + (s.done ? 'fait' : '') + '"><span style="flex:1">' + KD6.esc(s.label) + '</span>' +
        (s.done ? '' : '<a class="v6-bouton v6-bouton-secondaire" href="' + ANCRES[s.key] + '">Ouvrir</a>') + '</li>';
    }).join('');
  }

  async function chargerLieux() {
    lieux = await KD6.appeler('locations.list') || [];
    $('deListeLieux').innerHTML = lieux.length ? lieux.map(function (l) {
      return '<div class="v6-ligne"><span>' + KD6.esc(l.name) + (l.city ? ' — ' + KD6.esc(l.city) : '') + '</span><strong>' + (l.status === 'ACTIVE' ? 'Actif' : 'Inactif') + '</strong><button class="v6-copier" data-edit-lieu="' + l.id + '">Modifier</button><button class="v6-copier" data-toggle-lieu="' + l.id + '">' + (l.status === 'ACTIVE' ? 'Désactiver' : 'Activer') + '</button></div>';
    }).join('') : '<p class="v6-aide">Aucun point de vente pour le moment.</p>';
    $('deCaissierLieu').innerHTML = '<option value="">— À attribuer plus tard —</option>' + lieux.filter(function (l) { return l.status === 'ACTIVE'; })
      .map(function (l) { return '<option value="' + l.id + '">' + KD6.esc(l.name) + '</option>'; }).join('');
  }

  async function chargerCaissiers() {
    var r = await KD6.appeler('cashiers.list');
    var c = r.capacity || {};
    $('deCapacite').textContent = 'Formule : ' + (c.limit != null ? c.limit : '—') + ' caissier(s) actif(s) maximum · ' + (c.active || 0) + ' actif(s), ' + (c.invited || 0) + ' invitation(s) en cours.';
    var STATUTS = { INVITED: 'Invité', ACTIVE: 'Actif', DISABLED: 'Désactivé' };
    $('deListeCaissiers').innerHTML = (r.cashiers || []).length ? r.cashiers.map(function (m) {
      var noms = (m.locationIds || []).map(function (id) { var l = lieux.filter(function (x) { return x.id === id; })[0]; return l ? l.name : '?'; }).join(', ');
      return '<div class="v6-ligne"><span>' + KD6.esc(m.invited_email || '—') + '<br><span class="v6-aide">' + KD6.esc(noms || 'Aucun point de vente') + '</span></span><strong>' +
        KD6.esc(STATUTS[m.status] || m.status) + (m.status !== 'DISABLED' ? '<label class="v6-aide">Points de vente<select multiple aria-label="Points de vente du caissier" data-affectations="' + m.id + '">' + lieux.filter(l => l.status === 'ACTIVE').map(l => '<option value="' + l.id + '"' + ((m.locationIds || []).includes(l.id) ? ' selected' : '') + '>' + KD6.esc(l.name) + '</option>').join('') + '</select></label><button class="v6-copier" data-affecter="' + m.id + '">Enregistrer les affectations</button>' : '') + (m.status !== 'DISABLED' ? ' <button type="button" class="v6-copier" data-desactiver="' + m.id + '">Retirer</button>' : '') + '</strong></div>';
    }).join('') : '<p class="v6-aide">Aucun caissier.</p>';
  }

  async function chargerProfilEtOffre() {
    var s = await KD6.appeler('cardSettings.get');
    if (s) {
      $('deMontants').value = (s.denominations_minor || []).map(function (m) { return Number(m) / 100; }).join(', ');
      $('deLibre').checked = !!s.allow_custom_amount;
      $('deMin').value = Number(s.custom_min_minor) / 100;
      $('deMax').value = Number(s.custom_max_minor) / 100;
      $('deValidite').value = s.default_validity_months || '';
      if (s.design && /^#[0-9a-fA-F]{6}$/.test(s.design.color || '')) $('deCouleur').value = s.design.color;
    }
  }

  $('deEnregistrerProfil').addEventListener('click', function () {
    var champs = { address: $('dePfAdresse').value, city: $('dePfVille').value, phone: $('dePfTel').value, activity: $('dePfActivite').value };
    Object.keys(champs).forEach(function (k) { if (!champs[k].trim()) delete champs[k]; });
    KD6.appeler('merchant.updateProfile', champs).then(function () { ok('Profil enregistré.'); etapes(); }).catch(ko);
  });

  $('deAjouterLieu').addEventListener('click', function () {
    KD6.appeler('locations.save', { id: lieuModifie || undefined, active: !lieuModifie || lieux.find(l => l.id === lieuModifie)?.status === 'ACTIVE', name: $('deLieuNom').value, city: $('deLieuVille').value, address: $('deLieuAdresse').value })
      .then(function () { $('deLieuNom').value = ''; $('deLieuAdresse').value = ''; lieuModifie = null; $('deAnnulerLieu').hidden = true; $('deAjouterLieu').textContent = 'Ajouter le point de vente'; ok('Point de vente enregistré.'); return Promise.all([chargerLieux(), etapes()]); })
      .catch(function (e) { KD6.afficher(msg, e.message === 'LOCATION_NAME_REQUIRED' ? 'Indiquez le nom du point de vente.' : KD6.message(e), 'erreur'); });
  });

  $('deInviter').addEventListener('click', function () {
    var lieu = $('deCaissierLieu').value;
    KD6.appeler('cashiers.invite', { email: $('deCaissierEmail').value, locationIds: lieu ? [lieu] : [] })
      .then(function () { $('deCaissierEmail').value = ''; ok('Invitation envoyée.'); return Promise.all([chargerCaissiers(), etapes()]); })
      .catch(function (e) {
        var m = { EMAIL_INVALID: 'Adresse e-mail invalide.', OWNER_CANNOT_BE_CASHIER: 'Utilisez une autre adresse que la vôtre.', CASHIER_ALREADY_INVITED: 'Cette personne est déjà invitée ou active.',
          CASHIER_CAPACITY_EXCEEDED: 'Limite de caissiers de votre formule atteinte : changez de formule dans Abonnement.' };
        KD6.afficher(msg, m[e.message] || KD6.message(e), 'erreur');
      });
  });

  $('deListeCaissiers').addEventListener('click', function (ev) {
    var assign = ev.target.closest('[data-affecter]');
    if (assign) { var select = document.querySelector('[data-affectations="' + assign.dataset.affecter + '"]'); KD6.appeler('cashiers.assign', { memberId: assign.dataset.affecter, locationIds: Array.from(select.selectedOptions, o => o.value) }).then(() => { ok('Affectations enregistrées.'); chargerCaissiers(); }).catch(ko); return; }
    var b = ev.target.closest('[data-desactiver]'); if (!b) return;
    if (!window.confirm('Retirer ce caissier ? Ses sessions de caisse seront fermées.')) return;
    KD6.appeler('cashiers.disable', { memberId: b.dataset.desactiver }).then(function () { ok('Caissier retiré.'); chargerCaissiers(); }).catch(ko);
  });

  $('deEnregistrerOffre').addEventListener('click', function () {
    var montants = $('deMontants').value.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean).map(cents);
    if (montants.some(function (m) { return m === null; })) { KD6.afficher(msg, 'Montants invalides.', 'erreur'); return; }
    var validite = parseInt($('deValidite').value, 10);
    KD6.appeler('cardSettings.save', { denominations: montants, allowCustomAmount: $('deLibre').checked,
      customMinMinor: cents($('deMin').value) || 5000, customMaxMinor: cents($('deMax').value) || 500000,
      defaultValidityMonths: Number.isFinite(validite) ? validite : null, design: { color: $('deCouleur').value } })
      .then(function () { ok('Montants enregistrés.'); etapes(); }).catch(ko);
  });

  $('deListeLieux').addEventListener('click', async function (ev) {
    var b = ev.target.closest('[data-edit-lieu],[data-toggle-lieu]'); if (!b) return;
    var l = lieux.find(x => x.id === (b.dataset.editLieu || b.dataset.toggleLieu)); if (!l) return;
    if (b.dataset.editLieu) {
      lieuModifie = l.id; $('deLieuNom').value = l.name; $('deLieuVille').value = l.city || ''; $('deLieuAdresse').value = l.address || '';
      $('deAjouterLieu').textContent = 'Enregistrer les modifications'; $('deAnnulerLieu').hidden = false; $('deLieuNom').focus();
    } else {
      try { await KD6.appeler('locations.save', { id: l.id, name: l.name, city: l.city, address: l.address, active: l.status !== 'ACTIVE' }); await chargerLieux(); await chargerCaissiers(); await etapes(); }
      catch (e) { ko(e); }
    }
  });
  $('deAnnulerLieu').addEventListener('click', function () { lieuModifie = null; ['deLieuNom','deLieuVille','deLieuAdresse'].forEach(id => $(id).value = ''); this.hidden = true; $('deAjouterLieu').textContent = 'Ajouter le point de vente'; });
  $('deEnvoyerLogo').addEventListener('click', async function () {
    var file = $('deLogo').files[0]; if (!file) return; this.disabled = true;
    try {
      var target = await KD6.appeler('merchant.logoUploadUrl', { mimeType: file.type, sizeInBytes: file.size });
      var response = await fetch(target.uploadUrl + (target.uploadUrl.includes('?') ? '&' : '?') + 'filename=' + encodeURIComponent(target.fileName), { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw Error('UPLOAD_FAILED');
      var result = await response.json(); var uploaded = (result.files && result.files[0]) || result.file || result;
      if (!uploaded.url) throw Error('UPLOAD_FAILED');
      await KD6.appeler('merchant.updateProfile', { logoUrl: uploaded.url }); await etapes(); ok('Logo enregistré.');
    } catch (e) { ko(e); } finally { this.disabled = false; }
  });

  Promise.all([etapes(), chargerLieux().then(chargerCaissiers), chargerProfilEtOffre()]).catch(ko);
})();
