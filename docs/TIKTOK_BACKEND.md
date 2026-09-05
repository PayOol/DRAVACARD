# Paiement des pièces TikTok

Les cartes et TikTok utilisent le même moteur du Worker existant : `/api/providers`, `/api/checkout` et `/api/orders/status`. Les anciennes routes `/api/tiktok/*` sont des alias de compatibilité, sans intégration séparée. Le navigateur transmet le service, le produit, les coordonnées et le consentement ; le Worker fixe le montant. Les six packs et la formule personnalisée `Math.round(coins * 11.24)` reprennent UpCoin, avec 70 à 1 000 000 pièces personnalisées sans bonus. `coins` contient la quantité de base ; la quantité livrée est `coins + bonus`. L’architecture commune est décrite dans [PAYMENTS.md](PAYMENTS.md).

## Contrat navigateur

Toutes les réponses sont `no-store`. Les origines, les adresses IP Cloudflare et les limites de débit reprennent les protections des cartes. Les erreurs ont la forme `{ "error": { "code": "…" } }`.

- `GET /api/providers` → `{ providers: [{ id, available }] }`, dans l’ordre LeekPay, SoleasPay, SebPay. Cette disponibilité est globale et dépend des identifiants de paiement, sans dépendance à EmailJS.
- `POST /api/checkout` → corps `{ service: "tiktok", productId, customCoins?, provider, consent: true, customer: { username, password, email, whatsapp }, payment? }`. `productId` reprend l’identifiant du pack. `payment` existe uniquement pour SebPay et contient `{ country, operator, phone, otpCode? }` ; le téléphone de paiement est international sans `+`. Le WhatsApp du client conserve `+`.
- Création → HTTP 201 `{ service: "tiktok", productId, orderToken, checkoutUrl?, providerLink?, status, provider, amount, currency: "XAF", coins, bonus }`. Le statut initial est `pending` ou `processing`. `checkoutUrl` est une redirection LeekPay ; `providerLink`, si présent, ouvre la validation SebPay. Une réponse initiale du prestataire ne constitue pas la confirmation finale.
- `POST /api/orders/status` → `{ orderToken }`. Réponse `{ service: "tiktok", productId, status, verified, provider, packId, coins, bonus, amount, currency, createdAt, orderId, notification, username?, transactionReference? }`. Le statut est `pending`, `processing`, `paid`, `failed`, `cancelled` ou `expired`. Seul `paid` authentifié auprès du prestataire produit `verified: true`. Uniquement dans ce cas, `transactionReference` contient l’identifiant prestataire validé (129 caractères maximum) et `username` peut contenir le libellé du compte TikTok (2 à 254 caractères, pouvant être un e-mail de connexion). Aucun mot de passe, e-mail de contact ni téléphone n’est renvoyé. Les anciennes commandes sans libellé restent valides ; le client accepte l’absence de ces champs.
- `GET /api/providers/sebpay/countries` → `{ countries: [{ id, code, name, prefix, currency, exchangeRate, operators: [{ id, code, name, otpRequired, ussdCode }] }] }`.
- `POST /api/providers/sebpay/quote` → `{ service: "tiktok", productId, customCoins?, country, operator }`, réponse `{ amount, fee, total, currency, collectionAmount, otpRequired, ussdCode }`. Le Worker recalcule ce devis au paiement.

Les retours LeekPay utilisent `/tiktok-payment/#order=…`. Le navigateur doit retirer immédiatement le fragment avec `replaceState` et conserver le jeton uniquement en mémoire. Le réglage Worker `TIKTOK_BASE_PATH` suit le `NEXT_PUBLIC_BASE_PATH` du site. Comme pour les cartes, l’origine du retour est celle de la requête déjà validée par le serveur, en production comme en développement : le site public revient sur son origine et les origines locales déjà autorisées `http://localhost:3000` et `http://127.0.0.1:3000` reviennent chacune en local. Le client ne choisit aucune URL de retour libre ; les contrôles de consentement, de paiement et de confirmation serveur restent inchangés.

Ce comportement s’applique aux nouvelles commandes créées après le déploiement de la correction. Un checkout déjà créé garde l’URL de retour enregistrée chez le prestataire, même si le site est ensuite ouvert depuis une autre origine.

