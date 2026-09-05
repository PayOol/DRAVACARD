# PWA Drava

Le manifeste et les métadonnées d’installation utilisent **Drava**. Les icônes 192/512 px, l’icône Apple 180 px et l’icône adaptative Android conservent le logo original. Aucun verrou de rotation ni blocage du zoom n’est ajouté.

## Référence UpCoin

Référence locale : `D:/Upcoin/Code source/UpCoin/app/components/pwa/PwaInstallPrompt.tsx`, son script de capture dans le layout, `PwaServiceWorker.tsx` et `scripts/generate-sw.js`.

L’invite reprend les comportements d’UpCoin : première proposition immédiate, « Plus tard » avec rappel après deux heures, attente de l’événement natif pendant au maximum 1,5 seconde, disparition après acceptation/installation et instructions manuelles sur iPhone/iPad. Le libellé, le logo et les couleurs sont ceux de Drava. Le français et l’anglais suivent le choix partagé de la plateforme.

La capture de `beforeinstallprompt` intervient avant l’hydratation. L’événement reste en mémoire, avec une seule utilisation possible. Le stockage de l’invite contient uniquement une date de rappel ; son indisponibilité ne bloque pas l’interface. L’absence de l’événement natif affiche une aide utilisable. L’installation reste une action explicite de l’utilisateur.

Drava reporte l’invite pendant une fiche mobile, une commande, un dialogue ou la saisie dans un champ. Elle reste absente des pages de résultat. Le focus, le défilement, les zones sûres, les petites hauteurs et la réduction des animations sont pris en compte.

## Chargement et connexion

Les deux catalogues restent rendus côté serveur et partagent leurs produits. Le code de commande est chargé à la sélection du produit ; l’attente et un éventuel échec réseau permettent de réessayer ou d’annuler. Le PDF reste chargé uniquement lors de son téléchargement.

Le service worker ne transforme pas un retour de paiement en preuve de paiement. Les commandes, API, réponses privées, coordonnées, mots de passe, OTP, jetons, navigations de paiement et requêtes avec paramètres sont exclus du cache. Il n’y a ni file de paiements hors connexion, ni synchronisation de données clients en arrière-plan.

Un écran hors connexion public et léger permet de comprendre la coupure et de réessayer. Il ne présente ni reçu ni confirmation de commande. Le paiement et sa vérification nécessitent toujours le réseau.

## Construction et mise à jour

`npm run build` produit l’export Next.js, puis `scripts/generate-pwa.mjs` génère le service worker de cet export. La version dépend du contenu construit. Les chemins du manifeste, de la capture, de l’enregistrement, des icônes et du worker suivent `NEXT_PUBLIC_BASE_PATH`.

L’enregistrement intervient après le chargement de la page. Le cache et les mises à jour concernent l’export de production ; le serveur `npm run dev` conserve l’invite pour vérifier son interface, sans installer un cache de bundles de développement.

Lancer `npm run build` puis `npm run preview:pwa` pour tester la vraie PWA sur `http://127.0.0.1:3001/`, séparément du serveur de développement. `PWA_PREVIEW_PORT` permet de choisir un autre port ; reprendre le même `NEXT_PUBLIC_BASE_PATH` que pendant la construction. Cet aperçu reste lié à l’ordinateur local.

Une nouvelle version propose une mise à jour explicite. Elle n’impose pas de rechargement pendant une commande et vérifie également les autres onglets. L’utilisateur conserve ses saisies s’il reporte l’action. L’ancien code d’UpCoin qui active/recharge automatiquement n’est pas repris.

Les tests PWA font partie de la vérification CI avant publication. Pour un aperçu local complet de l’installation et du mode hors connexion, servir `out/` via HTTP sur localhost ; en ligne, utiliser HTTPS. Publier l’export complet d’une même construction, y compris `sw.js`, `offline.html` et les chunks. Garder `sw.js`, le manifeste et les pages revalidables ; les fichiers Next nommés par empreinte peuvent être servis avec un cache HTTP immutable. Les capacités de cache HTTP dépendent de l’hébergeur ; le code ne prétend pas imposer des en-têtes sur GitHub Pages.

## Validation

Analyse et vérifications du 5 septembre 2026 : manifeste/métadonnées/icônes, parcours d’installation UpCoin, rendu des deux catalogues, chargement des commandes et du PDF, cycle de vie du service worker, confidentialité du cache, hors connexion, thèmes, accessibilité, scopes de déploiement et chaîne de construction.

| Constat initial | Modification |
| --- | --- |
| Nom d’installation limité aux cartes, sans l’invite UpCoin | Nom Drava et invite bilingue partagée |
| Code des deux commandes téléchargé dès l’accueil | Import du module sélectionné, réessai et annulation |
| Précache systématique des grandes icônes | Cache à la demande ; seuls le socle public et les fichiers de l’accueil sont précachés |
| Cache runtime sans borne explicite et recherche globale | Liste exacte des fichiers construits, SHA-256, limites de taille et caches séparés par déploiement/version |
| `skipWaiting()` systématique | Activation explicite coordonnée entre les onglets, sans perte de formulaire |
| Aucun écran hors connexion | Document public léger, avec logo et thème, sans commande ni reçu |

