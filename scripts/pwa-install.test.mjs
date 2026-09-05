import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {
  INSTALL_PROMPT_READY_EVENT,
  INSTALL_PROMPT_WAIT_MS,
  INSTALL_REMINDER_DURATION_MS,
  INSTALL_REMINDER_KEY,
  consumeInstallPrompt,
  detectInstallPlatform,
  getAvailableInstallPrompt,
  isInstalledDisplay,
  isInstallExcludedPath,
  isIntegratedBrowser,
  readInstallReminder,
  waitForInstallPrompt,
  writeInstallReminder,
} from "../src/lib/pwa-install.ts";

function storage(initial) {
  const values = new Map(initial);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function prompt(outcome = "accepted", fail = false) {
  let calls = 0;
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => {
      calls += 1;
      if (fail) throw new Error("Unavailable");
    },
    userChoice: Promise.resolve({ outcome, platform: "web" }),
    calls: () => calls,
  });
}

test("UpCoin reminder and native-event wait retain their exact durations", () => {
  assert.equal(INSTALL_REMINDER_DURATION_MS, 7_200_000);
  assert.equal(INSTALL_PROMPT_WAIT_MS, 1500);
});

test("dismissal survives a reload as one timestamp, without unrelated or personal data", () => {
  const persisted = storage([["language", "en"]]);
  const now = 1_800_000_000_000;
  writeInstallReminder(persisted, now + INSTALL_REMINDER_DURATION_MS);
  const reloaded = storage(persisted.values);
  assert.equal(readInstallReminder(reloaded), now + 7_200_000);
  assert.deepEqual([...persisted.values.keys()], ["language", INSTALL_REMINDER_KEY]);
  writeInstallReminder(reloaded, null);
  assert.equal(readInstallReminder(reloaded), null);
  assert.equal(reloaded.getItem("language"), "en");
});

test("malformed, missing and nonpositive reminder timestamps are ignored", () => {
  for (const value of [null, "", "NaN", "Infinity", "nope", "0", "-1"]) {
    assert.equal(readInstallReminder(storage([[INSTALL_REMINDER_KEY, value]])), null);
  }
});

test("restricted browser storage never stops installation or dismissal", () => {
  const blocked = new Proxy({}, { get() { throw new Error("SecurityError"); } });
  assert.equal(readInstallReminder(blocked), null);
  assert.doesNotThrow(() => writeInstallReminder(blocked, 1234));
  assert.doesNotThrow(() => writeInstallReminder(blocked, null));
});

test("iPhone, iPad and iPadOS desktop user agents get manual iOS instructions", () => {
  for (const userAgent of ["iPhone", "iPad", "iPod"]) {
    assert.equal(detectInstallPlatform({ userAgent, platform: "", maxTouchPoints: 0 }), "ios");
  }
  assert.equal(detectInstallPlatform({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 }), "ios");
  assert.equal(detectInstallPlatform({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 0 }), "desktop");
});

test("Android, desktop and unknown platforms remain distinguishable", () => {
  for (const [userAgent, expected] of [["Android", "android"], ["Windows NT", "desktop"], ["Linux", "desktop"], ["CrOS", "desktop"], ["unknown", "other"]]) {
    assert.equal(detectInstallPlatform({ userAgent, platform: "", maxTouchPoints: 0 }), expected);
  }
});

test("all installed-app display signals suppress the invitation", () => {
  assert.equal(isInstalledDisplay({ standalone: true, referrer: "" }), true);
  assert.equal(isInstalledDisplay({ standalone: false, iosStandalone: true, referrer: "" }), true);
  assert.equal(isInstalledDisplay({ standalone: false, referrer: "android-app://com.example" }), true);
  assert.equal(isInstalledDisplay({ standalone: false, referrer: "https://example.test" }), false);
});

test("integrated browsers get an external-browser instruction", () => {
  for (const ua of ["FBAN/FBIOS", "FBAV/1", "Instagram", "Line/1", "TikTok", "Bytedance", "Android; wv)"]) assert.equal(isIntegratedBrowser(ua), true);
  for (const ua of ["Chrome/123 Safari/537", "Safari iPhone", "Firefox/120"]) assert.equal(isIntegratedBrowser(ua), false);
});

