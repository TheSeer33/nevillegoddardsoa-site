# SATS Practice Companion — Product Specification

Status: implementation foundation; not released.

## Customer problem
People interested in SATS struggle to select a short scene, maintain a consistent practice, and avoid repeatedly restarting.

## First release
- Explain SATS in clear language without promising specific outcomes.
- Help a visitor write one short first-person scene and a simple sensory detail.
- Allow a visitor to review and revise their scene locally.
- Provide a simple optional nightly checklist and streak-free practice log.
- Link to the existing SATS Protocol product at https://payhip.com/b/KugVT.
- Respect privacy: no scene or journal content sent to analytics, external AI services, or third-party marketing tools by default.

## Conversion and measurement
- Track anonymous aggregate page views and purchase-link clicks only after appropriate consent.
- Purchase attribution and revenue must come from verified Payhip transaction data, not clicks.
- No fabricated testimonials, scarcity, outcome guarantees, or prechecked marketing consent.

## Technical acceptance
- Accessible on mobile; keyboard operable; no account required for first release.
- Existing site build and tests pass.
- No payment credentials committed to source.
- Deploy to a preview environment before production.
- Validate product copy and purchase URL before launch.

## Architecture
Reuse the existing nevillegoddardsoa-site Node build and Netlify deployment. Keep initial personal practice data client-side. DOLO integration and paid account features are separate later milestones.

## Milestones
1. Audit current site routes, build scripts, checkout links, tests, and deployment config.
2. Implement static SATS companion UI and local persistence with a clear reset control.
3. Add privacy-preserving funnel measurement and verified purchase attribution.
4. Test on mobile and run accessibility and regression checks.
5. Deploy preview, review, then release.

## Out of scope
Native mobile apps, reverse engineering third-party products, paid subscription billing, claims that SATS guarantees wealth or relationships.

## Definition of done
A real deployed preview passes build and test checks, the SATS practice flow works end-to-end, privacy controls work, and the purchase link resolves to the correct product.
