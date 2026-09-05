# Paiements partagés entre les services

Les cartes, les pièces TikTok et les futurs services utilisent le même moteur de paiement. Le service fournit le produit, les coordonnées nécessaires et son traitement après paiement ; le prestataire reçoit une intention de paiement normalisée, sans connaître le fonctionnement du catalogue.

## Tarifs rétablis le 5 septembre 2026

La carte `visa-basic` est fixée à **5 000 FCFA** et le pack TikTok `mini` de 100 pièces sans bonus à **1 124 FCFA**, dans les catalogues mobile/desktop partagés et dans le Worker. Les autres cartes, packs et la formule personnalisée sont inchangés. Ces tarifs concernent les nouvelles commandes ; une commande existante conserve son montant enregistré pour la vérification et le reçu, y compris les anciennes commandes à 100 FCFA.

Les contrôles de tarifs correspondent à ces montants. Les commandes historiques à 100 FCFA restent vérifiables contre leur montant enregistré ; le Worker ne recalcule jamais leur prix avec le catalogue courant.

## Répartition

| Module | Responsabilité |
| --- | --- |
| `src/lib/payment-providers.ts` | Registre global : identifiants, noms, logos et parcours redirection/Mobile Money. |
| `src/lib/payment-api.ts` | Unique transport navigateur vers le proxy : disponibilité, création, statut, pays et devis SebPay. Validation stricte des requêtes et réponses. |
| `src/components/payment/SharedPaymentProviders.tsx` | Même liste et mêmes états de disponibilité dans chaque service. |
| `src/components/payment/SebPayForm.tsx` | Pays, opérateur, numéro, OTP éventuel et devis partagés. |
| `worker/src/providers.ts` | Un adaptateur par prestataire : configuration, préparation, création, vérification authentifiée et fonctions Mobile Money. |
| `worker/src/services.ts` | Catalogue serveur, validation des coordonnées, retours et traitement propres au service. Aucun appel au prestataire. |
| `worker/src/payments.ts` | Moteur commun : consentement, commande, stockage, appels aux adaptateurs et statut vérifié. |
| `worker/src/tiktok.ts` | Produits TikTok, chiffrement et notification EmailJS après paiement vérifié. Aucun adaptateur de paiement. |

`leekpay.ts` et `tiktok-payment.ts` sont des façades de compatibilité du client commun ; elles ne réalisent aucune requête réseau directement. Les layouts mobile et desktop ne possèdent ni client ni liste de disponibilité distincts.

## Contrat commun

- `GET /api/providers` → `{ providers: [{ id, available }] }`. La configuration d’un prestataire vaut pour toute la plateforme ; EmailJS n’intervient pas dans cette réponse.
- `POST /api/checkout` → `{ service, productId, customCoins?, provider, customer, consent: true, payment? }`. `service` vaut `cards` ou `tiktok`. Le serveur calcule le montant et la devise ; le navigateur ne transmet ni prix ni URL de retour.
- Création → `{ service, productId, provider, orderToken, status, amount, currency, checkoutUrl?, providerLink?, coins?, bonus? }`. Les liens sont contrôlés avant affichage ; une création ne prouve jamais le paiement.
- `POST /api/orders/status` → `{ orderToken }`. La réponse identifie le service, le produit et le prestataire. `verified: true` exige un paiement authentifié et la correspondance de la référence, du montant et de la devise enregistrés.
- `GET /api/providers/sebpay/countries` et `POST /api/providers/sebpay/quote` sont partagés. Le devis reçoit `{ service, productId, customCoins?, country, operator }` ; le serveur le recalcule à la création.

`customer` contient les coordonnées de contact validées ; TikTok ajoute le compte et le mot de passe nécessaires à son traitement. Seules les coordonnées documentées sont transmises au prestataire ; le mot de passe TikTok n’y est jamais envoyé. `payment`, réservé au formulaire Mobile Money, contient `{ country, operator, phone, otpCode? }`. L’OTP requis par l’opérateur sert exclusivement à cette transaction SebPay et n’est pas conservé.

Les pages de résultat refusent une commande d’un autre service. Un jeton reçu par fragment est immédiatement retiré de l’URL et reste en mémoire. Le résultat Mobile Money intégré conserve également le jeton et l’éventuel lien de validation en mémoire ; il reprend la vérification habituelle, sans créer une deuxième commande. Les reçus et historiques respectent les listes explicites de champs autorisés.

Pour les cartes comme pour TikTok, le serveur construit les retours à partir de l’origine de la requête déjà validée, que le Worker soit en production ou en développement. Une commande démarrée sur le site public y revient ; les origines locales déjà autorisées `http://localhost:3000` et `http://127.0.0.1:3000` reviennent chacune sur leur propre origine. Les chemins sont fixés côté serveur : le client ne fournit aucune URL de retour libre. Cette règle ne change ni les origines autorisées, ni le consentement, les exigences de paiement ou la vérification serveur.

