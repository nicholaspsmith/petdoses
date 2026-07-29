export type Species = 'dog' | 'cat' | 'other'

export interface Pet {
  id: string // slug id, e.g. 'rex-7f3k'
  name: string
  species: Species
  speciesDetail?: string // only when species === 'other', e.g. 'parrot'
}
