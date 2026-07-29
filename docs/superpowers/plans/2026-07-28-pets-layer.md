# Pets Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Multi-pet support per `docs/superpowers/specs/2026-07-28-pets-layer-design.md` — pets as a first-class entity, meds scoped to a pet, calendar filterable by pet, onboarding add-pet → add-med.

**Architecture:** A new `Pet` entity stored under `petdoses:pets:v1`; `MedDef` gains a required `petId` that propagates onto `Dose` and `PillInventory`; the store gains pets CRUD with cascade deletion; the calendar filters meds by pet in `App` only (components and schedule engine stay filter-unaware); `MedsView` is replaced by a combined Pets & Meds screen grouped by pet.

**Tech Stack:** SolidJS + TypeScript + Vite; Vitest (node environment, pure modules only — components are never unit-tested).

## Global Constraints

- No new runtime dependencies — `solid-js` only.
- No real medication data anywhere; fixtures stay generic (`src/testFixtures.ts`).
- Free tier is local-only: no accounts, no server, no network calls.
- Vitest runs with `environment: 'node'` (set in `vite.config.ts`) — never remove it; components (.tsx) are not unit-tested, pure `.ts` modules are.
- localStorage keys are namespaced `petdoses:*`; new key in this plan: `petdoses:pets:v1`.
- **No storage migration** — the site is not deployed; pre-pets dev data is unsupported (clear localStorage in dev).
- Test command: `npm test` (all) or `npx vitest run src/<file>.test.ts` (one file). Full verification: `npm test && npm run build` — `npm run build` runs `tsc -b` and is the ONLY thing that catches type errors in `.tsx` files and test literals (vitest does not typecheck).
- Commit after every task; work directly on a feature branch off `main` (create `feat/pets-layer` in Task 1).

---

### Task 1: Extract `slugId` into `ids.ts`

Both med and pet forms need slug ids; the generator currently lives in `medForm.ts`.

**Files:**
- Create: `src/ids.ts`, `src/ids.test.ts`
- Modify: `src/medForm.ts` (remove local `slugId`/`BASE36`, import from `./ids`), `src/medForm.test.ts` (remove `slugId` tests + import)

**Interfaces:**
- Consumes: nothing new.
- Produces: `slugId(name: string, rand: () => number = Math.random): string` exported from `src/ids.ts` — e.g. `slugId('Rex!', () => 0)` → `'rex-0000'`; all-symbol names fall back to `'med-0000'`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/pets-layer
```

- [ ] **Step 2: Write the failing test**

Create `src/ids.test.ts` (these two cases move verbatim from `medForm.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { slugId } from './ids'

const fixedRand = () => 0 // suffix "0000"

