"use client";

import DesktopCatalog from "@/components/catalog/DesktopCatalog";
import MobileCatalog from "@/components/catalog/MobileCatalog";
import MainLayout from "@/components/layout/MainLayout";
import { DialogCheckout } from "@/components/ui/dialog-checkout";
import type { CatalogCard } from "@/lib/catalog";
import { useLanguage } from "@/lib/language-context";
import { useState } from "react";

export default function Home() {
  const { language } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  return (
    <>
      <MainLayout mobileContent={<MobileCatalog onSelect={setSelectedCard} />}>
        <DesktopCatalog onSelect={setSelectedCard} />
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
