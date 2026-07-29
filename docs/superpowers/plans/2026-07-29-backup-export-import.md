# Backup Export/Import + Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export pets, meds, and check history to a versioned JSON file and restore from it, inside a new Settings screen that also carries the privacy note — per `docs/superpowers/specs/2026-07-29-backup-export-import-design.md`.

**Architecture:** A pure `backup.ts` module owns the file format (serialize, parse-with-validation, filename); the store gains a `checks()` accessor and an all-or-nothing `replaceAll`; a new `SettingsView` component wires both to a download link and a file picker with a counted replace confirmation. `App` grows a third screen behind a ⚙ header button.

**Tech Stack:** SolidJS + TypeScript + Vite; Vitest (node environment, pure modules only — components are never unit-tested).

## Global Constraints

- No new runtime dependencies — `solid-js` only.
- No real medication data anywhere; fixtures stay generic.
- Free tier is local-only: no accounts, no server, no network calls.
- Vitest runs with `environment: 'node'` (set in `vite.config.ts`) — never remove it; components (.tsx) are not unit-tested, pure `.ts` modules are.
- Import is **all-or-nothing**: a failed parse changes no state; state changes only after the user confirms the replace.
- Error messages shown verbatim to users (from the spec): `"Not a valid backup file"`, `"Unsupported backup version"`, `"Backup file is damaged"`.
- Backup filename: `petdoses-backup-YYYY-MM-DD.json` (export date, local time).
- Test command: `npm test` (all) or `npx vitest run src/<file>.test.ts` (one file). Full verification: `npm test && npm run build` — `npm run build` runs `tsc -b` and is the ONLY thing that catches type errors in `.tsx` files (vitest does not typecheck).
- Commit after every task; work in place on a feature branch off `main` (create `feat/backup-export-import` in Task 1) — the operator prefers in-place branches over worktrees.

---

### Task 1: `backup.ts` — format, validation, filename

**Files:**
- Create: `src/backup.ts`, `src/backup.test.ts`

**Interfaces:**
- Consumes: `Pet` from `./pets`, `MedDef` from `./schedule`, `Checks` from `./storage` (types only).
- Produces (relied on by Tasks 2–3):

```ts
export const BACKUP_VERSION = 1

export interface BackupData {
  pets: Pet[]
  meds: MedDef[]
  checks: Checks
}

// exportedAt: date shown in the restore confirmation (spec refinement:
// parseBackup surfaces it so the UI needn't re-parse the file).
export interface ParsedBackup extends BackupData {
  exportedAt?: string // YYYY-MM-DD
}

export function serializeBackup(data: BackupData, exportedAt: string): string
export function parseBackup(text: string): ParsedBackup // throws Error on any problem
export function backupFilename(dateStr: string): string // dateStr is YYYY-MM-DD
```

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/backup-export-import
```

- [ ] **Step 2: Write the failing test**

Create `src/backup.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup, backupFilename, BACKUP_VERSION } from './backup'
import type { BackupData } from './backup'

const DATA: BackupData = {
  pets: [{ id: 'test-dog', name: 'Test Dog', species: 'dog' }],
  meds: [
    {
      id: 'daily-med',
      petId: 'test-dog',
      name: 'Daily Med',
      doseText: '4 tablets by mouth',
      phases: [{ start: '2026-07-23', startSlot: 'am', intervalSlots: 2, count: 21 }],
    },
  ],
  checks: { 'daily-med:2026-07-23:am': '2026-07-23T14:00:00.000Z' },
}

