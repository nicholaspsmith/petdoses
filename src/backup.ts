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
