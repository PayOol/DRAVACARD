import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as catalog from "../src/lib/tiktok-catalog.ts";

const require = createRequire(import.meta.url);
const [panelSource, historySource, historyComponentSource] = await Promise.all([
  "../src/components/catalog/TikTokPanel.tsx",
  "../src/lib/tiktok-history.ts",
  "../src/components/tiktok/TikTokHistory.tsx",
].map((file) => readFile(new URL(file, import.meta.url), "utf8")));

function load(source, imports = {}, globals = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ exports: {}, require(name) {
    if (name === "react/jsx-runtime") return require(name);
    if (name.endsWith(".css")) return {};
    assert.ok(name in imports, `Unexpected dependency: ${name}`);
    return imports[name];
  }, ...globals });
  vm.runInContext(compiled, context);
  return context.exports;
}
function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  return element && typeof element === "object" ? [element, ...nodes(element.props?.children)] : [];
}
function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (element == null || typeof element === "boolean") return "";
  return typeof element === "object" ? text(element.props?.children) : String(element);
}
function renderPanel(language, customCoins = 0, id = "desktop-custom") {
  const selected = [];
  const changes = [];
  const Component = load(panelSource, {
    "@/lib/language-context": { useLanguage: () => ({ language }) },
    "@/lib/tiktok-catalog": catalog,
    "@/lib/tiktok-sound": { playModalOpen() {}, playPop() {} },
    "@/components/tiktok/TikTokHelp": { TikTokHelp: "help", TikTokSoundToggle: "sound" },
    "@/components/tiktok/TikTokHistory": { TikTokHistory: "history" },
    "lucide-react": { ArrowRight: "arrow", Coins: "coins", Sparkles: "sparkles" },
    react: { useId: () => id },
  }).default;
  return { tree: Component({ customCoins, selectedPackId: "boost", onSelectPack: (pack) => selected.push(pack), onCustomCoinsChange: (value) => changes.push(value) }), selected, changes };
}
function historyModule({ storageError = false, writeError = false, initial = null } = {}) {
  let stored = initial;
  const listeners = new Map();
  const writes = [];
  const events = [];
  const api = load(historySource, {}, { Event, window: {
    localStorage: {
      getItem() { if (storageError) throw new Error("Storage unavailable"); return stored; },
      setItem(key, value) { if (storageError || writeError) throw new Error("Storage unavailable"); stored = value; writes.push({ key, value }); },
    },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) { assert.equal(listeners.get(name), listener); listeners.delete(name); },
    dispatchEvent(event) { events.push(event.type); listeners.get(event.type)?.(); },
  } });
  return { api, writes, events, listeners, setWriteError(value) { writeError = value; } };
}
const receipt = (overrides = {}) => ({ orderId: "TIKTOK-123", packId: "boost", provider: "leekpay", status: "paid", verified: true, coins: 700, bonus: 70, amount: 7900, currency: "XOF", createdAt: Date.UTC(2026, 8, 5, 12), notification: "sent", ...overrides });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("TikTok catalogue keeps the restored mini price and the other UpCoin packs unchanged", () => {
  assert.deepEqual(catalog.tiktokPacks, [
    { id: "mini", coins: 100, price: 1124 },
    { id: "starter", coins: 350, price: 3900 },
    { id: "boost", coins: 700, bonus: 70, price: 7900, badge: "popular" },
    { id: "live", coins: 1400, bonus: 140, price: 15700 },
    { id: "creator", coins: 3500, bonus: 350, price: 39300, badge: "creator" },
    { id: "max", coins: 7000, bonus: 700, price: 78700 },
  ]);
  assert.deepEqual(catalog.tiktokPacks.map((pack) => pack.coins + (pack.bonus ?? 0)), [100, 350, 770, 1540, 3850, 7700]);
});

test("custom amounts retain UpCoin digits-only normalization, bounds and exact rounded price", () => {
  assert.equal(catalog.TIKTOK_MIN_COINS, 70);
  assert.equal(catalog.TIKTOK_MAX_COINS, 1000000);
  assert.equal(catalog.TIKTOK_UNIT_PRICE, 11.24);
  for (const [input, expected] of [["", 0], ["text", 0], ["70", 70], ["7 350 coins", 7350], ["000070", 70], ["999999999999999999999", 1000000], [1000001, 1000000]]) {
    assert.equal(catalog.normalizeCustomCoins(input), expected);
  }
  for (const [coins, price] of [[70, 787], [71, 798], [350, 3934], [735, 8261], [1000000, 11240000]]) {
    assert.deepEqual(catalog.customTikTokPack(coins), { id: "custom", coins, price });
  }
});

