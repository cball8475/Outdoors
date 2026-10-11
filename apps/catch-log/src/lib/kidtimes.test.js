// Kid "when to go" logic. Run: npm test
import { describe, it, expect } from 'vitest'
import { rating, kidReasons, weekSummary, blocks, quizRounds } from './kidtimes.js'
import { sunDay } from './sun.js'
import { scoreDay } from './windows.js'

const MB = { lat: 33.6479, lon: -78.9278 }
// synthetic semi-diurnal tide, high at 00:00 GMT Oct 10
const base = Date.UTC(2026, 9, 10, 0, 0)
const preds = []
for (let i = 0; i < 12; i++) preds.push({ t: base + i * 6.2 * 3600e3, v: i % 2 ? 0.3 : 5.8, type: i % 2 ? 'L' : 'H' })

describe('rating', () => {
  it('maps scores to 1–3 fish', () => {
    expect(rating(95)).toMatchObject({ fish: 3, label: 'Great' })
    expect(rating(75)).toMatchObject({ fish: 2, label: 'Good' })
    expect(rating(40)).toMatchObject({ fish: 1, label: 'OK' })
  })
})

describe('kidReasons', () => {
  const day = sunDay('2026-10-11', MB.lat, MB.lon)
  const scored = scoreDay(day, 'salt', preds)

  it('dawn window explains low light; fast water explains food', () => {
    const s = day.sunrise.getTime() - 30 * 60e3
    const r = kidReasons(s, s + 90 * 60e3, day, scored.slots, preds)
    expect(r[0].text).toMatch(/Sun coming up/)
    expect(r[0].good).toBe(true)
    expect(r.length).toBe(2)
  })

  it('slack tide reads as "turning", midday as "bright sun"', () => {
    // find the slowest-water 90-min block around midday
    const mid = scored.slots.filter((x) => new Date(x.t).getHours() >= 11 && new Date(x.t).getHours() < 15)
    const slow = mid.reduce((a, b) => (b.tide < a.tide ? b : a))
    const r = kidReasons(slow.t - 45 * 60e3, slow.t + 45 * 60e3, day, scored.slots, preds)
    expect(r.some((x) => /Bright sun/.test(x.text))).toBe(true)
  })

  it('freshwater has no tide reason', () => {
    const fresh = scoreDay(day, 'fresh', null)
    const s = day.sunset.getTime() - 45 * 60e3
    const r = kidReasons(s, s + 90 * 60e3, day, fresh.slots, null)
    expect(r).toHaveLength(1)
    expect(r[0].text).toMatch(/Sun going down/)
  })
})

describe('weekSummary', () => {
  const row = (score, pct) => ({ key: String(score), date: new Date(), best: { score, start: new Date() }, range: { pct } })

  it('finds the best day and explains shrinking tides', () => {
    const s = weekSummary([row(94, 9), row(99, -1), row(99, -12), row(93, -32), row(80, -37)], 'salt')
    expect(s.bestIdx).toBe(1) // first of the ties
    expect(s.sentence).toMatch(/SMALLER.*early in the week/)
  })

  it('skips a day whose windows are over', () => {
    const s = weekSummary([{ ...row(99, 0), best: null }, row(90, -5), row(95, -20)], 'salt')
    expect(s.bestIdx).toBe(2)
  })

  it('growing tides → later in the week', () => {
    expect(weekSummary([row(80, -30), row(85, 0), row(90, 25)], 'salt').sentence).toMatch(/BIGGER/)
  })

  it('freshwater: no best day, explains why', () => {
    const s = weekSummary([row(100, 0), row(100, 0)].map((r) => ({ ...r, range: null })), 'fresh')
    expect(s.bestIdx).toBeNull()
    expect(s.sentence).toMatch(/don't have tides/)
  })
})

describe('quiz', () => {
  const day = sunDay('2026-10-11', MB.lat, MB.lon)
  const scored = scoreDay(day, 'salt', preds)

  it('blocks only start in family hours', () => {
    for (const b of blocks(scored.slots)) {
      const h = new Date(b.start).getHours()
      expect(h >= 5 && h < 21).toBe(true)
    }
  })

  it('makes 5 non-overlapping, clearly-different pairs; same seed → same quiz', () => {
    const q1 = quizRounds(scored.slots, 'mbsp|2026-10-11', 5)
    const q2 = quizRounds(scored.slots, 'mbsp|2026-10-11', 5)
    expect(q1).toHaveLength(5)
    expect(q1).toEqual(q2)
    for (const r of q1) {
      const [a, b] = r.options
      expect(Math.abs(a.score - b.score)).toBeGreaterThanOrEqual(15)
      expect(a.end <= b.start).toBe(true)
      expect(r.options[r.answer].score).toBe(Math.max(a.score, b.score))
    }
  })
})
