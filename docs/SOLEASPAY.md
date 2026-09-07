# SoleasPay Checkout v4

Source : [documentation officielle Checkout v4](https://documentation.mysoleas.com/api-docs/plugin#checkout-v4), consultée le 7 septembre 2026.

À la demande explicite du marchand, SoleasPay utilise exclusivement Checkout v4 : formulaire HTML POST vers `https://pay.soleaspay.com`, puis confirmation automatique à partir de `soleaspay_data`. Aucune API OAuth, gateway, status, ni webhook supplémentaire n’est ajoutée.

## Parcours commun aux cartes et TikTok

1. Après consentement et validation des coordonnées, `/api/checkout` calcule le prix et crée une référence unique côté serveur. La commande et les données chiffrées nécessaires au traitement sont enregistrées avant de retourner le formulaire.
2. Le navigateur soumet les huit champs documentés : `apiKey`, `amount`, `currency`, `orderId`, `description`, `shopName`, `successUrl`, `failureUrl`. Les cartes restent en XOF et TikTok en XAF. Aucun filtre géographique, split, conversion ou frais supplémentaires n’est imposé. Le préremplissage client facultatif est omis.
3. SoleasPay affiche sa page et retourne `soleaspay_data`. Les pages DRAVA capturent ce JSON et le jeton de commande en mémoire, retirent paramètres et fragment de l’URL, puis transmettent le résultat à `/api/orders/status` avec le jeton.
4. Le Worker rapproche `invoice_reference`, le montant et la devise avec la commande non expirée. Il conserve uniquement `transaction_reference`, `invoice_reference`, `status`, `success` si présent, `amount` et `currency`. `SUCCESS` et `COMPLETED` confirment automatiquement le paiement ; un retour négatif cohérent ne produit pas de reçu.
5. Le reçu et la notification du service suivent le parcours partagé. Un retour identique est réutilisable sans nouvel encaissement ni nouvel envoi séquentiel. Une référence de transaction contradictoire est refusée. Un simple chemin de succès sans résultat ne confirme rien.

## Configuration

`SOLEASPAY_API_KEY` est stockée dans le gestionnaire de secrets du Worker. Elle active SoleasPay pour les deux services. La clé fournie le 7 septembre a été enregistrée dans Cloudflare sans fichier local ni ajout au dépôt.

Conformément au formulaire officiel, cette clé est transmise au navigateur au moment du checkout. Elle doit être autorisée au contexte plugin ; aucun secret d’administration ou OAuth ne convient. Le formulaire est temporaire et supprimé après soumission. Les réponses API restent `no-store` ; clé, jeton et retour complet ne sont ni journalisés ni conservés dans le stockage navigateur. La CSP permet les formulaires uniquement vers l’origine Checkout officielle ; aucune connexion gateway n’est autorisée côté client.

## Contrat de confiance

Cette intégration traite automatiquement le retour navigateur, conformément à l’instruction du marchand. Le rapprochement côté serveur ne constitue pas une authentification cryptographique de SoleasPay : une personne détenant le jeton et les champs attendus peut fabriquer ce retour. La règle précédente exigeant une vérification externe authentifiée est donc remplacée pour ce prestataire uniquement. Le champ commun `verified` signifie ici que le retour Checkout a été accepté selon ce contrat. LeekPay et SebPay conservent leur vérification authentifiée.

La confirmation dépend du retour du client : fermer Checkout avant ce retour laisse la commande en attente. Les limites de concurrence et de notification liées à KV restent celles du moteur partagé ; aucune garantie de traitement exactement une fois entre régions n’est ajoutée.

## Validation du 7 septembre 2026

- 83 tests Worker, 95 tests paiement, 32 TikTok, 11 thème et 58 PWA réussis. Lint/TypeScript, compilation statique, types et compilation Worker à blanc réussis. Scanner source/export et auto-tests (63 mutations du paiement partagé) réussis ; audit npm sans vulnérabilité signalée.
- Edge émulé sur export local : 28 parcours complets (cartes et TikTok, FR/EN, clair/sombre répartis, 320, 390, 767, 768 et 1440 px, 844 × 390 tactile et souris). Le vrai moteur Worker reçoit des commandes fictives avec KV simulé ; la page externe et EmailJS sont interceptés. Soumission HTML POST, confirmation automatique, reçu, nettoyage de l’URL et absence de données privées dans le stockage vérifiés, sans débordement horizontal ni erreur console.
- Huit parcours négatifs supplémentaires à 320 et 1440 px vérifient le résultat d’échec sans reçu dans les deux langues et services. Aucune transaction ni notification réelle et aucun appareil physique iOS/Android testé.
- La clé plugin est enregistrée dans Cloudflare. Le code Worker et l’export frontend sont prêts localement ; leur nouvelle version n’a pas été publiée. Les publier de façon coordonnée : l’ancienne interface ne prend pas en charge `checkoutForm`.
