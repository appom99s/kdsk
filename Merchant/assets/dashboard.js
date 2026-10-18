// Tableau de bord marchand (V3.1) + assistant de première connexion.
// Réexécuté à chaque visite par spa.js : tout reste dans cette IIFE.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  if (!$("dbBonjour")) return;
  const statut = $("dashboardStatus");
  const dh = (n) => Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " DH";
  const echapper = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  $("dbDate").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  function delta(el, aujourdhui, hier, unite) {
    const a = Number(aujourdhui || 0), h = Number(hier || 0);
    el.classList.remove("hausse", "baisse");
    if (!h && !a) { el.textContent = "Aucune activité hier"; return; }
    if (!h) { el.textContent = "Hier : 0" + unite; return; }
    const pct = Math.round(((a - h) / h) * 100);
    el.textContent = (pct >= 0 ? "+" : "") + pct + " % vs hier";
    el.classList.add(pct >= 0 ? "hausse" : "baisse");
  }

  function graphique(points) {
    const zone = $("dbGraphique");
    const jours = (points || []).slice(-7);
    const max = Math.max(1, ...jours.map((p) => Number(p.total) || 0));
    const L = 560, H = 190, bas = 160, largeur = L / Math.max(1, jours.length);
    const barres = jours.map((p, i) => {
      const v = Number(p.total) || 0, h = Math.round((v / max) * 130), x = i * largeur + largeur * 0.2, w = largeur * 0.6;
      const jour = new Date(p.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
      return `<rect x="${x}" y="${bas - h}" width="${w}" height="${Math.max(h, 2)}" rx="6" fill="${i === jours.length - 1 ? "#1f3a34" : "#7fb5ab"}"><title>${echapper(jour)} : ${echapper(dh(v))}</title></rect>` +
        (v ? `<text x="${x + w / 2}" y="${bas - h - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#1f3a34">${Math.round(v)}</text>` : "") +
        `<text x="${x + w / 2}" y="${bas + 18}" text-anchor="middle" font-size="12" fill="#5b6e68">${echapper(jour)}</text>`;
    }).join("");
    zone.innerHTML = `<svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="${bas}" x2="${L}" y2="${bas}" stroke="#e1e8e5"/>${barres}</svg>`;
    $("dbTotalSemaine").textContent = dh(jours.reduce((s, p) => s + (Number(p.total) || 0), 0));
  }

  const LIBELLES = { REDEEMED: "Encaissement", REDEEM_FAILED: "Encaissement refusé", CHECK_FAILED: "Vérification refusée", PIN_FAILED: "PIN incorrect", MERCHANT_DIRECT_DRAFT_CREATED: "Carte créée", CARD_ACTIVATED: "Carte activée" };
  function operations(liste) {
    const ul = $("dbOperations");
    if (!liste || !liste.length) { ul.innerHTML = '<li class="db-vide">Aucune opération pour le moment.</li>'; return; }
    ul.innerHTML = liste.slice(0, 6).map((op) => {
      const date = op.createdAt ? new Date(op.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      return `<li class="${op.success ? "" : "echec"}"><span><span class="db-op-titre">${echapper(LIBELLES[op.action] || op.action)}</span><span class="db-op-date">${echapper(date)}${op.actorName ? " · " + echapper(op.actorName) : ""}</span></span><span class="db-op-montant">${op.amount ? echapper(dh(op.amount)) : ""}</span></li>`;
    }).join("");
  }

  function abonnement(info) {
    if (!info) return;
    const q = info.cardQuota || {};
    $("dbAbonnement").textContent = q.source === "TRIAL_EXPIRED" ? "Essai terminé" : q.source === "TRIAL" ? "Essai gratuit" : (q.cardPlanLabel || q.tier || "Formule active");
    if (q.quota != null && q.quota > 0) {
      const barre = $("dbQuota"); barre.max = q.quota; barre.value = q.used || 0; barre.hidden = false;
      $("dbQuotaTexte").textContent = (q.used || 0) + " / " + q.quota + " cartes émises sur la période";
    } else {
      $("dbQuotaTexte").textContent = q.source === "TRIAL_EXPIRED" ? "Choisissez une formule pour continuer à émettre des cartes." : "Cartes cadeaux illimitées";
    }
    if (info.cashierLimit != null) $("dbCaissiers").textContent = (info.activeCashiers || 0) + " / " + info.cashierLimit + " caissiers actifs";
  }

  // --- Assistant de première connexion -------------------------------------
  const CLE_ETAPE = "kadosk_assistant_etape", CLE_PLUS_TARD = "kadosk_assistant_plus_tard";
  const lireSession = (cle) => { try { return sessionStorage.getItem(cle); } catch (_) { return null; } };
  const ecrireSession = (cle, v) => { try { sessionStorage.setItem(cle, v); } catch (_) { /* facultatif */ } };

  // Seules les tâches restantes sont proposées : un compte complet n'a jamais l'assistant.
  function tachesManquantes(etat) {
    const taches = [
      { fait: !!etat.ready, titre: "Complétez votre dossier", html: `<span class="kd-statut attente kd-assistant-etat">${(etat.completed || 0) + " / " + (etat.total || 0)} éléments complétés</span><p>Raison sociale, ICE, RC, adresse, documents : ces informations sont nécessaires à la validation finale par KADOSK et apparaissent sur vos factures.</p>`, action: ["Compléter mon dossier", "settings.html#blocOnboarding"] },
      { fait: !!etat.cardDesigned, titre: "Personnalisez votre carte cadeau", html: `<p>Choisissez un thème, vos couleurs, votre logo et le nom de la carte. L’aperçu correspond exactement à la carte reçue par e-mail par vos clients.</p>`, action: ["Ouvrir l’éditeur de carte", "settings.html#editeurCarteCadeau"] },
      { fait: (etat.locationsCount || 0) > 0, titre: "Ajoutez un point de vente", html: `<p>Déclarez vos établissements, puis attribuez chaque caissier à son point de vente dans « Équipe ».</p>`, action: ["Ajouter un point de vente", "settings.html#merchant-locations"], action2: ["Gérer l’équipe", "equipe.html"] },
      { fait: !!etat.cartesEmises, titre: "Émettez votre première carte", html: `<p><strong>Émettre :</strong> dans « Cartes cadeaux », saisissez le montant et l’e-mail du client ; il reçoit sa carte, son code permanent et son PIN par e-mail.</p><p><strong>Encaisser :</strong> saisissez le code de la carte, le montant, puis le client tape son PIN à 6 chiffres.</p>`, action: ["Créer ma première carte", "gift-cards.html"] }
    ];
    return taches.filter((t) => !t.fait);
  }

  function etapes(etat) {
    const restantes = tachesManquantes(etat);
    if (!restantes.length) return [];
    return [{ titre: "Il vous reste " + restantes.length + " étape" + (restantes.length > 1 ? "s" : ""), html: `<p>Terminez la configuration de votre commerce :</p><ul>${restantes.map((t) => "<li>" + t.titre + "</li>").join("")}</ul>` }, ...restantes];
  }

  function ouvrirAssistant(etat) {
    if (document.querySelector(".kd-assistant[open]")) return;
    const liste = etapes(etat);
    if (!liste.length) return;
    let index = Math.min(Number(lireSession(CLE_ETAPE)) || 0, liste.length - 1);
    const d = document.createElement("dialog");
    d.className = "kd-assistant";
    d.setAttribute("aria-labelledby", "kdAssistantTitre");
    d.innerHTML = `<div class="kd-assistant-entete"><ol class="kd-assistant-etapes" aria-hidden="true">${liste.map(() => "<li></li>").join("")}</ol><p class="kd-assistant-compteur"></p></div>
      <div class="kd-assistant-corps"><h2 id="kdAssistantTitre"></h2><div class="kd-assistant-contenu"></div><div class="db-actions kd-assistant-liens"></div></div>
      <div class="kd-assistant-pied"><button type="button" class="kd-assistant-passer" data-a="tard">Plus tard</button>
      <div class="kd-assistant-nav"><button type="button" class="kadosk-bouton kadosk-bouton-secondaire" data-a="prec">Précédent</button><button type="button" class="kadosk-bouton" data-a="suiv">Suivant</button></div></div>`;
    document.body.append(d);
    const q = (s) => d.querySelector(s);
    const fermer = () => { if (d.open) d.close(); d.remove(); };

    function rendre() {
      const e = liste[index];
      ecrireSession(CLE_ETAPE, String(index));
      d.querySelectorAll(".kd-assistant-etapes li").forEach((li, i) => { li.className = i < index ? "fait" : i === index ? "actif" : ""; });
      q(".kd-assistant-compteur").textContent = "Étape " + (index + 1) + " sur " + liste.length;
      q("#kdAssistantTitre").textContent = e.titre;
      q(".kd-assistant-contenu").innerHTML = e.html;
      const liens = q(".kd-assistant-liens");
      liens.replaceChildren();
      [e.action, e.action2].filter(Boolean).forEach(([texte, href]) => {
        const a = document.createElement("a");
        a.className = "kadosk-bouton kadosk-bouton-secondaire";
        a.href = href; a.textContent = texte;
        a.addEventListener("click", () => { ecrireSession(CLE_ETAPE, String(Math.min(index + 1, liste.length - 1))); fermer(); });
        liens.append(a);
      });
      q('[data-a="prec"]').hidden = index === 0;
      q('[data-a="suiv"]').textContent = index === liste.length - 1 ? "Terminer" : "Suivant";
      q('[data-a="suiv"]').focus();
    }

    async function terminer() {
      const b = q('[data-a="suiv"]');
      b.disabled = true; b.setAttribute("aria-busy", "true");
      try { await KADOSK_API.markOnboardingWizardDone(); } catch (_) { /* l'assistant se rouvrira à la prochaine connexion */ }
      ecrireSession(CLE_ETAPE, "0");
      fermer();
    }

    d.addEventListener("click", (ev) => {
      const a = ev.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "prec" && index > 0) { index--; rendre(); }
      else if (a.dataset.a === "suiv") { if (index < liste.length - 1) { index++; rendre(); } else terminer(); }
      else if (a.dataset.a === "tard") { ecrireSession(CLE_PLUS_TARD, "1"); fermer(); }
    });
    d.addEventListener("cancel", () => setTimeout(() => d.remove(), 0));
    d.showModal();
    rendre();
  }

  function progression(etat) {
    const bloc = $("dbProgression");
    const restantes = tachesManquantes(etat);
    if (!restantes.length) { bloc.hidden = true; return; }
    bloc.hidden = false;
    $("dbProgressionResume").textContent = "À faire : " + restantes.map((t) => t.titre.toLowerCase()).join(" · ");
    const barre = $("dbProgressionBarre"); barre.max = 4; barre.value = 4 - restantes.length;
    $("dbOuvrirAssistant").onclick = () => ouvrirAssistant(etat);
  }

  KADOSK_NAV.chargerChromeInfo().then((info) => {
    if (info.role !== "OWNER") return;
    return Promise.all([KADOSK_API.getDashboardInitial(), KADOSK_API.getOnboardingChecklist().catch(() => null)]).then(([{ stats, transactions, chart, subscription }, etat]) => {
      const s = stats || {};
      if (etat) {
        etat.cartesEmises = (s.activeCardsCount || 0) + (s.usedCardsCount || 0) + (s.expiredCardsCount || 0) > 0;
        progression(etat);
        if (lireSession(CLE_PLUS_TARD) !== "1") ouvrirAssistant(etat);
      }
      $("dbBonjour").textContent = "Bonjour" + (s.merchantName ? ", " + s.merchantName : "");
      $("kpiEncaisse").textContent = dh(s.revenueToday);
      delta($("kpiEncaisseDelta"), s.revenueToday, s.revenueYesterday, " DH");
      $("kpiTransactions").textContent = String(s.transactionsToday || 0);
      delta($("kpiTransactionsDelta"), s.transactionsToday, s.transactionsYesterday, "");
      $("kpiActives").textContent = String(s.activeCardsCount || 0);
      $("kpiUtilisees").textContent = (s.usedCardsCount || 0) + " utilisée(s) · " + (s.expiredCardsCount || 0) + " expirée(s)";
      $("kpiEncours").textContent = dh(s.activeCardsTotalBalance || s.activeCardsBalance);
      graphique(chart && chart.items);
      operations(transactions && transactions.items);
      abonnement(subscription);
      statut.textContent = "";
    });
  }).catch(() => { statut.textContent = "Chargement indisponible. Vérifiez votre session puis actualisez la page."; });
})();
