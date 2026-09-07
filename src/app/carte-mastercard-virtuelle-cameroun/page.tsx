import SeoLandingPage from "@/components/seo/SeoLandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte Mastercard virtuelle au Cameroun dès 6 000 FCFA",
  description:
    "Comparez les Mastercard virtuelles DRAVA au Cameroun : Basique 6 000 FCFA, Premium 8 500 FCFA et Platinium 15 000 FCFA.",
  alternates: { canonical: "/carte-mastercard-virtuelle-cameroun/" },
  openGraph: {
    title: "Carte Mastercard virtuelle au Cameroun | DRAVA",
    description:
      "Prix et caractéristiques des offres Mastercard virtuelles DRAVA au Cameroun.",
    url: "/carte-mastercard-virtuelle-cameroun/",
  },
};

export default function CarteMastercardVirtuelleCamerounPage() {
  return (
    <SeoLandingPage
      path="/carte-mastercard-virtuelle-cameroun/"
      eyebrow="Mastercard virtuelle DRAVA"
      title="Carte Mastercard virtuelle au Cameroun : trois offres DRAVA à comparer"
      lead="DRAVA affiche trois niveaux de Mastercard pour le Cameroun : Basique, Premium et Platinium. Les différences portent sur le prix, le type de carte et les usages ou compatibilités indiqués dans le catalogue."
      highlights={[
        { label: "Prix d’entrée", value: "6 000 FCFA" },
        { label: "Nombre d’offres", value: "3" },
        { label: "Sécurité", value: "3D Secure" },
        { label: "Gamme supérieure", value: "Platinium" },
      ]}
      sections={[
        {
          title: "Les trois Mastercard virtuelles DRAVA",
          items: [
            "Mastercard Basique — 6 000 FCFA : carte prépayée, 3D Secure, sans frais mensuels, validité annoncée de trois ans.",
            "Mastercard Premium — 8 500 FCFA : carte de débit, achats Amazon et Alibaba, retraits possibles au Cameroun et compatibilité PayPal indiquée au catalogue.",
            "Mastercard Platinium — 15 000 FCFA : carte de débit, recharges sans plafond annoncé, compatibilité Google Pay et Apple Pay, bonus de 5 USD indiqué au catalogue.",
          ],
        },
        {
          title: "Quelle Mastercard choisir ?",
          paragraphs: [
            "La Mastercard Basique est l’option la moins chère de cette gamme et convient aux besoins de paiement en ligne simples. La Premium ajoute davantage d’usages commerciaux, tandis que la Platinium vise les utilisateurs qui recherchent les compatibilités les plus larges affichées par DRAVA.",
            "Le choix doit être fait selon votre usage réel. Vérifiez les caractéristiques de la carte et les restrictions du catalogue avant la commande plutôt que de sélectionner uniquement la gamme la plus élevée.",
          ],
        },
        {
          title: "Usages et restrictions à connaître",
          paragraphs: [
            "Le catalogue DRAVA indique que les cartes ne sont pas acceptées sur les plateformes de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise et les sites pour adultes. Certaines fonctionnalités sont également propres à une offre, par exemple les retraits au Cameroun pour la Premium ou les compatibilités Google Pay et Apple Pay pour la Platinium.",
          ],
        },
      ]}
      faq={[
        {
          question: "Combien coûte une Mastercard virtuelle DRAVA au Cameroun ?",
          answer:
            "La Mastercard Basique est affichée à 6 000 FCFA. La Premium est à 8 500 FCFA et la Platinium à 15 000 FCFA.",
        },
        {
          question: "Quelle Mastercard DRAVA est la moins chère ?",
          answer:
            "La Mastercard Basique est actuellement l’offre Mastercard la moins chère du catalogue à 6 000 FCFA.",
        },
        {
          question: "Quelle offre est compatible avec Google Pay et Apple Pay ?",
          answer:
            "Le catalogue DRAVA indique la compatibilité Google Pay et Apple Pay pour la Mastercard Platinium.",
        },
        {
          question: "Peut-on faire des retraits avec une Mastercard DRAVA ?",
          answer:
            "Le catalogue indique des retraits possibles au Cameroun pour la Mastercard Premium. Vérifiez les conditions applicables avant l’achat.",
        },
        {
          question: "Les Mastercard DRAVA utilisent-elles 3D Secure ?",
          answer:
            "Oui. 3D Secure est affiché parmi les caractéristiques des offres Mastercard du catalogue.",
        },
      ]}
      ctaHref="/"
      ctaLabel="Comparer les Mastercard DRAVA"
      relatedLinks={[
        {
          href: "/carte-virtuelle-cameroun/",
          label: "Comparer toutes les cartes virtuelles",
        },
        {
          href: "/carte-visa-virtuelle-cameroun/",
          label: "Carte Visa virtuelle Cameroun",
        },
        {
          href: "/pieces-tiktok-cameroun/",
          label: "Pièces TikTok au Cameroun",
        },
      ]}
    />
  );
}
