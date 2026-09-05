import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PAYMENT_PROVIDERS } from "../src/lib/payment-providers.ts";

const providerPath = new URL(
  "../src/components/ui/dialog-providers.tsx",
  import.meta.url,
);
const checkoutPath = new URL(
  "../src/components/ui/dialog-checkout.tsx",
  import.meta.url,
);
const customerPath = new URL(
  "../src/components/ui/dialog-customer.tsx",
  import.meta.url,
);
const notesPath = new URL(
  "../src/components/ui/dialog-notes.tsx",
  import.meta.url,
);
const paymentCustomerPath = new URL(
  "../src/lib/payment-customer.ts",
  import.meta.url,
);
const customerLocationPath = new URL(
  "../src/lib/customer-location.ts",
  import.meta.url,
);
const workerPath = new URL("../worker/src/index.ts", import.meta.url);
const workerPackagePath = new URL("../worker/package.json", import.meta.url);
const pagePath = new URL("../src/app/page.tsx", import.meta.url);
const [
  providerSource,
  checkoutSource,
  customerSource,
  notesSource,
  paymentCustomerSource,
  customerLocationSource,
  workerSource,
  workerPackageSource,
  pageSource,
  shellSource,
  optionSource,
  tiktokCheckoutSource,
  sharedProvidersSource,
  workerSharedSource,
] =
  await Promise.all(
    [
      providerPath,
      checkoutPath,
      customerPath,
      notesPath,
      paymentCustomerPath,
      customerLocationPath,
      workerPath,
      workerPackagePath,
      pagePath,
      new URL("../src/components/ui/CheckoutShell.tsx", import.meta.url),
      new URL("../src/components/ui/CheckoutProviderOption.tsx", import.meta.url),
      new URL("../src/components/tiktok/TikTokCheckout.tsx", import.meta.url),
      new URL("../src/components/payment/SharedPaymentProviders.tsx", import.meta.url),
      new URL("../worker/src/shared.ts", import.meta.url),
    ].map((file) => readFile(file, "utf8")),
  );

