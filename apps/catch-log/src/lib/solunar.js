// ---------------------------------------------------------------------------
// Sun + moon + solunar periods, computed 100% offline from astronomy math
// (SunCalc). No internet needed, ever.
//
// Solunar "theory" (John Alden Knight, 1926) as commonly published:
//   MAJOR periods ≈ 2 h centered on moon overhead (transit) and moon
//                   underfoot (lower transit)
//   MINOR periods ≈ 1 h centered on moonrise and moonset
//   Better days   ≈ near new / full moon, and when a period overlaps
//                   sunrise or sunset
//
// HONESTY NOTE: peer-reviewed tests are mixed-to-negative (see
// src/data/science.js). The app shows these periods because you asked for
// them and they cost nothing to compute, but the "best windows" scoring
// weights tide movement and low light more heavily.
// ---------------------------------------------------------------------------
import * as SunCalc from 'suncalc'

const MIN = 60 * 1000
const HOUR = 60 * MIN

export const MAJOR_HALF = 60 * MIN // 2-hour major period
export const MINOR_HALF = 30 * MIN // 1-hour minor period

/** Local noon for a 'YYYY-MM-DD' string (or a Date) – a safe anchor for "that day". */
export function noonOf(day) {
  if (day instanceof Date) {
    const d = new Date(day)
    d.setHours(12, 0, 0, 0)
    return d
  }
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function dayKey(date) {
  const d = new Date(date)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Start/end (local midnight → midnight) for the day containing `date`. */
export function dayBounds(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/** Human name for SunCalc's phase value (0 = new, 0.25 = first qtr, 0.5 = full, 0.75 = last qtr). */
export function phaseName(phase) {
  const names = [
    [0.0333, 'New Moon'],
    [0.2167, 'Waxing Crescent'],
    [0.2833, 'First Quarter'],
    [0.4667, 'Waxing Gibbous'],
    [0.5333, 'Full Moon'],
    [0.7167, 'Waning Gibbous'],
    [0.7833, 'Last Quarter'],
    [0.9667, 'Waning Crescent'],
    [1.0001, 'New Moon'],
  ]
  return names.find(([limit]) => phase < limit)[1]
}

export function phaseEmoji(phase) {
  const icons = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
  return icons[Math.round(phase * 8) % 8]
}

/** Days from the nearest new or full moon (0 = on it). */
export function daysFromNewOrFull(phase) {
  const synodic = 29.530588
  const toNew = Math.min(phase, 1 - phase) * synodic
  const toFull = Math.abs(phase - 0.5) * synodic
  return Math.min(toNew, toFull)
}

/** Collect moon events that fall inside [start, end) by checking the day before/of/after. */
function moonEventsInDay(start, end, lat, lon) {
  const events = { rise: [], set: [], transit: [], lowerTransit: [] }
  for (const offset of [-1, 0, 1]) {
    const probe = new Date(start)
    probe.setDate(probe.getDate() + offset)
    probe.setHours(12, 0, 0, 0)
    const t = SunCalc.getMoonTimes(probe, lat, lon)
    for (const k of Object.keys(events)) {
      const v = t[k]
      if (v instanceof Date && !isNaN(v) && v >= start && v < end) {
        if (!events[k].some((e) => Math.abs(e - v) < 30 * MIN)) events[k].push(v)
      }
    }
  }
  for (const k of Object.keys(events)) events[k].sort((a, b) => a - b)
  return events
}

/**
 * Everything the Times screen needs for one day at one spot.
 * @param {Date|string} day  any time on that day, or 'YYYY-MM-DD'
 */
export function solunarDay(day, lat, lon) {
  const noon = noonOf(day)
  const { start, end } = dayBounds(noon)
  const sun = SunCalc.getTimes(noon, lat, lon)
  const illum = SunCalc.getMoonIllumination(noon)
  const ev = moonEventsInDay(start, end, lat, lon)

  const periods = []
  for (const t of ev.transit) periods.push({ kind: 'major', label: 'Moon overhead', center: t, half: MAJOR_HALF })
  for (const t of ev.lowerTransit) periods.push({ kind: 'major', label: 'Moon underfoot', center: t, half: MAJOR_HALF })
  for (const t of ev.rise) periods.push({ kind: 'minor', label: 'Moonrise', center: t, half: MINOR_HALF })
  for (const t of ev.set) periods.push({ kind: 'minor', label: 'Moonset', center: t, half: MINOR_HALF })
  for (const p of periods) {
    p.start = new Date(p.center.getTime() - p.half)
    p.end = new Date(p.center.getTime() + p.half)
  }
  periods.sort((a, b) => a.center - b.center)

  // Traditional solunar day rating (0–4 fish). Folklore-grade; see note above.
  const dist = daysFromNewOrFull(illum.phase)
  let rating = dist <= 1 ? 3 : dist <= 3 ? 2 : dist <= 5 ? 1.5 : 1
  const nearSun = (t) =>
    [sun.sunrise, sun.sunset].some((s) => s && Math.abs(t - s) <= HOUR)
  if (periods.some((p) => nearSun(p.center))) rating += 1
  rating = Math.min(4, rating)

  return {
    date: noon,
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    dawn: sun.dawn, // civil twilight start
    dusk: sun.dusk, // civil twilight end
    moon: {
      phase: illum.phase,
      fraction: illum.fraction,
      name: phaseName(illum.phase),
      emoji: phaseEmoji(illum.phase),
      daysFromNewOrFull: dist,
      rise: ev.rise[0] || null,
      set: ev.set[0] || null,
    },
    periods,
    majors: periods.filter((p) => p.kind === 'major'),
    minors: periods.filter((p) => p.kind === 'minor'),
    rating,
  }
}

/** Which solunar period (if any) contains time t. Majors win over minors. */
export function solunarAt(t, day) {
  const time = new Date(t).getTime()
  const hit = day.periods.filter((p) => time >= p.start.getTime() && time <= p.end.getTime())
  return hit.find((p) => p.kind === 'major') || hit[0] || null
}

/** Light period for time t: 'dawn' | 'day' | 'dusk' | 'night'. Uses ±75 min of sunrise/sunset. */
export function lightPeriodAt(t, day) {
  const time = new Date(t).getTime()
  const win = 75 * MIN
  if (day.sunrise && Math.abs(time - day.sunrise.getTime()) <= win) return 'dawn'
  if (day.sunset && Math.abs(time - day.sunset.getTime()) <= win) return 'dusk'
  if (day.sunrise && day.sunset && time > day.sunrise.getTime() && time < day.sunset.getTime()) return 'day'
  return 'night'
}
