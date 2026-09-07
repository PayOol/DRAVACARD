import SeoLandingPage from "@/components/seo/SeoLandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte virtuelle au Cameroun : Visa & Mastercard",
  description:
    "Comparez les cartes virtuelles DRAVA au Cameroun : Visa dès 5 000 FCFA et Mastercard dès 6 000 FCFA, 3D Secure et offres sans frais mensuels.",
  alternates: { canonical: "/carte-virtuelle-cameroun/" },
  openGraph: {
    title: "Carte virtuelle au Cameroun : Visa & Mastercard | DRAVA",
    description:
      "Guide DRAVA des cartes virtuelles Visa et Mastercard disponibles au Cameroun, avec prix et caractéristiques.",
    url: "/carte-virtuelle-cameroun/",
  },
};

export default function CarteVirtuelleCamerounPage() {
  return (
    <SeoLandingPage
      path="/carte-virtuelle-cameroun/"
      eyebrow="Guide DRAVA Cameroun"
      title="Carte virtuelle au Cameroun : choisir une Visa ou Mastercard DRAVA"
      lead="DRAVA propose plusieurs cartes virtuelles destinées aux paiements en ligne depuis le Cameroun. Ce guide réunit les tarifs, les différences entre les offres et les usages indiqués dans le catalogue pour vous aider à choisir la carte adaptée."
      highlights={[
        { label: "Prix d’entrée", value: "5 000 FCFA" },
        { label: "Réseaux", value: "Visa & Mastercard" },
        { label: "Validité annoncée", value: "3 ans" },
        { label: "Sécurité", value: "3D Secure" },
      ]}
      sections={[
        {
          title: "Quelles cartes virtuelles DRAVA sont proposées au Cameroun ?",
          paragraphs: [
            "Le catalogue actuel comprend une Visa Basique et trois niveaux de Mastercard. Les prix ci-dessous correspondent aux tarifs affichés par DRAVA et peuvent évoluer lorsque le catalogue est mis à jour.",
          ],
          items: [
            "Visa Basique — 5 000 FCFA : carte prépayée, 3D Secure, sans frais mensuels, validité de 3 ans et achats en ligne.",
            "Mastercard Basique — 6 000 FCFA : carte prépayée, 3D Secure, sans frais mensuels, validité de 3 ans.",
            "Mastercard Premium — 8 500 FCFA : carte de débit, achats Amazon et Alibaba, retraits possibles au Cameroun et compatibilité PayPal indiquée au catalogue.",
            "Mastercard Platinium — 15 000 FCFA : carte de débit, recharges sans plafond annoncé, compatibilité Google Pay et Apple Pay, bonus de 5 USD indiqué au catalogue.",
          ],
        },
        {
          title: "Quelle carte choisir pour payer en ligne depuis le Cameroun ?",
          paragraphs: [
            "Pour un besoin simple de paiement en ligne, les offres Visa Basique et Mastercard Basique sont les options les moins chères. Les niveaux Premium et Platinium ajoutent des usages et compatibilités supplémentaires. Comparez toujours les caractéristiques qui correspondent au service que vous comptez utiliser avant d’acheter.",
            "DRAVA indique également que ses cartes ne sont pas acceptées sur certains services, notamment les plateformes de cryptomonnaies, de paris sportifs, Wise et les sites pour adultes. Cette restriction doit être prise en compte avant la commande.",
          ],
        },
        {
          title: "Comment commander une carte virtuelle DRAVA ?",
          items: [
            "Ouvrez le catalogue DRAVA et comparez les quatre offres disponibles.",
            "Sélectionnez la carte correspondant à votre besoin et vérifiez son prix et ses caractéristiques.",
            "Utilisez le parcours de commande sécurisé affiché sur la plateforme.",
            "Conservez votre reçu et ne transmettez jamais vos données de carte ou de paiement par e-mail ou téléphone.",
          ],
        },
      ]}
      faq={[
        {
          question: "Combien coûte une carte virtuelle au Cameroun chez DRAVA ?",
          answer:
            "L’offre la moins chère du catalogue DRAVA est la Visa Basique à 5 000 FCFA. La Mastercard Basique est affichée à 6 000 FCFA, la Premium à 8 500 FCFA et la Platinium à 15 000 FCFA.",
        },
        {
          question: "Les cartes DRAVA utilisent-elles 3D Secure ?",
          answer:
            "Oui. Le catalogue DRAVA indique 3D Secure parmi les caractéristiques de ses offres Visa et Mastercard.",
        },
        {
          question: "Quelle est la durée de validité des cartes ?",
          answer:
            "Le catalogue indique une validité de trois ans pour les cartes DRAVA.",
        },
        {
          question: "Existe-t-il une carte sans frais mensuels ?",
          answer:
            "Oui. Les offres Visa Basique et Mastercard Basique sont présentées dans le catalogue comme sans frais mensuels.",
        },
        {
          question: "Puis-je utiliser une carte DRAVA sur tous les sites ?",
          answer:
            "Non. DRAVA indique plusieurs exclusions, notamment les plateformes de cryptomonnaies, de paris sportifs, Wise et les sites pour adultes. Vérifiez toujours la compatibilité avant l’achat.",
        },
      ]}
      ctaHref="/"
      ctaLabel="Comparer les cartes DRAVA"
      relatedLinks={[
        {
          href: "/carte-visa-virtuelle-cameroun/",
          label: "Carte Visa virtuelle au Cameroun",
        },
        {
          href: "/carte-mastercard-virtuelle-cameroun/",
          label: "Carte Mastercard virtuelle au Cameroun",
        },
        {
          href: "/pieces-tiktok-cameroun/",
          label: "Pièces TikTok au Cameroun",
        },
      ]}
    />
  );
}