test("both languages expose accessible packs and the tutorial without the removed sound and support buttons", () => {
  for (const language of ["fr", "en"]) {
    const { tree, selected } = renderPanel(language);
    const elements = nodes(tree);
    const packs = elements.filter((element) => element.props["data-tiktok-pack"]);
    assert.equal(packs.length, 6);
    for (const [index, button] of packs.entries()) {
      const pack = catalog.tiktokPacks[index];
      assert.equal(button.props.type, "button");
      assert.match(button.props["aria-label"], language === "fr" ? /^Acheter / : /^Buy /);
      assert.ok(button.props["aria-label"].includes(catalog.formatTikTokNumber(pack.coins, language)));
      assert.ok(button.props["aria-label"].includes(`${catalog.formatTikTokNumber(pack.price, language)} FCFA`));
      if (pack.bonus) assert.ok(button.props["aria-label"].includes(`${catalog.formatTikTokNumber(pack.bonus, language)} ${language === "fr" ? "gratuites" : "free"}`));
      assert.equal(button.props.className.includes("is-selected"), pack.id === "boost");
      button.props.onClick();
      assert.equal(selected[index], pack);
    }
    assert.match(text(tree), language === "fr" ? /Populaire.*Créateur.*Montant personnalisé/s : /Popular.*Creator.*Custom amount/s);
    assert.deepEqual(elements.filter((element) => element.type === "help").map((element) => element.props.kind), ["video"]);
    assert.equal(elements.filter((element) => element.type === "sound").length, 0);
    assert.equal(elements.filter((element) => element.type === "history").length, 1);
  }
});

test("custom purchase stays disabled below minimum and submits the selected amount without a bonus", () => {
  for (const language of ["fr", "en"]) {
    for (const amount of [0, 69, 70, 735, 1000000]) {
      const { tree, selected, changes } = renderPanel(language, amount);
      const elements = nodes(tree);
      const input = elements.find((element) => element.type === "input");
      const label = elements.find((element) => element.type === "label");
      assert.equal(input.props.id, label.props.htmlFor);
      assert.equal(input.props.inputMode, "numeric");
      assert.equal(input.props.value, amount || "");
      input.props.onChange({ target: { value: "1 234 coins" } });
      assert.deepEqual(changes, [1234]);
      const buy = elements.find((element) => element.type === "button" && element.props.className === "tiktok-primary");
      assert.equal(buy.props.disabled, amount < 70);
      if (amount >= 70) {
        buy.props.onClick();
        assert.deepEqual(selected, [catalog.customTikTokPack(amount)]);
      }
    }
  }
});

test("history strips customer credentials, tokens, transaction payloads and unknown fields before persistence", () => {
  const { api, writes, events } = historyModule();
  const untrusted = receipt({ username: "test-user", transactionReference: "private-provider-reference", password: "test-pass", email: "client@example.test", whatsapp: "+237600000000", orderToken: "private-capability", otp: "123456", customer: { secret: "not-saved" }, payment: { cardNumber: "not-saved" }, unknown: "not-saved" });
  assert.deepEqual(plain(api.publicTikTokOrder(untrusted)), receipt());
  api.rememberTikTokOrder(untrusted);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "drava-tiktok-history");
  assert.deepEqual(JSON.parse(writes[0].value), [receipt()]);
  assert.doesNotMatch(writes[0].value, /username|transactionReference|password|email|whatsapp|orderToken|otp|customer|cardNumber|not-saved|private-capability/);
  assert.deepEqual(events, ["drava-tiktok-history-change"]);
});

test("history rejects malformed records and contradictory paid flags without promoting callbacks", () => {
  const { api } = historyModule();
  for (const invalid of [null, [], "paid", {}, receipt({ status: "paid", verified: false }), receipt({ status: "pending", verified: true }), receipt({ provider: "untrusted" }), receipt({ packId: "unknown" }), receipt({ coins: 1.5 }), receipt({ bonus: -1 }), receipt({ amount: 0 }), receipt({ createdAt: Number.NaN }), receipt({ createdAt: 8640000000000001 }), receipt({ orderId: "<script>" }), receipt({ currency: "<X>" })]) {
    assert.equal(api.publicTikTokOrder(invalid), null);
  }
  for (const raw of ["invalid json", "null", "{}", '"success"', " ".repeat(65537)]) assert.deepEqual(plain(api.parseTikTokHistory(raw)), []);
  assert.deepEqual(plain(api.parseTikTokHistory(JSON.stringify([receipt({ status: "pending", verified: false }), { success: true, payment_data: { status: "SUCCESS" } }]))), [receipt({ status: "pending", verified: false })]);
});