describe('slugId', () => {
  it('slugifies and suffixes', () => {
    expect(slugId('Gabapentin 100mg!', fixedRand)).toBe('gabapentin-100mg-0000')
  })
  it('falls back for all-symbol names', () => {
    expect(slugId('★★★', fixedRand)).toBe('med-0000')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ids.test.ts`
Expected: FAIL — cannot resolve `./ids`.

- [ ] **Step 4: Create `src/ids.ts`** (function body moves unchanged from `medForm.ts:21-29`)

```ts
const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz'

export function slugId(name: string, rand: () => number = Math.random): string {
  const slug =
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'med'
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += BASE36[Math.floor(rand() * 36)]
  return `${slug}-${suffix}`
}
```

- [ ] **Step 5: Update `src/medForm.ts`**

Delete the `BASE36` constant and the `slugId` function (lines 21–29). Add at the top:

```ts
import { slugId } from './ids'
```

(`buildMedDef` keeps calling `slugId(input.name, rand)` unchanged. Nothing re-exports `slugId` from `medForm`.)

- [ ] **Step 6: Update `src/medForm.test.ts`**

Remove `slugId` from the import on line 2 (leaving `buildMedDef, deriveDoseText`) and delete the whole `describe('slugId', ...)` block (lines 18–25). The `fixedRand` const stays — `buildMedDef` tests use it.

- [ ] **Step 7: Verify everything passes**

Run: `npm test && npm run build`
Expected: all tests pass (same total count — two tests moved files), build green.

- [ ] **Step 8: Commit**

```bash
git add src/ids.ts src/ids.test.ts src/medForm.ts src/medForm.test.ts
git commit -m "refactor: extract slugId into ids.ts for reuse by pet forms"
```

---

### Task 2: Generalize storage list helpers, add `PETS_KEY`

**Files:**
- Create: `src/storage.test.ts`, `src/testStorage.ts`
- Modify: `src/storage.ts` (replace `loadMedList`/`saveMedList` with key-parameterized `loadList`/`saveList`; add `PETS_KEY`), `src/localStore.ts` (call sites), `src/localStore.test.ts` (import shared fake storage)

**Interfaces:**
- Consumes: existing `loadJson`/`saveJson` internals of `storage.ts`.
- Produces:
  - `PETS_KEY = 'petdoses:pets:v1'` exported from `src/storage.ts`.
  - `loadList<T>(storage: StorageLike | null, key: string): T[]`
  - `saveList<T>(storage: StorageLike | null, key: string, items: T[]): void`
  - `fakeStorage(initial?: Record<string, string>): StorageLike & { data: Map<string, string> }` exported from `src/testStorage.ts` (test helper).

- [ ] **Step 1: Create the shared test-storage helper**

Create `src/testStorage.ts` (body moves verbatim from `localStore.test.ts:6-13`):

```ts
import type { StorageLike } from './storage'

// Test-only in-memory StorageLike with direct access to the backing map.
export function fakeStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, v),
  }
}
```

Then in `src/localStore.test.ts`: delete its local `fakeStorage` function (lines 6–13) and add `import { fakeStorage } from './testStorage'`.

- [ ] **Step 2: Write the failing test**

Create `src/storage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { loadList, saveList, PETS_KEY } from './storage'
import { fakeStorage } from './testStorage'

describe('loadList/saveList', () => {
  it('round-trips a list under a given key', () => {
    const s = fakeStorage()
    saveList(s, PETS_KEY, [{ id: 'a' }, { id: 'b' }])
    expect(loadList(s, PETS_KEY)).toEqual([{ id: 'a' }, { id: 'b' }])
  })
  it('returns [] for missing or non-array values', () => {
    expect(loadList(fakeStorage(), PETS_KEY)).toEqual([])
    expect(loadList(fakeStorage({ [PETS_KEY]: '{"not":"array"}' }), PETS_KEY)).toEqual([])
  })
  it('backs up a corrupt value before resetting — never silently discards', () => {
    const s = fakeStorage({ [PETS_KEY]: '[broken' })
    expect(loadList(s, PETS_KEY)).toEqual([])
    expect(s.data.get(`${PETS_KEY}:corrupt`)).toBe('[broken')
  })
  it('tolerates null storage', () => {
    expect(loadList(null, PETS_KEY)).toEqual([])
    saveList(null, PETS_KEY, [1]) // must not throw
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/storage.test.ts`
Expected: FAIL — `loadList`/`PETS_KEY` not exported.

- [ ] **Step 4: Implement in `src/storage.ts`**

Add below `MEDS_KEY`:

```ts
export const PETS_KEY = 'petdoses:pets:v1'
```

Replace `loadMedList`/`saveMedList` (lines 56–63) with:

```ts
export function loadList<T>(storage: StorageLike | null, key: string): T[] {
  const parsed = loadJson(storage, key)
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

export function saveList<T>(storage: StorageLike | null, key: string, items: T[]): void {
  saveJson(storage, key, items)
}
```

- [ ] **Step 5: Update call sites in `src/localStore.ts`**

Change the storage import to:

```ts
import {
  loadChecks,
  saveChecks,
  loadList,
  saveList,
  MEDS_KEY,
  type Checks,
  type StorageLike,
} from './storage'
```

and the two call sites:

```ts
const [meds, setMeds] = createSignal<MedDef[]>(loadList<MedDef>(storage, MEDS_KEY))
```

```ts
function persistMeds(next: MedDef[]): void {
  setMeds(next)
  saveList(storage, MEDS_KEY, next)
}
```

- [ ] **Step 6: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green (existing corrupt-med-list test in `localStore.test.ts` now exercises the generalized helper).

- [ ] **Step 7: Commit**

```bash
git add src/storage.ts src/storage.test.ts src/testStorage.ts src/localStore.ts src/localStore.test.ts
git commit -m "feat: key-parameterized list storage and pets storage key"
```

---

### Task 3: `Pet` types and `petForm` helpers

**Files:**
- Create: `src/pets.ts`, `src/petForm.ts`, `src/petForm.test.ts`

**Interfaces:**
- Consumes: `slugId` from `src/ids.ts` (Task 1).
- Produces (used by Tasks 5–7):
  - `src/pets.ts`: `type Species = 'dog' | 'cat' | 'other'`; `interface Pet { id: string; name: string; species: Species; speciesDetail?: string }`
  - `src/petForm.ts`:
    - `interface PetFormInput { name: string; species: Species; speciesDetail: string }`
    - `petPatch(input: PetFormInput): Omit<Pet, 'id'>` — throws `Error('Name is required')` on blank name; includes `speciesDetail` only when species is `'other'` AND the trimmed detail is non-empty.
    - `buildPet(input: PetFormInput, rand?: () => number): Pet`
    - `speciesEmoji(species: Species): string` — 🐕 / 🐈 / 🐾
    - `speciesLabel(pet: Pet): string` — `'dog'`, `'cat'`, or the detail (falling back to `'other'`)

- [ ] **Step 1: Write the failing test**

Create `src/petForm.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { petPatch, buildPet, speciesEmoji, speciesLabel } from './petForm'

const fixedRand = () => 0 // suffix "0000"

describe('petPatch', () => {
  it('trims the name and keeps the species', () => {
    expect(petPatch({ name: '  Rex ', species: 'dog', speciesDetail: '' })).toEqual({
      name: 'Rex',
      species: 'dog',
    })
  })
  it('rejects a blank name', () => {
    expect(() => petPatch({ name: '   ', species: 'cat', speciesDetail: '' })).toThrow('Name')
  })
  it('keeps a trimmed detail only for species "other"', () => {
    expect(petPatch({ name: 'Kiwi', species: 'other', speciesDetail: ' parrot ' })).toEqual({
      name: 'Kiwi',
      species: 'other',
      speciesDetail: 'parrot',
    })
  })
  it('drops the detail for dog/cat even if typed', () => {
    expect(petPatch({ name: 'Rex', species: 'dog', speciesDetail: 'husky' })).toEqual({
      name: 'Rex',
      species: 'dog',
    })
  })
  it('omits an empty detail for "other"', () => {
    expect(petPatch({ name: 'Kiwi', species: 'other', speciesDetail: '  ' })).toEqual({
      name: 'Kiwi',
      species: 'other',
    })
  })
})

describe('buildPet', () => {
  it('slugs the id from the name and applies the patch', () => {
    expect(buildPet({ name: 'Rex', species: 'dog', speciesDetail: '' }, fixedRand)).toEqual({
      id: 'rex-0000',
      name: 'Rex',
      species: 'dog',
    })
  })
})

describe('species display', () => {
  it('maps species to emoji', () => {
    expect(speciesEmoji('dog')).toBe('🐕')
    expect(speciesEmoji('cat')).toBe('🐈')
    expect(speciesEmoji('other')).toBe('🐾')
  })
  it('labels dog/cat by species and other by detail', () => {
    expect(speciesLabel({ id: 'x', name: 'Rex', species: 'dog' })).toBe('dog')
    expect(speciesLabel({ id: 'x', name: 'Kiwi', species: 'other', speciesDetail: 'parrot' })).toBe('parrot')
    expect(speciesLabel({ id: 'x', name: 'Kiwi', species: 'other' })).toBe('other')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/petForm.test.ts`
Expected: FAIL — cannot resolve `./petForm`.

- [ ] **Step 3: Create `src/pets.ts`**

```ts
export type Species = 'dog' | 'cat' | 'other'

export interface Pet {
  id: string // slug id, e.g. 'rex-7f3k'
  name: string
  species: Species
  speciesDetail?: string // only when species === 'other', e.g. 'parrot'
}
```

- [ ] **Step 4: Create `src/petForm.ts`**

```ts
import { slugId } from './ids'
import type { Pet, Species } from './pets'

export interface PetFormInput {
  name: string
  species: Species
  speciesDetail: string // raw form text; meaningful only when species === 'other'
}

export function petPatch(input: PetFormInput): Omit<Pet, 'id'> {
  const name = input.name.trim()
  if (name.length === 0) throw new Error('Name is required')
  const patch: Omit<Pet, 'id'> = { name, species: input.species }
  const detail = input.speciesDetail.trim()
  if (input.species === 'other' && detail.length > 0) patch.speciesDetail = detail
  return patch
}

export function buildPet(input: PetFormInput, rand: () => number = Math.random): Pet {
  const patch = petPatch(input)
  return { id: slugId(patch.name, rand), ...patch }
}

export function speciesEmoji(species: Species): string {
  return species === 'dog' ? '🐕' : species === 'cat' ? '🐈' : '🐾'
}

export function speciesLabel(pet: Pet): string {
  return pet.species === 'other' ? pet.speciesDetail ?? 'other' : pet.species
}
```

- [ ] **Step 5: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/pets.ts src/petForm.ts src/petForm.test.ts
git commit -m "feat: Pet type and pet form helpers"
```

---

### Task 4: `petId` through the domain

`MedDef.petId` becomes **required** and propagates onto `Dose` and `PillInventory`. Everything that constructs a `MedDef` (fixtures, `buildMedDef`, test literals, the add-med form) is updated in this task so the repo stays green. `MedsView` gets a **temporary placeholder petId** that Task 6 removes when the screen is replaced.

**Files:**
- Modify: `src/schedule.ts`, `src/testFixtures.ts`, `src/medForm.ts`, `src/AddMedForm.tsx`, `src/MedsView.tsx`
- Test: `src/schedule.test.ts`, `src/medForm.test.ts`, `src/summary.test.ts`, `src/localStore.test.ts`

**Interfaces:**
- Consumes: `Pet` from `src/pets.ts` (Task 3).
- Produces (relied on by Tasks 5–7):
  - `MedDef` gains `petId: string` (required); `Dose` gains `petId: string`; `PillInventory` gains `petId: string`.
  - `MedFormInput` gains `petId: string`; `buildMedDef` stamps it onto the returned `MedDef`.
  - `AddMedForm` props become `{ store: LocalStore; petId: string }`.
  - `TEST_PETS: Pet[]` exported from `src/testFixtures.ts`: ids `'test-dog'` and `'test-cat'`. `TEST_MEDS` petIds: `taper-med`/`twice-daily-med`/`daily-med` → `'test-dog'`; `monthly-med`/`weekly-med` → `'test-cat'`.

- [ ] **Step 1: Write the failing tests**

In `src/schedule.test.ts`, add a new describe (after `describe('dose identity and shape', ...)`), and add one import: `TEST_PETS` alongside `TEST_MEDS`:

```ts
import { TEST_MEDS, TEST_PETS } from './testFixtures'
```

```ts
describe('petId propagation', () => {
  it('fixtures split across the two test pets', () => {
    expect(TEST_PETS.map((p) => p.id)).toEqual(['test-dog', 'test-cat'])
    expect(TEST_MEDS.map((m) => m.petId)).toEqual([
      'test-dog', 'test-dog', 'test-dog', 'test-cat', 'test-cat',
    ])
  })
  it('doses carry their med petId', () => {
    const dose = dosesForDay(TEST_MEDS, '2026-07-22').find((d) => d.medId === 'taper-med')!
    expect(dose.petId).toBe('test-dog')
    const monthly = dosesForDay(TEST_MEDS, '2026-08-14').find((d) => d.medId === 'monthly-med')!
    expect(monthly.petId).toBe('test-cat')
  })
  it('pill inventories carry petId', () => {
    expect(pillInventories(TEST_MEDS).map((i) => i.petId)).toEqual([
      'test-dog', 'test-dog', 'test-dog',
    ])
  })
})
```

In `src/medForm.test.ts`, add `petId: 'test-dog'` to the `base` input object, and `petId: 'test-dog'` to the expected object in the `'builds a countable med with units and phases'` assertion.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/schedule.test.ts src/medForm.test.ts`
Expected: FAIL — `TEST_PETS` not exported; `petId` undefined on doses/inventories; `buildMedDef` result has no `petId`.

- [ ] **Step 3: Implement the domain change in `src/schedule.ts`**

- `MedDef`: add `petId: string` directly under `id`.
- `Dose`: add `petId: string` directly under `medId`.
- `makeDose`: add `petId: med.petId,` to the returned object.
- `PillInventory`: add `petId: string` directly under `medId`.
- `pillInventories`: add `petId: med.petId,` to the pushed object.

- [ ] **Step 4: Update `src/testFixtures.ts`**

Add at the top:

```ts
import type { Pet } from './pets'

export const TEST_PETS: Pet[] = [
  { id: 'test-dog', name: 'Test Dog', species: 'dog' },
  { id: 'test-cat', name: 'Test Cat', species: 'cat' },
]
```

Add `petId: 'test-dog',` (under `id`) to `taper-med`, `twice-daily-med`, `daily-med`; add `petId: 'test-cat',` to `monthly-med`, `weekly-med`.

- [ ] **Step 5: Update `src/medForm.ts`**

`MedFormInput` gains `petId: string` (first field). In `buildMedDef`, the constructed med becomes:

```ts
const med: MedDef = {
  id: slugId(input.name, rand),
  petId: input.petId,
  name: input.name.trim(),
  doseText: deriveDoseText(input.amount, input.unit),
}
```

- [ ] **Step 6: Fix the remaining test literals (type errors only — `tsc` finds them)**

- `src/summary.test.ts`: both inline med literals in the `'uses correct ordinals'` test gain `petId: 'test-cat',` after `id: 'x',`.
- `src/localStore.test.ts`: the `MED` constant gains `petId: 'test-dog',` after its `id`.

- [ ] **Step 7: Update `src/AddMedForm.tsx` and `src/MedsView.tsx`**

`AddMedForm` props become `{ store: LocalStore; petId: string }`. Both `buildMedDef` call sites (the `preview` memo and `save()`) add `petId: props.petId,` to the input object.

In `src/MedsView.tsx`, line 59 becomes (temporary — this whole file is deleted in Task 6):

```tsx
{/* placeholder petId: MedsView is replaced by PetsView in the pets-layer plan */}
<AddMedForm store={props.store} petId="pet-pending" />
```

- [ ] **Step 8: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green. The build step is essential here — it typechecks every med literal.

- [ ] **Step 9: Commit**

```bash
git add src/schedule.ts src/testFixtures.ts src/medForm.ts src/AddMedForm.tsx src/MedsView.tsx src/schedule.test.ts src/medForm.test.ts src/summary.test.ts src/localStore.test.ts
git commit -m "feat: meds belong to pets — required petId through the domain"
```

---

### Task 5: Store pets API and cascade deletes

**Files:**
- Modify: `src/localStore.ts`
- Test: `src/localStore.test.ts`

**Interfaces:**
- Consumes: `Pet` (Task 3); `loadList`/`saveList`/`PETS_KEY` (Task 2); `MedDef.petId` (Task 4).
- Produces (relied on by Tasks 6–8) — `LocalStore` becomes:

```ts
export interface LocalStore {
  isChecked(doseId: string): boolean
  toggle(doseId: string): void
  meds(): MedDef[]
  addMed(med: MedDef): void
  deleteMed(medId: string): void // now also deletes the med's checks
  pets(): Pet[]
  addPet(pet: Pet): void // id-idempotent, same as addMed
  updatePet(petId: string, fields: Omit<Pet, 'id'>): void // full-field replace
  deletePet(petId: string): void // cascade: the pet's meds + their checks
  medsForPet(petId: string): MedDef[]
}
```

Note: `updatePet` takes the **full field set** (`Omit<Pet, 'id'>`), not a partial — replacing all mutable fields is what makes `speciesDetail` clearing automatic when `petPatch` omits it. (Refines the spec's `Partial<...>` sketch.)

- [ ] **Step 1: Write the failing tests**

In `src/localStore.test.ts`:

1. Extend imports: `PETS_KEY` from `./storage`, `Pet` type from `./pets`.
2. Add fixtures below `MED`:

```ts
const DOG: Pet = { id: 'test-dog', name: 'Test Dog', species: 'dog' }
const CAT: Pet = { id: 'test-cat', name: 'Test Cat', species: 'cat' }

const CAT_MED: MedDef = {
  id: 'ear-drops-0000',
  petId: 'test-cat',
  name: 'Ear Drops',
  doseText: '2 drops',
  phases: [{ start: '2026-07-24', startSlot: 'am', intervalSlots: 2, count: 3 }],
}

const CAT_ID = 'ear-drops-0000:2026-07-24:am'
```

3. **Replace** the existing test `'add is id-idempotent; delete removes and leaves checks alone'` — the spec deliberately reverses the keep-checks behavior (see "Pet deletion" decision in the design doc):

```ts
  it('add is id-idempotent; delete removes the med and its checks', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    store.addMed(MED)
    store.addMed({ ...MED, name: 'Impostor' })
    expect(store.meds()).toEqual([MED])
    store.toggle(ID)
    store.deleteMed(MED.id)
    expect(store.meds()).toEqual([])
    expect(store.isChecked(ID)).toBe(false)
    expect(JSON.parse(s.data.get(CHECKS_KEY)!)).toEqual({})
  })
```

4. Add a new describe:

```ts
describe('pets', () => {
  it('starts empty, adds, persists, and survives a reload', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    expect(store.pets()).toEqual([])
    store.addPet(DOG)
    expect(store.pets()).toEqual([DOG])
    expect(createLocalStore(s).pets()).toEqual([DOG])
  })
  it('addPet is id-idempotent', () => {
    const store = createLocalStore(fakeStorage())
    store.addPet(DOG)
    store.addPet({ ...DOG, name: 'Impostor' })
    expect(store.pets()).toEqual([DOG])
  })
  it('updatePet replaces all mutable fields — stale speciesDetail cannot survive', () => {
    const store = createLocalStore(fakeStorage())
    store.addPet({ id: 'kiwi-0000', name: 'Kiwi', species: 'other', speciesDetail: 'parrot' })
    store.updatePet('kiwi-0000', { name: 'Kiwi II', species: 'cat' })
    expect(store.pets()).toEqual([{ id: 'kiwi-0000', name: 'Kiwi II', species: 'cat' }])
  })
  it('medsForPet filters by owner', () => {
    const store = createLocalStore(fakeStorage())
    store.addMed(MED)
    store.addMed(CAT_MED)
    expect(store.medsForPet('test-dog')).toEqual([MED])
    expect(store.medsForPet('test-cat')).toEqual([CAT_MED])
  })
  it('deletePet cascades its meds and their checks, leaving other pets untouched', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    store.addPet(DOG)
    store.addPet(CAT)
    store.addMed(MED) // petId test-dog
    store.addMed(CAT_MED) // petId test-cat
    store.toggle(ID)
    store.toggle(CAT_ID)
    store.deletePet('test-dog')
    expect(store.pets()).toEqual([CAT])
    expect(store.meds()).toEqual([CAT_MED])
    expect(store.isChecked(ID)).toBe(false)
    expect(store.isChecked(CAT_ID)).toBe(true)
  })
  it('backs up a corrupt pet list before resetting', () => {
    const s = fakeStorage({ [PETS_KEY]: '[oops' })
    expect(createLocalStore(s).pets()).toEqual([])
    expect(s.data.get(`${PETS_KEY}:corrupt`)).toBe('[oops')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/localStore.test.ts`
Expected: FAIL — `pets` is not a function; the replaced delete test fails on `isChecked(ID)` being `true`.

- [ ] **Step 3: Implement in `src/localStore.ts`**

Imports: add `loadList` already present from Task 2 — extend with `PETS_KEY` and `import type { Pet } from './pets'`. Update the `LocalStore` interface to the shape in this task's Interfaces block. Inside `createLocalStore`:

```ts
const [pets, setPets] = createSignal<Pet[]>(loadList<Pet>(storage, PETS_KEY))

function persistPets(next: Pet[]): void {
  setPets(next)
  saveList(storage, PETS_KEY, next)
}

// Dose ids are `${medId}:${date}:${slot}` and slug ids cannot contain ':',
// so a `${medId}:` prefix match is exact.
function deleteChecksFor(medIds: string[]): void {
  const next = { ...checks() }
  let changed = false
  for (const key of Object.keys(next)) {
    if (medIds.some((id) => key.startsWith(`${id}:`))) {
      delete next[key]
      changed = true
    }
  }
  if (changed) persistChecks(next)
}
```

Returned object — change `deleteMed` and add the pets API:

```ts
deleteMed: (medId) => {
  persistMeds(meds().filter((m) => m.id !== medId))
  deleteChecksFor([medId])
},
pets,
addPet: (pet) => {
  if (pets().some((p) => p.id === pet.id)) return
  persistPets([...pets(), pet])
},
updatePet: (petId, fields) => {
  persistPets(pets().map((p) => (p.id === petId ? { id: p.id, ...fields } : p)))
},
deletePet: (petId) => {
  const doomed = meds().filter((m) => m.petId === petId).map((m) => m.id)
  persistMeds(meds().filter((m) => m.petId !== petId))
  deleteChecksFor(doomed)
  persistPets(pets().filter((p) => p.id !== petId))
},
medsForPet: (petId) => meds().filter((m) => m.petId === petId),
```

- [ ] **Step 4: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/localStore.ts src/localStore.test.ts
git commit -m "feat: store pets API with cascade deletion of meds and checks"
```

---

### Task 6: Pets & Meds screen

Replace `MedsView` with a grouped screen: one section per pet (header with edit/delete, its meds, a collapsed add-med form), plus add-pet at the bottom. Components are not unit-tested; `npm run build` is the type gate.

**Files:**
- Create: `src/MedRow.tsx`, `src/PetEditor.tsx`, `src/PetSection.tsx`, `src/PetsView.tsx`
- Delete: `src/MedsView.tsx`
- Modify: `src/App.tsx` (render `PetsView`; header button text → "Pets"), `src/App.css`

**Interfaces:**
- Consumes: `LocalStore` pets API (Task 5); `AddMedForm` with `petId` prop (Task 4); `petPatch`/`buildPet`/`speciesEmoji`, `PetFormInput` (Task 3); `scheduleSummary` from `./summary`.
- Produces:
  - `MedRow` props `{ med: MedDef; store: LocalStore }` (extracted from MedsView, unchanged behavior).
  - `PetEditor` props `{ initial?: Pet; submitLabel: string; onSave(input: PetFormInput): void; onCancel?(): void }` — validates via `petPatch`, shows the error inline, emits the raw input on success.
  - `PetSection` props `{ pet: Pet; store: LocalStore; autoExpandAdd?: boolean }`.
  - `PetsView` props `{ store: LocalStore; onBack(): void }`.

- [ ] **Step 1: Create `src/MedRow.tsx`** (the `MedRow` function moves verbatim from `MedsView.tsx:7-44`, becoming the default export)

```tsx
import { createSignal, Show } from 'solid-js'
import type { MedDef } from './schedule'
import { scheduleSummary } from './summary'
import type { LocalStore } from './localStore'

export default function MedRow(props: { med: MedDef; store: LocalStore }) {
  const [confirming, setConfirming] = createSignal(false)
  return (
    <div class="med-row">
      <Show
        when={!confirming()}
        fallback={
          <div class="med-confirm">
            <span>Remove {props.med.name}?</span>
            <button
              type="button"
              class="danger-btn"
              onClick={() => {
                props.store.deleteMed(props.med.id)
                setConfirming(false)
              }}
            >
              Remove
            </button>
            <button type="button" class="nav-btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        }
      >
        <div class="med-info">
          <span class="dose-name">{props.med.name}</span>
          <span class="med-summary">
            {props.med.doseText} · {scheduleSummary(props.med)}
          </span>
        </div>
        <button type="button" class="med-delete" aria-label={`Remove ${props.med.name}`} onClick={() => setConfirming(true)}>
          ✕
        </button>
      </Show>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/PetEditor.tsx`**

```tsx
import { createSignal, For, Show } from 'solid-js'
import type { Pet, Species } from './pets'
import { petPatch, speciesEmoji, type PetFormInput } from './petForm'

const SPECIES: Species[] = ['dog', 'cat', 'other']

interface Props {
  initial?: Pet
  submitLabel: string
  onSave(input: PetFormInput): void
  onCancel?(): void
}

export default function PetEditor(props: Props) {
  const [name, setName] = createSignal(props.initial?.name ?? '')
  const [species, setSpecies] = createSignal<Species>(props.initial?.species ?? 'dog')
  const [detail, setDetail] = createSignal(props.initial?.speciesDetail ?? '')
  const [error, setError] = createSignal('')
  const radioGroup = `species-${props.initial?.id ?? 'new'}`

  const submit = () => {
    const input: PetFormInput = { name: name(), species: species(), speciesDetail: detail() }
    try {
      petPatch(input) // validation only; the caller re-derives the patch on save
      setError('')
      props.onSave(input)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    }
  }

  return (
    <form
      class="pet-editor"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label class="field">
        <span>Name</span>
        <input value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="Pet name" />
      </label>
      <div class="field">
        <span>Species</span>
        <div class="species-choices">
          <For each={SPECIES}>
            {(s) => (
              <label class="species-choice">
                <input type="radio" name={radioGroup} checked={species() === s} onChange={() => setSpecies(s)} />
                <span>
                  {speciesEmoji(s)} {s}
                </span>
              </label>
            )}
          </For>
        </div>
      </div>
      <Show when={species() === 'other'}>
        <label class="field">
          <span>What kind? (optional)</span>
          <input value={detail()} onInput={(e) => setDetail(e.currentTarget.value)} placeholder="e.g. parrot" />
        </label>
      </Show>
      <Show when={error()}>
        <p class="med-error">{error()}</p>
      </Show>
      <div class="field-row">
        <button type="submit" class="today-btn">
          {props.submitLabel}
        </button>
        <Show when={props.onCancel}>
          <button type="button" class="nav-btn" onClick={() => props.onCancel!()}>
            Cancel
          </button>
        </Show>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `src/PetSection.tsx`**

```tsx
import { createSignal, For, Show } from 'solid-js'
import type { Pet } from './pets'
import type { LocalStore } from './localStore'
import { petPatch, speciesEmoji, type PetFormInput } from './petForm'
import MedRow from './MedRow'
import AddMedForm from './AddMedForm'
import PetEditor from './PetEditor'

interface Props {
  pet: Pet
  store: LocalStore
  autoExpandAdd?: boolean
}

export default function PetSection(props: Props) {
  const [mode, setMode] = createSignal<'view' | 'edit' | 'confirm'>('view')
  const [adding, setAdding] = createSignal(props.autoExpandAdd ?? false)
  const meds = () => props.store.medsForPet(props.pet.id)

  const confirmText = () => {
    const n = meds().length
    if (n === 0) return `Remove ${props.pet.name}?`
    return `Remove ${props.pet.name} and its ${n} medication${n === 1 ? '' : 's'}, including dose history?`
  }

  const savePet = (input: PetFormInput) => {
    props.store.updatePet(props.pet.id, petPatch(input))
    setMode('view')
  }

  return (
    <section class="pet-section">
      <Show when={mode() === 'view'}>
        <div class="pet-header">
          <span class="pet-title">
            {speciesEmoji(props.pet.species)} {props.pet.name}
            <Show when={props.pet.speciesDetail}>
              {' '}
              <span class="pet-detail">({props.pet.speciesDetail})</span>
            </Show>
          </span>
          <span class="pet-actions">
            <button type="button" class="med-delete" aria-label={`Edit ${props.pet.name}`} onClick={() => setMode('edit')}>
              ✎
            </button>
            <button type="button" class="med-delete" aria-label={`Remove ${props.pet.name}`} onClick={() => setMode('confirm')}>
              ✕
            </button>
          </span>
        </div>
      </Show>
      <Show when={mode() === 'edit'}>
        <PetEditor initial={props.pet} submitLabel="Save" onSave={savePet} onCancel={() => setMode('view')} />
      </Show>
      <Show when={mode() === 'confirm'}>
        <div class="med-confirm">
          <span>{confirmText()}</span>
          <button type="button" class="danger-btn" onClick={() => props.store.deletePet(props.pet.id)}>
            Remove
          </button>
          <button type="button" class="nav-btn" onClick={() => setMode('view')}>
            Cancel
          </button>
        </div>
      </Show>
      <For each={meds()}>{(med) => <MedRow med={med} store={props.store} />}</For>
      <Show
        when={adding()}
        fallback={
          <button type="button" class="nav-btn add-toggle" onClick={() => setAdding(true)}>
            + Add medication
          </button>
        }
      >
        <AddMedForm store={props.store} petId={props.pet.id} />
      </Show>
    </section>
  )
}
```

- [ ] **Step 4: Create `src/PetsView.tsx`**

```tsx
import { createSignal, For, Show } from 'solid-js'
import type { LocalStore } from './localStore'
import { buildPet, type PetFormInput } from './petForm'
import PetEditor from './PetEditor'
import PetSection from './PetSection'

export default function PetsView(props: { store: LocalStore; onBack(): void }) {
  const [addingPet, setAddingPet] = createSignal(false)
  // With zero pets the add-pet form is the whole screen.
  const showAddPet = () => addingPet() || props.store.pets().length === 0
  // Onboarding: a lone pet with no meds yet gets its med form pre-opened.
  const autoExpandAdd = () => props.store.pets().length === 1 && props.store.meds().length === 0

  const addPet = (input: PetFormInput) => {
    props.store.addPet(buildPet(input))
    setAddingPet(false)
  }

  return (
    <div class="meds-view">
      <header class="app-header">
        <h1>Pets & Meds</h1>
        <button type="button" class="nav-btn" onClick={() => props.onBack()}>
          Done
        </button>
      </header>
      <Show when={props.store.pets().length === 0}>
        <p class="med-notice">Add your pet to get started.</p>
      </Show>
      <For each={props.store.pets()}>
        {(pet) => <PetSection pet={pet} store={props.store} autoExpandAdd={autoExpandAdd()} />}
      </For>
      <Show
        when={showAddPet()}
        fallback={
          <button type="button" class="nav-btn add-toggle" onClick={() => setAddingPet(true)}>
            + Add pet
          </button>
        }
      >
        <div class="add-pet">
          <h3>Add a pet</h3>
          <PetEditor
            submitLabel="Add pet"
            onSave={addPet}
            onCancel={props.store.pets().length > 0 ? () => setAddingPet(false) : undefined}
          />
        </div>
      </Show>
    </div>
  )
}
```

(Note: `autoExpandAdd` seeds `PetSection`'s `adding` signal at mount — initial-value-only is intended; the section doesn't force the form open reactively.)

- [ ] **Step 5: Delete `src/MedsView.tsx` and rewire `src/App.tsx`**

```bash
rm src/MedsView.tsx
```

In `App.tsx`: replace the `MedsView` import with `import PetsView from './PetsView'`; the fallback becomes `<PetsView store={store} onBack={() => setScreen('calendar')} />`; the header button text changes from `Meds` to `Pets`.

- [ ] **Step 6: Add CSS to `src/App.css`** (append; follows existing conventions — `color-mix` borders, 0.75rem uppercase section heads)

```css
.pet-section {
  margin-top: 20px;
}

.pet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.pet-title {
  font-weight: 700;
  font-size: 1.05rem;
}

.pet-detail {
  font-weight: 400;
  opacity: 0.7;
}

.pet-actions {
  display: flex;
}

.add-toggle {
  margin-top: 8px;
}

.pet-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0;
}

.species-choices {
  display: flex;
  gap: 12px;
  min-height: 40px;
  align-items: center;
}

.species-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.add-pet {
  margin-top: 24px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}

.add-pet h3 {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 0 0 8px;
}
```

- [ ] **Step 7: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green — build confirms the placeholder `petId="pet-pending"` is gone with `MedsView.tsx` and nothing else referenced it.

- [ ] **Step 8: Manual smoke check (optional but recommended)**

Run `npm run dev`, open the URL, and confirm: add a pet → section appears; edit renames; add a med under the pet; delete pet shows the counted confirm and removes its meds.

- [ ] **Step 9: Commit**

```bash
git add -A src/
git commit -m "feat: combined Pets & Meds screen grouped by pet"
```

---

### Task 7: Calendar filter chips and pet tags

**Files:**
- Create: `src/PetChips.tsx`
- Modify: `src/App.tsx`, `src/MonthGrid.tsx`, `src/DayDetail.tsx`, `src/Supply.tsx`, `src/App.css`

**Interfaces:**
- Consumes: `Dose.petId` / `PillInventory.petId` (Task 4); `store.pets()` (Task 5); `speciesEmoji` (Task 3).
- Produces:
  - `PetChips` props `{ pets: Pet[]; selected: string; onSelect(id: string): void }` — `selected` is `'all'` or a pet id.
  - `MonthGrid` props gain `meds: MedDef[]`; `DayDetail` props become `{ date: string; meds: MedDef[]; store: LocalStore; petTag?: (petId: string) => string | undefined }`; `Supply` props become `{ meds: MedDef[]; store: LocalStore; petTag?: (petId: string) => string | undefined }`. None of the three call `store.meds()` anymore.

- [ ] **Step 1: Create `src/PetChips.tsx`**

```tsx
import { For } from 'solid-js'
import type { Pet } from './pets'
import { speciesEmoji } from './petForm'

interface Props {
  pets: Pet[]
  selected: string // 'all' or a pet id
  onSelect(id: string): void
}

export default function PetChips(props: Props) {
  return (
    <div class="pet-chips">
      <button
        type="button"
        class="chip"
        classList={{ active: props.selected === 'all' }}
        onClick={() => props.onSelect('all')}
      >
        All
      </button>
      <For each={props.pets}>
        {(pet) => (
          <button
            type="button"
            class="chip"
            classList={{ active: props.selected === pet.id }}
            onClick={() => props.onSelect(pet.id)}
          >
            {speciesEmoji(pet.species)} {pet.name}
          </button>
        )}
      </For>
    </div>
  )
}
```

- [ ] **Step 2: Add filter state to `src/App.tsx`**

Inside `App()` after the `screen` signal:

```tsx
// Session-only pet filter; falls back to 'all' if the filtered pet is deleted.
const [filter, setFilter] = createSignal<string>('all')
const activeFilter = () =>
  filter() === 'all' || store.pets().some((p) => p.id === filter()) ? filter() : 'all'
const visibleMeds = () =>
  activeFilter() === 'all' ? store.meds() : store.meds().filter((m) => m.petId === activeFilter())
// Pet-name tag for dose/supply rows — only in the All view with 2+ pets.
const petTag = (petId: string) =>
  activeFilter() === 'all' && store.pets().length > 1
    ? store.pets().find((p) => p.id === petId)?.name
    : undefined
```

Add the import `import PetChips from './PetChips'`. In the JSX, directly above `<MonthGrid ...>` (inside the meds-exist `Show`):

```tsx
<Show when={store.pets().length > 1}>
  <PetChips pets={store.pets()} selected={activeFilter()} onSelect={setFilter} />
</Show>
```

Update the three component usages:

```tsx
<MonthGrid ... meds={visibleMeds()} ... />
<DayDetail date={selected()} meds={visibleMeds()} store={store} petTag={petTag} />
<Supply meds={visibleMeds()} store={store} petTag={petTag} />
```

(`MonthGrid` keeps all its existing props; only `meds` is added.)

- [ ] **Step 3: Update `src/MonthGrid.tsx`**

Add `meds: MedDef[]` to `Props` (import `type MedDef` from `./schedule`). Change the dots loop from `dosesForDay(props.store.meds(), date())` to `dosesForDay(props.meds, date())`.

- [ ] **Step 4: Update `src/DayDetail.tsx`**

```tsx
import { For, Show } from 'solid-js'
import { dosesForDay, type Dose, type MedDef } from './schedule'
import { formatDateLong } from './dates'
import type { LocalStore } from './localStore'

interface SlotProps {
  label: string
  doses: Dose[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}

function SlotSection(props: SlotProps) {
  return (
    <Show when={props.doses.length > 0}>
      <section class="slot-section">
        <h3>{props.label}</h3>
        <For each={props.doses}>
          {(dose) => {
            const tag = () => props.petTag?.(dose.petId)
            return (
              <label class="dose-row">
                <input
                  type="checkbox"
                  checked={props.store.isChecked(dose.id)}
                  onChange={() => props.store.toggle(dose.id)}
                />
                <Show when={tag()}>
                  <span class="pet-tag">{tag()}</span>
                </Show>
                <span class="dose-name">{dose.medName}</span>
                <span class="dose-text">{dose.doseText}</span>
              </label>
            )
          }}
        </For>
      </section>
    </Show>
  )
}

export default function DayDetail(props: {
  date: string
  meds: MedDef[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}) {
  const doses = () => dosesForDay(props.meds, props.date)
  return (
    <div class="day-detail">
      <h2>{formatDateLong(props.date)}</h2>
      <Show when={doses().length === 0}>
        <p class="no-doses">No doses this day.</p>
      </Show>
      <SlotSection label="AM" doses={doses().filter((d) => d.slot === 'am')} store={props.store} petTag={props.petTag} />
      <SlotSection label="PM" doses={doses().filter((d) => d.slot === 'pm')} store={props.store} petTag={props.petTag} />
    </div>
  )
}
```

- [ ] **Step 5: Update `src/Supply.tsx`**

```tsx
import { For, Show } from 'solid-js'
import { pillInventories, type MedDef } from './schedule'
import type { LocalStore } from './localStore'

export default function Supply(props: {
  meds: MedDef[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}) {
  const rows = () =>
    pillInventories(props.meds).map((inv) => {
      const taken = inv.doseIds.filter((id) => props.store.isChecked(id)).length
      return {
        medId: inv.medId,
        petId: inv.petId,
        medName: inv.medName,
        unitLabel: inv.unitLabel,
        total: inv.totalUnits,
        left: inv.totalUnits - taken * inv.unitsPerDose,
      }
    })

  return (
    <section class="supply">
      <h3>Pills remaining</h3>
      <For each={rows()}>
        {(row) => {
          const tag = () => props.petTag?.(row.petId)
          return (
            <div class="supply-row">
              <span>
                <Show when={tag()}>
                  <span class="pet-tag">{tag()} </span>
                </Show>
                <span class="dose-name">{row.medName}</span>
              </span>
              <span class="supply-count" classList={{ done: row.left === 0 }}>
                {row.left} of {row.total} {row.unitLabel}
              </span>
            </div>
          )
        }}
      </For>
    </section>
  )
}
```

- [ ] **Step 6: Add CSS to `src/App.css`**

```css
.pet-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chip {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  background: none;
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.chip.active {
  border-color: #4a7dff;
  background: color-mix(in srgb, #4a7dff 15%, transparent);
}

.pet-tag {
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 7: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 8: Manual smoke check (optional but recommended)**

`npm run dev`: with two pets and meds on each — chips appear; All shows tags on dose and supply rows; selecting a pet hides tags and filters dots, doses, and supply; deleting the filtered pet from the Pets screen returns the calendar to All.

- [ ] **Step 9: Commit**

```bash
git add src/PetChips.tsx src/App.tsx src/MonthGrid.tsx src/DayDetail.tsx src/Supply.tsx src/App.css
git commit -m "feat: per-pet calendar filter chips and pet tags"
```

---

### Task 8: Onboarding empty states

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `store.pets()` (Task 5); `PetsView` auto-expand behavior (Task 6 — zero pets shows the add-pet form; a lone pet with no meds gets its med form pre-opened).
- Produces: nothing new — final UI wiring.

- [ ] **Step 1: Branch the empty state in `src/App.tsx`**

Replace the current `fallback` empty-state `<div class="empty-state">...</div>` with:

```tsx
<div class="empty-state">
  <h2>Track your pet's medications</h2>
  <p>
    A calendar of every dose, morning and evening, that remembers
    what you've given. Your data stays on this device.
  </p>
  <Show
    when={store.pets().length > 0}
    fallback={
      <button type="button" class="today-btn" onClick={() => setScreen('meds')}>
        Add your pet
      </button>
    }
  >
    <button type="button" class="today-btn" onClick={() => setScreen('meds')}>
      Add a medication for {store.pets()[0].name}
    </button>
  </Show>
</div>
```

(The `screen` signal keeps its `'calendar' | 'meds'` values; only copy changes.)

- [ ] **Step 2: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 3: Manual smoke check (optional but recommended)**

`npm run dev` with cleared localStorage (DevTools → Application → Local Storage → clear): calendar shows "Add your pet" → opens Pets & Meds with the pet form; after adding a pet, calendar shows "Add a medication for <name>" → opens the screen with that pet's med form pre-opened; after adding a med, the calendar renders.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: two-stage onboarding — add pet, then add its first med"
```

---

### Task 9: Final verification and project-memory update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a green branch ready for review/merge and an accurate project memory.

- [ ] **Step 1: Full verification**

Run: `npm test && npm run build`
Expected: all tests pass (74+ — 62 originals minus none, with ~15 added/moved across Tasks 1–5), build green. Confirm no stray references:

```bash
grep -rn "MedsView\|loadMedList\|pet-pending" src/ && echo "STALE REFERENCES FOUND" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 2: Update `CLAUDE.md`**

In **State as of 2026-07-28**, replace the first bullet's feature list sentence with:

```
- Built and green: schedule engine (`schedule.ts`, parameterized over
  `MedDef[]`, no bundled data; meds carry a required `petId`), phase
  builder (`builder.ts`), summaries, med + pet form helpers, local store
  (`localStore.ts` — pets, meds, checks in localStorage under
  `petdoses:*` keys, corrupt-value backup, cascade deletes), calendar UI
  with per-pet filter chips, combined Pets & Meds screen, two-stage
  onboarding (add pet → add med), disclaimer footer. CI runs test +
  build only — **the site is not deployed anywhere yet.**
```

In **Next: finish Phase 1**, remove roadmap item 1 (Pets layer) and renumber the remaining items (export/import becomes 1, privacy note 2, hosting cutover 3), and add a line under the intro:

```
Done so far: pets layer (spec `docs/superpowers/specs/2026-07-28-pets-layer-design.md`).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record pets layer completion in project memory"
```

- [ ] **Step 4: Finish the branch**

Use the superpowers:finishing-a-development-branch skill to merge `feat/pets-layer` into `main` (or open a PR, per the operator's preference at the time).
