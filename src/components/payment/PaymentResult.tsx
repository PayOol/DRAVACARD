"use client";

import MainLayout from "@/components/layout/MainLayout";
import PaymentReceipt from "@/components/payment/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import {
  type LeekPayOrder,
  PaymentApiError,
  getLeekPayOrderStatus,
  readOrderToken,
} from "@/lib/leekpay";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PaymentResultProps {
  status: "success" | "failure";
}

type VerificationState =
  | "checking"
  | "pending"
  | "paid"
  | "failed"
  | "unconfirmed"
  | "missing"
  | "simulation";

const content = {
  checking: {
    title: { fr: "Vérification du paiement", en: "Checking your payment" },
    description: {
      fr: "Nous vérifions le statut de votre paiement auprès de LeekPay.",
      en: "We are checking your payment status with LeekPay.",
    },
    notice: {
      fr: "Veuillez patienter. Le retour sur cette page ne confirme pas à lui seul le paiement.",
      en: "Please wait. Returning to this page does not, on its own, confirm payment.",
    },
  },
  pending: {
    title: { fr: "Paiement en attente", en: "Payment pending" },
    description: {
      fr: "LeekPay n’a pas encore confirmé ce paiement. Aucun paiement n’est considéré comme validé pour le moment.",
      en: "LeekPay has not confirmed this payment yet. No payment is considered validated at this time.",
    },
    notice: {
      fr: "Ne payez pas une seconde fois pendant la vérification. Vous pouvez vérifier à nouveau le statut si nécessaire.",
      en: "Do not pay again while verification is in progress. You can check the status again if needed.",
    },
  },
  failed: {
    title: { fr: "Paiement non finalisé", en: "Payment not completed" },
    description: {
      fr: "LeekPay indique que ce paiement a échoué, a été annulé ou a expiré.",
      en: "LeekPay reports that this payment failed, was cancelled or expired.",
    },
    notice: {
      fr: "Vous pouvez retourner au catalogue et réessayer lorsque vous le souhaitez.",
      en: "You can return to the catalogue and try again whenever you wish.",
    },
  },
  unconfirmed: {
    title: { fr: "Paiement non confirmé", en: "Payment not confirmed" },
    description: {
      fr: "Le statut du paiement n’a pas pu être vérifié. Cela ne signifie pas que votre paiement a échoué.",
      en: "The payment status could not be verified. This does not mean your payment failed.",
    },
    notice: {
      fr: "Vérifiez à nouveau le statut avant de recommencer un paiement afin d’éviter un double paiement.",
      en: "Check the status again before starting another payment to avoid paying twice.",
    },
  },
  missing: {
    title: { fr: "Paiement non confirmé", en: "Payment not confirmed" },
    description: {
      fr: "Aucune référence de commande valide n’est présente sur cette page.",
      en: "There is no valid order reference on this page.",
    },
    notice: {
      fr: "Ouvrir directement cette page ne prouve pas qu’un paiement a été effectué.",
      en: "Opening this page directly is not proof that a payment was made.",
    },
  },
} as const;

