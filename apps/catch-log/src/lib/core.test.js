// Unit tests for the offline math + rules. Run: npm test
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { sunDay, lightPeriodAt } from './sun.js'
import { heightAt, rateAt, stageAt, parseNoaaGmt, refreshStations, getCachedTides, tideRangeForDay } from './tides.js'
import { checkCatch, keptCounts, pickRegs, regsSummary, spotWaters } from './regs.js'
import { scoreDay } from './windows.js'
import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { SPOTS } from '../data/spots.js'

const SPRINGMAID = { lat: 33.656, lon: -78.917 }

describe('sun', () => {
  it('computes sun times for a Myrtle Beach day (no moon/solunar data)', () => {
    const d = sunDay('2026-10-11', SPRINGMAID.lat, SPRINGMAID.lon)
    expect(d.sunrise).toBeInstanceOf(Date)
    expect(d.sunset > d.sunrise).toBe(true)
    expect(d.firstLight < d.sunrise).toBe(true)
    expect(d.lastLight > d.sunset).toBe(true)
    expect(d).not.toHaveProperty('periods')
    expect(d).not.toHaveProperty('moonTide')
  })

  it('light periods', () => {
    const d = sunDay('2026-10-11', SPRINGMAID.lat, SPRINGMAID.lon)
    expect(lightPeriodAt(d.sunrise, d)).toBe('dawn')
    expect(lightPeriodAt(d.sunset, d)).toBe('dusk')
    const noon = new Date(d.sunrise.getTime() + (d.sunset - d.sunrise) / 2)
    expect(lightPeriodAt(noon, d)).toBe('day')
  })
})

describe('tides', () => {
  // Real NOAA hilo predictions for Springmaid Pier 2026-10-11 (GMT)
  const preds = [
    ['2026-10-11 00:00', 5.75, 'H'],
    ['2026-10-11 06:17', 0.309, 'L'],
    ['2026-10-11 12:29', 6.452, 'H'],
    ['2026-10-11 18:47', 0.457, 'L'],
    ['2026-10-12 00:39', 5.546, 'H'],
  ].map(([t, v, type]) => ({ t: parseNoaaGmt(t), v, type }))

  it('parses NOAA GMT timestamps', () => {
    expect(new Date(parseNoaaGmt('2026-10-11 06:17')).toISOString()).toBe('2026-10-11T06:17:00.000Z')
  })

  it('interpolates height between extremes', () => {
    expect(heightAt(preds, preds[1].t)).toBeCloseTo(0.309, 3)
    const mid = (preds[1].t + preds[2].t) / 2
    expect(heightAt(preds, mid)).toBeCloseTo((0.309 + 6.452) / 2, 2)
    expect(heightAt(preds, preds[0].t - 1)).toBeNull()
  })

  it('rate is ~0 at slack and max mid-tide; sign = direction', () => {
    expect(Math.abs(rateAt(preds, preds[1].t))).toBeLessThan(0.01)
    const mid = (preds[1].t + preds[2].t) / 2
    expect(rateAt(preds, mid)).toBeGreaterThan(1) // ~1.6 ft/hr rising
    const midFall = (preds[2].t + preds[3].t) / 2
    expect(rateAt(preds, midFall)).toBeLessThan(-1)
  })

  it('stages: slack / incoming / outgoing', () => {
    expect(stageAt(preds, preds[1].t + 10 * 60e3).stage).toBe('slack-low')
    expect(stageAt(preds, (preds[1].t + preds[2].t) / 2).stage).toBe('incoming')
    expect(stageAt(preds, (preds[2].t + preds[3].t) / 2).stage).toBe('outgoing')
  })

  it('tide range vs average flags big and small tide days', () => {
    // two days: 6 ft swings, then 2 ft swings → avg 4 ft
    const base = Date.UTC(2026, 9, 10, 0)
    const p = []
    for (let i = 0; i < 8; i++) p.push({ t: base + i * 6 * 3600e3, v: i % 2 ? 0 : 6, type: i % 2 ? 'L' : 'H' })
    for (let i = 8; i < 16; i++) p.push({ t: base + i * 6 * 3600e3, v: i % 2 ? 1 : 3, type: i % 2 ? 'L' : 'H' })
    const big = tideRangeForDay(p, new Date(base + 6 * 3600e3), new Date(base + 30 * 3600e3))
    expect(big.size).toBe('big')
    expect(big.label).toMatch(/Big tides/)
    const small = tideRangeForDay(p, new Date(base + 54 * 3600e3), new Date(base + 78 * 3600e3))
    expect(small.size).toBe('small')
    expect(tideRangeForDay(null, new Date(), new Date())).toBeNull()
  })

  it('downloads + caches a station via injected fetch', async () => {
    const body = { predictions: [{ t: '2026-10-11 00:00', v: '5.75', type: 'H' }, { t: '2027-10-10 06:00', v: '0.3', type: 'L' }] }
    const fetchImpl = async (url) => {
      expect(url).toContain('station=8661070')
      expect(url).toContain('time_zone=gmt')
      return { ok: true, json: async () => body }
    }
    const res = await refreshStations(['8661070'], { force: true, fetchImpl })
    expect(res.updated).toEqual(['8661070'])
    const row = await getCachedTides('8661070')
    expect(row.predictions).toHaveLength(2)
  })
})

