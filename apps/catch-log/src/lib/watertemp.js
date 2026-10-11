// ---------------------------------------------------------------------------
// Water temperature: live sensor readings (when online) + offline normals.
//
// "How do I check the water from home?"  The app pulls the latest reading
// from the spot's sensor (NOAA pier sensor or USGS gauge, updated every
// 6–15 min) whenever the phone has signal, and keeps the last reading so you
// can still see it at the pier. For a trip days away, compare the live
// reading with the normal: if the water is running 4°F above normal today,
// it'll usually still be above normal in a few days (water changes slowly).
//
// The water temp itself is the strongest single factor for where fish are
// and how hard they feed (see src/data/science.js).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db.js'
import { WT_SOURCES } from '../data/watertemp.js'
import { cToF, sourceForSpot, normalFor } from './watertemp-core.js'

export { cToF, sourceForSpot, normalFor, tempFit, fmtAgo } from './watertemp-core.js'

const MAX_AGE_MS = 24 * 3600e3 // older than this = sensor considered offline
const REFRESH_MS = 30 * 60e3 // re-fetch at most every 30 min

// --- live fetch ---------------------------------------------------------------

async function fetchCoops(id, fetchImpl) {
  const url =
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&date=latest' +
    `&station=${id}&units=english&time_zone=gmt&format=json&application=catch-log`
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`NOAA ${res.status}`)
  const j = await res.json()
  const r = j.data?.[0]
  if (!r || r.v === '' || r.v == null) throw new Error(j.error?.message || 'no reading')
  const [date, time] = r.t.split(' ')
  return { tempF: Number(r.v), at: Date.parse(`${date}T${time}:00Z`) }
}

/** USGS: new OGC API first, legacy Water Services as fallback. */
async function fetchUsgs(id, fetchImpl) {
  try {
    const url =
      'https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json' +
      `&monitoring_location_id=USGS-${id}&parameter_code=00010`
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`USGS ${res.status}`)
    const j = await res.json()
    const rows = (j.features || [])
      .map((f) => f.properties)
      .filter((p) => p && p.value != null && Number(p.value) > -50)
      .map((p) => ({ tempF: p.unit_of_measure === 'degF' ? Number(p.value) : cToF(Number(p.value)), at: Date.parse(p.time) }))
      .sort((a, b) => b.at - a.at)
    if (rows.length) return rows[0]
    throw new Error('no reading')
  } catch {
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${id}&parameterCd=00010`
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`USGS ${res.status}`)
    const j = await res.json()
    const out = []
    for (const ts of j.value?.timeSeries || []) {
      for (const block of ts.values || []) {
        const method = (block.method?.[0]?.methodDescription || '').toUpperCase()
        const last = block.value?.[block.value.length - 1]
        if (!last || Number(last.value) < -50) continue
        out.push({ tempF: cToF(Number(last.value)), at: Date.parse(last.dateTime), top: method === 'TOP' })
      }
    }
    out.sort((a, b) => (b.top - a.top) || (b.at - a.at))
    if (out.length) return { tempF: out[0].tempF, at: out[0].at }
    throw new Error('no reading')
  }
}

/** Fetch + cache the latest reading for a source. Returns the cached row. */
export async function refreshLive(sourceKey, { fetchImpl = fetch, force = false } = {}) {
  const src = WT_SOURCES[sourceKey]
  if (!src) return null
  const cacheKey = `wt:${sourceKey}`
  const cached = (await db.settings.get(cacheKey))?.value || null
  if (!force && cached && Date.now() - cached.fetchedAt < REFRESH_MS) return cached
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return cached
  try {
    const r = src.kind === 'coops' ? await fetchCoops(src.id, fetchImpl) : await fetchUsgs(src.id, fetchImpl)
    const row = { ...r, fetchedAt: Date.now() }
    await db.settings.put({ key: cacheKey, value: row })
    return row
  } catch (e) {
    const row = { ...(cached || {}), error: String(e.message || e), fetchedAt: Date.now() }
    await db.settings.put({ key: cacheKey, value: row })
    return row
  }
}

/** Is a cached reading fresh enough to call "live"? */
export function isFresh(row, now = Date.now()) {
  return !!row && typeof row.tempF === 'number' && now - row.at <= MAX_AGE_MS
}

/**
 * Everything a screen needs about water temp at a spot for a date.
 * { info: sourceForSpot(), normal, live (fresh cached reading or null),
 *   stale (old reading), diff (live − today's normal), best (live or normal) }
 */
export function useWaterTemp(spot, date = null) {
  const info = sourceForSpot(spot)
  const key = info?.key
  const row = useLiveQuery(() => (key ? db.settings.get(`wt:${key}`).then((r) => r?.value || null) : null), [key])
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!key) return
    refreshLive(key).then(() => setTick((t) => t + 1)).catch(() => {})
    const on = () => refreshLive(key, { force: true }).catch(() => {})
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [key])
  if (!info) return { info: null }
  // 'YYYY-MM-DD' must mean LOCAL noon (new Date('2026-10-10') is UTC midnight = the evening before in SC)
  const when = !date ? new Date() : typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00`) : new Date(date)
  const normal = normalFor(key, when)
  const todayNormal = normalFor(key, new Date())
  const live = isFresh(row) ? row : null
  const stale = !live && row && typeof row.tempF === 'number' ? row : null
  const diff = live ? Math.round((live.tempF - todayNormal) * 10) / 10 : null
  const isToday = new Date(when).toDateString() === new Date().toDateString()
  return { info, normal, live, stale, diff, best: isToday && live ? live.tempF : normal, isToday, tick }
}

