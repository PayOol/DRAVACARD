import SeoLandingPage from "@/components/seo/SeoLandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pièces TikTok au Cameroun : packs et prix DRAVA",
  description:
    "Consultez les packs de pièces TikTok proposés par DRAVA au Cameroun : 100 à 7 000 pièces, packs avec bonus et montant personnalisé.",
  alternates: { canonical: "/pieces-tiktok-cameroun/" },
  openGraph: {
    title: "Pièces TikTok au Cameroun : packs et prix | DRAVA",
    description:
      "Découvrez les packs de pièces TikTok affichés dans le catalogue DRAVA au Cameroun.",
    url: "/pieces-tiktok-cameroun/",
  },
};

export default function PiecesTikTokCamerounPage() {
  return (
    <SeoLandingPage
      path="/pieces-tiktok-cameroun/"
      eyebrow="Catalogue TikTok DRAVA"
      title="Pièces TikTok au Cameroun : packs, bonus et prix DRAVA"
      lead="DRAVA propose plusieurs packs de pièces TikTok avec des prix affichés en FCFA, ainsi qu’une option de montant personnalisé. Cette page récapitule le catalogue actuel pour permettre de comparer rapidement les quantités et les tarifs avant de lancer une commande."
      highlights={[
        { label: "Petit pack", value: "100 pièces" },
        { label: "Pack populaire", value: "700 + 70" },
        { label: "Grand pack", value: "7 000 + 700" },
        { label: "Minimum personnalisé", value: "70 pièces" },
      ]}
      sections={[
        {
          title: "Prix des packs de pièces TikTok chez DRAVA",
          items: [
            "100 pièces — 1 124 FCFA.",
            "350 pièces — 3 900 FCFA.",
            "700 pièces + 70 bonus — 7 900 FCFA.",
            "1 400 pièces + 140 bonus — 15 700 FCFA.",
            "3 500 pièces + 350 bonus — 39 300 FCFA.",
            "7 000 pièces + 700 bonus — 78 700 FCFA.",
          ],
        },
        {
          title: "Peut-on choisir un nombre personnalisé de pièces ?",
          paragraphs: [
            "Oui. Le catalogue DRAVA permet aussi de saisir un montant personnalisé compris entre 70 et 1 000 000 de pièces. Le prix est calculé à partir du tarif unitaire défini dans le catalogue au moment de la commande.",
            "Pour éviter une erreur, vérifiez toujours la quantité affichée, le prix final et les informations saisies avant de confirmer le paiement.",
          ],
        },
        {
          title: "Comment acheter des pièces TikTok sur DRAVA ?",
          items: [
            "Ouvrez l’onglet TikTok du catalogue DRAVA.",
            "Choisissez un pack prédéfini ou saisissez une quantité personnalisée.",
            "Vérifiez la quantité, les bonus éventuels et le prix affiché.",
            "Lancez le parcours de commande puis conservez le reçu de transaction.",
          ],
        },
      ]}
      faq={[
        {
          question: "Quel est le plus petit pack de pièces TikTok sur DRAVA ?",
          answer:
            "Le plus petit pack prédéfini du catalogue est de 100 pièces à 1 124 FCFA. L’option personnalisée accepte des quantités à partir de 70 pièces.",
        },
        {
          question: "Quels packs incluent un bonus ?",
          answer:
            "Le catalogue affiche actuellement des bonus sur les packs de 700, 1 400, 3 500 et 7 000 pièces.",
        },
        {
          question: "Combien coûtent 700 pièces TikTok chez DRAVA ?",
          answer:
            "Le pack affiché contient 700 pièces plus 70 pièces bonus pour 7 900 FCFA.",
        },
        {
          question: "Puis-je commander plus de 7 000 pièces ?",
          answer:
            "Oui. Le catalogue prévoit une quantité personnalisée pouvant aller jusqu’à 1 000 000 de pièces.",
        },
        {
          question: "Où lancer la commande ?",
          answer:
            "Depuis la page principale DRAVA, ouvrez l’onglet TikTok puis sélectionnez le pack ou la quantité souhaitée.",
        },
      ]}
      ctaHref="/#tiktok"
      ctaLabel="Voir les packs TikTok DRAVA"
      relatedLinks={[
        {
          href: "/carte-virtuelle-cameroun/",
          label: "Carte virtuelle au Cameroun",
        },
        {
          href: "/carte-visa-virtuelle-cameroun/",
          label: "Carte Visa virtuelle Cameroun",
        },
        {
          href: "/carte-mastercard-virtuelle-cameroun/",
          label: "Carte Mastercard virtuelle Cameroun",
        },
      ]}
    />
  );
}
