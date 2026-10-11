// Add your own spot from GPS (kept on the phone only, never in the repo).
// Spot browsing + spot pages live in Explore.jsx.
import { useState } from 'react'
import { db } from '../lib/db.js'
import { TopBar, Toggle, back, go } from '../components/ui.jsx'
import { getPosition } from '../lib/capture.js'
import { nearestStation } from '../lib/seed.js'
import { downloadTides } from '../lib/tides.js'

export function AddSpot() {
  const [name, setName] = useState('')
  const [water, setWater] = useState('fresh')
  const [pos, setPos] = useState(null)
  const [locating, setLocating] = useState(false)
  const [notes, setNotes] = useState('')

  async function locate() {
    setLocating(true)
    setPos(await getPosition())
    setLocating(false)
  }

  async function save() {
    const tideStation = water === 'salt' ? nearestStation(pos.lat, pos.lon) : null
    const id = await db.spots.add({
      key: `custom-${Date.now()}`,
      name: name.trim(),
      water,
      lat: pos.lat,
      lon: pos.lon,
      tideStation,
      builtIn: false,
      custom: true,
      tip: notes.trim(),
      targets: [],
      createdAt: new Date().toISOString(),
    })
    if (tideStation && navigator.onLine) downloadTides(tideStation).catch(() => {})
    go(`/spot/${id}`, { replace: true })
  }

  return (
    <>
      <TopBar title="New spot" onBack={() => back('/explore')} />
      <div className="page">
        <div className="alert info">Your own spots stay on this phone only. They never go into the public repo.</div>
        <div className="card stack">
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grandpa's dock" />
          </label>
          <Toggle value={water} onChange={setWater} options={[['fresh', '🏞️ Freshwater'], ['salt', '🌊 Saltwater']]} />
          <button onClick={locate} disabled={locating}>{locating ? 'Getting GPS fix…' : pos ? '📍 Update location' : '📍 Use my current location'}</button>
          {pos && (
            <small className="muted">
              {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)} (±{pos.accuracy} m)
              {water === 'salt' && (nearestStation(pos.lat, pos.lon) ? ` · tide station ${nearestStation(pos.lat, pos.lon)}` : ' · no NOAA station nearby')}
            </small>
          )}
          <label className="field">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parking, best tide, where the fish hold…" />
          </label>
        </div>
        <button className="btn-primary btn-big" disabled={!name.trim() || !pos} onClick={save}>Save spot</button>
      </div>
    </>
  )
}
