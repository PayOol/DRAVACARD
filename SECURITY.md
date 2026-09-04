# Security policy

## Financial operations

Card purchases, top-ups, balance checks, withdrawals, payment callback pages, newsletter and reseller data collection, the global WhatsApp contact form, and the demo admin route are intentionally disabled. They must not be re-enabled until a trusted server implementation is available.

The server implementation must:

- keep Soleas and webhook credentials in a runtime secret manager, never in `NEXT_PUBLIC_*` variables or browser bundles;
- accept immutable product identifiers and calculate prices, currencies, fees, order identifiers, and callback URLs on the server;
- verify payment state and amount through an authenticated provider API or signed, idempotent webhook before fulfillment;
- use provider-hosted fields or tokenization for card data and never store or email a full PAN, CVV, or withdrawal code;
- authenticate card owners, enforce authorization, rate limits, attempt limits, expiry, and single use for withdrawals;
- validate request types and sizes and add abuse protection to public forms.

## Incident action required

All Soleas credentials that have ever been used by this repository must be revoked and replaced in the Soleas dashboard. Removing a credential from the current source does not invalidate copies in Git history, deployment caches, or previously downloaded browser bundles.

Any full card data previously received through FormSubmit, email, or local browser storage must be handled according to the applicable incident-response and data-retention obligations.

## Deployment controls

- Use the maintained Node.js 24 LTS toolchain declared by this repository.
- Publish only through the pinned GitHub Pages workflow on the protected `master` branch.
- Keep Pages configured with **Source: GitHub Actions** and enable **Enforce HTTPS** for the custom domain.
- Run `npm run security:check`, `npm run lint`, `npm run build`, and `npm run security:output` before every deployment.
- Remember that GitHub Pages cannot set repository-defined HTTP security headers; the in-document CSP is defense in depth, not an equivalent replacement for HSTS or `frame-ancestors`.
- Purge abandoned platform and service-worker caches after a security release, then verify the live routes and assets.

## Reporting

Report security issues privately to `contact.drava@gmail.com`. Do not include credentials, full card numbers, CVVs, or withdrawal codes in the report.
