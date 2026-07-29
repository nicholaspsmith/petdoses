export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const CHECKS_KEY = 'petdoses:checks:v1'
export const MEDS_KEY = 'petdoses:meds:v1'
export const PETS_KEY = 'petdoses:pets:v1'

// doseId -> ISO timestamp of when the user checked it off.
export type Checks = Record<string, string>

function loadJson(storage: StorageLike | null, key: string): unknown {
  if (!storage) return undefined
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return undefined
  }
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    // Medical history: back up the unreadable value instead of discarding it.
    try {
      storage.setItem(`${key}:corrupt`, raw)
      storage.setItem(key, 'null')
    } catch {
      // storage failed mid-recovery; in-memory state is all we can do
    }
    return undefined
  }
}

function saveJson(storage: StorageLike | null, key: string, value: unknown): void {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // quota/denied: session continues in memory
  }
}

export function loadChecks(storage: StorageLike | null): Checks {
  const parsed = loadJson(storage, CHECKS_KEY)
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Checks
  }
  return {}
}

export function saveChecks(storage: StorageLike | null, checks: Checks): void {
  saveJson(storage, CHECKS_KEY, checks)
}

export function loadList<T>(storage: StorageLike | null, key: string): T[] {
  const parsed = loadJson(storage, key)
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

export function saveList<T>(storage: StorageLike | null, key: string, items: T[]): void {
  saveJson(storage, key, items)
}

export function getLocalStorage(): StorageLike | null {
  try {
    const s = window.localStorage
    s.getItem(CHECKS_KEY) // some private modes throw on first access
    return s
  } catch {
    return null
  }
}
