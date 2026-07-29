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

## State as of 2026-07-28

- Built and green: schedule engine (`schedule.ts`, parameterized over
  `MedDef[]`, no bundled data; meds carry a required `petId`), phase
  builder (`builder.ts`), summaries, med + pet form helpers, local store
  (`localStore.ts` — pets, meds, checks in localStorage under
  `petdoses:*` keys, corrupt-value backup, cascade deletes), calendar UI
  with per-pet filter chips, combined Pets & Meds screen, two-stage
  onboarding (add pet → add med), disclaimer footer. CI runs test +
  build only — **the site is not deployed anywhere yet.**
- Domain: petdoses.com registered at Namecheap; DNS hosted on Cloudflare
  (zone active, operator's second/correct CF account). `api.petdoses.com`
  currently routes to the old DogScheduler Worker — inert, nothing calls
  it; repoint it when a PetDoses API exists (sync phase).
- Hosting decided 2026-07-29: **the site will be hosted on Cloudflare**.
  DogScheduler stays on GitHub Pages as a legacy app, completely separate
  from this project (frozen as ever).

## Next: finish Phase 1 (genericize), then Phase 2+

Work through brainstorm → spec → plan → TDD execution (superpowers flow;
specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`).

Done so far: pets layer (spec
`docs/superpowers/specs/2026-07-28-pets-layer-design.md`).

1. **Export/import backup file** — the free tier's only durability story.
2. **Privacy note page** ("your data stays on your device").
3. **Hosting cutover**: host decided (Cloudflare); set up the project,
   DNS records, go live at petdoses.com. Gate: the domain must be live
   before any external user (browser-local data binds to the origin).

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
