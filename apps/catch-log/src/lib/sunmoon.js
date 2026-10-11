// ---------------------------------------------------------------------------
// Sun times + moon phase, computed 100% offline (SunCalc). No internet needed.
//
// What's here and why:
//   • Sunrise / sunset / first + last light → the dawn and dusk feeding
//     windows (moderate evidence; see src/data/science.js).
//   • Moon phase → ONLY as a fallback hint for tide size when no NOAA data
//     is cached: new + full moons make bigger "spring" tides with faster
//     current; quarter moons make smaller "neap" tides.
//
// What's NOT here (removed Oct 2026): solunar major/minor periods and the
// solunar day rating. Controlled studies found no link to catch rates, so
// they were cluttering the screen without helping you catch fish.
// ---------------------------------------------------------------------------
import * as SunCalc from 'suncalc'

const MIN = 60 * 1000

/** Local noon for a 'YYYY-MM-DD' string (or a Date): a safe anchor for "that day". */
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

/** Days from the nearest new or full moon (0 = on it). SunCalc phase: 0 new, 0.5 full. */
export function daysFromNewOrFull(phase) {
  const synodic = 29.530588
  return Math.min(Math.min(phase, 1 - phase), Math.abs(phase - 0.5)) * synodic
}

/**
 * Moon-based tide-size hint (fallback when there's no NOAA data).
 * Spring tides run ~1–2 days after new/full moon.
 */
export function moonTideHint(phase) {
  const d = daysFromNewOrFull(phase)
  if (d <= 3) return { size: 'big', label: 'Bigger tides (near new/full moon): stronger current' }
  if (d >= 5) return { size: 'small', label: 'Smaller tides (quarter moon): gentler current' }
  return { size: 'average', label: 'Average tides' }
}

/**
 * Everything the Times screen needs about the sky for one day at one spot.
 * @param {Date|string} day  any time on that day, or 'YYYY-MM-DD'
 */
export function sunDay(day, lat, lon) {
  const noon = noonOf(day)
  const sun = SunCalc.getTimes(noon, lat, lon)
  const phase = SunCalc.getMoonIllumination(noon).phase
  return {
    date: noon,
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    firstLight: sun.dawn, // civil twilight start
    lastLight: sun.dusk, // civil twilight end
    moonTide: moonTideHint(phase),
  }
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
