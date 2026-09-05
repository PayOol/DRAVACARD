# DRAVACARD

Catalogue de cartes virtuelles DRAVA. L'interface reste un export statique Next.js publié sur GitHub Pages à l'adresse `https://drava.click`. La création et la vérification des paiements passent par un proxy Cloudflare Worker distinct ; aucune clé LeekPay n'est envoyée au navigateur.

## Architecture

- GitHub Pages sert le catalogue et les pages techniques `/payment-success/` et `/payment-failure/`.
- Le navigateur envoie uniquement un `productId` au proxy `https://drava-leekpay.sebpay-proxy.workers.dev`.
- Le Worker sélectionne le prix dans son catalogue serveur, impose `XOF`, puis crée le checkout LeekPay avec son secret chiffré.
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
