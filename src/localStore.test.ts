import { describe, it, expect } from 'vitest'
import { createLocalStore } from './localStore'
import { CHECKS_KEY, MEDS_KEY, PETS_KEY } from './storage'
import type { MedDef } from './schedule'
import type { Pet } from './pets'
import { fakeStorage } from './testStorage'

const MED: MedDef = {
  id: 'gabapentin-0000',
  petId: 'test-dog',
  name: 'Gabapentin',
  doseText: '2 capsules by mouth',
  phases: [{ start: '2026-07-24', startSlot: 'am', intervalSlots: 2, count: 3 }],
}

const ID = 'gabapentin-0000:2026-07-24:am'

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

describe('checks', () => {
  it('toggle checks, persists, and survives a reload', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    expect(store.isChecked(ID)).toBe(false)
    store.toggle(ID)
    expect(store.isChecked(ID)).toBe(true)
    expect(createLocalStore(s).isChecked(ID)).toBe(true) // fresh store, same storage
  })
  it('toggling again unchecks and removes the entry', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    store.toggle(ID)
    store.toggle(ID)
    expect(store.isChecked(ID)).toBe(false)
    expect(JSON.parse(s.data.get(CHECKS_KEY)!)).toEqual({})
  })
  it('backs up corrupt checks before resetting — never silently discards', () => {
    const s = fakeStorage({ [CHECKS_KEY]: 'not json{{{' })
    expect(createLocalStore(s).isChecked(ID)).toBe(false)
    expect(s.data.get(`${CHECKS_KEY}:corrupt`)).toBe('not json{{{')
  })
  it('works with null storage (in-memory only)', () => {
    const store = createLocalStore(null)
    store.toggle(ID)
    expect(store.isChecked(ID)).toBe(true)
  })
})

describe('meds', () => {
  it('starts empty, adds, persists, and survives a reload', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    expect(store.meds()).toEqual([])
    store.addMed(MED)
    expect(store.meds()).toEqual([MED])
    expect(createLocalStore(s).meds()).toEqual([MED])
  })
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
  it('backs up a corrupt med list before resetting', () => {
    const s = fakeStorage({ [MEDS_KEY]: '{broken' })
    expect(createLocalStore(s).meds()).toEqual([])
    expect(s.data.get(`${MEDS_KEY}:corrupt`)).toBe('{broken')
  })
})

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
