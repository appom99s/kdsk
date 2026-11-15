(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var today = new Date(), first = new Date(today.getFullYear(), today.getMonth(), 1);
  function day(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  $('statsFrom').value = day(first); $('statsTo').value = day(today);
  async function refresh(event) {
    if (event) event.preventDefault();
    var since = new Date($('statsFrom').value+'T00:00:00'), until = new Date($('statsTo').value+'T00:00:00'); until.setDate(until.getDate()+1);
    if (!Number.isFinite(+since) || !Number.isFinite(+until) || until<=since || until-since>367*86400000) { KD6.afficher($('statsMessage'), 'Choisissez une période de 366 jours maximum.', 'erreur'); return; }
    var button = $('statsForm').querySelector('button'); button.disabled = true;
    try {
      var rows = await KD6.appeler('locations.stats', { since: since.toISOString(), until: until.toISOString() });
      KD6.afficher($('statsMessage'), '', 'info');
      $('statsResults').innerHTML = rows.length ? '<table class="v6-table"><thead><tr><th>Point de vente</th><th>Encaissements</th><th>Cartes utilisées</th><th>Montant encaissé</th></tr></thead><tbody>'+rows.map(function (r) { return '<tr><td data-label="Point de vente">'+KD6.esc(r.name+(r.city?' — '+r.city:''))+'</td><td data-label="Encaissements">'+KD6.esc(r.redemption_count)+'</td><td data-label="Cartes utilisées">'+KD6.esc(r.cards_used)+'</td><td data-label="Montant">'+(r.currency?KD6.argent(r.redeemed_minor,r.currency):'—')+'</td></tr>'; }).join('')+'</tbody></table>' : '<p>Aucun point de vente.</p>';
    } catch (e) { KD6.afficher($('statsMessage'), KD6.message(e), 'erreur'); } finally { button.disabled=false; }
  }
  $('statsForm').addEventListener('submit', refresh); refresh();
})();