describe('serializeBackup / parseBackup round-trip', () => {
  it('preserves pets, meds, and checks, and surfaces the export date', () => {
    const text = serializeBackup(DATA, '2026-07-29T18:00:00.000Z')
    const parsed = parseBackup(text)
    expect(parsed.pets).toEqual(DATA.pets)
    expect(parsed.meds).toEqual(DATA.meds)
    expect(parsed.checks).toEqual(DATA.checks)
    expect(parsed.exportedAt).toBe('2026-07-29')
  })
  it('writes the envelope fields', () => {
    const raw = JSON.parse(serializeBackup(DATA, '2026-07-29T18:00:00.000Z'))
    expect(raw.app).toBe('petdoses')
    expect(raw.version).toBe(BACKUP_VERSION)
    expect(raw.exportedAt).toBe('2026-07-29T18:00:00.000Z')
  })
  it('keeps unknown extra fields on items (forward compatibility)', () => {
    const text = serializeBackup(DATA, '2026-07-29T18:00:00.000Z')
    const raw = JSON.parse(text)
    raw.pets[0].futureField = 'kept'
    raw.meds[0].futureField = 7
    const parsed = parseBackup(JSON.stringify(raw))
    expect((parsed.pets[0] as Record<string, unknown>).futureField).toBe('kept')
    expect((parsed.meds[0] as Record<string, unknown>).futureField).toBe(7)
  })
  it('round-trips empty collections', () => {
    const empty: BackupData = { pets: [], meds: [], checks: {} }
    const parsed = parseBackup(serializeBackup(empty, '2026-07-29T18:00:00.000Z'))
    expect(parsed).toMatchObject({ pets: [], meds: [], checks: {} })
  })
  it('omits exportedAt when missing or malformed, without failing', () => {
    const raw = JSON.parse(serializeBackup(DATA, '2026-07-29T18:00:00.000Z'))
    delete raw.exportedAt
    expect(parseBackup(JSON.stringify(raw)).exportedAt).toBeUndefined()
    raw.exportedAt = 'garbage'
    expect(parseBackup(JSON.stringify(raw)).exportedAt).toBeUndefined()
  })
})

describe('parseBackup rejection', () => {
  const valid = () => JSON.parse(serializeBackup(DATA, '2026-07-29T18:00:00.000Z'))

  it.each([
    ['not JSON at all', 'not json{{{'],
    ['a JSON string', '"hello"'],
    ['a JSON array', '[1,2,3]'],
    ['JSON null', 'null'],
  ])('rejects %s as not a valid backup file', (_label, text) => {
    expect(() => parseBackup(text)).toThrow('Not a valid backup file')
  })

  it('rejects a wrong app marker', () => {
    const raw = valid()
    raw.app = 'dogscheduler'
    expect(() => parseBackup(JSON.stringify(raw))).toThrow('Unsupported backup version')
  })
  it('rejects an unknown version', () => {
    const raw = valid()
    raw.version = 2
    expect(() => parseBackup(JSON.stringify(raw))).toThrow('Unsupported backup version')
  })

  it.each([
    ['pets is not an array', (r: any) => (r.pets = {})],
    ['meds is not an array', (r: any) => (r.meds = 'nope')],
    ['checks is an array', (r: any) => (r.checks = [])],
    ['checks is null', (r: any) => (r.checks = null)],
    ['a pet misses id', (r: any) => delete r.pets[0].id],
    ['a pet misses species', (r: any) => delete r.pets[0].species],
    ['a pet is not an object', (r: any) => (r.pets = ['rex'])],
    ['a med misses petId', (r: any) => delete r.meds[0].petId],
    ['a med misses doseText', (r: any) => delete r.meds[0].doseText],
    ['a med name is not a string', (r: any) => (r.meds[0].name = 3)],
    ['a check value is not a string', (r: any) => (r.checks['daily-med:2026-07-23:am'] = 5)],
  ])('rejects damaged shape: %s', (_label, mutate) => {
    const raw = valid()
    mutate(raw)
    expect(() => parseBackup(JSON.stringify(raw))).toThrow('Backup file is damaged')
  })
})

