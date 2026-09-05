import type {
  Order,
  PaymentEnv,
  PaymentService,
  Provider,
  ProviderIntent,
} from "./payment-types.ts";
import {
  createProviderPayment,
  isProvider,
  isProviderReference,
  prepareProviderPayment,
  providerAvailable,
  providerCatalog,
  providerCountries,
  providerQuote,
  verifyProviderPayment,
} from "./providers.ts";
import {
  cleanupFulfillment,
  completeFulfillment,
  ensureServiceReady,
  isCardProduct,
  isService,
  prepareFulfillment,
  returnUrls,
  selectProduct,
  validateCustomer,
} from "./services.ts";
import {
  ApiError,
  ORDER_TTL_SECONDS,
  exactKeys,
  hex,
  isObject,
  jsonResponse,
  nonempty,
  orderKey,
  requestJson,
} from "./shared.ts";

export const PAYMENT_ROUTES = Object.freeze({
  "/api/providers": "providers",
  "/api/checkout": "checkout",
  "/api/orders/status": "status",
  "/api/providers/sebpay/countries": "countries",
  "/api/providers/sebpay/quote": "quote",
  // Existing clients use aliases into the same engine and provider registry.
  "/api/tiktok/providers": "providers",
  "/api/tiktok/checkout": "checkout",
  "/api/tiktok/orders/status": "status",
  "/api/tiktok/sebpay/countries": "countries",
  "/api/tiktok/sebpay/quote": "quote",
} as const);
export type PaymentRoute = (typeof PAYMENT_ROUTES)[keyof typeof PAYMENT_ROUTES];
export function paymentMethod(route: PaymentRoute): "GET" | "POST" {
  return route === "providers" || route === "countries" ? "GET" : "POST";
}

function validDate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 8_640_000_000_000_000
  );
}
function positiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

// Legacy records are normalized in memory. Their KV keys and encryption AAD never change.
function normalizeOrder(value: unknown): Order {
  if (
    !isObject(value) ||
    !validDate(value.createdAt) ||
    !validDate(value.expiresAt) ||
    value.expiresAt !== value.createdAt + ORDER_TTL_SECONDS * 1000 ||
    !positiveAmount(value.amount)
  ) {
    throw new ApiError(503, "service_unavailable");
  }
  if (
    value.version === 1 &&
    isCardProduct(value.productId) &&
    value.currency === "XOF" &&
    value.amount >= 100 &&
    isProviderReference("leekpay", value.checkoutId)
  ) {
    return {
      version: 2,
      service: "cards",
      productId: value.productId,
      amount: value.amount,
      currency: "XOF",
      provider: "leekpay",
      providerId: value.checkoutId,
      providerAmount: value.amount,
      providerCurrency: "XOF",
      orderId: value.checkoutId,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
    };
  }
  const service = value.version === 1 ? "tiktok" : value.service;
  const productId = value.version === 1 ? value.packId : value.productId;
  if (
    (value.version !== 1 && value.version !== 2) ||
    !isService(service) ||
    !isProvider(value.provider) ||
    !isProviderReference(value.provider, value.providerId) ||
    !positiveAmount(value.providerAmount) ||
    typeof value.providerCurrency !== "string" ||
    !/^[A-Z]{3}$/.test(value.providerCurrency) ||
    !nonempty(value.orderId, 150) ||
    !/^[A-Za-z0-9_-]+$/.test(value.orderId)
  )
    throw new ApiError(503, "service_unavailable");
  const common = {
    version: 2 as const,
    provider: value.provider,
    providerId: value.providerId,
    providerAmount: value.providerAmount,
    providerCurrency: value.providerCurrency,
    orderId: value.orderId,
    amount: value.amount,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  };
  if (service === "cards") {
    if (
      !isCardProduct(productId) ||
      value.currency !== "XOF" ||
      value.amount < 100
    )
      throw new ApiError(503, "service_unavailable");
    return { ...common, service, productId, currency: "XOF" };
  }
  if (
    typeof productId !== "string" ||
    productId !== value.packId ||
    value.currency !== "XAF" ||
    !positiveAmount(value.coins) ||
    value.coins > 1_000_000 ||
    typeof value.bonus !== "number" ||
    !Number.isSafeInteger(value.bonus) ||
    value.bonus < 0 ||
    value.bonus > 1_000_000
  )
    throw new ApiError(503, "service_unavailable");
  try {
    selectProduct(
      service,
      productId,
      productId === "custom" ? value.coins : undefined,
    );
  } catch {
    throw new ApiError(503, "service_unavailable");
  }
  return {
    ...common,
    service,
    productId,
    packId: productId,
    currency: "XAF",
    coins: value.coins,
    bonus: value.bonus,
  };
}

