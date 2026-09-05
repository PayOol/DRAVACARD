import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const providerPath = new URL(
  "../src/components/ui/dialog-providers.tsx",
  import.meta.url,
);
const checkoutPath = new URL(
  "../src/components/ui/dialog-checkout.tsx",
  import.meta.url,
);
const notesPath = new URL(
  "../src/components/ui/dialog-notes.tsx",
  import.meta.url,
);
const pagePath = new URL("../src/app/page.tsx", import.meta.url);
const [providerSource, checkoutSource, notesSource, pageSource] =
  await Promise.all(
    [providerPath, checkoutPath, notesPath, pagePath].map((file) =>
      readFile(file, "utf8"),
    ),
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

test("LeekPay is a selectable horizontal recommended tile", () => {
  assert.match(providerSource, /type PaymentProvider = "leekpay";/);
  assert.match(
    providerSource,
    /useState<PaymentProvider>\("leekpay"\)/,
    "The only available provider should be selected initially",
  );
  assert.match(providerSource, /<fieldset[\s\S]*?grid-cols-2[\s\S]*?>/);

  const tile = blockAround(
    providerSource,
    'aria-pressed={selectedProvider === "leekpay"}',
    "<button",
    "</button>",
  );
  assert.match(tile, /type="button"/);
  assert.match(tile, /onClick=\{\(\) => setSelectedProvider\("leekpay"\)\}/);
  assert.match(tile, /disabled=\{isProcessing\}/);
  assert.match(tile, /\bitems-center\b/);
  assert.doesNotMatch(tile, /\bflex-col\b/);
  assert.match(tile, /\bh-8\b[^"\n]*\bw-8\b[^"\n]*\brounded-lg\b/);
  assert.match(tile, /alt=""/);
  assert.match(tile, />\s*LeekPay\s*</);
  assert.ok(
    tile.indexOf('alt=""') < tile.indexOf("LeekPay"),
    "The decorative logo thumbnail must precede the visible provider name",
  );
  assert.match(tile, /"Recommandé"/);
  assert.match(tile, /"Recommended"/);
  assert.match(tile, /\babsolute\s+-top-2\s+right-2\b/);
  assert.doesNotMatch(tile, /"Disponible"|"Available"/);
  assert.doesNotMatch(tile, /handleCheckout|createLeekPayCheckout/);
});

test("only the separate global Pay button starts checkout", () => {
  assert.equal(
    providerSource.match(/onClick=\{handleCheckout\}/g)?.length,
    1,
    "There must be exactly one checkout action",
  );
  const fieldsetEnd = providerSource.indexOf("</fieldset>");
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
  assert.match(payButton, /disabled=\{isProcessing\}/);
  assert.match(payButton, /language === "fr" \? "Payer" : "Pay"/);

  const checkoutHandler = providerSource.slice(
    providerSource.indexOf("const handleCheckout"),
    providerSource.indexOf("const formattedAmount"),
  );
  assert.match(
    checkoutHandler,
    /requestRef\.current \|\| selectedProvider !== "leekpay"/,
  );
  assert.equal(
    checkoutHandler.match(/createLeekPayCheckout\(/g)?.length,
    1,
  );
  assert.match(
    checkoutHandler,
    /createLeekPayCheckout\(card\.id, controller\.signal\)/,
  );
  assert.match(
    checkoutHandler,
    /window\.location\.assign\(checkout\.checkoutUrl\)/,
  );
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

test("one Radix dialog owns the consent-to-provider sequence", () => {
  for (const primitive of ["Root", "Portal", "Overlay", "Content"]) {
    const openingTag = new RegExp(`<DialogPrimitive\\.${primitive}\\b`, "g");
    assert.equal(
      checkoutSource.match(openingTag)?.length,
      1,
      `DialogCheckout must own exactly one Radix ${primitive}`,
    );
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
  }

  const compactCheckout = checkoutSource.replace(/\s+/g, "");
  assert.match(
    compactCheckout,
    /useState<CheckoutStep>\("notes"\)/,
    "Consent notes must be the initial step",
  );
  assert.match(
    compactCheckout,
    /<UsageNotesonAccept=\{\(\)=>setStep\("providers"\)\}onClose=\{onClose\}\/>/,
  );
  assert.match(compactCheckout, /<PaymentProviderscard=\{card\}\/>/);
  assert.doesNotMatch(
    checkoutSource,
    /createLeekPayCheckout|handleCheckout|\bfetch\s*\(|window\.location/,
  );
});

test("the catalogue mounts only the unified checkout wrapper", () => {
  assert.match(pageSource, /\bselectedCard\s*&&\s*\(/);
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
