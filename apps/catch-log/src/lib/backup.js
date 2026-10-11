// ---------------------------------------------------------------------------
// Backup / restore / CSV.
//
// Your data only lives on this phone. Export a backup at least monthly and
// drop the file in Google Drive / Dropbox / email it to yourself. Photos are
// embedded in the backup, so it can get large (≈0.4 MB per photo).
// Tide predictions are NOT backed up; they re-download in seconds.
// ---------------------------------------------------------------------------
import { db } from './db.js'
import { SPECIES_BY_ID } from '../data/species.js'

const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(blob)
  })

const dataUrlToBlob = async (url) => (await fetch(url)).blob()

function download(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export async function exportBackup() {
  const [anglers, spots, trips, catches, settings, photos] = await Promise.all([
    db.anglers.toArray(),
    db.spots.toArray(),
    db.trips.toArray(),
    db.catches.toArray(),
    db.settings.toArray(),
    db.photos.toArray(),
  ])
  const photoRows = []
  for (const p of photos) {
    photoRows.push({
      id: p.id,
      blob: p.blob ? await blobToDataUrl(p.blob) : null,
      thumb: p.thumb ? await blobToDataUrl(p.thumb) : null,
    })
  }
  const data = {
    app: 'catch-log',
    version: 1,
    exportedAt: new Date().toISOString(),
    anglers,
    spots,
    trips,
    catches,
    settings,
    photos: photoRows,
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  download(blob, `catch-log-backup-${stamp()}.json`)
  await db.settings.put({ key: 'lastBackupAt', value: data.exportedAt })
  return { trips: trips.length, catches: catches.length, photos: photos.length, bytes: blob.size }
}

/** REPLACES everything on this phone with the backup's contents. */
export async function importBackup(file) {
  const data = JSON.parse(await file.text())
  if (data.app !== 'catch-log') throw new Error('Not a Catch Log backup file')
  const photos = []
  for (const p of data.photos || []) {
    photos.push({
      id: p.id,
      blob: p.blob ? await dataUrlToBlob(p.blob) : null,
      thumb: p.thumb ? await dataUrlToBlob(p.thumb) : null,
    })
  }
  await db.transaction('rw', [db.anglers, db.spots, db.trips, db.catches, db.settings, db.photos], async () => {
    for (const t of [db.anglers, db.spots, db.trips, db.catches, db.settings, db.photos]) await t.clear()
    await db.anglers.bulkPut(data.anglers || [])
    await db.spots.bulkPut(data.spots || [])
    await db.trips.bulkPut(data.trips || [])
    await db.catches.bulkPut(data.catches || [])
    await db.settings.bulkPut(data.settings || [])
    await db.photos.bulkPut(photos)
  })
  return { trips: (data.trips || []).length, catches: (data.catches || []).length }
}

const csvCell = (v) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCsv() {
  const [anglers, spots, trips, catches] = await Promise.all([
    db.anglers.toArray(),
    db.spots.toArray(),
    db.trips.toArray(),
    db.catches.toArray(),
  ])
  const A = Object.fromEntries(anglers.map((a) => [a.id, a]))
  const S = Object.fromEntries(spots.map((s) => [s.id, s]))
  const T = Object.fromEntries(trips.map((t) => [t.id, t]))
  const head = [
    'trip_id', 'trip_date', 'spot', 'water', 'angler', 'species', 'length_in', 'weight_lb',
    'released', 'caught_at', 'lat', 'lon', 'gps_source', 'light', 'tide', 'tide_pct',
    'water_temp_f', 'bait', 'notes',
  ]
  const rows = catches
    .sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))
    .map((c) => {
      const t = T[c.tripId] || {}
      const s = S[t.spotId] || {}
      return [
        c.tripId, (t.startedAt || '').slice(0, 10), s.name, s.water, A[c.anglerId]?.name,
        SPECIES_BY_ID[c.speciesId]?.name || c.speciesOther || 'Unknown', c.lengthIn, c.weightLb,
        c.kept ? 'no' : 'yes', c.caughtAt, c.lat, c.lon, c.gpsSource, c.cond?.light,
        c.cond?.tide, c.cond?.tidePct, c.waterTempF ?? t.waterTempF, c.bait, c.notes,
      ].map(csvCell).join(',')
    })
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' })
  download(blob, `catch-log-catches-${stamp()}.csv`)
  return rows.length
}
