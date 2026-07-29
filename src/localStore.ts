import { createSignal } from 'solid-js'
import {
  loadChecks,
  saveChecks,
  loadList,
  saveList,
  MEDS_KEY,
  PETS_KEY,
  type Checks,
  type StorageLike,
} from './storage'
import type { MedDef } from './schedule'
import type { Pet } from './pets'

// Local-first store: all state lives in browser storage on this device.
// No accounts, no network — the free tier by design.
export interface LocalStore {
  isChecked(doseId: string): boolean
  toggle(doseId: string): void
  meds(): MedDef[]
  addMed(med: MedDef): void
  deleteMed(medId: string): void
  pets(): Pet[]
  addPet(pet: Pet): void
  updatePet(petId: string, fields: Omit<Pet, 'id'>): void
  deletePet(petId: string): void
  medsForPet(petId: string): MedDef[]
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
  }
}
