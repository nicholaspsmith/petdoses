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
    expect((parsed.pets[0] as unknown as Record<string, unknown>).futureField).toBe('kept')
    expect((parsed.meds[0] as unknown as Record<string, unknown>).futureField).toBe(7)
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
