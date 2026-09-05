"use client";

import { SebPayForm } from "@/components/payment/SebPayForm";
import {
  type PaymentProviderState,
  SharedPaymentProviders,
} from "@/components/payment/SharedPaymentProviders";
import { CheckoutPanel, CheckoutShell } from "@/components/ui/CheckoutShell";
import { detectCustomerLocation } from "@/lib/customer-location";
import { useLanguage } from "@/lib/language-context";
import {
  PaymentApiError,
  type PaymentInput,
  type PaymentSelection,
  createPaymentCheckout,
} from "@/lib/payment-api";
import { normalizeCustomerEmail } from "@/lib/payment-customer";
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from "@/lib/payment-providers";
import { MOBILE_LAYOUT_QUERY } from "@/lib/responsive-layout";
import type { TikTokPack } from "@/lib/tiktok-catalog";
import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  dialCodes,
} from "@/lib/tiktok-countries";
import { rememberTikTokOrder } from "@/lib/tiktok-history";
import { getTikTokOrderStatus } from "@/lib/tiktok-payment";
import {
  playError,
  playModalClose,
  playStep,
  playToggle,
} from "@/lib/tiktok-sound";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TikTokVerification } from "./TikTokResult";
import "../ui/checkout-mobile.css";
import "./tiktok-checkout.css";
import "../ui/checkout-content.css";

