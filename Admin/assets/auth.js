const KADOSK_AUTH = (function () {
  const OAUTH_TOKEN_URL = "https://www.wixapis.com/oauth2/token";
  const LOGIN_V2_URL = "https://www.wixapis.com/_api/iam/authentication/v2/login";
  const REGISTER_V2_URL = "https://www.wixapis.com/_api/iam/authentication/v2/register";
  // Confirme le code à 6 chiffres reçu par email quand inscrireMembre renvoie
  // state: "REQUIRE_EMAIL_VERIFICATION" (cas où l'email est déjà connu comme contact -
  // voir https://dev.wix.com/docs/api-reference/business-management/headless/verification/verify-during-authentication).
  const VERIFY_AUTH_URL = "https://www.wixapis.com/_api/iam/verification/v1/auth/verify";
  const REDIRECT_SESSION_URL = "https://www.wixapis.com/_api/redirects-api/v1/redirect-session";

  const PKCE_STORAGE_KEY = "kadosk_pkce_verifier";
  const STATE_STORAGE_KEY = "kadosk_oauth_state";
  const SESSION_HINT = "kadosk_session_hint";
  const SESSION_BRIDGE = "kadosk_session_bridge";
  let tokensTemporaires = null;
  function ecrireCookie(nom, valeur, maxAge, sameSite) { document.cookie = nom + "=" + encodeURIComponent(valeur || "") + "; Domain=.kadosk.com; Path=/; Max-Age=" + maxAge + "; Secure; SameSite=" + (sameSite || "Lax"); }
  function lireCookie(nom) { const p = nom + "="; const v = document.cookie.split(";").map((x) => x.trim()).find((x) => x.startsWith(p)); return v ? decodeURIComponent(v.slice(p.length)) : ""; }
  function lireSessionBridge() { return lireCookie(SESSION_BRIDGE); }

  // Marqueur (sessionStorage, donc effacé à la fermeture de l'onglet/navigateur)
  // indiquant que la double authentification (TOTP ou biométrie) a déjà été
  // vérifiée pour CETTE session de connexion. Politique : la 2FA est exigée à
  // chaque nouvelle connexion, mais on évite de la redemander à chaque
  // changement de page ou de rappeler le serveur en boucle une fois vérifiée.
  const VERIF_2FA_STORAGE_KEY = "kadosk_2fa_verifiee_session";

  function marquerVerification2FA() {
    try {
      ecrireCookie(VERIF_2FA_STORAGE_KEY, "1", 12 * 60 * 60, "Strict");
    } catch (erreur) {
      // Stockage indisponible : on continue sans persistance (redemandera la 2FA).
    }
  }

  function verification2FAEffectuee() {
    try {
      return lireCookie(VERIF_2FA_STORAGE_KEY) === "1";
    } catch (erreur) {
      return false;
    }
  }

  function effacerVerification2FA() {
    try {
      ecrireCookie(VERIF_2FA_STORAGE_KEY, "", 0, "Strict");
    } catch (erreur) {
      // Rien à faire.
    }
  }

  function config() {
    return window.KADOSK_CONFIG;
  }

  function base64UrlEncoder(buffer) {
    let chaine = "";
    const octets = new Uint8Array(buffer);
    for (let i = 0; i < octets.byteLength; i++) {
      chaine += String.fromCharCode(octets[i]);
    }
    return btoa(chaine).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function genererChaineAleatoire(longueur) {
    const octets = new Uint8Array(longueur);
    crypto.getRandomValues(octets);
    return base64UrlEncoder(octets.buffer);
  }

  async function genererDefiPkce(verifier) {
    const donnees = new TextEncoder().encode(verifier);
    const hachage = await crypto.subtle.digest("SHA-256", donnees);
    return base64UrlEncoder(hachage);
  }

  function lireTokens() {
    try {
      return tokensTemporaires;
    } catch (erreur) {
      return null;
    }
  }

  async function ecrireTokens(tokens) {
    tokensTemporaires = tokens;
    const reponse = await fetch(config().siteBaseUrl + "/_functions/sessionStart", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Kadosk-Device-Id": btoa(unescape(encodeURIComponent([navigator.userAgent, navigator.platform, screen.width + "x" + screen.height].join("|")))).slice(0, 160) }, body: JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, clientId: config().clientId }) });
    if (!reponse.ok) { const erreurSession = await reponse.json().catch(() => ({})); tokensTemporaires = null; throw new Error(erreurSession.error || "SESSION_SERVEUR_INDISPONIBLE"); }
    const session = await reponse.json().catch(() => ({})); if (!session.sessionToken) throw new Error("SESSION_SERVEUR_INDISPONIBLE");
    tokensTemporaires = null; ecrireCookie(SESSION_BRIDGE, session.sessionToken, 30 * 24 * 60 * 60, "Strict"); ecrireCookie(SESSION_HINT, "1", 30 * 24 * 60 * 60, "Strict");
  }

  // Bug trouvé : le cache partagé nom/logo/rôle/permissions/stats (voir
  // cache.js, clés "kadosk_cache_*" en sessionStorage) n'était JAMAIS vidé à
  // la déconnexion. sessionStorage survit à un logout/login dans le même
  // onglet - si un propriétaire se déconnectait puis qu'un caissier se
  // connectait dans le même onglet, celui-ci récupérait instantanément (et
  // durablement, la donnée fraîche pour son propre rôle échouant ensuite
  // silencieusement en arrière-plan pour un caissier) le rôle/menu/stats du
  // PROPRIÉTAIRE précédent. On vide donc tout le cache KADOSK à chaque
  // effacement de jetons (déconnexion, session invalide...).
  function effacerCacheKadosk() {
    try {
      if (window.KADOSK_CACHE && window.KADOSK_CACHE.clear) window.KADOSK_CACHE.clear();
    } catch (erreur) {
      // Stockage indisponible (navigation privée, quota...) : rien à nettoyer.
    }
  }

  async function effacerTokens() {
    const sessionBridge = lireCookie(SESSION_BRIDGE);
    tokensTemporaires = null; ecrireCookie(PKCE_STORAGE_KEY, "", 0); ecrireCookie(STATE_STORAGE_KEY, "", 0); ecrireCookie(SESSION_HINT, "", 0, "Strict"); ecrireCookie(SESSION_BRIDGE, "", 0, "Strict");
    fetch(config().siteBaseUrl + "/_functions/sessionEnd", { method: "POST", credentials: "include", headers: { "X-Kadosk-Session": sessionBridge } }).catch(() => {});
    effacerVerification2FA();
    effacerCacheKadosk();
  }

  async function appelJson(url, corps, headersSupplementaires) {
    let reponse;
    try {
      reponse = await fetch(url, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headersSupplementaires || {}),
        body: JSON.stringify(corps)
      });
    } catch (erreurReseau) {
      console.error("KADOSK_AUTH appel réseau échoué vers", url, erreurReseau);
      const erreur = new Error("ERREUR_RESEAU");
      erreur.cause = erreurReseau;
      throw erreur;
    }

    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      console.error("KADOSK_AUTH réponse non-OK depuis", url, reponse.status, donnees);
      const erreur = new Error(donnees.message || donnees.details || "ERREUR_AUTHENTIFICATION");
      erreur.status = reponse.status;
      erreur.donnees = donnees;
      throw erreur;
    }

    return donnees;
  }

  async function obtenirTokenVisiteur() {
    const donnees = await appelJson(OAUTH_TOKEN_URL, {
      clientId: config().clientId,
      grantType: "anonymous"
    });
    return donnees.access_token;
  }

  async function loginMembre(email, motDePasse) {
    const tokenVisiteur = await obtenirTokenVisiteur();
    return appelJson(
      LOGIN_V2_URL,
      { loginId: { email }, password: motDePasse },
      { Authorization: tokenVisiteur }
    );
  }

  async function inscrireMembre(email, motDePasse, profile) {
    const tokenVisiteur = await obtenirTokenVisiteur();
    return appelJson(
      REGISTER_V2_URL,
      { loginId: { email }, password: motDePasse, profile: profile || {} },
      { Authorization: tokenVisiteur }
    );
  }

  // Étape 2 de l'inscription quand inscrireMembre a renvoyé
  // state: "REQUIRE_EMAIL_VERIFICATION" (+ un stateToken) : confirme le code à 6
  // chiffres reçu par email pour cette même tentative d'inscription. Réponse de même
  // forme que loginMembre/inscrireMembre (state/sessionToken) - si state redevient
  // "SUCCESS", le sessionToken renvoyé s'utilise exactement comme celui d'un login
  // classique (demarrerAutorisationMembre).
  async function confirmerCodeInscription(stateToken, code) {
    const tokenVisiteur = await obtenirTokenVisiteur();
    return appelJson(
      VERIFY_AUTH_URL,
      { code, stateToken },
      { Authorization: tokenVisiteur }
    );
  }

  async function demarrerAutorisationMembre(sessionToken, cheminRedirectionPersonnalise) {
    const verifier = genererChaineAleatoire(64);
    const defi = await genererDefiPkce(verifier);
    const etat = genererChaineAleatoire(24);

    ecrireCookie(PKCE_STORAGE_KEY, verifier, 600); ecrireCookie(STATE_STORAGE_KEY, etat, 600);

    // Chemin de callback personnalisable : le flow marchand (login.html) utilise le
    // callback par défaut (loginCallbackPath), mais d'autres contextes (ex. la
    // boutique publique intégrée en HTML sur le site Wix) ont besoin de revenir sur
    // une page de callback différente, sans passer par la logique 2FA/dashboard du
    // callback marchand. Le redirectUri utilisé ici DOIT être identique, caractère
    // pour caractère, à celui utilisé dans traiterRetourAutorisation ci-dessous lors
    // de l'échange du code - sinon Wix refuse l'échange (redirect_uri mismatch).
    const redirectUri = config().frontendBaseUrl + (cheminRedirectionPersonnalise || config().loginCallbackPath);
    const tokenVisiteur = await obtenirTokenVisiteur();

    const reponse = await appelJson(
      REDIRECT_SESSION_URL,
      {
        origin: config().frontendBaseUrl,
        auth: {
          authRequest: {
            clientId: config().clientId,
            codeChallenge: defi,
            codeChallengeMethod: "S256",
            responseMode: "query",
            responseType: "code",
            scope: "offline_access",
            state: etat,
            sessionToken: sessionToken,
            redirectUri: redirectUri
          }
        }
      },
      { Authorization: tokenVisiteur }
    );

    window.location.href = reponse.redirectSession.fullUrl;
  }

  async function traiterRetourAutorisation(cheminRedirectionPersonnalise) {
    const parametres = new URLSearchParams(window.location.search);
    const code = parametres.get("code");
    const etatRecu = parametres.get("state");
    const erreur = parametres.get("error");

    if (erreur) {
      throw new Error("AUTORISATION_REFUSEE");
    }

    const etatAttendu = lireCookie(STATE_STORAGE_KEY);
    const verifier = lireCookie(PKCE_STORAGE_KEY);

    if (!code || !etatRecu || !etatAttendu || etatRecu !== etatAttendu || !verifier) {
      throw new Error("SESSION_INVALIDE");
    }

    // Doit être exactement le même redirectUri que celui utilisé dans
    // demarrerAutorisationMembre ci-dessus pour cette même tentative de connexion.
    const redirectUri = config().frontendBaseUrl + (cheminRedirectionPersonnalise || config().loginCallbackPath);

    const tokens = await appelJson(OAUTH_TOKEN_URL, {
      clientId: config().clientId,
      grantType: "authorization_code",
      code: code,
      codeVerifier: verifier,
      redirectUri: redirectUri
    });

    await ecrireTokens(tokens); ecrireCookie(PKCE_STORAGE_KEY, "", 0); ecrireCookie(STATE_STORAGE_KEY, "", 0);
  }

  async function obtenirAccessTokenValide() {
    throw new Error("JETON_NAVIGATEUR_INTERDIT");
  }

  function estConnecte() {
    return lireCookie(SESSION_HINT) === "1";
  }

  // La déconnexion est gérée entièrement côté client : ce site n'a pas de session Wix
  // basée sur des cookies à faire terminer côté serveur (l'authentification repose
  // uniquement sur les jetons access/refresh stockés en local, via PKCE) - effacer ces
  // jetons et revenir directement à la page de connexion suffit, et garantit qu'on y
  // revient toujours (contrairement à l'ancienne version, qui passait par l'API Redirect
  // Session de Wix avec une forme de requête "logout" non documentée/non confirmée, et qui
  // pouvait donc ne pas respecter le postFlowUrl attendu).
  // cheminRedirectionPersonnalise : permet à un contexte autre que le marchand
  // (ex. admin-nav.js côté Admin) de revenir vers SA propre page de connexion
  // plutôt que vers logoutRedirectPath (qui pointe vers /Merchant/login.html
  // par défaut) - même principe que cheminRedirectionPersonnalise dans
  // demarrerAutorisationMembre/traiterRetourAutorisation ci-dessus.
  async function deconnecter(cheminRedirectionPersonnalise) {
    await effacerTokens();
    window.location.href = cheminRedirectionPersonnalise || config().logoutRedirectPath;
  }

  // Variante sans redirection : efface la session membre (et le cache associé) SANS
  // naviguer vers logoutRedirectPath - utile pour un contexte qui n'a pas de page de
  // connexion "de retour" dédiée dans config() (ex. mes-commandes.html, où le
  // formulaire de connexion/inscription vit sur la page elle-même plutôt que sur une
  // page login.html séparée comme côté marchand).
  function deconnecterSansRedirection() {
    effacerTokens();
  }

  // Variante dédiée à la boutique publique intégrée en HTML sur le site Wix : utilise
  // le callback léger boutique-callback.html au lieu du callback marchand (qui gère
  // 2FA/dashboard, non pertinents ici).
  async function demarrerAutorisationMembrePourBoutique(sessionToken) {
    return demarrerAutorisationMembre(sessionToken, config().boutiqueCallbackPath || "/Client/boutique-callback.html");
  }

  async function traiterRetourAutorisationPourBoutique() {
    return traiterRetourAutorisation(config().boutiqueCallbackPath || "/Client/boutique-callback.html");
  }

  return {
    loginMembre,
    inscrireMembre,
    confirmerCodeInscription,
    demarrerAutorisationMembre,
    traiterRetourAutorisation,
    demarrerAutorisationMembrePourBoutique,
    traiterRetourAutorisationPourBoutique,
    obtenirAccessTokenValide,
    obtenirTokenVisiteur,
    estConnecte,
    deconnecter,
    deconnecterSansRedirection,
    marquerVerification2FA,
    verification2FAEffectuee,
    effacerVerification2FA
    ,lireSessionBridge
  };
})();
