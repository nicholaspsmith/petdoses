import { createSignal, For, Show } from 'solid-js'
import type { LocalStore } from './localStore'
import { buildPet, type PetFormInput } from './petForm'
import PetEditor from './PetEditor'
import PetSection from './PetSection'

export default function PetsView(props: { store: LocalStore; onBack(): void }) {
  const [addingPet, setAddingPet] = createSignal(false)
  // With zero pets the add-pet form is the whole screen.
  const showAddPet = () => addingPet() || props.store.pets().length === 0
  // Onboarding: a lone pet with no meds yet gets its med form pre-opened.
  const autoExpandAdd = () => props.store.pets().length === 1 && props.store.meds().length === 0

  const addPet = (input: PetFormInput) => {
    props.store.addPet(buildPet(input))
    setAddingPet(false)
  }

  return (
    <div class="meds-view">
      <header class="app-header">
        <h1>Pets & Meds</h1>
        <button type="button" class="nav-btn" onClick={() => props.onBack()}>
          Done
        </button>
      </header>
      <Show when={props.store.pets().length === 0}>
        <p class="med-notice">Add your pet to get started.</p>
      </Show>
      <For each={props.store.pets()}>
        {(pet) => <PetSection pet={pet} store={props.store} autoExpandAdd={autoExpandAdd()} />}
      </For>
      <Show
        when={showAddPet()}
        fallback={
          <button type="button" class="nav-btn add-toggle" onClick={() => setAddingPet(true)}>
            + Add pet
          </button>
        }
      >
        <div class="add-pet">
          <h3>Add a pet</h3>
          <PetEditor
            submitLabel="Add pet"
            onSave={addPet}
            onCancel={props.store.pets().length > 0 ? () => setAddingPet(false) : undefined}
          />
        </div>
      </Show>
    </div>
  )
}
