# SOA fulfillment release gate — 2026-10-10

DO NOT claim automated delivery is operational until every gate passes.

## Confirmed implementation defects
- stripe-webhook.mjs inserts a processing row and returns duplicate on every retry, including after failed Resend requests; paid customers can remain undelivered.
- No durable queue, processing lease, scheduled recovery worker, or dead-letter escalation.
- Delivery status may remain processing after successful email API acceptance if final DB update fails.
- Download token is valid for seven days and grants every file on the order; treat it as a bearer credential, avoid third-party scripts and referrer leakage.
- Verify Netlify Blobs access scope and all private file keys.
- Confirm Stripe Checkout line-item pagination, price mappings, refunds and disputes, and all advertised payment links.
- Confirm production environment and test environment isolation.

## Required safe rollout
1. Audit all live Stripe price IDs and create explicit price-to-private-file mapping.
2. Provision dedicated fulfillment database and private storage; apply schema with recoverable jobs and atomic claims.
3. Implement signature-verified ingestion returning success only after durable persistence; independently retry dispatch with idempotency keys and backoff.
4. Add support-only resend flow and monitoring for missing assets, rejected email, refunds and disputes.
5. Verify actual Resend sender domain, webhook endpoint and Netlify environment configuration without exposing secrets.
6. Exercise paid, unpaid, duplicated, delayed, failed, expired and bundle test cases in Stripe test mode.
7. Only after all checks, deploy to production and verify live checkout and receipt-to-download behavior.

Do not alter unrelated Buzzworthy products. Do not put paid PDFs or secrets in this repository.
