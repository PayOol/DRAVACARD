# PWA Drava

Le manifeste et les métadonnées d’installation utilisent **Drava**. Les icônes 192/512 px, l’icône Apple 180 px et l’icône adaptative Android conservent le logo original. Aucun verrou de rotation ni blocage du zoom n’est ajouté.

## Référence UpCoin

Référence locale : `D:/Upcoin/Code source/UpCoin/app/components/pwa/PwaInstallPrompt.tsx`, son script de capture dans le layout, `PwaServiceWorker.tsx` et `scripts/generate-sw.js`.

L’invite reprend les comportements d’UpCoin : première proposition après vérification de l’installation, « Plus tard » avec rappel après deux heures, attente de l’événement natif pendant au maximum 1,5 seconde, disparition après acceptation/installation et instructions manuelles sur iPhone/iPad. Le libellé, le logo et les couleurs sont ceux de Drava. Le français et l’anglais suivent le choix partagé de la plateforme. Le paragraphe « Drava s’ouvrira depuis votre écran d’accueil ou votre bureau » a été retiré dans les deux langues.

La capture de `beforeinstallprompt` et `appinstalled` intervient avant l’hydratation. L’événement d’installation reste en mémoire, avec une seule utilisation possible. Le stockage contient seulement une date de rappel et un marqueur public `drava-pwa-installed:<id>` par identité d’application ; aucun identifiant client ni renseignement personnel n’y est ajouté. Son indisponibilité ne bloque pas l’interface. L’absence de l’événement natif affiche une aide utilisable. L’installation reste une action explicite de l’utilisateur.

Avant toute ouverture, le mode application (`standalone`, `minimal-ui`, `window-controls-overlay` ou `navigator.standalone`), un marqueur existant et `navigator.getInstalledRelatedApps()` sont pris en compte. La recherche compare uniquement la PWA Drava au manifeste et à l’identité attendus ; une autre application ne masque pas l’invite. La vérification auprès du navigateur est bornée à 1,5 seconde, sans requête vers un service externe. Un signal d’installation ferme l’invite, invalide l’ancien événement natif et persiste après rechargement ; les onglets du même stockage se synchronisent. Un retour tardif ne remplace pas un événement plus récent. Une API absente, vide ou en erreur n’efface jamais une installation connue. Un nouvel événement natif `beforeinstallprompt` peut lever le marqueur après désinstallation.

La détection depuis un onglet est disponible sur les versions compatibles de Chrome Android et Chrome/Edge desktop, grâce à l’auto-référence `webapp` du manifeste. Safari/iOS ne fournit pas cette API : le mode application est reconnu lorsqu’elle est ouverte, mais Safari ne peut pas garantir la détection d’une installation existante depuis un onglet. Le stockage de l’application iOS est distinct de celui de Safari. Les instructions manuelles restent disponibles ; l’absence d’événement natif n’est pas interprétée comme une preuve d’installation.

Drava reporte l’invite pendant une fiche mobile, une commande, un dialogue ou la saisie dans un champ. Elle reste absente des pages de résultat. Le focus, le défilement, les zones sûres, les petites hauteurs et la réduction des animations sont pris en compte.

## Chargement et connexion

Les deux catalogues restent rendus côté serveur et partagent leurs produits. Le code de commande est chargé à la sélection du produit ; l’attente et un éventuel échec réseau permettent de réessayer ou d’annuler. Le PDF reste chargé uniquement lors de son téléchargement.

Le service worker ne transforme pas un retour de paiement en preuve de paiement. Les commandes, API, réponses privées, coordonnées, mots de passe, OTP, jetons, navigations de paiement et requêtes avec paramètres sont exclus du cache. Il n’y a ni file de paiements hors connexion, ni synchronisation de données clients en arrière-plan.

Un écran hors connexion public et léger permet de comprendre la coupure et de réessayer. Il ne présente ni reçu ni confirmation de commande. Le paiement et sa vérification nécessitent toujours le réseau.

## Construction et mise à jour

