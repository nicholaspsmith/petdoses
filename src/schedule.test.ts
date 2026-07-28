import { describe, it, expect } from 'vitest'
import { dosesForDay, pillInventories, expandMed, type Dose } from './schedule'
import { TEST_MEDS } from './testFixtures'
import { addDays } from './dates'

// Collect every dose in an inclusive date range (ISO strings compare correctly).
function dosesInRange(start: string, end: string): Dose[] {
  const all: Dose[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) all.push(...dosesForDay(TEST_MEDS, d))
  return all
}
const byMed = (id: string, doses: Dose[]) => doses.filter((x) => x.medId === id)
const keys = (doses: Dose[]) => doses.map((x) => `${x.date}:${x.slot}`)

// Wide window covering all finite courses with margin on both sides.
const WINDOW = () => dosesInRange('2026-07-01', '2026-12-31')

describe('taper med (2 tablets/dose, 40-pill course)', () => {
  it('yields exactly 20 doses = 40 pills, ending AM Aug 10', () => {
    const doses = byMed('taper-med', WINDOW())
    expect(doses).toHaveLength(20)
    expect(keys(doses).at(-1)).toBe('2026-08-10:am')
  })
  it('every-12h phase: PM Jul 21 through AM Jul 26, both slots daily', () => {
    const doses = byMed('taper-med', dosesInRange('2026-07-21', '2026-07-26'))
    expect(keys(doses)).toEqual([
      '2026-07-21:pm',
      '2026-07-22:am', '2026-07-22:pm',
      '2026-07-23:am', '2026-07-23:pm',
      '2026-07-24:am', '2026-07-24:pm',
      '2026-07-25:am', '2026-07-25:pm',
      '2026-07-26:am',
    ])
  })
  it('every-24h phase: AM only, Jul 27-31', () => {
    const doses = byMed('taper-med', dosesInRange('2026-07-27', '2026-07-31'))
    expect(keys(doses)).toEqual([
      '2026-07-27:am', '2026-07-28:am', '2026-07-29:am',
      '2026-07-30:am', '2026-07-31:am',
    ])
  })
  it('every-other-day phase: AM Aug 2, 4, 6, 8, 10; nothing on off days or after', () => {
    const doses = byMed('taper-med', dosesInRange('2026-08-01', '2026-12-31'))
    expect(keys(doses)).toEqual([
      '2026-08-02:am', '2026-08-04:am', '2026-08-06:am',
      '2026-08-08:am', '2026-08-10:am',
    ])
  })
})

describe('twice-daily med (3 capsules/dose)', () => {
  it('yields exactly 28 doses, PM Jul 21 through AM Aug 4, nothing after', () => {
    const doses = byMed('twice-daily-med', WINDOW())
    expect(doses).toHaveLength(28)
    expect(keys(doses)[0]).toBe('2026-07-21:pm')
    expect(keys(doses).at(-1)).toBe('2026-08-04:am')
    expect(byMed('twice-daily-med', dosesInRange('2026-08-05', '2026-12-31'))).toHaveLength(0)
  })
})

describe('weekly med phase', () => {
  it('PM on Tuesdays Jul 21, Jul 28, Aug 4, Aug 11; no 5th weekly dose', () => {
    const doses = byMed('weekly-med', dosesInRange('2026-07-01', '2026-08-31'))
    expect(keys(doses)).toEqual([
      '2026-07-21:pm', '2026-07-28:pm', '2026-08-04:pm', '2026-08-11:pm',
    ])
  })
})

describe('dose identity and shape', () => {
  it('IDs follow medId:YYYY-MM-DD:slot', () => {
    const ids = dosesForDay(TEST_MEDS, '2026-07-22').map((d) => d.id)
    expect(ids).toContain('taper-med:2026-07-22:am')
    expect(ids).toContain('twice-daily-med:2026-07-22:pm')
  })
  it('carries display fields', () => {
    const dose = dosesForDay(TEST_MEDS, '2026-07-21').find((d) => d.medId === 'taper-med')!
    expect(dose.medName).toBe('Taper Med')
    expect(dose.doseText).toBe('2 tablets by mouth')
    expect(dose.slot).toBe('pm')
  })
  it('day before any schedule is empty', () => {
    expect(dosesForDay(TEST_MEDS, '2026-07-20')).toEqual([])
  })
})

