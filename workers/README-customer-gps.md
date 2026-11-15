# Enregistrement GPS dans customer.txt
Le fichier `customer.txt` est PUBLIC. Les visiteurs doivent cocher un consentement explicite indiquant que les coordonnées exactes, l'horodatage et un identifiant de session seront visibles par tous. Ne pas utiliser pour une collecte cachée.

## Déploiement
1. Déployer `workers/customer-gps.js` dans Cloudflare Workers.
2. Définir les variables `GITHUB_REPO=appom99s/kdsk`, `GITHUB_BRANCH=main`, `ALLOWED_ORIGIN=https://merchant.kadosk.com` (adapter à l'origine réelle).
3. Ajouter le secret `GITHUB_TOKEN`: token GitHub fine-grained avec permission **Contents: Read and write** uniquement sur ce dépôt. Ne jamais placer ce token dans le code public.
4. Dans `Merchant/assets/signupp-config.js`, renseigner `window.KADOSK_CUSTOMER_GPS_ENDPOINT` avec l'URL HTTPS du Worker.
5. Tester sur HTTPS: cocher le consentement, cliquer sur « Démarrer », autoriser le GPS. La première ligne est envoyée immédiatement puis toutes les 5 minutes tant que la page est active; « Arrêter » stoppe les relevés.
6. Prévoir anti-abus, limite de fréquence côté serveur, conservation limitée et suppression des données avant une mise en production.

GitHub Pages ne permet pas l'écriture directe. Sans Worker déployé et token configuré, aucun enregistrement n'aura lieu.
