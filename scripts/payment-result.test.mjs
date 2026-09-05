import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readOrderToken } from "../src/lib/payment-api.ts";
import { DRAVA_CONTACT } from "../src/lib/drava-contact.ts";

const require = createRequire(import.meta.url);
const source = await readFile(
  new URL("../src/components/payment/PaymentResult.tsx", import.meta.url),
  "utf8",
);
const receiptSource = await readFile(
  new URL("../src/components/payment/PaymentReceipt.tsx", import.meta.url),
  "utf8",
);
const transpile = (code) => ts.transpileModule(code, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const compiled = transpile(source);
const compiledReceipt = transpile(receiptSource);

// Execute the actual component's effect and render with isolated hooks and API.
// No network, browser storage, real order or provider credentials are involved.
async function renderResult({
  environment = "development",
  hostname = "127.0.0.1",
  hash = "#simulation",
  status = "success",
  language = "fr",
  printError = false,
  deferPrint = false,
  embedded = false,
  orderToken,
  providerLink,
  onReturn,
  response = { status: "paid", verified: true, amount: 5000, currency: "XOF", productId: "visa-basic", createdAt: Date.UTC(2026, 8, 5, 12) },
  responseSequence,
  fakeTimers = false,
} = {}) {
  const states = [];
  const effects = [];
  const calls = [];
  let printCalls = 0;
  const originalUrl = `http://${hostname || "localhost"}:3000/payment-${status}/${hash}`;
  const location = new URL(originalUrl);
  Object.defineProperty(location, "hostname", { value: hostname });
  const printedUrls = [];
  const events = new Map();
  let cursor = 0;
  let collectEffects = true;
  let timerId = 0;
  const timers = new Map();
  const responses = responseSequence ?? [response];
  const imports = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    react: {
      Fragment: require("react").Fragment,
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => {
          states[index] = typeof next === "function" ? next(states[index]) : next;
        }];
      },
      useEffect(effect) { if (collectEffects) effects.push(effect); },
      useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
    },
    "@/components/layout/MainLayout": { default: "main" },
    "@/components/ui/button": { Button: "button" },
    "@/lib/language-context": { useLanguage: () => ({ language }) },
    "@/lib/drava-contact": { DRAVA_CONTACT },
    "@/lib/payment-api": {
      readOrderToken,
      PaymentApiError: class extends Error {},
    async getPaymentOrderStatus(token) {
      calls.push(token);
      const next = responses[Math.min(calls.length - 1, responses.length - 1)];
      if (next instanceof Error) throw next;
      return { service: "cards", provider: "leekpay", ...next };
    },
    },
    "./payment-result-embedded.css": {},
    "lucide-react": {
      AlertTriangle: "warning-icon",
      CheckCircle2: "success-icon",
      LoaderCircle: "loading-icon",
      Printer: "printer-icon",
    },
    "next/link": { default: "a" },
  };
  const globals = {
    require(name) {
      assert.ok(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    process: { env: { NODE_ENV: environment } },
    window: {
      location,
      history: { state: {}, replaceState(_state, _unused, url) { location.href = new URL(url, location.href).href; } },
      addEventListener(name, listener) { events.set(name, listener); },
      removeEventListener(name) { events.delete(name); },
      print() {
        printCalls++;
        printedUrls.push(location.href);
        if (printError) throw new Error("Printing unavailable");
        if (!deferPrint) events.get("afterprint")?.();
      },
    },
    URL,
    AbortController,
    // Keep polling bounded and deterministic; tests only need its first result.
    setTimeout: fakeTimers ? (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; } : () => 1,
    clearTimeout: fakeTimers ? (id) => { timers.delete(id); } : () => {},
  };
  const receiptContext = vm.createContext({ ...globals, exports: {} });
  vm.runInContext(compiledReceipt, receiptContext);
  imports["@/components/payment/PaymentReceipt"] = { default: receiptContext.exports.default };
  const context = vm.createContext({ ...globals, exports: {} });
  vm.runInContext(compiled, context);
  const Component = context.exports.default;
  const props = { status, embedded, orderToken, providerLink, onReturn };
  Component(props);
  const cleanups = effects.map((effect) => effect());
  await new Promise((resolve) => setImmediate(resolve));
  collectEffects = false;
  cursor = 0;
  function resolve(element) {
    if (Array.isArray(element)) return element.map(resolve);
    if (element == null || typeof element !== "object") return element;
    if (typeof element.type === "function") return resolve(element.type(element.props));
    return { ...element, props: { ...element.props, children: resolve(element.props?.children) } };
  }
  const tree = resolve(Component(props));
  if (!fakeTimers) for (const cleanup of cleanups) cleanup?.();
  function textOf(element) {
    if (element == null || typeof element === "boolean") return "";
    if (Array.isArray(element)) return element.map(textOf).join("");
    if (typeof element === "object") return textOf(element.props?.children);
    return String(element);
  }
  const nodes = [];
  function collect(element) {
    if (Array.isArray(element)) return element.forEach(collect);
    if (element == null || typeof element !== "object") return;
    nodes.push(element);
    collect(element.props?.children);
  }
  collect(tree);
  return { text: textOf(tree), states, calls, tree: JSON.stringify(tree), nodes, getPrintCalls: () => printCalls, printedUrls, location, originalUrl, finishPrint: () => events.get("afterprint")?.(), unmount() { for (const cleanup of cleanups) cleanup?.(); }, async flushPoll() {
    const next = [...timers.entries()].find(([, value]) => value.ms !== 90000);
    if (next) { timers.delete(next[0]); next[1].fn(); await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); await Promise.resolve(); }
  }, async repeatVerification() {
    const nextCleanups = effects.map((effect) => effect());
    await new Promise((resolve) => setImmediate(resolve));
    for (const cleanup of nextCleanups) cleanup?.();
  } };
}

