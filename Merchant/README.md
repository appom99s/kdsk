# Merchant

Périmètre marchand : tableau de bord, caisse, commandes, finance, paramètres,
équipe et gestion des offres. Les pages actuellement concernées sont
`dashboard.html`, `cashier.html`, `orders.html`, `finance.html`, `settings.html`,
`business.html` et leurs modules `assets/*.js` associés.

## Identité visuelle propre à KADOSK (2026-09-13, suite)

Le gabarit visuel initial (`Merchant/assets/landing.css`) était explicitement
"adapté de la référence visuelle Popcard Rewards" (voir historique ci-dessous)
et le restait structurellement même après le premier recolorage : nav en
capsule pilule, boutons en dégradé pilule, mockup téléphone + badges circulaires
flottants autour, soulignement en barre dégradée. Sur retour explicite de
l'utilisateur ("ça ressemble à getpopcard.com/rewards"), ces éléments ont été
remplacés par un système propre à KADOSK :
- Nav à plat (soulignement au survol, pas de capsule de fond).
- Boutons en rectangles arrondis (14px), couleurs pleines (`--ink` / `--accent`),
  plus aucun dégradé sur bouton/soulignement/graphique.
- Visuel hero remplacé : un éventail de 3 cartes cadeaux (`.card-fan`/`.fan-card`)
  au lieu du mockup téléphone + badges circulaires flottants (`.orb`) — motif
  directement lié au produit (cartes cadeaux), pas un générique d'app mobile.
- Badge/chip avec liseré latéral au lieu d'une pilule pleine largeur.
- Étapes "Comment ça marche" numérotées (pastille 1-4) au lieu de simples
  icônes.
- CSS mort supprimé au passage (`.orb`, `.phone*`, `.gift-preview`, `.notice`,
  `.message`/`.segments`, `.plan-options`/`.pricing-bottom` de l'ancien
  sélecteur de formule remplacé par `.config` lors de la refonte précédente).

## Landing page publique (refonte SaaS marchand, 2026-09-13)

Refonte complète de positionnement : KADOSK devient explicitement un SaaS
marchand en libre-service ("Vendez vos propres cartes cadeaux simplement"),
avec essai gratuit (10 cartes, sans carte bancaire), configurateur d'abonnement
à 2 dimensions (cartes émises/mois + caissiers, à partir de 199 MAD) et 0 % de
commission sur les ventes directes. **Ceci remplace le modèle précédent**
(6 formules fixes par nombre de caissiers, 299-3899 MAD, documenté dans
`docs/abonnements-equipe-kadosk.md`, qui devient obsolète — l'application
réelle du nouveau quota côté backend reste à faire, voir "Reste à faire").

Accessible via `/index.html` et `/Merchant/index.html`. Le dossier `APP`
contient les mêmes fichiers pour les livraisons utilisant cette arborescence.
Palette : `--ink:#1F3A34 --accent:#7FB5AB --accent-light:#B7D6CF --paper:#F7FAF9
--warm:#EDEAE2` (définie dans `Merchant/assets/landing.css`, cohérente avec
`--k2-primary:#1f3a34` déjà utilisé côté `Client/assets/kadosk2.css`).

Fichiers à publier ensemble : `index.html`, `Merchant/index.html`,
`Merchant/signup.html`, `Merchant/assets/{landing.css,landing.js,
pricing-config.js,signup.js}` et le logo existant. Pour une publication depuis
`APP`, utiliser les copies correspondantes dans `APP` (déjà synchronisées).

**Source unique des prix affichés** : `Merchant/assets/pricing-config.js`
(`window.KADOSK_PRICING_CONFIG`). Ne jamais recopier les montants ailleurs
dans le frontend — modifier uniquement ce fichier (et sa copie `APP/Merchant/
assets/pricing-config.js`) si les tarifs changent.

### CTA "Tester gratuitement" → `Merchant/signup.html`

Formulaire de capture de demande d'essai (nom du commerce, catégorie, email,
téléphone) → nouveau webMethod `soumettreDemandeEssaiMarchand`
(`backend/giftCardSecurity.web.js`, `Permissions.Anyone`) → nouvelle collection
Wix Data **`MerchantTrialRequests`** (à créer manuellement dans le CMS avant
mise en prod — `itemInsert: CMS_EDITOR` comme les autres collections de ce
projet, écriture uniquement via `elevate()`/`suppressAuth`). Gateway REST :
`post_trialRequest`/`options_trialRequest` dans `backend/http-functions.js`.

