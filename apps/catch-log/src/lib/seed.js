// Keeps the built-in spot list in the database in sync with src/data/spots.js.
// Runs at every app start: new spots get added, edited spots get updated,
// and your own custom spots are never touched.
import { db } from './db.js'
import { SPOTS } from '../data/spots.js'

export async function syncBuiltInSpots() {
  await db.transaction('rw', db.spots, async () => {
    for (const s of SPOTS) {
      const existing = await db.spots.where('key').equals(s.key).first()
      const row = { ...s, builtIn: true }
      if (existing) await db.spots.update(existing.id, row)
      else await db.spots.add(row)
    }
  })
}

/** All salt-spot tide stations (built-in + custom). */
export async function allTideStations() {
  const spots = await db.spots.toArray()
  return [...new Set(spots.filter((s) => s.water === 'salt' && s.tideStation).map((s) => s.tideStation))]
}

/** Nearest built-in salt spot's station, for a custom spot added from GPS. */
export function nearestStation(lat, lon) {
  let best = null
  let bestD = Infinity
  for (const s of SPOTS) {
    if (s.water !== 'salt' || !s.tideStation) continue
    const d = (s.lat - lat) ** 2 + ((s.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  // ~0.25° ≈ 17 miles: farther than that, the tide guess isn't trustworthy
  return best && Math.sqrt(bestD) < 0.25 ? best.tideStation : null
}