`npm run build` produit l’export Next.js, puis `scripts/generate-pwa.mjs` génère le manifeste et le service worker de cet export. La version dépend du contenu construit, y compris du manifeste publié. Les chemins du manifeste, de la capture, de l’enregistrement, des icônes et du worker suivent `NEXT_PUBLIC_BASE_PATH`. Le générateur fixe l’ID au chemin de l’application (`/` en production), et l’auto-référence utilise l’ID absolu construit avec `NEXT_PUBLIC_SITE_URL` (défaut `https://drava.click`). L’identité de l’application déjà publiée à la racine reste inchangée. Pour vérifier l’API native sur un aperçu local, construire avec son origine exacte, par exemple `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001` ; rétablir l’origine de production avant publication.

L’enregistrement intervient après le chargement de la page. Le cache et les mises à jour concernent l’export de production ; le serveur `npm run dev` conserve l’invite pour vérifier son interface, sans installer un cache de bundles de développement.

Lancer `npm run build` puis `npm run preview:pwa` pour tester la vraie PWA sur `http://127.0.0.1:3001/`, séparément du serveur de développement. `PWA_PREVIEW_PORT` permet de choisir un autre port ; reprendre le même `NEXT_PUBLIC_BASE_PATH` que pendant la construction. Cet aperçu reste lié à l’ordinateur local.

Les mises à jour sont automatiques et silencieuses : aucun bandeau ni bouton de confirmation n’est affiché. L’installation initiale de l’application reste une action explicite de l’utilisateur. Le navigateur recherche une version lors de l’enregistrement, puis toutes les dix minutes lorsque la page est visible. Le retour au premier plan, la restauration d’une page et le retour du réseau réévaluent la mise à jour ; un enregistrement initial échoué est retenté et une installation déjà en cours est observée.

Le téléchargement peut se faire pendant la consultation, mais l’activation attend une période calme de trois secondes et l’accord technique de tous les onglets du même périmètre. Chaque page doit répondre qu’elle est prête et qu’elle sait se recharger automatiquement. Une commande, un dialogue, un champ actif ou modifié, une composition clavier, une fiche `#card:…`, une URL privée ou comportant des paramètres bloque cette transition. Seuls l’accueil public et son onglet `#tiktok` sont éligibles. Un onglet utilisant un ancien script sans ce protocole bloque l’activation automatique jusqu’à sa navigation ou sa réouverture.

La première installation du service worker ne recharge pas la page. Lors d’un changement de contrôleur ultérieur, chaque onglet concerné conserve en mémoire son besoin de rechargement. Si une commande ou une saisie commence après son accord, le document reste affiché jusqu’à ce qu’il puisse être rechargé sans perdre cette activité. Le mécanisme ne consomme pas les interactions de l’utilisateur et reprend après disparition du blocage.

Les caches publics portent un état de cycle de vie `waiting`, `active` ou `previous`, stocké dans un en-tête local du document hors connexion. Si une version B en attente est remplacée par C, les ressources de la version A encore active restent disponibles ; B ne devient pas à tort la version de secours. Le nettoyage d’activation conserve la version active et la précédente. Des caches en cours d’installation ou en attente peuvent coexister transitoirement.

Ces contrôles s’exécutent lorsque le navigateur autorise la page à fonctionner. Une application fermée ou un onglet suspendu ne peut pas garantir une recherche, une activation ou un rechargement immédiat ; la reprise dépend du navigateur et de la réouverture.

Les tests PWA font partie de la vérification CI avant publication. Pour un aperçu local complet de l’installation et du mode hors connexion, servir `out/` via HTTP sur localhost ; en ligne, utiliser HTTPS. Publier l’export complet d’une même construction, y compris `sw.js`, `offline.html` et les chunks. Garder `sw.js`, le manifeste et les pages revalidables ; les fichiers Next nommés par empreinte peuvent être servis avec un cache HTTP immutable. Les capacités de cache HTTP dépendent de l’hébergeur ; le code ne prétend pas imposer des en-têtes sur GitHub Pages.

## Validation des mises à jour silencieuses

