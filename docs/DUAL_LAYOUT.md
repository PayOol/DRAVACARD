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
| `src/components/ui/CheckoutShell.tsx` | Modale commune aux cartes et pièces : cadre, en-tête, étapes, sélection et transitions des panneaux. |
| `src/components/ui/checkout-content.css` | Champs, actions et tuiles de prestataire communs aux deux produits, dans les deux layouts. |
| `src/components/ui/dialog-checkout.tsx` | État temporaire et validation de la commande de carte, présentés dans `CheckoutShell`. |
| `src/components/payment/PaymentResult.tsx` | Vérification et états de paiement communs ; présentation mobile dans `payment-result-mobile.css`. |
| `src/lib/payment-api.ts` | Transport unique de création, disponibilité, devis et vérification pour tous les services. |
| `src/lib/payment-providers.ts` | Registre global des prestataires : identité, logo et type de parcours. |
| `src/components/payment/SharedPaymentProviders.tsx` et `SebPayForm.tsx` | Sélection des prestataires et formulaire Mobile Money partagés par les cartes et TikTok. |

Les layouts consomment les mêmes données et callbacks. Une modification d’un produit se fait dans le module partagé. Ne pas créer un deuxième catalogue, dupliquer les montants dans les composants ou créer un client de paiement propre au mobile. Le serveur conserve l’autorité sur le produit, le montant et le statut du paiement.

Le mobile s’ouvre directement sur les cartes. Les écrans Découvrir et Aide ainsi que la navigation basse ont été supprimés à la demande de l’utilisateur. Toute la surface d’une carte permet de la choisir et d’ouvrir sa fiche, avec la même action accessible au clavier que le bouton « Choisir ».

Le catalogue mobile commence directement sous les onglets : son ancien titre d’introduction, son sous-texte et le compteur de cartes ont été retirés. Un titre masqué visuellement conserve la structure accessible et la cible de focus au retour depuis une fiche. L’introduction desktop garde sa présentation.

Les deux layouts affichent toutes les cartes. Le filtre « Toutes / Visa / Mastercard » a été supprimé sur mobile et desktop à la demande de l’utilisateur.

Les onglets « Cartes virtuelles » et « Pièces TikTok » sont placés en haut des deux catalogues. Ils changent de section, sans filtrer les réseaux de cartes. La section TikTok (`/#tiktok`) reprend les six packs, bonus et prix personnalisés d’UpCoin. Son catalogue est partagé dans `src/lib/tiktok-catalog.ts`, son formulaire dans `TikTokCheckout` et sa vérification dans `TikTokResult`. L’accueil sans fragment reste le catalogue de cartes. La sélection d’onglet est partagée lors d’un changement de layout et respecte l’historique ; les fragments de fiches mobiles `#card:…` sont conservés. Les onglets utilisent des identifiants ARIA distincts par layout, les flèches et Home/End ; le focus clavier reste sur l’onglet actif lors des transitions. Les panneaux sortants sont inertes.

La carte recommandée est définie par `recommended` dans le catalogue partagé. Les deux layouts la mettent en avant et utilisent `RecommendedBadge` pour afficher « Recommandé » / « Recommended » dans un badge flottant en haut à droite. Préserver sa lisibilité et la sélection de toute la carte sur mobile.

### Pièces TikTok

`Home` conserve la quantité personnalisée et le pack sélectionné lors d’un changement de layout. `TikTokPanel` présente les mêmes six packs dans les deux catalogues. `TikTokCheckout` est monté une seule fois, hors des branches de présentation : instructions et consentement, compte TikTok et WhatsApp, récapitulatif/e-mail/prestataire, puis formulaire SebPay si sélectionné. Le pays n’est détecté qu’après consentement et une saisie manuelle reste prioritaire. Les cartes et pièces utilisent la même présentation `CheckoutShell`, les mêmes panneaux animés `CheckoutPanel`, la même liste `SharedPaymentProviders` et le même `SebPayForm`. Le contenu et les contrôleurs de validation s’adaptent au produit ; création, disponibilité et vérification utilisent les routes communes décrites dans [PAYMENTS.md](PAYMENTS.md).

Le pays et le numéro WhatsApp sont côte à côte sur les deux layouts. L’indicatif figure dans le sélecteur de pays, sans répétition dans le champ du numéro. La commande utilise le numéro international construit avec le pays sélectionné. La détection réutilise le même `/api/location` que les cartes, alimenté par `request.cf.country` dans le Worker Cloudflare après consentement ; une saisie manuelle du pays ou du téléphone reste prioritaire.

