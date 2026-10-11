// Water temp: normals, sensor mapping, temp fit, live parsing. Run: npm test
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { cToF, sourceForSpot, normalFor, tempFit } from './watertemp-core.js'
import { refreshLive, isFresh } from './watertemp.js'
import { WT_SOURCES, SPOT_WT } from '../data/watertemp.js'
import { SPOTS } from '../data/spots.js'
import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { fishForSpot } from './explore.js'

const spot = (key) => SPOTS.find((s) => s.key === key)

describe('normals', () => {
  it('converts °C → °F', () => {
    expect(cToF(23.7)).toBe(74.7)
    expect(cToF(0)).toBe(32)
  })

  it('mid-month equals the monthly mean; between months interpolates', () => {
    const n = WT_SOURCES['coops:8661070'].normals
    expect(normalFor('coops:8661070', new Date(2026, 9, 16))).toBeCloseTo(n[9], 0) // mid-Oct ≈ Oct mean
    const nov1 = normalFor('coops:8661070', new Date(2026, 10, 1))
    expect(nov1).toBeLessThan(n[9])
    expect(nov1).toBeGreaterThan(n[10])
  })

  it('wraps Dec→Jan and fills missing months from the fallback (Wateree winter gap)', () => {
    expect(normalFor('coops:8661070', new Date(2026, 11, 31))).toBeGreaterThan(48)
    const jan = normalFor('usgs:02147801', new Date(2027, 0, 15))
    expect(jan).toBeCloseTo(WT_SOURCES['usgs:02171000'].normals[0], 0)
  })
})

describe('spot → sensor', () => {
  it('every built-in spot has a sensor mapping to a real source', () => {
    for (const s of SPOTS) {
      expect(SPOT_WT[s.key], s.key).toBeTruthy()
      expect(WT_SOURCES[SPOT_WT[s.key].src], s.key).toBeTruthy()
    }
  })

  it('maps by spot and reports distance + relation', () => {
    const g = sourceForSpot(spot('georgetown-east-bay'))
    expect(g.key).toBe('usgs:02136371')
    expect(g.relation).toBe('at')
    expect(g.miles).toBeLessThan(2)
    expect(sourceForSpot(spot('prestwood-lake')).relation).toBe('proxy')
  })

  it('custom spots pick the nearest sensor of the right kind', () => {
    const salt = sourceForSpot({ key: 'x', water: 'salt', lat: 33.6, lon: -78.95 })
    expect(salt.key).toBe('coops:8661070')
    const fresh = sourceForSpot({ key: 'y', water: 'fresh', lat: 33.5, lon: -80.3 })
    expect(fresh.key).toBe('usgs:02171000')
  })
})

describe('temp fit', () => {
  it('prime / active / slow', () => {
    const trout = SPECIES_BY_ID['spotted-seatrout']
    expect(tempFit(trout, 70).level).toBe('prime')
    expect(tempFit(trout, 60).level).toBe('active')
    expect(tempFit(trout, 50).label).toMatch(/Too cold/)
    expect(tempFit(trout, null)).toBeNull()
  })

  it('every targetable species has sane temp ranges and shore cues', () => {
    for (const s of SPECIES.filter((x) => !x.bycatch)) {
      expect(s.temp.active[0] <= s.temp.best[0] && s.temp.best[1] <= s.temp.active[1], s.id).toBe(true)
      expect(s.shore.length, s.id).toBeGreaterThan(0)
    }
  })

  it('cold water pushes warm-water fish down and cool-water fish up', () => {
    const santee = spot('santee-sp')
    const warm = fishForSpot(santee, { date: new Date(2026, 10, 15), tempF: 78 }).map((r) => r.species.id)
    const cold = fishForSpot(santee, { date: new Date(2026, 10, 15), tempF: 52 }).map((r) => r.species.id)
    expect(cold.indexOf('striped-bass')).toBeLessThan(warm.indexOf('striped-bass'))
    expect(cold.indexOf('channel-catfish')).toBeGreaterThan(warm.indexOf('channel-catfish'))
  })
})

describe('live readings', () => {
  const ok = (body) => async () => ({ ok: true, json: async () => body })

  it('parses NOAA CO-OPS latest water temp', async () => {
    const r = await refreshLive('coops:8661070', {
      force: true,
      fetchImpl: ok({ data: [{ t: '2026-10-11 02:30', v: '75.6', f: '0,0,0' }] }),
    })
    expect(r.tempF).toBe(75.6)
    expect(new Date(r.at).toISOString()).toBe('2026-10-11T02:30:00.000Z')
  })

  it('parses USGS OGC (°C) and falls back to legacy IV preferring the TOP sensor', async () => {
    const ogc = await refreshLive('usgs:02136371', {
      force: true,
      fetchImpl: ok({ features: [{ properties: { value: '23.7', unit_of_measure: 'degC', time: '2026-10-11T02:15:00+00:00' } }] }),
    })
    expect(ogc.tempF).toBe(74.7)

    let call = 0
    const legacy = await refreshLive('usgs:02168500', {
      force: true,
      fetchImpl: async () => {
        call++
        if (call === 1) return { ok: true, json: async () => ({ features: [] }) }
        return {
          ok: true,
          json: async () => ({
            value: {
              timeSeries: [
                { values: [
                  { method: [{ methodDescription: 'BOTTOM' }], value: [{ value: '15.0', dateTime: '2026-10-11T02:00:00.000-04:00' }] },
                  { method: [{ methodDescription: 'TOP' }], value: [{ value: '22.0', dateTime: '2026-10-11T01:45:00.000-04:00' }] },
                ] },
              ],
            },
          }),
        }
      },
    })
    expect(legacy.tempF).toBe(71.6) // TOP sensor wins
  })

  it('keeps the last good reading when a fetch fails, and flags stale readings', async () => {
    const r = await refreshLive('coops:8661070', { force: true, fetchImpl: async () => ({ ok: false, status: 503 }) })
    expect(r.tempF).toBe(75.6) // from the earlier test's cache
    expect(r.error).toMatch(/503/)
    expect(isFresh({ tempF: 70, at: Date.now() - 2 * 864e5 })).toBe(false)
    expect(isFresh({ tempF: 70, at: Date.now() - 3600e3 })).toBe(true)
  })
})
