# PetDoses

Free, local-first pet medication calendar PWA. **Read
`docs/superpowers/specs/2026-07-25-product-strategy.md` first** — it is the
founding strategy (free local-first tier now, premium sync later, web over
native iOS, and why).

## Hard constraints

- **DogScheduler (`~/Code/DogScheduler`) is the operator's live personal
  app and is FROZEN.** Never push to it, deploy it, or touch its Cloudflare
  Worker (`dogscheduler-sync`) or KV data. PetDoses is its genericized
  fork; improvements do not flow back.
- **No real medication data in this repo.** The operator's dog's regimen
  must never appear here — `src/testFixtures.ts` holds anonymized fixtures
  (same math as the original hand-verified regimens, generic names). Keep
  it that way.
- Free tier = local-only: no accounts, no server, no network calls. Sync
  returns later as premium and needs a per-account redesign (the old
  single-token model serves exactly one household — do not resurrect it).
- No new runtime dependencies (`solid-js` only).

## State as of 2026-07-29

- Built and green: schedule engine (`schedule.ts`, parameterized over
  `MedDef[]`, no bundled data; meds carry a required `petId`), phase
  builder (`builder.ts`), summaries, med + pet form helpers, local store
  (`localStore.ts` — pets, meds, checks in localStorage under
  `petdoses:*` keys, corrupt-value backup, cascade deletes), calendar UI
  with per-pet filter chips, combined Pets & Meds screen, two-stage
  onboarding (add pet → add med), settings screen with backup
  export/import (versioned JSON, replace-all restore) and privacy note,
  disclaimer footer. CI runs test + build only.
- **Live at https://petdoses.com since 2026-07-29** — assets-only
  Cloudflare Worker (`wrangler.jsonc`; account
  nicholaspsmith.software@gmail.com, worker name `petdoses`).
  workers.dev + preview URLs deliberately disabled: exactly one public
  origin, because browser-local data binds to it. Deploys are manual:
  `npm run build && npx wrangler deploy`.
- Domain: petdoses.com registered at Namecheap; DNS on Cloudflare. During
  the cutover the operator cleared ALL A/AAAA/CNAME records: the old
  `api.petdoses.com` → DogScheduler-Worker record is GONE (was inert;
  recreate a proper one in the sync phase) and `www` has no record —
  www→apex redirect still pending (DNS record + redirect rule).
- DogScheduler stays on GitHub Pages as a legacy app, completely separate
  from this project (frozen as ever).

## Phase 1 (genericize): COMPLETE 2026-07-29

Pets layer (spec `docs/superpowers/specs/2026-07-28-pets-layer-design.md`,
plan `docs/superpowers/plans/2026-07-28-pets-layer.md`); backup
export/import + settings + privacy note (spec
`docs/superpowers/specs/2026-07-29-backup-export-import-design.md`, plan
`docs/superpowers/plans/2026-07-29-backup-export-import.md`); hosting
cutover (live at petdoses.com; origin gate met).

## Next: Phase 2 — vet-referral polish (NOT yet designed)

Nothing brainstormed or spec'd. A new session starts with brainstorm →
spec → plan → TDD execution (superpowers flow; specs in
`docs/superpowers/specs/`, plans in `docs/superpowers/plans/`). Scope per
the strategy doc:

- Landing page with QR code (vet hands owner a QR → opens the PWA).
- Per-platform install instructions (iPhone Safari, Android Chrome).
- Consider pulling the service worker forward from Phase 3 (see gaps) —
  the vision promises "works offline" and vet-referred users will
  install to home screen.

## Later phases (strategy doc is the umbrella)

- **Phase 3 — reminders**: web push for due doses. Hard prerequisites: a
  service worker, and on iOS an installed (home-screen) PWA. Free while
  there is no billing; likely premium headliner later.
- **Phase 4 — premium sync + billing**: only on demonstrated demand.
  Merchant of record (Paddle / Lemon Squeezy). Sync needs a per-account
  redesign — never resurrect the old single-token model. Recreate
  `api.petdoses.com` (deleted during cutover) when this begins.

## Known gaps / loose ends

- **No service worker**: manifest + icons only — installable, but no
  offline support and no push capability. Needed by Phase 3 at the
  latest; offline arguably belongs in Phase 2.
- **www→apex redirect pending** (operator, dashboard): proxied A record
  `www` → `192.0.2.1`, then Rules → template "Redirect from WWW to
  Root". Until then www.petdoses.com does not resolve.
- **Deploys are manual** (`npm run build && npx wrangler deploy`).
  Optional later: Workers Builds git integration (operator connects the
  repo in the dashboard) for push-to-deploy.

## Conventions and gotchas

- TDD throughout; feature branches merged to `main`. The operator prefers
  inline plan execution and is responsive to multiple-choice questions.
- Vitest runs in `environment: 'node'` (set in `vite.config.ts`) — do not
  remove it; `vite-plugin-solid` otherwise injects a jsdom default that is
  not installed.
- npm must be ≥ 11.18 (11.6 wrote lockfiles missing optional
  `@emnapi/*` deps, breaking `npm ci`).
- The operator personally performs all account, login, payment, and
  dashboard actions (wrangler login, registrars, DNS panels); for
  interactive CLIs suggest they type `! <command>` in the prompt.
- Predecessor design history (calendar engine rationale, sync design, med
  editor) lives in `~/Code/DogScheduler/docs/superpowers/` — reference
  only, do not modify that repo.
