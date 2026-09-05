import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import worker from "../src/index.ts";

const ORIGIN = "https://drava.click";
const UNKNOWN = { countryCode: null, callingCode: null };

function locationRequest(country, headers = {}, method = "GET", path = "/api/location") {
  const request = new Request(`https://proxy.example${path}`, {
    method,
    headers: { Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.27", ...headers },
  });
  if (country !== undefined) Object.defineProperty(request, "cf", { value: {
    country, city: "PrivateCity", latitude: "12.345", longitude: "45.678", postalCode: "PrivatePostcode",
  } });
  return request;
}

function isolatedEnv(t) {
  const rateCalls = [];
  const env = {
    ENVIRONMENT: "production", LOCAL_ORIGINS: [],
    STATUS_LIMITER: { async limit(value) { rateCalls.push(value); return { success: true }; } },
  };
  for (const binding of ["LEEKPAY_SECRET_KEY", "ORDERS", "CREATE_LIMITER"]) {
    Object.defineProperty(env, binding, { get() { throw new Error(`Location touched payment binding ${binding}`); } });
  }
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Location must not perform network requests"); });
  const errorLog = t.mock.method(console, "error", () => {});
  const infoLog = t.mock.method(console, "log", () => {});
  const warningLog = t.mock.method(console, "warn", () => {});
  return { env, rateCalls, fetch, errorLog, infoLog, warningLog };
}

describe("country calling code endpoint (Cloudflare metadata only)", () => {
  it("maps representative countries and territories without payment bindings or network", async (t) => {
    const state = isolatedEnv(t);
    for (const [countryCode, callingCode] of Object.entries({
      CM: "+237", BJ: "+229", CI: "+225", FR: "+33", DE: "+49", US: "+1", CA: "+1", GB: "+44",
      IN: "+91", JP: "+81", BR: "+55", AU: "+61", RE: "+262", GP: "+590", XK: "+383", AC: "+247", TA: "+290",
    })) {
      const response = await worker.fetch(locationRequest(countryCode), state.env);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { countryCode, callingCode });
      assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
      assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
    }
    assert.equal(state.rateCalls.length, 17);
    assert.equal(state.fetch.mock.callCount(), 0);
    assert.equal(state.errorLog.mock.callCount(), 0);
    assert.equal(state.infoLog.mock.callCount(), 0);
    assert.equal(state.warningLog.mock.callCount(), 0);
  });

  it("returns null/null for absent, unsupported, malformed or injected country metadata", async (t) => {
    const { env, fetch, errorLog } = isolatedEnv(t);
    for (const country of [undefined, null, "", "XX", "T1", "ZZ", "EU", "AQ", "cm", " CM", "CM ", "CM\r\n", "USA", "<script>", "__proto__", "constructor", "CM,FR", 237, {}, ["CM"]]) {
      const response = await worker.fetch(locationRequest(country), env);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), UNKNOWN);
    }
    assert.equal(fetch.mock.callCount(), 0);
    assert.equal(errorLog.mock.callCount(), 0);
  });

  it("ignores all client country hints and never leaks address or location details", async (t) => {
    const { env, errorLog, infoLog, warningLog } = isolatedEnv(t);
    const spoofed = {
      "CF-IPCountry": "US", "X-Country-Code": "US", "X-Country": "US", "X-Forwarded-Country": "US",
      "X-Forwarded-For": "198.51.100.42", Cookie: "email=person@example.com", Authorization: "Bearer client-controlled",
    };
    const response = await worker.fetch(locationRequest("CM", spoofed), env);
    assert.deepEqual(await response.json(), { countryCode: "CM", callingCode: "+237" });
    assert.deepEqual(await (await worker.fetch(locationRequest(undefined, spoofed), env)).json(), UNKNOWN);
    assert.deepEqual(await (await worker.fetch(locationRequest("XX", spoofed), env)).json(), UNKNOWN);
    assert.equal(errorLog.mock.callCount(), 0);
    assert.equal(infoLog.mock.callCount(), 0);
    assert.equal(warningLog.mock.callCount(), 0);
  });

  it("preserves the exact origin allowlist for GET and strict GET preflights", async (t) => {
    const { env, rateCalls } = isolatedEnv(t);
    env.LOCAL_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"];
    for (const origin of [ORIGIN, ...env.LOCAL_ORIGINS]) {
      const response = await worker.fetch(locationRequest("CM", { Origin: origin }), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
      const preflight = await worker.fetch(locationRequest(undefined, {
        Origin: origin, "Access-Control-Request-Method": "GET",
      }, "OPTIONS"), env);
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET");
      assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
      assert.equal(preflight.headers.get("Access-Control-Allow-Credentials"), null);
      assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), null);
    }
    assert.equal(rateCalls.length, 3);
    for (const origin of ["", "null", "https://attacker.example", "http://drava.click", "http://localhost:3012", "http://localhost.attacker.example:3000"]) {
      for (const method of ["GET", "OPTIONS"]) {
        const response = await worker.fetch(locationRequest("CM", {
          Origin: origin, "Access-Control-Request-Method": "GET",
        }, method), env);
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      }
    }
  });

  it("rejects methods, queries and privileged preflights without reaching bindings", async (t) => {
    const { env, rateCalls } = isolatedEnv(t);
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
      const response = await worker.fetch(locationRequest("CM", {}, method), env);
      assert.equal(response.status, 405);
    }
    for (const path of ["/api/location?country=CM", "/api/location?ip=203.0.113.27", "/api/location/", "/api/location/CM"]) {
      assert.equal((await worker.fetch(locationRequest("CM", {}, "GET", path), env)).status, 404);
    }
    for (const headers of [
      {}, { "Access-Control-Request-Method": "POST" },
      { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
      { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "x-country-code" },
      { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "content-type" },
    ]) {
      assert.equal((await worker.fetch(locationRequest(undefined, headers, "OPTIONS"), env)).status, 403);
    }
    assert.equal(rateCalls.length, 0);
  });

  it("keeps the status rate limiter fail-closed without needing payment secrets", async (t) => {
    const { env, errorLog } = isolatedEnv(t);
    assert.equal((await worker.fetch(locationRequest("CM", { "CF-Connecting-IP": "" }), env)).status, 403);
    env.STATUS_LIMITER.limit = async () => ({ success: false });
    const response = await worker.fetch(locationRequest("CM"), env);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.deepEqual(await response.json(), { error: { code: "rate_limited" } });
    env.STATUS_LIMITER.limit = async () => { throw new Error("Private address 203.0.113.27"); };
    const unavailable = await worker.fetch(locationRequest("CM"), env);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: { code: "service_unavailable" } });
    assert.equal(errorLog.mock.callCount(), 0);
  });
});