function blockAround(source, marker, opening, closing) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing marker: ${marker}`);
  const start = source.lastIndexOf(opening, markerIndex);
  const end = source.indexOf(closing, markerIndex);
  assert.notEqual(start, -1, `Missing opening token before: ${marker}`);
  assert.notEqual(end, -1, `Missing closing token after: ${marker}`);
  return source.slice(start, end + closing.length);
}

test("both services use the common registry and selectable provider tiles", () => {
  assert.deepEqual(PAYMENT_PROVIDERS.map((provider) => provider.id), ["leekpay", "soleaspay", "sebpay"]);
  for (const source of [providerSource, tiktokCheckoutSource]) {
    assert.match(source, /<SharedPaymentProviders/);
    assert.doesNotMatch(source, /id="(?:leekpay|soleaspay|sebpay)"/);
  }
  assert.match(sharedProvidersSource, /PAYMENT_PROVIDERS\.map/);
  const tile = blockAround(sharedProvidersSource, "selected={value === provider.id}", "<CheckoutProviderOption", "/>");
  assert.match(tile, /onSelect=\{\(\) => onChange\(provider\.id\)\}/);
  assert.match(tile, /disabled=\{disabled \|\| state\.loading \|\| state\.error\}/);
  assert.match(tile, /recommended=\{provider\.recommended\}/);
  assert.match(tile, /unavailable=\{[\s\S]*?\.available === false/);
  assert.match(optionSource, /type="button"/);
  assert.match(optionSource, /aria-pressed=\{selected\}/);
  assert.match(optionSource, /disabled=\{disabled \|\| unavailable\}/);
  assert.match(optionSource, /onClick=\{onSelect\}/);
  assert.match(optionSource, /alt=""/);
  assert.ok(
    optionSource.indexOf('alt=""') < optionSource.indexOf("<strong>{name}</strong>"),
    "The decorative logo thumbnail must precede the visible provider name",
  );
  assert.match(optionSource, /"Recommandé"/);
  assert.match(optionSource, /"Recommended"/);
  assert.match(optionSource, /\babsolute\s+-top-2\s+right-2\b/);
  for (const source of [optionSource, sharedProvidersSource]) assert.doesNotMatch(source, /handleCheckout|createPaymentCheckout|createLeekPayCheckout|createTikTokCheckout|\bfetch\s*\(/);
});

test("both catalogues use the shared top-right floating recommendation badge like LeekPay", async () => {
  const badge = await readFile(new URL("../src/components/catalog/RecommendedBadge.tsx", import.meta.url), "utf8");
  assert.match(badge, /pointer-events-none\s+absolute\s+-top-2\s+right-2\s+z-10/);
  assert.match(optionSource, /absolute\s+-top-2\s+right-2/);
  assert.match(badge, /language === "fr" \? "Recommandé" : "Recommended"/);
  for (const layout of ["DesktopCatalog", "MobileCatalog"]) {
    const source = await readFile(new URL(`../src/components/catalog/${layout}.tsx`, import.meta.url), "utf8");
    assert.match(source, /card\.recommended && <RecommendedBadge \/>/);
    assert.match(source, /from "@\/components\/catalog\/RecommendedBadge"/);
  }
});

test("only the separate global Pay button starts checkout", () => {
  assert.equal(
    providerSource.match(/onClick=\{handleCheckout\}/g)?.length,
    1,
    "There must be exactly one checkout action",
  );
  const fieldsetEnd = providerSource.indexOf("<SharedPaymentProviders");
  const checkoutAction = providerSource.indexOf("onClick={handleCheckout}");
  assert.ok(
    checkoutAction > fieldsetEnd,
    "The checkout action must remain outside and below the provider grid",
  );

  const payButton = blockAround(
    providerSource,
    "onClick={handleCheckout}",
    "<Button",
    "</Button>",
  );
  assert.match(payButton, /type="button"/);
  assert.match(payButton, /disabled=\{isProcessing \|\| !available\}/);
  assert.match(payButton, /"Payer"[\s\S]*?"Pay"/);

  const checkoutHandler = providerSource.slice(
    providerSource.indexOf("const submit"),
    providerSource.indexOf("const formattedAmount"),
  );
  assert.match(
    checkoutHandler,
    /!available \|\| requestRef\.current \|\| !selectedProvider/,
  );
  assert.equal(
    checkoutHandler.match(/createPaymentCheckout\(/g)?.length,
    1,
  );
  assert.match(
    checkoutHandler,
    /createPaymentCheckout\([\s\S]*?selection: \{ service: "cards", productId: card\.id \},[\s\S]*?customer,[\s\S]*?consent: true,[\s\S]*?controller\.signal,[\s\S]*?\)/,
  );
  assert.match(
    checkoutHandler,
    /window\.location\.assign\(checkout\.checkoutUrl\)/,
  );
  const backButton = blockAround(
    providerSource,
    "onClick={onBack}",
    "<Button",
    "</Button>",
  );
  assert.match(backButton, /disabled=\{isProcessing\}/);
  assert.match(backButton, /type="button"/);
});

test("the provider modal cannot bypass the reviewed payment adapter", () => {
  assert.doesNotMatch(providerSource, /\bfetch\s*\(/);
  assert.doesNotMatch(
    providerSource,
    /leekpay\.fr\/js\/leekpay\.js|window\.LeekPay/,
  );
  assert.doesNotMatch(providerSource, /\b(?:pk|sk)_(?:live|test)_/i);
  assert.doesNotMatch(providerSource, /<(?:form|input|select|textarea)\b/i);
});

test("one shared Radix shell presents both product flows while card consent steps remain controlled", () => {
  for (const primitive of ["Root", "Portal", "Overlay", "Content"]) {
    const openingTag = new RegExp(`<DialogPrimitive\\.${primitive}\\b`, "g");
    assert.equal(
      shellSource.match(openingTag)?.length,
      1,
      `CheckoutShell must own exactly one Radix ${primitive}`,
    );
    for (const controller of [checkoutSource, tiktokCheckoutSource]) assert.equal(controller.match(openingTag)?.length ?? 0, 0, `Product controllers must not own Radix ${primitive}`);
    assert.equal(
      notesSource.match(openingTag)?.length ?? 0,
      0,
      `UsageNotes must not own Radix ${primitive}`,
    );
    assert.equal(
      providerSource.match(openingTag)?.length ?? 0,
      0,
      `PaymentProviders must not own Radix ${primitive}`,
    );
    assert.equal(
      customerSource.match(openingTag)?.length ?? 0,
      0,
      `CustomerDetails must not own Radix ${primitive}`,
    );
  }

  const compactCheckout = checkoutSource.replace(/\s+/g, "");
  assert.match(
    compactCheckout,
    /useState<CheckoutStep>\("notes"\)/,
    "Consent notes must be the initial step",
  );
  assert.match(
    compactCheckout,
    /typeCheckoutStep="notes"\|"customer"\|"providers"/,
  );
  assert.match(
    compactCheckout,
    /<UsageNotesonAccept=\{\(\)=>\{setStep\("customer"\);setLocationRequested\(true\);\}\}onClose=\{onClose\}\/>/,
  );
  assert.match(
    compactCheckout,
    /<CustomerDetailsvalue=\{customer\}onChange=\{\(details\)=>\{if\(details\.whatsapp!==customer\.whatsapp\)whatsappEditedRef\.current=true;setCustomer\(details\);\}\}onNext=\{\(details\)=>\{setCustomer\(details\);setStep\("providers"\);\}\}onBack=\{\(\)=>setStep\("notes"\)\}\/>/,
  );
  assert.match(
    compactCheckout,
    /<PaymentProviderscard=\{card\}customer=\{validCustomer\}provider=\{provider\}phase=\{step==="payment"\?"payment":"providers"\}onProviderChange=\{setProvider\}onConfigure=\{\(\)=>setStep\("payment"\)\}onBusyChange=\{onBusyChange\}/,
  );
  assert.doesNotMatch(
    checkoutSource,
    /createLeekPayCheckout|handleCheckout|\bfetch\s*\(|window\.location/,
  );
  assert.match(compactCheckout, /<AnimatePresenceinitial=\{false\}mode="sync">/);
  assert.match(
    compactCheckout,
    /<CheckoutPanelkey=\{step\}reducedMotion=\{reducedMotion\}scrollTop=\{scrollPositions\.current\[step\]\}onScrollTopChange=\{\(position\)=>\{scrollPositions\.current\[step\]=position;\}\}>/,
  );
  assert.match(compactCheckout, /constscrollPositions=useRef<Record<CheckoutStep,number>>\(\{notes:0,customer:0,providers:0,payment:0,?\}\)/);
  assert.match(compactCheckout, /canDismiss=\{!paymentBusy\}/);
  assert.match(compactCheckout, /if\(paymentBusyRef\.current\)\{addCheckpoint\(\);return;\}/);
  assert.equal(checkoutSource.match(/key=\{step\}/g)?.length, 1);
  assert.match(checkoutSource, /useReducedMotion\(\) === true/);
  assert.match(
    shellSource.replace(/\s+/g, ""),
    /useLayoutEffect\(\(\)=>\{if\(panelRef\.current\)panelRef\.current\.inert=!isPresent;\},\[isPresent\]\)/,
  );
  assert.match(shellSource.replace(/\s+/g, ""), /aria-hidden=\{!isPresent\|\|undefined\}/);
  assert.match(shellSource.replace(/\s+/g, ""), /ref=\{panelRef\}/);
  for (const controller of [checkoutSource, tiktokCheckoutSource]) {
    assert.equal(controller.match(/<CheckoutShell\b/g)?.length, 1);
    assert.match(controller, /from "@\/components\/ui\/CheckoutShell"/);
  }
});

test("calling-code detection is consent-gated, single-shot and cannot overwrite WhatsApp", () => {
  const compactCheckout = checkoutSource.replace(/\s+/g, "");
  assert.match(
    checkoutSource,
    /import \{ detectCustomerLocation \} from "@\/lib\/customer-location";/,
  );
  assert.match(
    compactCheckout,
    /const\[locationRequested,setLocationRequested\]=useState\(false\)/,
  );
  assert.equal(
    checkoutSource.match(/\bsetLocationRequested\s*\(/g)?.length,
    1,
    "Consent may enable the lookup only once per mounted dialog",
  );
  assert.equal(
    checkoutSource.match(/\bdetectCustomerLocation\s*\(/g)?.length,
    1,
    "The dialog may invoke the location helper from only one place",
  );
  assert.match(
    compactCheckout,
    /useEffect\(\(\)=>\{if\(!locationRequested\)return;constcontroller=newAbortController\(\);voiddetectCustomerLocation\(controller\.signal\)\.then\(\(location\)=>\{if\(!location\|\|controller\.signal\.aborted\)return;setCustomer\(\(current\)=>whatsappEditedRef\.current\|\|current\.whatsapp\?current:\{\.\.\.current,whatsapp:location\.callingCode\},?\);\}\);return\(\)=>controller\.abort\(\);\},\[locationRequested\]\)/,
  );
  assert.match(
    compactCheckout,
    /if\(details\.whatsapp!==customer\.whatsapp\)whatsappEditedRef\.current=true;setCustomer\(details\)/,
    "Typing or clearing WhatsApp must permanently mark the draft as touched",
  );
  assert.doesNotMatch(
    checkoutSource,
    /\bfetch\s*\(|navigator\.(?:geolocation|permissions)|getCurrentPosition|watchPosition|localStorage|sessionStorage|console\.(?:log|info|warn|error|debug)/,
  );
});

test("location helper performs one bounded private proxy GET with null fallback", () => {
  assert.match(
    customerLocationSource,
    /fetch\(`\$\{LEEKPAY_API_BASE\}\/api\/location`,/,
  );
  assert.equal(customerLocationSource.match(/\bfetch\s*\(/g)?.length, 1);
  for (const option of [
    /method: "GET"/,
    /credentials: "omit"/,
    /cache: "no-store"/,
    /redirect: "error"/,
    /referrerPolicy: "no-referrer"/,
    /setTimeout\(abort, 4000\)/,
    /MAX_RESPONSE_BYTES = 1024/,
  ]) {
    assert.match(customerLocationSource, option);
  }
  assert.match(customerLocationSource, /response\.body\?\.getReader\(\)/);
  assert.match(customerLocationSource, /keys\.length !== 2/);
  assert.match(customerLocationSource, /\^\[A-Z\]\{2\}\$/);
  assert.match(customerLocationSource, /\^\\\+\[1-9\]\[0-9\]\{0,2\}\$/);
  assert.match(customerLocationSource, /catch \{\s*return null;/);
  assert.doesNotMatch(
    customerLocationSource,
    /navigator\.(?:geolocation|permissions)|getCurrentPosition|watchPosition|CF-IPCountry|localStorage|sessionStorage|indexedDB|document\.cookie|console\.(?:log|info|warn|error|debug)|\bbody\s*:/,
  );
});

test("Worker returns only a calling code derived from Cloudflare country metadata", () => {
  assert.match(
    workerSharedSource,
    /import \{ getCountryCallingCode, isSupportedCountry \} from "libphonenumber-js";/,
  );
  const locationFunction = blockAround(
    workerSharedSource,
    "request.cf?.country",
    "function locationResponse",
    "\n}\n",
  );
  assert.match(locationFunction, /const country: unknown = request\.cf\?\.country/);
  assert.match(locationFunction, /!\/\^\[A-Z\]\{2\}\$\/\.test\(country\)/);
  assert.match(locationFunction, /!isSupportedCountry\(country\)/);
  assert.match(
    locationFunction,
    /\{ countryCode: null, callingCode: null \}/,
  );
  assert.match(
    locationFunction,
    /\{ countryCode: country, callingCode: `\+\$\{getCountryCallingCode\(country\)\}` \}/,
  );
  assert.doesNotMatch(
    locationFunction,
    /headers\.get|CF-IPCountry|\b(?:city|region|postal|timezone|latitude|longitude|coordinates|address)\b|ORDERS|LEEKPAY_SECRET_KEY|providerJson|console\./i,
  );
  const route = workerSource.slice(workerSource.indexOf('const location = url.pathname === "/api/location";'), workerSource.indexOf("return await handlePaymentRequest"));
  assert.match(route, /if \(\(!location && !route\) \|\| url\.search\)/);
  assert.match(route, /const method = route \? paymentMethod\(route\) : "GET"/);
  assert.match(route, /request\.method !== method/);
  assert.match(route, /await enforceRateLimit\(request, env, route === "checkout"\)/);
  assert.match(route, /if \(location\) return locationResponse\(request, origin\)/);
  assert.doesNotMatch(route, /serviceReady|providerJson|ORDERS|LEEKPAY_SECRET_KEY/);
  assert.equal(
    JSON.parse(workerPackageSource).dependencies["libphonenumber-js"],
    "1.13.12",
  );
});

test("customer collection is limited to validated email and WhatsApp", () => {
  assert.equal(customerSource.match(/<input\b/g)?.length, 2);
  assert.match(
    customerSource,
    /name="email"[\s\S]*?type="email"[\s\S]*?maxLength=\{254\}/,
  );
  assert.match(
    customerSource,
    /name="whatsapp"[\s\S]*?type="tel"[\s\S]*?maxLength=\{40\}/,
  );
  assert.match(customerSource, /normalizePaymentCustomer\(value\)/);
  assert.match(customerSource, /event\.preventDefault\(\)/);
  assert.match(customerSource, /onNext\(customer\)/);
  const requiredStars = customerSource.match(
    /<label\b[^>]*>\s*<span\b(?=[^>]*\baria-hidden\s*=\s*["']true["'])(?=[^>]*\bclassName\s*=\s*["'][^"']*\btext-red-600\b[^"']*["'])[^>]*>\s*\*\s*<\/span>/g,
  );
  assert.equal(requiredStars?.length, 2);
  assert.match(customerSource, /"\+ Indicatif et numéro"/);
  assert.match(customerSource, /"\+ Code and number"/);
  assert.doesNotMatch(
    customerSource,
    /Incluez l.indicatif du pays|Include the country code|whatsapp-hint|placeholder="\+\d/,
  );
  assert.doesNotMatch(
    customerSource,
    /\bfetch\s*\(|createLeekPayCheckout|localStorage|sessionStorage|window\.location/,
  );
  assert.match(paymentCustomerSource, /Reflect\.ownKeys\(value\)/);
  assert.match(paymentCustomerSource, /return \{ email, whatsapp \};/);
  assert.doesNotMatch(providerSource, /customer\.email/);
  assert.match(providerSource, /whatsapp=\{customer\.whatsapp\}/);
});

test("the catalogue mounts only the unified checkout wrapper", () => {
  assert.match(pageSource, /\bselectedCard\s*&&\s*DialogCheckout\s*&&\s*\(/);
  assert.match(pageSource, /<DialogCheckout\b/);
  assert.match(pageSource, /onClose=\{\(\) => setSelectedCard\(null\)\}/);
  assert.doesNotMatch(
    pageSource,
    /\b(?:checkoutStep|notes-exiting|DialogNotes|DialogProviders)\b/,
  );
  assert.match(notesSource, /onClick=\{onAccept\}/);
  assert.match(notesSource, /onClick=\{onClose\}/);
  assert.doesNotMatch(notesSource, /createLeekPayCheckout|handleCheckout/);
});

// Run the real card controller with only transport and presentation mocked.
// A tile/Next must never start a debit; only the explicit payment action may.
function renderCardProviders({ provider = "leekpay", checkout } = {}) {
  const require = createRequire(import.meta.url);
  const states = [];
  const effects = [];
  const requests = [];
  const busy = [];
  const destinations = [];
  let cursor = 0;
  let collecting = true;
  let configured = 0;
  const props = {
    card: { id: "visa-basic", name: "Visa Basic", amount: 5000, displayCurrency: "FCFA" },
    customer: { email: "test@example.test", whatsapp: "+237699000000" },
    provider, phase: "providers", onProviderChange: () => {},
    onConfigure: () => { configured++; }, onBusyChange: (value) => busy.push(value), onBack: () => {}, onOrderCreated: () => {}, onClose: () => {},
  };
  const imports = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
      },
      useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
      useEffect(effect) { if (collecting) effects.push(effect); },
      useLayoutEffect(effect) { if (collecting) effects.push(effect); },
    },
    "framer-motion": { useIsPresent: () => true },
    "@/components/ui/button": { Button: "button" },
    "@/components/payment/SebPayForm": { SebPayForm: "sebpay-form" },
    "@/components/payment/PaymentResult": { default: "payment-result" },
    "@/components/payment/SharedPaymentProviders": { SharedPaymentProviders: "providers" },
    "@/lib/base-path": { withBasePath: (path) => path },
    "@/lib/language-context": { useLanguage: () => ({ language: "fr" }) },
    "@/lib/payment-providers": { PAYMENT_PROVIDERS },
    "@/lib/payment-api": { createPaymentCheckout: async (input, signal) => {
      requests.push({ input, signal });
      return checkout ? checkout(input, signal) : { orderToken: "a".repeat(64), checkoutUrl: provider === "sebpay" ? undefined : "https://checkout.example.test/mock" };
    } },
    "lucide-react": { AlertCircle: "icon", ArrowLeft: "icon", CheckCircle2: "icon", LoaderCircle: "icon" },
  };
  const context = vm.createContext({
    exports: {}, AbortController,
    window: { location: { assign: (url) => destinations.push(url) }, addEventListener() {}, removeEventListener() {} },
    require(name) { assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name]; },
  });
  vm.runInContext(ts.transpileModule(providerSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const Component = context.exports.PaymentProviders;
  const render = (updates = {}) => {
    Object.assign(props, updates);
    cursor = 0;
    const tree = Component(props);
    const nodes = [];
    const visit = (node) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      nodes.push(node); visit(node.props?.children);
    };
    visit(tree);
    return nodes;
  };
  render();
  const cleanups = effects.map((effect) => effect());
  collecting = false;
  return { render, requests, busy, destinations, configured: () => configured, cleanup: () => cleanups.forEach((cleanup) => cleanup?.()) };
}

test("each card provider requires availability and a separate action; SebPay first opens the shared form", async () => {
  for (const { id, flow } of PAYMENT_PROVIDERS) {
    let finish;
    const harness = renderCardProviders({ provider: id, checkout: () => new Promise((resolve) => { finish = resolve; }) });
    const primary = (nodes) => nodes.find((node) => node.props?.className?.includes("checkout-primary-action"));
    assert.equal(primary(harness.render()).props.disabled, true);
    harness.render().find((node) => node.type === "providers").props.onAvailabilityChange({ providers: PAYMENT_PROVIDERS.map((p) => ({ id: p.id, available: true })), loading: false, error: false });
    const action = primary(harness.render());
    assert.equal(action.props.disabled, false);
    assert.equal(harness.requests.length, 0);
    action.props.onClick();
    if (flow === "mobile-money") {
      assert.equal(harness.configured(), 1);
      assert.equal(harness.requests.length, 0, "Next cannot start a mobile money charge");
      const form = harness.render({ phase: "payment" }).find((node) => node.type === "sebpay-form");
      assert.deepEqual(JSON.parse(JSON.stringify(form.props.selection)), { service: "cards", productId: "visa-basic" });
      void form.props.onSubmit({ country: "CM", operator: "MTN", phone: "237699000000", otpCode: "123456" });
    }
    assert.equal(harness.requests.length, 1);
    action.props.onClick();
    assert.equal(harness.requests.length, 1, "A second click must not create a second checkout");
    const sent = JSON.parse(JSON.stringify(harness.requests[0].input));
    assert.deepEqual(sent.selection, { service: "cards", productId: "visa-basic" });
    assert.equal(sent.provider, id);
    assert.equal(sent.consent, true);
    assert.deepEqual(sent.customer, { email: "test@example.test", whatsapp: "+237699000000" });
    assert.equal("amount" in sent, false);
    if (flow === "mobile-money") assert.deepEqual(sent.payment, { country: "CM", operator: "MTN", phone: "237699000000", otpCode: "123456" });
    else assert.equal("payment" in sent, false);
    assert.equal(harness.busy.at(-1), true);
    finish({ orderToken: "a".repeat(64), ...(flow === "redirect" ? { checkoutUrl: "https://checkout.example.test/mock" } : { providerLink: "https://operator.example.test/approve" }) });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(harness.destinations, flow === "redirect" ? ["https://checkout.example.test/mock"] : []);
    if(flow === "mobile-money") {
      const result = harness.render().find((node) => node.type === "payment-result");
      assert.equal(result.props.embedded, true);
      assert.equal(result.props.orderToken, "a".repeat(64));
      assert.equal(result.props.providerLink, "https://operator.example.test/approve");
      assert.equal(harness.busy.at(-1), false);
    }
    harness.cleanup();
  }
});

test("an unavailable card provider stays blocked and failed creation releases the busy state", async () => {
  const harness = renderCardProviders({ checkout: async () => { throw new Error("mock transport failure"); } });
  const providers = harness.render().find((node) => node.type === "providers");
  providers.props.onAvailabilityChange({ providers: [{ id: "leekpay", available: false }], loading: false, error: false });
  let action = harness.render().find((node) => node.props?.className?.includes("checkout-primary-action"));
  assert.equal(action.props.disabled, true);
  action.props.onClick();
  assert.equal(harness.requests.length, 0);
  providers.props.onAvailabilityChange({ providers: [{ id: "leekpay", available: true }], loading: false, error: false });
  action = harness.render().find((node) => node.props?.className?.includes("checkout-primary-action"));
  action.props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.busy.at(-1), false);
  assert.ok(harness.render().some((node) => node.props?.role === "alert"));
  assert.deepEqual(harness.destinations, []);
  harness.cleanup();
});

test("an outgoing idle provider panel cannot release another panel's payment lock", () => {
  const harness = renderCardProviders();
  harness.cleanup();
  assert.deepEqual(harness.busy, [], "Only a panel with its own active request may release the busy lock during teardown");
});

test("created card orders replace the input instruction with neutral payment tracking copy", () => {
  const compact = checkoutSource.replace(/\s+/g, " ");
  assert.match(compact, /description=\{ orderCreatedRef\.current \? language === "fr" \? "Consultez le statut du paiement et les détails de votre commande\." : "View the payment status and your order details\." : descriptions\[step\] \}/);
});
