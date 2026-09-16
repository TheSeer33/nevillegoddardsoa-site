# Recurve-Style Sales Loop

This repository uses a self-improving SDR loop inspired by the public Recurve AI architecture, without copying upstream source code.

## Loop
1. Generate or refresh the Ideal Customer Profile from the company profile.
2. Discover candidate accounts through authorized/public data sources.
3. Validate each candidate with current evidence.
4. Classify:
   - STRIKE: strong fit plus actionable trigger; pursue now.
   - MONITOR: fit exists but no current trigger; schedule re-check.
   - DISREGARD: poor fit; do not waste outreach.
5. Draft personalized outreach only from verified evidence.
6. Track outcome: sent, replied, meeting, proposal, won, lost, no-response.
7. Convert failures and corrections into reusable lessons.
8. If the majority of discovered leads are poor fits, revise the ICP/search strategy instead of increasing volume.
9. Feed verified opportunities into the Portfolio Command Layer.
10. Never mark outreach, meetings, proposals, or revenue as complete without evidence.

## Deal rules
- Optimize for cash collected and recurring revenue, not activity volume.
- Do not fabricate trigger events, budgets, relationships, testimonials, or urgency.
- Respect applicable outreach, privacy, anti-spam and platform rules.
- Human/founder approval is required for contracts, binding pricing exceptions, legal representations, money movement, credentials, and other irreversible commitments.

## Learning record
Each rejected or failed lead should produce a lesson with:
- reason
- evidence
- ICP field affected
- whether it is company-specific or global
- next-cycle adjustment
