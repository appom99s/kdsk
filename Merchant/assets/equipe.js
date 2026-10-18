(function () {
  const champNom = document.getElementById("champNomEquipe");
  const champEmail = document.getElementById("champEmailEquipe");
  const champRole = document.getElementById("champRoleEquipe");
  const champPeutVoirCartes = document.getElementById("champPeutVoirCartes");
  const boutonAjouter = document.getElementById("boutonAjouterEquipe");
  const messageStatut = document.getElementById("messageStatutEquipe");
  const corpsTable = document.getElementById("corpsTableEquipe");
  const etatVide = document.getElementById("etatVideEquipe");

  const modalFond = document.getElementById("modalConfirmerRetrait");
  const boutonAnnulerRetrait = document.getElementById("boutonAnnulerRetrait");
  const boutonConfirmerRetrait = document.getElementById("boutonConfirmerRetrait");

  const echapperHtml = window.KADOSK_ECHAPPER_HTML || ((v) => String(v || ""));

  const LIBELLES_ROLE = { CASHIER: "Caissier" };

  const LIBELLES_ERREUR = {
    INVALID_EMAIL: "Adresse e-mail invalide.",
    INVALID_TEAM_ROLE: "Rôle invalide.",
    NAME_REQUIRED: "Le nom est obligatoire.",
    TEAM_MEMBER_ALREADY_ADDED: "Cette personne fait déjà partie de votre équipe.",
    TEAM_MEMBER_NOT_FOUND: "Membre introuvable.",
    MERCHANT_PLAN_NOT_ACTIVE: "Votre abonnement doit être actif pour gérer votre équipe.",
    CASHIER_PLAN_LIMIT_REACHED: "La limite de caissiers de votre abonnement est atteinte. Passez à la formule supérieure pour ajouter cette personne."
  };

  // Petits badges texte pour la colonne "Accès" du tableau équipe - résume
  // en un coup d'oeil ce que ce caissier a le droit de faire en plus de
  // l'encaissement (toujours inclus, jamais affiché ici pour ne pas alourdir).
  function libellesAcces(u) {
    const acces = [];

    if (u.canViewGiftCards) acces.push("Cartes cadeaux");
    return acces.length ? acces.join(", ") : "Encaissement uniquement";
  }

  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  let idEnCoursDeRetrait = null;

  // Points de vente du commerce, chargés une fois : attribution directe d'un caissier.
  let pointsDeVente = [];
  const champPointVente = document.getElementById("champPointVenteEquipe");
  function selectPointVente(u) {
    const ids = u.locationIds || [];
    if (!pointsDeVente.length) return '<small>Aucun point de vente déclaré</small>';
    const options = ['<option value="">— À attribuer —</option>']
      .concat(ids.length > 1 ? ['<option value="__plusieurs" selected>' + ids.length + ' points de vente</option>'] : [])
      .concat(pointsDeVente.map((l) => '<option value="' + echapperHtml(l.locationId) + '"' + (ids.length === 1 && ids[0] === l.locationId ? " selected" : "") + ">" + echapperHtml(l.name) + "</option>"));
    return '<select class="kadosk-input" data-point-vente="' + echapperHtml(u.id) + '" aria-label="Point de vente de ' + echapperHtml(u.name || u.email) + '" style="margin-top:6px;min-height:40px;">' + options.join("") + "</select>";
  }
  async function chargerPointsDeVente() {
    try {
      const { locations } = await KADOSK_API.getLocations();
      pointsDeVente = (locations || []).filter((l) => l.active !== false);
    } catch (_) { pointsDeVente = []; }
    if (champPointVente) {
      champPointVente.innerHTML = pointsDeVente.length
        ? '<option value="">— Choisir —</option>' + pointsDeVente.map((l) => '<option value="' + echapperHtml(l.locationId) + '">' + echapperHtml(l.name) + "</option>").join("")
        : '<option value="">Établissement principal (aucun point de vente déclaré)</option>';
    }
  }

  function rendreTable(items) {
    if (!items.length) {
      corpsTable.innerHTML = "";
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";
    corpsTable.innerHTML = items
      .map(
        (u) => `
      <tr>
        <td>${echapperHtml(u.name || "—")}</td>
        <td>${echapperHtml(u.email)}</td>
        <td>${echapperHtml(LIBELLES_ROLE[u.role] || u.role)}<br><small>${u.deviceAssigned ? "Appareil dédié associé" : "Appareil à associer à la première connexion validée"}</small></td>
        <td>${echapperHtml(libellesAcces(u))}<br>${selectPointVente(u)} <button type="button" class="kadosk-lien-action" data-affecter="${echapperHtml(u.id)}">Plusieurs…</button></td>
        <td>${formaterDate(u.invitedAt)}</td>
        <td><button type="button" class="kadosk-lien-action" data-renvoyer="${echapperHtml(u.id)}">Renvoyer l’e-mail</button> <button type="button" class="kadosk-lien-action" data-retirer="${echapperHtml(u.id)}">Retirer</button></td>
      </tr>`
      )
      .join("");

    corpsTable.querySelectorAll("[data-affecter]").forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          const {locations} = await KADOSK_API.getLocations();
          const member=items.find(u => u.id===button.dataset.affecter);
          const dialog=document.createElement('dialog');
          dialog.className='kadosk-studio-dialog';
          dialog.innerHTML='<form><h2>Points de vente autorisés</h2><p>Sélectionnez les points de vente accessibles à ce caissier.</p>'+locations.filter(l=>l.active!==false).map(l=>'<label style="display:block;padding:12px"><input type="checkbox" name="location" value="'+echapperHtml(l.locationId)+'" '+((member.locationIds||[]).includes(l.locationId)?'checked':'')+'> '+echapperHtml(l.name)+'</label>').join('')+'<p role="status"></p><button type="submit">Enregistrer</button> <button type="button" data-close>Annuler</button></form>';
          dialog.querySelector('[data-close]').onclick=()=>{dialog.close();dialog.remove();};
          dialog.oncancel=()=>dialog.remove();
          dialog.querySelector('form').onsubmit=async event=>{
            event.preventDefault();const submit=event.target.querySelector('[type=submit]');submit.disabled=true;
            try {await KADOSK_API.saveTeamAssignments(member.id,[...dialog.querySelectorAll('input:checked')].map(i=>i.value));dialog.close();dialog.remove();await chargerEquipe();}
            catch(_){dialog.querySelector('[role=status]').textContent='Enregistrement impossible. Rechargez les points de vente puis réessayez.';submit.disabled=false;}
          };
          document.body.append(dialog);dialog.showModal();
        } catch(_) {messageStatut.textContent='Impossible de charger les points de vente.';}
        finally {button.disabled=false;}
      };
    });
    corpsTable.querySelectorAll("[data-point-vente]").forEach((select) => {
      select.addEventListener("change", async () => {
        if (select.value === "__plusieurs") return;
        select.disabled = true;
        messageStatut.style.color = "";
        try {
          await KADOSK_API.saveTeamAssignments(select.dataset.pointVente, select.value ? [select.value] : []);
          messageStatut.style.color = "#1faa6c";
          messageStatut.textContent = select.value ? "Caissier attribué à « " + select.options[select.selectedIndex].text + " »." : "Attribution retirée : ce caissier ne peut plus encaisser.";
          await chargerEquipe();
        } catch (_) {
          messageStatut.textContent = "Attribution impossible. Vérifiez la double authentification puis réessayez.";
          select.disabled = false;
        }
      });
    });
    corpsTable.querySelectorAll("[data-renvoyer]").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await KADOSK_API.resendTeamInvitation(button.dataset.renvoyer);
          messageStatut.textContent = result.emailSent ? "E-mail d’accès envoyé au caissier." : "L’envoi a échoué. Réessayez dans une minute.";
        } catch (_) { messageStatut.textContent = "Envoi indisponible. Patientez une minute avant de réessayer."; }
        finally { button.disabled = false; }
      });
    });
    corpsTable.querySelectorAll("[data-retirer]").forEach((lien) => {
      lien.addEventListener("click", () => {
        idEnCoursDeRetrait = lien.dataset.retirer;
        modalFond.style.display = "flex";
      });
    });
  }

  async function chargerEquipe() {
    try {
      const resultat = await KADOSK_API.getTeamMembers();
      rendreTable(resultat.items || []);
    } catch (erreur) {
      console.error("Erreur chargement équipe :", erreur);
      corpsTable.innerHTML = "";
      etatVide.textContent = "Impossible de charger votre équipe.";
      etatVide.style.display = "block";
    }
  }

  async function chargerQuota() {
    const valeur = document.getElementById("quotaEquipeValeur");
    const detail = document.getElementById("quotaEquipeDetail");
    try {
      const abonnement = await KADOSK_API.getSubscriptionInfo();
      const utilises = Number(abonnement.activeCashiers) || 0;
      const limite = Number(abonnement.cashierLimit) || 0;
      valeur.textContent = utilises + " / " + limite + " caissier" + (limite > 1 ? "s" : "");
      detail.textContent = abonnement.remainingCashierSlots > 0
        ? abonnement.remainingCashierSlots + " place(s) disponible(s)"
        : "Limite atteinte — formule supérieure nécessaire";
      boutonAjouter.disabled = abonnement.remainingCashierSlots <= 0;
    } catch (erreur) {
      valeur.textContent = "Quota indisponible";
      detail.textContent = "Actualisez la page avant d’ajouter un caissier.";
    }
  }

  async function ajouterMembre() {
    messageStatut.style.color = "";
    messageStatut.textContent = "";

    const nom = champNom.value.trim();
    const email = champEmail.value.trim();
    const role = champRole.value;
    if (!nom) {
      messageStatut.textContent = "Le nom est obligatoire.";
      return;
    }
    if (!email) {
      messageStatut.textContent = "L'e-mail est obligatoire.";
      return;
    }

    boutonAjouter.disabled = true;
    try {
      const resultat = await KADOSK_API.inviteTeamMember(
        email,
        role,
        nom,
        champPeutVoirCartes.checked
      );
      // Attribution du point de vente choisi dès l'invitation.
      const pointVenteChoisi = champPointVente ? champPointVente.value : "";
      if (pointVenteChoisi) {
        try {
          const liste = await KADOSK_API.getTeamMembers();
          const nouveau = ((liste && liste.items) || []).find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
          if (nouveau) await KADOSK_API.saveTeamAssignments(nouveau.id, [pointVenteChoisi]);
        } catch (_) { console.error("Attribution du point de vente à l'invitation impossible"); }
      }
      champNom.value = "";
      champEmail.value = "";
      champPeutVoirCartes.checked = false;
      if (champPointVente) champPointVente.value = "";
      messageStatut.style.color = "#1faa6c";
      messageStatut.textContent = resultat && resultat.emailSent
        ? "Caissier ajouté. L’e-mail pour créer son mot de passe a été envoyé."
        : "Caissier ajouté. L’e-mail n’a pas pu être envoyé : utilisez Renvoyer l’e-mail dans une minute.";
      chargerEquipe();
      chargerQuota();
    } catch (erreur) {
      console.error("Erreur ajout membre équipe :", erreur);
      messageStatut.style.color = "";
      messageStatut.textContent = LIBELLES_ERREUR[erreur.message] || "Échec de l'ajout : " + (erreur.message || "erreur inconnue");
    } finally {
      boutonAjouter.disabled = false;
    }
  }

  function fermerModal() {
    modalFond.style.display = "none";
    idEnCoursDeRetrait = null;
  }

  boutonAnnulerRetrait.addEventListener("click", fermerModal);

  boutonConfirmerRetrait.addEventListener("click", async () => {
    if (!idEnCoursDeRetrait) return;
    boutonConfirmerRetrait.disabled = true;
    try {
      await KADOSK_API.removeTeamMember(idEnCoursDeRetrait);
      fermerModal();
      chargerEquipe();
      chargerQuota();
    } catch (erreur) {
      console.error("Erreur retrait membre équipe :", erreur);
      fermerModal();
      messageStatut.style.color = "";
      messageStatut.textContent = LIBELLES_ERREUR[erreur.message] || "Échec du retrait : " + (erreur.message || "erreur inconnue");
    } finally {
      boutonConfirmerRetrait.disabled = false;
    }
  });

  boutonAjouter.addEventListener("click", ajouterMembre);

  chargerPointsDeVente().then(chargerEquipe);
  chargerQuota();
})();
