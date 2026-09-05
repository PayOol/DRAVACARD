"use client";

import { isInstallExcludedPath } from "@/lib/pwa-install";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function hasBlockingPwaDialog(ignoreInstallDialog = false) {
  if (document.querySelector('[data-drava-checkout-active="true"]'))
    return true;
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-checkout-shell], [role="dialog"], [role="alertdialog"]',
    ),
  ).some(
    (dialog) =>
      !(
        ignoreInstallDialog && dialog.hasAttribute("data-pwa-install-dialog")
      ) &&
      dialog.dataset.state !== "closed" &&
      dialog.getClientRects().length > 0,
  );
}

export function usePwaPageAvailable(ignoreInstallDialog = false) {
  const pathname = usePathname();
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let checkoutActive = false;
    const refresh = () =>
      setAvailable(
        !checkoutActive &&
          !document.hidden &&
          !isInstallExcludedPath(pathname) &&
          !window.location.hash.startsWith("#card:") &&
          !document.activeElement?.matches(
            'input, select, textarea, [contenteditable="true"]',
          ) &&
          !hasBlockingPwaDialog(ignoreInstallDialog),
      );
    const checkout = (event: Event) => {
      checkoutActive =
        (event as CustomEvent<{ active?: boolean }>).detail?.active === true;
      refresh();
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-state",
        "aria-modal",
        "role",
        "hidden",
        "data-drava-checkout-active",
      ],
    });
    refresh();
    document.addEventListener("visibilitychange", refresh);
    document.addEventListener("focusin", refresh);
    document.addEventListener("focusout", refresh);
    window.addEventListener("popstate", refresh);
    window.addEventListener("hashchange", refresh);
    window.addEventListener("drava:pwa-checkout", checkout);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      document.removeEventListener("focusin", refresh);
      document.removeEventListener("focusout", refresh);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("hashchange", refresh);
      window.removeEventListener("drava:pwa-checkout", checkout);
    };
  }, [pathname, ignoreInstallDialog]);
  return available && !isInstallExcludedPath(pathname);
}
