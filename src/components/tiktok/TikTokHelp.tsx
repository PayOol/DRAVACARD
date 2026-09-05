"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Headphones,
  Info,
  MessageCircle,
  Play,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLanguage } from "@/lib/language-context";
import {
  isSoundEnabled,
  playModalClose,
  playModalOpen,
  playTap,
  subscribeToSound,
  toggleSound,
} from "@/lib/tiktok-sound";
import {
  buildSupportWhatsAppHref,
  SUPPORT_WHATSAPP_CONTACTS,
} from "@/lib/tiktok-support";
import "./tiktok-help.css";

const copy = {
  fr: {
    videoTitle: "Besoin d’aide pour acheter vos pièces ?",
    videoSubtitle: "Regardez cette vidéo",
    watchVideo: "Regarder le tutoriel vidéo",
    support: "Assistance et support",
    supportTitle: "Assistance & Support",
    supportSubtitle:
      "Besoin d’aide avec votre commande ou votre recharge ? Notre équipe est à votre disposition 7j/7.",
    supportBadge: "Service client",
    whatsappTitle: "Support WhatsApp direct",
    online: "En ligne 7j/7 · Réponse rapide",
    contact: "Discuter sur WhatsApp",
    faqTitle: "Questions fréquentes",
    delivery: "Délai de réception des pièces",
    deliveryAnswer:
      "Vos pièces TikTok sont créditées en 5 à 15 minutes dès confirmation du paiement.",
    security: "Sécurité du compte",
    securityAnswer:
      "Vos identifiants sont strictement confidentiels et uniquement utilisés pour livrer votre recharge.",
    issue: "Commande en attente ou réclamation",
    issueAnswer:
      "Munissez-vous de votre référence de commande et contactez notre support sur WhatsApp.",
    pickerTitle: "Contacter le service client",
    pickerDescription: "Retrouvez notre service client DRAVA sur WhatsApp.",
    pickerEyebrow: "WhatsApp DRAVA",
    openContact: "Contacter {service} sur WhatsApp",
    message:
      "Bonjour DRAVA, j’ai besoin d’assistance concernant mes pièces TikTok.",
    close: "Fermer",
    sound: "Effets sonores",
    enableSound: "Activer les sons d’interaction",
    muteSound: "Couper le son",
  },
  en: {
    videoTitle: "Need help buying your coins?",
    videoSubtitle: "Watch this video",
    watchVideo: "Watch tutorial video",
    support: "Help and support",
    supportTitle: "Help & Support",
    supportSubtitle:
      "Need help with your order or coin recharge? Our team is available 7 days a week.",
    supportBadge: "Customer service",
    whatsappTitle: "Direct WhatsApp support",
    online: "Online 7/7 · Fast response",
    contact: "Chat on WhatsApp",
    faqTitle: "Frequently asked questions",
    delivery: "Coin delivery time",
    deliveryAnswer:
      "Your TikTok coins are credited within 5 to 15 minutes after payment confirmation.",
    security: "Account security",
    securityAnswer:
      "Your credentials are kept strictly confidential and only used to deliver your order.",
    issue: "Pending order or issue",
    issueAnswer:
      "Keep your order reference ready and reach out to our WhatsApp support team.",
    pickerTitle: "Contact customer service",
    pickerDescription: "Reach our DRAVA customer service on WhatsApp.",
    pickerEyebrow: "DRAVA WhatsApp",
    openContact: "Contact {service} on WhatsApp",
    message: "Hello DRAVA, I need help with my TikTok coins.",
    close: "Close",
    sound: "Sound effects",
    enableSound: "Enable interaction sounds",
    muteSound: "Mute sounds",
  },
} as const;

function HelpDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  className = "",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.inert = !open;
  }, [open]);

  const changeOpen = (next: boolean) => {
    if (next) playModalOpen();
    else {
      if (contentRef.current) contentRef.current.inert = true;
      playModalClose();
    }
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild ref={triggerRef}>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="tiktok-help-overlay" />
        <Dialog.Content
          ref={contentRef}
          className={`tiktok-help-dialog ${className}`}
          onCloseAutoFocus={(event) => {
            if (!triggerRef.current?.getClientRects().length) {
              event.preventDefault();
              const tabs = document.querySelectorAll<HTMLElement>(
                '.catalog-tab[aria-selected="true"]',
              );
              Array.from(tabs)
                .find((tab) => tab.getClientRects().length > 0)
                ?.focus();
            }
          }}
        >
          <div className="tiktok-help-dialog-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close
              className="tiktok-help-close"
              aria-label={copy[language].close}
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="tiktok-help-description">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TikTokWhatsAppPicker({
  children,
  className = "",
  message,
}: {
  children?: ReactNode;
  className?: string;
  message?: string;
}) {
  const { language } = useLanguage();
  const t = copy[language];
  const [open, setOpen] = useState(false);
  return (
    <HelpDialog
      open={open}
      onOpenChange={setOpen}
      title={t.pickerTitle}
      description={t.pickerDescription}
      className="tiktok-help-contact-dialog"
      trigger={
        <button
          type="button"
          className={`tiktok-help-contact-button ${className}`}
        >
          <MessageCircle size={19} aria-hidden="true" />
          {children ?? t.contact}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      }
    >
      <p className="tiktok-help-eyebrow">{t.pickerEyebrow}</p>
      <div className="tiktok-help-contacts">
        {SUPPORT_WHATSAPP_CONTACTS.map((contact) => (
          <a
            key={contact.id}
            href={buildSupportWhatsAppHref(
              contact.whatsappNumber,
              message ?? t.message,
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.openContact.replace(
              "{service}",
              contact.label[language],
            )}
            onClick={() => {
              playTap();
              setOpen(false);
            }}
          >
            <MessageCircle size={23} aria-hidden="true" />
            <span>
              <strong>{contact.label[language]}</strong>
              <small>{contact.displayPhone}</small>
            </span>
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        ))}
      </div>
    </HelpDialog>
  );
}

export function TikTokHelp({ kind }: { kind: "video" | "support" }) {
  const { language } = useLanguage();
  const t = copy[language];
  const [open, setOpen] = useState(false);

  if (kind === "video") {
    return (
      <HelpDialog
        open={open}
        onOpenChange={setOpen}
        title={t.videoTitle}
        description={t.videoSubtitle}
        className="tiktok-help-video-dialog"
        trigger={
          <button
            type="button"
            className="tiktok-help-video-banner"
            aria-label={t.watchVideo}
          >
            <span className="tiktok-help-video-copy">
              <strong>{t.videoTitle}</strong>
              <span>
                {t.videoSubtitle} <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
            <span className="tiktok-help-thumbnail">
              <img
                src="https://img.youtube.com/vi/AZgaA8ufCzs/maxresdefault.jpg"
                alt=""
                loading="lazy"
                onError={(event) => {
                  const target = event.currentTarget;
                  if (!target.src.endsWith("/hqdefault.jpg"))
                    target.src =
                      "https://img.youtube.com/vi/AZgaA8ufCzs/hqdefault.jpg";
                }}
              />
              <span className="tiktok-help-play">
                <Play size={20} fill="currentColor" aria-hidden="true" />
              </span>
            </span>
          </button>
        }
      >
        <div className="tiktok-help-video-frame">
          {open && (
            <iframe
              src="https://www.youtube.com/embed/AZgaA8ufCzs?autoplay=1&rel=0"
              title={t.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>
      </HelpDialog>
    );
  }

  return (
    <HelpDialog
      open={open}
      onOpenChange={setOpen}
      title={t.supportTitle}
      description={t.supportSubtitle}
      trigger={
        <button type="button" className="tiktok-help-support-trigger">
          <Headphones size={18} aria-hidden="true" />
          {t.support}
        </button>
      }
    >
      <p className="tiktok-help-eyebrow">
        <Headphones size={15} aria-hidden="true" />
        {t.supportBadge}
      </p>
      <div className="tiktok-help-whatsapp-card">
        <strong>{t.whatsappTitle}</strong>
        <p>
          {SUPPORT_WHATSAPP_CONTACTS.map(
            (contact) => contact.displayPhone,
          ).join(" · ")}
        </p>
        <small>{t.online}</small>
        <TikTokWhatsAppPicker />
      </div>
      <section className="tiktok-help-faq" aria-label={t.faqTitle}>
        <h3>{t.faqTitle}</h3>
        <div>
          <strong>
            <Clock3 size={17} aria-hidden="true" />
            {t.delivery}
          </strong>
          <p>{t.deliveryAnswer}</p>
        </div>
        <div>
          <strong>
            <ShieldCheck size={17} aria-hidden="true" />
            {t.security}
          </strong>
          <p>{t.securityAnswer}</p>
        </div>
        <div>
          <strong>
            <Info size={17} aria-hidden="true" />
            {t.issue}
          </strong>
          <p>{t.issueAnswer}</p>
        </div>
      </section>
      <Dialog.Close className="tiktok-help-secondary">{t.close}</Dialog.Close>
    </HelpDialog>
  );
}

export function TikTokSoundToggle() {
  const { language } = useLanguage();
  const t = copy[language];
  const enabled = useSyncExternalStore(
    subscribeToSound,
    isSoundEnabled,
    () => true,
  );
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      className="tiktok-help-sound-toggle"
      onClick={() => toggleSound()}
      aria-pressed={enabled}
      aria-label={enabled ? t.muteSound : t.enableSound}
      title={enabled ? t.muteSound : t.enableSound}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{t.sound}</span>
    </button>
  );
}
