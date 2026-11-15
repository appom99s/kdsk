# KADOSK — synchronisation Merchant/signupp.html → Google Sheets

La page est dans `Merchant/signupp.html`. Le tableur cible est `1Z-s5EE0cFmRsFcQ2trvfVPbBbh5cJCItxE7UoQjex_A`, onglet `Feuille 1`. La ligne d'en-têtes A1:Y1 a été créée.

## Mise en service

1. Dans Google Cloud, activez **Google Sheets API**, créez un **compte de service** et générez une clé JSON. Ne publiez jamais cette clé dans GitHub.
2. Partagez le tableur avec l’adresse e-mail du compte de service en rôle **Éditeur**.
3. Déployez `workers/merchant-signupp.js` comme **Cloudflare Worker**. Ajoutez la variable `GOOGLE_SHEET_ID` avec la valeur ci-dessus et les secrets `GOOGLE_SERVICE_ACCOUNT_EMAIL` et `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (valeurs JSON `client_email` et `private_key`).
4. Renseignez l'URL HTTPS de ce Worker dans `Merchant/assets/signupp-config.js` : `window.KADOSK_SIGNUPP_ENDPOINT = "https://<votre-worker>";`.
5. Testez une demande depuis `https://merchant.kadosk.com/Merchant/signupp.html` (ou l’URL réelle de la page). Vérifiez la présence d'une nouvelle ligne dans le Sheet.

## Données et confidentialité

L’accès GPS est sollicité **uniquement après** clic sur « Obtenir ma position GPS » et consentement explicite. Le navigateur peut refuser la localisation ; dans ce cas les champs GPS restent vides. `enableHighAccuracy` demande une mesure de précision élevée, sans garantie d’exactitude. Les données sont envoyées seulement au clic de soumission.

Le Worker valide les champs et emploie un compte de service conservé **côté serveur**. Il envoie une nouvelle ligne A:Y via Google Sheets `values.append`. Les identifiants ne doivent jamais apparaître dans HTML/JS public.

**Avant publication en production** : intégrer Cloudflare Turnstile avec vérification serveur, protection anti-spam et rate-limiting, journalisation minimale, politique de rétention des positions GPS et protection contre la duplication des tentatives (clé `requestId` via KV/D1/SQL). Le simple contrôle de l’en-tête `Origin` ne constitue pas une authentification anti-abus. Le Worker fourni n'offre **pas** d'écriture garantie exactement une fois en cas de répétition de requête.

La page et le tableur sont prêts, mais **l'écriture automatique n'est pas active tant que le Worker et ses secrets ne sont pas configurés et déployés**.
