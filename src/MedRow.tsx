import { createSignal, Show } from 'solid-js'
import type { MedDef } from './schedule'
import { scheduleSummary } from './summary'
import type { LocalStore } from './localStore'

export default function MedRow(props: { med: MedDef; store: LocalStore }) {
  const [confirming, setConfirming] = createSignal(false)
  return (
    <div class="med-row">
      <Show
        when={!confirming()}
        fallback={
          <div class="med-confirm">
            <span>Remove {props.med.name}?</span>
            <button
              type="button"
              class="danger-btn"
              onClick={() => {
                props.store.deleteMed(props.med.id)
                setConfirming(false)
              }}
            >
              Remove
            </button>
            <button type="button" class="nav-btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        }
      >
        <div class="med-info">
          <span class="dose-name">{props.med.name}</span>
          <span class="med-summary">
            {props.med.doseText} · {scheduleSummary(props.med)}
          </span>
        </div>
        <button type="button" class="med-delete" aria-label={`Remove ${props.med.name}`} onClick={() => setConfirming(true)}>
          ✕
        </button>
      </Show>
    </div>
  )
}
