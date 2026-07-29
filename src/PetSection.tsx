import { createSignal, For, Show } from 'solid-js'
import type { Pet } from './pets'
import type { LocalStore } from './localStore'
import { petPatch, speciesEmoji, type PetFormInput } from './petForm'
import MedRow from './MedRow'
import AddMedForm from './AddMedForm'
import PetEditor from './PetEditor'

interface Props {
  pet: Pet
  store: LocalStore
  autoExpandAdd?: boolean
}

export default function PetSection(props: Props) {
  const [mode, setMode] = createSignal<'view' | 'edit' | 'confirm'>('view')
  const [adding, setAdding] = createSignal(props.autoExpandAdd ?? false)
  const meds = () => props.store.medsForPet(props.pet.id)

  const confirmText = () => {
    const n = meds().length
    if (n === 0) return `Remove ${props.pet.name}?`
    return `Remove ${props.pet.name} and its ${n} medication${n === 1 ? '' : 's'}, including dose history?`
  }

  const savePet = (input: PetFormInput) => {
    props.store.updatePet(props.pet.id, petPatch(input))
    setMode('view')
  }

  return (
    <section class="pet-section">
      <Show when={mode() === 'view'}>
        <div class="pet-header">
          <span class="pet-title">
            {speciesEmoji(props.pet.species)} {props.pet.name}
            <Show when={props.pet.speciesDetail}>
              {' '}
              <span class="pet-detail">({props.pet.speciesDetail})</span>
            </Show>
          </span>
          <span class="pet-actions">
            <button type="button" class="med-delete" aria-label={`Edit ${props.pet.name}`} onClick={() => setMode('edit')}>
              ✎
            </button>
            <button type="button" class="med-delete" aria-label={`Remove ${props.pet.name}`} onClick={() => setMode('confirm')}>
              ✕
            </button>
          </span>
        </div>
      </Show>
      <Show when={mode() === 'edit'}>
        <PetEditor initial={props.pet} submitLabel="Save" onSave={savePet} onCancel={() => setMode('view')} />
      </Show>
      <Show when={mode() === 'confirm'}>
        <div class="med-confirm">
          <span>{confirmText()}</span>
          <button type="button" class="danger-btn" onClick={() => props.store.deletePet(props.pet.id)}>
            Remove
          </button>
          <button type="button" class="nav-btn" onClick={() => setMode('view')}>
            Cancel
          </button>
        </div>
      </Show>
      <For each={meds()}>{(med) => <MedRow med={med} store={props.store} />}</For>
      <Show
        when={adding()}
        fallback={
          <button type="button" class="nav-btn add-toggle" onClick={() => setAdding(true)}>
            + Add medication
          </button>
        }
      >
        <AddMedForm store={props.store} petId={props.pet.id} />
      </Show>
    </section>
  )
}