Le tutoriel, les sons d’interaction, le reçu PDF et les tarifs proviennent d’UpCoin, adaptés au thème et aux composants DRAVA. Le téléphone et WhatsApp officiels de DRAVA sont définis une seule fois dans `src/lib/drava-contact.ts` ; le pied de page, le reçu carte et les contacts/PDF TikTok reprennent cette même configuration. Les boutons « Effets sonores » et « Assistance et support » ont été retirés de l’en-tête du catalogue sur les deux layouts à la demande de l’utilisateur. L’historique conserve au maximum 50 résumés publics ; il exclut les comptes, coordonnées, mots de passe, OTP et jetons. Ouvrir un résumé local n’effectue pas une nouvelle vérification de paiement. Le reçu de paiement est disponible uniquement dans un résultat vérifié par le serveur. Les mots de passe demandés par le parcours restent en mémoire côté navigateur ; le traitement serveur est décrit dans [TIKTOK_BACKEND.md](TIKTOK_BACKEND.md).

`TikTokSuccess` partage la page de succès entre le retour LeekPay et le résultat SebPay intégré. Elle reprend le récapitulatif UpCoin : confirmation, instructions de livraison, contacts WhatsApp, compte et référence de transaction, détails de commande, reçu PDF, impression et retour à la boutique. Son CSS conserve la grille desktop et une colonne mobile, les deux thèmes et la réduction des animations. L’en-tête reste celui de DRAVA ; le logo supplémentaire est réservé à l’impression. Les boutons supprimés du catalogue restent absents.

L’envoi EmailJS est réalisé par le Worker après confirmation du paiement. La page affiche le reçu dès `paid` et `verified`, puis suit séparément la transmission pendant cinq minutes maximum. Une transmission interrompue propose un réessai sur la même commande, sans recréer de paiement. Les détails déjà vérifiés restent affichés si leur stockage devient temporairement indisponible, uniquement pour la même commande. Le compte et la référence reçus restent en mémoire et peuvent figurer dans le PDF demandé ; ils sont exclus de l’historique local. La configuration et les limites de reprise EmailJS sont décrites dans `TIKTOK_BACKEND.md`.

