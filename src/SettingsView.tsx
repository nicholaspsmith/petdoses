import { createSignal, Show } from 'solid-js'
import type { LocalStore } from './localStore'
import { serializeBackup, parseBackup, backupFilename, type ParsedBackup } from './backup'
import { todayStr } from './dates'

function summary(pets: number, meds: number, checks: number): string {
  const s = (n: number) => (n === 1 ? '' : 's')
  return `${pets} pet${s(pets)}, ${meds} med${s(meds)}, ${checks} check-off${s(checks)}`
}

export default function SettingsView(props: { store: LocalStore; onBack(): void }) {
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal('')
  const [pending, setPending] = createSignal<ParsedBackup | null>(null)
  let fileInput!: HTMLInputElement

  const download = () => {
    setStatus('')
    setError('')
    setPending(null)
    const text = serializeBackup(
      { pets: props.store.pets(), meds: props.store.meds(), checks: props.store.checks() },
      new Date().toISOString(),
    )
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename(todayStr())
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup downloaded.')
  }

  const onFile = async (input: HTMLInputElement) => {
    setStatus('')
    setError('')
    const file = input.files?.[0]
    if (!file) return
    try {
      // A second pick replaces any pending restore.
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setPending(null)
      setError(e instanceof Error ? e.message : 'Not a valid backup file')
    }
    input.value = '' // allow re-picking the same file
  }

  const restore = (backup: ParsedBackup) => {
    props.store.replaceAll(backup)
    setPending(null)
    setStatus('Backup restored.')
  }

  return (
    <div class="settings-view">
      <header class="app-header">
        <h1>Settings</h1>
        <button type="button" class="nav-btn" onClick={() => props.onBack()}>
          Done
        </button>
      </header>

      <section class="settings-section">
        <h3>Backup</h3>
        <p class="settings-copy">
          Your data lives only on this device. Download a backup file and keep
          it somewhere safe — it's the only copy.
        </p>
        <div class="backup-actions">
          <button type="button" class="today-btn" onClick={download}>
            Download backup
          </button>
          <button type="button" class="nav-btn" onClick={() => fileInput.click()}>
            Restore from backup…
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            class="file-hidden"
            onChange={(e) => void onFile(e.currentTarget)}
          />
        </div>
        <Show when={pending()}>
          {(backup) => (
            <div class="med-confirm">
              <span>
                Replace current data (
                {summary(
                  props.store.pets().length,
                  props.store.meds().length,
                  Object.keys(props.store.checks()).length,
                )}
                ) with backup{backup().exportedAt ? ` from ${backup().exportedAt}` : ''} (
                {summary(
                  backup().pets.length,
                  backup().meds.length,
                  Object.keys(backup().checks).length,
                )}
                )?
              </span>
              <button type="button" class="danger-btn" onClick={() => restore(backup())}>
                Replace
              </button>
              <button type="button" class="nav-btn" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          )}
        </Show>
        <Show when={error()}>
          <p class="med-error">{error()}</p>
        </Show>
        <Show when={status()}>
          <p class="med-saved">{status()}</p>
        </Show>
      </section>

      <section class="settings-section">
        <h3>About & privacy</h3>
        <p class="settings-copy">
          PetDoses stores everything — pets, medications, and check-off history
          — in this browser on this device. Nothing is sent to a server; there
          are no accounts and no tracking. Clearing this site's browser data
          erases it, so keep a backup. PetDoses records what you've given — it
          is not veterinary advice; always follow your vet's instructions.
        </p>
      </section>
    </div>
  )
}
