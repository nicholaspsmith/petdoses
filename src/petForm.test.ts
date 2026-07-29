import { describe, it, expect } from 'vitest'
import { petPatch, buildPet, speciesEmoji, speciesLabel } from './petForm'

const fixedRand = () => 0 // suffix "0000"

describe('petPatch', () => {
  it('trims the name and keeps the species', () => {
    expect(petPatch({ name: '  Rex ', species: 'dog', speciesDetail: '' })).toEqual({
      name: 'Rex',
      species: 'dog',
    })
  })
  it('rejects a blank name', () => {
    expect(() => petPatch({ name: '   ', species: 'cat', speciesDetail: '' })).toThrow('Name')
  })
  it('keeps a trimmed detail only for species "other"', () => {
    expect(petPatch({ name: 'Kiwi', species: 'other', speciesDetail: ' parrot ' })).toEqual({
      name: 'Kiwi',
      species: 'other',
      speciesDetail: 'parrot',
    })
  })
  it('drops the detail for dog/cat even if typed', () => {
    expect(petPatch({ name: 'Rex', species: 'dog', speciesDetail: 'husky' })).toEqual({
      name: 'Rex',
      species: 'dog',
    })
  })
  it('omits an empty detail for "other"', () => {
    expect(petPatch({ name: 'Kiwi', species: 'other', speciesDetail: '  ' })).toEqual({
      name: 'Kiwi',
      species: 'other',
    })
  })
})

describe('buildPet', () => {
  it('slugs the id from the name and applies the patch', () => {
    expect(buildPet({ name: 'Rex', species: 'dog', speciesDetail: '' }, fixedRand)).toEqual({
      id: 'rex-0000',
      name: 'Rex',
      species: 'dog',
    })
  })
})

describe('species display', () => {
  it('maps species to emoji', () => {
    expect(speciesEmoji('dog')).toBe('🐕')
    expect(speciesEmoji('cat')).toBe('🐈')
    expect(speciesEmoji('other')).toBe('🐾')
  })
  it('labels dog/cat by species and other by detail', () => {
    expect(speciesLabel({ id: 'x', name: 'Rex', species: 'dog' })).toBe('dog')
    expect(speciesLabel({ id: 'x', name: 'Kiwi', species: 'other', speciesDetail: 'parrot' })).toBe('parrot')
    expect(speciesLabel({ id: 'x', name: 'Kiwi', species: 'other' })).toBe('other')
  })
})