type Step = 1 | 2 | 3 | 4;
export function TikTokCheckout({
  pack,
  onClose: onClosed,
}: { pack: TikTokPack; onClose: () => void }) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const reducedMotion = useReducedMotion() === true;
  const [step, setStep] = useState<Step>(1);
  const [accepted, setAccepted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("leekpay");
  const [providerState, setProviderState] = useState<PaymentProviderState>({
    providers: null,
    loading: true,
    error: false,
  });
  const selectedProvider = PAYMENT_PROVIDERS.find(
    (item) => item.id === provider,
  );
  const mobileMoney = selectedProvider?.flow === "mobile-money";
  const selection: PaymentSelection = {
    service: "tiktok",
    productId: pack.id,
    ...(pack.id === "custom" ? { customCoins: pack.coins } : {}),
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [providerLink, setProviderLink] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(true);
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(
    null,
  );
  const closeRequested = useRef(false);
  const closeFinished = useRef(false);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const title = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Record<Step, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const manualCountry = useRef(false);
  const manualPhone = useRef(false);
  const locationRequested = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const historyId = useId();
  const historyAttached = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;
  const finishClose = useCallback(() => {
    if (!closeRequested.current || closeFinished.current) return;
    closeFinished.current = true;
    onClosedRef.current();
  }, []);
  const onClose = useCallback(() => {
    if (
      closeRequested.current ||
      (submitting.current && !navigation.current.orderToken)
    )
      return;
    playModalClose();
    closeRequested.current = true;
    requestController.current?.abort();
    setIsOpen(false);
    if (reducedMotion) finishClose();
  }, [finishClose, reducedMotion]);
  const goTo = useCallback(
    (next: Step) => {
      playStep(next > stepRef.current);
      const scroller = dialogElement?.querySelector<HTMLElement>(
        ".checkout-step-panel:not([aria-hidden]) .checkout-scroll",
      );
      if (scroller)
        scrollPositions.current[stepRef.current] = scroller.scrollTop;
      stepRef.current = next;
      setStep(next);
      setError(null);
    },
    [dialogElement],
  );
  const navigation = useRef({ onClose, goTo, orderToken });
  navigation.current = { onClose, goTo, orderToken };
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(finishClose, reducedMotion ? 0 : 260);
    return () => clearTimeout(timer);
  }, [finishClose, isOpen, reducedMotion]);
  useLayoutEffect(() => {
    if (dialogElement) dialogElement.inert = !isOpen;
  }, [dialogElement, isOpen]);
  useEffect(() => {
    title.current?.focus({ preventScroll: step !== 1 });
  }, [step]);
  useEffect(() => () => requestController.current?.abort(), []);
  useEffect(() => {
    const viewport = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const checkpoint = () =>
      window.history.pushState(
        { ...window.history.state, dravaTikTokCheckout: historyId },
        "",
      );
    const back = () => {
      if (
        closeRequested.current ||
        window.history.state?.dravaTikTokCheckout === historyId
      )
        return;
      if (submitting.current && !navigation.current.orderToken) {
        checkpoint();
        return;
      }
      if (stepRef.current === 1 || navigation.current.orderToken) {
        navigation.current.onClose();
        return;
      }
      navigation.current.goTo((stepRef.current - 1) as Step);
      checkpoint();
    };
    const attach = () => {
      if (!viewport.matches || historyAttached.current) return;
      historyAttached.current = true;
      if (window.history.state?.dravaTikTokCheckout !== historyId) checkpoint();
      window.addEventListener("popstate", back);
    };
    attach();
    viewport.addEventListener("change", attach);
    return () => {
      viewport.removeEventListener("change", attach);
      window.removeEventListener("popstate", back);
      historyAttached.current = false;
      queueMicrotask(() => {
        if (
          !historyAttached.current &&
          window.history.state?.dravaTikTokCheckout === historyId
        )
          window.history.back();
      });
    };
  }, [historyId]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !dialogElement) return;
    let frame = 0;
    const update = () => {
      dialogElement.style.setProperty(
        "--checkout-viewport-height",
        `${viewport.height}px`,
      );
      dialogElement.style.setProperty(
        "--checkout-viewport-top",
        `${viewport.offsetTop}px`,
      );
      dialogElement.dataset.keyboardOpen = String(
        viewport.height < window.innerHeight * 0.75,
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (
          !window.matchMedia(MOBILE_LAYOUT_QUERY).matches ||
          !(active instanceof HTMLInputElement) ||
          !dialogElement.contains(active)
        )
          return;
        const scroller = active.closest(".checkout-scroll");
        if (!scroller) return;
        const inputBounds = active.getBoundingClientRect();
        const bounds = scroller.getBoundingClientRect();
        if (
          inputBounds.top < bounds.top + 16 ||
          inputBounds.bottom > bounds.bottom - 16
        )
          active.scrollIntoView({ block: "center", inline: "nearest" });
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [dialogElement]);
  useEffect(() => {
    if (!accepted || locationRequested.current) return;
    locationRequested.current = true;
    const controller = new AbortController();
    void detectCustomerLocation(controller.signal).then((location) => {
      if (
        !location ||
        controller.signal.aborted ||
        manualCountry.current ||
        manualPhone.current ||
        !dialCodes[location.countryCode]
      )
        return;
      setCountryCode(location.countryCode);
    });
    return () => {
      controller.abort();
      locationRequested.current = false;
    };
  }, [accepted]);
  const fullPhone = () => {
    const digits = whatsapp.replace(/\D/g, "");
    const prefix = (dialCodes[countryCode] ?? "+237").slice(1);
    return `+${digits.startsWith(prefix) ? digits : prefix + digits}`;
  };
  const usernameValid = username.trim().replace(/^@/, "").length >= 2;
  const customerValid =
    usernameValid &&
    password.length >= 4 &&
    whatsapp.length >= 6 &&
    /^[+][1-9][0-9]{7,14}$/.test(fullPhone());
  const validateEmail = () => {
    if (normalizeCustomerEmail(email)) return true;
    setError(
      fr
        ? "Veuillez renseigner une adresse e-mail valide avant de continuer."
        : "Please enter a valid email address before continuing.",
    );
    dialogElement
      ?.querySelector<HTMLInputElement>('input[type="email"]')
      ?.focus();
    return false;
  };
  const submit = async (payment?: PaymentInput) => {
    if (submitting.current || !accepted || !customerValid || !validateEmail())
      return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const result = await createPaymentCheckout(
        {
          selection,
          provider,
          customer: { username, password, email, whatsapp: fullPhone() },
          consent: accepted,
          ...(payment ? { payment } : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPassword("");
      if (result.checkoutUrl) {
        try {
          const pending = await getTikTokOrderStatus(
            result.orderToken,
            AbortSignal.timeout(3000),
          );
          if (!controller.signal.aborted) rememberTikTokOrder(pending);
        } catch {
          /* A slow status response must not delay the provider redirect. */
        }
        if (controller.signal.aborted) return;
        window.location.assign(result.checkoutUrl);
        return;
      }
      setOrderToken(result.orderToken);
      setProviderLink(result.providerLink);
      goTo(4);
    } catch (cause) {
      if (!controller.signal.aborted) {
        playError();
        const serviceNotReady =
          cause instanceof PaymentApiError &&
          (cause.code === "service_not_ready" ||
            cause.code === "fulfillment_unavailable");
        setError(
          serviceNotReady
            ? fr
              ? "La recharge TikTok ne peut pas être traitée pour le moment. Veuillez réessayer plus tard."
              : "The TikTok recharge cannot be processed right now. Please try again later."
            : fr
              ? "Le paiement n’a pas pu être démarré ou confirmé. Vérifiez votre téléphone avant de réessayer."
              : "The payment could not be started or confirmed. Check your phone before trying again.",
        );
        submitting.current = false;
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const next = () => {
    setError(null);
    if (step === 1) {
      if (!accepted) {
        setError(
          fr
            ? "Veuillez confirmer avoir pris connaissance des instructions."
            : "Please confirm that you have read the instructions.",
        );
        return;
      }
      goTo(2);
    } else if (step === 2) {
      if (!customerValid) {
        playError();
        setError(
          !usernameValid
            ? fr
              ? "Saisissez votre identifiant TikTok (au moins 2 caractères)."
              : "Enter your TikTok username (at least 2 characters)."
            : password.length < 4
              ? fr
                ? "Saisissez votre mot de passe (au moins 4 caractères)."
                : "Enter your password (at least 4 characters)."
              : fr
                ? "Veuillez renseigner un numéro WhatsApp valide."
                : "Please enter a valid WhatsApp number.",
        );
        const field = !usernameValid
          ? '[data-tiktok-field="username"]'
          : password.length < 4
            ? '[data-tiktok-field="password"]'
            : '[data-tiktok-field="whatsapp"]';
        dialogElement?.querySelector<HTMLInputElement>(field)?.focus();
        return;
      }
      goTo(3);
    } else if (step === 3 && available && validateEmail()) {
      if (mobileMoney) goTo(4);
      else void submit();
    }
  };
  const titles = fr
    ? [
        "Instructions importantes",
        "Informations de recharge",
        "Confirmer votre commande",
        `Paiement ${selectedProvider?.name ?? ""}`,
      ]
    : [
        "Important instructions",
        "Recharge information",
        "Confirm your order",
        `${selectedProvider?.name ?? ""} payment`,
      ];
  const steps = fr
    ? ["Instructions", "Compte", "Paiement"]
    : ["Instructions", "Account", "Payment"];
  if (mobileMoney) steps.push(fr ? "Validation" : "Approval");
  const locale = fr ? "fr-FR" : "en-US";
  const deliveredCoins = pack.coins + (pack.bonus ?? 0);
  const available =
    !providerState.loading &&
    !providerState.error &&
    providerState.providers?.find((item) => item.id === provider)?.available ===
      true;
  const countryNames = new Intl.DisplayNames([language], { type: "region" });
  const optionLabel = (country: (typeof ALL_COUNTRIES)[number]) =>
    `${country.flag} ${country.dialCode} (${countryNames.of(country.code) ?? country.name})`;

  return (
    <CheckoutShell
      open={isOpen}
      onClose={onClose}
      onExitComplete={finishClose}
      canDismiss={!busy}
      onBack={() => {
        if (step === 1 || orderToken) onClose();
        else goTo((step - 1) as Step);
      }}
      title={titles[step - 1]}
      description={
        step === 1
          ? fr
            ? "Consultez les instructions de recharge avant de continuer."
            : "Read the recharge instructions before continuing."
          : step === 2
            ? fr
              ? "Renseignez votre compte TikTok et votre numéro WhatsApp."
              : "Enter your TikTok account and WhatsApp number."
            : fr
              ? "Sélectionnez le service qui traitera votre paiement."
              : "Select the service that will process your payment."
      }
      currentStep={step - 1}
      steps={steps}
      selection={{
        label: fr ? "Vos pièces TikTok" : "Your TikTok coins",
        name:
          deliveredCoins.toLocaleString(locale) + (fr ? " pièces" : " coins"),
        amount: `${pack.price.toLocaleString(locale)} FCFA`,
        icon: <Coins size={22} aria-hidden="true" />,
      }}
      reducedMotion={reducedMotion}
      titleRef={title}
      contentRef={setDialogElement}
      className="tiktok-checkout"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement)
          returnFocus.current = document.activeElement;
        title.current?.focus();
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        const visible = (element: HTMLElement | null) =>
          element?.isConnected &&
          element.getClientRects().length > 0 &&
          !element.closest("[inert]");
        if (
          returnFocus.current !== document.body &&
          visible(returnFocus.current)
        ) {
          returnFocus.current?.focus({ preventScroll: true });
          return;
        }
        const fallback = Array.from(
          document.querySelectorAll<HTMLElement>("[data-tiktok-purchase]"),
        ).find(
          (item) => item.dataset.tiktokPurchase === pack.id && visible(item),
        );
        fallback?.focus({ preventScroll: true });
      }}
    >
      <AnimatePresence initial={false}>
        {isOpen && (
          <CheckoutPanel
            key={step}
            reducedMotion={reducedMotion}
            scrollTop={scrollPositions.current[step]}
          >
            <div className="checkout-scroll tiktok-checkout-scroll">
              {step === 1 && (
                <>
                  <p className="tiktok-intro">
                    {fr
                      ? "Veuillez lire attentivement avant de continuer"
                      : "Please read carefully before continuing"}
                  </p>
                  <div className="tiktok-instruction">
                    <ShieldCheck size={22} aria-hidden="true" />
                    <div>
                      <h3>
                        {fr
                          ? "Identifiants TikTok requis"
                          : "TikTok login details required"}
                      </h3>
                      <p>
                        {fr
                          ? "Veuillez vous assurer que vous disposez de vos identifiants TikTok corrects (nom d’utilisateur et mot de passe) pour recevoir vos pièces."
                          : "Please make sure you have the correct TikTok login details (username and password) to receive your coins."}
                      </p>
                    </div>
                  </div>
                  <div className="tiktok-instruction tiktok-warning">
                    <Info size={22} aria-hidden="true" />
                    <div>
                      <h3>
                        {fr
                          ? "Authentification à deux facteurs (2FA)"
                          : "Two-factor authentication (2FA)"}
                      </h3>
                      <p>
                        {fr
                          ? "Si vous avez activé l’authentification à deux facteurs sur votre compte TikTok, veuillez la désactiver temporairement le temps de recevoir vos pièces."
                          : "If two-factor authentication is enabled on your TikTok account, please temporarily disable it while receiving your coins."}
                      </p>
                    </div>
                  </div>
                  <label className="tiktok-consent">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(event) => {
                        playToggle(event.target.checked);
                        setAccepted(event.target.checked);
                        setError(null);
                      }}
                    />
                    <span>
                      {fr
                        ? "Je confirme avoir pris connaissance des instructions ci-dessus."
                        : "I confirm that I have read the instructions above."}
                    </span>
                  </label>
                </>
              )}
              {step === 2 && (
                <div className="tiktok-fields">
                  <label>
                    {fr ? "Identifiant TikTok" : "TikTok username"}
                    <span className="tiktok-field">
                      <span aria-hidden="true">@</span>
                      <input
                        data-tiktok-field="username"
                        value={username}
                        maxLength={254}
                        onChange={(event) =>
                          setUsername(event.target.value.replace(/^@/, ""))
                        }
                        autoComplete="off"
                        placeholder={
                          fr ? "pseudo ou email" : "username or email"
                        }
                        required
                      />
                    </span>
                  </label>
                  <label>
                    {fr ? "Mot de passe" : "Password"}
                    <span className="tiktok-field">
                      <input
                        data-tiktok-field="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        maxLength={256}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="off"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        className="tiktok-icon-button"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? fr
                              ? "Masquer le mot de passe"
                              : "Hide password"
                            : fr
                              ? "Afficher le mot de passe"
                              : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </span>
                  </label>
                  <div className="tiktok-contact-row">
                    <label>
                      {fr ? "Pays" : "Country"}
                      <select
                        value={countryCode}
                        onChange={(event) => {
                          manualCountry.current = true;
                          setCountryCode(event.target.value);
                        }}
                      >
                        <optgroup
                          label={fr ? "Pays populaires" : "Popular countries"}
                        >
                          {POPULAR_COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {optionLabel(country)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup
                          label={fr ? "Tous les pays" : "All countries"}
                        >
                          {ALL_COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {optionLabel(country)}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </label>
                    <label>
                      {fr ? "Numéro WhatsApp" : "WhatsApp number"}
                      <span className="tiktok-field">
                        <input
                          type="tel"
                          data-tiktok-field="whatsapp"
                          inputMode="numeric"
                          value={whatsapp}
                          maxLength={15}
                          onChange={(event) => {
                            manualPhone.current = true;
                            setWhatsapp(event.target.value.replace(/\D/g, ""));
                          }}
                          autoComplete="tel-national"
                          aria-describedby={`${historyId}-whatsapp-help`}
                          placeholder="6 00 00 00 00"
                          required
                        />
                      </span>
                    </label>
                    <small id={`${historyId}-whatsapp-help`}>
                      {fr
                        ? "Pour vous contacter en cas de besoin"
                        : "So we can contact you about the order"}
                    </small>
                  </div>
                </div>
              )}
              {step === 3 && (
                <>
                  <dl className="tiktok-summary">
                    <div>
                      <dt>{fr ? "Compte TikTok" : "TikTok account"}</dt>
                      <dd>@{username}</dd>
                    </div>
                    <div>
                      <dt>{fr ? "Recharge" : "Recharge"}</dt>
                      <dd>
                        {deliveredCoins.toLocaleString(locale)}{" "}
                        {fr ? "pièces" : "coins"}
                      </dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{pack.price.toLocaleString(locale)} FCFA</dd>
                    </div>
                  </dl>
                  <div className="tiktok-fields">
                    <label>
                      {fr ? "Adresse e-mail" : "Email address"}
                      <input
                        type="email"
                        inputMode="email"
                        value={email}
                        maxLength={254}
                        onChange={(event) =>
                          setEmail(event.target.value.replace(/\s/g, ""))
                        }
                        placeholder={
                          fr ? "client@exemple.com" : "customer@example.com"
                        }
                        autoComplete="email"
                        required
                      />
                    </label>
                  </div>
                  <SharedPaymentProviders
                    value={provider}
                    onChange={setProvider}
                    disabled={busy}
                    onAvailabilityChange={setProviderState}
                  />
                </>
              )}
              {step === 4 &&
                (orderToken ? (
                  <TikTokVerification
                    orderToken={orderToken}
                    providerLink={providerLink}
                    onReturnHome={onClose}
                  />
                ) : (
                  <SebPayForm
                    selection={selection}
                    initialCountry={countryCode}
                    whatsapp={fullPhone()}
                    busy={busy}
                    onSubmit={submit}
                  />
                ))}
              {error && (
                <p className="tiktok-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            {step !== 4 && (
              <div
                className={`checkout-actions checkout-actions-row ${step === 1 ? "checkout-notes-actions" : ""}`}
              >
                <button
                  type="button"
                  className={
                    step === 1
                      ? "checkout-decline-action"
                      : "checkout-back-action"
                  }
                  disabled={busy}
                  onClick={() =>
                    step === 1 ? onClose() : goTo((step - 1) as Step)
                  }
                >
                  {step === 1
                    ? fr
                      ? "Annuler"
                      : "Cancel"
                    : fr
                      ? "Retour"
                      : "Back"}
                </button>
                <button
                  type="button"
                  className="checkout-primary-action"
                  disabled={
                    busy ||
                    (step === 1 && !accepted) ||
                    (step === 3 && !available)
                  }
                  onClick={next}
                  aria-busy={busy}
                >
                  {busy ? (
                    <LoaderCircle
                      size={18}
                      className="tiktok-spinner"
                      aria-hidden="true"
                    />
                  ) : null}
                  {busy
                    ? fr
                      ? "Connexion…"
                      : "Connecting…"
                    : step === 3 && !mobileMoney
                      ? `${fr ? "Payer avec" : "Pay with"} ${selectedProvider?.name ?? provider}`
                      : fr
                        ? "Continuer"
                        : "Continue"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            {step === 4 && !orderToken && (
              <div className="checkout-actions checkout-actions-row">
                <button
                  type="button"
                  className="checkout-back-action"
                  disabled={busy}
                  onClick={() => goTo(3)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  {fr ? "Retour" : "Back"}
                </button>
              </div>
            )}
          </CheckoutPanel>
        )}
      </AnimatePresence>
    </CheckoutShell>
  );
}
