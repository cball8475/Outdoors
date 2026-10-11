// Spots: researched public spots + your own GPS spots (kept on the phone only).
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { TopBar, Toggle, Empty, Stars, back, go } from '../components/ui.jsx'
import { SPOT_CLOSED, directionsUrl, fmtDrive } from '../data/spots.js'
import { SPECIES_BY_ID } from '../data/species.js'
import { getPosition } from '../lib/capture.js'
import { nearestStation } from '../lib/seed.js'
import { downloadTides } from '../lib/tides.js'

export function SpotList() {
  const [filter, setFilter] = useState('all')
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  if (!spots) return null
  const list = spots
    .filter((s) => filter === 'all' || s.water === filter || (filter === 'mine' && !s.builtIn))
    .sort((a, b) => (a.builtIn === b.builtIn ? (a.driveMin || 0) - (b.driveMin || 0) : a.builtIn ? 1 : -1))
  return (
    <>
      <TopBar title="Spots" right={<button aria-label="Add spot" onClick={() => go('/spot-new')}>＋</button>} />
      <div className="page">
        <Toggle value={filter} onChange={setFilter} options={[['all', 'All'], ['fresh', '🏞️ Fresh'], ['salt', '🌊 Salt'], ['mine', '⭐ Mine']]} />
        <div className="card">
          {!list.length ? (
            <Empty>No spots here yet. Tap ＋ at a spot to save it from GPS.</Empty>
          ) : (
            <div className="list">
              {list.map((s) => (
                <a key={s.id} className="item chev" href={`#/spot/${s.id}`}>
                  <div className="thumb" style={{ width: 44, height: 44, fontSize: '1.3rem' }}>{!s.builtIn ? '⭐' : s.water === 'salt' ? '🌊' : '🏞️'}</div>
                  <div className="grow">
                    <b>{s.name}</b> {s.edge && <span className="badge warn">2 hr+</span>}
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {s.builtIn ? `${s.area} · ${fmtDrive(s)}` : 'My spot'}
                    </div>
                  </div>
                  {s.kids ? <span title="Kid-friendliness" style={{ fontSize: '0.75rem' }}>👧 {s.kids}/5</span> : null}
                </a>
              ))}
            </div>
          )}
        </div>
        {filter !== 'mine' && (
          <div className="card">
            <h3>Closed / skip for now</h3>
            {SPOT_CLOSED.map((c) => (
              <p key={c.name}>
                <b>{c.name}</b>: <span className="muted">{c.why}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function SpotDetail({ spotId }) {
  const spot = useLiveQuery(() => db.spots.get(spotId), [spotId])
  const stats = useLiveQuery(async () => {
    const trips = await db.trips.where('spotId').equals(spotId).toArray()
    let fish = 0
    for (const t of trips) fish += await db.catches.where('tripId').equals(t.id).count()
    return { trips: trips.length, fish }
  }, [spotId])
  if (!spot) return null

  async function remove() {
    if (stats?.trips) return alert('This spot has trips logged. Delete those trips first.')
    if (!confirm('Delete this spot?')) return
    await db.spots.delete(spot.id)
    go('/spots', { replace: true })
  }

  return (
    <>
      <TopBar title={spot.name} onBack={() => back('/spots')} />
      <div className="page">
        <div className="card stack">
          <div className="muted">
            {spot.water === 'salt' ? '🌊 Saltwater' : '🏞️ Freshwater'} · {spot.area || 'My spot'}
            {spot.builtIn ? ` · ${fmtDrive(spot)}` : ''}
          </div>
          {spot.access && <p><b>Access:</b> {spot.access}</p>}
          {spot.cost && <p><b>Cost:</b> {spot.cost}</p>}
          {spot.kids ? <p><b>Kids:</b> <Stars n={spot.kids} max={5} /></p> : null}
          {spot.tip && <div className="alert info">💡 {spot.tip}</div>}
          {spot.license && <div className="alert warn">🪪 {spot.license}</div>}
          {spot.advisory && <div className="alert stop">🍽️ Eating advisory: {spot.advisory}</div>}
          {spot.approx && <small className="muted">Map pin is approximate. Directions search by name.</small>}
          {stats && <small className="muted">Your log here: {stats.trips} trips · {stats.fish} fish</small>}
        </div>

        {spot.targets?.length > 0 && (
          <div className="card">
            <h3>Fall targets</h3>
            <div className="chips">
              {spot.targets.map((id) => (
                <a key={id} className="chip" href={`#/species/${id}`}>{SPECIES_BY_ID[id]?.name}</a>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary btn-big" onClick={() => go(`/start?spot=${spot.id}`)}>🎣 Start a trip here</button>
        <div className="grid2">
          <button onClick={() => go(`/times?spot=${spot.id}`)}>🌙 Best times</button>
          <a className="btn" href={directionsUrl(spot)} target="_blank" rel="noreferrer">🧭 Directions</a>
        </div>
        {!spot.builtIn && <button className="btn-danger" onClick={remove}>Delete spot</button>}
      </div>
    </>
  )
}

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
      <TopBar title="New spot" onBack={() => back('/spots')} />
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
