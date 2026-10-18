(function () {
  const element = (id) => document.getElementById(id);
  const champs = {
    title: element("factureTitre"), dueDays: element("factureEcheance"), rc: element("factureRc"), ifNumber: element("factureIf"),
    address: element("factureAdresse"), primaryColor: element("factureCouleurPrincipale"), accentColor: element("factureCouleurAccent"),
    paymentNote: element("facturePaiement"), footerNote: element("facturePied"), showPaymentReceipt: element("factureRecu")
  };
  const message = element("factureMessage");
  let modeleCharge = {};
  function valeur(nom) { return champs[nom].type === "checkbox" ? champs[nom].checked : champs[nom].value.trim(); }
  function actualiser() {
    element("factureApercu").style.setProperty("--facture-primaire", valeur("primaryColor") || "#172033");
    element("factureApercu").style.setProperty("--facture-accent", valeur("accentColor") || "#6c4ce0");
    element("apercuFactureTitre").textContent = valeur("title") || "Facture";
    element("apercuEcheance").textContent = Number(valeur("dueDays")) ? "Échéance : " + valeur("dueDays") + " jours" : "Échéance : à réception";
    element("factureEntreprise").textContent = modeleCharge.businessName || "Votre entreprise";
    element("factureCoordonnees").textContent = [valeur("rc") && "RC " + valeur("rc"), valeur("ifNumber") && "IF " + valeur("ifNumber"), valeur("address")].filter(Boolean).join(" · ") || "RC · IF · Adresse";
    element("apercuPaiementTexte").textContent = valeur("paymentNote") || "Paiement par virement bancaire";
    element("apercuPied").textContent = valeur("footerNote") || "Merci pour votre confiance.";
    element("apercuPaiement").style.display = valeur("showPaymentReceipt") ? "flex" : "none";
  }
  async function charger() {
    try {
      modeleCharge = await KADOSK_API.getInvoiceTemplate();
      Object.keys(champs).forEach((nom) => { if (champs[nom].type === "checkbox") champs[nom].checked = modeleCharge[nom] !== false; else champs[nom].value = modeleCharge[nom] == null ? "" : modeleCharge[nom]; });
      if (modeleCharge.logoUrl) { element("factureLogo").src = modeleCharge.logoUrl; element("factureLogo").style.display = "block"; }
      actualiser();
    } catch (erreur) { message.textContent = "Impossible de charger le modèle de facture."; }
  }
  Object.values(champs).forEach((champ) => { champ.addEventListener("input", actualiser); champ.addEventListener("change", actualiser); });
  element("factureEnregistrer").addEventListener("click", async () => {
    if (!valeur("rc") || !valeur("ifNumber") || !valeur("address")) { message.textContent = "RC, IF et adresse sont obligatoires."; return; }
    message.style.color = ""; message.textContent = "Enregistrement…"; element("factureEnregistrer").disabled = true;
    try {
      const donnees = {}; Object.keys(champs).forEach((nom) => { donnees[nom] = valeur(nom); }); donnees.dueDays = Number(donnees.dueDays) || 0;
      await KADOSK_API.saveInvoiceTemplate(donnees); message.style.color = "#14805e"; message.textContent = "Personnalisation enregistrée.";
    } catch (erreur) { message.textContent = "Échec de l’enregistrement : " + ((erreur && erreur.message) || "erreur"); }
    finally { element("factureEnregistrer").disabled = false; }
  });
  charger();
})();
