import { For } from 'solid-js'
import type { Pet } from './pets'
import { speciesEmoji } from './petForm'

interface Props {
  pets: Pet[]
  selected: string // 'all' or a pet id
  onSelect(id: string): void
}

export default function PetChips(props: Props) {
  return (
    <div class="pet-chips">
      <button
        type="button"
        class="chip"
        classList={{ active: props.selected === 'all' }}
        onClick={() => props.onSelect('all')}
      >
        All
      </button>
      <For each={props.pets}>
        {(pet) => (
          <button
            type="button"
            class="chip"
            classList={{ active: props.selected === pet.id }}
            onClick={() => props.onSelect(pet.id)}
          >
            {speciesEmoji(pet.species)} {pet.name}
          </button>
        )}
      </For>
    </div>
  )
}
