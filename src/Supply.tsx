import { For, Show } from 'solid-js'
import { pillInventories, type MedDef } from './schedule'
import type { LocalStore } from './localStore'

export default function Supply(props: {
  meds: MedDef[]
  store: LocalStore
  petTag?: (petId: string) => string | undefined
}) {
  const rows = () =>
    pillInventories(props.meds).map((inv) => {
      const taken = inv.doseIds.filter((id) => props.store.isChecked(id)).length
      return {
        medId: inv.medId,
        petId: inv.petId,
        medName: inv.medName,
        unitLabel: inv.unitLabel,
        total: inv.totalUnits,
        left: inv.totalUnits - taken * inv.unitsPerDose,
      }
    })

  return (
    <section class="supply">
      <h3>Pills remaining</h3>
      <For each={rows()}>
        {(row) => {
          const tag = () => props.petTag?.(row.petId)
          return (
            <div class="supply-row">
              <span>
                <Show when={tag()}>
                  <span class="pet-tag">{tag()} </span>
                </Show>
                <span class="dose-name">{row.medName}</span>
              </span>
              <span class="supply-count" classList={{ done: row.left === 0 }}>
                {row.left} of {row.total} {row.unitLabel}
              </span>
            </div>
          )
        }}
      </For>
    </section>
  )
}
