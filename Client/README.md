# Client2 — modèles KADOSK

Version séparée du parcours client, reprenant les compositions des références ACCEUIL.html, PRODUIT.html et PANIER.html.

- `index.html` ou `ACCEUIL.html` : accueil, ouvre `boutique-client.html`.
- `PRODUIT.html?merchantId=IDENTIFIANT` : fiche produit, ouvre `commercant-detail.html` en conservant les paramètres.
- `PANIER.html` : panier, ouvre `etape-3-recap.html`.

Les pages de connexion, destinataire, confirmation et les ressources locales sont incluses pour conserver les liens du parcours. Les feuilles de style et scripts partagés restent dans `../shared/`. Servir la racine du projet par HTTP.

Le catalogue utilise l’API KADOSK configurée ; aucun marchand fictif n’est ajouté. Ouvrir un produit depuis le catalogue pour obtenir son identifiant. Le panier conserve les règles existantes (un commerce, cinq cartes maximum, paiement par virement).

La mise en page est adaptée à KADOSK : palette menthe/vert profond, logo, français et DH. Les scripts publicitaires et le paiement tiers des fichiers de référence ne sont pas repris. Le fichier PANIER fourni ne contient pas de panier rempli rendu dans son HTML ; le résumé utilise les données du panier KADOSK.

`Client2/assets/reference-layout.css` contient les adaptations des trois modèles. `scripts/build-production.mjs` copie également ce dossier dans `APP/Client2`. Une publication sur le serveur et l’ajout des URLs de retour OAuth Client2, si nécessaires chez le fournisseur, restent des opérations de déploiement.