La correction concerne les nouvelles commandes créées après son déploiement. Les checkouts déjà créés conservent l’URL de retour enregistrée chez le prestataire ; ouvrir ensuite le site depuis une autre origine ne modifie pas ces liens.

## Compatibilité et activation

Les cartes et les pièces partagent le transport EmailJS, le modèle marchand et les secrets existants. Après paiement vérifié, la notification contient les coordonnées saisies et les informations de la commande ; les champs propres au produit restent séparés. Les coordonnées nécessaires sont chiffrées dans une enveloppe distincte de l’enregistrement de paiement, puis supprimées après l’envoi ou un échec définitif du paiement. Une panne d’e-mail ne transforme jamais un paiement confirmé en échec. La page des cartes reprend silencieusement une transmission en attente pendant son cycle de vérification borné, sans nouvelle commande ni paiement. Les anciennes commandes de cartes sans coordonnées conservées ne peuvent pas être notifiées rétroactivement.

L’envoi dépend d’une vérification de statut après paiement, comme pour TikTok ; aucun nouveau webhook ou traitement planifié n’est ajouté. La protection contre les répétitions séquentielles utilise le marqueur KV existant ; elle ne garantit pas l’unicité absolue lors d’appels concurrents ou d’une réponse EmailJS perdue après acceptation.

Extension déployée le 5 septembre 2026 sur `drava-leekpay`, version `ae4402e7-3c69-406a-bfa5-5af8236b2963`. Le modèle EmailJS partagé a été sauvegardé puis relu : sujet dynamique, sections cartes/TikTok et confidentialité conservée. Les 78 tests Worker, les tests du retour carte avec panne d’envoi simulée, TypeScript, lint, compilation et contrôles de sécurité passent. Aucun nouvel e-mail ou paiement réel n’a été effectué pour cette extension ; validation automatisée sans appareil iOS/Android physique.

L’ancien corps cartes `{ productId, customer }` reste accepté sur `/api/checkout`, avec sa réponse historique. Les routes `/api/tiktok/*` restent des alias du moteur commun. Les commandes v1 cartes et TikTok sont normalisées en mémoire ; leurs clés KV, leurs jetons et le contexte de chiffrement restent inchangés.

Le Worker existant et son secret `LEEKPAY_SECRET_KEY` sont réutilisés. Il n’y a ni nouveau Worker ni deuxième configuration LeekPay par service. SebPay est proposé à tous les services dès que ses identifiants sont configurés. SoleasPay reste indisponible tant qu’une création et une vérification serveur authentifiées ne sont pas intégrées.

La disponibilité du paiement est distincte de celle du traitement métier. Avant toute création TikTok, le serveur exige le chiffrement et la configuration EmailJS et renvoie `fulfillment_unavailable` s’ils manquent. Cela n’empêche ni l’affichage de LeekPay ni le paiement des cartes. Une panne EmailJS après un paiement vérifié laisse ce paiement confirmé, avec une notification en attente.

## Ajouter un prestataire ou un service

Pour un prestataire, ajouter son adaptateur et ses identifiants dans le registre serveur, puis ses métadonnées dans le registre frontal. Implémenter la préparation, la création et la vérification dans cet adaptateur ; conserver le contrat commun. Les services existants utilisent immédiatement la même disponibilité et le même adaptateur. Ajouter aux tests la création et la vérification pour chaque service, avec les devis ou l’OTP si nécessaires.

Pour un service, définir ses produits, ses coordonnées, ses pages de retour et son traitement dans la couche service, puis sa présentation et les validateurs du contrat commun. Réutiliser `SharedPaymentProviders`, `createPaymentCheckout` et `getPaymentOrderStatus`. Ne pas recopier les appels LeekPay/SebPay, les secrets, les devis ou la vérification dans ce service.

## Validation et limites

`scripts/payment-api.test.mjs` couvre le contrat frontal commun ; `worker/test/payments.test.mjs` couvre les combinaisons cartes/TikTok avec LeekPay/SebPay, les alias, les anciennes commandes et les erreurs de configuration. Les tests interceptent tous les appels financiers et EmailJS.

KV reste à cohérence éventuelle. Une création interrompue après son envoi peut avoir été acceptée par le prestataire : ne pas la relancer automatiquement. Les données chiffrées déjà préparées conservent leur expiration initiale pour permettre un rapprochement. Les limites de reprise EmailJS et d’idempotence sont documentées dans [TIKTOK_BACKEND.md](TIKTOK_BACKEND.md).
