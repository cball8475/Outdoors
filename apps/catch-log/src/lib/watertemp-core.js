// ---------------------------------------------------------------------------
// Water temp: pure helpers (no browser APIs), usable from Node scripts and
// tests: °C→°F, spot→sensor mapping, normal-for-date interpolation, and how
// a temperature suits a species. Live fetching + caching is in watertemp.js.
// ---------------------------------------------------------------------------
import { WT_SOURCES, WT_FALLBACK, SPOT_WT } from '../data/watertemp.js'

export const cToF = (c) => Math.round((c * 9) / 5 * 10 + 320) / 10

/** Which sensor + relation for a spot (built-in mapping, or nearest for custom spots). */
export function sourceForSpot(spot) {
  if (!spot) return null
  const m = SPOT_WT[spot.key]
  if (m) return { ...m, source: WT_SOURCES[m.src], key: m.src, miles: miles(spot, WT_SOURCES[m.src]) }
  // custom spot: nearest sensor of a sensible kind (salt → coastal, fresh → inland)
  const pool = Object.entries(WT_SOURCES).filter(([, s]) =>
    spot.water === 'salt' ? s.kind === 'coops' || /River \/|Sampit|Cooper/.test(s.water) : s.kind === 'usgs' && !/Sampit|Cooper/.test(s.water),
  )
  let best = null
  for (const [key, s] of pool) {
    const d = miles(spot, s)
    if (!best || d < best.miles) best = { src: key, key, source: s, miles: d }
  }
  if (!best) return null
  return { ...best, relation: best.miles < 3 ? 'at' : 'proxy' }
}

function miles(a, b) {
  if (!a || !b) return null
  const R = 3958.8
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/**
 * Normal water temp (°F) for a date: monthly means treated as mid-month
 * values, linearly interpolated. Missing months use the fallback source.
 */
export function normalFor(sourceKey, date = new Date()) {
  const src = WT_SOURCES[sourceKey]
  if (!src) return null
  const fb = WT_SOURCES[WT_FALLBACK]
  const val = (m) => src.normals[(m + 12) % 12] ?? fb.normals[(m + 12) % 12]
  const d = new Date(date)
  const m = d.getMonth()
  const day = d.getDate()
  const dim = new Date(d.getFullYear(), m + 1, 0).getDate()
  const mid = (dim + 1) / 2
  let a, b, f
  if (day >= mid) {
    a = val(m)
    b = val(m + 1)
    f = (day - mid) / dim
  } else {
    a = val(m - 1)
    b = val(m)
    const prevDim = new Date(d.getFullYear(), m, 0).getDate()
    f = (day + prevDim - (prevDim + 1) / 2) / prevDim
  }
  return Math.round((a + (b - a) * f) * 10) / 10
}

/**
 * How a water temp suits a species.
 * @returns {{level:'prime'|'active'|'slow', label:string}|null}
 */
export function tempFit(species, tempF) {
  const t = species?.temp
  if (!t || tempF == null) return null
  if (tempF >= t.best[0] && tempF <= t.best[1]) return { level: 'prime', label: 'Prime temp' }
  if (tempF >= t.active[0] && tempF <= t.active[1]) return { level: 'active', label: 'Active' }
  return { level: 'slow', label: tempF < t.active[0] ? 'Too cold: slow bite' : 'Too warm: slow bite' }
}

export function fmtAgo(ms, now = Date.now()) {
  const m = Math.round((now - ms) / 60000)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} hr ago`
  return `${Math.round(h / 24)} days ago`
}
