"use client";

import CatalogTabs from "@/components/catalog/CatalogTabs";
import {
  CatalogCardTransition,
  MobileChromeTransition,
  MobileScreenTransition,
} from "@/components/catalog/MobileTransitions";
import RecommendedBadge from "@/components/catalog/RecommendedBadge";
import TikTokPanel, {
  type TikTokCatalogProps,
} from "@/components/catalog/TikTokPanel";
import DravaLogo from "@/components/layout/DravaLogo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { withBasePath } from "@/lib/base-path";
import { type CatalogCard, cards } from "@/lib/catalog";
import type { CatalogSection } from "@/lib/catalog-section";
import { useLanguage } from "@/lib/language-context";
import { MOBILE_LAYOUT_QUERY } from "@/lib/responsive-layout";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Info,
  LockKeyhole,
  Wifi,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Screen = CatalogSection | `card:${string}`;

function readScreen(): Screen {
  const hash = window.location.hash.slice(1);
  if (hash === "tiktok") return "tiktok";
  if (
    hash.startsWith("card:") &&
    cards.some((card) => `card:${card.id}` === hash)
  )
    return hash as Screen;
  return "cards";
}

function CardArtwork({
  card,
  compact = false,
}: { card: CatalogCard; compact?: boolean }) {
  const { language } = useLanguage();
  return (
    <div
      aria-hidden="true"
      className={`app-card-art app-card-art--${card.color} ${compact ? "app-card-art--compact" : ""}`}
    >
      <div className="app-card-art-top">
        <DravaLogo decorative />
        <span>{compact ? "" : "VIRTUAL / USD"}</span>
      </div>
      <div className="app-card-chip-row">
        <span className="app-card-chip" />
        <Wifi size={21} strokeWidth={1.5} />
      </div>
      <div className="app-card-art-bottom">
        <span>
          {compact
            ? ""
            : language === "fr"
              ? "APERÇU DE LA CARTE"
              : "CARD PREVIEW"}
        </span>
        <img src={withBasePath(`/images/${card.icon}.svg`)} alt="" />
      </div>
    </div>
  );
}

function CardPrice({ card }: { card: CatalogCard }) {
  const { language } = useLanguage();
  return (
    <>
      {Number(card.price).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}{" "}
      <span className="app-currency">{card.currency}</span>
    </>
  );
}

