# DRAVACARD

Catalogue statique de cartes virtuelles DRAVA, publié uniquement avec GitHub Pages.

URL publique : `https://drava.click`. L'export reste également compatible avec le chemin de projet `https://payool.github.io/DRAVACARD/`.

## État de sécurité

Le catalogue est l'unique page du site. Les deux boutons de paiement restent volontairement désactivés et aucun parcours de paiement, recharge, consultation de solde, retrait, newsletter ou revendeur n'est publié. Le projet ne doit collecter aucune donnée bancaire ou personnelle tant qu'un backend authentifié et audité n'est pas disponible.

Consultez [SECURITY.md](SECURITY.md) avant toute modification de ces parcours.

## Environnement

- Node.js 24 LTS, version 24.20.0 ou plus récente ;
- npm avec le fichier `package-lock.json` suivi ;
- aucun secret dans `.env*`, le navigateur ou une variable `NEXT_PUBLIC_*`.

## Développement

```bash
npm ci
npm run security:check
npm run lint
npm run dev
```

Le serveur de développement écoute uniquement en local par défaut.

## Validation de l'export GitHub Pages

PowerShell :

```powershell
$env:NEXT_PUBLIC_BASE_PATH = '/DRAVACARD'
$env:NEXT_PUBLIC_SITE_URL = 'https://payool.github.io/DRAVACARD'
npm run build
npm run security:output
```

Le workflow récupère automatiquement ces deux valeurs depuis la configuration GitHub Pages. Le même export fonctionne donc sur l'URL de projet et sur le domaine personnalisé, sans chemin codé en dur.

## Publication

Suivez [DEPLOYMENT.md](DEPLOYMENT.md). Tout push accepté sur `master` est contrôlé puis déployé par GitHub Actions.
