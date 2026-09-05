# DRAVA — règles de contribution

La plateforme possède deux interfaces : mobile sous 768 px et desktop à partir de 768 px. Un écran tactile en paysage conserve toutefois le layout mobile jusqu’à 1023 px de largeur lorsque sa hauteur ne dépasse pas 500 px (`pointer: coarse`). Toute fonctionnalité utilisateur doit être disponible, utilisable et vérifiée sur les deux. Une livraison limitée à un seul layout est incomplète, sauf demande explicite de l’utilisateur.

- Lire [l’architecture des deux layouts](docs/DUAL_LAYOUT.md) avant de modifier l’interface.
- Conserver les présentations `DesktopCatalog` et `MobileCatalog` séparées. Le catalogue, la sélection et le fonctionnement du paiement restent partagés ; ne pas recopier prix, produits ou logique des prestataires dans les layouts. Afficher toutes les cartes sans filtre de réseau sur mobile et desktop.
- Préserver les étapes de commande : notes d’utilisation et consentement, coordonnées validées, choix du prestataire, vérification serveur du paiement. La détection de localisation intervient après acceptation et ne remplace jamais une saisie manuelle.
- Préserver l’expérience mobile : zones sûres, clavier, défilement, retour système, historique sans données personnelles, gestion du focus, cibles tactiles et réduction des animations. Fournir les textes français et anglais.
- Garder les transitions fluides à chaque étape du parcours, y compris les fiches avant paiement. Les éléments sortants deviennent inertes et le retour restaure le défilement ; respecter `prefers-reduced-motion`.
- Garder les styles mobiles isolés et limiter les changements desktop au périmètre demandé. Ne pas bloquer le zoom.
- Utiliser le logo DRAVA original de `public/images/drava-logo-transparent.svg` ; ne pas le remplacer par du texte recréé ou une icône générique. Le composant `DravaLogo` adapte son cadrage au mobile.
- Vérifier les interfaces aux largeurs 320, 390, 767, 768 et 1440 px, ainsi qu’en paysage tactile 844 × 390 px et aux mêmes dimensions avec une souris, puis exécuter les contrôles applicables décrits dans le document d’architecture. Rapporter les limites de validation ; une émulation navigateur ne prouve pas une validation sur appareil iOS/Android.

Les données de paiement, les coordonnées et les jetons ne doivent pas être mis en cache par le service worker ni stockés dans l’historique. Une page de retour ou une simulation locale ne constitue jamais une preuve de paiement.
