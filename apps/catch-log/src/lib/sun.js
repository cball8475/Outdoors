// ---------------------------------------------------------------------------
// Sun times, computed 100% offline (SunCalc). No internet needed.
//   • First light / sunrise / sunset / last light → the dawn and dusk
//     feeding windows (moderate evidence; see src/data/science.js).
//
// No moon/solunar data (removed Oct 2026: controlled studies found no link
// to catch rates). The moon's one real effect, tide size, is measured from
// NOAA tide data in tides.js, and water temperature (the strongest factor)
// comes from live sensors + normals in watertemp.js.
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

/**
 * Sun times for one day at one spot.
 * @param {Date|string} day  any time on that day, or 'YYYY-MM-DD'
 */
export function sunDay(day, lat, lon) {
  const noon = noonOf(day)
  const sun = SunCalc.getTimes(noon, lat, lon)
  return {
    date: noon,
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    firstLight: sun.dawn, // civil twilight start
    lastLight: sun.dusk, // civil twilight end
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
