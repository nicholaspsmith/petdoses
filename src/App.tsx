import { createSignal, Show } from 'solid-js'
import './App.css'
import { todayStr, parseDateStr } from './dates'
import { getLocalStorage } from './storage'
import { createLocalStore } from './localStore'
import MonthGrid from './MonthGrid'
import DayDetail from './DayDetail'
import Supply from './Supply'
import PetsView from './PetsView'

function App() {
  const store = createLocalStore(getLocalStorage())
  const today = todayStr()
  const { y, m } = parseDateStr(today)
  const [selected, setSelected] = createSignal(today)
  const [view, setView] = createSignal({ y, m })
  const [screen, setScreen] = createSignal<'calendar' | 'meds'>('calendar')

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
              <button type="button" class="today-btn" onClick={() => setScreen('meds')}>
                Add a medication
              </button>
            </div>
          }
        >
          <MonthGrid
            year={view().y}
            month={view().m}
            selected={selected()}
            today={today}
            store={store}
            onSelect={setSelected}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={() => {
              setView({ y, m })
              setSelected(today)
            }}
          />
          <DayDetail date={selected()} store={store} />
          <Supply store={store} />
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
