import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialogPath = new URL(
  "../src/components/ui/dialog-providers.tsx",
  import.meta.url,
);
const source = await readFile(dialogPath, "utf8");

function blockAround(marker, opening, closing) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing marker: ${marker}`);
  const start = source.lastIndexOf(opening, markerIndex);
  const end = source.indexOf(closing, markerIndex);
  assert.notEqual(start, -1, `Missing opening token before: ${marker}`);
  assert.notEqual(end, -1, `Missing closing token after: ${marker}`);
  return source.slice(start, end + closing.length);
}

test("LeekPay is a selectable two-row tile in a two-column provider grid", () => {
  assert.match(source, /type PaymentProvider = "leekpay";/);
  assert.match(
    source,
    /useState<PaymentProvider>\("leekpay"\)/,
    "The only available provider should be selected initially",
  );
  assert.match(source, /<fieldset[\s\S]*?grid-cols-2[\s\S]*?>/);

  const tile = blockAround(
    'aria-pressed={selectedProvider === "leekpay"}',
    "<button",
    "</button>",
  );
  assert.match(tile, /type="button"/);
  assert.match(tile, /onClick=\{\(\) => setSelectedProvider\("leekpay"\)\}/);
  assert.match(tile, /disabled=\{isProcessing\}/);
  assert.match(tile, /flex-col/);
  assert.match(tile, /alt="LeekPay"/);
  assert.match(tile, /"Disponible"/);
  assert.match(tile, /"Available"/);
  assert.doesNotMatch(tile, /handleCheckout|createLeekPayCheckout/);
});

test("only the separate global Pay button starts checkout", () => {
  assert.equal(
    source.match(/onClick=\{handleCheckout\}/g)?.length,
    1,
    "There must be exactly one checkout action",
  );
  const fieldsetEnd = source.indexOf("</fieldset>");
  const checkoutAction = source.indexOf("onClick={handleCheckout}");
  assert.ok(
    checkoutAction > fieldsetEnd,
    "The checkout action must remain outside and below the provider grid",
  );

  const payButton = blockAround(
    "onClick={handleCheckout}",
    "<Button",
    "</Button>",
  );
  assert.match(payButton, /type="button"/);
  assert.match(payButton, /disabled=\{isProcessing\}/);
  assert.match(payButton, /language === "fr" \? "Payer" : "Pay"/);

  const checkoutHandler = source.slice(
    source.indexOf("const handleCheckout"),
    source.indexOf("const handleClose"),
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
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /leekpay\.fr\/js\/leekpay\.js|window\.LeekPay/);
  assert.doesNotMatch(source, /\b(?:pk|sk)_(?:live|test)_/i);
  assert.doesNotMatch(source, /<(?:form|input|select|textarea)\b/i);
});