test("history deduplicates updates, caps records, survives unavailable storage and cleans up subscribers", () => {
  for (const storageError of [false, true]) {
    const { api, listeners } = historyModule({ storageError });
    let notifications = 0;
    const unsubscribe = api.subscribeTikTokHistory(() => notifications++);
    api.rememberTikTokOrder(receipt({ status: "pending", verified: false }));
    api.rememberTikTokOrder(receipt());
    assert.equal(notifications, 2);
    assert.deepEqual(plain(api.parseTikTokHistory(api.getTikTokHistorySnapshot())), [receipt()]);
    for (let i = 0; i < 110; i++) api.rememberTikTokOrder(receipt({ orderId: `TIKTOK-${i}` }));
    const saved = plain(api.parseTikTokHistory(api.getTikTokHistorySnapshot()));
    assert.equal(saved.length, 50);
    assert.equal(saved[0].orderId, "TIKTOK-109");
    assert.equal(saved.at(-1).orderId, "TIKTOK-60");
    assert.equal(api.parseTikTokHistory(JSON.stringify(Array.from({ length: 75 }, (_, i) => receipt({ orderId: `TIKTOK-${i}` })))).length, 50);
    assert.equal(api.getTikTokHistoryServerSnapshot(), "[]");
    unsubscribe();
    assert.equal(listeners.size, 0);
  }
});

test("readable storage with blocked writes keeps updated receipts in memory and persists them when writes recover", () => {
  const previous = receipt({ orderId: "TIKTOK-OLD" });
  const { api, writes, setWriteError } = historyModule({ initial: JSON.stringify([previous]), writeError: true });
  api.rememberTikTokOrder(receipt({ status: "pending", verified: false }));
  api.rememberTikTokOrder(receipt());
  assert.equal(writes.length, 0);
  assert.deepEqual(plain(api.parseTikTokHistory(api.getTikTokHistorySnapshot())), [receipt(), previous]);
  setWriteError(false);
  const newest = receipt({ orderId: "TIKTOK-NEW" });
  api.rememberTikTokOrder(newest);
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].value), [newest, receipt(), previous]);
  assert.deepEqual(plain(api.parseTikTokHistory(api.getTikTokHistorySnapshot())), [newest, receipt(), previous]);
});

test("bilingual history counts only paid coins and labels local records without private identity", () => {
  for (const language of ["fr", "en"]) {
    const { api } = historyModule();
    const orders = [receipt(), receipt({ orderId: "TIKTOK-456", status: "pending", verified: false, coins: 350, bonus: 0 })];
    const Component = load(historyComponentSource, {
      "@/lib/language-context": { useLanguage: () => ({ language }) },
      "@/lib/tiktok-catalog": catalog,
      "@/lib/tiktok-history": api,
      "@/lib/tiktok-payment": { TIKTOK_PROVIDER_NAMES: { leekpay: "LeekPay", soleaspay: "SoleasPay", sebpay: "SebPay" } },
      "@radix-ui/react-dialog": Object.fromEntries(["Root", "Portal", "Overlay", "Content", "Title", "Description", "Close"].map((key) => [key, `dialog-${key}`])),
      "lucide-react": Object.fromEntries(["ChevronRight", "History", "ReceiptText", "X"].map((key) => [key, `icon-${key}`])),
      react: { useMemo: (fn) => fn(), useState: () => [null, () => {}], useSyncExternalStore: () => JSON.stringify(orders) },
    }).TikTokHistory;
    const tree = Component();
    assert.match(text(tree), language === "fr" ? /770 pièces achetées/ : /770 coins purchased/);
    assert.match(text(tree), language === "fr" ? /Réussie.*En attente/s : /Successful.*Pending/s);
    assert.match(text(tree), language === "fr" ? /ne constitue pas une nouvelle vérification/ : /not a new payment verification/);
    assert.equal(nodes(tree).filter((element) => element.type === "button" && element.props.className === "tiktok-order").length, 2);
  }
});
