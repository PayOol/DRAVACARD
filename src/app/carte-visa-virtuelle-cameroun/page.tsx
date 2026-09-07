import SeoLandingPage from "@/components/seo/SeoLandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte Visa virtuelle au Cameroun dès 5 000 FCFA",
  description:
    "Découvrez la Visa Basique DRAVA au Cameroun : carte virtuelle prépayée à 5 000 FCFA, 3D Secure, sans frais mensuels et validité de 3 ans.",
  alternates: { canonical: "/carte-visa-virtuelle-cameroun/" },
  openGraph: {
    title: "Carte Visa virtuelle au Cameroun dès 5 000 FCFA | DRAVA",
    description:
      "Prix, caractéristiques et usages de la carte Visa virtuelle DRAVA au Cameroun.",
    url: "/carte-visa-virtuelle-cameroun/",
  },
};

export default function CarteVisaVirtuelleCamerounPage() {
  return (
    <SeoLandingPage
      path="/carte-visa-virtuelle-cameroun/"
      eyebrow="Visa virtuelle DRAVA"
      title="Carte Visa virtuelle au Cameroun dès 5 000 FCFA"
      lead="La Visa Basique DRAVA est l’offre d’entrée de gamme du catalogue de cartes virtuelles. Elle est présentée comme une carte prépayée pour les achats en ligne, avec 3D Secure, sans frais mensuels et une validité annoncée de trois ans."
      highlights={[
        { label: "Prix", value: "5 000 FCFA" },
        { label: "Type", value: "Prépayée" },
        { label: "Sécurité", value: "3D Secure" },
        { label: "Frais mensuels", value: "Aucun" },
      ]}
      sections={[
        {
          title: "Caractéristiques de la Visa Basique DRAVA",
          items: [
            "Carte virtuelle prépayée.",
            "Authentification 3D Secure indiquée au catalogue.",
            "Sans frais mensuels annoncés.",
            "Validité annoncée de trois ans.",
            "Conçue pour les achats en ligne selon le catalogue DRAVA.",
            "Offre affichée à 5 000 FCFA.",
          ],
        },
        {
          title: "À qui s’adresse cette carte Visa virtuelle ?",
          paragraphs: [
            "Cette offre vise surtout les utilisateurs qui recherchent une carte virtuelle simple pour commencer à payer en ligne sans choisir une gamme Mastercard plus coûteuse. Elle constitue actuellement le point d’entrée tarifaire du catalogue DRAVA.",
            "Avant toute commande, vérifiez que le site ou le service que vous souhaitez payer accepte le type de carte proposé. DRAVA indique que certaines catégories de services ne sont pas compatibles avec ses cartes.",
          ],
        },
        {
          title: "Visa ou Mastercard virtuelle : quelle différence chez DRAVA ?",
          paragraphs: [
            "La Visa Basique est affichée à 5 000 FCFA. La Mastercard Basique commence à 6 000 FCFA et les offres Mastercard Premium et Platinium ajoutent des fonctionnalités supplémentaires. Le meilleur choix dépend donc surtout de l’usage recherché et du budget.",
          ],
        },
      ]}
      faq={[
        {
          question: "Quel est le prix de la carte Visa virtuelle DRAVA ?",
          answer:
            "La Visa Basique est actuellement affichée à 5 000 FCFA dans le catalogue DRAVA.",
        },
        {
          question: "La Visa virtuelle DRAVA a-t-elle des frais mensuels ?",
          answer:
            "Le catalogue présente la Visa Basique comme une carte sans frais mensuels.",
        },
        {
          question: "La Visa virtuelle DRAVA est-elle prépayée ?",
          answer:
            "Oui. Elle est décrite comme une carte prépayée dans le catalogue DRAVA.",
        },
        {
          question: "La carte Visa prend-elle en charge 3D Secure ?",
          answer:
            "Oui. 3D Secure figure parmi les caractéristiques annoncées de la Visa Basique.",
        },
        {
          question: "Quelle est sa durée de validité ?",
          answer:
            "DRAVA indique une validité de trois ans pour cette offre.",
        },
      ]}
      ctaHref="/"
      ctaLabel="Voir la Visa Basique DRAVA"
      relatedLinks={[
        {
          href: "/carte-virtuelle-cameroun/",
          label: "Comparer toutes les cartes virtuelles",
        },
        {
          href: "/carte-mastercard-virtuelle-cameroun/",
          label: "Carte Mastercard virtuelle Cameroun",
        },
        {
          href: "/pieces-tiktok-cameroun/",
          label: "Pièces TikTok au Cameroun",
        },
      ]}
    />
  );
}