test("local development previews a successful order without an API call or verified order", async () => {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    const result = await renderResult({ hostname });
    assert.match(result.text, /Simulation locale — aucun paiement réel/);
    assert.match(result.text, /Paiement Réussi !/);
    assert.match(result.text, /Carte Virtuelle/);
    assert.match(result.text, /5\s000 FCFA/);
    assert.match(result.text, /05 septembre 2026/);
    assert.match(result.tree, /success-icon/);
    assert.doesNotMatch(result.text, /serveur sécurisé|Vérifier à nouveau/);
    assert.deepEqual(result.calls, []);
    assert.equal(result.states[0], "simulation");
    assert.equal(result.states[1], null, "Simulation must not fabricate an order");
  }
});

test("simulation is denied in every non-development environment including a locally served production build", async () => {
  for (const environment of ["production", "test", undefined, ""]) {
    for (const hostname of ["127.0.0.1", "localhost", "[::1]", "drava.click"]) {
      // Empty string covers unset NODE_ENV; undefined would use the default.
      const result = await renderResult({ environment: environment ?? "", hostname });
      assert.equal(result.states[0], "missing");
      assert.doesNotMatch(result.text, /Simulation locale|Paiement Réussi/);
      assert.doesNotMatch(result.tree, /success-icon/);
      assert.deepEqual(result.calls, []);
    }
  }
});

test("remote hosts, lookalike hosts and failure page cannot enable the preview", async () => {
  for (const hostname of ["drava.click", "payool.github.io", "localhost.example.com", "127.0.0.1.example.com", "192.168.1.2", "0.0.0.0", ""]) {
    const result = await renderResult({ hostname });
    assert.equal(result.states[0], "missing");
    assert.deepEqual(result.calls, []);
  }
  const failure = await renderResult({ status: "failure" });
  assert.match(failure.text, /Paiement non finalisé/);
  assert.doesNotMatch(failure.text, /Simulation locale|Paiement Réussi/);
  assert.deepEqual(failure.calls, []);
});

test("preview requires the exact fragment and does not accept injected payment state", async () => {
  for (const hash of ["", "#Simulation", "#simulation=paid", "#simulation&order=abc", "#simulation/", "#paid", "#verified=true"]) {
    const result = await renderResult({ hash });
    assert.equal(result.states[0], "missing");
    assert.deepEqual(result.calls, []);
  }
});

test("a valid order token still uses server verification in development and production", async () => {
  const token = "a".repeat(64);
  for (const environment of ["development", "production"]) {
    const result = await renderResult({ environment, hash: `#order=${token}` });
    assert.deepEqual(result.calls, [token]);
    assert.equal(result.states[0], "paid");
    assert.match(result.text, /Paiement Réussi !/);
    assert.match(result.text, /Votre commande a été confirmée avec succès/);
    assert.doesNotMatch(result.text, /Simulation locale|commande est fictive/);
  }
  const unverified = await renderResult({
    hash: `#order=${token}`,
    response: { status: "paid", verified: false, amount: 5000, currency: "XOF", productId: "visa-basic" },
  });
  assert.equal(unverified.states[0], "pending");
  assert.doesNotMatch(unverified.text, /Paiement Réussi|Prochaines étapes/);
  assert.doesNotMatch(unverified.tree, /success-icon/);
});

