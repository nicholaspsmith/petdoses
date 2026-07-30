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

## Next: finish Phase 1 (genericize), then Phase 2+

Work through brainstorm → spec → plan → TDD execution (superpowers flow;
specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`).

Done so far: pets layer (spec
`docs/superpowers/specs/2026-07-28-pets-layer-design.md`); backup
export/import + settings + privacy note (spec
`docs/superpowers/specs/2026-07-29-backup-export-import-design.md`).

1. **Hosting cutover — done 2026-07-29** (live at petdoses.com; origin
   gate met). Remaining loose end: www→apex redirect (operator: DNS
   record for www + "Redirect from WWW to Root" rule template).

Later phases per the strategy doc: vet-referral landing page + QR;
reminders (web push); premium sync + billing via a merchant of record,
only on demonstrated demand.

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
