# SOA fulfillment release and support

Status: implementation tested locally, production activation blocked. Do not describe automatic delivery as active.

## Release prerequisites

1. Recover the actual live deployment source before replacing it. The September 30 published deployment includes /api/free-sats-guide and /api/digital-product-checkout absent from this repository. Preserve these flows, travel pages, redirects and existing resources.
2. Use a dedicated active database; the connected DOLO project is inactive and unrelated. Apply fulfillment-schema.sql and verify RPC claims concurrently against PostgreSQL.
3. Store the four reviewed PDFs in private site-wide Netlify Blobs `soa-paid-guides`. Never put PDFs in dist, Git, or static directories. The allowlist build copies only index.html.
4. Set Functions-scoped production secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Set FULFILLMENT_MODE=live, FULFILLMENT_FROM to a verified sending address, and optionally FULFILLMENT_REPLY_TO. Use separate test keys, database, signing secret and FULFILLMENT_MODE=test on a protected staging site.
5. PRODUCT_PRICE_MAP_JSON must use actual prices, not product names or URL suffixes. Validated prices:
   - price_1TJKvaFsYWBnxmVl7D79w9ah ($27): SATS_Protocol_Premium.pdf
   - price_1TJKvcFsYWBnxmVlM3yhe8Mb ($47 legacy SATS price): SATS_Protocol_Premium.pdf
   - price_1TJKvbFsYWBnxmVlhyebM933 ($37): 30_Day_Assumption_Workbook_Premium.pdf
   - price_1TJoYrFsYWBnxmVl1KhYg5cL ($37): Money_Identity_Premium.pdf
   - Self-Concept Reset OS price_1TreJoFsYWBnxmVlQQCM6fen is $47 and promises an OS. Do not map a standalone PDF until scope is verified.
   - The existing $84 bundle contains the $47 legacy SATS price and $37 workbook price. Do not map extra products it does not include.
6. After configuring and deploying, register a dedicated SOA webhook for checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded, charge.dispute.created. Preserve the existing Base44 endpoint. Review overlapping delivery responsibilities before activation to avoid duplicate sends.
7. Verify Resend acceptance AND delivered status. The connected account currently has no verified domain.

## Recovery and customer support

The scheduler rechecks up to five failed/stale orders every five minutes. Atomic database leases prevent concurrent claims. Persisted email payloads keep provider idempotency stable across interruption. After 23 hours, uncertain sends require manual provider-log reconciliation rather than a fresh send that may duplicate a delivered email. Monitor failed/review rows; alert integration remains to be configured.

For access refresh: verify the sender is the Stripe checkout email, retrieve the Checkout Session and PaymentIntent, confirm successful payment and no refund/dispute, then reconcile provider delivery. Never grant access from a customer-supplied product name. For sent orders, an operator can generate a fresh token, hash it, update expiry and email the new link to the verified checkout email. This invalidates the previous token. Do not reset the order to processing with an old idempotency key. A dedicated authenticated resend endpoint remains to be implemented.

Refunds and disputes revoke future downloads. Previously downloaded PDFs cannot be recalled. In-flight downloads can complete during revocation; access checks occur at request time.

## Verified locally

19 Node tests: exact price mapping, bundle deduplication, unrelated products, mixed unknown mapping, traversal protection, token hashing, Stripe signature tampering, fail-closed missing configuration, invalid/unknown/expired/unpaid/refunded access, invalid file index, duplicate suppression, busy lease retry, email API failure, stable retry payload, missing file recovery. These use mocks and do not prove hosted PostgreSQL locking, provider delivery or live checkout.

Required before release: Stripe test-mode checkout per product/bundle, real test webhook replay, hosted atomic-claim tests, delivered test email and PDF byte comparison, interrupted-processing recovery, expired-token and refund/dispute checks, mobile and desktop browser checks, complete purchase-link catalog audit, production source preservation, analytics consent and purchase deduplication.
