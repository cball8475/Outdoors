// Start a trip: pick the spot, tick who's fishing, go.
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { TopBar, Toggle, AnglerChip, back, go } from '../components/ui.jsx'
import { getPosition } from '../lib/capture.js'
import { fmtDrive } from '../data/spots.js'
import { fishForSpot } from '../lib/explore.js'
import { sourceForSpot, normalFor } from '../lib/watertemp.js'

function distMiles(a, b) {
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function StartTrip({ spotId: initialSpot }) {
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const anglers = useLiveQuery(() => db.anglers.filter((a) => !a.archived).toArray(), [])
  const lastTrip = useLiveQuery(() => db.trips.orderBy('startedAt').last(), [])
  const [spotId, setSpotId] = useState(initialSpot)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [here, setHere] = useState(null)
  const [locating, setLocating] = useState(false)
  const [party, setParty] = useState(null)
  const [waterTemp, setWaterTemp] = useState('')
  const [notes, setNotes] = useState('')
  const [targets, setTargets] = useState([])

  // Default party: whoever came last time, else just "me".
  useEffect(() => {
    if (party || !anglers) return
    const live = new Set(anglers.map((a) => a.id))
    const last = (lastTrip?.anglerIds || []).filter((id) => live.has(id))
    setParty(last.length ? last : anglers.filter((a) => a.isDefault).map((a) => a.id))
  }, [anglers, lastTrip, party])

  const recentSpotIds = useLiveQuery(async () => {
    const t = await db.trips.orderBy('startedAt').reverse().limit(20).toArray()
    return [...new Set(t.map((x) => x.spotId))]
  }, [])

  const list = useMemo(() => {
    if (!spots) return []
    let l = spots.filter((s) => (filter === 'all' || s.water === filter) && s.name.toLowerCase().includes(q.toLowerCase()))
    const recent = recentSpotIds || []
    l = l.map((s) => ({ ...s, dist: here ? distMiles(here, s) : null, recentIdx: recent.indexOf(s.id) }))
    l.sort((a, b) => {
      if (here) return a.dist - b.dist
      const ra = a.recentIdx === -1 ? 99 : a.recentIdx
      const rb = b.recentIdx === -1 ? 99 : b.recentIdx
      return ra - rb || (a.driveMin || 999) - (b.driveMin || 999)
    })
    return l
  }, [spots, filter, q, here, recentSpotIds])

  async function locate() {
    setLocating(true)
    setHere(await getPosition())
    setLocating(false)
  }

  async function start() {
    const id = await db.trips.add({
      spotId,
      anglerIds: party,
      startedAt: new Date().toISOString(),
      endedAt: null,
      waterTempF: waterTemp ? Number(waterTemp) : null,
      targetIds: targets,
      notes: notes.trim(),
    })
    go('/', { replace: true })
    return id
  }

  const toggle = (id) => setParty((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const chosen = spots?.find((s) => s.id === spotId)

  return (
    <>
      <TopBar title="Start a trip" onBack={() => back()} />
      <div className="page">
        <div className="card stack">
          <h2>Who's fishing?</h2>
          <div className="chips">
            {anglers?.map((a) => (
              <AnglerChip key={a.id} angler={a} on={party?.includes(a.id)} onClick={() => toggle(a.id)} />
            ))}
          </div>
          <div className="row">
            <button className="btn-small" onClick={() => setParty(anglers.map((a) => a.id))}>Everyone</button>
            <button className="btn-small" onClick={() => setParty(anglers.filter((a) => a.isDefault).map((a) => a.id))}>Just me</button>
          </div>
        </div>

        <div className="card stack">
          <h2>Where?</h2>
          {chosen ? (
            <div className="row between">
              <div>
                <b>{chosen.name}</b>
                <div className="muted">{chosen.area || (chosen.water === 'salt' ? 'Saltwater' : 'Freshwater')}</div>
              </div>
              <button className="btn-small" onClick={() => setSpotId(null)}>Change</button>
            </div>
          ) : (
            <>
              <input placeholder="Search spots" value={q} onChange={(e) => setQ(e.target.value)} />
              <Toggle value={filter} onChange={setFilter} options={[['all', 'All'], ['fresh', '🏞️ Fresh'], ['salt', '🌊 Salt']]} />
              <div className="row">
                <button className="btn-small" onClick={locate} disabled={locating}>
                  {locating ? 'Finding you…' : '📡 Sort by nearest'}
                </button>
                <button className="btn-small" onClick={() => go('/spot-new')}>＋ New spot here</button>
              </div>
              <div className="list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {list.map((s) => (
                  <button key={s.id} className="item" style={{ border: 0, borderRadius: 0, textAlign: 'left', background: 'transparent' }} onClick={() => setSpotId(s.id)}>
                    <div className="thumb" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>{s.water === 'salt' ? '🌊' : '🏞️'}</div>
                    <div className="grow">
                      <b>{s.name}</b>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {s.dist != null ? `${s.dist.toFixed(1)} mi away` : s.builtIn ? fmtDrive(s) : 'My spot'}
                        {s.recentIdx >= 0 && !here ? ' · recent' : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {chosen && (
          <div className="card stack">
            <h2>🎯 Fishing for? <small className="muted">(optional)</small></h2>
            <div className="chips">
              {fishForSpot(chosen, { tempF: sourceForSpot(chosen) ? normalFor(sourceForSpot(chosen).key) : null })
                .filter((r) => !r.closed)
                .slice(0, 10)
                .map((r) => (
                  <button
                    key={r.species.id}
                    type="button"
                    className={`chip ${targets.includes(r.species.id) ? 'on' : ''}`}
                    onClick={() => setTargets((t) => (t.includes(r.species.id) ? t.filter((x) => x !== r.species.id) : [...t, r.species.id]))}
                  >
                    {r.species.name.replace(/ \(.*\)/, '')}
                  </button>
                ))}
            </div>
            <small className="muted">You'll get a game plan (rig, bait, what to look for from shore) on the trip screen. You can change it there.</small>
          </div>
        )}

        <details className="card">
          <summary>Optional: water temp & notes</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <label className="field">
              Water temp (°F): the #1 science-backed factor; worth a $10 thermometer
              <input inputMode="decimal" value={waterTemp} onChange={(e) => setWaterTemp(e.target.value.replace(/[^0-9.]/g, ''))} />
            </label>
            <label className="field">
              Notes (wind, water clarity, bait seen…)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        </details>

        <button className="btn-primary btn-big" disabled={!spotId || !party?.length} onClick={start}>
          Start fishing
        </button>
      </div>
    </>
  )
}