describe('best windows', () => {
  it('salt: 3 non-overlapping 90-min windows using tides; fresh: dawn + dusk only', () => {
    const preds = []
    // synthetic semi-diurnal tide around the test day
    const base = Date.UTC(2026, 9, 10, 0, 0)
    for (let i = 0; i < 12; i++) preds.push({ t: base + i * 6.2 * 3600e3, v: i % 2 ? 0.3 : 5.8, type: i % 2 ? 'L' : 'H' })
    const day = sunDay('2026-10-11', SPRINGMAID.lat, SPRINGMAID.lon)
    const salt = scoreDay(day, 'salt', preds)
    expect(salt.usedTides).toBe(true)
    expect(salt.windows).toHaveLength(3)
    const [a, b] = salt.windows
    expect(a.score).toBeGreaterThanOrEqual(b.score)
    // family hours: every window starts between 5 AM and 9 PM
    for (const w of salt.windows) expect(w.start.getHours() >= 5 && w.start.getHours() < 21).toBe(true)
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const x = salt.windows[i]; const y = salt.windows[j]
      expect(x.end <= y.start || y.end <= x.start).toBe(true)
    }
    const fresh = scoreDay(day, 'fresh', null)
    expect(fresh.usedTides).toBe(false)
    expect(fresh.windows).toHaveLength(2)
    const why = fresh.windows.map((w) => w.reasons.join(' ')).join(' | ')
    expect(why).toMatch(/Dawn/)
    expect(why).toMatch(/Dusk/)
    expect(why).not.toMatch(/olunar/)
  })
})

