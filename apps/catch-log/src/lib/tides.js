// ---------------------------------------------------------------------------
// Tides: download NOAA high/low predictions ONCE (one year per station) while
// you have signal, store them in IndexedDB, then everything works offline.
//
// NOAA CO-OPS API (free, no key, CORS-enabled):
//   https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
//     ?product=predictions&interval=hilo&datum=MLLW&units=english
//     &time_zone=gmt&format=json&station=<id>&begin_date=YYYYMMDD&end_date=YYYYMMDD
// We ask for GMT so daylight-saving changes can't shift anything; the phone
// converts to local time for display.
//
// Between published highs/lows we estimate the curve with cosine
// interpolation. That's how most tide apps draw the curve; good to a few
// inches and ~10 minutes, which is plenty for picking a fishing window.
// ---------------------------------------------------------------------------
import { db } from './db.js'

const API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const DAY = 24 * 60 * 60 * 1000
const REFRESH_WHEN_DAYS_LEFT = 60 // re-download when < 60 days of data remain

function ymd(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
}

/** Parse NOAA's "2026-10-11 02:17" (GMT) → epoch ms. */
export function parseNoaaGmt(s) {
  const [date, time] = s.split(' ')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, hh, mm)
}

export function noaaUrl(stationId, begin, end) {
  const q = new URLSearchParams({
    product: 'predictions',
    application: 'catch-log',
    station: stationId,
    begin_date: ymd(begin),
    end_date: ymd(end),
    datum: 'MLLW',
    interval: 'hilo',
    units: 'english',
    time_zone: 'gmt',
    format: 'json',
  })
  return `${API}?${q}`
}

/** Download ~1 year (from 2 days ago) of hi/lo predictions and cache them. */
export async function downloadTides(stationId, fetchImpl = fetch) {
  const begin = new Date(Date.now() - 2 * DAY)
  const end = new Date(Date.now() + 364 * DAY)
  const res = await fetchImpl(noaaUrl(stationId, begin, end))
  if (!res.ok) throw new Error(`NOAA returned ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'NOAA error')
  const predictions = (json.predictions || []).map((p) => ({
    t: parseNoaaGmt(p.t),
    v: Number(p.v),
    type: p.type, // 'H' or 'L'
  }))
  if (!predictions.length) throw new Error('No predictions returned')
  const row = {
    stationId,
    fetchedAt: Date.now(),
    from: predictions[0].t,
    to: predictions[predictions.length - 1].t,
    predictions,
  }
  await db.tides.put(row)
  return row
}

export async function getCachedTides(stationId) {
  if (!stationId) return null
  return (await db.tides.get(stationId)) || null
}

export function needsRefresh(row) {
  if (!row) return true
  return row.to - Date.now() < REFRESH_WHEN_DAYS_LEFT * DAY
}

/**
 * Make sure every station in `stationIds` has fresh data. Silently skips when
 * offline. Returns { updated: [...], failed: [...] }.
 */
export async function refreshStations(stationIds, { force = false, fetchImpl = fetch } = {}) {
  const updated = []
  const failed = []
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { updated, failed, offline: true }
  for (const id of [...new Set(stationIds.filter(Boolean))]) {
    try {
      const row = await getCachedTides(id)
      if (force || needsRefresh(row)) {
        await downloadTides(id, fetchImpl)
        updated.push(id)
      }
    } catch (e) {
      failed.push({ id, error: String(e.message || e) })
    }
  }
  return { updated, failed }
}

// --- math on a predictions array (pure functions, unit-tested) --------------

/** Index of the last prediction at or before t (-1 if none). */
function idxBefore(preds, t) {
  let lo = 0
  let hi = preds.length - 1
  if (!preds.length || t < preds[0].t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (preds[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Estimated tide height (ft, MLLW) at time t; null if outside cached range. */
export function heightAt(preds, t) {
  const i = idxBefore(preds, t)
  if (i < 0 || i >= preds.length - 1) return null
  const a = preds[i]
  const b = preds[i + 1]
  const f = (t - a.t) / (b.t - a.t)
  return a.v + (b.v - a.v) * (1 - Math.cos(Math.PI * f)) / 2
}

/** Rate of change (ft per hour). Positive = rising/incoming. */
export function rateAt(preds, t) {
  const i = idxBefore(preds, t)
  if (i < 0 || i >= preds.length - 1) return null
  const a = preds[i]
  const b = preds[i + 1]
  const span = b.t - a.t
  const f = (t - a.t) / span
  const perMs = ((b.v - a.v) * Math.PI * Math.sin(Math.PI * f)) / (2 * span)
  return perMs * 60 * 60 * 1000
}

/**
 * Tide stage at time t.
 * @returns {{stage:'incoming'|'outgoing'|'slack-high'|'slack-low', pct:number, next:object}|null}
 *   pct = how far (0–100) through the current rise/fall.
 *   "slack" = within 30 min of a high or low.
 */
export function stageAt(preds, t) {
  const i = idxBefore(preds, t)
  if (i < 0 || i >= preds.length - 1) return null
  const a = preds[i]
  const b = preds[i + 1]
  const SLACK = 30 * 60 * 1000
  const pct = Math.round(((t - a.t) / (b.t - a.t)) * 100)
  if (t - a.t <= SLACK) return { stage: a.type === 'H' ? 'slack-high' : 'slack-low', pct, prev: a, next: b }
  if (b.t - t <= SLACK) return { stage: b.type === 'H' ? 'slack-high' : 'slack-low', pct, prev: a, next: b }
  return { stage: b.v > a.v ? 'incoming' : 'outgoing', pct, prev: a, next: b }
}

/** Highs/lows that fall inside [start, end). */
export function extremesBetween(preds, start, end) {
  const s = start.getTime()
  const e = end.getTime()
  return preds.filter((p) => p.t >= s && p.t < e)
}

export const STAGE_LABEL = {
  incoming: 'Incoming (rising)',
  outgoing: 'Outgoing (falling)',
  'slack-high': 'Slack high',
  'slack-low': 'Slack low',
}