Le cache autorise au plus 128 fichiers, 1 MiB par fichier et 8 MiB par version ; au plus deux versions sont conservées. Le précache est limité à 2 MiB. Les octets, le type de contenu et les clés stockées sont contrôlés ; les en-têtes et référents arbitraires de la requête/réponse ne sont pas persistés. Le script de compatibilité `nomodule` et les grands PNG ne sont pas téléchargés systématiquement.

### Mesures locales

Edge 152, trois contextes neufs par largeur (390 et 1440 px), premier accès puis revisite, CPU simulé ×4, latence 100 ms, débit descendant 200 000 octets/s. Le serveur de mesure utilise Brotli niveau 4. Les octets comptent aussi les requêtes du service worker ; il ne s’agit pas d’une mesure du CDN public.

Les mesures finales utilisent la copie immuable `ab7802b72b23afea89f89cd5`. Après vérification du sous-chemin `/DRAVACARD`, l’export racine a été reconstruit (`bd925f350b1d11377ddd600b`) et son aperçu a confirmé le manifeste Drava, l’invite visible et le worker actif sans erreur JavaScript. Les sources d’interface sont identiques ; les empreintes dépendent de l’export construit.

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Corps transférés au premier accès, SW compris | 469 663 octets | 257 348 octets (−45,2 %) |
| JavaScript de l’accueil décodé | 751 036 octets | 676 837 octets (−9,9 %) |
| CSS de l’accueil décodé | 125 644 octets | 84 466 octets (−32,8 %) |
| Requêtes serveur au premier accès | 36 | 30 |

Les ressources immuables déjà chargées ne sont pas retéléchargées à l’installation du worker. Le chargement initial est allégé ; ces échantillons ne démontrent pas un gain de LCP. Les mesures de durée sont sensibles à la machine locale et aux compilations concurrentes. Aucun score Lighthouse ou INP terrain n’est revendiqué. Le détail et les données brutes sont dans `logs/pwa-perf-final-report.md` et `logs/pwa-perf-*.json`.

### Contrôles réussis

- 35 tests PWA/install, 88 tests paiement/catalogue, 32 tests TikTok et 11 tests thème ; lint/TypeScript, auto-tests du scanner et analyse source/export.
- 83 contrôles d’interface installation/mise à jour : sept dimensions imposées, FR/EN, clair/sombre, iOS simulé, application déjà installée, événement natif à usage unique, rappel/rechargement, stockage refusé, focus, rotation, champ actif, fiches et résultats.
- 56 scénarios de chargement des commandes cartes/TikTok : retard réseau, échec/réessai, annulation, retour navigateur, rotation et restauration du focus.
- 14 vues de l’écran hors connexion et deux scénarios de préférence système : les deux langues restent lisibles, le thème choisi est préservé, le logo et les actions sont accessibles.
- Huit scénarios avec le vrai service worker sur l’export racine, puis les mêmes huit sous `/DRAVACARD` : installation sans rechargement, cache public, exclusions sensibles, rechargement hors ligne `/#tiktok`, refus de servir un résultat de paiement hors connexion, reprise réseau, blocage de mise à jour si une commande est ouverte ailleurs, puis mise à jour du seul onglet demandeur.

Preuves locales : `logs/pwa-ui-report.json`, `logs/pwa-ui-offline-report.json`, `logs/checkout-lazy-results.json`, `logs/pwa-browser-lifecycle.json` et `logs/pwa-browser-lifecycle-basepath.json`. Les mesures antérieures à la suppression du précache `nomodule` sont conservées séparément.

Limites : Edge automatisé uniquement, sans appareil iOS/Android physique ni installation système réelle. Les événements natifs d’installation sont simulés ; les tests ne constituent pas des paiements. Aucun paiement, courriel, message ou déploiement n’a été effectué pendant ce travail. EmailJS demeure à configurer plus tard.

## Sources techniques

- [web.dev — invite d’installation](https://web.dev/learn/pwa/installation-prompt) : capture, disponibilité et geste de l’utilisateur.
- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) : contexte sécurisé, cycle de vie et contrôle du cache.
- [MDN — skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting) : effet de l’activation anticipée sur les clients.
- [Apple — transformer un site en app sur iPhone](https://support.apple.com/en-ie/guide/iphone/iphea86e5236/ios) : parcours Partager, écran d’accueil et ajout.

La configuration EmailJS demeure différée à la demande de l’utilisateur. Ce travail PWA ne l’active pas et ne modifie pas les garde-fous de facturation TikTok.