export default function PaymentResult({ status }: PaymentResultProps) {
  const { language } = useLanguage();
  const [verification, setVerification] =
    useState<VerificationState>("checking");
  const [order, setOrder] = useState<LeekPayOrder | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [canRetry, setCanRetry] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: an explicit retry restarts this bounded verification cycle.
  useEffect(() => {
    // Local visual preview only; never fabricate a verified provider order.
    if (
      process.env.NODE_ENV === "development" &&
      status === "success" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) &&
      window.location.hash === "#simulation"
    ) {
      setVerification("simulation");
      setOrder(null);
      setCanRetry(false);
      setIsChecking(false);
      return;
    }

    // Neither the return pathname nor a query parameter is payment evidence.
    const orderToken = readOrderToken(window.location.hash);
    setCanRetry(Boolean(orderToken));
    setOrder(null);
    if (!orderToken) {
      setVerification("missing");
      setIsChecking(false);
      return;
    }

    let active = true;
    let delay = 2000;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let lastOrder: LeekPayOrder | null = null;
    const controller = new AbortController();
    setVerification("checking");
    setIsChecking(true);

    const deadlineTimer = setTimeout(() => {
      controller.abort();
      clearTimeout(pollTimer);
      if (active) {
        setVerification(lastOrder ? "pending" : "unconfirmed");
        setIsChecking(false);
      }
    }, 90000);

    const finish = (next: VerificationState) => {
      clearTimeout(deadlineTimer);
      clearTimeout(pollTimer);
      setVerification(next);
      setIsChecking(false);
    };

    const poll = async () => {
      let retryAfterMs = 0;
      try {
        const result = await getLeekPayOrderStatus(
          orderToken,
          controller.signal,
        );
        if (!active || controller.signal.aborted) return;
        lastOrder = result;
        setOrder(result);
        if (result.status === "paid" && result.verified === true) {
          finish("paid");
          return;
        }
        if (
          result.status === "failed" ||
          result.status === "cancelled" ||
          result.status === "expired"
        ) {
          finish("failed");
          return;
        }
        setVerification("pending");
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        if (error instanceof PaymentApiError && !error.retryable) {
          finish("unconfirmed");
          return;
        }
        if (error instanceof PaymentApiError) retryAfterMs = error.retryAfterMs;
        setVerification("checking");
      }
      if (active && !controller.signal.aborted) {
        pollTimer = setTimeout(poll, Math.max(delay, retryAfterMs));
        delay = Math.min(delay * 2, 10000);
      }
    };

    void poll();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(pollTimer);
      clearTimeout(deadlineTimer);
    };
  }, [attempt, status]);

  const isPaid = verification === "paid" && order?.verified === true;
  const isSimulation =
    process.env.NODE_ENV === "development" && verification === "simulation";
  if ((isPaid && order) || isSimulation) {
    return (
      <MainLayout>
        <PaymentReceipt
          amount={isPaid && order ? order.amount : 5000}
          createdAt={
            isPaid && order ? order.createdAt : Date.UTC(2026, 8, 5, 12)
          }
          simulation={isSimulation}
        />
      </MainLayout>
    );
  }

  const copy =
    content[
      verification === "paid" || verification === "simulation"
        ? "unconfirmed"
        : verification
    ];
  const Icon = isChecking ? LoaderCircle : AlertTriangle;

  return (
    <MainLayout>
      <section className="payment-result-screen flex min-h-[65vh] items-center bg-gradient-to-b from-slate-50 to-white px-4 py-12 md:py-20">
        <div className="payment-result-container mx-auto w-full max-w-2xl">
          <div className="payment-result-card rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg md:p-10">
            <div className="payment-result-icon mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Icon
                aria-hidden="true"
                className={`h-9 w-9 ${isChecking ? "animate-spin" : ""}`}
              />
            </div>

            <div aria-live="polite" aria-atomic="true">
              <h1 className="payment-result-title text-2xl font-bold text-slate-900 md:text-3xl">
                {verification === "missing" && status === "failure"
                  ? language === "fr"
                    ? "Paiement non finalisé"
                    : "Payment not completed"
                  : copy.title[language]}
              </h1>
              <p className="payment-result-description mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600 md:text-lg">
                {copy.description[language]}
              </p>

              <div className="payment-result-notice mx-auto mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
                {copy.notice[language]}
              </div>
            </div>

            <div className="payment-result-actions mt-8 flex flex-wrap justify-center gap-3">
              {canRetry &&
                !isChecking &&
                !isPaid &&
                verification !== "failed" && (
                  <Button
                    onClick={() => setAttempt((current) => current + 1)}
                    type="button"
                    variant="outline"
                  >
                    {language === "fr" ? "Vérifier à nouveau" : "Check again"}
                  </Button>
                )}
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/">
                  {language === "fr"
                    ? "Retour au catalogue"
                    : "Back to catalogue"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
