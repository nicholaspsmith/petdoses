import { describe, it, expect } from 'vitest'
import { createLocalStore } from './localStore'
import { CHECKS_KEY, MEDS_KEY } from './storage'
import type { MedDef } from './schedule'
import { fakeStorage } from './testStorage'

const MED: MedDef = {
  id: 'gabapentin-0000',
  petId: 'test-dog',
  name: 'Gabapentin',
  doseText: '2 capsules by mouth',
  phases: [{ start: '2026-07-24', startSlot: 'am', intervalSlots: 2, count: 3 }],
}

const ID = 'gabapentin-0000:2026-07-24:am'

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
  it('add is id-idempotent; delete removes and leaves checks alone', () => {
    const s = fakeStorage()
    const store = createLocalStore(s)
    store.addMed(MED)
    store.addMed({ ...MED, name: 'Impostor' })
    expect(store.meds()).toEqual([MED])
    store.toggle(ID)
    store.deleteMed(MED.id)
    expect(store.meds()).toEqual([])
    expect(store.isChecked(ID)).toBe(true) // history preserved
  })
  it('backs up a corrupt med list before resetting', () => {
    const s = fakeStorage({ [MEDS_KEY]: '{broken' })
    expect(createLocalStore(s).meds()).toEqual([])
    expect(s.data.get(`${MEDS_KEY}:corrupt`)).toBe('{broken')
  })
})
