import { createSignal } from 'solid-js'
import {
  loadChecks,
  saveChecks,
  loadList,
  saveList,
  MEDS_KEY,
  type Checks,
  type StorageLike,
} from './storage'
import type { MedDef } from './schedule'

// Local-first store: all state lives in browser storage on this device.
// No accounts, no network — the free tier by design.
export interface LocalStore {
  isChecked(doseId: string): boolean
  toggle(doseId: string): void
  meds(): MedDef[]
  addMed(med: MedDef): void
  deleteMed(medId: string): void
}

export function createLocalStore(storage: StorageLike | null): LocalStore {
  const [checks, setChecks] = createSignal<Checks>(loadChecks(storage))
  const [meds, setMeds] = createSignal<MedDef[]>(loadList<MedDef>(storage, MEDS_KEY))

  function persistChecks(next: Checks): void {
    setChecks(next)
    saveChecks(storage, next)
  }

  function persistMeds(next: MedDef[]): void {
    setMeds(next)
    saveList(storage, MEDS_KEY, next)
  }

  return {
    isChecked: (doseId) => checks()[doseId] !== undefined,
    toggle: (doseId) => {
      const next = { ...checks() }
      if (next[doseId] !== undefined) delete next[doseId]
      else next[doseId] = new Date().toISOString()
      persistChecks(next)
    },
    meds,
    addMed: (med) => {
      if (meds().some((m) => m.id === med.id)) return
      persistMeds([...meds(), med])
    },
    deleteMed: (medId) => {
      persistMeds(meds().filter((m) => m.id !== medId))
    },
  }
}
