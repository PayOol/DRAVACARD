import PaymentResult from "@/components/payment/PaymentResult";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement non finalisé | DRAVA",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentFailurePage() {
  return <PaymentResult status="failure" />;
}