export default function MobileCatalog({
  onSelect,
  section,
  onSectionChange,
  tiktok,
}: {
  onSelect: (card: CatalogCard) => void;
  section: CatalogSection;
  onSectionChange: (section: CatalogSection) => void;
  tiktok: TikTokCatalogProps;
}) {
  const { language, setLanguage } = useLanguage();
  const fr = language === "fr";
  const [screen, setScreen] = useState<Screen>("cards");
  const [direction, setDirection] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const reducedMotion = useReducedMotion() === true;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const screenStackRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef(false);
  const positions = useRef<Record<string, number>>({});
  const currentScreen = useRef<Screen>("cards");
  const [offline, setOffline] = useState(false);

  const prepareScreenExit = useCallback(() => {
    const element = screenStackRef.current?.querySelector<HTMLElement>(
      '.app-screen:not([aria-hidden="true"])',
    );
    if (!element) return;
    // Capture before either screen changes the document height or scroll.
    // These bounds also keep a partially entered screen steady on a fast Back.
    const bounds = element.getBoundingClientRect();
    const transform = getComputedStyle(element).transform;
    const offsetX =
      transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    element.style.setProperty("--screen-exit-top", `${bounds.top}px`);
    element.style.setProperty(
      "--screen-exit-left",
      `${bounds.left - offsetX}px`,
    );
    element.style.setProperty("--screen-exit-width", `${bounds.width}px`);
  }, []);

  useEffect(() => {
    // Also resync after a shared tab click: pushState itself emits no event.
    void section;
    const sync = () => {
      const next = readScreen();
      if (next === currentScreen.current) return;
      const visible = window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
      if (visible) {
        positions.current[currentScreen.current] = window.scrollY;
        prepareScreenExit();
      }
      currentScreen.current = next;
      navigationRef.current = visible;
      setDirection(next === "cards" ? -1 : 1);
      setIsNavigating(visible);
      setScreen(next);
    };
    const connection = () => setOffline(!navigator.onLine);
    sync();
    connection();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [prepareScreenExit, section]);

  // Restore each screen ourselves while the outgoing screen stays fixed.
  // Native history restoration would otherwise move it before we capture it.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const originalRestoration = window.history.scrollRestoration;
    const syncRestoration = () => {
      window.history.scrollRestoration = media.matches
        ? "manual"
        : originalRestoration;
    };
    syncRestoration();
    media.addEventListener("change", syncRestoration);
    return () => {
      media.removeEventListener("change", syncRestoration);
      window.history.scrollRestoration = originalRestoration;
    };
  }, []);

  const handleScreenEnter = useCallback(
    (next: Screen, element: HTMLDivElement) => {
      if (next !== currentScreen.current) return;
      setIsNavigating(false);
      if (
        !navigationRef.current ||
        !window.matchMedia(MOBILE_LAYOUT_QUERY).matches
      )
        return;
      navigationRef.current = false;
      window.scrollTo({
        top: positions.current[next] ?? 0,
        behavior: "instant",
      });
      if (document.activeElement?.getAttribute("role") !== "tab") {
        element
          .querySelector<HTMLElement>("h1")
          ?.focus({ preventScroll: true });
      }
    },
    [],
  );

  const navigate = useCallback(
    (next: Screen) => {
      if (next === currentScreen.current) return;
      positions.current[currentScreen.current] = window.scrollY;
      prepareScreenExit();
      currentScreen.current = next;
      navigationRef.current = true;
      setDirection(next === "cards" ? -1 : 1);
      setIsNavigating(true);
      window.history.pushState(
        { ...window.history.state, dravaMobile: true },
        "",
        next === "cards"
          ? `${window.location.pathname}${window.location.search}`
          : `#${next}`,
      );
      setScreen(next);
    },
    [prepareScreenExit],
  );

  const detail = screen.startsWith("card:")
    ? cards.find((card) => `card:${card.id}` === screen)
    : undefined;
  const openCard = (card: CatalogCard) => navigate(`card:${card.id}`);
  const backToCards = () => {
    if (window.history.state?.dravaMobile) window.history.back();
    else navigate("cards");
  };

  return (
    <div className={`mobile-app ${detail ? "mobile-app--detail" : ""}`}>
      <header className="app-home-header">
        <AnimatePresence initial={false} mode="wait">
          <MobileChromeTransition
            placement="header"
            key={detail ? "detail" : "catalogue"}
            reducedMotion={reducedMotion}
          >
            {detail ? (
              <button
                className="app-icon-button"
                type="button"
                onClick={backToCards}
                aria-label={fr ? "Retour" : "Back"}
              >
                <ArrowLeft size={22} aria-hidden="true" />
              </button>
            ) : (
              <DravaLogo />
            )}
            {detail && (
              <span className="app-header-title">
                {fr ? "Votre future carte" : "Your next card"}
              </span>
            )}
          </MobileChromeTransition>
        </AnimatePresence>
        <div className="app-header-actions">
          <ThemeToggle />
          <button
            className="app-language"
            type="button"
            onClick={() => setLanguage(fr ? "en" : "fr")}
            aria-label={fr ? "Switch to English" : "Passer en français"}
          >
            <Globe size={16} aria-hidden="true" />
            {language.toUpperCase()}
          </button>
        </div>
      </header>

      {offline && (
        <div className="app-offline" aria-live="polite">
          {fr
            ? "Vous êtes hors ligne. Reconnectez-vous pour commander."
            : "You’re offline. Reconnect to place an order."}
        </div>
      )}

      {!detail && (
        <CatalogTabs
          section={section}
          onSectionChange={onSectionChange}
          idPrefix="mobile"
        />
      )}

      <div className="app-screen-stack" ref={screenStackRef}>
        <AnimatePresence initial={false} mode="sync" custom={direction}>
          <MobileScreenTransition
            key={screen}
            direction={direction}
            detail={Boolean(detail)}
            reducedMotion={reducedMotion}
            panelId={!detail ? `mobile-section-${screen}` : undefined}
            labelledBy={!detail ? `mobile-tab-${screen}` : undefined}
            onEnter={(element) => handleScreenEnter(screen, element)}
          >
            {screen === "tiktok" && <TikTokPanel {...tiktok} />}
            {screen === "cards" && (
              <>
                <div className="app-intro app-intro--compact">
                  <p className="app-eyebrow">
                    {fr ? "LE CATALOGUE DRAVA" : "THE DRAVA COLLECTION"}
                  </p>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {fr ? "Trouvez votre carte." : "Find your card."}
                  </h1>
                  <p>
                    {fr
                      ? "Comparez, choisissez, et passez à la suite."
                      : "Compare, choose, and take the next step."}
                  </p>
                </div>
                <p className="app-list-count" aria-live="polite">
                  {cards.length}{" "}
                  {fr
                    ? `carte${cards.length > 1 ? "s" : ""} disponible${cards.length > 1 ? "s" : ""}`
                    : `card${cards.length > 1 ? "s" : ""} available`}
                </p>
                <div className="app-catalog-list">
                  <AnimatePresence initial={false} mode="popLayout">
                    {cards.map((card) => (
                      <CatalogCardTransition
                        key={card.id}
                        className={`app-catalog-card${card.recommended ? " app-catalog-card--recommended" : ""}`}
                        reducedMotion={reducedMotion}
                      >
                        {card.recommended && <RecommendedBadge />}
                        <div className="app-catalog-card-top">
                          <CardArtwork card={card} compact />
                          <div>
                            <h2>{card.name[language]}</h2>
                            <p>
                              {card.icon === "visa"
                                ? "Visa · USD"
                                : "Mastercard · USD"}
                            </p>
                          </div>
                        </div>
                        <p className="app-card-description">
                          {card.description[language]}
                        </p>
                        <div className="app-card-highlights">
                          {card.features[language]
                            .slice(0, 2)
                            .map((feature) => (
                              <span key={feature}>
                                <Check size={14} aria-hidden="true" />
                                {feature}
                              </span>
                            ))}
                        </div>
                        <div className="app-catalog-card-bottom">
                          <span>
                            <small>
                              {fr ? "Frais de création" : "Creation fee"}
                            </small>
                            <strong>
                              <CardPrice card={card} />
                            </strong>
                          </span>
                          <button
                            className="app-card-select-target"
                            type="button"
                            onClick={() => openCard(card)}
                            aria-label={`${fr ? "Choisir" : "Choose"} ${card.name[language]}`}
                          >
                            <span className="app-select-button">
                              {fr ? "Choisir" : "Choose"}
                              <ArrowRight size={17} aria-hidden="true" />
                            </span>
                          </button>
                        </div>
                      </CatalogCardTransition>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="app-usage-notice">
                  <Info size={18} aria-hidden="true" />
                  <p>
                    {fr
                      ? "Non acceptées sur les sites de cryptomonnaies, de paris sportifs, Wise et les sites pour adultes."
                      : "Not accepted on cryptocurrency, sports betting, Wise or adult sites."}
                  </p>
                </div>
              </>
            )}

            {detail && (
              <>
                <div className="app-detail-art">
                  <CardArtwork card={detail} />
                </div>
                <div className="app-detail-heading">
                  <p className="app-eyebrow">
                    {detail.icon === "visa" ? "VISA" : "MASTERCARD"} ·{" "}
                    {fr ? "CARTE VIRTUELLE" : "VIRTUAL CARD"}
                  </p>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {detail.name[language]}
                  </h1>
                  <p>{detail.description[language]}</p>
                </div>
                <div className="app-detail-summary">
                  <span>
                    {fr ? "Frais de création" : "Creation fee"}
                    <strong>
                      <CardPrice card={detail} />
                    </strong>
                  </span>
                  <span>
                    {fr ? "Validité" : "Validity"}
                    <strong>{fr ? "3 ans" : "3 years"}</strong>
                  </span>
                </div>
                <section className="app-section">
                  <h2 className="app-section-title">
                    {fr ? "Tout ce qui est inclus" : "Everything included"}
                  </h2>
                  <ul className="app-feature-list">
                    {detail.features[language].map((feature) => (
                      <li key={feature}>
                        <span>
                          <Check size={16} aria-hidden="true" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>
                {detail.negativeFeatures && (
                  <div className="app-limitations">
                    {detail.negativeFeatures[language].map((feature) => (
                      <p key={feature}>
                        <X size={17} aria-hidden="true" />
                        {feature}
                      </p>
                    ))}
                  </div>
                )}
                <div className="app-usage-notice">
                  <Info size={18} aria-hidden="true" />
                  <p>
                    {fr
                      ? "Les cartes ne sont pas acceptées pour les cryptomonnaies, les paris sportifs, Wise et les sites pour adultes. Les conditions complètes sont présentées à la prochaine étape."
                      : "Cards are not accepted for cryptocurrency, sports betting, Wise or adult sites. Full terms are shown in the next step."}
                  </p>
                </div>
                <div className="app-secure-caption">
                  <LockKeyhole size={14} aria-hidden="true" />
                  {fr
                    ? "Paiement sécurisé avec LeekPay"
                    : "Secure payment with LeekPay"}
                </div>
              </>
            )}
          </MobileScreenTransition>
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {detail && (
          <MobileChromeTransition
            key="purchase"
            placement="purchase"
            reducedMotion={reducedMotion}
          >
            <div>
              <span>{fr ? "Frais de création" : "Creation fee"}</span>
              <strong>
                <CardPrice card={detail} />
              </strong>
            </div>
            <button
              className="app-primary-button"
              type="button"
              onClick={() => onSelect(detail)}
              disabled={isNavigating}
              data-catalog-purchase={detail.id}
            >
              {fr ? "Obtenir ma carte" : "Get my card"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </MobileChromeTransition>
        )}
      </AnimatePresence>
    </div>
  );
}
