// ---------------------------------------------------------------------------
// Conditions snapshot stored WITH each catch (light period + tide stage) and
// the effort sampler used by Stats → Insights.
//
// Why store a snapshot: so months from now you can ask "do we really catch
// more on a falling tide / at dusk?" using your own data: catches per HOUR
// fished in each condition (CPUE), the same yardstick fisheries scientists use.
// ---------------------------------------------------------------------------
import { sunDay, lightPeriodAt, dayKey } from './sunmoon.js'
import { stageAt } from './tides.js'

const dayCache = new Map()
function dayFor(t, lat, lon) {
  const k = `${dayKey(t)}|${lat.toFixed(2)}|${lon.toFixed(2)}`
  if (!dayCache.has(k)) dayCache.set(k, sunDay(new Date(t), lat, lon))
  return dayCache.get(k)
}

/** Simplify tide stage into 3 buckets for stats. */
export function tideBucket(stage) {
  if (!stage) return null
  if (stage.startsWith('slack')) return 'slack'
  return stage // incoming | outgoing
}

/**
 * @param {number|string|Date} t
 * @param {{lat:number, lon:number}} where
 * @param {Array|null} preds  NOAA predictions for the spot's station (salt)
 */
export function conditionsAt(t, where, preds) {
  const time = new Date(t).getTime()
  const day = dayFor(time, where.lat, where.lon)
  const st = preds ? stageAt(preds, time) : null
  return {
    light: lightPeriodAt(time, day),
    tide: st ? tideBucket(st.stage) : null,
    tidePct: st ? st.pct : null,
  }
}

/**
 * Hours fished in each condition for one trip (sampled every 15 min).
 * @returns {{light:Object, tide:Object, hours:number}}
 */
export function effortForTrip(trip, where, preds) {
  const STEP = 15 * 60 * 1000
  const out = { light: {}, tide: {}, hours: 0 }
  const start = new Date(trip.startedAt).getTime()
  const end = new Date(trip.endedAt || Date.now()).getTime()
  if (!(end > start) || !where) return out
  for (let t = start; t < end; t += STEP) {
    const c = conditionsAt(t, where, preds)
    const h = Math.min(STEP, end - t) / 3600000
    out.hours += h
    out.light[c.light] = (out.light[c.light] || 0) + h
    if (c.tide) out.tide[c.tide] = (out.tide[c.tide] || 0) + h
  }
  return out
}