Tous les services utilisent `/api/providers`, `/api/checkout` et `/api/orders/status`. Les anciennes routes `/api/tiktok/*` restent des alias du même moteur. LeekPay et SebPay ont chacun un seul adaptateur serveur ; leur disponibilité dépend uniquement de leurs identifiants de paiement, sans filtrage par service. SoleasPay reste visible mais indisponible : la source ne fournit pas de confirmation authentifiée compatible avec les règles de DRAVA. La création TikTok vérifie séparément le chiffrement et EmailJS avant tout appel au prestataire ; une configuration manquante produit une erreur de traitement du service, sans désactiver LeekPay pour les cartes. La recharge des pièces reste un traitement du marchand comme dans UpCoin, distinct de la confirmation du paiement. Aucun service TikTok de livraison automatique n’est fourni par la source.

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
npm run test:tiktok
npm run test:pwa
```

Si le changement touche les règles de paiement, la sécurité, le déploiement ou le worker, exécuter également les contrôles correspondants du dépôt. Vérifier les liens et ressources avec un `NEXT_PUBLIC_BASE_PATH` non vide lorsque les chemins changent. Une validation sur navigateur émulé doit être complétée sur iOS/Android pour confirmer les comportements propres au système ; préciser les appareils réellement testés.

### PWA et chargement des commandes

Les composants `PwaInstallPrompt` et `PwaUpdateNotice` vivent dans les mêmes providers de langue et de thème que l’application. Leur disponibilité dépend de la page, des dialogues, de la fiche mobile, du focus et du marqueur `data-drava-checkout-active` de `Home`. Ce marqueur reste actif de la sélection jusqu’à la fermeture, y compris pendant le chargement différé du module et les résultats intégrés. Conserver cette protection lors de l’ajout d’un service. Le chargement des modules ne déplace pas les règles de consentement ou de paiement dans les catalogues.

L’invite reprend le rappel de deux heures d’UpCoin et respecte les deux layouts. Les mises à jour nécessitent une action explicite, sont coordonnées avec les autres onglets et ne rechargent pas une commande. Les ressources mises en cache sont publiques, bornées et vérifiées contre les empreintes de la construction. Les requêtes et réponses privées, métadonnées clients, navigations et résultats de paiement restent exclus. Voir [PWA.md](PWA.md) pour la construction, l’aperçu et les limites de validation.

### Validation du paiement partagé — 5 septembre 2026

- Edge automatisé : cartes et TikTok avec SebPay, chacune aux largeurs 320, 390, 767, 768 et 1440 px, puis 844 × 390 px en tactile et avec souris, en français/anglais et clair/sombre (28 parcours par service). Aucune erreur JavaScript ni débordement horizontal. Les deux interruptions de la première passe cartes dues à des modifications à chaud ont été rejouées après stabilisation des sources.
- Redirections simulées LeekPay/SoleasPay : huit parcours par service. SoleasPay est activé uniquement dans ces mocks de contrat frontal ; le serveur réel continue de le déclarer indisponible. Formulaire SebPay : pays, opérateur, devise, devis, OTP et reprises réseau vérifiés. Aucun paiement ni courriel réel.
- Cartes : reçu SebPay intégré, lien opérateur conservé en mémoire, impression sans catalogue derrière la modale, retour et fermeture après création sans retour au formulaire de collecte. Quatre scénarios complémentaires avec animations actives couvrent erreurs/réessais, rotation, clavier/focus, Escape, verrou pendant création et retour système.
- Contrôles réussis : lint/TypeScript, 84 tests du paiement/catalogue, 32 tests TikTok, 11 tests de thème, six tests PWA et 70 tests Worker, compilation/types et bundle Worker. Scanner source/export et auto-tests historiques, plus 58 mutations de la nouvelle architecture et six contrôles AST de devise. Audits de dépendances sans vulnérabilité signalée.
- Export vérifié à la racine et avec `/DRAVACARD` ; les 186 références locales des six pages HTML de l’export préfixé résolvent vers des ressources existantes. Export racine rétabli.
- Le Worker existant a été mis à jour ; les routes communes et les anciens alias répondent, et LeekPay est déclaré disponible globalement. Contrôle navigateur local à 390 px avec les vraies réponses GET : LeekPay sélectionnable dans les cartes et TikTok, disparition de l’erreur de prestataires, aucune requête de création ni erreur JavaScript. Le traitement TikTok nécessite encore ses secrets AES/EmailJS. Aucun site GitHub Pages n’a été publié pendant cette modification.
- Limites : émulation Edge uniquement, sans appareil physique iOS/Android ni clavier logiciel réel. Les transactions, devis et notifications des parcours complets sont simulés ; les contrôles du Worker en ligne sont en lecture seule.

### Validation des onglets — 5 septembre 2026

- Navigateur local, français et anglais : deux sections, quatre cartes conservées, aucune barre de défilement horizontale aux largeurs CSS mesurées de 320, 390, 766, 768 et 1440 px, ainsi qu’en 844 × 390 px avec une souris.
- Vérifiés : lien direct `#tiktok` après rechargement, flèches clavier et focus, retour fiche → cartes → TikTok, commande notes → coordonnées fictives → prestataires sans paiement, redimensionnement avec commande ouverte, retour système vers les coordonnées et fermeture avec restauration du focus.
- Limites : le zoom du navigateur de contrôle ne permet pas de mesurer exactement 767 px (766 et 768 encadrent le seuil). Aucun appareil iOS/Android réel, clavier logiciel, mode tactile `pointer: coarse` ni réglage système de réduction des animations n’a été émulé ; ces vérifications restent à effectuer. Les comportements de réduction des animations et d’inertie sont conservés dans le code.

### Validation des thèmes — 5 septembre 2026

- Edge local : catalogue et TikTok dans les deux thèmes, en français et anglais, aux largeurs CSS 320, 390, 766, 768, 1440 px et en paysage 844 × 390 px avec souris (48 combinaisons). Un seul sélecteur visible, sans débordement horizontal. Reçu de simulation contrôlé aux mêmes dimensions et dans les deux langues (24 combinaisons) ; pages d’échec et 404 contrôlées en clair/sombre à 320 et 1440 px.
- Parcours vérifié sans paiement : fiche, consentement, validation des coordonnées fictives et prestataire ; conservation du formulaire lors d’un changement de thème depuis un autre onglet. Choix sombre conservé après navigation, et option Système conforme à la préférence réellement exposée par le navigateur.
- Contrôles réussis : lint/types, 63 tests du parcours et du catalogue, 11 tests de thème, 6 tests PWA, auto-tests du scanner de sécurité et analyse de l’export. Compilation statique vérifiée à la racine et avec `/DRAVACARD`, puis export racine rétabli.
- Limites : même réserve sur 767 px exact, iOS/Android, clavier logiciel, paysage tactile et réduction des animations que ci-dessus. Les changements de préférence système et les restrictions de stockage sont testés par mocks ; l’impression claire est contrôlée par tests de rendu/CSS, sans impression physique ni aperçu système. Aucun paiement réel ni déploiement effectué.