La version racine `edf27494e6a394d6de36c357` a passé 58 tests PWA, 88 tests paiement/catalogue, 32 tests TikTok et 11 tests de thème, soit 189 tests. Le lint et la compilation de production ont réussi. Les auto-tests du scanner ainsi que les analyses source (155 fichiers) et export (72 fichiers) ont réussi ; l’audit des dépendances ne signale aucune vulnérabilité. Les deux reprises d’enregistrement — installation déjà en cours et premier échec suivi d’un retour réseau — sont incluses dans les corrections validées. L’ancien export local contenait sept fichiers générés remplis d’octets nuls ; une reconstruction sans réutiliser l’ancien cache a rétabli les fichiers. Les 71 ressources du manifeste final ont été comparées à leur empreinte SHA-256, avec contrôle de syntaxe des scripts.

Edge automatisé a validé 42 contrôles sur cet export : 28 variantes aux sept dimensions imposées, en français/anglais et clair/sombre, puis 14 scénarios avec de vrais service workers locaux, dans un navigateur ordinaire et avec une installation mémorisée. Aucun bandeau n’est monté, même brièvement. Les deux onglets au repos se rechargent automatiquement ; une commande distante, une saisie non vide après perte du focus et chacune des trois pages de paiement reportent l’activation. La mise à jour reprend après disparition du blocage ou retour du réseau. Aucune erreur JavaScript n’a été relevée.

Preuves : `logs/pwa-auto-update-report.json` et captures `logs/pwa-auto-layout-*`. La découverte des nouvelles versions est accélérée par `checkForUpdate`, sans appel à `applyUpdate` : l’activation et le rechargement sont automatiques. Aucun appareil physique iOS/Android, installation système, paiement ou courriel réel n’a été utilisé. Le nouveau cycle navigateur a été testé à la racine ; les scopes imbriqués restent couverts par les tests automatisés. Les campagnes ci-dessous sont conservées comme historique.

## Historique des validations

Campagnes antérieures du 5 septembre 2026, réalisées avant le passage aux mises à jour silencieuses : manifeste/métadonnées/icônes, parcours d’installation UpCoin, rendu des deux catalogues, chargement des commandes et du PDF, ancien cycle de vie du service worker, confidentialité du cache, hors connexion, thèmes, accessibilité, scopes de déploiement et chaîne de construction.

| Constat initial | Modification |
| --- | --- |
| Nom d’installation limité aux cartes, sans l’invite UpCoin | Nom Drava et invite bilingue partagée |
| Code des deux commandes téléchargé dès l’accueil | Import du module sélectionné, réessai et annulation |
| Précache systématique des grandes icônes | Cache à la demande ; seuls le socle public et les fichiers de l’accueil sont précachés |
| Cache runtime sans borne explicite et recherche globale | Liste exacte des fichiers construits, SHA-256, limites de taille et caches séparés par déploiement/version |
| `skipWaiting()` systématique | Coordination entre les onglets et protection des commandes ouvertes |
| Aucun écran hors connexion | Document public léger, avec logo et thème, sans commande ni reçu |

Le cache autorise au plus 128 fichiers, 1 MiB par fichier et 8 MiB par version. Le précache est limité à 2 MiB. Les octets, le type de contenu et les clés stockées sont contrôlés ; les en-têtes et référents arbitraires de la requête/réponse ne sont pas persistés. Les marqueurs de cycle de vie décrits plus haut proviennent exclusivement du worker. Le script de compatibilité `nomodule` et les grands PNG ne sont pas téléchargés systématiquement.

### Mesures locales

Edge 152, trois contextes neufs par largeur (390 et 1440 px), premier accès puis revisite, CPU simulé ×4, latence 100 ms, débit descendant 200 000 octets/s. Le serveur de mesure utilise Brotli niveau 4. Les octets comptent aussi les requêtes du service worker ; il ne s’agit pas d’une mesure du CDN public.

Les mesures de cette campagne antérieure utilisent la copie immuable `ab7802b72b23afea89f89cd5`. Après vérification du sous-chemin `/DRAVACARD`, l’export racine avait été reconstruit (`bd925f350b1d11377ddd600b`) et son aperçu avait confirmé le manifeste Drava, l’invite visible et le worker actif sans erreur JavaScript. Ces chiffres ne décrivent pas l’export actuel après retrait de l’interface de mise à jour.

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Corps transférés au premier accès, SW compris | 469 663 octets | 257 348 octets (−45,2 %) |
| JavaScript de l’accueil décodé | 751 036 octets | 676 837 octets (−9,9 %) |
| CSS de l’accueil décodé | 125 644 octets | 84 466 octets (−32,8 %) |
| Requêtes serveur au premier accès | 36 | 30 |