**Important — ce n'est PAS encore un vrai provisioning self-service** : la
soumission ne crée ni membre Wix, ni fiche `Merchants`, ni compteur d'essai
(10 cartes). C'est une capture de lead qu'un humain de l'équipe KADOSK traite
ensuite manuellement, en attendant que le vrai moteur d'essai/quota (Phase 1
du cahier des charges SaaS) soit implémenté. Ne pas présenter ce flux comme
un essai instantané tant que ce point n'est pas résolu.

## Moteur backend du quota de cartes/caissiers (2026-09-13, suite)

Implémenté dans `backend/giftCardSecurity.web.js` (fonctions `resoudreQuotaCartesMarchand`,
`verifierEtReserverQuotaCarte`, `relacherReservationQuotaCarte`,
`resoudreLimiteCaissiersMarchand`, `demanderChangementFormuleCarteCadeau`), en
réutilisant intégralement le mécanisme existant (Wix Pricing Plans +
`elevatedListPlanOrders`, même schéma de verrou optimiste que
`genererProchainMerchantCode`/`genererProchainNumeroFactureAE`) plutôt qu'un
second moteur d'abonnement parallèle.

**Modèle** : un marchand peut avoir jusqu'à 2 abonnements Wix Pricing Plans
actifs simultanément pour le nouveau modèle — 1 plan de base (`CARD_QUOTA_PLANS_PAR_ID`,
quota de cartes/mois) + 1 additif caissiers optionnel (`CASHIER_ADDON_PLANS_PAR_ID`).
`OFFRES_KADOSK_PAR_ID` (les 6 anciennes formules par caissiers) n'a PAS été
supprimée : elle continue de servir à `detecterPalierAbonnement` (palier de
commission Bronze/Silver/Gold sur les ventes marchand, sujet distinct) et sert
de filet de sécurité pour les marchands pas encore migrés (voir
`LEGACY_UNLIMITED` ci-dessous).