### Validation TikTok — 5 septembre 2026

- Edge automatisé : 320, 390, 767, 768 et 1440 px, et 844 × 390 px avec souris puis avec émulation tactile (`pointer: coarse`). Français et anglais, thèmes clair et sombre : 28 combinaisons catalogue/commande, puis 84 combinaisons de résultats en attente, échoués et confirmés par serveur simulé. Aucune erreur JavaScript ni débordement horizontal. Le contrôle à 767 px et le paysage tactile sont cette fois réellement émulés.
- Vérifiés : six packs, seuil personnalisé de 70 pièces, prix de 1 000 pièces, consentement, compte/WhatsApp/e-mail, choix des prestataires, formulaire SebPay, restauration du focus. Parcours supplémentaire avec animations normales : clavier Home/End, commande conservée pendant le passage desktop → mobile, retour système vers les coordonnées, OTP/USSD SebPay et soumission unique interceptée. Aucun secret, OTP, compte ou contact n’est conservé dans l’historique ou le stockage navigateur. Les fragments et paramètres de retour sont retirés ; une URL de succès arbitraire ne lance pas de vérification ni de reçu.
- Reçu PDF français téléchargé depuis le navigateur avec données fictives, rendu en PNG et contrôlé visuellement : A4, référence longue lisible, accents, logo original sans déformation, 770 pièces dont 70 bonus, montant et assistance. Le catalogue de cartes et son parcours ont également été contrôlés dans les 28 combinaisons de dimensions/langues/thèmes.
- Contrôles réussis : lint/TypeScript, compilation et ressources à la racine et sous `/DRAVACARD` (export racine rétabli), 64 tests de paiement/catalogue existants, 24 tests TikTok, 11 tests de thème, 6 tests PWA, 50 tests Worker dont workerd, génération de types et compilation Worker à blanc. Audit npm sans vulnérabilité signalée. Les tests réseau utilisent uniquement des réponses simulées.
- Reprises réseau et assistance : erreurs 503 des prestataires, pays SebPay et devis, réessai, coupure/rétablissement réseau, FAQ et choix des contacts WhatsApp contrôlés en français/anglais à 320 px sombre et 1440 px clair. Auto-tests du scanner et analyse de l’export réussis. Le module optionnel d’aperçu jsPDF est reconnu par l’empreinte exacte du fichier inspecté ; les autres iframes restent soumis aux contrôles stricts.
- Limites : aucun appareil iOS/Android réel, clavier logiciel réel, zoom de navigateur manuel ni impression physique. La réduction des animations a été émulée ; les zones sûres/clavier reposent sur les règles CSS et `visualViewport`, à compléter sur appareil. Aucun paiement réel, courriel réel ou déploiement. Configuration des services et limite SoleasPay : voir [TIKTOK_BACKEND.md](TIKTOK_BACKEND.md).

### Modales communes et compacité mobile — 5 septembre 2026

- Logo mobile original réduit de 120 × 56 à 60 × 28 px, en-tête de 64 à 52 px. Packs TikTok compacts selon UpCoin : environ 156 px de haut à 390 px contre 262 auparavant, environ 150 px à 320 px. Présentation desktop des packs conservée.
- Cartes et pièces partagent `CheckoutShell`, `CheckoutPanel`, les champs et actions de `checkout-content.css` ainsi que `CheckoutProviderOption`. Seuls les renseignements et les étapes propres au produit changent. Les panneaux sortants sont inertes et chaque parcours restaure le défilement de ses étapes au retour.
- Edge automatisé : 28 combinaisons par catalogue/parcours (320, 390, 767, 768, 1440 px, 844 × 390 tactile et souris ; français/anglais, clair/sombre). Aucun débordement ni erreur JavaScript. Captures comparées aux largeurs 320, 390 et 1440 px : mêmes cadres, champs de 48 px et actions mobiles de 52 px. Les quatre libellés SebPay restent lisibles à 320 px.
- Animations normales et réduites : retour système, redimensionnement avec saisie conservée, restauration du focus entre layouts et du défilement des notes, de la fiche et du catalogue vérifiés. Les étapes TikTok, OTP/USSD et résultats utilisent des réponses serveur simulées ; aucune transaction réelle.
- Compilation, lint/TypeScript, tests paiement (69), TikTok (24), thème (11), PWA (6), auto-tests du scanner et analyses de sécurité réussis. Aucun appareil iOS/Android, clavier logiciel, zoom manuel ni impression physique testé ; aucun déploiement.

