export const INSTALL_REMINDER_KEY = "drava-pwa-install-reminder-until";
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
};

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
  referrer,
}: { standalone: boolean; iosStandalone?: boolean; referrer: string }) {
  return (
    standalone ||
    iosStandalone === true ||
    referrer.startsWith("android-app://")
  );
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
