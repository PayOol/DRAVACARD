"use client";

import { useLanguage } from "@/lib/language-context";
import type { CatalogSection } from "@/lib/catalog-section";
import { type KeyboardEvent, useRef } from "react";
import "./catalog-sections.css";

const sections: CatalogSection[] = ["cards", "tiktok"];

export default function CatalogTabs({
  section,
  onSectionChange,
  idPrefix,
}: {
  section: CatalogSection;
  onSectionChange: (section: CatalogSection) => void;
  idPrefix: "desktop" | "mobile";
}) {
  const { language } = useLanguage();
  const tabRefs = useRef<Record<CatalogSection, HTMLButtonElement | null>>({
    cards: null,
    tiktok: null,
  });
  const fr = language === "fr";

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: CatalogSection,
  ) => {
    const currentIndex = sections.indexOf(current);
    let next: CatalogSection;
    switch (event.key) {
      case "ArrowRight":
        next = sections[(currentIndex + 1) % sections.length];
        break;
      case "ArrowLeft":
        next = sections[(currentIndex - 1 + sections.length) % sections.length];
        break;
      case "Home":
        next = sections[0];
        break;
      case "End":
        next = sections[sections.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    onSectionChange(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      className="catalog-tabs"
      role="tablist"
      aria-label={fr ? "Nos produits" : "Our products"}
      aria-orientation="horizontal"
    >
      {sections.map((value) => (
        <button
          key={value}
          ref={(element) => {
            tabRefs.current[value] = element;
          }}
          className="catalog-tab"
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${value}`}
          aria-selected={section === value}
          // Inactive panels are unmounted after their exit animation.
          aria-controls={
            section === value ? `${idPrefix}-section-${value}` : undefined
          }
          tabIndex={section === value ? 0 : -1}
          onClick={() => onSectionChange(value)}
          onKeyDown={(event) => handleKeyDown(event, value)}
        >
          {value === "cards"
            ? fr
              ? "Cartes virtuelles"
              : "Virtual cards"
            : fr
              ? "Pièces TikTok"
              : "TikTok coins"}
        </button>
      ))}
    </div>
  );
}
