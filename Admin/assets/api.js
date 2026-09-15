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
    getDashboardStats: () => appeler("dashboardStats", "GET"),
    // Habillage de page (nom/logo/palier/rôle) uniquement, sans aucune donnée
    // financière - c'est celui-ci que nav.js doit utiliser (accessible à OWNER
    // et CASHIER), pas getDashboardStats (verrouillé propriétaire).
    getMerchantChromeInfo: () => appeler("chromeInfo", "GET"),
    checkGiftCard: (code) => appeler("checkGiftCard", "POST", { code }),
    redeemGiftCard: (code, amount) => appeler("redeemGiftCard", "POST", { code, amount }),
    // QR temporaire (30s, anti-rejeu) scanné par le marchand en caisse - le payload
    // scanné (KDSKQR1:...) n'est jamais le code permanent. Authentifié comme
    // checkGiftCard/redeemGiftCard (token du marchand connecté, pas un appel public).
    checkQrTemporaire: (payload) => appeler("qrTemporaireCheck", "POST", { payload }),
    redeemQrTemporaire: (payload, amount) => appeler("qrTemporaireRedeem", "POST", { payload, amount }),
    getDraftOrders: () => appeler("draftOrders", "GET"),
    activateOrder: (giftCardId, buyerEmail, buyerName, message) =>
      appeler("activateOrder", "POST", { giftCardId, buyerEmail, buyerName, message }),
    getOfferSettings: () => appeler("offerSettings", "GET"),
    saveOfferSettings: (parametres) => appeler("offerSettings", "POST", parametres),
    getInvoiceTemplate: () => appeler("invoiceTemplate", "GET"),
    saveInvoiceTemplate: (rc, ifNumber, address) => appeler("invoiceTemplate", "POST", { rc, ifNumber, address }),
    getTeamMembers: () => appeler("teamMembers", "GET"),
    inviteTeamMember: (email, role, name, canValidateOrders, canViewGiftCards) =>
      appeler("teamMemberInvite", "POST", { email, role, name, canValidateOrders, canViewGiftCards }),
    removeTeamMember: (merchantUserId) => appeler("teamMemberRemove", "POST", { merchantUserId }),
    getTransactionLog: (giftCardId) => appeler("transactionLog?giftCardId=" + encodeURIComponent(giftCardId), "GET"),
    getRecentTransactions: (code, limit) => {
      const parametres = [];
      if (code) parametres.push("code=" + encodeURIComponent(code));
      if (limit) parametres.push("limit=" + encodeURIComponent(limit));
      const suffixe = parametres.length ? "?" + parametres.join("&") : "";
      return appeler("recentTransactions" + suffixe, "GET");
    },
    getRevenueChart: () => appeler("revenueChart", "GET"),
    getAllGiftCards: (status) =>
      appeler("allGiftCards" + (status ? "?status=" + encodeURIComponent(status) : ""), "GET"),
    getFinanceSummary: () => appeler("financeSummary", "GET"),
    getFinanceDetail: (startDate, endDate) =>
      appeler(
        "financeDetail?startDate=" + encodeURIComponent(startDate || "") +
          "&endDate=" + encodeURIComponent(endDate || ""),
        "GET"
      ),
    // Facture mensuelle auto-entrepreneur (remplace l'ancienne getMyInvoices
    // par transaction/TVA) - year/month numériques (ex. 2026, 8).
    getMonthlyInvoice: (year, month) => appeler("monthlyInvoice?year=" + encodeURIComponent(year) + "&month=" + encodeURIComponent(month), "GET"),
    getMyMonthlyInvoices: () => appeler("myMonthlyInvoices", "GET"),
    getMerchantProfile: () => appeler("merchantProfile", "GET"),
    getSubscriptionInfo: () => appeler("subscriptionInfo", "GET"),
    refuseOrder: (giftCardId, reason) => appeler("refuseOrder", "POST", { giftCardId, reason }),

    // Mot de passe (connecté) : demande de code puis confirmation.
    requestPasswordChange: (newPassword) => appeler("requestPasswordChange", "POST", { newPassword }),
    confirmPasswordChange: (code) => appeler("confirmPasswordChange", "POST", { code }),

    // Mot de passe oublié (déconnecté) : appels publics avec token visiteur.
    forgotPassword: (email, newPassword) => appelerPublic("forgotPassword", "POST", { email, newPassword }),
    confirmForgotPassword: (email, code) => appelerPublic("confirmForgotPassword", "POST", { email, code }),

    // Anti brute-force sur la connexion : appels publics avec token visiteur.
    checkLoginLimit: (email) => appelerPublic("checkLoginLimit", "POST", { email }),
    recordLoginResult: (email, success) => appelerPublic("recordLoginResult", "POST", { email, success }),

    // Réseau KADOSK : acceptation des cartes universelles / par domaine (à la caisse).
    saveNetworkPreferences: (acceptsUniversalCards, acceptsDomainCards) =>
      appeler("networkPreferences", "POST", { acceptsUniversalCards, acceptsDomainCards }),

    // Double authentification (2FA) par application TOTP (Google Authenticator, etc.).
    start2FA: () => appeler("start2FA", "POST"),
    confirm2FA: (code) => appeler("confirm2FA", "POST", { code }),
    disable2FA: (code) => appeler("disable2FA", "POST", { code }),
    need2FA: () => appeler("need2FA", "GET"),
    verify2FA: (code) => appeler("verify2FA", "POST", { code }),

    // Upload de logo : le backend ne fait que générer l'URL signée (nécessite des
    // permissions élevées) ; l'upload du fichier lui-même se fait en PUT direct sur
    // cette URL, sans repasser par la gateway Wix (voir settings.js).
    getMediaUploadUrl: (fileName, mimeType, sizeInBytes) =>
      appeler("mediaUploadUrl", "POST", { fileName, mimeType, sizeInBytes }),

    // Suivi de paiement KADOSK : commission mensuelle + détail par carte.
    getCommissionMonthly: () => appeler("commissionMonthly", "GET"),
    getCommissionDetail: (month) => appeler("commissionDetail?month=" + encodeURIComponent(month), "GET"),

    // Biométrie (WebAuthn : Face ID / Touch ID / Windows Hello) en alternative au TOTP.
    startBiometricEnrollment: () => appeler("startBiometricEnrollment", "POST"),
    confirmBiometricEnrollment: (credentialId, publicKeySpkiBase64, algorithm, clientDataJSON, deviceLabel) =>
      appeler("confirmBiometricEnrollment", "POST", { credentialId, publicKeySpkiBase64, algorithm, clientDataJSON, deviceLabel }),
    disableBiometric: (code) => appeler("disableBiometric", "POST", { code }),
    startBiometricLogin: () => appeler("startBiometricLogin", "POST"),
    verifyBiometricLogin: (clientDataJSON, authenticatorData, signature) =>
      appeler("verifyBiometricLogin", "POST", { clientDataJSON, authenticatorData, signature }),

    // Boutique publique KADOSK (order.kadosk.com... en fait servie depuis ce même
    // dossier - boutique.html/etape-2 à 5) : aucune connexion
    // requise, appels publics avec token visiteur, comme forgotPassword ci-dessus.
    getActiveMerchants: () => appelerPublic("activeMerchants", "GET"),
    getGiftCardOffer: (merchantId) => appelerPublic("giftCardOffer?merchantId=" + encodeURIComponent(merchantId), "GET"),
    placeOrder: (merchantId, montant, buyerEmail, buyerName, quantite, message) =>
      appelerPublic("placeOrder", "POST", { merchantId, montant, buyerEmail, buyerName, quantite, message }),

    // Parcours en 5 étapes (panier multi-marchands) : création de commande (tout est
    // revalidé côté serveur), relecture de confirmation, "Mes commandes" par email.
    createOrder: (items, buyerEmail, recipientName, recipientEmail, message, forSelf) =>
      appelerPublic("createOrder", "POST", { items, buyerEmail, recipientName, recipientEmail, message, forSelf }),

    // Login "Mes commandes" par code reçu par email (remplace l'ancien modèle où
    // l'email transitait tel quel dans l'URL) - voir assets/mes-commandes.js pour la
    // gestion du jeton (stocké côté appareil uniquement, jamais de session serveur).
    demanderCodeCommandes: (buyerEmail) => appelerPublic("loginCodeRequest", "POST", { buyerEmail }),
    // deviceId : identifiant d'appareil (voir mes-commandes.js :: obtenirOuCreerDeviceId)
    // utilisé côté serveur pour appliquer "une seule session active par appareil"
    // (giftCardSecurity.web.js :: enregistrerSessionAppareil).
    confirmerCodeCommandes: (buyerEmail, code, deviceId) =>
      appelerPublic("loginCodeConfirm", "POST", { buyerEmail, code, deviceId }),

    getOrderByNumber: (orderNumber, token) => appelerPublic("orderByNumber", "POST", { orderNumber, token }),
    getOrdersByEmail: (token) => appelerPublic("ordersByEmail", "POST", { token }),

    // Onglet "Mes cartes" (client) : vue à plat de toutes les cartes cadeaux déjà
    // acceptées par un marchand, tous achats confondus - voir mes-commandes.js et
    // giftCardSecurity.web.js/getMesCartesParEmail.
    getMesCartesByEmail: (token) => appelerPublic("mesCartesByEmail", "POST", { token }),

    // Utilisé uniquement par le pont iframe Wix natif (wix-bridge.js) pour un visiteur
    // déjà connecté comme membre Wix sur le site parent (SSO silencieux) - "Mes
    // commandes" standalone reste en connexion invité par code (voir demanderCodeCommandes
    // ci-dessus). Endpoint authentifié (pas appelerPublic) : voir
    // genererJetonAcheteurPourMembreWix.
    getBuyerTokenFromMember: (deviceId) =>
      appeler("buyerTokenFromMember?deviceId=" + encodeURIComponent(deviceId || ""), "GET"),

    // QR temporaire (30s, anti-rejeu) d'une carte précise, affiché par
    // l'acheteur/destinataire depuis "Mes commandes" - voir mes-commandes.js et
    // giftCardSecurity.web.js/genererCodeQRTemporaire pour le détail. orderItemId
    // (pas un identifiant de carte - le client ne le connaît jamais) + jeton acheteur.
    getQrTemporaire: (orderItemId, token) => appelerPublic("qrTemporaire", "POST", { orderItemId, token }),

    // Coordonnées de paiement (RIB) d'un marchand pour une commande précise -
    // exige un jeton acheteur (connexion par code, voir demanderCodeCommandes/
    // confirmerCodeCommandes ci-dessus) ET que ce marchand fasse bien partie de
    // cette commande (vérifié côté serveur) - voir etape5.js.
    getMerchantPaymentInfo: (merchantId, token, orderNumber) =>
      appelerPublic("merchantPaymentInfo", "POST", { merchantId, token, orderNumber }),

    // L'acheteur signale avoir effectué son virement pour un marchand d'une
    // commande - un simple confort d'affichage, jamais une validation (seul le
    // marchand peut réellement accepter une commande) - voir etape5.js.
    confirmerVirementEffectue: (orderNumber, merchantId, token) =>
      appelerPublic("confirmerVirement", "POST", { orderNumber, merchantId, token }),

    // Favoris liés au compte (voir assets/favoris-data.js :: synchroniser) -
    // toujours gatés par le jeton acheteur, jamais un e-mail transmis tel quel.
    getFavorisAcheteur: (token) => appelerPublic("favoris", "POST", { token }),
    basculerFavoriAcheteur: (merchantId, token) => appelerPublic("favoriToggle", "POST", { merchantId, token }),
    fusionnerFavorisLocaux: (merchantIds, token) => appelerPublic("favorisFusion", "POST", { merchantIds, token }),

    // Bannières personnalisables en haut de l'accueil (collection Pub) - voir
    // accueil.js et giftCardSecurity.web.js/getActivePubs.
    getActivePubs: () => appelerPublic("activePubs", "GET"),

    // --- Admin (section 6 de l'audit KADOSK) --------------------------------
    // Authentifiés comme le reste (appeler, pas appelerPublic) : le serveur exige
    // en plus une entrée AdminUsers pour l'identité Wix Member connectée - voir
    // adminSecurity.web.js :: obtenirAdminConfirme. Aucun de ces appels ne
    // transmet de rôle/sous-rôle : c'est toujours le serveur qui le détermine.
    getAdminDashboard: () => appeler("adminDashboard", "GET"),
    getAdminMerchants: (recherche, statut, page) =>
      appeler(
        "adminMerchants?recherche=" + encodeURIComponent(recherche || "") +
          "&statut=" + encodeURIComponent(statut || "") +
          "&page=" + encodeURIComponent(page || "1"),
        "GET"
      ),
    getAdminMerchantDetail: (merchantId) =>
      appeler("adminMerchantDetail?merchantId=" + encodeURIComponent(merchantId), "GET"),
    setAdminMerchantStatus: (merchantId, action, raison) =>
      appeler("adminMerchantStatus", "POST", { merchantId, action, raison }),
    searchAdminClient: (email) =>
      appeler("adminClientSearch?email=" + encodeURIComponent(email), "GET"),
    getAdminOrders: (statut, page) =>
      appeler("adminOrders?statut=" + encodeURIComponent(statut || "") + "&page=" + encodeURIComponent(page || "1"), "GET"),
    relancerCommandeDraft: (orderItemId) => appeler("adminRelancerCommande", "POST", { orderItemId }),
    declencherRelancesAutomatiques: () => appeler("adminRelancesAutomatiques", "POST", {}),
    getAdminGiftCards: (statut, page) =>
      appeler("adminGiftCards?statut=" + encodeURIComponent(statut || "") + "&page=" + encodeURIComponent(page || "1"), "GET"),
    getAdminTransactions: (orderNumber) =>
      appeler("adminTransactions?orderNumber=" + encodeURIComponent(orderNumber), "GET"),
    getAdminTransaction360: (orderNumber) =>
      appeler("adminTransaction360?orderNumber=" + encodeURIComponent(orderNumber), "GET"),
    getAdminFinanceSummary: () => appeler("adminFinanceSummary", "GET"),
    getAdminCommissions: (merchantId, page, startDate, endDate) =>
      appeler(
        "adminCommissions?merchantId=" + encodeURIComponent(merchantId || "") +
          "&page=" + encodeURIComponent(page || "1") +
          "&startDate=" + encodeURIComponent(startDate || "") +
          "&endDate=" + encodeURIComponent(endDate || ""),
        "GET"
      ),
    getAdminMerchantsFiltre: () => appeler("adminMerchantsFiltre", "GET"),
    getAdminMonthlyInvoice: (merchantId, year, month) =>
      appeler(
        "adminMonthlyInvoice?merchantId=" + encodeURIComponent(merchantId || "") +
          "&year=" + encodeURIComponent(year) + "&month=" + encodeURIComponent(month),
        "GET"
      ),
    getAdminMonthlyInvoicesList: (merchantId) =>
      appeler("adminMonthlyInvoicesList?merchantId=" + encodeURIComponent(merchantId || ""), "GET"),
    getAdminAutoEntrepreneurSettings: () => appeler("adminAutoEntrepreneurSettings", "GET"),
    saveAdminAutoEntrepreneurSettings: (donnees) =>
      appeler("adminAutoEntrepreneurSettings", "POST", donnees),
    setAdminCommissionPaymentStatus: (merchantId, year, month, statut, reference, moyen) =>
      appeler("adminCommissionPaymentStatus", "POST", { merchantId, year, month, statut, reference, moyen }),
    sendAdminMonthlyInvoiceEmail: (merchantId, year, month, facturePdfUrl) =>
      appeler("adminSendMonthlyInvoiceEmail", "POST", { merchantId, year, month, facturePdfUrl }),
    getAdminInvoiceUploadUrl: (fileName, mimeType, sizeInBytes) =>
      appeler("adminInvoiceUploadUrl", "POST", { fileName, mimeType, sizeInBytes }),
    getAdminReconciliation: () => appeler("adminReconciliation", "GET"),
    setAdminGiftCardStatus: (giftCardId, action, raison) =>
      appeler("adminGiftCardStatus", "POST", { giftCardId, action, raison })
  };
})();
