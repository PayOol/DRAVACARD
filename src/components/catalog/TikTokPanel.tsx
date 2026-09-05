"use client";

import { TikTokHelp } from "@/components/tiktok/TikTokHelp";
import { TikTokHistory } from "@/components/tiktok/TikTokHistory";
import { useLanguage } from "@/lib/language-context";
import {
  type TikTokPack,
  TIKTOK_MIN_COINS,
  customTikTokPack,
  formatTikTokNumber,
  normalizeCustomCoins,
  tiktokPacks,
} from "@/lib/tiktok-catalog";
import { playModalOpen, playPop } from "@/lib/tiktok-sound";
import { ArrowRight, Coins, Sparkles } from "lucide-react";
import { useId } from "react";
import "./tiktok-catalog.css";

export interface TikTokCatalogProps {
  customCoins: number;
  onCustomCoinsChange: (value: number) => void;
  selectedPackId: string;
  onSelectPack: (pack: TikTokPack) => void;
}

export default function TikTokPanel({
  customCoins,
  onCustomCoinsChange,
  selectedPackId,
  onSelectPack,
}: TikTokCatalogProps) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const inputId = useId();
  const custom = customTikTokPack(customCoins);
  const number = (value: number) => formatTikTokNumber(value, language);
  const buy = (pack: TikTokPack) => {
    playModalOpen();
    onSelectPack(pack);
  };
  return (
    <div className="tiktok-shop">
      <div className="tiktok-heading">
        <div>
          <p className="tiktok-eyebrow">
            {fr ? "RECHARGE TIKTOK" : "TIKTOK RECHARGE"}
          </p>
          <h1 tabIndex={-1}>
            {fr ? "Choisissez votre pack" : "Choose your pack"}
          </h1>
        </div>
      </div>
      <TikTokHelp kind="video" />
      <div
        className="tiktok-pack-grid"
        aria-label={fr ? "Forfaits disponibles" : "Available packs"}
      >
        {tiktokPacks.map((pack) => (
          <button
            className={`tiktok-pack${selectedPackId === pack.id ? " is-selected" : ""}`}
            key={pack.id}
            type="button"
            onClick={() => buy(pack)}
            data-tiktok-pack={pack.id}
            data-tiktok-purchase={pack.id}
            aria-label={`${fr ? "Acheter" : "Buy"} ${number(pack.coins)} ${fr ? "pièces" : "coins"}${pack.bonus ? ` + ${number(pack.bonus)} ${fr ? "gratuites" : "free"}` : ""}, ${number(pack.price)} FCFA`}
          >
            {pack.badge && (
              <span className="tiktok-pack-badge">
                {pack.badge === "popular"
                  ? fr
                    ? "Populaire"
                    : "Popular"
                  : fr
                    ? "Créateur"
                    : "Creator"}
              </span>
            )}
            <div className="tiktok-pack-top">
              <span className="tiktok-coin">
                <Coins size={23} aria-hidden="true" />
              </span>
              <span className="tiktok-pack-brand">
                TikTok<strong>Coins</strong>
              </span>
              <strong className="tiktok-quantity">{number(pack.coins)}</strong>
            </div>
            <div className="tiktok-pack-details">
              <strong className="tiktok-pack-price">
                {number(pack.price)} FCFA
              </strong>
              {pack.bonus ? (
                <span className="tiktok-bonus">
                  <Sparkles size={13} aria-hidden="true" />
                  <span>
                    +{number(pack.bonus)} {fr ? "Gratuites" : "free"}
                  </span>
                </span>
              ) : (
                <span className="tiktok-standard">
                  {fr ? "Forfait standard" : "Standard pack"}
                </span>
              )}
            </div>
            <span className="tiktok-buy">
              {fr ? "Acheter maintenant" : "Buy now"}
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <div className="tiktok-custom">
        <div className="tiktok-custom-heading">
          <span className="tiktok-coin">
            <Coins size={23} aria-hidden="true" />
          </span>
          <div>
            <h2>{fr ? "Montant personnalisé" : "Custom amount"}</h2>
            <p>{fr ? "Forfait personnalisé" : "Custom pack"}</p>
          </div>
          <span className="tiktok-minimum">
            {fr ? "Minimum 70 pièces" : "Minimum 70 coins"}
          </span>
        </div>
        <div className="tiktok-custom-body">
          <div>
            <label htmlFor={inputId}>
              {fr ? "Nombre de pièces personnalisé" : "Custom number of coins"}
            </label>
            <div className="tiktok-custom-input">
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                placeholder="70"
                value={customCoins || ""}
                onChange={(event) => {
                  const value = normalizeCustomCoins(event.target.value);
                  onCustomCoinsChange(value);
                  playPop(value >= 70 ? 1.1 : 0.9);
                }}
              />
              <span>{fr ? "pièces" : "coins"}</span>
            </div>
            <p className="tiktok-unit-price">
              {fr
                ? "Prix unitaire : 11.24 FCFA / pièce"
                : "Unit price: 11.24 FCFA / coin"}
            </p>
          </div>
          <div className="tiktok-custom-total" aria-live="polite">
            <span>{fr ? "Total à payer :" : "Total to pay:"}</span>
            <strong>
              {customCoins >= TIKTOK_MIN_COINS
                ? `${number(custom.price)} FCFA`
                : "—"}
            </strong>
          </div>
          <button
            className="tiktok-primary"
            type="button"
            data-tiktok-purchase="custom"
            disabled={customCoins < TIKTOK_MIN_COINS}
            onClick={() => buy(custom)}
          >
            {fr ? "Acheter maintenant" : "Buy now"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <TikTokHistory />
      <p className="tiktok-disclaimer">
        {fr
          ? "DRAVA est une plateforme indépendante de services tiers et n’est pas affiliée, associée ou sponsorisée par TikTok ou ByteDance."
          : "DRAVA is an independent third-party service platform and is not affiliated with, associated with, or sponsored by TikTok or ByteDance."}
      </p>
    </div>
  );
}