async function createCheckout(
  request: Request,
  env: PaymentEnv,
  origin: string,
  alias: boolean,
): Promise<Response> {
  const payload = await requestJson(request);
  const legacyCard = !alias && payload.service === undefined;
  let service: PaymentService;
  let productId: unknown;
  let provider: Provider;
  if (legacyCard) {
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 1024)
      throw new ApiError(400, "invalid_request");
    if (
      Object.keys(payload).length !== 2 ||
      !Object.hasOwn(payload, "customer") ||
      !isCardProduct(payload.productId)
    )
      throw new ApiError(400, "invalid_product");
    service = "cards";
    productId = payload.productId;
    provider = "leekpay";
    if (!providerAvailable(env, provider))
      throw new ApiError(503, "service_unavailable");
  } else {
    exactKeys(
      payload,
      alias
        ? [
            "packId",
            "customCoins",
            "provider",
            "customer",
            "consent",
            "payment",
          ]
        : [
            "service",
            "productId",
            "customCoins",
            "provider",
            "customer",
            "consent",
            "payment",
          ],
    );
    const requestedService = alias ? "tiktok" : payload.service;
    if (!isService(requestedService))
      throw new ApiError(400, "invalid_service");
    if (payload.consent !== true) throw new ApiError(400, "consent_required");
    if (!isProvider(payload.provider))
      throw new ApiError(400, "invalid_provider");
    service = requestedService;
    productId = alias ? payload.packId : payload.productId;
    provider = payload.provider;
  }
  const selected = selectProduct(service, productId, payload.customCoins);
  const client = validateCustomer(service, payload.customer);
  ensureServiceReady(env, service);
  const orderToken = hex(crypto.getRandomValues(new Uint8Array(32)));
  const key = `${service === "tiktok" ? "tiktok:" : ""}${await orderKey(orderToken)}`;
  const orderId = `${service === "tiktok" ? "DRAVA-TT" : "DRAVA-PAY"}-${crypto.randomUUID()}`;
  const intent: ProviderIntent = {
    amount: selected.amount,
    currency: selected.currency,
    description: selected.description,
    customer: {
      name: client.name,
      email: client.email,
      whatsapp: client.whatsapp,
    },
    orderId,
    ...returnUrls(env, service, orderToken, origin),
    metadata: legacyCard
      ? { productId: selected.productId }
      : { service, productId: selected.productId, orderId },
  };
  const prepared = await prepareProviderPayment(
    env,
    provider,
    intent,
    payload.payment,
  );
  const createdAt = Date.now();
  const order: Order = {
    ...selected,
    version: 2,
    orderId,
    provider,
    providerId: "",
    providerAmount: prepared.amount,
    providerCurrency: prepared.currency,
    createdAt,
    expiresAt: createdAt + ORDER_TTL_SECONDS * 1000,
  };
  await prepareFulfillment(env, key, order, client);
  // An error after dispatch may hide a remotely accepted payment. Keep encrypted
  // fulfillment data until its original TTL rather than destroying recovery data.
  const transaction = await createProviderPayment(
    env,
    provider,
    intent,
    prepared,
  );
  order.providerId = transaction.providerId;
  // Only a snapshot of fulfillment and payment facts is persisted; no customer data.
  const { description: _description, ...stored } = order as Order & {
    description?: string;
  };
  const legacyCreatedAt = Date.now();
  const record = legacyCard
    ? {
        version: 1,
        productId: order.productId,
        amount: order.amount,
        currency: order.currency,
        checkoutId: order.providerId,
        createdAt: legacyCreatedAt,
        expiresAt: legacyCreatedAt + ORDER_TTL_SECONDS * 1000,
      }
    : stored;
  // Do not return a payable link before its server verification record is durable.
  await env.ORDERS.put(key, JSON.stringify(record), {
    expirationTtl: ORDER_TTL_SECONDS,
  });
  if (legacyCard)
    return jsonResponse(
      { checkoutUrl: transaction.checkoutUrl, orderToken },
      201,
      origin,
    );
  return jsonResponse(
    {
      service,
      productId: order.productId,
      provider,
      orderToken,
      status: transaction.status,
      amount: order.amount,
      currency: order.currency,
      ...(transaction.checkoutUrl
        ? { checkoutUrl: transaction.checkoutUrl }
        : {}),
      ...(transaction.providerLink
        ? { providerLink: transaction.providerLink }
        : {}),
      ...(order.service === "tiktok"
        ? { coins: order.coins, bonus: order.bonus }
        : {}),
    },
    201,
    origin,
  );
}

