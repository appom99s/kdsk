const KADOSK_API = (function () {
  // Les fonctions HTTP du site (giftCardSecurity.web.js) ont besoin du "contexte
  // d'authentification" du membre pour reconnaître qui appelle (getCurrentMember()).
  // Appeler directement https://www.kadosk.com/_functions/... ne transmet PAS ce
  // contexte (c'est documenté par Wix : c'est réservé aux appels anonymes/publics).
  // Il faut obligatoirement passer par la gateway REST de Wix, qui elle transmet
  // le contexte d'authentification lié au token d'accès fourni dans l'en-tête.
  function urlFonction(nom) {
    return "https://www.wixapis.com/velo/v1/http/invoke/" + nom;
  }

  async function executerAppel(nom, methode, corps, accessToken, dejaReessaye, estPublic) {
    if (!estPublic) {
      const reponseSession = await fetch(KADOSK_CONFIG.siteBaseUrl + "/_functions/sessionInvoke", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Kadosk-Session": KADOSK_AUTH.lireSessionBridge() }, body: JSON.stringify({ name: nom, method: methode, body: corps }) });
      const donneesSession = await reponseSession.json().catch(() => ({}));
      if (!reponseSession.ok) { const erreur = new Error(donneesSession.error || "ERREUR_SERVEUR"); erreur.status = reponseSession.status; throw erreur; }
      return donneesSession;
    }
    const options = {
      method: methode,
      headers: {
        // Important : les API REST Wix attendent le token brut, PAS "Bearer <token>".
        Authorization: accessToken,
        "Content-Type": "application/json"
      }
    };
    if (corps !== undefined && methode !== "GET") {
      options.body = JSON.stringify(corps);
    }

    let reponse;
    try {
      reponse = await fetch(urlFonction(nom), options);
    } catch (erreurReseau) {
      console.error("KADOSK_API appel réseau échoué vers", nom, erreurReseau);
      const erreur = new Error("ERREUR_RESEAU");
      erreur.cause = erreurReseau;
      throw erreur;
    }

    if (reponse.status === 401 && !dejaReessaye && !estPublic) {
      return appeler(nom, methode, corps, true);
    }

    const texteBrut = await reponse.text();
    let donnees = {};
    try {
      donnees = texteBrut ? JSON.parse(texteBrut) : {};
    } catch (erreurParsage) {
      console.error("KADOSK_API réponse non-JSON depuis", nom, reponse.status, texteBrut.slice(0, 500));
    }

    if (!reponse.ok) {
      console.error("KADOSK_API réponse non-OK depuis", nom, reponse.status, donnees);
      const erreur = new Error(donnees.error || "ERREUR_SERVEUR");
      erreur.status = reponse.status;
      throw erreur;
    }

    return donnees;
  }

  async function appeler(nom, methode, corps, dejaReessaye) {
    return executerAppel(nom, methode, corps, "", dejaReessaye, false);
  }

  // Pour les appels avant connexion (mot de passe oublié, limite de connexion) :
  // utilise un token visiteur, pas de session membre requise.
  async function appelerPublic(nom, methode, corps) {
    const tokenVisiteur = await KADOSK_AUTH.obtenirTokenVisiteur();
    return executerAppel(nom, methode, corps, tokenVisiteur, true, true);
  }

  return {
 demanderCodeCommandes:buyerEmail=>appelerPublic('loginCodeRequest','POST',{buyerEmail}),
 confirmerCodeCommandes:(buyerEmail,code,deviceId)=>appelerPublic('loginCodeConfirm','POST',{buyerEmail,code,deviceId}),
 getOrderByNumber:(orderNumber,token)=>appelerPublic('orderByNumber','POST',{orderNumber,token}),
 getMesCartesByEmail:token=>appelerPublic('mesCartesByEmail','POST',{token}),
 setCardPin:(orderItemId,token,pin)=>appelerPublic('clientCardPin','POST',{orderItemId,token,pin}),
 requestReactivation:(code,pin)=>appelerPublic('cardReactivationRequest','POST',{code,pin}),
 confirmReactivation:(code,pin,otp)=>appelerPublic('cardReactivationConfirm','POST',{code,pin,otp}),
 revokeBuyerSession:token=>appelerPublic('buyerLogout','POST',{token})
 };
})();
