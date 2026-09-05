# Publication sur GitHub Pages

GitHub Pages reste l'unique hébergement de l'interface DRAVACARD. Le paiement utilise séparément un Cloudflare Worker REST à l'adresse `https://drava-leekpay.sebpay-proxy.workers.dev`. Les configurations Netlify, Render, Docker, Nginx et VPS restent retirées.

> **Dépôt public et historique** — ce dépôt est public. Considérez toute ancienne valeur présente dans son historique comme exposée : révoquez-la chez le fournisseur, purgez les caches concernés et ne vous contentez jamais de la supprimer du dernier commit.

## Déployer le proxy Cloudflare Worker

Le Worker doit être disponible avant de publier une interface qui active le bouton LeekPay.

1. Ouvrez un terminal dans `worker/` et installez exactement le lockfile :

   ```bash
   npm ci
   ```

2. Créez l'espace KV de production si nécessaire :

   ```bash
   npx wrangler kv namespace create ORDERS
   ```

   Reportez l'identifiant renvoyé dans le binding `ORDERS` de la configuration Wrangler. Ne réutilisez pas un namespace de test pour la production.

3. Vérifiez que la configuration déclare les bindings `ORDERS`, `CREATE_LIMITER` et `STATUS_LIMITER`. Les rate limiters distribués réduisent les abus mais restent approximatifs ; ils ne remplacent ni la validation serveur ni la surveillance.

4. Enregistrez la clé serveur dans le gestionnaire chiffré de Cloudflare, sans la copier dans un fichier :

   ```bash
   npx wrangler secret put LEEKPAY_SECRET_KEY
   ```

   Saisissez la valeur uniquement dans l'invite Wrangler. N'utilisez jamais `wrangler.toml`, `.dev.vars`, `.env`, GitHub Actions ou une variable `NEXT_PUBLIC_*` pour cette valeur réelle.

5. Exécutez les contrôles du Worker puis déployez depuis ce dossier :

   ```bash
   npm test
   npm run check
   npm run build
   npm run deploy
   ```

6. Vérifiez les réponses CORS pour les origines prévues, les limites de requêtes et les journaux sans données sensibles. CORS n'authentifie pas l'appelant : les deux routes publiques doivent toujours valider méthode, taille et forme du corps.

Le proxy crée un checkout à partir d'un `productId`; le montant et `XOF` viennent exclusivement du catalogue Worker. La vérification de statut relit LeekPay avec l'authentification serveur et compare l'identifiant, le montant et la devise stockés dans `ORDERS`. En raison de la cohérence éventuelle de KV, une page de retour peut devoir réessayer brièvement une commande encore introuvable. Un paiement vérifié ne doit jamais déclencher automatiquement l'émission d'une carte.

## Paiement depuis le site local

Le site local utilise le même proxy Cloudflare que `drava.click` : aucune clé n'est nécessaire dans le navigateur ou sur le poste de développement. La variable JSON `LOCAL_ORIGINS` du Worker autorise explicitement `http://127.0.0.1:3000` et `http://localhost:3000`. Les autres ports, adresses du réseau local et domaines restent refusés. Pour désactiver cet accès, remplacez cette liste par `[]`, puis redéployez le Worker.

Gardez `ENVIRONMENT` à `production` sur le Worker publié : les contrôles d'IP, les limites de requêtes et le catalogue serveur restent actifs. L'environnement Wrangler `development` est réservé à l'exécution locale du Worker, pas à l'autorisation CORS du site local.

**Les paiements lancés depuis localhost utilisent les clés de production : ce n'est pas un bac à sable.** Les pages de retour restent sur `https://drava.click/payment-success/` et `https://drava.click/payment-failure/`, où la commande est vérifiée par le même proxy. Les tests automatisés du dépôt simulent tous les appels au fournisseur et ne créent aucun paiement réel.

## Première activation

1. Dans le dépôt GitHub, ouvrez **Settings → Pages**.
2. Dans **Build and deployment**, choisissez **Source: GitHub Actions**.
3. Ouvrez **Actions** et lancez manuellement **Verify and deploy GitHub Pages**, ou poussez un commit sur `master`.
4. Attendez la fin des tâches `build` et `deploy`.

Sans domaine personnalisé, le site est publié sur `https://payool.github.io/DRAVACARD/`. Le workflow lit l'URL et le chemin configurés via `actions/configure-pages`, puis les transmet au build Next.js.

## Domaine `drava.click`

1. Si possible, vérifiez d'abord `drava.click` dans les paramètres de domaine du compte GitHub afin de prévenir une prise de contrôle du domaine.
2. Dans **Settings → Pages → Custom domain**, saisissez `drava.click`, puis enregistrez **avant** de modifier le DNS.
3. Chez le fournisseur DNS, supprimez les enregistrements concurrents pour l'apex `@`, puis choisissez une seule des deux configurations suivantes :

   - un `ALIAS` ou `ANAME` pour `@` vers `payool.github.io` ;
   - ou les quatre enregistrements `A` officiels de GitHub Pages :

     ```text
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

   Un `CNAME` DNS standard ne doit pas être placé à l'apex. Utilisez-le seulement si le fournisseur implémente explicitement un aplatissement compatible `ALIAS`/`ANAME`.

4. Pour IPv6, ajoutez en complément les quatre enregistrements `AAAA` officiels :

   ```text
   2606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

5. Ajoutez le sous-domaine recommandé `www` avec un `CNAME` direct vers `payool.github.io` ; GitHub redirigera automatiquement entre `www.drava.click` et l'apex.
6. N'ajoutez aucun enregistrement DNS générique `*.drava.click` : les wildcards exposent le domaine à des risques de prise de contrôle.
7. Après propagation et génération du certificat, activez **Enforce HTTPS** dans les réglages Pages.
8. Relancez le workflow afin qu'il reconstruise les métadonnées et les assets avec `https://drava.click`.

Le domaine est enregistré dans la configuration Pages : aucun fichier `CNAME` n'est nécessaire dans cet export piloté par GitHub Actions.

Référence : [documentation officielle GitHub sur les domaines Pages](https://docs.github.com/fr/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Contrôles de publication

Avant tout déploiement, le workflow :

- installe exclusivement le `package-lock.json` ;
- audite les dépendances et recherche les secrets ou anciens parcours sensibles ;
- exécute le lint et la vérification TypeScript ;
- produit l'export statique avec le `basePath` Pages ;
- analyse le contenu final avant de téléverser l'artefact.

Le déploiement Pages n'embarque ni le code du Worker ni son secret. Si l'URL du Worker change, mettez à jour ensemble l'adaptateur frontal, la CSP et les garde-fous de sécurité avant tout déploiement.

Les pull requests vers `master` exécutent les mêmes contrôles sans déployer. Seuls un push ou un lancement manuel sur `master` peuvent publier.

## Limite des en-têtes de sécurité

GitHub Pages ne permet pas au dépôt de définir des en-têtes HTTP personnalisés. Le site fournit donc une CSP dans une balise `<meta http-equiv>` et une politique `referrer`, mais cette méthode ne peut pas remplacer tous les en-têtes de sécurité d'un serveur, notamment HSTS et `frame-ancestors`/`X-Frame-Options`.

Consultez [SECURITY.md](SECURITY.md) avant de réactiver une fonctionnalité financière. Révoquez les anciens identifiants Soleas avant la première publication assainie et purgez, si nécessaire, les anciens déploiements et caches des plateformes abandonnées.
