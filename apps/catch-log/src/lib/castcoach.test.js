// Cast Coach logic + data integrity. Run: npm test
import { describe, it, expect } from 'vitest'
import { CLUES, LINES, KID_LINES, FIGHT, DEPTH_TIPS, ZONE_LABEL, HANDLE } from '../data/clues.js'
import { SPECIES_BY_ID } from '../data/species.js'
import { SPOTS } from '../data/spots.js'
import { whereAmI, cluesFor, castPlan, depthAdvice, tideDir, satelliteLink, milesBetween, AT_SPOT_MI, gearFor } from './castcoach.js'

const OCT = 9

describe('clue data', () => {
  it('every clue is complete and points at real fish + line types', () => {
    const ids = new Set()
    for (const c of CLUES) {
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
      for (const k of ['icon', 'label', 'see', 'why', 'cast']) expect(c[k], `${c.id}.${k}`).toBeTruthy()
      expect(['salt', 'fresh', 'both']).toContain(c.water)
      expect(ZONE_LABEL[c.zone], c.id).toBeTruthy()
      for (const l of c.line) expect(LINES[l], `${c.id} line ${l}`).toBeTruthy()
      for (const f of c.fish) expect(SPECIES_BY_ID[f], `${c.id} fish ${f}`).toBeTruthy()
      // every clue gives the kids' rod something to use
      expect(c.line.some((l) => KID_LINES.includes(l)), c.id).toBe(true)
    }
    for (const l of Object.values(LINES)) expect(l.steps.length).toBeGreaterThanOrEqual(3)
    expect(FIGHT.length).toBeGreaterThanOrEqual(6)
    expect(DEPTH_TIPS.length).toBeGreaterThanOrEqual(3)
    for (const id of Object.keys(HANDLE)) expect(SPECIES_BY_ID[id], `HANDLE ${id}`).toBeTruthy()
  })

  it('filters by water and month (bream beds only Apr–Aug)', () => {
    const salt = cluesFor('salt', OCT).map((c) => c.id)
    const fresh = cluesFor('fresh', OCT).map((c) => c.id)
    expect(salt).toContain('trough')
    expect(salt).not.toContain('wood')
    expect(fresh).toContain('wood')
    expect(fresh).not.toContain('trough')
    expect(fresh).not.toContain('beds')
    expect(cluesFor('fresh', 4).map((c) => c.id)).toContain('beds')
  })
})

describe('whereAmI', () => {
  const springmaid = SPOTS.find((s) => /Springmaid/.test(s.name))

  it('standing on a pier → "you\'re at" that spot', () => {
    const r = whereAmI({ lat: springmaid.lat + 0.001, lon: springmaid.lon }, SPOTS)
    expect(r.at?.name).toBe(springmaid.name)
    expect(r.nearest.mi).toBeLessThan(0.2)
    expect(r.others).toHaveLength(2)
  })

  it('at home in Florence → no spot, nearest is listed with distance', () => {
    const r = whereAmI({ lat: 34.1954, lon: -79.7626 }, SPOTS)
    expect(r.at).toBeNull()
    expect(r.nearest.mi).toBeGreaterThan(AT_SPOT_MI)
  })

  it('handles no fix', () => {
    expect(whereAmI(null, SPOTS)).toBeNull()
  })

  it('distance math is sane (Florence → Myrtle Beach ≈ 60–70 mi straight line)', () => {
    const d = milesBetween({ lat: 34.1954, lon: -79.7626 }, { lat: 33.6891, lon: -78.8867 })
    expect(d).toBeGreaterThan(55)
    expect(d).toBeLessThan(70)
  })

  it('satellite link centers on the fix', () => {
    expect(satelliteLink(33.6, -78.9)).toMatch(/center=33.6,-78.9.*basemap=satellite/)
  })
})