describe('backupFilename', () => {
  it('embeds the date', () => {
    expect(backupFilename('2026-07-29')).toBe('petdoses-backup-2026-07-29.json')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/backup.test.ts`
Expected: FAIL — cannot resolve `./backup`.

- [ ] **Step 4: Create `src/backup.ts`**

```ts
import type { Pet } from './pets'
import type { MedDef } from './schedule'
import type { Checks } from './storage'

export const BACKUP_VERSION = 1

export interface BackupData {
  pets: Pet[]
  meds: MedDef[]
  checks: Checks
}

// exportedAt: date shown in the restore confirmation (parseBackup surfaces
// it so the UI needn't re-parse the file).
export interface ParsedBackup extends BackupData {
  exportedAt?: string // YYYY-MM-DD
}

export function serializeBackup(data: BackupData, exportedAt: string): string {
  return JSON.stringify(
    {
      app: 'petdoses',
      version: BACKUP_VERSION,
      exportedAt,
      pets: data.pets,
      meds: data.meds,
      checks: data.checks,
    },
    null,
    2,
  )
}

export function backupFilename(dateStr: string): string {
  return `petdoses-backup-${dateStr}.json`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasStringFields(v: unknown, fields: string[]): boolean {
  return isRecord(v) && fields.every((f) => typeof v[f] === 'string')
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Not a valid backup file')
  }
  if (!isRecord(raw)) throw new Error('Not a valid backup file')

  if (raw.app !== 'petdoses' || raw.version !== BACKUP_VERSION) {
    throw new Error('Unsupported backup version')
  }

  const { pets, meds, checks } = raw
  const shapeOk =
    Array.isArray(pets) &&
    pets.every((p) => hasStringFields(p, ['id', 'name', 'species'])) &&
    Array.isArray(meds) &&
    meds.every((m) => hasStringFields(m, ['id', 'petId', 'name', 'doseText'])) &&
    isRecord(checks) &&
    Object.values(checks).every((v) => typeof v === 'string')
  if (!shapeOk) throw new Error('Backup file is damaged')

  const result: ParsedBackup = {
    pets: pets as Pet[],
    meds: meds as MedDef[],
    checks: checks as Checks,
  }
  if (typeof raw.exportedAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw.exportedAt)) {
    result.exportedAt = raw.exportedAt.slice(0, 10)
  }
  return result
}
```

- [ ] **Step 5: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/backup.ts src/backup.test.ts
git commit -m "feat: backup file format — serialize, validate, parse"
```

---

### Task 2: Store `checks()` accessor and `replaceAll`

The spec says "no other store changes" beyond `replaceAll`, but export needs the full checks map — a gap found while planning. Add a read accessor `checks()` in the same style as `pets()`/`meds()` (spec refinement, noted here deliberately).

**Files:**
- Modify: `src/localStore.ts`
- Test: `src/localStore.test.ts`

**Interfaces:**
- Consumes: `BackupData` from `./backup` (Task 1); existing `persistPets`/`persistMeds`/`persistChecks` internals.
- Produces — `LocalStore` gains exactly:

```ts
checks(): Checks                    // the full doseId -> ISO timestamp map
replaceAll(data: BackupData): void  // set + persist pets, meds, and checks
```

- [ ] **Step 1: Write the failing tests**

In `src/localStore.test.ts`, add a new describe at the end of the file:

```ts
describe('backup restore', () => {
  it('checks() exposes the full map', () => {
    const store = createLocalStore(fakeStorage())
    expect(store.checks()).toEqual({})
    store.toggle(ID)
    expect(Object.keys(store.checks())).toEqual([ID])
  })
  it('replaceAll swaps all three collections and persists them', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    store.addPet(DOG)
    store.addMed(MED)
    store.toggle(ID)
    store.replaceAll({
      pets: [CAT],
      meds: [CAT_MED],
      checks: { [CAT_ID]: '2026-07-24T14:00:00.000Z' },
    })
    expect(store.pets()).toEqual([CAT])
    expect(store.meds()).toEqual([CAT_MED])
    expect(store.isChecked(ID)).toBe(false)
    expect(store.isChecked(CAT_ID)).toBe(true)
    // persisted: a fresh store over the same storage sees the new data
    const fresh = createLocalStore(s)
    expect(fresh.pets()).toEqual([CAT])
    expect(fresh.meds()).toEqual([CAT_MED])
    expect(fresh.isChecked(CAT_ID)).toBe(true)
  })
  it('replaceAll with empty collections empties the store', () => {
    const store = createLocalStore(fakeStorage())
    store.addPet(DOG)
    store.addMed(MED)
    store.toggle(ID)
    store.replaceAll({ pets: [], meds: [], checks: {} })
    expect(store.pets()).toEqual([])
    expect(store.meds()).toEqual([])
    expect(store.checks()).toEqual({})
  })
})
```

(`DOG`, `CAT`, `MED`, `CAT_MED`, `ID`, `CAT_ID`, and `fakeStorage` already exist in this file from the pets-layer work.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/localStore.test.ts`
Expected: FAIL — `checks`/`replaceAll` are not functions.

- [ ] **Step 3: Implement in `src/localStore.ts`**

Add the import:

```ts
import type { BackupData } from './backup'
```

Extend the `LocalStore` interface (after `toggle`):

```ts
checks(): Checks
```

and (after `medsForPet`):

```ts
replaceAll(data: BackupData): void
```

In the returned object, add alongside `isChecked`/`toggle`:

```ts
checks,
```

and at the end:

```ts
replaceAll: (data) => {
  persistPets(data.pets)
  persistMeds(data.meds)
  persistChecks(data.checks)
},
```

- [ ] **Step 4: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/localStore.ts src/localStore.test.ts
git commit -m "feat: store checks accessor and all-or-nothing replaceAll"
```

---

### Task 3: Settings screen with backup and privacy sections

Components are not unit-tested; `npm run build` is the type gate, plus a manual smoke check.

**Files:**
- Create: `src/SettingsView.tsx`
- Modify: `src/App.tsx`, `src/App.css`

**Interfaces:**
- Consumes: `serializeBackup`/`parseBackup`/`backupFilename`/`ParsedBackup` (Task 1); `store.checks()`/`store.replaceAll()` (Task 2); `todayStr` from `./dates`.
- Produces: `SettingsView` props `{ store: LocalStore; onBack(): void }`; `App`'s `screen` signal becomes `'calendar' | 'meds' | 'settings'`.

- [ ] **Step 1: Create `src/SettingsView.tsx`**

```tsx
import { createSignal, Show } from 'solid-js'
import type { LocalStore } from './localStore'
import { serializeBackup, parseBackup, backupFilename, type ParsedBackup } from './backup'
import { todayStr } from './dates'

function summary(pets: number, meds: number, checks: number): string {
  const s = (n: number) => (n === 1 ? '' : 's')
  return `${pets} pet${s(pets)}, ${meds} med${s(meds)}, ${checks} check-off${s(checks)}`
}

export default function SettingsView(props: { store: LocalStore; onBack(): void }) {
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal('')
  const [pending, setPending] = createSignal<ParsedBackup | null>(null)
  let fileInput!: HTMLInputElement

  const download = () => {
    setStatus('')
    setError('')
    setPending(null)
    const text = serializeBackup(
      { pets: props.store.pets(), meds: props.store.meds(), checks: props.store.checks() },
      new Date().toISOString(),
    )
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename(todayStr())
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup downloaded.')
  }

  const onFile = async (input: HTMLInputElement) => {
    setStatus('')
    setError('')
    const file = input.files?.[0]
    if (!file) return
    try {
      // A second pick replaces any pending restore.
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setPending(null)
      setError(e instanceof Error ? e.message : 'Not a valid backup file')
    }
    input.value = '' // allow re-picking the same file
  }

  const restore = (backup: ParsedBackup) => {
    props.store.replaceAll(backup)
    setPending(null)
    setStatus('Backup restored.')
  }

  return (
    <div class="settings-view">
      <header class="app-header">
        <h1>Settings</h1>
        <button type="button" class="nav-btn" onClick={() => props.onBack()}>
          Done
        </button>
      </header>

      <section class="settings-section">
        <h3>Backup</h3>
        <p class="settings-copy">
          Your data lives only on this device. Download a backup file and keep
          it somewhere safe — it's the only copy.
        </p>
        <div class="backup-actions">
          <button type="button" class="today-btn" onClick={download}>
            Download backup
          </button>
          <button type="button" class="nav-btn" onClick={() => fileInput.click()}>
            Restore from backup…
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            class="file-hidden"
            onChange={(e) => void onFile(e.currentTarget)}
          />
        </div>
        <Show when={pending()}>
          {(backup) => (
            <div class="med-confirm">
              <span>
                Replace current data (
                {summary(
                  props.store.pets().length,
                  props.store.meds().length,
                  Object.keys(props.store.checks()).length,
                )}
                ) with backup{backup().exportedAt ? ` from ${backup().exportedAt}` : ''} (
                {summary(
                  backup().pets.length,
                  backup().meds.length,
                  Object.keys(backup().checks).length,
                )}
                )?
              </span>
              <button type="button" class="danger-btn" onClick={() => restore(backup())}>
                Replace
              </button>
              <button type="button" class="nav-btn" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          )}
        </Show>
        <Show when={error()}>
          <p class="med-error">{error()}</p>
        </Show>
        <Show when={status()}>
          <p class="med-saved">{status()}</p>
        </Show>
      </section>

      <section class="settings-section">
        <h3>About & privacy</h3>
        <p class="settings-copy">
          PetDoses stores everything — pets, medications, and check-off history
          — in this browser on this device. Nothing is sent to a server; there
          are no accounts and no tracking. Clearing this site's browser data
          erases it, so keep a backup. PetDoses records what you've given — it
          is not veterinary advice; always follow your vet's instructions.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Rewire `src/App.tsx` for three screens**

Change the solid-js import to include `Switch` and `Match`:

```ts
import { createSignal, Show, Switch, Match } from 'solid-js'
```

Add the component import:

```ts
import SettingsView from './SettingsView'
```

Widen the screen signal:

```ts
const [screen, setScreen] = createSignal<'calendar' | 'meds' | 'settings'>('calendar')
```

Replace the outer `<Show when={screen() === 'calendar'} fallback={<PetsView ... />}>` / matching `</Show>` pair with `Switch`/`Match` — the calendar JSX between them stays byte-identical:

```tsx
<Switch>
  <Match when={screen() === 'meds'}>
    <PetsView store={store} onBack={() => setScreen('calendar')} />
  </Match>
  <Match when={screen() === 'settings'}>
    <SettingsView store={store} onBack={() => setScreen('calendar')} />
  </Match>
  <Match when={screen() === 'calendar'}>
    {/* existing calendar JSX, unchanged */}
  </Match>
</Switch>
```

In the calendar header, wrap the buttons in an actions span and add the gear:

```tsx
<header class="app-header">
  <h1>PetDoses</h1>
  <span class="header-actions">
    <button type="button" class="nav-btn" onClick={() => setScreen('meds')}>
      Pets
    </button>
    <button type="button" class="nav-btn" aria-label="Settings" onClick={() => setScreen('settings')}>
      ⚙
    </button>
  </span>
</header>
```

- [ ] **Step 3: Add CSS to `src/App.css`** (append)

```css
.header-actions {
  display: flex;
  gap: 8px;
}

.settings-section {
  margin-top: 24px;
}

.settings-section h3 {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 0 0 6px;
}

.settings-copy {
  opacity: 0.7;
  font-size: 0.9rem;
  margin: 0 0 10px;
  max-width: 44ch;
}

.backup-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.backup-actions .today-btn,
.backup-actions .nav-btn {
  padding: 0 12px;
}

.file-hidden {
  display: none;
}
```

- [ ] **Step 4: Verify everything passes**

Run: `npm test && npm run build`
Expected: all green (build typechecks the new .tsx).

- [ ] **Step 5: Manual smoke check (optional but recommended)**

`npm run dev`: ⚙ opens Settings; Download produces `petdoses-backup-<today>.json` with the expected JSON; picking that file shows the counted confirmation (both sides + date); Replace swaps the data and the calendar reflects it; Cancel changes nothing; picking a non-JSON file shows "Not a valid backup file"; restore on a cleared browser (0 pets, 0 meds current side) works.

- [ ] **Step 6: Commit**

```bash
git add src/SettingsView.tsx src/App.tsx src/App.css
git commit -m "feat: settings screen with backup export/import and privacy note"
```

---

### Task 4: Final verification and project-memory update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a green branch ready to merge and an accurate project memory.

- [ ] **Step 1: Full verification**

Run: `npm test && npm run build`
Expected: all tests pass (Task 1 adds ~25, Task 2 adds 3 to the current 83), build green.

- [ ] **Step 2: Update `CLAUDE.md`**

In **State as of 2026-07-28**: retitle the section to **State as of 2026-07-29** and extend the first bullet's feature list — after "two-stage onboarding (add pet → add med)," insert "settings screen with backup export/import (versioned JSON, replace-all restore) and privacy note," (before "disclaimer footer").

In **Next: finish Phase 1**: update the "Done so far" line to:

```
Done so far: pets layer (spec
`docs/superpowers/specs/2026-07-28-pets-layer-design.md`); backup
export/import + settings + privacy note (spec
`docs/superpowers/specs/2026-07-29-backup-export-import-design.md`).
```

Replace the numbered list (items 1–3) with just:

```
1. **Hosting cutover**: host decided (Cloudflare); set up the project,
   DNS records, go live at petdoses.com. Gate: the domain must be live
   before any external user (browser-local data binds to the origin).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record backup/settings completion in project memory"
```

- [ ] **Step 4: Finish the branch**

Use the superpowers:finishing-a-development-branch skill (verify tests, then merge `feat/backup-export-import` to `main` or open a PR, per the operator's choice).
