// KADOSK V6 — Centre de commande IA (Super Admin / admins avec ai.view).
(function () {
  'use strict';
  if (window.KADOSK_ADMIN_NAV) KADOSK_ADMIN_NAV.rendre('ia');
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('iaMessage');
  var donnees = null, onglet = 'vue';
  var usd = function (micro) { return (Number(micro || 0) / 1e6).toLocaleString('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }); };
  var sev = function (s) { return '<span class="v6-pastille v6-sev-' + KD6.esc(s) + '">' + KD6.esc({ LOW: 'Faible', MEDIUM: 'Moyenne', HIGH: 'Élevée', CRITICAL: 'Critique' }[s] || s) + '</span>'; };
  var STATUTS_AGENT = { IDLE: 'Prêt', RUNNING: 'En cours', PAUSED_BUDGET: 'Budget atteint', DISABLED: 'Désactivé', ERROR: 'Erreur' };
  var ACTIONS = { CREATE_INCIDENT: 'Créer un incident', CREATE_NOTIFICATION: 'Notification', RECOMMEND: 'Recommandation', PREPARE_SUPPORT_MESSAGE: 'Message support',
    VALIDATE_BANK_TRANSFER: 'Valider un virement', MARK_ORDER_PAID: 'Marquer une commande payée', SUSPEND_MERCHANT: 'Suspendre un marchand', MODIFY_PLAN_PRICE: 'Modifier un prix',
    REFUND_PAYMENT: 'Rembourser', ADJUST_BALANCE: 'Ajuster un solde', CANCEL_CARD: 'Annuler une carte', CHANGE_FRAUD_THRESHOLD: 'Modifier un seuil de fraude' };

  function kpi(label, valeur) { return '<div class="v6-kpi"><span>' + label + '</span><strong>' + valeur + '</strong></div>'; }

  function vue() {
    var d = donnees, b = d.budget, pct = Math.min(100, Math.round(b.spentMicroUsd / b.monthlyMicroUsd * 100));
    return '<div class="v6-kpis">' + kpi('Dépense IA du mois', usd(b.spentMicroUsd)) + kpi('Budget restant', usd(b.remainingMicroUsd)) +
      kpi('Incidents ouverts', d.openIncidents.length) + kpi('Alertes critiques', d.criticalAlerts.length) +
      kpi('Virements à vérifier', d.pendingPaymentVerifications) + kpi('Anomalies d’abonnement', d.subscriptionAnomalies.length) +
      kpi('Alertes de fraude', d.fraudAlerts.length) + kpi('Approbations en attente', d.pendingApprovals.length) + '</div>' +
      '<section class="v6-carte"><h2>Budget IA (cible 5 $ / mois)</h2><div class="v6-jauge"><i style="width:' + pct + '%"></i></div><p class="v6-aide">' + KD6.esc(b.note) + '</p></section>' +
      '<section class="v6-carte"><h2>Agents</h2><table class="v6-table"><thead><tr><th>Agent</th><th>Statut</th><th>Modèle</th><th>Dépense / budget</th><th>Dernière exécution</th><th></th></tr></thead><tbody>' +
      d.agents.map(function (a) {
        return '<tr><td data-label="Agent">' + KD6.esc(a.name) + '</td><td data-label="Statut">' + KD6.esc(STATUTS_AGENT[a.status] || a.status) + '</td>' +
          '<td data-label="Modèle">' + KD6.esc(a.model) + '</td><td data-label="Dépense">' + usd(a.spentMicroUsd) + ' / ' + usd(a.monthly_budget_micro_usd) + '</td>' +
          '<td data-label="Dernière exécution">' + KD6.date(a.last_run_at) + '</td><td data-label="Action"><button type="button" class="v6-bouton v6-bouton-secondaire" data-agent="' + a.code + '" data-on="' + (!a.enabled) + '">' + (a.enabled ? 'Désactiver' : 'Activer') + '</button></td></tr>';
      }).join('') + '</tbody></table></section>' +
      (d.criticalAlerts.length ? '<section class="v6-carte"><h2>Alertes critiques</h2>' + d.criticalAlerts.map(function (a) { return '<div class="v6-ligne"><span>' + KD6.esc(a.rule_code) + '</span><strong>' + KD6.date(a.created_at) + '</strong></div>'; }).join('') + '</section>' : '') +
      (d.subscriptionAnomalies.length ? '<section class="v6-carte"><h2>Anomalies abonnements / paiements</h2>' + d.subscriptionAnomalies.map(function (a) { return '<div class="v6-ligne"><span>' + KD6.esc(a.anomaly) + '</span><strong>' + KD6.date(a.since) + '</strong></div>'; }).join('') + '</section>' : '');
  }

  function rapportsAgent(code) {
    var liste = donnees.reports.filter(function (r) { return r.agent_code === code; });
    return '<section class="v6-carte"><h2>Derniers rapports ' + code + '</h2>' + (liste.length ? liste.map(function (r) {
      return '<div class="v6-ligne"><span>' + KD6.esc(r.title) + ' · ' + KD6.date(r.created_at) + (r.generated_by === 'DETERMINISTIC_FALLBACK' ? ' · <em>règles automatiques</em>' : '') + '</span></div><p>' + KD6.esc(r.summary) + '</p>';
    }).join('') : '<p class="v6-vide">Aucun rapport pour le moment.</p>') + '</section>';
  }

  async function incidents() {
    var liste = await KD6.appeler('admin.incidents', {});
    return '<section class="v6-carte"><h2>Incidents ouverts</h2>' + (liste.length ? '<table class="v6-table"><thead><tr><th>Réf.</th><th>Gravité</th><th>Statut</th><th>Titre</th><th>Agent</th><th></th></tr></thead><tbody>' +
      liste.map(function (i) {
        return '<tr><td data-label="Réf.">' + KD6.esc(i.reference) + '</td><td data-label="Gravité">' + sev(i.severity) + '</td><td data-label="Statut">' + KD6.esc(i.status) + '</td>' +
          '<td data-label="Titre">' + KD6.esc(i.title) + (i.recommended_action ? '<br><span class="v6-aide">' + KD6.esc(i.recommended_action) + '</span>' : '') + '</td><td data-label="Agent">' + KD6.esc(i.assigned_agent || '—') + '</td>' +
          '<td data-label="Action"><select data-incident="' + i.id + '"><option value="">Changer le statut…</option><option value="TRIAGED">Trié</option><option value="INVESTIGATING">En investigation</option><option value="PENDING_APPROVAL">En attente d’approbation</option><option value="RESOLVED">Résolu</option><option value="CLOSED">Clos</option></select></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="v6-vide">Aucun incident ouvert.</p>') + '</section>';
  }

  function fraudes() {
    var l = donnees.fraudAlerts;
    return '<section class="v6-carte"><h2>Alertes de fraude (règles déterministes)</h2>' + (l.length ? l.map(function (a) {
      return '<div class="v6-ligne"><span>' + sev(a.severity) + ' ' + KD6.esc(a.rule_code) + ' · ' + KD6.esc(a.entity_type) + '</span><strong>' + KD6.date(a.created_at) + '</strong></div>';
    }).join('') : '<p class="v6-vide">Aucune alerte ouverte.</p>') + '</section>';
  }

  function approbations() {
    var l = donnees.pendingApprovals;
    return '<section class="v6-carte"><h2>Recommandations à décider</h2><p class="v6-aide">Approuver une action sensible ne l’exécute pas : réalisez-la ensuite dans l’écran dédié (ex. Virements à vérifier), avec ses propres contrôles.</p>' +
      (l.length ? l.map(function (a) {
        return '<article class="v6-carte" data-action="' + a.id + '"><h2>' + KD6.esc(ACTIONS[a.action_type] || a.action_type) + ' · ' + KD6.esc(a.agent_code) + (a.requires_approval ? ' <span class="v6-pastille v6-pastille-attente">Approbation humaine</span>' : '') + '</h2>' +
          '<p>' + KD6.esc((a.payload && a.payload.title) || '') + '</p><p class="v6-aide">' + KD6.esc(a.rationale || '') + '</p>' +
          '<div class="v6-actions"><button type="button" class="v6-bouton" data-decision="APPROVED">Approuver</button><button type="button" class="v6-bouton v6-bouton-secondaire" data-decision="REJECTED">Rejeter</button></div></article>';
      }).join('') : '<p class="v6-vide">Aucune recommandation en attente.</p>') + '</section>';
  }

  async function rapports() {
    var l = await KD6.appeler('admin.ai.reports', { limit: 40 });
    return '<section class="v6-carte"><h2>Rapports quotidiens et hebdomadaires</h2>' + (l.length ? l.map(function (r) {
      var c = r.content || {};
      return '<article class="v6-carte"><h2>' + KD6.esc(r.title) + ' · ' + KD6.date(r.created_at) + '</h2><p>' + KD6.esc(r.summary) + '</p>' +
        ((c.findings || []).length ? '<ul class="v6-liste">' + c.findings.map(function (f) { return '<li>' + sev(f.severity) + ' ' + KD6.esc(f.title) + ' — ' + KD6.esc(f.detail || '') + '</li>'; }).join('') + '</ul>' : '') + '</article>';
    }).join('') : '<p class="v6-vide">Aucun rapport.</p>') + '</section>';
  }

  async function rendre() {
    try {
      if (!donnees) donnees = await KD6.appeler('admin.ai.overview');
      var html = onglet === 'vue' ? vue() : ['CEO', 'CFO', 'SI'].indexOf(onglet) >= 0 ? rapportsAgent(onglet)
        : onglet === 'incidents' ? await incidents() : onglet === 'fraudes' ? fraudes() : onglet === 'approbations' ? approbations() : await rapports();
      $('iaContenu').innerHTML = html;
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); $('iaContenu').innerHTML = ''; }
  }

  $('iaOnglets').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-t]'); if (!b) return;
    onglet = b.dataset.t;
    $('iaOnglets').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
    rendre();
  });

  $('iaContenu').addEventListener('click', async function (ev) {
    var d = ev.target.closest('button[data-decision]');
    var ag = ev.target.closest('button[data-agent]');
    try {
      if (d) {
        var r = await KD6.appeler('admin.ai.decide', { actionId: d.closest('[data-action]').dataset.action, decision: d.dataset.decision });
        KD6.afficher(msg, d.dataset.decision === 'APPROVED' ? (r.requiresManualExecution ? 'Approuvé : réalisez maintenant l’action dans l’écran concerné.' : 'Approuvé.') : 'Rejeté.', 'ok');
      } else if (ag) {
        await KD6.appeler('admin.ai.setAgent', { agentCode: ag.dataset.agent, enabled: ag.dataset.on === 'true' });
        KD6.afficher(msg, 'Agent mis à jour.', 'ok');
      } else return;
      donnees = null; rendre();
    } catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  });

  $('iaContenu').addEventListener('change', async function (ev) {
    var s = ev.target.closest('select[data-incident]'); if (!s || !s.value) return;
    var note = s.value === 'RESOLVED' || s.value === 'CLOSED' ? window.prompt('Notes de résolution :') : null;
    try { await KD6.appeler('admin.incident.update', { incidentId: s.dataset.incident, status: s.value, note: note }); KD6.afficher(msg, 'Incident mis à jour.', 'ok'); rendre(); }
    catch (e) { KD6.afficher(msg, KD6.message(e), 'erreur'); }
  });
  rendre();
})();