describe('castPlan', () => {
  it('birds diving beats everything', () => {
    const r = castPlan({ clueIds: ['pilings', 'trough', 'birds'], water: 'salt', month: OCT, light: 'day', tide: 'rising' })
    expect(r[0].clue.id).toBe('birds')
    expect(r[0].fish.map((s) => s.id)).toContain('bluefish')
  })

  it('falling tide favors the creek mouth; rising favors the grass edge', () => {
    const falling = castPlan({ clueIds: ['grass', 'creek'], water: 'salt', month: OCT, light: 'dawn', tide: 'falling' })
    expect(falling[0].clue.id).toBe('creek')
    expect(falling[0].notes.join(' ')).toMatch(/going out right now/)
    const rising = castPlan({ clueIds: ['grass', 'creek'], water: 'salt', month: OCT, light: 'dawn', tide: 'rising' })
    expect(rising[0].clue.id).toBe('grass')
  })

  it('bright sun boosts shade; lights only count at night', () => {
    const day = castPlan({ clueIds: ['dock', 'wind', 'lights'], water: 'fresh', month: OCT, light: 'day' })
    expect(day[0].clue.id).toBe('dock')
    expect(day.at(-1).clue.id).toBe('lights')
    const night = castPlan({ clueIds: ['dock', 'wind', 'lights'], water: 'fresh', month: OCT, light: 'night' })
    expect(night[0].clue.id).toBe('lights')
  })

  it('only lists fish that live in this water and are around this month', () => {
    const r = castPlan({ clueIds: ['birds'], water: 'fresh', month: OCT })
    for (const s of r[0].fish) expect(['fresh', 'both']).toContain(s.water)
    const salt = castPlan({ clueIds: ['birds'], water: 'salt', month: 0 })
    expect(salt[0].fish.map((s) => s.id)).not.toContain('spanish-mackerel') // gone in January
  })

  it('target fish move to the front and boost matching clues', () => {
    const r = castPlan({ clueIds: ['trough', 'pilings'], water: 'salt', month: OCT, targets: ['sheepshead'] })
    expect(r[0].clue.id).toBe('pilings')
    expect(r[0].fish[0].id).toBe('sheepshead')
  })

  it('kids\' rod never gets a jig or topwater; adults can', () => {
    for (const c of CLUES) {
      const [k] = castPlan({ clueIds: [c.id], water: c.water === 'fresh' ? 'fresh' : 'salt', month: 5, rod: 'kids' })
      if (k) expect(KID_LINES).toContain(k.line)
    }
    const [adult] = castPlan({ clueIds: ['weeds'], water: 'fresh', month: 5, rod: 'fresh' })
    expect(adult.line).toBe('float')
    expect(adult.gear?.kind).toBe('bait')
  })

  it('the bait/lure always matches the way you\'re told to fish', () => {
    // birds diving in October on the kids' rod → spoon + a spoon-type lure (not a bottom rig)
    const [b] = castPlan({ clueIds: ['birds'], water: 'salt', month: OCT, rod: 'kids' })
    expect(b.line).toBe('spoon')
    expect(b.gear.kind).toBe('lure')
    expect(b.gear.text).toMatch(/gotcha|spoon|metal/i)
    for (const c of CLUES) {
      for (const water of ['salt', 'fresh']) {
        if (c.water !== 'both' && c.water !== water) continue
        for (const rod of ['kids', 'fresh', 'salt']) {
          const [p] = castPlan({ clueIds: [c.id], water, month: OCT, rod })
          if (p?.gear) expect(gearFor(p.gear.fish, p.line)?.text, `${c.id}/${water}/${rod}`).toBe(p.gear.text)
        }
      }
    }
  })

  it('gearFor: no fake lures for bait-only fish', () => {
    expect(gearFor(SPECIES_BY_ID.sheepshead, 'spoon')).toBeNull()
    expect(gearFor(SPECIES_BY_ID.sheepshead, 'bottom').kind).toBe('bait')
  })

  it('tideDir maps NOAA stages', () => {
    expect(tideDir('incoming')).toBe('rising')
    expect(tideDir('outgoing')).toBe('falling')
    expect(tideDir('slack-high')).toBe('slack')
    expect(tideDir(undefined)).toBeNull()
  })
})

describe('depthAdvice', () => {
  const trout = SPECIES_BY_ID['spotted-seatrout']

  it('bright sun pushes a top-water spot to the middle', () => {
    expect(depthAdvice({ zone: 'top', light: 'day' }).zone).toBe('middle')
  })

  it('cold water → deeper + slower; prime → active', () => {
    const cold = depthAdvice({ zone: 'middle', light: 'dawn', tempF: 50, fish: [trout] })
    expect(cold.zone).toBe('bottom')
    expect(cold.notes.join(' ')).toMatch(/chilly.*slower/)
    const prime = depthAdvice({ zone: 'middle', light: 'dawn', tempF: 72, fish: [trout] })
    expect(prime.zone).toBe('middle')
    expect(prime.notes.join(' ')).toMatch(/perfect for Spotted Seatrout/)
  })
})
