# Secours DNS de drava.click

Le workflow **DNS failover (web only)** s'exécute sur GitHub Actions, sans dépendre
de l'ordinateur de l'administrateur. Il peut désactiver le proxy Cloudflare du site
pour rétablir l'accès direct à GitHub Pages. Il ne change pas les serveurs de noms.

## Périmètre strict

Le script ne peut modifier que `proxied: false` pour les neuf enregistrements
existants de la zone `drava.click` :

| Nom | Type | Valeurs attendues |
| --- | --- | --- |
| `drava.click` | A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `drava.click` | AAAA | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www.drava.click` | CNAME | `payool.github.io` |

Les MX, TXT, autres noms, adresses, TTL, certificats, règles et serveurs de noms
ne sont pas modifiés. Aucun appel n'est effectué vers les prestataires de paiement,
le Worker ou les pages de retour de paiement. Aucun secret de paiement n'est utilisé.

## Conditions de bascule

1. Lire et valider la liste exacte des enregistrements. Si elle ne correspond plus
   à la configuration attendue, s'arrêter sans modification.
2. Contrôler uniquement l'accueil, le logo statique et la redirection `www`.
   Les trois sondes doivent toutes échouer (réseau, TLS ou HTTP 5xx) pendant
   trois essais espacés de vingt secondes. Une réponse partiellement saine,
   un refus 403, une limite 429 ou un contenu inattendu ne justifie pas le
   contournement du proxy. Un dernier contrôle annule la bascule si le site
   répond à nouveau avant l'écriture.
3. Vérifier directement les quatre origines IPv4 GitHub, en conservant le domaine
   HTTPS et la vérification du certificat. Si GitHub ne fonctionne pas, ne pas basculer.
4. Relire la configuration pour détecter une modification concurrente, puis envoyer
   un seul lot de neuf PATCH limités à `proxied: false`. Relire les DNS pour vérifier
   le résultat. Ne pas réessayer aveuglément une écriture dont la réponse est ambiguë.

Une fois les neuf enregistrements en **DNS-only**, le workflow ne réactive pas
automatiquement le proxy. Tester le domaine à ce moment-là teste GitHub, et non le
rétablissement de Cloudflare. Le retour au proxy nécessite une vérification manuelle
du certificat et de Cloudflare ; cela évite une boucle de bascules.

## Configuration GitHub

Créer un jeton Cloudflare dédié avec la seule permission **Zone / DNS / Edit**, limité
à la seule zone **drava.click**. Cette permission reste techniquement valable pour
tous les DNS de cette zone : la restriction aux neuf enregistrements est imposée par
le code. Ne donner aucune permission Workers, Account Settings ou Zone Settings.

Dans **Settings → Secrets and variables → Actions** du dépôt `PayOol/DRAVACARD` :

- Secret : `CLOUDFLARE_DNS_FAILOVER_TOKEN`, contenant le jeton dédié.
- Variable : `DNS_FAILOVER_ENABLED`, valeur `true` seulement après un contrôle
  manuel `check` réussi depuis la branche `master`.

Le jeton ne doit jamais figurer dans le dépôt, les variables publiques, les logs ou
la conversation. Les pull requests ne reçoivent pas ce secret. Les actions utilisées
sont épinglées sur des commits ; aucun paquet npm n'est installé par ce workflow.

## Contrôles et exploitation

```powershell
# Tests simulés : aucune connexion ni modification DNS.
node --test scripts/dns-failover.test.mjs

# Sondes publiques, sans jeton et sans modification DNS.
node scripts/dns-failover.mjs --probe-public

# Avec le secret fourni par l'environnement : aucune écriture DNS.
node scripts/dns-failover.mjs --check
```

Dans GitHub Actions, **Run workflow → check** valide les accès et effectue les
contrôles sans modifier les DNS. `apply` autorise une bascule uniquement après les
vérifications ; ce n'est pas un bouton de bascule forcée. Un push lance seulement
les tests, jamais une modification DNS.

Les résultats sont des lignes JSON sans jeton ni contenu HTML. Une bascule réussie
renvoie volontairement le code 2 avec un résultat explicite `failover_applied` : le
workflow est signalé en échec pour attirer l'attention. Les alertes e-mail dépendent
des préférences de notification GitHub du propriétaire. Les passages suivants ne
refont pas la bascule quand les DNS sont déjà en accès direct.

Pour arrêter la bascule automatique, mettre `DNS_FAILOVER_ENABLED` à `false` ou
désactiver ce workflow. Révoquer le jeton dédié si cet accès n'est plus nécessaire.

## Limites à connaître

- Le cron est prévu toutes les cinq minutes. GitHub peut retarder ou abandonner des
  exécutions ; ce n'est pas un SLA ni une garantie de continuité. Les workflows
  planifiés des dépôts publics sont désactivés après 60 jours sans activité.
- Les runners standards sont gratuits pour ce dépôt public. Réévaluer les coûts et
  désactiver le cron avant un éventuel passage du dépôt en privé.
- Une panne de l'API Cloudflare peut empêcher l'écriture. Une panne des DNS
  autoritatifs Cloudflare n'est pas résolue par ce mécanisme.
- Les caches DNS retardent le changement. La propagation du lot n'est pas atomique.
- Un runner GitHub ne représente pas tous les opérateurs et pays. Le problème de
  certains opérateurs peut revenir lors d'un accès direct à GitHub.
- Le contrôle direct vise les origines IPv4 ; il ne garantit pas la connectivité
  IPv6 ni celle des appareils réels.
- Les paiements restent entièrement hors périmètre. Leur disponibilité n'est ni
  testée ni rétablie par cette bascule DNS.

Sources : [planification GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[facturation Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[modifications DNS par lot](https://developers.cloudflare.com/dns/manage-dns-records/how-to/batch-record-changes/),
[statut du proxy](https://developers.cloudflare.com/dns/proxy-status/),
[jeton Cloudflare limité](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
