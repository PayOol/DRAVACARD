export const INSTALL_REMINDER_KEY = "drava-pwa-install-reminder-until";
export const INSTALLED_APP_KEY = "drava-pwa-installed";
export const INSTALL_STATE_EVENT = "drava:install-state-change";
export const INSTALL_PROMPT_READY_EVENT = "drava:install-prompt-ready";
export const INSTALL_REMINDER_EVENT = "drava:install-reminder-change";
export const INSTALL_REMINDER_DURATION_MS = 2 * 60 * 60 * 1000;
export const INSTALL_PROMPT_WAIT_MS = 1500;

export type InstallPlatform = "ios" | "android" | "desktop" | "other";
export type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};
export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};
export type InstallPromptHost = EventTarget & {
  __dravaInstallPrompt?: DeferredInstallPrompt | null;
  __dravaInstalled?: boolean;
};

export type RelatedAppsNavigator = {
  getInstalledRelatedApps?: () => Promise<unknown>;
};

export function installedAppKey(appId = "/") {
  return `${INSTALLED_APP_KEY}:${appId}`;
}

export function readInstalledApp(storage: Pick<Storage, "getItem">, appId = "/") {
  try {
    return storage.getItem(installedAppKey(appId)) === "1";
  } catch {
    return false;
  }
}

export function writeInstalledApp(
  storage: Pick<Storage, "setItem" | "removeItem">,
  installed: boolean,
  appId = "/",
) {
  try {
    if (installed) storage.setItem(installedAppKey(appId), "1");
    else storage.removeItem(installedAppKey(appId));
  } catch {
    // The current page also retains the state when storage is unavailable.
  }
}

export function matchesInstalledApp(
  apps: unknown,
  manifestUrl: string,
  appId: string,
) {
  if (!Array.isArray(apps)) return false;
  try {
    const manifest = new URL(manifestUrl);
    const identity = new URL(appId, manifest.origin).href;
    return apps.some((app: unknown) => {
      if (!app || typeof app !== "object") return false;
      const { platform, url, id } = app as Record<string, unknown>;
      if (platform !== "webapp") return false;
      const hasUrl = typeof url === "string" && url.length > 0;
      const hasId = typeof id === "string" && id.length > 0;
      if (!hasUrl && !hasId) return false;
      try {
        return (
          (!hasUrl || new URL(url as string, manifest).href === manifest.href) &&
          (!hasId || new URL(id as string, manifest.origin).href === identity)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function detectInstalledApp(
  navigator: RelatedAppsNavigator | Navigator,
  manifestUrl: string,
  appId: string,
  timeoutMs = INSTALL_PROMPT_WAIT_MS,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (
      !("getInstalledRelatedApps" in navigator) ||
      typeof navigator.getInstalledRelatedApps !== "function"
    ) return false;
    const apps = await Promise.race([
      navigator.getInstalledRelatedApps(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    return matchesInstalledApp(apps, manifestUrl, appId);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function detectInstallPlatform({
  userAgent,
  platform,
  maxTouchPoints,
}: Pick<
  Navigator,
  "userAgent" | "platform" | "maxTouchPoints"
>): InstallPlatform {
  if (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Windows NT|Macintosh|Linux|CrOS/i.test(userAgent)) return "desktop";
  return "other";
}

export function isIntegratedBrowser(userAgent: string) {
  return /FBAN|FBAV|Instagram|Line\/|TikTok|Bytedance|; wv\)/i.test(userAgent);
}

export function isInstalledDisplay({
  standalone,
  iosStandalone,
}: { standalone: boolean; iosStandalone?: boolean }) {
  return standalone || iosStandalone === true;
}

export function isInstallExcludedPath(pathname: string) {
  return /\/(?:payment-success|payment-failure|tiktok-payment)(?:\/|$)/.test(
    pathname,
  );
}

export function readInstallReminder(storage: Pick<Storage, "getItem">) {
  try {
    const value = Number(storage.getItem(INSTALL_REMINDER_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeInstallReminder(
  storage: Pick<Storage, "setItem" | "removeItem">,
  until: number | null,
) {
  try {
    if (until === null) storage.removeItem(INSTALL_REMINDER_KEY);
    else storage.setItem(INSTALL_REMINDER_KEY, String(until));
  } catch {
    // The current tab retains the reminder when browser storage is restricted.
  }
}

const consumedPrompts = new WeakSet<DeferredInstallPrompt>();

export function getAvailableInstallPrompt(host: InstallPromptHost) {
  const prompt = host.__dravaInstallPrompt;
  return prompt && !consumedPrompts.has(prompt) ? prompt : null;
}

export function waitForInstallPrompt(
  host: InstallPromptHost,
  signal: AbortSignal,
  timeoutMs = INSTALL_PROMPT_WAIT_MS,
): Promise<DeferredInstallPrompt | null> {
  if (signal.aborted) return Promise.resolve(null);
  const current = getAvailableInstallPrompt(host);
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      host.removeEventListener(INSTALL_PROMPT_READY_EVENT, finish);
      signal.removeEventListener("abort", finish);
      resolve(signal.aborted ? null : getAvailableInstallPrompt(host));
    };
    const timer = setTimeout(finish, timeoutMs);
    host.addEventListener(INSTALL_PROMPT_READY_EVENT, finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
  });
}

export async function consumeInstallPrompt(
  host: InstallPromptHost,
  prompt: DeferredInstallPrompt,
) {
  if (consumedPrompts.has(prompt)) return null;
  // A native prompt is single-use, including rejected or dismissed attempts.
  consumedPrompts.add(prompt);
  if (host.__dravaInstallPrompt === prompt) host.__dravaInstallPrompt = null;
  await prompt.prompt();
  return prompt.userChoice;
}
