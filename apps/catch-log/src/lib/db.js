// ---------------------------------------------------------------------------
// Local database (IndexedDB via Dexie). Everything lives ON THE PHONE:
// nothing is sent to a server, which is why the app works with zero signal.
//
// Downside: clearing Chrome's site data or uninstalling the app wipes it.
// Use Settings → "Export backup" regularly (see src/lib/backup.js).
//
// Schema notes (Dexie syntax: first key = primary key, ++ = auto-increment,
// & = unique, * = multi-entry index):
//   anglers  – people who fish (Charlie is the default "me")
//   spots    – built-in spots are seeded from src/data/spots.js; custom ones
//              are added from the phone's GPS
//   trips    – a trip = one outing at one spot with a party of anglers
//   catches  – one row per fish; photo stored separately so lists stay fast
//   photos   – resized JPEG blob + thumbnail blob
//   tides    – cached NOAA high/low predictions per station (1 year at a time)
//   settings – simple key/value store
// ---------------------------------------------------------------------------
import Dexie from 'dexie'

export const db = new Dexie('catch-log')

db.version(1).stores({
  anglers: '++id, name, isDefault, archived',
  spots: '++id, &key, name, water, builtIn',
  trips: '++id, spotId, startedAt, endedAt',
  catches: '++id, tripId, anglerId, speciesId, caughtAt',
  photos: '++id',
  tides: 'stationId, fetchedAt',
  settings: 'key',
})

// --- settings helpers -------------------------------------------------------
export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

// --- anglers ----------------------------------------------------------------
export async function getDefaultAngler() {
  const all = await db.anglers.toArray()
  return all.find((a) => a.isDefault && !a.archived) || all.find((a) => !a.archived) || null
}

/** Make one angler the default ("me"); clears the flag on everyone else. */
export async function setDefaultAngler(id) {
  await db.transaction('rw', db.anglers, async () => {
    const all = await db.anglers.toArray()
    for (const a of all) {
      const want = a.id === id
      if (!!a.isDefault !== want) await db.anglers.update(a.id, { isDefault: want })
    }
  })
}

// --- trips ------------------------------------------------------------------
export async function getActiveTrip() {
  const open = await db.trips.filter((t) => !t.endedAt).toArray()
  open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return open[0] || null
}

/** Delete a catch and its photo. */
export async function deleteCatch(id) {
  await db.transaction('rw', db.catches, db.photos, async () => {
    const c = await db.catches.get(id)
    if (c?.photoId) await db.photos.delete(c.photoId)
    await db.catches.delete(id)
  })
}

/** Delete a trip, its catches, and their photos. */
export async function deleteTrip(id) {
  await db.transaction('rw', db.trips, db.catches, db.photos, async () => {
    const catches = await db.catches.where('tripId').equals(id).toArray()
    const photoIds = catches.map((c) => c.photoId).filter(Boolean)
    await db.photos.bulkDelete(photoIds)
    await db.catches.bulkDelete(catches.map((c) => c.id))
    await db.trips.delete(id)
  })
}

/**
 * Ask the browser not to evict our data under storage pressure.
 * Chrome on Android grants this automatically for installed PWAs.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* not supported – fine */
  }
  return false
}
