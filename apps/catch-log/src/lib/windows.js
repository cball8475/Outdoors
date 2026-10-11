// ---------------------------------------------------------------------------
// "Best times to fish" for one day at one spot.
//
// Scores every 15 minutes from 0–100 using factors you can see, weighted by how
// good the evidence is (details + sources in src/data/science.js):
//
//   Saltwater: tide movement 45% · low light (dawn/dusk) 35% · solunar 20%
//   Freshwater: low light 75% · solunar 25%
//
// Tide movement = how fast the water is moving (estimated from NOAA highs
// and lows). Moving water pushes bait around, and slack water is usually dead. Low
// light = the 75 min either side of sunrise and sunset, when most predators
// feed hardest. Solunar gets the smallest weight because peer-reviewed tests
// mostly don't support it.
//
// Then the best non-overlapping 90-minute blocks are picked as "windows",
// each with plain-English reasons.
// ---------------------------------------------------------------------------
import { solunarAt, lightPeriodAt, dayBounds } from './solunar.js'
import { rateAt, stageAt, STAGE_LABEL } from './tides.js'

const STEP = 15 * 60 * 1000
const WINDOW_STEPS = 6 // 6 × 15 min = 90-minute windows

export const WEIGHTS = {
  salt: { tide: 0.45, light: 0.35, solunar: 0.2 },
  fresh: { tide: 0, light: 0.75, solunar: 0.25 },
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

function solunarScore(t, day) {
  const p = solunarAt(t, day)
  if (!p) return 0
  return p.kind === 'major' ? 1 : 0.7
}

/**
 * @param {object} day     result of solunarDay()
 * @param {'salt'|'fresh'} water
 * @param {Array|null} preds  cached NOAA predictions (salt spots), or null
 * @returns {{slots:Array, windows:Array, usedTides:boolean}}
 */
export function scoreDay(day, water, preds) {
  const { start, end } = dayBounds(day.date)
  const haveTides = water === 'salt' && Array.isArray(preds) && preds.length > 0
  // If a salt spot has no tide data cached, fall back to freshwater weights.
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
    const sol = solunarScore(t, day)
    let tide = 0
    if (haveTides && maxRate > 0) {
      const r = rateAt(preds, t)
      tide = r == null ? 0 : Math.abs(r) / maxRate
    }
    const score = Math.round(100 * (w.tide * tide + w.light * light + w.solunar * sol))
    slots.push({ t, score, light, sol, tide })
  }

  // Pick the best non-overlapping 90-minute blocks.
  const sums = slots.map((_, i) =>
    i + WINDOW_STEPS <= slots.length
      ? slots.slice(i, i + WINDOW_STEPS).reduce((s, x) => s + x.score, 0) / WINDOW_STEPS
      : -1,
  )
  const taken = new Array(slots.length).fill(false)
  const windows = []
  const order = sums.map((s, i) => [s, i]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])
  for (const [avg, i] of order) {
    if (windows.length >= 3) break
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
  const p = solunarAt(mid, day) || solunarAt(s, day) || solunarAt(e, day)
  if (p) out.push(`Solunar ${p.kind} (${p.label.toLowerCase()})`)
  return out
}
