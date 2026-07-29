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
