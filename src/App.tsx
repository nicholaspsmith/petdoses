import { createSignal, Show } from 'solid-js'
import './App.css'
import { todayStr, parseDateStr } from './dates'
import { getLocalStorage } from './storage'
import { createLocalStore } from './localStore'
import MonthGrid from './MonthGrid'
import DayDetail from './DayDetail'
import Supply from './Supply'
import PetsView from './PetsView'
import PetChips from './PetChips'

function App() {
  const store = createLocalStore(getLocalStorage())
  const today = todayStr()
  const { y, m } = parseDateStr(today)
  const [selected, setSelected] = createSignal(today)
  const [view, setView] = createSignal({ y, m })
  const [screen, setScreen] = createSignal<'calendar' | 'meds'>('calendar')

  // Session-only pet filter; falls back to 'all' if the filtered pet is deleted.
  const [filter, setFilter] = createSignal<string>('all')
  const activeFilter = () =>
    filter() === 'all' || store.pets().some((p) => p.id === filter()) ? filter() : 'all'
  const visibleMeds = () =>
    activeFilter() === 'all' ? store.meds() : store.meds().filter((m) => m.petId === activeFilter())
  // Pet-name tag for dose/supply rows — only in the All view with 2+ pets.
  const petTag = (petId: string) =>
    activeFilter() === 'all' && store.pets().length > 1
      ? store.pets().find((p) => p.id === petId)?.name
      : undefined

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const zeroBased = v.m - 1 + delta
      const yy = v.y + Math.floor(zeroBased / 12)
      const mm = ((zeroBased % 12) + 12) % 12 + 1
      return { y: yy, m: mm }
    })
  }

  return (
    <main>
      <Show
        when={screen() === 'calendar'}
        fallback={<PetsView store={store} onBack={() => setScreen('calendar')} />}
      >
        <header class="app-header">
          <h1>PetDoses</h1>
          <button type="button" class="nav-btn" onClick={() => setScreen('meds')}>
            Pets
          </button>
        </header>
        <Show
          when={store.meds().length > 0}
          fallback={
            <div class="empty-state">
              <h2>Track your pet's medications</h2>
              <p>
                A calendar of every dose, morning and evening, that remembers
                what you've given. Your data stays on this device.
              </p>
              <Show
                when={store.pets().length > 0}
                fallback={
                  <button type="button" class="today-btn" onClick={() => setScreen('meds')}>
                    Add your pet
                  </button>
                }
              >
                <button type="button" class="today-btn" onClick={() => setScreen('meds')}>
                  Add a medication for {store.pets()[0].name}
                </button>
              </Show>
            </div>
          }
        >
          <Show when={store.pets().length > 1}>
            <PetChips pets={store.pets()} selected={activeFilter()} onSelect={setFilter} />
          </Show>
          <MonthGrid
            year={view().y}
            month={view().m}
            selected={selected()}
            today={today}
            meds={visibleMeds()}
            store={store}
            onSelect={setSelected}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={() => {
              setView({ y, m })
              setSelected(today)
            }}
          />
          <DayDetail date={selected()} meds={visibleMeds()} store={store} petTag={petTag} />
          <Supply meds={visibleMeds()} store={store} petTag={petTag} />
        </Show>
        <footer class="disclaimer">
          PetDoses records what you've given — it is not veterinary advice.
          Always follow your vet's instructions.
        </footer>
      </Show>
    </main>
  )
}

export default App
