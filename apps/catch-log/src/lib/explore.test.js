// Tests for the Explore rankings. Run: npm test
import { describe, it, expect } from 'vitest'
import { fishForSpot, spotsForFish, fishInSeason, closedAt, rigFor } from './explore.js'
import { SPOTS } from '../data/spots.js'
import { SPECIES_BY_ID } from '../data/species.js'

const spot = (key) => SPOTS.find((s) => s.key === key)
const OCT = new Date(2026, 9, 15, 12)
const JUL = new Date(2026, 6, 4, 12)

describe('fishForSpot', () => {
  it('kid mode at the State Park pier in October puts easy panfish first', () => {
    const list = fishForSpot(spot('mb-state-park-pier'), { date: OCT, forKids: true })
    const top3 = list.slice(0, 3).map((r) => r.species.id)
    expect(top3).toEqual(expect.arrayContaining(['whiting']))
    expect(top3.some((id) => ['spot', 'croaker'].includes(id))).toBe(true)
    // adult-only fish sink to the bottom for kids
    expect(list.findIndex((r) => r.species.id === 'king-mackerel')).toBe(-1) // not listed at MBSP
  })

  it('never suggests bycatch or wrong-water species', () => {
    const list = fishForSpot(spot('cherry-grove-pier'), { date: OCT })
    expect(list.some((r) => r.species.id === 'hardhead-catfish')).toBe(false)
    expect(list.every((r) => ['salt', 'both'].includes(r.species.water))).toBe(true)
  })

  it('Santee stripers rank last and are flagged closed in July', () => {
    const list = fishForSpot(spot('santee-sp'), { date: JUL })
    const stb = list.find((r) => r.species.id === 'striped-bass')
    expect(stb.closed).toBe(true)
    expect(list[list.length - 1].species.id).toBe('striped-bass')
    expect(fishForSpot(spot('santee-sp'), { date: OCT }).find((r) => r.species.id === 'striped-bass').closed).toBe(false)
  })

  it('custom spots with no target list fall back to everything in that water', () => {
    const custom = { name: 'Dock', water: 'fresh', lat: 34.2, lon: -79.8, targets: [] }
    expect(fishForSpot(custom, { date: OCT }).length).toBeGreaterThan(5)
  })
})

describe('spotsForFish', () => {
  it('whiting → only salt spots that list it, most kid-friendly first', () => {
    const rows = spotsForFish('whiting', SPOTS, { date: OCT })
    expect(rows.length).toBeGreaterThan(3)
    expect(rows.every((r) => r.spot.water === 'salt')).toBe(true)
    expect(rows[0].spot.kids).toBe(5)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].listed === rows[i - 1].listed) expect(rows[i - 1].spot.kids >= rows[i].spot.kids).toBe(true)
    }
  })

  it('"close" sort orders by drive time', () => {
    const rows = spotsForFish('bluegill', SPOTS, { date: OCT, sort: 'close' }).filter((r) => r.listed)
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].spot.driveMin <= rows[i].spot.driveMin).toBe(true)
  })

  it('striped bass: Santee spots flagged closed in July and sorted after open ones', () => {
    const rows = spotsForFish('striped-bass', SPOTS, { date: JUL })
    const santee = rows.find((r) => r.spot.key === 'santee-sp')
    expect(santee.closed).toBe(true)
    const firstClosed = rows.findIndex((r) => r.closed)
    expect(rows.slice(firstClosed).every((r) => r.closed)).toBe(true)
  })
})

describe('helpers', () => {
  it('fishInSeason ranks October peak fish above off-season ones', () => {
    const salt = fishInSeason('salt', { date: OCT }).map((s) => s.id)
    expect(salt.indexOf('red-drum')).toBeLessThan(salt.indexOf('cobia'))
    expect(salt).not.toContain('hardhead-catfish')
  })

  it('closedAt respects special waters', () => {
    const stb = SPECIES_BY_ID['striped-bass']
    expect(closedAt(stb, spot('santee-sp'), JUL)).toBe(true)
    expect(closedAt(stb, spot('poinsett-sp'), JUL)).toBe(false) // statewide: no closure
  })

  it('rigFor falls back when a rod has no rig', () => {
    const king = SPECIES_BY_ID['king-mackerel']
    expect(rigFor(king, 'kids').fallback).toBe(true)
    expect(rigFor(SPECIES_BY_ID['whiting'], 'kids').rod).toBe('kids')
  })
})
