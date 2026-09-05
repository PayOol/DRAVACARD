# Deux layouts, un fonctionnement partagé

DRAVA propose une présentation mobile dédiée sous 768 px et conserve sa présentation desktop à partir de 768 px. Exception : un écran tactile en paysage reste mobile jusqu’à 1023 px de largeur et 500 px de hauteur (`pointer: coarse`). Le parcours visuel peut différer ; les fonctionnalités, conditions et règles de validation doivent rester équivalentes. Toute nouvelle fonctionnalité concerne les deux interfaces.

## Répartition des responsabilités

| Élément | Responsabilité |
| --- | --- |
| `src/lib/catalog.ts` | Source partagée : `CatalogCard` et `cards`. |
| `src/components/catalog/DesktopCatalog.tsx` | Présentation desktop du catalogue. |
| `src/components/catalog/MobileCatalog.tsx` | Présentation et navigation propres au mobile. |
| `src/components/catalog/MobileTransitions.tsx` | Transitions des écrans et commandes mobiles ; animation partagée des cartes dans les deux catalogues. |
| `src/app/page.tsx` | États partagés de l’onglet et de la carte sélectionnée ; ouverture d’un unique `DialogCheckout`. |
| `src/lib/catalog-section.ts` | Sections publiques `cards` / `tiktok` et correspondance avec le fragment `#tiktok`. |
| `src/components/catalog/CatalogTabs.tsx` | Onglets partagés, libellés bilingues et navigation clavier. |
| `src/components/layout/MainLayout.tsx` | Enveloppe des pages et emplacement `mobileContent` ; affichage des branches par CSS au seuil de 768 px, avec l’exception paysage tactile. |
| `src/lib/responsive-layout.ts` | `MOBILE_LAYOUT_QUERY`, requête partagée des comportements JavaScript ; maintenir son équivalent dans toutes les feuilles CSS des composants, dont `catalog-sections.css`. |
| `src/components/ui/dialog-checkout.tsx` | Parcours de commande commun, état temporaire des coordonnées et transitions entre étapes. |
| `src/components/payment/PaymentResult.tsx` | Vérification et états de paiement communs ; présentation mobile dans `payment-result-mobile.css`. |

Les layouts consomment les mêmes données et callbacks. Une modification d’un produit se fait dans le module partagé. Ne pas créer un deuxième catalogue, dupliquer les montants dans les composants ou créer un client de paiement propre au mobile. Le serveur conserve l’autorité sur le produit, le montant et le statut du paiement.

Le mobile s’ouvre directement sur les cartes. Les écrans Découvrir et Aide ainsi que la navigation basse ont été supprimés à la demande de l’utilisateur. Toute la surface d’une carte permet de la choisir et d’ouvrir sa fiche, avec la même action accessible au clavier que le bouton « Choisir ».

Les deux layouts affichent toutes les cartes. Le filtre « Toutes / Visa / Mastercard » a été supprimé sur mobile et desktop à la demande de l’utilisateur.

Les onglets « Cartes virtuelles » et « Pièces TikTok » sont placés en haut des deux catalogues. Ils changent de section, sans filtrer les réseaux de cartes. La section TikTok (`/#tiktok`) affiche pour l’instant « Bientôt disponible », sans produit ni paiement. L’accueil sans fragment reste le catalogue de cartes. La sélection d’onglet est partagée lors d’un changement de layout et respecte l’historique ; les fragments de fiches mobiles `#card:…` sont conservés. Les onglets utilisent des identifiants ARIA distincts par layout, les flèches et Home/End ; le focus clavier reste sur l’onglet actif lors des transitions. Les panneaux sortants sont inertes.

La carte recommandée est définie par `recommended` dans le catalogue partagé. Les deux layouts la mettent en avant et utilisent `RecommendedBadge` pour afficher « Recommandé » / « Recommended » dans un badge flottant en haut à droite. Préserver sa lisibilité et la sélection de toute la carte sur mobile.

