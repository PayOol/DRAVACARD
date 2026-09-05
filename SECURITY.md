# Security policy

## Financial operations

Card and TikTok checkout initiation use the same Cloudflare Worker REST proxy and provider adapters. Card top-ups, balance checks, withdrawals, newsletter and reseller data collection, the global WhatsApp contact form, and the demo admin route remain disabled. The shared payment architecture is documented in [docs/PAYMENTS.md](docs/PAYMENTS.md).

Neither a LeekPay public key nor a LeekPay secret key belongs in the Pages source, a `NEXT_PUBLIC_*` variable, a browser bundle, GitHub Actions configuration, or a committed environment file. `LEEKPAY_SECRET_KEY` is an encrypted Cloudflare Worker secret and is read only as `env.LEEKPAY_SECRET_KEY` at runtime.

The browser sends `{ service, productId, provider, customer, consent: true, payment? }` to `POST /api/checkout`, only after usage-note acceptance, contact validation and an explicit Pay action. The shared contact validator runs in both the browser and Worker. Card customers contain exactly `{ email, whatsapp }`. Provider adapters map the normalized contact contract to their documented fields; TikTok credentials never reach payment providers. Card contact details are held in React memory until the modal closes; they must never be copied into browser storage, KV, URLs, metadata, logs or proxy responses. The legacy card request remains supported by the same engine during rollout.

TikTok adds the account and password required by its fulfillment workflow. These values stay in browser memory and in separate AES-GCM encrypted server envelopes with a seven-day maximum lifetime. They are sent only to the configured merchant EmailJS template after authenticated payment verification. The full envelope is deleted after EmailJS accepts the notification; a separate encrypted account label may remain for the verified receipt until the original expiry. Payment confirmation remains independent of email acceptance or delivery of coins. Configuration, retry and consistency limits are documented in [docs/TIKTOK_BACKEND.md](docs/TIKTOK_BACKEND.md).

The Worker owns each service's product catalogue, amount, description and currency. It stores the provider reference and expected collection amount/currency separately from the service amount/currency under a random order token in the `ORDERS` KV namespace. The static return and cancellation pages receive only `#order=` followed by 64 hexadecimal characters. Result pages remove that fragment immediately and retain the capability in memory; embedded Mobile Money results keep both token and operator link in memory.

`POST /api/orders/status` accepts that opaque order token. The Worker retrieves the stored order and uses its provider's authenticated server-to-server verification, comparing reference, amount and currency with the stored order. A response may contain `verified: true` only when the authenticated provider response is `paid` and every comparison succeeds. Clients reject mismatched services and only expose explicitly allowed receipt fields. The legacy TikTok routes delegate to this same engine.

The server implementation must:

- keep all provider credentials in a runtime secret manager, never in source, logs, responses or browser storage;
- accept immutable product identifiers and calculate prices, currencies, descriptions and callback URLs on the server;
- validate methods, content types, body sizes, JSON shape and response shape;
- use cryptographically random, unguessable order tokens and expire stored orders;
- authenticate every provider status lookup and fail closed on network, parsing or comparison errors;
- inspect upstream redirects manually and reject every 3xx response, so the bearer secret is never forwarded to another origin;
- never collect or proxy a full PAN, CVV, card OTP or withdrawal code; provider-hosted card authentication stays external. The shared SebPay Mobile Money form may collect the transaction OTP explicitly required by the selected operator's documented collection API. It must remain in memory, travel only in the protected creation body to that adapter, and never enter storage, URLs, logs or receipts;
- rate-limit both checkout creation and status polling, while treating those distributed limits as approximate abuse controls;
- keep payment confirmation separate from fulfillment. No browser callback, redirect or `verified` response may automatically issue, reveal or deliver a card.

CORS limits which browsers can read a response; it is not authentication. The public proxy endpoints remain reachable outside a browser, so server-side validation, rate limits and monitoring are mandatory.

Cloudflare KV is eventually consistent. A result page can briefly receive a not-found or pending response immediately after redirection and should retry with a bounded delay. It must never reinterpret an unavailable result as paid.

The integration deliberately uses authenticated polling rather than trusting a browser callback or an unauthenticated webhook signature.

Payment destination domains are delegated to the authenticated LeekPay API response, without a hostname allowlist. The Worker and browser still require an absolute HTTPS URL without embedded credentials or a nonstandard port, with a bounded length. The browser cannot supply a destination URL when creating a checkout. The Worker never fetches this destination or sends the LeekPay secret to it. This intentionally trusts LeekPay to select its payment processor: a compromised provider response could direct the customer to any HTTPS domain. Status verification always uses the fixed authenticated LeekPay API, independently of that destination.

## Incident action required

All Soleas credentials that have ever been used by this repository must be revoked and replaced in the Soleas dashboard. Removing a credential from the current source does not invalidate copies in Git history, deployment caches, or previously downloaded browser bundles.

Any full card data previously received through FormSubmit, email, or local browser storage must be handled according to the applicable incident-response and data-retention obligations.

## Deployment controls

- Use the maintained Node.js 24 LTS toolchain declared by this repository.
- Publish only through the pinned GitHub Pages workflow on the protected `master` branch.
- Deploy the Worker from `worker/` and verify `ORDERS`, `CREATE_LIMITER`, `STATUS_LIMITER`, and the encrypted `LEEKPAY_SECRET_KEY` binding before enabling checkout.
- Keep Pages configured with **Source: GitHub Actions** and enable **Enforce HTTPS** for the custom domain.
- Run the root security/build checks and the Worker tests/typecheck before every deployment.
- Remember that GitHub Pages cannot set repository-defined HTTP security headers; the in-document CSP is defense in depth, not an equivalent replacement for HSTS or `frame-ancestors`.
- Purge abandoned platform and service-worker caches after a security release, then verify the live routes and assets.

## Reporting

Report security issues privately to `contact.drava@gmail.com`. Do not include credentials, full card numbers, CVVs, or withdrawal codes in the report.
