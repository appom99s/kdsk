// Devenir partenaire : envoi direct vers le backend KADOSK (post_partnerRequest),
// qui crée une seule ligne Merchants « Submitted ». Plus de formulaire Wix Forms.
(function () {
  "use strict";
  const form = document.getElementById("partnerForm");
  if (!form) return;
  const statut = document.getElementById("pStatus");
  const bouton = document.getElementById("pSubmit");
  const valeur = (id) => document.getElementById(id).value.trim();
  const coche = (id) => document.getElementById(id).checked;

  const MESSAGES = {
    PARTNER_DUPLICATE: "Une demande existe déjà pour cet e-mail, ce nom d’entreprise ou ce numéro RC. Contactez KADOSK si vous pensez qu’il s’agit d’une erreur.",
    NOM_COMMERCE_REQUIS: "Indiquez le nom de l’entreprise.",
    EMAIL_INVALIDE: "Adresse e-mail invalide.",
    RC_REQUIS: "Indiquez le numéro du registre du commerce (RC).",
    FORMULAIRE_PARTENAIRE_INCOMPLET: "Complétez tous les champs obligatoires (téléphone : 8 chiffres minimum).",
    CONSENTEMENT_REQUIS: "Acceptez les conditions partenaires et la politique de confidentialité.",
    TROP_DE_REQUETES: "Trop de tentatives. Réessayez dans une heure."
  };

  form.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    statut.textContent = "";
    // Indicateur commun : chaque champ invalide est signalé (aria-invalid, voir ui-system.css).
    let premierInvalide = null;
    form.querySelectorAll("input, select").forEach((champ) => {
      const ok = champ.checkValidity();
      champ.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !premierInvalide) premierInvalide = champ;
    });
    if (premierInvalide) {
      statut.textContent = premierInvalide.type === "checkbox" ? MESSAGES.CONSENTEMENT_REQUIS : "Complétez les champs obligatoires signalés.";
      premierInvalide.focus();
      return;
    }

    bouton.disabled = true;
    bouton.setAttribute("aria-busy", "true");
    bouton.textContent = "Envoi…";
    try {
      await KADOSK_API.submitPartnerRequest({
        businessName: valeur("pBusinessName"),
        rc: valeur("pRc"),
        category: valeur("pCategory"),
        city: valeur("pCity"),
        firstName: valeur("pFirstName"),
        lastName: valeur("pLastName"),
        position: valeur("pPosition"),
        phone: valeur("pPhone"),
        email: valeur("pEmail").toLowerCase(),
        acceptedTerms: coche("pTerms"),
        privacyConsent: coche("pPrivacy"),
        marketingConsent: coche("pMarketing")
      });
      form.hidden = true;
      const fin = document.getElementById("partnerDone");
      fin.hidden = false;
      fin.focus();
    } catch (erreur) {
      statut.textContent = MESSAGES[erreur && erreur.message] || "Envoi impossible pour le moment. Réessayez dans quelques instants.";
    } finally {
      bouton.disabled = false;
      bouton.removeAttribute("aria-busy");
      bouton.textContent = "Envoyer ma demande";
    }
  });
})();
