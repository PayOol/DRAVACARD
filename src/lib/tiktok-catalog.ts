// Catalogue UpCoin partagé entre les deux layouts DRAVA.
export type TikTokPack = {
  id: string;
  coins: number;
  bonus?: number;
  price: number;
  badge?: "popular" | "creator";
};
export const tiktokPacks: TikTokPack[] = [
  { id: "mini", coins: 100, price: 100 },
  { id: "starter", coins: 350, price: 3_900 },
  { id: "boost", coins: 700, bonus: 70, price: 7_900, badge: "popular" },
  { id: "live", coins: 1_400, bonus: 140, price: 15_700 },
  { id: "creator", coins: 3_500, bonus: 350, price: 39_300, badge: "creator" },
  { id: "max", coins: 7_000, bonus: 700, price: 78_700 },
];
export const TIKTOK_MIN_COINS = 70;
export const TIKTOK_MAX_COINS = 1_000_000;
export const TIKTOK_UNIT_PRICE = 11.24;
export function normalizeCustomCoins(value: number | string): number {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Math.min(TIKTOK_MAX_COINS, Number.parseInt(digits, 10)) : 0;
}
export function customTikTokPack(coins: number): TikTokPack {
  return { id: "custom", coins, price: Math.round(coins * TIKTOK_UNIT_PRICE) };
}
export function formatTikTokNumber(value: number, language: "fr" | "en") {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}
