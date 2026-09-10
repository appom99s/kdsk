(function () {
  let commandes = [], filtreActif = "DRAFT", numeroChargement = 0;
  const corps = document.getElementById("corpsTableCommandes"), table = document.getElementById("tableCommandes"), vide = document.getElementById("aucuneCommande"), texteVide = document.getElementById("texteAucuneCommande"), modele = document.getElementById("modeleValidationCommande"), filtres = document.querySelectorAll(".kadosk-filtre");
  const date = v => v && !isNaN(new Date(v).getTime()) ? new Date(v).toLocaleDateString("fr-FR") : "—";
  const montant = v => v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const portee = c => c.scope === "UNIVERSAL" ? "Universel" : c.scope === "DOMAIN" ? "Domaine : " + (c.domain || "") : "Marchand uniquement";
  function badge() { return filtreActif === "ACTIVE" ? '<span class="kadosk-badge kadosk-badge-actif">Acceptée</span>' : filtreActif === "REFUSED" ? '<span class="kadosk-badge" style="background:var(--kadosk-danger-tint);color:var(--kadosk-danger)">Refusée</span>' : '<span class="kadosk-badge kadosk-badge-attente">En attente</span>'; }
  function telephoneWhatsApp(v) { let n = String(v || "").replace(/\D/g, ""); if (n.startsWith("00")) n = n.slice(2); if (n.startsWith("0")) n = "212" + n.slice(1); return /^\d{8,15}$/.test(n) ? n : ""; }
  function fermerDetail() { corps.querySelectorAll(".kadosk-ligne-detail").forEach(e => e.remove()); corps.querySelectorAll(".kadosk-ligne-selectionnee").forEach(e => e.classList.remove("kadosk-ligne-selectionnee")); }
  function afficherDetail(commande, ligne) {
    const ouverte = ligne.nextElementSibling && ligne.nextElementSibling.classList.contains("kadosk-ligne-detail"); fermerDetail(); if (ouverte || filtreActif !== "DRAFT") return;
    ligne.classList.add("kadosk-ligne-selectionnee"); const detail = document.createElement("tr"); detail.className = "kadosk-ligne-detail"; const cellule = document.createElement("td"); cellule.colSpan = 6; cellule.appendChild(modele.content.cloneNode(true)); detail.appendChild(cellule); ligne.after(detail);
    const message = detail.querySelector(".champ-message"), raison = detail.querySelector(".champ-raison-refus"), valider = detail.querySelector(".bouton-valider"), refuser = detail.querySelector(".bouton-refuser"), statut = detail.querySelector(".message-statut"), whatsapp = detail.querySelector(".bouton-whatsapp");
    message.value = commande.message || ""; detail.querySelector(".kadosk-validation-resume").textContent = (commande.orderNumber ? "Commande " + commande.orderNumber + " · " : "") + montant(commande.initialBalance) + " DH · " + (commande.buyerEmail || "Client sans e-mail");
    if (String(commande.source || "").toUpperCase() !== "MERCHANT_DIRECT" && !commande.buyerConfirmedTransferAt) statut.textContent = "Virement non signalé par le client. Vous pouvez néanmoins l’approuver après vérification de votre compte bancaire.";
    async function agir(action) {
      valider.disabled = true; refuser.disabled = true; statut.textContent = "Traitement…";
      try {
        if (action === "approve") {
          const resultat = await KADOSK_API.activateOrder(commande.giftCardId, commande.buyerEmail, commande.buyerName, message.value);
          statut.style.color = resultat && resultat.emailSent === false ? "#b02a37" : "#14805e"; statut.textContent = resultat && resultat.emailSent === false ? "Carte validée, mais l’e-mail n’a pas pu être envoyé." : "Carte validée et envoyée par e-mail.";
          valider.style.display = "none"; refuser.style.display = "none"; message.closest(".kadosk-champ").style.display = "none"; raison.closest(".kadosk-champ").style.display = "none";
          const telephone = telephoneWhatsApp(commande.buyerPhone);
          if (telephone) { const texte = "Bonjour" + (commande.buyerName ? " " + commande.buyerName : "") + ", votre carte cadeau" + (commande.orderNumber ? " de la commande " + commande.orderNumber : "") + " est validée. Merci de vérifier votre boîte e-mail ainsi que le dossier spam."; whatsapp.href = "https://wa.me/" + telephone + "?text=" + encodeURIComponent(texte); whatsapp.style.display = "inline-flex"; }
          else statut.textContent += " Aucun numéro de téléphone exploitable n’est enregistré pour ce client.";
        } else { if (!window.confirm("Confirmer le refus de cette commande ?")) return; await KADOSK_API.refuseOrder(commande.giftCardId, raison.value); await charger(); }
        if (window.KADOSK_NAV && KADOSK_NAV.actualiserCommandesEnAttente) KADOSK_NAV.actualiserCommandesEnAttente();
      } catch (_) { statut.style.color = ""; statut.textContent = action === "approve" ? "Échec de la validation. Merci de réessayer." : "Échec du refus. Merci de réessayer."; }
      finally { valider.disabled = false; refuser.disabled = false; }
    }
    valider.addEventListener("click", () => agir("approve")); refuser.addEventListener("click", () => agir("reject"));
  }
  function rendre() {
    corps.innerHTML = ""; if (!commandes.length) { table.style.display = "none"; vide.style.display = "block"; texteVide.textContent = filtreActif === "DRAFT" ? "Les nouvelles commandes de vos clients apparaîtront ici pour approbation." : "Aucune commande dans cette catégorie pour le moment."; return; }
    table.style.display = "table"; vide.style.display = "none";
    commandes.forEach(c => { const ligne = document.createElement("tr"); [montant(c.initialBalance) + " DH", portee(c), (c.buyerName || "") + (c.buyerEmail ? " (" + c.buyerEmail + ")" : ""), date(c.activatedAt || c.createdAt)].forEach(t => { const td = document.createElement("td"); td.textContent = t; ligne.appendChild(td); }); const vir = document.createElement("td"); vir.innerHTML = String(c.source || "").toUpperCase() === "MERCHANT_DIRECT" ? '<span class="kadosk-badge">Émission directe</span>' : c.buyerConfirmedTransferAt ? '<span class="kadosk-badge kadosk-badge-actif">Signalé le ' + date(c.buyerConfirmedTransferAt) + '</span>' : '<span class="kadosk-badge kadosk-badge-attente">Non signalé</span>'; const stat = document.createElement("td"); stat.innerHTML = badge(); ligne.appendChild(vir); ligne.appendChild(stat); if (filtreActif === "DRAFT") { ligne.style.cursor = "pointer"; ligne.addEventListener("click", () => afficherDetail(c, ligne)); } corps.appendChild(ligne); });
  }
  async function charger() { const n = ++numeroChargement; corps.innerHTML = '<tr><td colspan="6"><div class="kadosk-chargement-ligne"><span class="kadosk-spinner"></span> Chargement…</div></td></tr>'; table.style.display = "table"; vide.style.display = "none"; try { const r = await KADOSK_API.getAllGiftCards(filtreActif); if (n !== numeroChargement) return; commandes = (r.items || []).filter(c => c.status === filtreActif); rendre(); } catch (_) { if (n !== numeroChargement) return; table.style.display = "none"; vide.style.display = "block"; texteVide.textContent = "Impossible de charger les commandes. Réessayez."; } if (window.KADOSK_NAV && KADOSK_NAV.actualiserCommandesEnAttente) KADOSK_NAV.actualiserCommandesEnAttente(); }
  filtres.forEach(b => b.addEventListener("click", () => { filtres.forEach(x => x.classList.remove("actif")); b.classList.add("actif"); filtreActif = b.dataset.filtre; charger(); }));
  if (window.KADOSK_NAV && KADOSK_NAV.chargerChromeInfo) KADOSK_NAV.chargerChromeInfo().then(({ role, permissions }) => { if (role === "CASHIER" && !(permissions && permissions.viewGiftCards)) { const o = document.querySelector('.kadosk-filtre[data-filtre="ACTIVE"]'); if (o) o.style.display = "none"; } }).catch(() => {});
  charger();
})();
