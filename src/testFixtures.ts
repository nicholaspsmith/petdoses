import type { MedDef } from './schedule'
import type { Pet } from './pets'

export const TEST_PETS: Pet[] = [
  { id: 'test-dog', name: 'Test Dog', species: 'dog' },
  { id: 'test-cat', name: 'Test Cat', species: 'cat' },
]

// Test-only fixtures. Structurally identical to real-world regimens the
// engine was originally verified against (a steroid taper, a q12h course,
// a q24h course, a monthly ongoing med, a weekly-then-monthly injection),
// with generic names. The hand-computed date expectations in the tests
// depend on these exact phases — change them only with the tests.
export const TEST_MEDS: MedDef[] = [
  {
    id: 'taper-med',
    petId: 'test-dog',
    name: 'Taper Med',
    doseText: '2 tablets by mouth',
    unitsPerDose: 2,
    unitLabel: 'tablets',
    phases: [
      { start: '2026-07-21', startSlot: 'pm', intervalSlots: 1, count: 10 },
      { start: '2026-07-27', startSlot: 'am', intervalSlots: 2, count: 5 },
      { start: '2026-08-02', startSlot: 'am', intervalSlots: 4, count: 5 },
    ],
  },
  {
    id: 'twice-daily-med',
    petId: 'test-dog',
    name: 'Twice Daily Med',
    doseText: '3 capsules by mouth',
    unitsPerDose: 3,
    unitLabel: 'capsules',
    phases: [{ start: '2026-07-21', startSlot: 'pm', intervalSlots: 1, count: 28 }],
  },
  {
    id: 'daily-med',
    petId: 'test-dog',
    name: 'Daily Med',
    doseText: '4 tablets by mouth',
    unitsPerDose: 4,
    unitLabel: 'tablets',
    phases: [{ start: '2026-07-23', startSlot: 'am', intervalSlots: 2, count: 21 }],
  },
  {
    id: 'monthly-med',
    petId: 'test-cat',
    name: 'Monthly Med',
    doseText: '1 dose',
    monthly: { dayOfMonth: 14, slot: 'pm', start: '2026-08-14' },
  },
  {
    id: 'weekly-med',
    petId: 'test-cat',
    name: 'Weekly Med',
    doseText: '0.7 mL injection',
    phases: [{ start: '2026-07-21', startSlot: 'pm', intervalSlots: 14, count: 4 }],
    monthly: { dayOfMonth: 11, slot: 'pm', start: '2026-09-11' },
  },
]
