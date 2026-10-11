// ---------------------------------------------------------------------------
// "Best times to fish" for one day at one spot.
//
// Scores every 15 minutes from 0–100 using only factors with real evidence
// behind them (details + sources in src/data/science.js):
//
//   Saltwater:  tide movement 55% · low light (dawn/dusk) 45%
//   Freshwater: low light 100%. Lakes have no tides, and the other strong
//               factor (water temperature) has to be measured on site.
//
// Tide movement = how fast the water is moving (estimated from NOAA highs
// and lows). Moving water pushes bait around; slack water is usually dead.
// Low light = the 75 min either side of sunrise and sunset, when most
// predators feed hardest.
//
// Solunar major/minor periods were removed in Oct 2026: controlled studies
// found no link to catch rates.
//
// Then the best non-overlapping 90-minute blocks are picked as "windows"
// (3 for salt, 2 for fresh: dawn and dusk), each with plain-English reasons.
// Windows only START between 5 AM and 9 PM ("family hours"): night current is
// real, but a 4 AM suggestion isn't useful with kids. The timeline still
// shows the full 24 hours.
// ---------------------------------------------------------------------------
import { lightPeriodAt, dayBounds } from './sunmoon.js'
import { rateAt, stageAt, STAGE_LABEL } from './tides.js'

const STEP = 15 * 60 * 1000
const WINDOW_STEPS = 6 // 6 × 15 min = 90-minute windows
const FIRST_START_HOUR = 5 // earliest window start (5 AM)
const LAST_START_HOUR = 21 // latest window start (9 PM)

export const WEIGHTS = {
  salt: { tide: 0.55, light: 0.45 },
  fresh: { tide: 0, light: 1 },
}

function lightScore(t, day) {
  const p = lightPeriodAt(t, day)
  if (p === 'dawn' || p === 'dusk') return 1
  if (p === 'night') return 0.4 // plenty of pier/dock fish feed at night under lights
  // midday: taper from 0.6 in the hour after the dawn window to 0.25 at solar noon
  const mid = (day.sunrise.getTime() + day.sunset.getTime()) / 2
  const half = (day.sunset.getTime() - day.sunrise.getTime()) / 2
  const frac = Math.abs(t - mid) / half // 0 at noon → 1 at sunrise/sunset
  return 0.25 + 0.35 * frac
}

/**
 * @param {object} day     result of sunDay()
 * @param {'salt'|'fresh'} water
 * @param {Array|null} preds  cached NOAA predictions (salt spots), or null
 * @returns {{slots:Array, windows:Array, usedTides:boolean}}
 */
export function scoreDay(day, water, preds) {
  const { start, end } = dayBounds(day.date)
  const haveTides = water === 'salt' && Array.isArray(preds) && preds.length > 0
  // A salt spot with no tide data cached falls back to light only.
  const w = haveTides ? WEIGHTS.salt : WEIGHTS.fresh

  // Peak tide speed for the day so the tide factor is relative (0–1).
  let maxRate = 0
  if (haveTides) {
    for (let t = start.getTime(); t < end.getTime(); t += STEP) {
      const r = rateAt(preds, t)
      if (r != null) maxRate = Math.max(maxRate, Math.abs(r))
    }
  }

  const slots = []
  for (let t = start.getTime(); t < end.getTime(); t += STEP) {
    const light = lightScore(t, day)
    let tide = 0
    if (haveTides && maxRate > 0) {
      const r = rateAt(preds, t)
      tide = r == null ? 0 : Math.abs(r) / maxRate
    }
    const score = Math.round(100 * (w.tide * tide + w.light * light))
    slots.push({ t, score, light, tide })
  }

  // Pick the best non-overlapping 90-minute blocks.
  const howMany = haveTides ? 3 : 2
  const familyHours = (t) => {
    const h = new Date(t).getHours()
    return h >= FIRST_START_HOUR && h < LAST_START_HOUR
  }
  const sums = slots.map((slot, i) =>
    i + WINDOW_STEPS <= slots.length && familyHours(slot.t)
      ? slots.slice(i, i + WINDOW_STEPS).reduce((s, x) => s + x.score, 0) / WINDOW_STEPS
      : -1,
  )
  const taken = new Array(slots.length).fill(false)
  const windows = []
  const order = sums.map((s, i) => [s, i]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])
  for (const [avg, i] of order) {
    if (windows.length >= howMany) break
    if (taken.slice(i, i + WINDOW_STEPS).some(Boolean)) continue
    for (let k = i; k < i + WINDOW_STEPS; k++) taken[k] = true
    const s = slots[i].t
    const e = s + WINDOW_STEPS * STEP
    windows.push({
      start: new Date(s),
      end: new Date(e),
      score: Math.round(avg),
      reasons: explain(s, e, day, haveTides ? preds : null),
    })
  }
  windows.sort((a, b) => b.score - a.score)
  return { slots, windows, usedTides: haveTides }
}

function explain(s, e, day, preds) {
  const mid = (s + e) / 2
  const out = []
  const light = lightPeriodAt(mid, day)
  if (light === 'dawn') out.push('Dawn low light')
  else if (light === 'dusk') out.push('Dusk low light')
  else if (light === 'night') out.push('Night (fish lights, bottom baits)')
  if (preds) {
    const st = stageAt(preds, mid)
    if (st) out.push(`${STAGE_LABEL[st.stage]}${st.stage.startsWith('slack') ? '' : `, ${st.pct}% through`}`)
  }
  return out
}