test("payment returns are excluded at root and under any deployment prefix", () => {
  for (const prefix of ["", "/DRAVACARD", "/nested/drava"]) {
    for (const route of ["payment-success", "payment-failure", "tiktok-payment"]) {
      assert.equal(isInstallExcludedPath(`${prefix}/${route}/`), true);
      assert.equal(isInstallExcludedPath(`${prefix}/${route}`), true);
    }
    assert.equal(isInstallExcludedPath(`${prefix}/`), false);
  }
});

test("early native event is captured without opening or consuming its prompt", async () => {
  const source = await readFile(new URL("../public/pwa-install-capture.js", import.meta.url), "utf8");
  const host = new EventTarget();
  let ready = 0;
  host.addEventListener(INSTALL_PROMPT_READY_EVENT, () => ready++);
  vm.runInNewContext(source, { window: host, Event });
  const native = prompt();
  host.dispatchEvent(native);
  assert.equal(native.defaultPrevented, true);
  assert.equal(host.__dravaInstallPrompt, native);
  assert.equal(ready, 1);
  assert.equal(native.calls(), 0);
});

test("an already-captured prompt is immediately available", async () => {
  const host = new EventTarget();
  host.__dravaInstallPrompt = prompt();
  assert.equal(await waitForInstallPrompt(host, new AbortController().signal), host.__dravaInstallPrompt);
});

test("a prompt arriving during the wait is accepted", async () => {
  const host = new EventTarget();
  const waiting = waitForInstallPrompt(host, new AbortController().signal, 100);
  host.__dravaInstallPrompt = prompt();
  host.dispatchEvent(new Event(INSTALL_PROMPT_READY_EVENT));
  assert.equal(await waiting, host.__dravaInstallPrompt);
});

test("unsupported browser wait ends and permits manual help", async () => {
  assert.equal(await waitForInstallPrompt(new EventTarget(), new AbortController().signal, 1), null);
});

test("leaving the eligible page aborts the native prompt wait", async () => {
  const host = new EventTarget();
  const controller = new AbortController();
  const waiting = waitForInstallPrompt(host, controller.signal, 1000);
  controller.abort();
  assert.equal(await waiting, null);
  host.__dravaInstallPrompt = prompt();
  assert.equal(await waitForInstallPrompt(host, controller.signal), null);
  assert.equal(host.__dravaInstallPrompt.calls(), 0);
});

for (const outcome of ["accepted", "dismissed"]) {
  test(`native ${outcome} event can be consumed only once, including concurrent clicks`, async () => {
    const host = new EventTarget();
    const native = prompt(outcome);
    host.__dravaInstallPrompt = native;
    const results = await Promise.all([consumeInstallPrompt(host, native), consumeInstallPrompt(host, native)]);
    assert.deepEqual(results, [{ outcome, platform: "web" }, null]);
    assert.equal(native.calls(), 1);
    assert.equal(host.__dravaInstallPrompt, null);
    host.__dravaInstallPrompt = native;
    assert.equal(getAvailableInstallPrompt(host), null);
  });
}

test("rejected prompt is still consumed, but a new browser event is reusable", async () => {
  const host = new EventTarget();
  const failed = prompt("dismissed", true);
  host.__dravaInstallPrompt = failed;
  await assert.rejects(consumeInstallPrompt(host, failed), /Unavailable/);
  assert.equal(await consumeInstallPrompt(host, failed), null);
  assert.equal(failed.calls(), 1);
  const fresh = prompt();
  host.__dravaInstallPrompt = fresh;
  assert.equal(getAvailableInstallPrompt(host), fresh);
  assert.equal((await consumeInstallPrompt(host, fresh)).outcome, "accepted");
});

test("consuming an older event does not delete a newer captured event", async () => {
  const host = new EventTarget();
  const old = prompt();
  const fresh = prompt();
  host.__dravaInstallPrompt = fresh;
  await consumeInstallPrompt(host, old);
  assert.equal(getAvailableInstallPrompt(host), fresh);
});
