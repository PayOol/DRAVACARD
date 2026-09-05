"use client";

import MainLayout from "@/components/layout/MainLayout";
import { useLanguage } from "@/lib/language-context";
import { PaymentApiError, readOrderToken } from "@/lib/leekpay";
import { rememberTikTokOrder } from "@/lib/tiktok-history";
import { type TikTokOrder, getTikTokOrderStatus } from "@/lib/tiktok-payment";
import { playFailure, playSuccess } from "@/lib/tiktok-sound";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TikTokWhatsAppPicker } from "./TikTokHelp";
import "./tiktok-checkout.css";
import { TikTokReceipt } from "./TikTokSuccess";
export { TikTokReceipt } from "./TikTokSuccess";

export function TikTokVerification({
  orderToken,
  providerLink,
  onReturnHome,
}: {
  orderToken: string | null;
  providerLink?: string;
  onReturnHome?: () => void;
}) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const [order, setOrder] = useState<TikTokOrder | null>(null);
  const [checking, setChecking] = useState(Boolean(orderToken));
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const terminalSound = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retries start a fresh bounded verification cycle.
  useEffect(() => {
    if (!orderToken) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 3000;
    setChecking(true);
    setUnavailable(false);
    const deadline = setTimeout(() => {
      controller.abort();
      clearTimeout(timer);
      if (active) setChecking(false);
    }, 300000);
    const finish = () => {
      clearTimeout(deadline);
      clearTimeout(timer);
      setChecking(false);
    };
    const poll = async () => {
      let retryAfter = 0;
      try {
        const result = await getTikTokOrderStatus(
          orderToken,
          controller.signal,
        );
        if (!active || controller.signal.aborted) return;
        setOrder((previous) => {
          // A temporary receipt-store outage must not erase already verified
          // details while the server retries fulfillment for this same order.
          if (
            previous?.orderId === result.orderId &&
            previous.status === "paid" &&
            previous.verified &&
            result.status === "paid" &&
            result.verified
          ) {
            return {
              ...result,
              username: result.username ?? previous.username,
              transactionReference:
                result.transactionReference ?? previous.transactionReference,
            };
          }
          return result;
        });
        setUnavailable(false);
        rememberTikTokOrder(result);
        const paid = result.status === "paid" && result.verified;
        const failed = ["failed", "cancelled", "expired"].includes(
          result.status,
        );
        if ((paid || failed) && terminalSound.current !== result.orderId) {
          terminalSound.current = result.orderId;
          if (paid) playSuccess();
          else playFailure();
        }
        if ((paid && result.notification === "sent") || failed) {
          finish();
          return;
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setUnavailable(true);
        if (error instanceof PaymentApiError && !error.retryable) {
          finish();
          return;
        }
        if (error instanceof PaymentApiError) retryAfter = error.retryAfterMs;
      }
      if (active && !controller.signal.aborted) {
        timer = setTimeout(poll, Math.max(delay, retryAfter));
        delay = Math.min(10000, delay * 1.5);
      }
    };
    void poll();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
    };
  }, [orderToken, attempt]);
  if (order?.status === "paid" && order.verified)
    return (
      <TikTokReceipt
        order={order}
        notificationRetrying={checking}
        onRetryNotification={() => setAttempt((value) => value + 1)}
        onReturnHome={onReturnHome}
      />
    );
  const failed =
    order && ["failed", "cancelled", "expired"].includes(order.status);
  const title = !orderToken
    ? fr
      ? "Paiement non confirmé"
      : "Payment not confirmed"
    : failed
      ? fr
        ? "Paiement non finalisé"
        : "Payment not completed"
      : unavailable
        ? fr
          ? "Vérification indisponible"
          : "Verification unavailable"
        : order
          ? fr
            ? "Paiement en attente"
            : "Payment pending"
          : fr
            ? "Vérification du paiement"
            : "Checking your payment";
  const description = !orderToken
    ? fr
      ? "Aucune référence de commande valide n’est présente. Cette page seule ne confirme aucun paiement."
      : "There is no valid order reference. This page alone does not confirm a payment."
    : failed
      ? fr
        ? "Le prestataire indique que le paiement a échoué, a été annulé ou a expiré."
        : "The provider reports that the payment failed, was cancelled or expired."
      : unavailable
        ? fr
          ? "Le statut n’a pas pu être vérifié. Cela ne signifie pas que le paiement a échoué."
          : "The status could not be verified. This does not mean the payment failed."
        : fr
          ? "Consultez votre téléphone pour valider le paiement. Nous attendons la confirmation du prestataire."
          : "Check your phone to approve the payment. We are waiting for the provider’s confirmation.";
  return (
    <section
      className="tiktok-verification"
      aria-live="polite"
      aria-atomic="true"
    >
      {checking ? (
        <LoaderCircle
          className="tiktok-result-icon tiktok-spinner"
          size={44}
          aria-hidden="true"
        />
      ) : (
        <TriangleAlert
          className="tiktok-result-icon"
          size={44}
          aria-hidden="true"
        />
      )}
      <h2>{title}</h2>
      <p>{description}</p>
      {orderToken && !failed && (
        <p className="tiktok-notice">
          {fr
            ? "Ne payez pas une seconde fois pendant la vérification."
            : "Do not pay again while verification is in progress."}
        </p>
      )}
      {providerLink && !failed && (
        <a
          className="tiktok-secondary"
          href={providerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          {fr
            ? "Ouvrir la page de validation de l’opérateur"
            : "Open the operator’s validation page"}
        </a>
      )}
      {orderToken && !checking && !failed && (
        <button
          className="tiktok-primary"
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          {fr ? "Vérifier à nouveau" : "Check again"}
        </button>
      )}
      <div className="tiktok-result-support">
        <TikTokWhatsAppPicker />
      </div>
    </section>
  );
}

export default function TikTokResult() {
  const { language } = useLanguage();
  const token = useRef<string | null>(null);
  const consumed = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!consumed.current) {
      consumed.current = true;
      token.current = readOrderToken(window.location.hash);
      // Retain the capability only in this mounted page; never in history/storage.
      window.history.replaceState(null, "", window.location.pathname);
    }
    setReady(true);
  }, []);
  return (
    <MainLayout>
      <div className="tiktok-result-page">
        <h1 className="sr-only">
          {language === "fr"
            ? "Paiement des pièces TikTok"
            : "TikTok coin payment"}
        </h1>
        {ready && <TikTokVerification orderToken={token.current} />}
        <Link className="tiktok-secondary tiktok-return" href="/#tiktok">
          {language === "fr"
            ? "Retour aux pièces TikTok"
            : "Back to TikTok coins"}
        </Link>
      </div>
    </MainLayout>
  );
}