Les deux champs facultatifs du reçu restent en mémoire sur la page vérifiée ; ils ne doivent pas être ajoutés à l’historique, au stockage navigateur ou au cache du service worker. L’historique conserve sa liste explicite de champs publics. Un reçu PDF demandé par le client peut inclure le libellé du compte et la référence de transaction de cette réponse vérifiée.

## Configuration nécessaire avant activation

Le pack `mini` de 100 pièces applique actuellement le tarif de test de 100 FCFA demandé par le marchand. Les autres packs et la formule personnalisée conservent les tarifs UpCoin ; voir [les tarifs de test et leur rétablissement](PAYMENTS.md#tarifs-de-test-demandés-le-5-septembre-2026).

La configuration de déploiement `worker/wrangler.jsonc` exige uniquement `LEEKPAY_SECRET_KEY`, comme auparavant. Les noms des secrets TikTok optionnels sont déclarés dans `worker/wrangler.tiktok-types.jsonc`, utilisé exclusivement par la génération de types et jamais pour un déploiement. `npm --prefix worker run types` génère les deux interfaces et le module TikTok utilise `Env & Partial<TikTokSecrets>` ; l’absence d’un prestataire ou du service de notification ne bloque donc pas le déploiement des cartes. Les valeurs restent dans les secrets Worker ou `.dev.vars.development` ignoré par Git. Aucun secret, compte ou identifiant d’envoi réel d’UpCoin n’a été copié.

- `TIKTOK_DATA_KEY` : 32 octets aléatoires, représentés par 64 caractères hexadécimaux, pour AES-GCM. Ne pas changer cette clé avant la fin du traitement des commandes en cours sans prévoir une migration.
- `LEEKPAY_SECRET_KEY` : secret du marchand pour LeekPay, partagé avec les cartes.
- `SEBPAY_PUBLIC_KEY` et `SEBPAY_SECRET_KEY` : identifiants du marchand SebPay.
- `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` : compte EmailJS du marchand, trois valeurs requises. Autoriser les appels API pour les applications non navigateur dans les réglages de sécurité EmailJS. Le modèle DRAVA décrit ci-dessous a un destinataire marchand fixe et un champ Reply-To ; aucune réponse automatique au client n’est configurée.
- `EMAILJS_PRIVATE_KEY` : obligatoire pour le compte DRAVA selon ses réglages de sécurité. Elle doit être ajoutée aux secrets Worker et transmise uniquement côté serveur dans `accessToken`. Le moteur sait omettre ce champ pour les comptes ne l’exigeant pas, mais cette possibilité générique ne convient pas au compte DRAVA. Une valeur fournie vide ou mal formée désactive la création TikTok. Aucune clé publique ou privée ne doit être ajoutée à cette documentation ni au modèle HTML.
- `SOLEASPAY_API_KEY` est réservé ; il n’active pas SoleasPay à lui seul.

La création TikTok exige le chiffrement et la notification de traitement, afin de ne pas accepter une commande impossible à transmettre au marchand. Si ces réglages manquent, `fulfillment_unavailable` est renvoyé avant tout appel au prestataire. La vérification d’une commande existante dépend seulement des identifiants de son prestataire et du dossier serveur : une configuration EmailJS absente ou une panne de lecture des données annexes ne transforme pas un paiement confirmé en échec. La notification reste alors en attente et le libellé du compte peut être absent. L’absence de configuration TikTok ne désactive ni la disponibilité LeekPay ni les paiements de cartes.

Déploiement historique du 5 septembre 2026, antérieur à la configuration du compte EmailJS DRAVA : le moteur partagé a été redéployé sur le Worker existant `drava-leekpay`, version `a5ca2c5f-9594-4404-b361-7c01821dbbb9`. La clé AES-256 `TIKTOK_DATA_KEY` a été générée et enregistrée directement dans les secrets Cloudflare, sans fichier de clé local ni changement des secrets LeekPay. LeekPay reste partagé par les services. SebPay était non configuré et SoleasPay indisponible. Les identifiants d’envoi EmailJS manquaient encore lors de cette validation ; aucun paiement ni courriel réel n’y avait été créé. Ce déploiement historique ne confirme pas l’activation de la nouvelle configuration EmailJS.

Référence et publication frontend déjà vérifiées : le projet UpCoin contient trois identifiants EmailJS dans `app/lib/payments/send-order-email.ts`, mais ne révèle ni le propriétaire du compte ni le destinataire du modèle distant. DRAVA utilise désormais son propre compte et le modèle décrit ci-dessous, sans reprendre les clés UpCoin. Le frontend du commit `ca86e43` a été publié avec succès via [GitHub Pages](https://github.com/PayOol/DRAVACARD/actions/runs/33979936624). `https://drava.click/tiktok-payment/` a répondu HTTP 200, avec `noindex` ; sans jeton, le navigateur affiche « Paiement non confirmé » et ne crée aucune transaction.

## Compte EmailJS DRAVA — configuration confirmée

Le modèle [drava-order-template.html](emailjs/drava-order-template.html) conserve le HTML du modèle partagé dans EmailJS. Il s’agit d’une notification interne en français, avec le logo original DRAVA, le montant FCFA et les coordonnées. Une section conditionnelle affiche la carte commandée ; les sections de quantité et d’accès TikTok apparaissent uniquement pour les pièces. Il ne comporte ni lien de paiement, ni réponse automatique au client.

| Réglage du tableau de bord | Valeur confirmée |
| --- | --- |
| Service | `service_drava` |
| Nom du modèle | `DRAVA — Commandes` |
| Identifiant du modèle | `template_drava_tiktok` |
| Sujet | `[DRAVA] {{service_type}} — {{order_id}}` |
| Destinataire To | `contact.drava@gmail.com`, valeur fixe hors du HTML |
| Reply-To | `{{client_email}}` |
| Nom d’expéditeur From | `DRAVA` |
| Adresse d’expéditeur | Adresse Gmail par défaut du service |
| CC / BCC | CC `contact.payool@gmail.com` déjà présent lors de l’extension aux cartes et conservé ; BCC vide |
| Option de confidentialité | `Do not save private data` cochée |
| Clé privée | Requise par les réglages du compte ; valeur exclusivement dans les secrets serveur |

TikTok conserve ses neuf paramètres ci-dessous. Les cartes utilisent les six paramètres communs (`service_type`, `order_id`, `client_email`, `client_whatsapp`, `price`, `date`) et `card_name`, issu du catalogue serveur, sans aucun champ TikTok. L’identifiant historique du modèle est conservé pour réutiliser les secrets existants. Les sections Mustache `card_name` et `coins_amount` adaptent le contenu. Toutes les interpolations utilisent des doubles accolades échappées ; aucun paramètre n’est placé dans une URL ou un attribut HTML. Le champ hérité `desired_username` (« Nom souhaité ») reste supprimé.

| Paramètre | Information transmise par le Worker |
| --- | --- |
| `service_type` | Libellé du service : recharge TikTok ou carte virtuelle |
| `order_id` | Identifiant de la commande, utilisé pour reconnaître un éventuel doublon |
| `tiktok_username` | Pseudo ou e-mail de connexion TikTok |
| `tiktok_password` | Mot de passe, dans le bloc interne réservé au marchand |
| `client_email` | E-mail de contact du client, également utilisé en Reply-To |
| `client_whatsapp` | WhatsApp du client |
| `coins_amount` | Total à créditer, `coins + bonus`, formaté en français |
| `price` | Montant formaté en français ; le modèle précise FCFA |
| `date` | Date de création de la commande au format ISO |

La destination fixe empêche qu’un paramètre de commande choisisse le destinataire de cette notification contenant les accès au compte. Reply-To ne crée pas d’envoi au client. L’option de confidentialité a été confirmée dans EmailJS ; elle ne supprime pas la copie du courriel reçue dans la boîte du marchand. Le HTML versionné ne contient aucune clé ni donnée client réelle.

Les quatre champs client proviennent des saisies de `TikTokCheckout`, transmises à la création de commande puis conservées dans l’enveloppe chiffrée propre à cette commande. Le mot de passe est conservé tel que saisi ; le compte perd seulement son `@` initial et ses espaces extérieurs, l’e-mail ses espaces de saisie, et le WhatsApp associe les chiffres saisis à l’indicatif du pays sélectionné. Les validations rejettent les coordonnées invalides sans leur substituer de valeur de démonstration ou de contact DRAVA. Le pays peut être suggéré par Cloudflare après consentement ; le choix manuel reste prioritaire. Les cinq autres champs décrivent la commande : libellé du service, identifiant et date générés côté serveur, quantité avec bonus et prix correspondant à la sélection validée. Ils ne sont pas des champs personnels saisis par le client.

Validation du 5 septembre 2026 : le test synthétique du tableau de bord a retourné **200 OK** et son courriel a été reçu dans `contact.drava@gmail.com`. Un second test, `TEST-SERVEUR-DRAVA-20260905`, a appelé directement l’API REST depuis Node avec la clé privée, sans en-tête `Origin` ou `Referer`, et les dix paramètres fictifs du contrat Worker. Il a également retourné **HTTP 200**, avec réception confirmée dans la boîte DRAVA. Aucun paiement, compte client réel ou recharge n’a été créé. Ces tests valident le service et son accès serveur ; ils ne constituent pas un paiement de bout en bout exécuté sur le Worker.

Le Worker existant `drava-leekpay` a ensuite été déployé à 100 % le 5 septembre 2026 à 18:30 UTC, version `9118f1da-ebfb-4cdc-85a1-8ca3003e2f90`. Les quatre liaisons `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` et `EMAILJS_PRIVATE_KEY` sont confirmées comme secrets dans cette version active. Les clés de chiffrement et LeekPay sont conservées. `/health` et `/api/providers` répondent HTTP 200 avec `no-store` ; LeekPay reste disponible pour les deux services. Ces routes seules ne testent pas l’envoi EmailJS. Les 34 tests ciblés du moteur commun/TikTok et le contrôle TypeScript Worker passent.

Mise à jour du 5 septembre 2026 à 20:34 UTC : suppression de « Nom souhaité » sauvegardée et vérifiée après rechargement du modèle EmailJS ; le Worker n’envoie plus ce paramètre. La version `78581fc5-c6a8-4af1-aed2-54b3bc3361b0` est déployée à 100 %, avec `/health` HTTP 200 et `no-store`. Les 36 tests ciblés TikTok, workerd et paiement commun passent, ainsi que TypeScript et le scanner de sécurité. Le test de deux commandes distinctes finalisées dans l’ordre inverse vérifie les neuf champs exacts, les normalisations des coordonnées et la conservation du mot de passe sans mélange de clients. Cette vérification utilise des appels de paiement et d’e-mail simulés ; aucun nouvel envoi réel n’a été effectué pour cette suppression.

## Notification et données de traitement

Le champ de compte accepte le pseudo ou l’e-mail comme UpCoin ; le mot de passe comporte au moins quatre caractères. Les coordonnées et le mot de passe sont chiffrés avec AES-GCM et un nonce aléatoire, liés à l’identifiant de commande. Ils sont stockés exclusivement dans le KV serveur, séparément du dossier de vérification, pendant sept jours maximum. Une seconde enveloppe `:receipt` contient uniquement `{ username }`, sans mot de passe ni coordonnées de contact. Elle utilise son propre nonce et un contexte authentifié `receipt:<orderId>`, et conserve l’expiration initiale de la commande, sans prolongation lors des consultations. Les clés KV contiennent seulement le hachage du jeton aléatoire. Aucun mot de passe n’est transmis aux prestataires de paiement.

Après vérification d’un paiement réussi, le Worker envoie au modèle EmailJS les neuf champs décrits ci-dessus. Les pièces comprennent le bonus, le prix est formaté en français et `date` contient la date de commande au format ISO. Le destinataire marchand est configuré dans EmailJS ; les clés restent côté serveur. Il s’agit de la notification de traitement, pas d’un envoi automatique du PDF : comme UpCoin, le reçu PDF est téléchargé depuis la page. Aucune réponse automatique au client n’est activée par ce modèle.

L’enveloppe complète `:customer` est supprimée après acceptation par EmailJS. Seul le libellé chiffré du reçu reste jusqu’à l’expiration initiale. Pour les anciennes commandes, ce libellé est récupéré depuis l’enveloppe complète avant sa suppression ; si les anciennes données ont déjà été supprimées, le reçu reste consultable sans compte TikTok. Après un échec final du paiement, les deux enveloppes sont supprimées. Le modèle de traitement reçoit donc le mot de passe demandé par le parcours d’origine ; son destinataire doit être contrôlé par le marchand.

Un échec d’envoi, de lecture annexe ou de nettoyage conserve `verified: true` et `notification: "pending"`. Une nouvelle vérification serveur reprend l’opération. Une notification acceptée est marquée avant nettoyage : si celui-ci échoue, la consultation suivante retente la suppression sans renvoyer le courriel. Le code ne marque jamais un courriel comme envoyé avant l’acceptation d’EmailJS. `notification: "sent"` signifie accepté par EmailJS et nettoyage effectué, pas livraison des pièces TikTok. Le projet source ne fournit aucune API de recharge TikTok : l’exécution reste celle du marchand, via le courriel de commande.

Limites conservées/documentées : l’envoi est déclenché par la consultation du statut ; aucune tâche de fond ne traite une commande si le client ne revient pas. Le marqueur KV évite les renvois séquentiels lorsqu’il est visible, mais KV ne garantit pas l’unicité de deux envois concurrents dans plusieurs régions. Un succès EmailJS suivi d’une réponse réseau perdue ou d’une erreur d’écriture du marqueur peut également provoquer un doublon au réessai. EmailJS ne documente pas de clé d’idempotence pour `/send` ; le consommateur du courriel doit reconnaître `order_id`. L’API documente une limite d’un envoi par seconde, partagée par les appels utilisant le compte : une erreur de débit reste en attente pour une consultation ultérieure. La création d’un paiement n’a pas de garantie d’idempotence prestataire : après une réponse réseau ambiguë, le navigateur ne doit pas relancer automatiquement la création. Si un jeton a été reçu, il doit uniquement vérifier son statut. Une garantie atomique plus forte nécessite un stockage transactionnel et une stratégie de reprise adaptée au contrat du prestataire.

## SoleasPay : blocage de vérification explicite

L’implémentation UpCoin envoie un formulaire natif à `https://pay.soleaspay.com` contenant `apiKey` et se fie aux paramètres de retour. Le plugin WooCommerce publié par SoleasPay effectue aussi une validation de forme des paramètres `soleaspay_data`, sans vérification authentifiée de la transaction. Ces mécanismes ne satisfont pas la règle DRAVA de confirmation serveur, et transmettraient la clé au navigateur.

Le lien de documentation officiel `https://developper.mysoleas.com` ne résolvait pas pendant l’intégration. Aucun endpoint de vérification, signature de webhook ni format de réponse non documenté n’a été inventé. SoleasPay demeure visible et indisponible jusqu’à obtention du contrat serveur officiel d’initiation et de vérification. Sa clé seule ne suffit pas à l’activer. Les routes LeekPay et SebPay sont entièrement implémentées.

Références consultées le 5 septembre 2026 : [collectes SebPay](https://new.sebpay.bj/fr/docs/collections), [frais SebPay](https://new.sebpay.bj/fr/docs/tarifs), [REST EmailJS](https://www.emailjs.com/docs/rest-api/send/), [SDK officiel EmailJS : accès serveur et clé privée facultative](https://github.com/emailjs-com/emailjs-nodejs), [consistance KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/), [page développeurs SoleasPay](https://soleaspay.com/home/services/developers), [plugin officiel SoleasPay](https://plugins.svn.wordpress.org/soleaspay-payment-gateway-for-woocommerce/trunk/class/).

Les tests `worker/test/tiktok.test.mjs` et `worker/test/payments.test.mjs` interceptent toutes les requêtes externes et vérifient les prix, les bonus, les devis/OTP SebPay, les deux services, la validation serveur, le chiffrement et les pannes de notification. Aucun paiement ni courriel réel n’est créé par ces tests automatisés. Les essais d’envoi réels avec données fictives et le déploiement de la configuration EmailJS sont documentés séparément ci-dessus.
