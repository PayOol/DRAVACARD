"use client";

import { useLanguage } from "@/lib/language-context";
import { Coins } from "lucide-react";
import "./catalog-sections.css";

export default function TikTokPanel() {
  const { language } = useLanguage();
  const fr = language === "fr";

  return (
    <div className="catalog-tiktok">
      <span className="catalog-tiktok-icon" aria-hidden="true">
        <Coins size={38} strokeWidth={1.6} />
      </span>
      <h1 tabIndex={-1}>{fr ? "Pièces TikTok" : "TikTok coins"}</h1>
      <span className="catalog-tiktok-status">
        {fr ? "Bientôt disponible" : "Coming soon"}
      </span>
      <p>
        {fr
          ? "Votre nouvel espace Pièces TikTok est en préparation. Les offres seront ajoutées prochainement."
          : "Your new TikTok coins section is being prepared. Offers will be added soon."}
      </p>
    </div>
  );
}
