# PetDoses

A free, local-first pet medication calendar: a month grid with per-day
AM/PM dose checklists, a phase-builder for vet instructions ("twice a day
for 5 days, then once a day for 5 days…"), and pills-remaining counts.
All data stays in the browser on the owner's device — no accounts, no
server, works offline. Installable as a PWA (Add to Home Screen).

**Status:** pre-launch. Will live at https://petdoses.com.

Forked from the single-household DogScheduler project; the product
strategy is in `docs/superpowers/specs/2026-07-25-product-strategy.md`.

## Development

```sh
npm install
npm run dev      # local dev server with HMR
npm test         # unit tests (Vitest)
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Disclaimer

PetDoses records what pet owners say they did. It does not calculate
doses and is not veterinary advice — always follow your veterinarian's
instructions.

## License

[MIT](LICENSE)
