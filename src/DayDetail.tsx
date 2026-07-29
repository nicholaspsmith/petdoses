import { For, Show } from 'solid-js'
import { dosesForDay, type Dose, type MedDef } from './schedule'
import { formatDateLong } from './dates'
import type { LocalStore } from './localStore'

interface SlotProps {
  label: string
  doses: Dose[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}

function SlotSection(props: SlotProps) {
  return (
    <Show when={props.doses.length > 0}>
      <section class="slot-section">
        <h3>{props.label}</h3>
        <For each={props.doses}>
          {(dose) => {
            const tag = () => props.petTag?.(dose.petId)
            return (
              <label class="dose-row">
                <input
                  type="checkbox"
                  checked={props.store.isChecked(dose.id)}
                  onChange={() => props.store.toggle(dose.id)}
                />
                <Show when={tag()}>
                  <span class="pet-tag">{tag()}</span>
                </Show>
                <span class="dose-name">{dose.medName}</span>
                <span class="dose-text">{dose.doseText}</span>
              </label>
            )
          }}
        </For>
      </section>
    </Show>
  )
}

export default function DayDetail(props: {
  date: string
  meds: MedDef[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}) {
  const doses = () => dosesForDay(props.meds, props.date)
  return (
    <div class="day-detail">
      <h2>{formatDateLong(props.date)}</h2>
      <Show when={doses().length === 0}>
        <p class="no-doses">No doses this day.</p>
      </Show>
      <SlotSection label="AM" doses={doses().filter((d) => d.slot === 'am')} store={props.store} petTag={props.petTag} />
      <SlotSection label="PM" doses={doses().filter((d) => d.slot === 'pm')} store={props.store} petTag={props.petTag} />
    </div>
  )
}
