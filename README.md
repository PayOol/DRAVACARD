# DRAVACARD

Catalogue de cartes virtuelles DRAVA. L'interface reste un export statique Next.js publié sur GitHub Pages à l'adresse `https://drava.click`. La création et la vérification des paiements passent par un proxy Cloudflare Worker distinct ; aucune clé LeekPay n'est envoyée au navigateur.

## Architecture

- GitHub Pages sert le catalogue et les pages techniques `/payment-success/` et `/payment-failure/`.
- Les onglets « Cartes virtuelles » et « Pièces TikTok » sont disponibles sur mobile et desktop. La nouvelle vue `/#tiktok` présente une page « Bientôt disponible », sans offre ni paiement TikTok pour le moment. L’onglet des cartes conserve tout le catalogue et son parcours de commande.
- Le sélecteur de thème dans l’en-tête propose « Système », « Clair » et « Sombre ». La préférence visuelle est partagée entre les pages et mémorisée localement ; elle ne contient aucune donnée de commande. Les formulaires et reçus s’adaptent, l’impression conserve un fond blanc.
- Une seule modale enchaîne les notes d'utilisation, les coordonnées (e-mail et WhatsApp), puis le choix du provider, avec transitions animées et respect de la réduction des animations.
- À l'ouverture de l'étape coordonnées, `GET /api/location` préremplit l'indicatif WhatsApp à partir du pays IP fourni par Cloudflare. La correspondance pays/indicatif utilise `libphonenumber-js` côté Worker uniquement. Cette estimation n'est pas garantie (VPN, proxy, réseau mobile) : le champ reste modifiable, une saisie déjà commencée n'est jamais remplacée et une indisponibilité n'empêche pas la saisie manuelle. Aucun appel GPS ni enregistrement du pays ou de l'IP dans les commandes ou les journaux applicatifs n'est ajouté.
- Au clic sur « Payer », le navigateur envoie `{ productId, customer: { email, whatsapp } }` au proxy `https://drava-leekpay.sebpay-proxy.workers.dev`. Les coordonnées restent uniquement en mémoire pendant le parcours et peuvent être corrigées avec « Précédent ».
- Le validateur partagé `src/lib/payment-customer.ts` vérifie les coordonnées côté navigateur et côté Worker. Le WhatsApp doit inclure `+` et l'indicatif international ; les espaces, parenthèses et tirets sont normalisés.
- L'adaptateur LeekPay transmet ces valeurs dans les champs REST documentés `customer_email` et `customer_phone`, et construit côté Worker `customer_name` au format `Client (email normalisé)`, par exemple `Client (client@example.com)`. Aucun champ nom supplémentaire n'est demandé dans le formulaire. Les futurs adaptateurs réutiliseront le contrat `PaymentCustomer` et mapperont les champs selon leur propre documentation. Aucun contact n'est ajouté aux URL, aux logs, à KV ou aux réponses du proxy.
- Le Worker sélectionne le prix dans son catalogue serveur, impose `XOF`, puis crée le checkout LeekPay avec son secret chiffré.
- Les domaines des liens de paiement ne sont pas limités à une liste : LeekPay choisit le prestataire (par exemple `app.zayono.com`) dans sa réponse API authentifiée. Le Worker et le navigateur acceptent ces liens HTTPS absolus, sans identifiants intégrés ni port non standard. Le navigateur ne contacte que le proxy pour créer la commande ; le Worker ne récupère jamais le contenu de ces liens. La vérification du montant, de la devise et du paiement reste effectuée auprès de LeekPay.
- Un identifiant de commande aléatoire est placé dans le fragment `#order=…`. Le fragment n'est pas envoyé automatiquement dans la requête HTTP ; la page de résultat le transmet explicitement au proxy pour vérifier la commande.
- Le proxy relit le statut chez LeekPay avec une requête serveur authentifiée et compare l'identifiant du checkout, le montant et la devise enregistrés avant de répondre `verified: true`.

Une confirmation de paiement ne déclenche jamais automatiquement l'émission ou la livraison d'une carte. Consultez [SECURITY.md](SECURITY.md).

## Prérequis

- Node.js 24 LTS, version 24.20.0 ou plus récente ;
- npm et les deux fichiers `package-lock.json` suivis ;
- un compte Cloudflare pour déployer le Worker et ses bindings ;
- une clé secrète LeekPay enregistrée uniquement avec Wrangler Secrets.

## Développement du site

```bash
npm ci
npm run security:check
npm run lint
npm run dev
```

Le serveur de développement écoute uniquement en local. Le fichier `.env.example` documente les réglages publics de l'export ; il ne doit contenir aucune clé de paiement.

Les fichiers générés par `npm run dev` sont isolés dans `.next-dev/`. Les builds de production utilisent `.next/` et produisent l'export dans `out/`. On peut donc lancer `npm run build` pendant que le serveur local tourne sans effacer ses fichiers et provoquer une erreur 500. Ne supprimez pas `.next-dev/` tant que le serveur de développement est actif.

### Simulation locale d’une commande validée

Avec `npm run dev`, ouvrez [la simulation de paiement réussi](http://127.0.0.1:3000/payment-success/#simulation). Elle affiche une commande fictive VISA BASIQUE de 5 000 Fcfa, clairement marquée « Simulation locale », sans contacter LeekPay ni le proxy et sans créer de commande ou de paiement.

Ce mode est limité au développement sur `localhost`, `127.0.0.1` ou `[::1]`. Il est désactivé dans l’export de production, même servi en local. Sans `#simulation`, la page conserve sa vérification habituelle du paiement auprès du serveur.

La page succès affiche le reçu et les étapes d’ouverture du compte Prismcard, puis de contact par Telegram (prioritaire) ou WhatsApp. Ces liens ne contiennent aucune donnée client et n’envoient aucun message automatiquement. Le bouton « Imprimer le reçu » ouvre l’impression du navigateur, avec une mise en page dédiée ; la mention de simulation reste présente à l’impression.

Le prix vient de la commande vérifiée. Sa date provient du champ `createdAt` déjà enregistré dans le Worker, affiché dans le fuseau `Africa/Douala`, et non de la date d’ouverture du reçu. Si un ancien déploiement du proxy ne transmet pas encore ce champ, la date est indiquée « Non disponible ». La simulation utilise une commande fictive de 5 000 FCFA datée du 05 septembre 2026.

## Développement du proxy

```bash
cd worker
npm ci
npm test
npm run check
npm run build
```

Les prix et identifiants de produits font autorité dans le Worker. Le navigateur ne peut pas choisir librement le montant ou la devise.

## Validation de l'export GitHub Pages

PowerShell :

```powershell
$env:NEXT_PUBLIC_BASE_PATH = '/DRAVACARD'
$env:NEXT_PUBLIC_SITE_URL = 'https://payool.github.io/DRAVACARD'
npm run build
npm run security:output
```

Le workflow récupère ces valeurs depuis GitHub Pages. Le même export fonctionne sur l'URL du projet et sur le domaine personnalisé.

## Publication

Déployez d'abord le Worker et vérifiez ses bindings, puis publiez le site avec GitHub Actions. Les instructions complètes figurent dans [DEPLOYMENT.md](DEPLOYMENT.md).
