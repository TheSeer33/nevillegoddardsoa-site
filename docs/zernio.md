# Social publishing with Zernio

Uses the official `@zernio/node` SDK. Authentication is server-only through
`ZERNIO_API_KEY`; `.env*` is ignored by Git. No public publishing endpoint is exposed.

Connect the brand's social accounts at https://zernio.com, then run:

```sh
npm run social -- accounts
npm run social -- preview sats-protocol
```

Provide `ZERNIO_ACCOUNT_IDS` as a comma-separated list of explicit brand account
IDs returned by the accounts command. Product IDs are `sats-protocol`, `workbook`,
and `money-self-concept`. Omit the product ID for the storefront launch post.

```sh
npm run social -- draft sats-protocol
npm run social -- publish sats-protocol
# With ZERNIO_SCHEDULED_FOR set to a future ISO timestamp:
npm run social -- schedule workbook
```

Preview is the default and makes no API calls. Draft creates a provider draft.
Publish sends real content immediately; schedule submits it for future delivery.
Review platform requirements before publishing: image/video platforms can require
media and platform-specific metadata not supplied by this text-only command.
Use the Zernio dashboard for those posts. Never auto-retry a create request after
a timeout; check the dashboard for an existing post first. A returned post ID alone
does not prove publication; inspect status and per-platform results.

Netlify's production functions environment holds the API key securely for future
server integrations; local operators must supply it via their secret manager.
Rotate any credential shared in chat and update the production variable.

Reference: https://zernio.com/agent-quickstart.md