async function orderStatus(
  request: Request,
  env: PaymentEnv,
  origin: string,
  alias: boolean,
): Promise<Response> {
  const payload = await requestJson(request, 1024);
  if (
    Object.keys(payload).length !== 1 ||
    typeof payload.orderToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(payload.orderToken)
  )
    throw new ApiError(400, "invalid_order");
  const hashKey = await orderKey(payload.orderToken);
  let key = alias ? `tiktok:${hashKey}` : hashKey;
  let value: unknown = await env.ORDERS.get(key, "json");
  if (value === null && !alias) {
    key = `tiktok:${hashKey}`;
    value = await env.ORDERS.get(key, "json");
  }
  if (value === null) throw new ApiError(404, "order_not_found");
  const order = normalizeOrder(value);
  if ((key.startsWith("tiktok:") ? "tiktok" : "cards") !== order.service)
    throw new ApiError(503, "service_unavailable");
  if (order.expiresAt <= Date.now()) throw new ApiError(404, "order_not_found");
  const status = await verifyProviderPayment(env, order);
  const verified = status === "paid";
  const notification = verified
    ? await completeFulfillment(env, key, order)
    : {};
  if (["failed", "cancelled", "expired"].includes(status))
    await cleanupFulfillment(env, key, order.service);
  return jsonResponse(
    {
      service: order.service,
      productId: order.productId,
      provider: order.provider,
      orderId: order.orderId,
      status,
      verified,
      amount: order.amount,
      currency: order.currency,
      createdAt: order.createdAt,
      ...(order.service === "tiktok"
        ? { packId: order.packId, coins: order.coins, bonus: order.bonus }
        : {}),
      ...(order.service === "tiktok" && !verified
        ? { notification: "pending" }
        : {}),
      ...(verified
        ? { ...notification, transactionReference: order.providerId }
        : {}),
    },
    200,
    origin,
  );
}

export async function handlePaymentRequest(
  request: Request,
  env: PaymentEnv,
  origin: string,
  route: PaymentRoute,
): Promise<Response> {
  const alias = new URL(request.url).pathname.startsWith("/api/tiktok/");
  if (route === "providers")
    return jsonResponse({ providers: providerCatalog(env) }, 200, origin);
  if (route === "countries")
    return jsonResponse(
      { countries: await providerCountries(env, "sebpay") },
      200,
      origin,
    );
  if (route === "quote") {
    const payload = await requestJson(request);
    exactKeys(
      payload,
      alias
        ? ["packId", "customCoins", "country", "operator"]
        : ["service", "productId", "customCoins", "country", "operator"],
    );
    const service = alias ? "tiktok" : payload.service;
    if (!isService(service)) throw new ApiError(400, "invalid_service");
    const selected = selectProduct(
      service,
      alias ? payload.packId : payload.productId,
      payload.customCoins,
    );
    return jsonResponse(
      await providerQuote(env, "sebpay", selected, payload),
      200,
      origin,
    );
  }
  return route === "checkout"
    ? createCheckout(request, env, origin, alias)
    : orderStatus(request, env, origin, alias);
}
