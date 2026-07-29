import { slugId } from './ids'
import type { Pet, Species } from './pets'

export interface PetFormInput {
  name: string
  species: Species
  speciesDetail: string // raw form text; meaningful only when species === 'other'
}

export function petPatch(input: PetFormInput): Omit<Pet, 'id'> {
  const name = input.name.trim()
  if (name.length === 0) throw new Error('Name is required')
  const patch: Omit<Pet, 'id'> = { name, species: input.species }
  const detail = input.speciesDetail.trim()
  if (input.species === 'other' && detail.length > 0) patch.speciesDetail = detail
  return patch
}

export function buildPet(input: PetFormInput, rand: () => number = Math.random): Pet {
  const patch = petPatch(input)
  return { id: slugId(patch.name, rand), ...patch }
}

export function speciesEmoji(species: Species): string {
  return species === 'dog' ? '🐕' : species === 'cat' ? '🐈' : '🐾'
}

export function speciesLabel(pet: Pet): string {
  return pet.species === 'other' ? pet.speciesDetail ?? 'other' : pet.species
}
