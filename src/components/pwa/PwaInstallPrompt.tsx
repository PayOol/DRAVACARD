"use client";

import DravaLogo from "@/components/layout/DravaLogo";
import { useLanguage } from "@/lib/language-context";
import {
  type DeferredInstallPrompt,
  INSTALL_PROMPT_READY_EVENT,
  INSTALL_REMINDER_DURATION_MS,
  INSTALL_REMINDER_EVENT,
  INSTALL_REMINDER_KEY,
  type InstallPlatform,
  type InstallPromptHost,
  consumeInstallPrompt,
  detectInstallPlatform,
  isInstalledDisplay,
  isIntegratedBrowser,
  readInstallReminder,
  waitForInstallPrompt,
  writeInstallReminder,
} from "@/lib/pwa-install";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, MonitorDown, Plus, Share, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasBlockingPwaDialog,
  usePwaPageAvailable,
} from "./usePwaPageAvailable";
import "./pwa-install.css";

const storage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};

export function PwaInstallPrompt() {
  const { language } = useLanguage();
  const fr = language === "fr";
  const pageAvailable = usePwaPageAvailable(true);
  const [due, setDue] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [integrated, setIntegrated] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const reminder = useRef<number | null>(null);
  const installed = useRef(false);
  const installingRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const open = due && pageAvailable;

  useEffect(() => {
    if (!pageAvailable) {
      request.current?.abort();
      installingRef.current = false;
      setInstalling(false);
    }
  }, [pageAvailable]);

  useEffect(() => {
    const host = window as InstallPromptHost;
    const display = window.matchMedia("(display-mode: standalone)");
    let timer: ReturnType<typeof setTimeout>;
    reminder.current = readInstallReminder(storage);
    setPlatform(detectInstallPlatform(navigator));
    setIntegrated(isIntegratedBrowser(navigator.userAgent));
    const runningInstalled = () =>
      installed.current ||
      isInstalledDisplay({
        standalone: display.matches,
        iosStandalone: (navigator as Navigator & { standalone?: boolean })
          .standalone,
        referrer: document.referrer,
      });
    const refresh = () => {
      clearTimeout(timer);
      if (runningInstalled()) {
        setDue(false);
        return;
      }
      const remaining = (reminder.current ?? 0) - Date.now();
      if (remaining > 0) {
        setDue(false);
        timer = setTimeout(refresh, Math.min(remaining, 2_147_483_647));
      } else {
        reminder.current = null;
        writeInstallReminder(storage, null);
        setDue(true);
      }
    };
    const capture = (event: Event) => {
      if (runningInstalled()) return;
      event.preventDefault();
      host.__dravaInstallPrompt = event as DeferredInstallPrompt;
      host.dispatchEvent(new Event(INSTALL_PROMPT_READY_EVENT));
      setShowHelp(false);
    };
    const installedEvent = () => {
      installed.current = true;
      host.__dravaInstallPrompt = null;
      reminder.current = null;
      writeInstallReminder(storage, null);
      refresh();
    };
    const storageEvent = (event: StorageEvent) => {
      if (event.key !== INSTALL_REMINDER_KEY && event.key !== null) return;
      reminder.current = readInstallReminder(storage);
      refresh();
    };
    // UpCoin shows the first invitation immediately and repeats after two hours.
    timer = setTimeout(refresh, 0);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installedEvent);
    window.addEventListener("storage", storageEvent);
    window.addEventListener(INSTALL_REMINDER_EVENT, refresh);
    display.addEventListener("change", refresh);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installedEvent);
      window.removeEventListener("storage", storageEvent);
      window.removeEventListener(INSTALL_REMINDER_EVENT, refresh);
      display.removeEventListener("change", refresh);
    };
  }, []);

  const postpone = useCallback(() => {
    if (installingRef.current) return;
    reminder.current = Date.now() + INSTALL_REMINDER_DURATION_MS;
    writeInstallReminder(storage, reminder.current);
    setDue(false);
    window.dispatchEvent(new Event(INSTALL_REMINDER_EVENT));
  }, []);

  const install = async () => {
    if (installingRef.current || !pageAvailable) return;
    installingRef.current = true;
    setInstalling(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const host = window as InstallPromptHost;
      const prompt = await waitForInstallPrompt(host, controller.signal);
      if (controller.signal.aborted) return;
      if (!prompt) {
        setShowHelp(true);
        return;
      }
      const choice = await consumeInstallPrompt(host, prompt);
      if (controller.signal.aborted) return;
      if (choice?.outcome === "accepted") {
        installed.current = true;
        reminder.current = null;
        writeInstallReminder(storage, null);
        setDue(false);
      } else setShowHelp(true);
    } catch {
      if (!controller.signal.aborted) setShowHelp(true);
    } finally {
      installingRef.current = false;
      if (!controller.signal.aborted) setInstalling(false);
    }
  };

  const ios = platform === "ios";
  const platformName = ios
    ? fr
      ? "iPhone ou iPad"
      : "iPhone or iPad"
    : platform === "android"
      ? "Android"
      : platform === "desktop"
        ? fr
          ? "Ordinateur"
          : "Computer"
        : fr
          ? "Votre appareil"
          : "Your device";
  const PlatformIcon = platform === "desktop" ? MonitorDown : Smartphone;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) postpone();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="pwa-install-overlay" />
        <Dialog.Content
          className="pwa-install-modal"
          data-pwa-install-dialog=""
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            titleRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!hasBlockingPwaDialog(true) && returnFocus.current?.isConnected)
              returnFocus.current.focus({ preventScroll: true });
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (installingRef.current) event.preventDefault();
          }}
        >
          <div className="pwa-install-heading">
            <div className="pwa-install-app-icon">
              <DravaLogo decorative />
            </div>
            <div>
              <span className="pwa-install-platform">
                <PlatformIcon size={14} aria-hidden="true" />
                {platformName}
              </span>
              <Dialog.Title ref={titleRef} tabIndex={-1}>
                {ios
                  ? fr
                    ? "Ajoutez Drava à votre écran d’accueil"
                    : "Add Drava to your Home Screen"
                  : fr
                    ? "Installez l’application Drava"
                    : "Install the Drava app"}
              </Dialog.Title>
            </div>
          </div>
          <Dialog.Description className="pwa-install-description">
            {ios
              ? fr
                ? "Installez Drava en quelques secondes pour y accéder comme à une application."
                : "Install Drava in seconds and open it like an app."
              : fr
                ? "Accédez plus rapidement à Drava, comme à une application sur votre appareil."
                : "Open Drava faster, just like an app on your device."}
          </Dialog.Description>
          {ios ? (
            <ol className="pwa-install-steps">
              <li>
                <span className="pwa-install-step-icon">
                  <Share size={17} aria-hidden="true" />
                </span>
                {fr
                  ? "Appuyez sur le bouton Partager de votre navigateur."
                  : "Tap your browser’s Share button."}
              </li>
              <li>
                <span className="pwa-install-step-icon">
                  <Plus size={18} aria-hidden="true" />
                </span>
                {fr
                  ? "Choisissez « Sur l’écran d’accueil » ou « Ajouter à l’écran d’accueil »."
                  : "Choose “Add to Home Screen”."}
              </li>
              <li>
                <span className="pwa-install-step-icon">3</span>
                {fr
                  ? "Activez « Ouvrir comme app web » si proposé, puis appuyez sur « Ajouter »."
                  : "Turn on “Open as Web App” if shown, then tap “Add”."}
              </li>
            </ol>
          ) : (
            <p className="pwa-install-benefit">
              <Download size={17} aria-hidden="true" />
              {fr
                ? "Drava s’ouvrira depuis votre écran d’accueil ou votre bureau."
                : "Drava will open from your Home Screen or desktop."}
            </p>
          )}
          {(integrated || showHelp) && (
            <output className="pwa-install-help">
              {integrated
                ? fr
                  ? "Ouvrez cette page dans Safari sur iPhone, ou dans Chrome ou Edge sur Android, depuis le menu de ce navigateur."
                  : "Use this browser’s menu to open this page in Safari on iPhone, or Chrome or Edge on Android."
                : fr
                  ? "Si l’invite ne s’affiche pas, ouvrez le menu du navigateur puis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Si cette option manque, utilisez Chrome, Edge ou Safari sur iPhone."
                  : "If no prompt appears, open the browser menu and choose “Install app” or “Add to Home Screen”. If unavailable, use Chrome, Edge, or Safari on iPhone."}
            </output>
          )}
          <div className="pwa-install-actions">
            {!ios && (
              <button
                type="button"
                className="pwa-install-primary"
                disabled={installing}
                onClick={install}
              >
                <Download size={18} aria-hidden="true" />
                {installing
                  ? fr
                    ? "Ouverture de l’invite…"
                    : "Opening prompt…"
                  : fr
                    ? "Installer l’application"
                    : "Install the app"}
              </button>
            )}
            <button
              type="button"
              className="pwa-install-later"
              disabled={installing}
              onClick={postpone}
            >
              {fr ? "Plus tard" : "Not now"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