it("resolves country metadata in workerd with no secret, no KV and no outbound access", { timeout: 30_000 }, async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true, format: "esm", platform: "browser", write: false,
  });
  let outboundCalls = 0;
  const runtime = new Miniflare(convertV4MiniflareOptions({
    name: "drava-location-runtime-test", modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
    cf: false, telemetry: { enabled: false }, logRequests: false,
    bindings: { ...config.vars },
    ratelimits: Object.fromEntries(config.ratelimits.filter((binding) => binding.name === "STATUS_LIMITER").map((binding) => [binding.name, {
      namespace_id: binding.namespace_id, simple: binding.simple,
    }])),
    outboundService: () => { outboundCalls++; throw new Error("Location must not perform network requests"); },
  }));
  try {
    const headers = { Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.27", "CF-IPCountry": "US" };
    for (const [countryCode, callingCode] of [["CM", "+237"], ["GP", "+590"], ["RE", "+262"], ["GB", "+44"], ["CA", "+1"]]) {
      const response = await runtime.dispatchFetch("https://runtime.example/api/location", {
        headers, cf: { country: countryCode, city: "PrivateCity", latitude: "12.345", longitude: "45.678" },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { countryCode, callingCode });
    }
    for (const country of ["XX", "T1", null]) {
      const response = await runtime.dispatchFetch("https://runtime.example/api/location", { headers, cf: { country } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), UNKNOWN);
    }
    const localResponse = await runtime.dispatchFetch("https://runtime.example/api/location", {
      headers: { ...headers, Origin: config.vars.LOCAL_ORIGINS[0] }, cf: { country: "CM" },
    });
    assert.equal(localResponse.status, 200);
    assert.equal(localResponse.headers.get("Access-Control-Allow-Origin"), config.vars.LOCAL_ORIGINS[0]);
    const preflight = await runtime.dispatchFetch("https://runtime.example/api/location", {
      method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "GET" },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET");
    assert.equal(outboundCalls, 0);
  } finally {
    await runtime.dispose();
  }
});
