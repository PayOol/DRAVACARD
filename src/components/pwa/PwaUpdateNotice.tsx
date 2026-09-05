"use client";

import { useLanguage } from "@/lib/language-context";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { usePwaPageAvailable } from "./usePwaPageAvailable";
import "./pwa-install.css";

type PwaState = {
  updateAvailable: boolean;
  applying: boolean;
  offline: boolean;
  blocked: boolean;
};
type PwaWindow = Window & {
  dravaPwa?: {
    getState: () => PwaState;
    applyUpdate: () => Promise<boolean>;
    checkForUpdate: () => Promise<void>;
  };
};
const emptyState: PwaState = {
  updateAvailable: false,
  applying: false,
  offline: false,
  blocked: false,
};

export function PwaUpdateNotice() {
  const { language } = useLanguage();
  const fr = language === "fr";
  const pageAvailable = usePwaPageAvailable();
  const [state, setState] = useState(emptyState);
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  useEffect(() => {
    const refresh = () => {
      const next = (window as PwaWindow).dravaPwa?.getState();
      if (next) setState(next);
    };
    refresh();
    window.addEventListener("drava:pwa-state", refresh);
    return () => window.removeEventListener("drava:pwa-state", refresh);
  }, []);
  if (!pageAvailable || !state.updateAvailable || dismissed) return null;
  const busy = state.applying || requesting;
  return (
    <section
      className="pwa-update-notice"
      aria-label={fr ? "Mise à jour de Drava" : "Drava update"}
    >
      <div className="pwa-update-copy">
        <RefreshCw size={20} aria-hidden="true" />
        <div>
          <strong>
            {fr
              ? "Une nouvelle version de Drava est prête"
              : "A new version of Drava is ready"}
          </strong>
          <output>
            {state.blocked
              ? fr
                ? "Fermez les autres commandes ou onglets, puis réessayez."
                : "Close other orders or tabs, then try again."
              : state.offline
                ? fr
                  ? "Reconnectez-vous pour mettre à jour."
                  : "Reconnect to update."
                : failed
                  ? fr
                    ? "La mise à jour n’a pas abouti. Vous pouvez réessayer."
                    : "The update could not finish. You can try again."
                  : fr
                    ? "La page sera rechargée après votre confirmation."
                    : "The page will reload after you confirm."}
          </output>
        </div>
      </div>
      <div className="pwa-update-actions">
        <button
          type="button"
          className="pwa-install-primary"
          disabled={busy || state.offline}
          onClick={async () => {
            if (busy) return;
            setRequesting(true);
            setFailed(false);
            try {
              const api = (window as PwaWindow).dravaPwa;
              if (!api || !(await api.applyUpdate())) setFailed(true);
            } catch {
              setFailed(true);
            } finally {
              setRequesting(false);
            }
          }}
        >
          {busy
            ? fr
              ? "Mise à jour…"
              : "Updating…"
            : fr
              ? "Mettre à jour"
              : "Update now"}
        </button>
        <button
          type="button"
          className="pwa-install-later"
          disabled={busy}
          onClick={() => setDismissed(true)}
        >
          {fr ? "Plus tard" : "Not now"}
        </button>
      </div>
    </section>
  );
}