Les ressources immuables déjà chargées ne sont pas retéléchargées à l’installation du worker. Le chargement initial est allégé ; ces échantillons ne démontrent pas un gain de LCP. Les mesures de durée sont sensibles à la machine locale et aux compilations concurrentes. Aucun score Lighthouse ou INP terrain n’est revendiqué. Le détail et les données brutes sont dans `logs/pwa-perf-final-report.md` et `logs/pwa-perf-*.json`.

### Contrôles antérieurs réussis

La correction de détection ajoute neuf tests aux suites PWA (44 tests au total). Elle a aussi été vérifiée dans 48 scénarios navigateur, dont 28 variantes de dimensions/langues/thèmes : installation déjà mémorisée sans affichage furtif, mode application, réponses positives/négatives/lentes de l’API, installation avant rechargement et entre onglets, réinstallation proposée par un nouvel événement natif et réponse tardive après installation. La phrase retirée reste absente dans toutes les variantes. Preuves : `logs/pwa-installed-qa-report.json` et captures `logs/pwa-installed-*`. Les événements d’installation et iOS sont simulés, sans installation système réelle.

- 35 tests PWA/install, 88 tests paiement/catalogue, 32 tests TikTok et 11 tests thème ; lint/TypeScript, auto-tests du scanner et analyse source/export.
- 83 contrôles d’interface installation/mise à jour : sept dimensions imposées, FR/EN, clair/sombre, iOS simulé, application déjà installée, événement natif à usage unique, rappel/rechargement, stockage refusé, focus, rotation, champ actif, fiches et résultats.
- 56 scénarios de chargement des commandes cartes/TikTok : retard réseau, échec/réessai, annulation, retour navigateur, rotation et restauration du focus.
- 14 vues de l’écran hors connexion et deux scénarios de préférence système : les deux langues restent lisibles, le thème choisi est préservé, le logo et les actions sont accessibles.
- Huit scénarios avec le vrai service worker sur l’export racine, puis les mêmes huit sous `/DRAVACARD` : installation sans rechargement, cache public, exclusions sensibles, rechargement hors ligne `/#tiktok`, refus de servir un résultat de paiement hors connexion, reprise réseau, blocage de mise à jour si une commande est ouverte ailleurs, puis mise à jour du seul onglet demandeur dans l’ancien parcours sur confirmation. Le nouveau cycle visant tous les onglets compatibles est validé dans la section dédiée plus haut.

Preuves locales : `logs/pwa-ui-report.json`, `logs/pwa-ui-offline-report.json`, `logs/checkout-lazy-results.json`, `logs/pwa-browser-lifecycle.json` et `logs/pwa-browser-lifecycle-basepath.json`. Les mesures antérieures à la suppression du précache `nomodule` sont conservées séparément.

Limites : Edge automatisé uniquement, sans appareil iOS/Android physique ni installation système réelle. Les événements natifs d’installation sont simulés ; les tests ne constituent pas des paiements. Aucun paiement, courriel, message ou déploiement n’a été effectué pendant ces tests. L’état de publication et la configuration EmailJS sont suivis dans [TIKTOK_BACKEND.md](TIKTOK_BACKEND.md).

## Sources techniques

- [web.dev — invite d’installation](https://web.dev/learn/pwa/installation-prompt) : capture, disponibilité et geste de l’utilisateur.
- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) : contexte sécurisé, cycle de vie et contrôle du cache.
- [MDN — skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting) : effet de l’activation anticipée sur les clients.
- [Apple — transformer un site en app sur iPhone](https://support.apple.com/en-ie/guide/iphone/iphea86e5236/ios) : parcours Partager, écran d’accueil et ajout.
- [Chrome — détecter les applications liées installées](https://developer.chrome.com/docs/capabilities/get-installed-related-apps) : auto-référence et identité absolue pour la détection de la PWA.
- [WebKit — Safari 17.2](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/) : séparation du stockage du navigateur et de l’application ajoutée à l’écran d’accueil.

Ce travail PWA ne modifie pas les garde-fous de facturation TikTok ni la configuration EmailJS.