### Packs conformes à la référence visuelle — 5 septembre 2026

- Disposition en trois rangées : icône ronde/marque/quantité, prix et bonus côte à côte, puis action pleine bleue. Badges internes et palette DRAVA ; deux colonnes mobiles, grille desktop conservée. Le pourcentage redondant cède la place au nombre exact de pièces offertes, comme sur la référence fournie.
- Packs de 148 px sur mobile et 216 px sur grand desktop. Toute la carte reste un bouton accessible dépassant 44 px ; la zone d’action dessinée à l’intérieur mesure 34 px sur mobile et 44 px sur desktop. À 320 px, le bonus peut occuper deux lignes à côté du prix.
- 28 combinaisons de dimensions/langues/thèmes vérifiées, avec 24 ouvertures couvrant les six packs en français/anglais à 320 et 1440 px : aucun débordement, chevauchement, texte tronqué ni erreur JavaScript ; sélection et restauration du focus correctes. Lint, compilation, 69 tests paiement, 24 TikTok, 11 thème et 6 PWA réussis. Validation Edge émulée uniquement ; aucun appareil physique ni paiement réel.

### Succès TikTok et transmission EmailJS — 5 septembre 2026

- Page de résultat : 84 cas en attente, échoués et confirmés par réponses serveur simulées, couvrant les sept dimensions, les deux langues et les deux thèmes. Aucun débordement horizontal ; les états non confirmés ne proposent aucun reçu. Référence et compte longs contrôlés, avec repli pour les anciennes commandes sans ces renseignements.
- Succès SebPay intégré : 28 combinaisons des sept dimensions, langues et thèmes, plus deux contrôles de transmission en attente et réessai français/anglais. Aucun débordement ni erreur JavaScript ; les comptes e-mail conservent leur libellé. Le titre reçoit le focus au premier succès et reste visible à 320, 844 tactile et 1440 px ; les mises à jour de notification ne déplacent pas le focus choisi ensuite.
- Parcours SebPay simulé avec OTP : une seule création, validation puis téléchargement PDF, conservation des saisies au redimensionnement et au retour système, suppression du jeton de l’URL et absence des renseignements privés dans le stockage navigateur. Contacts WhatsApp, retour boutique et impression claire depuis le thème sombre contrôlés sur page et modale.
- Reçus PDF français/anglais rendus sur une page A4, y compris compte de 254 caractères, référence de 120 caractères et ancien dossier incomplet. Logo original, accents et références lisibles, sans mot de passe, coordonnées de contact ni jeton dans le fichier.
- 32 tests TikTok couvrent notamment la confirmation avant transmission, les pannes, l’expiration du suivi, le réessai sur le même jeton et la conservation du reçu. Les 58 tests Worker, dont workerd, vérifient le chiffrement séparé, l’expiration, les champs EmailJS, la clé privée facultative et la reprise du nettoyage sans nouvel envoi séquentiel. Les 69 tests paiement, 11 thème et 6 PWA passent également ; lint, compilation, types Worker, compilation Worker à blanc et contrôles de sécurité réussis.
- Limites : navigateur Edge émulé uniquement, sans appareil iOS/Android, clavier logiciel ni impression physique. Aucun paiement réel, courriel réel ou déploiement ; le Worker distant n’a pas encore la configuration EmailJS/TikTok nécessaire. Les limites de notification concurrente et d’envoi sans retour client sont détaillées dans `TIKTOK_BACKEND.md`.

### Validation du contact DRAVA — 5 septembre 2026

Le téléphone et WhatsApp officiels sont +237 692 426 620. Les anciens numéros et le lien de groupe WhatsApp ont été retirés des pages et des reçus. Edge émulé : 56 contrôles sur les sept dimensions imposées, FR/EN, clair/sombre ; un contact TikTok unique, liens corrects, sans débordement. Quatre PDF générés contiennent une seule occurrence du contact officiel. Lint, build, 85 tests paiement, 32 tests TikTok, 11 tests thème, six tests PWA et scanner source/export réussis. Aucun lien externe ouvert, appel téléphonique, message ou paiement réalisé. Aucun appareil physique iOS/Android testé.
