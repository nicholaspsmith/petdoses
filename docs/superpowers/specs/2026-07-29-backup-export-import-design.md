# Backup Export/Import + Settings Screen Design

**Date:** 2026-07-29
**Status:** Approved
**Parent:** `2026-07-25-product-strategy.md` (Phase 1 — Genericize)

The free tier's durability story: export pets, meds, and check history to
a file and restore from it. Ships inside a new Settings screen, which also
absorbs roadmap item 2 (the privacy note).

## Decisions made during brainstorming

- **Import replaces everything.** Restore semantics: current pets, meds,
  and checks are wiped and replaced by the backup's contents, behind a
  confirmation that shows both sides' counts. No merge mode.
- **UI lives in a new Settings screen** (⚙ in the calendar header), not
  on the Pets & Meds screen — it becomes the future home for the sync
  door and other settings.
- **The privacy note ("your data stays on your device") ships now** as a
  static About & Privacy section of Settings, collapsing roadmap item 2
  into this build.
- **Format: versioned domain snapshot** (chosen over a raw
  localStorage-key dump) — the file's shape is the domain model, with a
  version field for future migrations.

## Backup file format

Filename: `petdoses-backup-YYYY-MM-DD.json` (export date, local time).

```json
{
  "app": "petdoses",
  "version": 1,
  "exportedAt": "2026-07-29T18:00:00.000Z",
  "pets":   [ { "id": "rex-7f3k", "name": "Rex", "species": "dog" } ],
  "meds":   [ { "id": "amoxi-1a2b", "petId": "rex-7f3k", "name": "Amoxicillin",
                "doseText": "1 tablets by mouth",
                "phases": [ { "start": "2026-07-29", "startSlot": "am",
                              "intervalSlots": 1, "count": 14 } ] } ],
  "checks": { "amoxi-1a2b:2026-07-29:am": "2026-07-29T14:03:00.000Z" }
}
```

## `src/backup.ts` (pure module)

```ts
export const BACKUP_VERSION = 1

export interface BackupData {
  pets: Pet[]
  meds: MedDef[]
  checks: Checks
}

export function serializeBackup(data: BackupData, exportedAt: string): string
export function parseBackup(text: string): BackupData // throws on any problem
export function backupFilename(dateStr: string): string
```

`parseBackup` validation, in order, each failure throwing an `Error`
whose message is shown to the user verbatim:

1. Text parses as JSON and is an object → else `"Not a valid backup
   file"`.
2. `app === 'petdoses'` and `version === 1` → else `"Unsupported backup
   version"`.
3. Shape: `pets` and `meds` are arrays whose items are objects with
   their required string fields (`id`/`name`/`species` for pets;
   `id`/`petId`/`name`/`doseText` for meds); `checks` is a non-array
   object whose values are strings → else `"Backup file is damaged"`.

Items are passed through after the required-field check — unknown extra
fields survive a round-trip (forward compatibility). Import is
all-or-nothing: a failed parse changes no state.

## Store

`LocalStore` gains one method:

```ts
replaceAll(data: BackupData): void // set + persist pets, meds, and checks
```

No other store changes.

## Settings screen

- `App`'s `screen` signal gains `'settings'`; the calendar header becomes
  `[Pets] [⚙]` (gear uses the existing `nav-btn` style). Settings has the
  standard header ("Settings" + Done button back to the calendar).
- New component `src/SettingsView.tsx` with two sections.

### Backup section

Copy: "Your data lives only on this device. Download a backup file and
keep it somewhere safe — it's the only copy."

- **Download backup**: builds the file via `serializeBackup` +
  `backupFilename`, triggers a download (Blob → object URL → click on an
  `<a download>` → revoke). Shows "Backup downloaded." on success.
- **Restore from backup…**: `<input type="file"
  accept="application/json,.json">` → `file.text()` → `parseBackup`.
  - Invalid file: inline error (existing `med-error` style); nothing
    changes.
  - Valid file: inline confirmation **before any state changes**, showing
    both sides: "Replace current data (2 pets, 5 meds, 213 check-offs)
    with backup from 2026-07-29 (2 pets, 6 meds, 187 check-offs)?" with
    Replace (danger style) / Cancel. Replace calls `store.replaceAll`
    and shows "Backup restored." The confirmation always appears, even
    on an empty device — the new-phone restore path is the same flow
    with "0 pets, 0 meds" on the current side.

The date in the confirmation comes from the file's `exportedAt`
(date part); if absent or unparsable it is omitted, not an error.

### About & privacy section

Static copy: "PetDoses stores everything — pets, medications, and
check-off history — in this browser on this device. Nothing is sent to a
server; there are no accounts and no tracking. Clearing this site's
browser data erases it, so keep a backup. PetDoses records what you've
given — it is not veterinary advice; always follow your vet's
instructions."

## Edge cases

- Restore updates the calendar reactively; the existing pet-filter guard
  resets a now-nonexistent filtered pet to All. No extra wiring.
- Export with zero data produces a valid (empty-collections) backup.
- Picking a second file while a confirmation is pending replaces the
  pending restore with the new file's.
- Checks whose meds are absent from the backup are restored verbatim
  (harmless, invisible) — the parser does not cross-validate ids.

## Testing

Node environment, pure modules only (project pattern; components
untested):

- **backup.test.ts**: serialize/parse round-trip preserves pets, meds,
  checks, and unknown extra fields; filename format; rejections — not
  JSON, JSON non-object, wrong `app`, wrong `version`, missing required
  fields, non-array `pets`/`meds`, array or non-object `checks`,
  non-string check values — each with its message.
- **localStore.test.ts**: `replaceAll` swaps all three collections and
  persists them (a fresh store over the same storage sees the new data);
  replacing with empty collections empties the store.

## Out of scope

Merge-on-import, encrypted or compressed backups, automatic/scheduled
backups, sync (later premium phase), hosting cutover (next roadmap item).
