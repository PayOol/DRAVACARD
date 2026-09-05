"use client";

import { useLanguage } from "@/lib/language-context";
import { BadgeCheck } from "lucide-react";

export default function RecommendedBadge() {
  const { language } = useLanguage();
  return (
    <span className="catalog-recommended-badge pointer-events-none absolute -top-3.5 right-4 z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-white bg-blue-600 px-3 py-1 text-[11px] font-bold leading-4 text-white shadow-lg shadow-blue-600/25">
      <BadgeCheck size={14} aria-hidden="true" />
      {language === "fr" ? "Recommandé" : "Recommended"}
    </span>
  );
}