describe('pillInventories', () => {
  it('covers exactly the finite pill-based courses, in med order', () => {
    expect(pillInventories(TEST_MEDS).map((i) => i.medId)).toEqual([
      'taper-med', 'twice-daily-med', 'daily-med',
    ])
  })
  it('computes totals from the schedule: 40 tablets, 84 capsules, 84 tablets', () => {
    const byId = Object.fromEntries(pillInventories(TEST_MEDS).map((i) => [i.medId, i]))
    expect(byId['taper-med']).toMatchObject({
      medName: 'Taper Med', unitsPerDose: 2, unitLabel: 'tablets', totalUnits: 40,
    })
    expect(byId['twice-daily-med']).toMatchObject({
      medName: 'Twice Daily Med', unitsPerDose: 3, unitLabel: 'capsules', totalUnits: 84,
    })
    expect(byId['daily-med']).toMatchObject({
      medName: 'Daily Med', unitsPerDose: 4, unitLabel: 'tablets', totalUnits: 84,
    })
  })
  it('lists every dose id of the course, first to last', () => {
    const pred = pillInventories(TEST_MEDS).find((i) => i.medId === 'taper-med')!
    expect(pred.doseIds).toHaveLength(20)
    expect(pred.doseIds[0]).toBe('taper-med:2026-07-21:pm')
    expect(pred.doseIds.at(-1)).toBe('taper-med:2026-08-10:am')
  })
})

describe('daily med (4 tablets/dose)', () => {
  it('yields exactly 21 AM doses, Jul 23 through Aug 12, nothing outside', () => {
    const doses = byMed('daily-med', WINDOW())
    expect(doses).toHaveLength(21)
    expect(doses.every((d) => d.slot === 'am')).toBe(true)
    expect(keys(doses)[0]).toBe('2026-07-23:am')
    expect(keys(doses).at(-1)).toBe('2026-08-12:am')
    expect(byMed('daily-med', dosesForDay(TEST_MEDS, '2026-07-22'))).toHaveLength(0)
    expect(byMed('daily-med', dosesForDay(TEST_MEDS, '2026-08-13'))).toHaveLength(0)
  })
  it('doses on consecutive days with correct display fields', () => {
    const dose = byMed('daily-med', dosesForDay(TEST_MEDS, '2026-07-30'))[0]
    expect(dose.medName).toBe('Daily Med')
    expect(dose.doseText).toBe('4 tablets by mouth')
    expect(dose.id).toBe('daily-med:2026-07-30:am')
  })
})

describe('monthly med rule', () => {
  it('PM on the 14th from Aug 2026 onward', () => {
    const doses = byMed('monthly-med', dosesInRange('2026-07-01', '2026-10-31'))
    expect(keys(doses)).toEqual(['2026-08-14:pm', '2026-09-14:pm', '2026-10-14:pm'])
  })
  it('does not fire on Jul 14, 2026 (before rule start)', () => {
    expect(byMed('monthly-med', dosesForDay(TEST_MEDS, '2026-07-14'))).toHaveLength(0)
  })
  it('continues indefinitely', () => {
    expect(byMed('monthly-med', dosesForDay(TEST_MEDS, '2030-03-14'))).toHaveLength(1)
  })
})

describe('fixture identity', () => {
  it('keeps the five fixture ids, in order', () => {
    expect(TEST_MEDS.map((m) => m.id)).toEqual([
      'taper-med', 'twice-daily-med', 'daily-med', 'monthly-med', 'weekly-med',
    ])
  })
  it('expandMed(taper) yields the exact 20 known dose ids', () => {
    const pred = TEST_MEDS.find((m) => m.id === 'taper-med')!
    const ids = expandMed(pred).map((d) => d.id)
    expect(ids).toHaveLength(20)
    expect(ids[0]).toBe('taper-med:2026-07-21:pm')
    expect(ids[9]).toBe('taper-med:2026-07-26:am')
    expect(ids[10]).toBe('taper-med:2026-07-27:am')
    expect(ids.at(-1)).toBe('taper-med:2026-08-10:am')
  })
})

describe('weekly med monthly tail', () => {
  it('is day-of-month (11th), not every-28-days', () => {
    const doses = byMed('weekly-med', dosesInRange('2026-09-01', '2026-11-30'))
    expect(keys(doses)).toEqual(['2026-09-11:pm', '2026-10-11:pm', '2026-11-11:pm'])
    expect(byMed('weekly-med', dosesForDay(TEST_MEDS, '2026-09-08'))).toHaveLength(0)
  })
  it('weekly phase and monthly tail do not overlap in August', () => {
    // Monthly starts Sep 11; Aug 11 comes only from the weekly phase.
    expect(byMed('weekly-med', dosesForDay(TEST_MEDS, '2026-08-11'))).toHaveLength(1)
  })
})