**Où le quota est réellement appliqué** : `activateGiftCardAndSend` est le
SEUL point d'émission réelle d'une carte cadeau atteignable depuis un
frontend (`createGiftCard` existe mais n'est jamais exposé par
`http-functions.js`, donc inatteignable — vérifié avant d'écrire ce code).
La réservation de quota a lieu juste après le verrou `DRAFT → ACTIVATING` sur
la commande et avant toute génération de code réel ; en cas d'échec
ultérieur (email, etc.), le catch existant qui remet la commande à `DRAFT`
libère aussi symétriquement l'unité de quota consommée.

**Essai gratuit** : `TrialStartedAt` posé au tout premier passage réel (pas
avant), `TrialCardsIssued` incrémenté atomiquement, expiré à 10 cartes OU
30 jours (le premier atteint). Aucun compteur ne redémarre au passage payant
(`SubscriptionCardsIssuedCurrentPeriod` est un compteur séparé).

**Rétrocompatibilité (important)** : un marchand encore sur l'ANCIEN modèle
(formule active parmi `OFFRES_KADOSK_PAR_ID`) n'a JAMAIS eu de notion de
quota de cartes — lui en imposer un rétroactivement aurait cassé un compte
payant en service. `resoudreQuotaCartesMarchand` renvoie `LEGACY_UNLIMITED`
dans ce cas (aucune vérification, aucune écriture) : le quota de cartes ne
s'applique qu'aux marchands en essai ou déjà migrés vers un plan du nouveau
modèle. Le quota de CAISSIERS, lui, retient toujours la limite la plus
favorable entre ancien et nouveau modèle (`resoudreLimiteCaissiersMarchand`).

**Upgrade/downgrade** : implémenté sans machine à états dupliquée — la
source de vérité reste toujours les commandes Wix Pricing Plans réellement
actives. Si plusieurs plans de base sont actifs en même temps (souscription
au nouveau palier avant expiration de l'ancien), c'est TOUJOURS le quota le
plus élevé qui s'applique tant que l'ancien n'a pas expiré : c'est exactement
le comportement "upgrade immédiat, downgrade au prochain cycle" demandé,
sans avoir à piloter l'annulation du plan Wix nous-mêmes.
`demanderChangementFormuleCarteCadeau` n'enregistre qu'une INTENTION
(`PendingCardPlanId`/`PendingChangeEffectiveAt`, pour affichage uniquement —
"votre formule passera à X le [date]") ; elle n'applique jamais rien
elle-même.

### Wix Pricing Plans du nouveau modèle créés (2026-09-15)

Les 9 plans (6 quotas de cartes + 3 additifs caissiers) ont été créés
directement sur kadosk.com via l'API Wix Pricing Plans V3 (voir `etat.txt`
pour les IDs). `CARD_QUOTA_PLANS_PAR_ID`/`CASHIER_ADDON_PLANS_PAR_ID`
(`backend/giftCardSecurity.web.js`, synchronisé dans `docs/backend/`)
utilisent maintenant ces vrais identifiants — les marchands peuvent
souscrire au nouveau modèle dès que le backend est déployé sur Wix (voir
"Avant publication réelle" plus haut). Reste non vérifié : que le CMS Wix
`Merchants` accepte bien l'écriture directe des champs `TrialStartedAt`,
`TrialCardsIssued`, `SubscriptionCardsIssuedCurrentPeriod`,
`SubscriptionPeriodEnd`, `CardQuotaVersion`, `PendingCardPlanId`,
`PendingCashierAddonPlanId`, `PendingChangeEffectiveAt` sans déclaration
préalable (précédent dans ce projet avec Address/City/Region, mais non
re-vérifié en direct pour ces champs précis).

### UI marchand du quota (2026-09-15)

`dashboard.html` (carte "Votre abonnement", déjà présente en WIP non
commité avant cette passe) et `settings.html` (nouvelle section
"Abonnement", `assets/subscription-settings.js`) consomment désormais
`getMerchantSubscriptionInfo`/`cardQuota` : formule active, prix,
renouvellement, alerte de paiement échoué, barre de progression cartes
émises/quota et caissiers actifs/limite. Le bouton "Gérer ma formule" pointe
vers `changePlanUrl` (page Wix officielle de gestion d'abonnement) plutôt
que d'implémenter un flux de changement de formule interne — pas de
comparaison de plans ni d'upgrade/downgrade in-app dans cette passe (voir
cahier des charges SaaS, sections 13-15, non traitées ici).

### Reste à faire (pas dans cette passe)

- Provisioning self-service réel (création automatique du compte marchand +
  membre Wix depuis `signup.html`) au lieu de la simple capture de lead
  actuelle.
- Migration/communication vers les marchands déjà abonnés à l'ancien modèle
  (6 formules par caissiers) si le nouveau modèle doit un jour les remplacer
  complètement — pour l'instant les deux coexistent sans régression (voir
  `LEGACY_UNLIMITED` ci-dessus).
- Comparaison de plans et changement de formule in-app (upgrade/downgrade
  avec calcul des pertes de capacité) : le bouton "Gérer ma formule" renvoie
  vers Wix pour l'instant.

## Suppression du panier de la boutique client (2026-09-15)

Sur `Client/boutique-client.html` (page d'accueil publique de la boutique),
le panier latéral (`.quick-cart`) restait affiché en permanence sur desktop
(≥1101px), y compris vide, avec 372px de marge droite réservée en
conséquence — en plus de l'icône panier dans l'en-tête mobile. Cette UI est
purement redondante avec le parcours réel : `commercant-detail.js` redirige
déjà directement vers `etape-3-recap.html` après "Ajouter au panier", sans
jamais dépendre de l'icône ou du tiroir pour terminer l'achat. Icône,
badge, tiroir (`.quick-cart`/`.quick-cart-backdrop`) et le code JS associé
(`boutique-client.js`) ont été retirés ; la marge desktop réservée a été
rendue à la mise en page. Aucun changement sur `commercant-detail.html`,
`commercants.html` ou `categories.html` (leur icône panier dans l'en-tête
`k2-entete` est un simple lien, pas affichée "par défaut" comme sur la
landing page) ni sur le mécanisme d'achat lui-même.

Contrôles effectués (preview statique locale, Python `http.server`, voir
`.claude/launch.json`) : largeurs desktop et mobile (375px), configurateur
2 dimensions (calcul de prix vérifié manuellement), accordéon FAQ, formulaire
signup (état erreur vérifié, succès non testable sans backend réel déployé).
La publication sur le domaine Wix n'est pas effectuée par cette modification
locale (voir `etat.txt` pour la procédure de republication Velo).
