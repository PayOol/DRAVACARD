"use client";

import DesktopCatalog from "@/components/catalog/DesktopCatalog";
import MobileCatalog from "@/components/catalog/MobileCatalog";
import MainLayout from "@/components/layout/MainLayout";
import type { DialogCheckout as CardCheckoutComponent } from "@/components/ui/dialog-checkout";
import type { TikTokCheckout as TikTokCheckoutComponent } from "@/components/tiktok/TikTokCheckout";
import type { TikTokPack } from "@/lib/tiktok-catalog";
import type { CatalogCard } from "@/lib/catalog";
import {
  type CatalogSection,
  catalogSectionHash,
  readCatalogSection,
} from "@/lib/catalog-section";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useRef, useState } from "react";

type CheckoutModules = {
  DialogCheckout: typeof CardCheckoutComponent;
  TikTokCheckout: typeof TikTokCheckoutComponent;
};

export default function Home() {
  const { language } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [section, setSection] = useState<CatalogSection>("cards");
  const [selectedPack, setSelectedPack] = useState<TikTokPack | null>(null);
  const [selectedPackId, setSelectedPackId] = useState("boost");
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutModules, setCheckoutModules] = useState<
    Partial<CheckoutModules>
  >({});
  const [checkoutLoadError, setCheckoutLoadError] = useState(false);
  const [checkoutLoadAttempt, setCheckoutLoadAttempt] = useState(0);
  const checkoutTrigger = useRef<HTMLElement | null>(null);
  const { DialogCheckout, TikTokCheckout } = checkoutModules;
  const checkoutLoading = Boolean(
    (selectedCard && !DialogCheckout) || (selectedPack && !TikTokCheckout),
  );

  const restorePurchaseFocus = () => {
    const trigger = checkoutTrigger.current;
    if (trigger?.isConnected && trigger.getClientRects().length) {
      trigger.focus({ preventScroll: true });
    }
  };

  // The catalogues stay server-rendered. Payment code loads only after a
  // selection, with retries kept outside React.lazy's cached rejected promise.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the attempt explicitly retries a failed chunk; focus is captured for this selected product.
  useEffect(() => {
    if (!checkoutLoading) return;
    let active = true;
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      !focused.closest("[data-checkout-load-status]")
    ) {
      checkoutTrigger.current = focused;
    }
    setCheckoutLoadError(false);
    const load = selectedCard
      ? import("@/components/ui/dialog-checkout").then(
          ({ DialogCheckout }) => ({ DialogCheckout }),
        )
      : import("@/components/tiktok/TikTokCheckout").then(
          ({ TikTokCheckout }) => ({ TikTokCheckout }),
        );
    void load
      .then((loaded) => {
        if (!active) return;
        // The real modal captures the original purchase control for restoration.
        if (document.activeElement?.closest("[data-checkout-load-status]"))
          restorePurchaseFocus();
        setCheckoutModules((current) => ({ ...current, ...loaded }));
      })
      .catch(() => {
        if (active) setCheckoutLoadError(true);
      });
    const cancel = () => {
      setSelectedCard(null);
      setSelectedPack(null);
      restorePurchaseFocus();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("popstate", cancel);
    return () => {
      active = false;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("popstate", cancel);
    };
  }, [checkoutLoading, selectedCard, selectedPack, checkoutLoadAttempt]);
  const tiktok = {
    customCoins,
    onCustomCoinsChange: setCustomCoins,
    selectedPackId,
    onSelectPack: (pack: TikTokPack) => {
      setSelectedPackId(pack.id);
      if (pack.id !== "custom") setCustomCoins(0);
      setSelectedPack(pack);
    },
  };

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
    if (selectedCard || selectedPack || next === section) return;
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
      <span
        hidden
        data-drava-checkout-active={Boolean(selectedCard || selectedPack)}
      />
      <MainLayout
        mobileContent={
          <MobileCatalog
            onSelect={setSelectedCard}
            section={section}
            onSectionChange={changeSection}
            tiktok={tiktok}
          />
        }
      >
        <DesktopCatalog
          onSelect={setSelectedCard}
          section={section}
          onSectionChange={changeSection}
          tiktok={tiktok}
        />
      </MainLayout>
      {checkoutLoading && (
        <aside
          data-checkout-load-status
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-[#111c2e] dark:text-white"
        >
          <p
            role={checkoutLoadError ? "alert" : "status"}
            className="text-sm leading-6"
          >
            {checkoutLoadError
              ? language === "fr"
                ? "La commande n’a pas pu être chargée. Vérifiez votre connexion et réessayez."
                : "The checkout could not be loaded. Check your connection and try again."
              : language === "fr"
                ? "Chargement de votre commande…"
                : "Loading your checkout…"}
          </p>
          <div className="mt-3 flex gap-3">
            {checkoutLoadError && (
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                onClick={() => setCheckoutLoadAttempt((current) => current + 1)}
              >
                {language === "fr" ? "Réessayer" : "Retry"}
              </button>
            )}
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600"
              onClick={() => {
                setSelectedCard(null);
                setSelectedPack(null);
                restorePurchaseFocus();
              }}
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
          </div>
        </aside>
      )}
      {selectedPack && TikTokCheckout && (
        <TikTokCheckout
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
        />
      )}
      {selectedCard && DialogCheckout && (
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
