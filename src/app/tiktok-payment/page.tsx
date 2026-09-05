import TikTokResult from "@/components/tiktok/TikTokResult";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TikTokPaymentPage() {
  return <TikTokResult />;
}
