export const ORIGIN = "https://drava.click";
export const CUSTOMER = { username: "@test.creator", password: "test-password", email: "buyer@example.com", whatsapp: "+237699000000" };
export const SELECTION = { packId: "boost", provider: "leekpay", consent: true, customer: CUSTOMER };
export const COUNTRY = {
  id: "country-cm", country_code: "CM", country_name: "Cameroun", prefix: "+237", is_active: true,
  currency: { code: "XAF", exchange_rate: 1, is_active: true },
  operators: [
    { id: "op-mtn", code: "mtn", name: "MTN", is_active: true, payin_enabled: true, otp_required: false },
    { id: "op-orange", code: "orange", name: "Orange", is_active: true, payin_enabled: true, otp_required: true, ussd_code: "#144*montant#" },
    { id: "op-closed", code: "closed", name: "Closed", is_active: true, payin_enabled: false },
  ],
};

export function request(path, payload, extras = {}) {
  return new Request(`https://worker.example/api/tiktok/${path}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: { Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.24", ...(payload === undefined ? {} : { "Content-Type": "application/json" }), ...extras },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
}

export function setup(t, override) {
  const values = new Map();
  const calls = [];
  const writes = [];
  const transactions = new Map();
  const env = {
    ENVIRONMENT: "production", LOCAL_ORIGINS: [], TIKTOK_BASE_PATH: "",
    LEEKPAY_SECRET_KEY: "test-only-leekpay-key", SEBPAY_PUBLIC_KEY: "test-only-sebpay-public", SEBPAY_SECRET_KEY: "test-only-sebpay-secret",
    SOLEASPAY_API_KEY: "test-soleas-key", TIKTOK_DATA_KEY: "12".repeat(32),
    EMAILJS_SERVICE_ID: "test-service", EMAILJS_TEMPLATE_ID: "test-template", EMAILJS_PUBLIC_KEY: "test-public-key", EMAILJS_PRIVATE_KEY: "test-private-key",
    ORDERS: {
      async put(key, value, options) { writes.push({ key, options }); values.set(key, value); },
      async get(key, format) { const value = values.get(key); return value === undefined ? null : format === "json" ? JSON.parse(value) : value; },
      async delete(key) { values.delete(key); },
    },
    CREATE_LIMITER: { async limit() { return { success: true }; } },
    STATUS_LIMITER: { async limit() { return { success: true }; } },
  };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url: String(url), init });
    const custom = override ? await override(String(url), init, transactions) : undefined;
    if (custom !== undefined) return custom;
    const payload = init.body ? JSON.parse(init.body) : null;
    if (url === "https://api.emailjs.com/api/v1.0/email/send") return new Response("OK");
    if (url === "https://leekpay.fr/api/v1/checkout" && init.method === "POST") {
      const id = `checkout_${transactions.size + 1}`;
      const data = { id, amount: payload.amount, currency: payload.currency, status: "pending", payment_url: "https://leekpay.me/pay-test", return_url: payload.return_url };
      transactions.set(id, { ...data, status: "paid" });
      return Response.json({ success: true, data });
    }
    if (url.startsWith("https://leekpay.fr/api/v1/checkout/")) return Response.json({ success: true, data: transactions.get(url.split("/").at(-1)) });
    if (url.endsWith("/p/countries")) return Response.json({ success: true, data: [COUNTRY] });
    if (url.includes("/c/calculate-fee?")) return Response.json({ success: true, data: { fee_amount: 200.1 } });
    if (url === "https://newapi.sebpay.bj/api/v1/collections") {
      const data = { transaction_id: `txn_${transactions.size + 1}`, amount: payload.amount, currency: payload.currency, external_reference: payload.external_reference, status: "pending", provider_link: "https://wave.example/validate" };
      transactions.set(data.transaction_id, { ...data, status: "approved" });
      return Response.json({ success: true, data });
    }
    if (url.startsWith("https://newapi.sebpay.bj/api/v1/collections/")) return Response.json({ success: true, data: transactions.get(url.split("/").at(-1)) });
    throw new Error("Unexpected network request blocked by test");
  });
  return { env, values, calls, writes, transactions };
}
