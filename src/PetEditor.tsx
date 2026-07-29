import { createSignal, For, Show } from 'solid-js'
import type { Pet, Species } from './pets'
import { petPatch, speciesEmoji, type PetFormInput } from './petForm'

const SPECIES: Species[] = ['dog', 'cat', 'other']

interface Props {
  initial?: Pet
  submitLabel: string
  onSave(input: PetFormInput): void
  onCancel?(): void
}

export default function PetEditor(props: Props) {
  const [name, setName] = createSignal(props.initial?.name ?? '')
  const [species, setSpecies] = createSignal<Species>(props.initial?.species ?? 'dog')
  const [detail, setDetail] = createSignal(props.initial?.speciesDetail ?? '')
  const [error, setError] = createSignal('')
  const radioGroup = `species-${props.initial?.id ?? 'new'}`

  const submit = () => {
    const input: PetFormInput = { name: name(), species: species(), speciesDetail: detail() }
    try {
      petPatch(input) // validation only; the caller re-derives the patch on save
      setError('')
      props.onSave(input)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    }
  }

  return (
    <form
      class="pet-editor"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label class="field">
        <span>Name</span>
        <input value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="Pet name" />
      </label>
      <div class="field">
        <span>Species</span>
        <div class="species-choices">
          <For each={SPECIES}>
            {(s) => (
              <label class="species-choice">
                <input type="radio" name={radioGroup} checked={species() === s} onChange={() => setSpecies(s)} />
                <span>
                  {speciesEmoji(s)} {s}
                </span>
              </label>
            )}
          </For>
        </div>
      </div>
      <Show when={species() === 'other'}>
        <label class="field">
          <span>What kind? (optional)</span>
          <input value={detail()} onInput={(e) => setDetail(e.currentTarget.value)} placeholder="e.g. parrot" />
        </label>
      </Show>
      <Show when={error()}>
        <p class="med-error">{error()}</p>
      </Show>
      <div class="field-row">
        <button type="submit" class="today-btn">
          {props.submitLabel}
        </button>
        <Show when={props.onCancel}>
          <button type="button" class="nav-btn" onClick={() => props.onCancel!()}>
            Cancel
          </button>
        </Show>
      </div>
    </form>
  )
}
