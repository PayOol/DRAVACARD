"use client";

import MainLayout from "@/components/layout/MainLayout";
import PaymentReceipt from "@/components/payment/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import {
  type PaymentOrder,
  PaymentApiError,
  getPaymentOrderStatus,
  readOrderToken,
  readCheckoutReturn,
} from "@/lib/payment-api";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import "./payment-result-embedded.css";

interface PaymentResultProps {
  status: "success" | "failure";
  orderToken?: string;
  providerLink?: string;
  embedded?: boolean;
  onReturn?: () => void;
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
      fr: "Nous vérifions les informations de votre paiement.",
      en: "We are checking your payment details.",
    },
    notice: {
      fr: "Veuillez patienter. Le retour sur cette page ne confirme pas à lui seul le paiement.",
      en: "Please wait. Returning to this page does not, on its own, confirm payment.",
    },
  },
  pending: {
    title: { fr: "Paiement en attente", en: "Payment pending" },
    description: {
      fr: "Le prestataire n’a pas encore confirmé ce paiement. Aucun paiement n’est considéré comme validé pour le moment.",
      en: "The payment provider has not confirmed this payment yet. No payment is considered validated at this time.",
    },
    notice: {
      fr: "Ne payez pas une seconde fois pendant la vérification. Vous pouvez vérifier à nouveau le statut si nécessaire.",
      en: "Do not pay again while verification is in progress. You can check the status again if needed.",
    },
  },
  failed: {
    title: { fr: "Paiement non finalisé", en: "Payment not completed" },
    description: {
      fr: "Ce paiement n’a pas été finalisé. Il peut avoir échoué, avoir été annulé ou avoir expiré.",
      en: "This payment was not completed. It may have failed, been cancelled or expired.",
    },
    notice: {
      fr: "Aucun reçu de paiement n’a été généré. Si vous pensez avoir été débité, vérifiez avant de recommencer afin d’éviter un double paiement.",
      en: "No payment receipt was generated. If you think you were charged, check before trying again to avoid a duplicate payment.",
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

export default function PaymentResult({
  status,
  orderToken: suppliedToken,
  providerLink,
  embedded = false,
  onReturn,
}: PaymentResultProps) {
  const { language } = useLanguage();
  const [verification, setVerification] =
    useState<VerificationState>("checking");
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [canRetry, setCanRetry] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const orderTokenRef = useRef<string | null | undefined>(suppliedToken);
  const checkoutReturnRef = useRef<unknown>(undefined);
  const Wrapper = embedded ? Fragment : MainLayout;

  // biome-ignore lint/correctness/useExhaustiveDependencies: an explicit retry restarts this bounded verification cycle.
  useEffect(() => {
    // Local visual preview only; never fabricate a verified provider order.
    if (
      process.env.NODE_ENV === "development" &&
      !embedded &&
      suppliedToken === undefined &&
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

    // SoleasPay returns its Checkout payload here; only the server can update
    // the matching order. The pathname alone never confirms a payment.
    if (orderTokenRef.current === undefined) {
      orderTokenRef.current = readOrderToken(window.location.hash);
      checkoutReturnRef.current = readCheckoutReturn(window.location.search);
      // Keep the capability only in this mounted result, including retries.
      // It must not remain in history, copied links or printed receipts.
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    const orderToken = orderTokenRef.current;
    setCanRetry(Boolean(orderToken));
    setOrder(null);
    if (!orderToken) {
      setVerification(status === "failure" ? "failed" : "missing");
      setIsChecking(false);
      return;
    }

    let active = true;
    let delay = 2000;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let lastOrder: PaymentOrder | null = null;
    let paidReceipt = false;
    const controller = new AbortController();
    // The dedicated failure URL is an explicit checkout outcome, not proof of
    // payment truth. Show the failure surface immediately while still allowing
    // a verified paid response to override it if the provider already settled.
    setVerification(status === "failure" ? "failed" : "checking");
    setIsChecking(status !== "failure");

    const deadlineTimer = setTimeout(() => {
      controller.abort();
      clearTimeout(pollTimer);
      if (active) {
        setVerification(
          paidReceipt
            ? "paid"
            : status === "failure"
              ? "failed"
              : lastOrder
                ? "pending"
                : "unconfirmed",
        );
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
        const result = await getPaymentOrderStatus(
          orderToken,
          controller.signal,
          checkoutReturnRef.current,
        );
        if (!active || controller.signal.aborted) return;
        if (result.service !== "cards") {
          if (paidReceipt) {
            setVerification("paid");
            setIsChecking(false);
            clearTimeout(deadlineTimer);
            clearTimeout(pollTimer);
            return;
          }
          finish("unconfirmed");
          return;
        }
        lastOrder = result;
        if (result.status === "paid" && result.verified === true) {
          paidReceipt = true;
          setOrder(result);
          setVerification("paid");
          setIsChecking(false);
          // A verified receipt is final. Keep polling only while the optional
          // EmailJS notification is still pending, using the same order token.
          if (result.notification !== "pending") {
            clearTimeout(deadlineTimer);
            clearTimeout(pollTimer);
            return;
          }
        } else if (paidReceipt) {
          // Never regress a receipt after it has been verified.
          setVerification("paid");
          setIsChecking(false);
        } else if (
          result.status === "failed" ||
          result.status === "cancelled" ||
          result.status === "expired"
        ) {
          finish("failed");
          return;
        } else if (status === "failure") {
          // SoleasPay can return to failureUrl without soleaspay_data. In that
          // case the server correctly keeps the order pending, but the browser
          // must remain on the failure surface instead of showing "unconfirmed".
          finish("failed");
          return;
        } else {
          setVerification("pending");
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        if (paidReceipt) {
          // Notification transport errors must never hide an already verified receipt.
          setVerification("paid");
          setIsChecking(false);
          if (error instanceof PaymentApiError && !error.retryable) {
            clearTimeout(deadlineTimer);
            clearTimeout(pollTimer);
            return;
          }
        } else {
          if (status === "failure") {
            finish("failed");
            return;
          }
          if (error instanceof PaymentApiError && !error.retryable) {
            finish("unconfirmed");
            return;
          }
          setVerification("checking");
        }
        if (error instanceof PaymentApiError) retryAfterMs = error.retryAfterMs;
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
  }, [attempt, status, embedded, suppliedToken]);

  const isPaid = verification === "paid" && order?.verified === true;
  const isSimulation =
    process.env.NODE_ENV === "development" && verification === "simulation";
  if ((isPaid && order) || isSimulation) {
    return (
      <Wrapper>
        <PaymentReceipt
          amount={isPaid && order ? order.amount : 5000}
          createdAt={
            isPaid && order ? order.createdAt : Date.UTC(2026, 8, 5, 12)
          }
          simulation={isSimulation}
          onReturn={onReturn}
        />
      </Wrapper>
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
    <Wrapper>
      <section className="payment-result-screen flex min-h-[65vh] items-center bg-gradient-to-b from-slate-50 to-white px-4 py-12 dark:from-[#0b1220] dark:to-[#111c2e] md:py-20">
        <div className="payment-result-container mx-auto w-full max-w-2xl">
          <div className="payment-result-card rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg dark:border-[#304159] dark:bg-[#111c2e] dark:shadow-black/20 md:p-10">
            <div className="payment-result-icon mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-[#312817] dark:text-amber-200">
              <Icon
                aria-hidden="true"
                className={`h-9 w-9 ${isChecking ? "animate-spin" : ""}`}
              />
            </div>

            <div aria-live="polite" aria-atomic="true">
              <h1 className="payment-result-title text-2xl font-bold text-slate-900 dark:text-[#e6edf7] md:text-3xl">
                {copy.title[language]}
              </h1>
              <p className="payment-result-description mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600 dark:text-[#b3c1d5] md:text-lg">
                {copy.description[language]}
              </p>

              <div className="payment-result-notice mx-auto mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900 dark:border-[#6b541f] dark:bg-[#312817] dark:text-amber-200">
                {copy.notice[language]}
              </div>
            </div>

            <div className="payment-result-actions mt-8 flex flex-wrap justify-center gap-3">
              {providerLink && canRetry && verification !== "failed" && (
                <Button asChild variant="outline">
                  <a
                    href={providerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {language === "fr"
                      ? "Ouvrir la page de validation de l’opérateur"
                      : "Open the operator’s validation page"}
                  </a>
                </Button>
              )}
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
              <Button
                asChild={!onReturn}
                onClick={onReturn}
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                {onReturn ? (
                  language === "fr" ? (
                    "Retour au catalogue"
                  ) : (
                    "Back to catalogue"
                  )
                ) : (
                  <Link href="/">
                    {language === "fr"
                      ? "Retour au catalogue"
                      : "Back to catalogue"}
                  </Link>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Wrapper>
  );
}
