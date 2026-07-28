# Pet Medication App: Product Strategy

**Date:** 2026-07-25
**Status:** Approved
**Scope:** strategy and roadmap. Each roadmap phase gets its own design
spec, plan, and implementation cycle; this document is the umbrella.

## Vision

A vet-recommendable, free, local-first pet-medication calendar. A
veterinarian hands a pet owner a QR code; the owner's phone opens a PWA
that works instantly — no account, no install step beyond optional
Add-to-Home-Screen — and tracks their pets' med schedules with AM/PM
checklists, exactly as DogScheduler does today for one dog.

## Strategic decisions

1. **Free service now; business later.** No billing machinery until real
   usage proves demand. The data model must keep a clean seam for a paid
   tier, but nothing is built for it in v1. When billing comes, use a
   merchant of record (Paddle / Lemon Squeezy) so sales-tax compliance is
   never the operator's problem.
2. **Web/PWA, not native iOS.** iOS+CloudKit was considered for its
   "storage is the user's iCloud" property, but: $99/yr developer fee vs
   ~$0 web costs; excludes Android owners (~half a vet's clients); full
   Swift rewrite of a working TypeScript codebase; App Store review
   friction. Native iOS is deferred, not rejected — nothing in this path
   forecloses it.
3. **Local-first free tier.** All free-tier data lives in browser storage
   on the owner's device: zero server cost, zero accounts, works offline.
   This *is* the web equivalent of "the user's own storage."
4. **Sync + household sharing is the future premium tier.** It lands
   exactly on the operator's cost line (server writes) and has real value
   (multiple caregivers, phone + laptop). The current token-based sync
   remains in the app behind an advanced/settings door; the operator's own
   household keeps using it as the de facto first sync user.
5. **Multi-pet from day one.** Meds belong to a pet; the calendar shows
   all pets or filters to one. Retrofitting pet-scoping later would be far
   more painful than building it now.
6. **Rename + real domain before first external user.** Browser-local
   data is bound to the origin; a later domain move strands every
   free-tier user. The name must be pet-generic (patients include cats).
   Name is the operator's choice, availability-checked; domain via
   Cloudflare Registrar (at-cost, ~$10/yr) fronting both site and API.

## Cost model

| Stage | Cost |
|---|---|
| v1 (local-first, no accounts) | domain ~$10/yr; everything else $0 (GitHub/Cloudflare Pages, Worker free tier) |
| Sync tier in use | $0 up to ~150 active syncing households (KV 1k writes/day); then $5/mo Workers Paid (1M writes/day) **or** migrate storage to D1 (100k writes/day free ≈ ~15k households at $0) |
| Billing stage | payment-processor fees only (no fixed cost) |

The dominant real costs are operator time (support, maintenance) and, if
ever built, billing complexity — not infrastructure.

## Roadmap

**Phase 1 — Genericize (next):**
- Rename + domain (operator picks name; availability check first).
- Remove seed meds (also removes the operator's dog's real medication
  data from the public repo — do regardless).
- Pet entity: meds belong to pets; multi-pet calendar with filter.
- Onboarding empty states: "Add your pet" → "Add a medication".
- Local-only by default; token/sync UI moves behind an advanced door.
- Export/import backup file (free tier's only protection against
  browser-data loss; medication history deserves it).
- Disclaimer ("not veterinary advice; confirm doses with your vet") and a
  one-page privacy note ("your data stays on your device").
- Operator's own household migrates by pasting the existing sync token
  once per device on the new origin; server-side data is untouched.

**Phase 2 — Vet-referral polish:** landing page with QR code;
per-platform install instructions (iPhone Safari, Android Chrome).

**Phase 3 — Reminders:** web push notifications for due doses (free to
operate; requires installed PWA on iOS). Likely premium headliner later,
free while there is no billing.

**Phase 4 — Premium + billing:** only on demonstrated demand. Tier =
sync + household sharing (+ possibly reminders); merchant of record;
grandfather early users generously.

## Risks and mitigations

- **Free-tier data loss** (browser data cleared → history gone): mitigated
  by export/import in Phase 1; sync tier is the durable answer.
- **Origin lock-in**: domain finalized before any external user (Phase 1
  gate).
- **Liability**: prominent disclaimer; the app records what owners say
  they did — it never advises dosing.
- **Support burden**: local-first means most classic support issues
  (passwords, accounts, billing) do not exist in v1.
- **iOS PWA limitations**: acceptable for v1; revisit native if reminders
  adoption or user feedback demands it.

## Explicitly deferred

- Accounts/auth of any kind (free tier needs none).
- Billing, entitlements, premium gating.
- Native iOS app.
- Vet-side features (clinic dashboards, co-branding).

## Immediate next actions

1. Operator picks 2–3 candidate names; availability check (.com/.app +
   trademark sniff test).
2. Register domain on Cloudflare.
3. Brainstorm → spec Phase 1 (data model for pets, onboarding flow,
   backup format, migration of the operator's household).