describe('regs checker', () => {
  const at = (iso) => new Date(iso).toISOString()
  const red = SPECIES_BY_ID['red-drum']

  it('red drum 2026 slot 18–25, 1/person, 2/boat', () => {
    expect(checkCatch(red, { kept: true, lengthIn: 17, caughtAt: at('2026-10-11T12:00') }).some((w) => w.level === 'stop')).toBe(true)
    expect(checkCatch(red, { kept: true, lengthIn: 22, caughtAt: at('2026-10-11T12:00') }).filter((w) => w.level === 'stop')).toHaveLength(0)
    expect(checkCatch(red, { kept: true, lengthIn: 30 }).some((w) => /Over slot/.test(w.text))).toBe(true)
    const second = checkCatch(red, { kept: true, lengthIn: 20 }, { anglerKept: 1 })
    expect(second.some((w) => /1\/person/.test(w.text))).toBe(true)
    const third = checkCatch(red, { kept: true, lengthIn: 20 }, { partyKept: 2 })
    expect(third.some((w) => /2\/boat/.test(w.text))).toBe(true)
    // released fish never trip size checks
    expect(checkCatch(red, { kept: false, lengthIn: 40 }).some((w) => w.level === 'stop')).toBe(false)
  })

  it('Santee striper: 23–25 slot, one over 26, closed in summer', () => {
    const stb = SPECIES_BY_ID['striped-bass']
    const opts = { waterBody: ['santee-cooper'] }
    const oct = at('2026-10-15T12:00')
    expect(checkCatch(stb, { kept: true, lengthIn: 24, caughtAt: oct }, {}, opts).filter((w) => w.level === 'stop')).toHaveLength(0)
    expect(checkCatch(stb, { kept: true, lengthIn: 25.5, caughtAt: oct }, {}, opts).some((w) => /Over slot/.test(w.text))).toBe(true)
    expect(checkCatch(stb, { kept: true, lengthIn: 28, caughtAt: oct }, {}, opts).filter((w) => w.level === 'stop')).toHaveLength(0)
    expect(checkCatch(stb, { kept: true, lengthIn: 28, caughtAt: oct }, { anglerBig: 1 }, opts).some((w) => /Only 1 fish over 26/.test(w.text))).toBe(true)
    expect(checkCatch(stb, { kept: true, lengthIn: 24, caughtAt: at('2026-07-04T12:00') }, {}, opts).some((w) => /Closed season/.test(w.text))).toBe(true)
    // statewide (no special water): no size limit
    expect(checkCatch(stb, { kept: true, lengthIn: 12, caughtAt: oct }).filter((w) => w.level === 'stop')).toHaveLength(0)
  })

  it('Lake Murray striper min only applies Oct 1–May 31', () => {
    const stb = SPECIES_BY_ID['striped-bass']
    const opts = { waterBody: 'murray' }
    expect(checkCatch(stb, { kept: true, lengthIn: 18, caughtAt: at('2026-11-01T12:00') }, {}, opts).some((w) => /Undersize/.test(w.text))).toBe(true)
    expect(checkCatch(stb, { kept: true, lengthIn: 18, caughtAt: at('2026-07-01T12:00') }, {}, opts).some((w) => /Undersize/.test(w.text))).toBe(false)
  })

  it('bass 14" only on the big lakes', () => {
    const lmb = SPECIES_BY_ID['largemouth-bass']
    expect(checkCatch(lmb, { kept: true, lengthIn: 12 }, {}, { waterBody: ['santee-cooper'] }).some((w) => /Undersize/.test(w.text))).toBe(true)
    expect(checkCatch(lmb, { kept: true, lengthIn: 12 }, {}, {}).some((w) => /Undersize/.test(w.text))).toBe(false)
  })

  it('whiting/spot/croaker share a 50 aggregate; redbreast capped at 15 inside bream', () => {
    const catches = Array.from({ length: 50 }, (_, i) => ({
      id: i, anglerId: 1, kept: true, caughtAt: at('2026-10-11T12:00'),
      speciesId: ['whiting', 'spot', 'croaker'][i % 3],
    }))
    const spot = SPECIES_BY_ID['spot']
    const counts = keptCounts(catches, { species: spot, anglerId: 1, when: at('2026-10-11T13:00'), regs: spot.regs })
    expect(counts.anglerKept).toBe(50)
    expect(checkCatch(spot, { kept: true }, counts).some((w) => /50\/person/.test(w.text))).toBe(true)

    const rb = SPECIES_BY_ID['redbreast']
    const rbCatches = Array.from({ length: 15 }, (_, i) => ({ id: i, anglerId: 1, kept: true, caughtAt: at('2026-10-11T12:00'), speciesId: 'redbreast' }))
    const rbCounts = keptCounts(rbCatches, { species: rb, anglerId: 1, when: at('2026-10-11T13:00'), regs: rb.regs })
    expect(checkCatch(rb, { kept: true }, rbCounts).some((w) => /15\/person limit for Redbreast/.test(w.text))).toBe(true)
  })

  it('hardhead catfish = no possession even when released', () => {
    const hh = SPECIES_BY_ID['hardhead-catfish']
    expect(checkCatch(hh, { kept: false })[0].level).toBe('stop')
  })

  it('pickRegs: special overrides inherit statewide fields', () => {
    const lmb = SPECIES_BY_ID['largemouth-bass']
    const r = pickRegs(lmb, ['santee-cooper'])
    expect(r.min).toBe(14)
    expect(r.perPerson).toBe(5)
    expect(regsSummary(r)).toContain('14" min')
  })
})

describe('data integrity', () => {
  it('every species has an id, name, water, marks, and unique id', () => {
    const ids = new Set()
    for (const s of SPECIES) {
      expect(s.id && s.name && s.water).toBeTruthy()
      expect(ids.has(s.id)).toBe(false)
      ids.add(s.id)
      expect(Array.isArray(s.marks)).toBe(true)
    }
  })

  it('every spot target is a real species; salt spots have a tide station', () => {
    const keys = new Set()
    for (const sp of SPOTS) {
      expect(keys.has(sp.key)).toBe(false)
      keys.add(sp.key)
      for (const t of sp.targets) expect(SPECIES_BY_ID[t], `${sp.key} → ${t}`).toBeTruthy()
      if (sp.water === 'salt') expect(sp.tideStation).toBeTruthy()
      expect(Math.abs(sp.lat - 33.8)).toBeLessThan(1.5)
      expect(spotWaters(sp)).toBeInstanceOf(Array)
    }
  })
})
