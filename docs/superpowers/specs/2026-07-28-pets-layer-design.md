# Pets Layer Design

**Date:** 2026-07-28
**Status:** Approved
**Parent:** `2026-07-25-product-strategy.md` (Phase 1 — Genericize)

Multi-pet support: pets as a first-class entity, meds scoped to a pet,
calendar filterable by pet, onboarding becomes add-pet → add-med. This is
strategy decision 5 ("multi-pet from day one") designed in detail.

## Decisions made during brainstorming

- **Data model:** separate `Pet` entity + required `petId` on `MedDef`
  (chosen over nesting meds inside pets, and over a bare `petName`
  string).
- **Species:** enum `dog | cat | other`, plus an optional free-text
  `speciesDetail` shown only when `other` is selected (e.g. "parrot").
- **Management UI:** one combined **Pets & Meds** screen grouped by pet —
  no separate pets screen.
- **Pet deletion:** cascade with a clear confirmation — removes the pet,
  its meds, and those meds' check history. Med deletion is upgraded to
  cascade its own checks too (today it orphans them).

## Data model

```ts
export type Species = 'dog' | 'cat' | 'other'

export interface Pet {
  id: string              // slug id, e.g. 'rex-7f3k'
  name: string
  species: Species
  speciesDetail?: string  // only meaningful when species === 'other'
}
```

- `MedDef` gains a **required** `petId: string`.
- `Dose` gains `petId` (copied from the med in `makeDose`) so UI rows can
  label pets without med-list lookups.
- `PillInventory` gains `petId` the same way.
- Pet ids use the existing `slugId()` generator. `slugId` moves from
  `medForm.ts` to a new shared `ids.ts` (med and pet forms both use it);
  `medForm.ts` imports it from there.

## Storage

- New key: `PETS_KEY = 'petdoses:pets:v1'`.
- `loadMedList`/`saveMedList` generalize to `loadList<T>(storage, key)` /
  `saveList(storage, key, items)` — they are already generic in all but
  the key. The corrupt-value backup behavior (`<key>:corrupt`) applies to
  both keys for free.
- **No migration.** The site is not deployed; there are no external
  users. Pre-pets dev data is unsupported — clear localStorage in dev.

## Store API (`localStore.ts`)

```ts
export interface LocalStore {
  // existing, unchanged
  isChecked(doseId: string): boolean
  toggle(doseId: string): void
  meds(): MedDef[]
  addMed(med: MedDef): void
  // existing, changed behavior
  deleteMed(medId: string): void   // now also deletes that med's checks
  // new
  pets(): Pet[]
  addPet(pet: Pet): void           // ignores duplicate id, same as addMed
  updatePet(petId: string, patch: Partial<Omit<Pet, 'id'>>): void
  deletePet(petId: string): void   // cascade: pet's meds + their checks
  medsForPet(petId: string): MedDef[]
}
```

Check cascade is a prefix delete: dose ids are `${medId}:${date}:${slot}`
and slug ids cannot contain `:`, so removing check keys that start with
`${medId}:` is exact.

## Calendar screen

- `App` holds a session-only filter signal `'all' | petId`, default
  `'all'`. Not persisted.
- A chips row renders between the header and the month grid **only when
  there are ≥ 2 pets**: `[All] [🐕 Rex] [🐈 Milo]`. Deleting the
  currently-filtered pet resets the filter to `'all'`.
- `App` computes `visibleMeds()` from the filter. `MonthGrid`,
  `DayDetail`, and `Supply` stop calling `store.meds()` and instead
  receive a `meds: () => MedDef[]` prop (they keep `store` for checks).
  Filtering lives in one place; components and the schedule engine stay
  filter-unaware. Month-grid dots reflect the filter automatically.
- When viewing **All** with ≥ 2 pets, each `DayDetail` dose row and each
  `Supply` row shows a small pet-name tag before the med name (via
  `petId` on `Dose`/`PillInventory`). Under a single-pet filter or with
  only one pet, no tags.

## Pets & Meds screen

Replaces `MedsView`. The calendar header button is renamed to "Pets".

- One section per pet: header with species emoji (🐕 dog / 🐈 cat /
  🐾 other), pet name, `speciesDetail` in parens when present, ✎ edit,
  ✕ delete.
- **Edit:** header swaps for an inline form (name, species radios,
  detail field when "other") with Save/Cancel.
- **Delete:** inline confirm in the existing MedRow style, stating the
  count: "Remove Rex and its 3 medications, including dose history?"
- The pet's meds render under the header via the existing `MedRow`.
- `+ Add medication` per pet expands one `AddMedForm` (collapsed by
  default) bound to that pet. `AddMedForm` gains a `petId` prop;
  `MedFormInput` gains `petId` so `buildMedDef` stamps it.
- `+ Add pet` at the bottom expands an `AddPetForm` (name required,
  species radio defaulting to dog, optional detail). Duplicate pet names
  are allowed — ids are distinct.
- A new `petForm.ts` holds the pure helpers: build/validate a `Pet` from
  form input, species emoji/label mapping.

## Onboarding (calendar empty states)

Two stages replace the current single empty state:

1. **No pets:** current copy, button reads **"Add your pet"** → opens
   Pets & Meds with the add-pet form auto-expanded (nothing else is on
   the screen).
2. **Pets but no meds:** button reads **"Add a medication for Rex"**
   (first pet's name) → opens Pets & Meds; when there is exactly one pet
   and it has no meds, its add-med form is auto-expanded.

The month grid renders once any med exists — same condition as today.

## Edge cases

- Deleting the last pet returns the calendar to the no-pets empty state.
- Deleting the currently-filtered pet resets the filter to All.
- `speciesDetail` is ignored and cleared on save unless species is
  `other`.
- Empty pet name is rejected, same as empty med name.
- Duplicate pet names are allowed.

## Testing

TDD throughout; Vitest in node environment; pure modules only (existing
pattern — components are not unit-tested).

- **storage:** pets-key round-trip via the generalized `loadList` /
  `saveList`; corrupt-backup behavior covered by existing tests against
  the shared helper.
- **localStore:** pets CRUD; `deletePet` cascades meds and checks while
  leaving other pets' data untouched; `deleteMed` deletes its checks;
  `medsForPet`.
- **schedule:** `petId` propagation onto `Dose` and `PillInventory`.
- **petForm:** build/validate `Pet`, species emoji/label mapping.
- **medForm:** `petId` stamped by `buildMedDef`.
- **testFixtures:** `TEST_PETS` added; `TEST_MEDS` gain `petId`s.

## Out of scope

Export/import backup, privacy note page, hosting cutover (subsequent
Phase 1 items); sync, reminders, billing (later phases).
