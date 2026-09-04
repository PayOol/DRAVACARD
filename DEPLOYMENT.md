# Publication sur GitHub Pages

GitHub Pages est l'unique cible de publication de DRAVACARD. Les configurations Netlify, Render, Docker, Nginx et VPS ont été retirées.

> **Prérequis de forfait** — GitHub Pages n'est disponible depuis un dépôt privé qu'avec GitHub Pro, Team ou Enterprise. Avec GitHub Free, conservez ce dépôt privé et mettez le forfait à niveau, ou publiez depuis un dépôt public dont l'historique a d'abord été assaini. Ne rendez pas ce dépôt public tant que les anciens identifiants Soleas n'ont pas été révoqués et retirés de l'historique.

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

Les pull requests vers `master` exécutent les mêmes contrôles sans déployer. Seuls un push ou un lancement manuel sur `master` peuvent publier.

## Limite des en-têtes de sécurité

GitHub Pages ne permet pas au dépôt de définir des en-têtes HTTP personnalisés. Le site fournit donc une CSP dans une balise `<meta http-equiv>` et une politique `referrer`, mais cette méthode ne peut pas remplacer tous les en-têtes de sécurité d'un serveur, notamment HSTS et `frame-ancestors`/`X-Frame-Options`.

Consultez [SECURITY.md](SECURITY.md) avant de réactiver une fonctionnalité financière. Révoquez les anciens identifiants Soleas avant la première publication assainie et purgez, si nécessaire, les anciens déploiements et caches des plateformes abandonnées.
