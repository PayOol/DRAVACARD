import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PaymentApiError, readOrderToken } from "../src/lib/leekpay.ts";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/components/tiktok/TikTokResult.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText;
const token = "a".repeat(64);
const order = { provider: "sebpay", packId: "boost", status: "paid", verified: true, coins: 700, bonus: 70, amount: 7900, currency: "XAF", createdAt: 1788600000000, orderId: "TIKTOK-TEST", notification: "pending", username: "qa_creator", transactionReference: "qa_reference" };
const settle = () => new Promise(resolve => setImmediate(resolve));

// Run the real verification effect with deterministic timers and no network.
function verification(responses, props = { orderToken: token }, language = "fr") {
  const hooks = [], timers = new Map(), pending = [], calls = [], sounds = [], saved = [];
  let cursor = 0, nextTimer = 0;
  const imports = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in hooks)) hooks[i] = initial;
        return [hooks[i], next => { hooks[i] = typeof next === "function" ? next(hooks[i]) : next; }];
      },
      useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
      useEffect(effect, deps) {
        const i = cursor++, previous = hooks[i];
        if (!previous || deps.some((value, index) => value !== previous.deps[index])) {
          const entry = { deps, cleanup: undefined };
          hooks[i] = entry;
          pending.push(() => { previous?.cleanup?.(); entry.cleanup = effect(); });
        }
      },
    },
    "@/components/layout/MainLayout": { default: "main" },
    "@/lib/language-context": { useLanguage: () => ({ language }) },
    "@/lib/leekpay": { PaymentApiError, readOrderToken },
    "@/lib/tiktok-payment": { async getTikTokOrderStatus(value, signal) {
      calls.push({ token: value, signal });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.ok(response, "Unexpected additional verification request");
      return response;
    } },
    "@/lib/tiktok-history": { rememberTikTokOrder: value => saved.push(value) },
    "@/lib/tiktok-sound": { playSuccess: () => sounds.push("success"), playFailure: () => sounds.push("failure") },
    "lucide-react": { LoaderCircle: "spinner", TriangleAlert: "warning" },
    "next/link": { default: "a" },
    "./TikTokHelp": { TikTokWhatsAppPicker: "support" },
    "./TikTokSuccess": { TikTokReceipt: "receipt" },
    "./tiktok-checkout.css": {},
  };
  const context = vm.createContext({ exports: {}, AbortController, require(name) {
    assert.ok(name in imports, `Unexpected dependency ${name}`); return imports[name];
  }, setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext(compiled, context);
  const render = () => { cursor = 0; return context.exports.TikTokVerification(props); };
  return {
    calls, sounds, saved, timers, render,
    async flush() { render(); pending.splice(0).forEach(effect => effect()); await settle(); return render(); },
    async tick(predicate = delay => delay < 300000) {
      const entry = [...timers].find(([, timer]) => predicate(timer.delay));
      assert.ok(entry, "Expected a scheduled timer");
      timers.delete(entry[0]); await entry[1].callback(); await settle(); return render();
    },
    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); },
  };
}
function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  return element && typeof element === "object" ? [element, ...nodes(element.props?.children)] : [];
}

test("verified payment shows its receipt before email delivery and polls notification without replaying the success sound", async () => {
  const close = () => {};
  const run = verification([order, { ...order, notification: "sent" }], { orderToken: token, onReturnHome: close });
  let tree = await run.flush();
  assert.equal(tree.type, "receipt");
  assert.equal(tree.props.notificationRetrying, true);
  assert.equal(tree.props.onReturnHome, close);
  assert.deepEqual(run.sounds, ["success"]);
  tree = await run.tick();
  assert.equal(tree.props.order.notification, "sent");
  assert.equal(tree.props.notificationRetrying, false);
  assert.equal(run.timers.size, 0);
  assert.deepEqual(run.sounds, ["success"]);
  assert.deepEqual(run.calls.map(call => call.token), [token, token]);
  run.cleanup();
});

test("an email timeout retains confirmed payment and retries the same order without a new charge", async () => {
  const run = verification([order, { ...order, notification: "sent" }]);
  await run.flush();
  let tree = await run.tick(delay => delay === 300000);
  assert.equal(run.calls[0].signal.aborted, true);
  assert.equal(tree.type, "receipt");
  assert.equal(tree.props.notificationRetrying, false);
  tree.props.onRetryNotification();
  tree = await run.flush();
  assert.equal(tree.props.order.notification, "sent");
  assert.deepEqual(run.calls.map(call => call.token), [token, token]);
  assert.deepEqual(run.sounds, ["success"]);
  run.cleanup();
});

test("a failed notification status request does not erase a verified payment and retry can recover", async () => {
  const run = verification([order, new PaymentApiError(false), { ...order, notification: "sent" }]);
  await run.flush();
  let tree = await run.tick();
  assert.equal(tree.type, "receipt");
  assert.equal(tree.props.order.verified, true);
  assert.equal(tree.props.notificationRetrying, false);
  tree.props.onRetryNotification();
  tree = await run.flush();
  assert.equal(tree.props.order.notification, "sent");
  run.cleanup();
});

test("receipt-store outages retain known identity only for the same verified order", async () => {
  const withoutDetails = { ...order, username: undefined, transactionReference: undefined };
  const run = verification([order, withoutDetails, { ...withoutDetails, orderId: "TIKTOK-OTHER", notification: "sent" }]);
  await run.flush();
  let tree = await run.tick();
  assert.equal(tree.props.order.username, order.username);
  assert.equal(tree.props.order.transactionReference, order.transactionReference);
  tree = await run.tick();
  assert.equal(tree.props.order.orderId, "TIKTOK-OTHER");
  assert.equal(tree.props.order.username, undefined);
  assert.equal(tree.props.order.transactionReference, undefined);
  run.cleanup();
});

test("pending, failed and unverified orders never render a successful receipt in either language", async () => {
  for (const language of ["fr", "en"]) for (const response of [
    { ...order, status: "pending", verified: false },
    { ...order, status: "failed", verified: false },
    { ...order, verified: false },
  ]) {
    const run = verification([response], { orderToken: token }, language);
    const tree = await run.flush();
    assert.equal(nodes(tree).some(node => node.type === "receipt"), false);
    assert.equal(run.sounds.includes("success"), false);
    run.cleanup();
    assert.equal(run.timers.size, 0);
  }
});

test("missing order capability performs no request, produces no receipt and leaves no polling timer", async () => {
  const run = verification([], { orderToken: null });
  const tree = await run.flush();
  assert.equal(tree.type, "section");
  assert.equal(run.calls.length, 0);
  assert.equal(run.timers.size, 0);
  run.cleanup();
});
