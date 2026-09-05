import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { detectCustomerLocation } from "../src/lib/customer-location.ts";
import { LEEKPAY_API_BASE } from "../src/lib/leekpay.ts";

const location = { countryCode: "CM", callingCode: "+237" };
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

afterEach(() => mock.restoreAll());

test("location lookup is a bodyless uncached GET to the fixed proxy", async () => {
  const request = mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `${LEEKPAY_API_BASE}/api/location`);
    assert.equal(options.method, "GET");
    assert.deepEqual(options.headers, { Accept: "application/json" });
    assert.equal(options.body, undefined);
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.ok(options.signal instanceof AbortSignal);
    return json(location);
  });
  assert.deepEqual(await detectCustomerLocation(), location);
  assert.equal(request.mock.callCount(), 1);
});

test("location requires two exact non-null fields with strict country and prefix syntax", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const invalid of [
    null, true, "CM", [], {},
    { countryCode: "CM" },
    { callingCode: "+237" },
    { countryCode: null, callingCode: null },
    { countryCode: "CM", callingCode: null },
    { countryCode: null, callingCode: "+237" },
    { ...location, extra: true },
    { ...location, ip: "192.0.2.1" },
    { ...location, countryCode: "XX" },
    { ...location, countryCode: "T1" },
    { ...location, countryCode: "cm" },
    { ...location, countryCode: "CM " },
    { ...location, countryCode: "CM\n" },
    { ...location, countryCode: "CMR" },
    { ...location, countryCode: 237 },
    { ...location, countryCode: "<script>" },
    { ...location, callingCode: "237" },
    { ...location, callingCode: "+023" },
    { ...location, callingCode: "+" },
    { ...location, callingCode: "+1234" },
    { ...location, callingCode: "+2 37" },
    { ...location, callingCode: "+237\n" },
    { ...location, callingCode: 237 },
    { ...location, callingCode: "+２３７" },
    { ...location, callingCode: "+2;alert(1)" },
  ]) {
    request.mock.mockImplementation(async () => json(invalid));
    assert.equal(await detectCustomerLocation(), null);
  }
  for (const valid of [
    location,
    { countryCode: "US", callingCode: "+1" },
    { countryCode: "FR", callingCode: "+33" },
  ]) {
    request.mock.mockImplementation(async () => json(valid));
    assert.deepEqual(await detectCustomerLocation(), valid);
  }
});

test("unavailable, redirected and non-JSON responses quietly fall back to null", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const status of [301, 400, 403, 404, 429, 500, 503]) {
    request.mock.mockImplementation(async () => json(location, status));
    assert.equal(await detectCustomerLocation(), null);
  }
  for (const mediaType of ["text/html", "text/plain", "application/jsonp"]) {
    request.mock.mockImplementation(async () => json(location, 200, { "Content-Type": mediaType }));
    assert.equal(await detectCustomerLocation(), null);
  }
  request.mock.mockImplementation(async () => json(location, 200, { "Content-Type": "application/json; charset=utf-8" }));
  assert.deepEqual(await detectCustomerLocation(), location);
});

test("malformed JSON and invalid UTF-8 quietly fall back to null", async () => {
  const request = mock.method(globalThis, "fetch");
  for (const body of ["", "{not-json", "<script>alert(1)</script>", new Uint8Array([255])]) {
    request.mock.mockImplementation(async () => new Response(body, { headers: { "Content-Type": "application/json" } }));
    assert.equal(await detectCustomerLocation(), null);
  }
});

test("a declared oversized response is cancelled without being read", async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  mock.method(globalThis, "fetch", async () => new Response(body, {
    headers: { "Content-Type": "application/json", "Content-Length": "1025" },
  }));
  assert.equal(await detectCustomerLocation(), null);
  assert.equal(cancelled, true);
});

test("streamed bytes are capped at 1 KiB even without an accurate length header", async () => {
  let cancelled = false;
  let chunksRead = 0;
  const body = new ReadableStream({
    pull(controller) {
      chunksRead += 1;
      controller.enqueue(new Uint8Array(600).fill(32));
    },
    cancel() { cancelled = true; },
  });
  mock.method(globalThis, "fetch", async () => new Response(body, {
    headers: { "Content-Type": "application/json", "Content-Length": "40" },
  }));
  assert.equal(await detectCustomerLocation(), null);
  assert.equal(cancelled, true);
  assert.ok(chunksRead <= 3);
});

test("valid JSON can span multiple small chunks", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(location));
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 5));
      controller.enqueue(bytes.subarray(5, 20));
      controller.enqueue(bytes.subarray(20));
      controller.close();
    },
  });
  mock.method(globalThis, "fetch", async () => new Response(body, { headers: { "Content-Type": "application/json" } }));
  assert.deepEqual(await detectCustomerLocation(), location);
});

test("network failures are not thrown or exposed", async () => {
  mock.method(globalThis, "fetch", async () => { throw new Error("Private upstream details"); });
  assert.equal(await detectCustomerLocation(), null);
});

test("an already aborted lookup never sends a request", async () => {
  const request = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request"); });
  const controller = new AbortController();
  controller.abort();
  assert.equal(await detectCustomerLocation(controller.signal), null);
  assert.equal(request.mock.callCount(), 0);
});

test("caller cancellation aborts the fetch and falls back to null", async () => {
  const controller = new AbortController();
  let requestSignal;
  mock.method(globalThis, "fetch", async (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  }));
  const pending = detectCustomerLocation(controller.signal);
  controller.abort();
  assert.equal(await pending, null);
  assert.equal(requestSignal.aborted, true);
});

test("a late response after caller cancellation cannot return a location", async () => {
  const controller = new AbortController();
  let resolveResponse;
  mock.method(globalThis, "fetch", async () => new Promise((resolve) => { resolveResponse = resolve; }));
  const pending = detectCustomerLocation(controller.signal);
  controller.abort();
  resolveResponse(json(location));
  assert.equal(await pending, null);
});

test("the 4-second deadline aborts a pending request", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  mock.method(globalThis, "fetch", async (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener("abort", () => reject(new Error("Timed out")), { once: true });
  }));
  const pending = detectCustomerLocation();
  context.mock.timers.tick(4000);
  assert.equal(await pending, null);
  assert.equal(requestSignal.aborted, true);
});

test("the deadline also cancels a stalled response body", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let cancelled = false;
  let responseDelivered;
  const delivered = new Promise((resolve) => { responseDelivered = resolve; });
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  mock.method(globalThis, "fetch", async () => {
    responseDelivered();
    return new Response(body, { headers: { "Content-Type": "application/json" } });
  });
  const pending = detectCustomerLocation();
  await delivered;
  await Promise.resolve();
  context.mock.timers.tick(4000);
  assert.equal(await pending, null);
  assert.equal(cancelled, true);
});
