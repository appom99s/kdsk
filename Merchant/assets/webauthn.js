// Utilitaires partagés pour la biométrie (WebAuthn : Face ID / Touch ID /
// Windows Hello). Utilisé par business.js (activation), login-callback.html
// et two-factor.html (connexion).
const KADOSK_WEBAUTHN = (function () {
  function bufferVersBase64Url(buffer) {
    let chaine = "";
    const octets = new Uint8Array(buffer);
    for (let i = 0; i < octets.byteLength; i++) {
      chaine += String.fromCharCode(octets[i]);
    }
    return btoa(chaine).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlVersBuffer(base64Url) {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const paddingNecessaire = (4 - (base64.length % 4)) % 4;
    const base64Complete = base64 + "=".repeat(paddingNecessaire);
    const binaire = atob(base64Complete);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) {
      octets[i] = binaire.charCodeAt(i);
    }
    return octets.buffer;
  }

  // Disponibilité d'un authentificateur de plateforme (Face ID / Touch ID /
  // Windows Hello) sur cet appareil. Ne garantit pas que le marchand l'a
  // activé côté KADOSK, seulement que l'appareil pourrait le supporter.
  async function biometrieDisponibleSurCetAppareil() {
    const diagnostic = await diagnostiquerBiometrieSurCetAppareil();
    return diagnostic.disponible;
  }

  // Version diagnostique (DIAGNOSTIC TEMPORAIRE) : renvoie aussi la raison précise d'une
  // indisponibilité, pour l'afficher directement à l'écran sans avoir besoin d'outils de
  // développement (utile notamment sur mobile). Utilisée par le bouton d'activation dans
  // business.js.
  async function diagnostiquerBiometrieSurCetAppareil() {
    if (!window.isSecureContext) {
      return { disponible: false, raison: "Le site n'est pas en contexte sécurisé (HTTPS)." };
    }
    if (!window.PublicKeyCredential) {
      return { disponible: false, raison: "PublicKeyCredential indisponible sur ce navigateur." };
    }
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return { disponible: false, raison: "isUserVerifyingPlatformAuthenticatorAvailable indisponible sur ce navigateur." };
    }
    try {
      const disponible = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        disponible,
        raison: disponible
          ? "OK"
          : "Le navigateur indique qu'aucun authentificateur biométrique de plateforme (empreinte/visage) n'est configuré sur cet appareil."
      };
    } catch (erreur) {
      return { disponible: false, raison: "Erreur lors de la vérification : " + (erreur && erreur.message) };
    }
  }

  // Étape 1 de l'enregistrement : crée un nouveau credential biométrique à
  // partir du challenge renvoyé par startBiometricEnrollment().
  async function creerCredentialEnregistrement(donnees) {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: base64UrlVersBuffer(donnees.challenge),
        rp: { id: donnees.rpId, name: donnees.rpName || "KADOSK Marchand" },
        user: {
          id: base64UrlVersBuffer(donnees.userId),
          name: donnees.userName || "",
          displayName: donnees.userDisplayName || donnees.userName || ""
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (!credential) {
      throw new Error("CREATION_CREDENTIAL_ANNULEE");
    }

    const clePubliqueSpki = credential.response.getPublicKey();
    const algorithme = credential.response.getPublicKeyAlgorithm();

    return {
      credentialId: bufferVersBase64Url(credential.rawId),
      publicKeySpkiBase64: bufferVersBase64Url(clePubliqueSpki),
      algorithm: algorithme,
      clientDataJSON: bufferVersBase64Url(credential.response.clientDataJSON)
    };
  }

  // Étape de connexion : produit une signature à partir du challenge renvoyé
  // par startBiometricLogin().
  async function obtenirAssertionConnexion(donnees) {
    const options = {
      challenge: base64UrlVersBuffer(donnees.challenge),
      rpId: donnees.rpId,
      userVerification: "required",
      timeout: 60000
    };
    if (donnees.allowCredentialId) {
      options.allowCredentials = [
        { type: "public-key", id: base64UrlVersBuffer(donnees.allowCredentialId) }
      ];
    }

    const assertion = await navigator.credentials.get({ publicKey: options });
    if (!assertion) {
      throw new Error("ASSERTION_ANNULEE");
    }

    return {
      clientDataJSON: bufferVersBase64Url(assertion.response.clientDataJSON),
      authenticatorData: bufferVersBase64Url(assertion.response.authenticatorData),
      signature: bufferVersBase64Url(assertion.response.signature)
    };
  }

  return {
    bufferVersBase64Url,
    base64UrlVersBuffer,
    biometrieDisponibleSurCetAppareil,
    diagnostiquerBiometrieSurCetAppareil,
    creerCredentialEnregistrement,
    obtenirAssertionConnexion
  };
})();