Les styles mobiles restent dans les feuilles dédiées aux composants. Leur requête est `(max-width: 767px), (max-width: 1023px) and (max-height: 500px) and (pointer: coarse)`, identique à `MOBILE_LAYOUT_QUERY`. Ne pas choisir un layout à partir d’un appareil supposé ou de l’agent utilisateur. La branche masquée ne doit ni prendre le focus ni déclencher des effets réservés à l’écran visible. Un changement de largeur ou une rotation ne doit pas réinitialiser la sélection ou la commande ouverte.

## Thèmes clair et sombre

`ThemeProvider` (`src/lib/theme-context.tsx`) gère la préférence unique `system` / `light` / `dark`. Le sélecteur `ThemeToggle`, disponible dans les headers desktop et mobiles (catalogue, fiche et pages de résultat), utilise un contrôle natif avec trois options françaises/anglaises et une cible de 44 px. Par défaut, le thème suit le système ; un choix explicite est mémorisé uniquement sous la clé `drava-theme`. Le retour à « Système » supprime ce choix, et les onglets ouverts se synchronisent. Une indisponibilité du stockage ne bloque pas l’interface.

`public/theme-init.js`, chargé dans le head avant le contenu, applique la classe `dark` et `color-scheme` avant affichage. Son chemin respecte `NEXT_PUBLIC_BASE_PATH`. Le provider reprend cet état sans remonter le contenu ni réinitialiser le checkout. Les composants Tailwind utilisent leurs variantes `dark` ; les feuilles mobiles conservent leurs requêtes isolées et déclinent les couleurs par tokens. Aucun filtre d’inversion n’est appliqué aux cartes ou logos. Le reçu imprimé reste sur fond blanc avec texte foncé, y compris lorsque le site est sombre.

Lors d’un changement de style, vérifier les deux thèmes et « Système », les états focus/hover/disabled/erreur, la lisibilité des logos et l’impression, sans modifier les règles de paiement. La page de paiement externe du prestataire n’est pas une interface DRAVA et conserve son propre thème.

## Parcours de commande à préserver

1. Afficher les notes d’utilisation et recueillir leur acceptation explicite.
2. Recueillir et valider les coordonnées. Détecter la localisation après acceptation uniquement ; un résultat tardif ne doit jamais écraser le numéro saisi ou effacé par l’utilisateur.
3. Afficher les prestataires disponibles et leurs états de chargement, d’indisponibilité et d’erreur ; empêcher les doubles soumissions.
4. Vérifier le paiement auprès du serveur au retour. Un chemin de retour, un fragment arbitraire ou une simulation ne valide pas une transaction. Préserver la distinction entre paiement confirmé et émission/livraison de carte.

Un seul dialogue orchestre ces étapes pour les deux layouts. Ne pas contourner la validation des coordonnées, le consentement ou la vérification serveur pour raccourcir le parcours mobile. Les coordonnées et jetons restent hors de l’historique et du cache PWA.

## Comportement mobile

- Respecter les zones sûres avec `env(safe-area-inset-*)` et la hauteur réellement visible lorsque le clavier apparaît. Le champ actif et l’action suivante doivent rester accessibles par défilement.
- Maintenir un retour cohérent entre étapes, la fermeture du dialogue et le retour système du navigateur. Ne pas laisser d’entrées d’historique inutiles après fermeture.
- Animer chaque changement du parcours, dès le passage catalogue/fiche, puis l’ouverture, les étapes et la fermeture de la commande. Capturer la position de l’écran sortant avant la navigation et le garder fixe pendant la restauration du défilement de l’écran entrant ; les fondus se croisent sans écran vide. Préserver les retours/avances rapides et supprimer les mouvements lorsque `prefers-reduced-motion` est actif.
- Placer le focus dans le panneau actif, rendre les panneaux sortants inertes, puis restaurer le focus à la fermeture. La version masquée du catalogue ne doit pas recevoir cette restauration.
- Prévoir des cibles tactiles d’au moins 44 px, des libellés accessibles, le zoom et `prefers-reduced-motion`. Garder les textes et erreurs disponibles en français et en anglais.
- Conserver les chemins PWA relatifs au déploiement et les ressources compatibles avec `NEXT_PUBLIC_BASE_PATH`. Le service worker ne cache que les ressources publiques autorisées ; les transactions nécessitent le réseau.