test("the local preview is translated into English", async () => {
  const result = await renderResult({ language: "en" });
  assert.match(result.text, /Local simulation — no real payment/);
  assert.match(result.text, /Payment Successful!/);
  assert.match(result.text, /Next steps/);
  assert.match(result.text, /5,000 FCFA/);
  assert.deepEqual(result.calls, []);
});

test("receipt contains the requested manual fulfillment instructions and exact safe links", async () => {
  const result = await renderResult();
  assert.match(result.text, /Veuillez cliquer sur le lien suivant afin d’ouvrir votre compte/);
  assert.match(result.text, /Une fois votre compte créé et vérifié, envoyez-nous l’adresse e-mail associée par WhatsApp/);
  assert.match(result.text, /Nous procéderons alors à l’ajout de la carte dans votre compte/);
  assert.doesNotMatch(result.text, /Telegram|t\.me\/PayOolTM/);
  assert.match(result.text, /Merci de votre confiance ! 🎉/);
  const links = result.nodes.filter((node) => node.type === "a");
  assert.deepEqual(links.map((node) => node.props.href), [
    "https://prismcard.net/r/VPBUL1EF",
    "https://wa.me/237692426620",
    "/",
  ]);
  for (const link of links.slice(0, 2)) {
    assert.equal(link.props.rel, "noopener noreferrer");
    assert.equal(link.props.target, "_blank");
    assert.doesNotMatch(link.props.href, /[?#]/);
  }
  const printButton = result.nodes.find((node) => node.type === "button" && typeof node.props.onClick === "function");
  assert.equal(result.getPrintCalls(), 0, "Printing must not happen automatically");
  printButton.props.onClick();
  assert.equal(result.getPrintCalls(), 1);
  assert.deepEqual(result.printedUrls, ["http://127.0.0.1:3000/payment-success/"]);
  assert.equal(result.location.href, result.originalUrl);
  assert.deepEqual(result.calls, []);
});

test("receipt shows the stored order date and actual amount, never the date it is reopened", async () => {
  const result = await renderResult({
    environment: "production",
    hash: `#order=${"b".repeat(64)}`,
    response: { status: "paid", verified: true, amount: 15000, currency: "XOF", productId: "mastercard-platinum", createdAt: Date.UTC(2024, 11, 31, 23, 30) },
  });
  assert.match(result.text, /15\s000 FCFA/);
  assert.match(result.text, /01 janvier 2025/);
  assert.doesNotMatch(result.text, /05 septembre 2026|Simulation locale/);
  assert.equal(result.nodes.find((node) => node.type === "time").props.dateTime, "2024-12-31T23:30:00.000Z");
  const legacy = await renderResult({
    hash: `#order=${"b".repeat(64)}`,
    response: { status: "paid", verified: true, amount: 6000, currency: "XOF", productId: "mastercard-basic" },
  });
  assert.match(legacy.text, /Non disponible/);
  assert.equal(legacy.nodes.some((node) => node.type === "time"), false);
});

test("unconfirmed and failed payments cannot display instructions or print a successful receipt", async () => {
  for (const response of [
    { status: "pending", verified: false },
    { status: "processing", verified: false },
    { status: "failed", verified: false },
    { status: "cancelled", verified: false },
    { status: "expired", verified: false },
  ]) {
    const result = await renderResult({ hash: `#order=${"c".repeat(64)}`, response });
    assert.doesNotMatch(result.text, /Paiement Réussi|Prochaines étapes|Imprimer le reçu/);
    assert.doesNotMatch(result.tree, /prismcard|PayOolTM|chat\.whatsapp/);
  }
});

test("printing never exposes or restores the consumed private order fragment", async () => {
  for (const printError of [false, true]) {
    const result = await renderResult({ hash: `#order=${"d".repeat(64)}`, printError });
    const printButton = result.nodes.find((node) => node.type === "button" && typeof node.props.onClick === "function");
    if (printError) assert.throws(() => printButton.props.onClick(), /Printing unavailable/);
    else printButton.props.onClick();
    assert.deepEqual(result.printedUrls, ["http://127.0.0.1:3000/payment-success/"]);
    assert.equal(result.location.href, "http://127.0.0.1:3000/payment-success/");
  }
});

test("deferred printing keeps the URL private without overwriting subsequent navigation", async () => {
  const options = { hash: `#order=${"e".repeat(64)}`, deferPrint: true };
  const result = await renderResult(options);
  result.nodes.find((node) => node.type === "button" && typeof node.props.onClick === "function").props.onClick();
  assert.equal(result.location.href, "http://127.0.0.1:3000/payment-success/");
  result.finishPrint();
  assert.equal(result.location.href, "http://127.0.0.1:3000/payment-success/");
  const navigated = await renderResult(options);
  navigated.nodes.find((node) => node.type === "button" && typeof node.props.onClick === "function").props.onClick();
  navigated.location.href = "http://127.0.0.1:3000/";
  navigated.finishPrint();
  assert.equal(navigated.location.href, "http://127.0.0.1:3000/");
});

test("card receipts accept server-verified orders from all shared providers and reject another service", async () => {
  for (const provider of ["leekpay", "soleaspay", "sebpay"]) {
    const result = await renderResult({ environment: "production", hash: `#order=${"f".repeat(64)}`, response: { service: "cards", provider, status: "paid", verified: true, amount: 5000, currency: "XOF", productId: "visa-basic" } });
    assert.equal(result.states[0], "paid");
    assert.match(result.text, /Paiement Réussi/);
    assert.doesNotMatch(result.text, /LeekPay/);
    assert.equal(result.location.hash, "");
  }
  const otherService = await renderResult({ hash: `#order=${"f".repeat(64)}`, response: { service: "tiktok", provider: "sebpay", status: "paid", verified: true, amount: 5000, currency: "XAF", productId: "pack-100" } });
  assert.equal(otherService.states[0], "unconfirmed");
  assert.doesNotMatch(otherService.text, /Paiement Réussi|Prochaines étapes/);
});

test("a paid card receipt stays visible while notification delivery is pending", async () => {
  const token = "9".repeat(64);
  const result = await renderResult({
    environment: "production",
    hash: `#order=${token}`,
    response: {
      service: "cards",
      provider: "leekpay",
      status: "paid",
      verified: true,
      amount: 5000,
      currency: "XOF",
      productId: "visa-basic",
      notification: "pending",
    },
  });
  assert.match(result.text, /Paiement Réussi/);
  assert.match(result.text, /Prochaines étapes/);
  assert.deepEqual(result.calls, [token]);
});

test("notification retry keeps the paid receipt, reuses its token and stops when sent", async () => {
  const token = "8".repeat(64);
  const result = await renderResult({
    environment: "production", fakeTimers: true, hash: `#order=${token}`,
    responseSequence: [
      { status: "paid", verified: true, amount: 5000, currency: "XOF", productId: "visa-basic", notification: "pending" },
      new Error("network outage"),
      { status: "paid", verified: true, amount: 5000, currency: "XOF", productId: "visa-basic", notification: "sent" },
    ],
  });
  assert.match(result.text, /Paiement Réussi/);
  await result.flushPoll();
  assert.match(result.text, /Paiement Réussi/);
  await result.flushPoll();
  assert.match(result.text, /Paiement Réussi/);
  assert.deepEqual(result.calls, [token, token, token]);
  await result.flushPoll();
  assert.deepEqual(result.calls, [token, token, token]);
  result.unmount();
});

test("verification replay and retries retain only the original in-memory token after URL cleanup", async () => {
  const token = "a".repeat(64);
  const result = await renderResult({ hash: `#order=${token}`, response: { status: "pending", verified: false } });
  assert.equal(result.location.hash, "");
  assert.deepEqual(result.calls, [token]);
  // A retry or Strict Mode replay must not reread an emptied or injected URL.
  result.location.hash = `#order=${"b".repeat(64)}`;
  await result.repeatVerification();
  assert.deepEqual(result.calls, [token, token]);
});

test("embedded card verification preserves the operator approval link and returns via the supplied callback", async () => {
  let returned = 0;
  const result = await renderResult({ embedded: true, orderToken: "a".repeat(64), providerLink: "https://operator.example.test/approve", hash: "#simulation", response: { status: "pending", verified: false }, onReturn: () => { returned++; } });
  assert.deepEqual(result.calls, ["a".repeat(64)]);
  assert.doesNotMatch(result.text, /Simulation locale|Paiement Réussi/);
  assert.equal(result.nodes.some((node) => node.type === "main"), false);
  const operator = result.nodes.find((node) => node.props?.href === "https://operator.example.test/approve");
  assert.equal(operator.props.target, "_blank");
  assert.equal(operator.props.rel, "noopener noreferrer");
  result.nodes.find((node) => node.type === "button" && node.props.onClick && !node.props.variant).props.onClick();
  assert.equal(returned, 1);
  const paid = await renderResult({ embedded: true, orderToken: "a".repeat(64), hash: "#card:visa-basic", onReturn: () => { returned++; } });
  assert.match(paid.text, /Paiement Réussi/);
  assert.equal(paid.location.hash, "#card:visa-basic", "An embedded result must not rewrite public catalogue history");
  paid.nodes.find((node) => node.type === "button" && node.props.onClick && !node.props.variant).props.onClick();
  assert.equal(returned, 2);
});
