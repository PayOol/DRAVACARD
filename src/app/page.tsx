"use client";

import DesktopCatalog from "@/components/catalog/DesktopCatalog";
import MobileCatalog from "@/components/catalog/MobileCatalog";
import MainLayout from "@/components/layout/MainLayout";
import { DialogCheckout } from "@/components/ui/dialog-checkout";
import type { CatalogCard } from "@/lib/catalog";
import {
  type CatalogSection,
  catalogSectionHash,
  readCatalogSection,
} from "@/lib/catalog-section";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useState } from "react";

export default function Home() {
  const { language } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [section, setSection] = useState<CatalogSection>("cards");

  useEffect(() => {
    const syncSection = () =>
      setSection(readCatalogSection(window.location.hash));
    syncSection();
    window.addEventListener("popstate", syncSection);
    window.addEventListener("hashchange", syncSection);
    return () => {
      window.removeEventListener("popstate", syncSection);
      window.removeEventListener("hashchange", syncSection);
    };
  }, []);

  const changeSection = (next: CatalogSection) => {
    if (selectedCard || next === section) return;
    window.history.pushState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}${catalogSectionHash(next)}`,
    );
    // pushState does not emit a navigation event. Both layouts share this state.
    setSection(next);
  };

  return (
    <>
      <MainLayout
        mobileContent={
          <MobileCatalog
            onSelect={setSelectedCard}
            section={section}
            onSectionChange={changeSection}
          />
        }
      >
        <DesktopCatalog
          onSelect={setSelectedCard}
          section={section}
          onSectionChange={changeSection}
        />
      </MainLayout>
      {selectedCard && (
        <DialogCheckout
          card={{
            id: selectedCard.id,
            name: selectedCard.name[language],
            amount: Number.parseInt(selectedCard.price, 10),
            displayCurrency: selectedCard.currency,
          }}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  );
}