## Validation avant livraison

Vérifier en français et en anglais les largeurs **320, 390, 767, 768 et 1440 px**, ainsi que **844 × 390 px en tactile** (layout mobile) et **844 × 390 px avec une souris** (layout desktop). Contrôler le catalogue, les détails de carte, toutes les étapes de commande et les états de résultat. Il ne doit y avoir ni débordement horizontal, ni action masquée, ni changement visuel desktop involontaire.

Tester aussi le changement de largeur avec une commande ouverte, les textes longs, le zoom, la navigation clavier, la réduction des animations et le retour système. Sur mobile, contrôler le clavier ouvert, le défilement, les zones sûres, la fermeture et la restauration du focus. Vérifier les états réseau lents ou indisponibles avec des mocks, sans effectuer de paiement réel.

Exécuter :

```sh
npm run lint
npm run build
npm run test:payments
npm run test:theme
node --test scripts/pwa.test.mjs
```

Si le changement touche les règles de paiement, la sécurité, le déploiement ou le worker, exécuter également les contrôles correspondants du dépôt. Vérifier les liens et ressources avec un `NEXT_PUBLIC_BASE_PATH` non vide lorsque les chemins changent. Une validation sur navigateur émulé doit être complétée sur iOS/Android pour confirmer les comportements propres au système ; préciser les appareils réellement testés.

### Validation des onglets — 5 septembre 2026

- Navigateur local, français et anglais : deux sections, quatre cartes conservées, aucune barre de défilement horizontale aux largeurs CSS mesurées de 320, 390, 766, 768 et 1440 px, ainsi qu’en 844 × 390 px avec une souris.
- Vérifiés : lien direct `#tiktok` après rechargement, flèches clavier et focus, retour fiche → cartes → TikTok, commande notes → coordonnées fictives → prestataires sans paiement, redimensionnement avec commande ouverte, retour système vers les coordonnées et fermeture avec restauration du focus.
- Limites : le zoom du navigateur de contrôle ne permet pas de mesurer exactement 767 px (766 et 768 encadrent le seuil). Aucun appareil iOS/Android réel, clavier logiciel, mode tactile `pointer: coarse` ni réglage système de réduction des animations n’a été émulé ; ces vérifications restent à effectuer. Les comportements de réduction des animations et d’inertie sont conservés dans le code.

### Validation des thèmes — 5 septembre 2026

- Edge local : catalogue et TikTok dans les deux thèmes, en français et anglais, aux largeurs CSS 320, 390, 766, 768, 1440 px et en paysage 844 × 390 px avec souris (48 combinaisons). Un seul sélecteur visible, sans débordement horizontal. Reçu de simulation contrôlé aux mêmes dimensions et dans les deux langues (24 combinaisons) ; pages d’échec et 404 contrôlées en clair/sombre à 320 et 1440 px.
- Parcours vérifié sans paiement : fiche, consentement, validation des coordonnées fictives et prestataire ; conservation du formulaire lors d’un changement de thème depuis un autre onglet. Choix sombre conservé après navigation, et option Système conforme à la préférence réellement exposée par le navigateur.
- Contrôles réussis : lint/types, 63 tests du parcours et du catalogue, 11 tests de thème, 6 tests PWA, auto-tests du scanner de sécurité et analyse de l’export. Compilation statique vérifiée à la racine et avec `/DRAVACARD`, puis export racine rétabli.
- Limites : même réserve sur 767 px exact, iOS/Android, clavier logiciel, paysage tactile et réduction des animations que ci-dessus. Les changements de préférence système et les restrictions de stockage sont testés par mocks ; l’impression claire est contrôlée par tests de rendu/CSS, sans impression physique ni aperçu système. Aucun paiement réel ni déploiement effectué.
