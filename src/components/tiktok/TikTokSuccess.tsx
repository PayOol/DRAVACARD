"use client";

import DravaLogo from "@/components/layout/DravaLogo";
import { useLanguage } from "@/lib/language-context";
import { TIKTOK_PROVIDER_NAMES, type TikTokOrder } from "@/lib/tiktok-payment";
import {
  downloadTikTokReceipt,
  formatTikTokReceiptAmount,
} from "@/lib/tiktok-receipt";
import { playTap } from "@/lib/tiktok-sound";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Download,
  FileCheck2,
  Headphones,
  Home,
  LoaderCircle,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { TikTokSoundToggle, TikTokWhatsAppPicker } from "./TikTokHelp";
import "./tiktok-success.css";

interface TikTokReceiptProps {
  order: TikTokOrder;
  notificationRetrying?: boolean;
  onRetryNotification?: () => void;
  onReturnHome?: () => void;
}

export function TikTokReceipt({
  order,
  notificationRetrying = false,
  onRetryNotification,
  onReturnHome,
}: TikTokReceiptProps) {
  const { language } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasFocusedTitle = useRef(false);
  const titleId = useId();
  const detailsId = useId();
  useEffect(() => {
    if (
      order.status !== "paid" ||
      !order.verified ||
      hasFocusedTitle.current ||
      !titleRef.current
    ) {
      return;
    }
    hasFocusedTitle.current = true;
    titleRef.current.focus();
  }, [order.status, order.verified]);
  const fr = language === "fr";
  const locale = fr ? "fr-FR" : "en-US";
  const number = (value: number) => value.toLocaleString(locale);
  const unavailable = fr ? "Non disponible" : "Not available";
  const username = order.username?.trim().replace(/^@+/, "");
  const reference = order.transactionReference?.trim();
  const supportMessage = fr
    ? `Bonjour DRAVA, j’ai besoin d’assistance pour la commande ${order.orderId}.`
    : `Hello DRAVA, I need help with order ${order.orderId}.`;
  const details = [
    {
      label: fr ? "N° de commande" : "Order number",
      value: order.orderId,
      Icon: FileCheck2,
    },
    {
      label: fr ? "Référence de transaction" : "Transaction reference",
      value: reference || unavailable,
      Icon: WalletCards,
    },
    {
      label: fr ? "Compte TikTok" : "TikTok account",
      value: username
        ? username.includes("@")
          ? username
          : `@${username}`
        : unavailable,
      Icon: UserRound,
    },
    {
      label: fr ? "Recharge" : "Recharge",
      value: `${number(order.coins + order.bonus)} ${fr ? "pièces" : "coins"}`,
      Icon: Coins,
    },
    {
      label: fr ? "Montant de la commande" : "Order amount",
      value: formatTikTokReceiptAmount(order, language),
      Icon: ReceiptText,
    },
    {
      label: fr ? "Date de commande" : "Order date",
      value: new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Douala",
      }).format(new Date(order.createdAt)),
      Icon: Clock3,
    },
    ...(order.bonus
      ? [
          {
            label: fr ? "Dont bonus" : "Including bonus",
            value: `${number(order.bonus)} ${fr ? "pièces offertes" : "free coins"}`,
            Icon: Sparkles,
          },
        ]
      : []),
    {
      label: fr ? "Prestataire" : "Provider",
      value: TIKTOK_PROVIDER_NAMES[order.provider],
      Icon: ShieldCheck,
    },
  ];

  const download = async () => {
    if (downloading) return;
    playTap();
    setDownloading(true);
    setDownloadError(false);
    try {
      await downloadTikTokReceipt(order, language);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };
  const returnHome = () => {
    playTap();
    onReturnHome?.();
  };

  if (order.status !== "paid" || !order.verified) return null;

  return (
    <section
      className="tiktok-receipt tiktok-success"
      aria-labelledby={titleId}
    >
      <div className="tiktok-success-print-brand">
        <DravaLogo />
      </div>
      <div className="tiktok-success-toolbar">
        <Link
          href="/#tiktok"
          className="tiktok-success-store-link"
          onClick={returnHome}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {fr ? "Retour à la boutique" : "Back to the store"}
        </Link>
        <div className="tiktok-success-sound-control">
          <TikTokSoundToggle />
        </div>
      </div>

      <div className="tiktok-success-hero">
        <div className="tiktok-success-status-main">
          <span className="tiktok-success-status-icon" aria-hidden="true">
            <CheckCircle2 size={36} />
          </span>
          <div className="tiktok-success-copy">
            <span className="tiktok-success-kicker">
              {fr ? "Commande enregistrée" : "Order recorded"}
            </span>
            <h2 id={titleId} ref={titleRef} tabIndex={-1}>
              {fr ? "Paiement réussi !" : "Payment successful!"}
            </h2>
            <p className="tiktok-success-thanks">
              {fr ? "Merci pour votre achat !" : "Thank you for your purchase!"}
            </p>
            <p className="tiktok-success-delivery">
              {fr
                ? "Si vous avez saisi les identifiants réels de votre compte TikTok, vous recevrez vos pièces dans un délai de 10 minutes. Si vous ne recevez pas vos pièces dans ce délai, veuillez contacter notre service client sur"
                : "If you entered your real TikTok account credentials, you will receive your coins within 10 minutes. If you do not receive them within that time, please contact our customer service on"}{" "}
              <TikTokWhatsAppPicker
                className="tiktok-success-whatsapp-inline"
                message={supportMessage}
              >
                WhatsApp
              </TikTokWhatsAppPicker>
              .
            </p>
          </div>
        </div>

        {order.notification === "pending" && (
          <div className="tiktok-success-transmission" aria-live="polite">
            <span
              className="tiktok-success-transmission-icon"
              aria-hidden="true"
            >
              {notificationRetrying ? (
                <LoaderCircle className="tiktok-success-spinner" size={20} />
              ) : (
                <Clock3 size={20} />
              )}
            </span>
            <div>
              <strong>
                {fr ? "Transmission de votre commande…" : "Sending your order…"}
              </strong>
              <p>
                {fr
                  ? "Votre paiement est confirmé. Nous transmettons les informations nécessaires à votre recharge."
                  : "Your payment is confirmed. We are sending the information needed to process your recharge."}
              </p>
              {onRetryNotification && !notificationRetrying && (
                <button
                  type="button"
                  className="tiktok-success-retry"
                  onClick={onRetryNotification}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  {fr ? "Réessayer la transmission" : "Retry sending the order"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="tiktok-receipt-actions tiktok-success-actions">
          <button
            type="button"
            className="tiktok-primary"
            onClick={() => void download()}
            disabled={downloading}
            aria-busy={downloading}
          >
            {downloading ? (
              <LoaderCircle
                className="tiktok-success-spinner"
                size={19}
                aria-hidden="true"
              />
            ) : (
              <Download size={19} aria-hidden="true" />
            )}
            {downloading
              ? fr
                ? "Création du reçu…"
                : "Creating receipt…"
              : fr
                ? "Télécharger le reçu PDF"
                : "Download PDF receipt"}
          </button>
          <Link href="/" className="tiktok-secondary" onClick={returnHome}>
            <Home size={18} aria-hidden="true" />
            {fr ? "Retour à l’accueil" : "Back to home"}
          </Link>
          <button
            type="button"
            className="tiktok-success-print"
            onClick={() => window.print()}
          >
            <Printer size={18} aria-hidden="true" />
            {fr ? "Imprimer" : "Print"}
          </button>
        </div>
        {downloadError && (
          <p className="tiktok-success-download-error" role="alert">
            {fr
              ? "Le reçu n’a pas pu être généré. Veuillez réessayer ou utiliser l’impression."
              : "The receipt could not be generated. Please try again or use the print option."}
          </p>
        )}
      </div>

      <section className="tiktok-success-details" aria-labelledby={detailsId}>
        <div className="tiktok-success-section-heading">
          <span aria-hidden="true">
            <ReceiptText size={22} />
          </span>
          <div>
            <h3 id={detailsId}>
              {fr ? "Détails de la commande" : "Order details"}
            </h3>
            <p>
              {fr
                ? "Les informations utiles de votre achat"
                : "Useful information about your purchase"}
            </p>
          </div>
        </div>
        <dl className="tiktok-success-detail-grid">
          {details.map(({ label, value, Icon }) => (
            <div className="tiktok-success-detail-item" key={label}>
              <dt>
                <span className="tiktok-success-detail-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span className="tiktok-success-detail-label">{label}</span>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="tiktok-success-keep-receipt">
          <span aria-hidden="true">
            <Check size={18} />
          </span>
          <div>
            <strong>{fr ? "Gardez votre reçu" : "Keep your receipt"}</strong>
            <p>
              {fr
                ? "Il contient les références utiles pour toute demande d’assistance."
                : "It contains the references needed for any support request."}
            </p>
          </div>
        </div>
      </section>

      <div className="tiktok-success-guarantees">
        <span>
          <ShieldCheck size={17} aria-hidden="true" />
          {fr ? "Paiement sécurisé" : "Secure payment"}
        </span>
        <span>
          <CheckCircle2 size={17} aria-hidden="true" />
          {fr ? "Données protégées" : "Protected data"}
        </span>
        <TikTokWhatsAppPicker
          className="tiktok-success-support-link"
          message={supportMessage}
        >
          <Headphones size={17} aria-hidden="true" />
          {fr ? "Assistance réactive" : "Responsive support"}
        </TikTokWhatsAppPicker>
      </div>
      <TikTokWhatsAppPicker
        className="tiktok-success-floating"
        message={supportMessage}
      >
        <span className="tiktok-success-floating-label">WhatsApp</span>
      </TikTokWhatsAppPicker>
    </section>
  );
}
