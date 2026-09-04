import PaymentResult from "@/components/payment/PaymentResult";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retour de paiement | DRAVA",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentSuccessPage() {
  return <PaymentResult status="success" />;
}
