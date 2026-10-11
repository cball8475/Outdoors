// ---------------------------------------------------------------------------
// Photo + GPS capture.
//
// GPS: the phone's GPS chip works with NO cell signal or Wi-Fi; the browser
// just asks it for a fix. First fix can take 10–30 s in the open.
//
// Photos: we keep a resized copy (max 1600 px, ~250–400 KB) plus a small
// thumbnail, so 1,000 catches ≈ 400 MB on the phone, not 4 GB.
// If the photo still carries GPS/time in its EXIF data (camera photos picked
// from the gallery sometimes do; Android often strips location), we use it,
// so logging a catch at home from a gallery photo still records the
// right place and time.
// ---------------------------------------------------------------------------
// 'lite' build: reads the EXIF + GPS blocks of phone photos; smaller than the full build
import exifr from 'exifr/dist/lite.esm.mjs'

/** Current position or null (never throws). */
export function getPosition({ timeout = 20000 } = {}) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: Math.round(p.coords.latitude * 1e6) / 1e6,
          lon: Math.round(p.coords.longitude * 1e6) / 1e6,
          accuracy: Math.round(p.coords.accuracy),
          at: p.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
}

async function readExif(file) {
  try {
    const x = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'latitude', 'longitude'] })
    if (!x) return null
    const out = {}
    if (typeof x.latitude === 'number' && typeof x.longitude === 'number') {
      out.lat = Math.round(x.latitude * 1e6) / 1e6
      out.lon = Math.round(x.longitude * 1e6) / 1e6
    }
    if (x.DateTimeOriginal instanceof Date && !isNaN(x.DateTimeOriginal)) out.takenAt = x.DateTimeOriginal.toISOString()
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

async function resize(file, maxPx, quality) {
  // imageOrientation keeps portrait phone photos upright
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxPx / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
}

/** → { blob, thumb, exif } */
export async function processPhoto(file) {
  const [exif, blob, thumb] = await Promise.all([
    readExif(file),
    resize(file, 1600, 0.82),
    resize(file, 360, 0.7),
  ])
  return { blob, thumb, exif }
}
