import { describe, it, expect } from 'vitest'
import { slugId } from './ids'

const fixedRand = () => 0 // suffix "0000"

describe('slugId', () => {
  it('slugifies and suffixes', () => {
    expect(slugId('Gabapentin 100mg!', fixedRand)).toBe('gabapentin-100mg-0000')
  })
  it('falls back for all-symbol names', () => {
    expect(slugId('★★★', fixedRand)).toBe('med-0000')
  })
})
