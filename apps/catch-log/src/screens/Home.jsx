// Trip tab: the live trip (big "Log catch" button) or Start + recent trips.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveTrip } from '../lib/db.js'
import { TopBar, AnglerChip, Thumb, Empty, go } from '../components/ui.jsx'
import { fmtTime, fmtDate, fmtDuration, fmtLength, fmtWeight } from '../lib/format.js'
import { SPECIES_BY_ID } from '../data/species.js'
import { solunarDay, lightPeriodAt } from '../lib/solunar.js'
import { getCachedTides, stageAt, STAGE_LABEL } from '../lib/tides.js'

export function speciesName(c) {
  return SPECIES_BY_ID[c.speciesId]?.name || c.speciesOther || 'Unknown fish'
}

/** Totals for a set of catches: overall + per angler. */
export function tally(catches) {
  const byAngler = {}
  let released = 0
  for (const c of catches) {
    byAngler[c.anglerId] = (byAngler[c.anglerId] || 0) + 1
    if (!c.kept) released++
  }
  return { total: catches.length, released, kept: catches.length - released, byAngler }
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export default function Home() {
  const active = useLiveQuery(() => getActiveTrip(), [])
  if (active === undefined) return null
  return active ? <LiveTrip trip={active} /> : <NoTrip />
}

function NoTrip() {
  const trips = useLiveQuery(async () => {
    const all = await db.trips.orderBy('startedAt').reverse().limit(30).toArray()
    const spots = Object.fromEntries((await db.spots.toArray()).map((s) => [s.id, s]))
    const out = []
    for (const t of all) {
      const catches = await db.catches.where('tripId').equals(t.id).toArray()
      out.push({ ...t, spot: spots[t.spotId], tally: tally(catches) })
    }
    return out
  }, [])

  return (
    <>
      <TopBar title="🎣 Catch Log" right={<button aria-label="Settings" onClick={() => go('/settings')}>⚙️</button>} />
      <div className="page">
        <button className="btn-primary btn-big" onClick={() => go('/start')}>
          ＋ Start a trip
        </button>
        <div className="card">
          <h2>Recent trips</h2>
          {!trips?.length ? (
            <Empty>No trips yet. Start one when you get to the water.</Empty>
          ) : (
            <div className="list">
              {trips.map((t) => (
                <a key={t.id} className="item chev" href={`#/trip/${t.id}`}>
                  <div className="thumb">{t.spot?.water === 'salt' ? '🌊' : '🏞️'}</div>
                  <div className="grow">
                    <b>{t.spot?.name || 'Unknown spot'}</b>
                    <div className="muted">
                      {fmtDate(t.startedAt)} · {fmtDuration(new Date(t.endedAt || Date.now()) - new Date(t.startedAt))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b>{t.tally.total}</b>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>fish</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function LiveTrip({ trip }) {
  const now = useNow()
  const data = useLiveQuery(async () => {
    const [spot, catches, anglers] = await Promise.all([
      db.spots.get(trip.spotId),
      db.catches.where('tripId').equals(trip.id).toArray(),
      db.anglers.toArray(),
    ])
    const tides = spot?.tideStation ? await getCachedTides(spot.tideStation) : null
    return { spot, catches: catches.sort((a, b) => b.caughtAt.localeCompare(a.caughtAt)), anglers, tides }
  }, [trip.id, trip.spotId])
  if (!data) return null
  const { spot, catches, anglers, tides } = data
  const A = Object.fromEntries(anglers.map((a) => [a.id, a]))
  const party = (trip.anglerIds || []).map((id) => A[id]).filter(Boolean)
  const t = tally(catches)

  // "Right now" conditions
  let day = null
  let light = null
  let nextPeriod = null
  let tideNow = null
  if (spot) {
    day = solunarDay(new Date(now), spot.lat, spot.lon)
    light = lightPeriodAt(now, day)
    nextPeriod = day.periods.find((p) => p.end.getTime() > now)
    tideNow = tides ? stageAt(tides.predictions, now) : null
  }

  async function endTrip() {
    if (!confirm('End this trip?')) return
    await db.trips.update(trip.id, { endedAt: new Date().toISOString() })
    go(`/trip/${trip.id}`, { replace: true })
  }

  return (
    <>
      <TopBar title={spot?.name || 'Trip'} right={<button aria-label="Settings" onClick={() => go('/settings')}>⚙️</button>} />
      <div className="page">
        <div className="card hero stack">
          <div className="row between">
            <div>
              <small>Started {fmtTime(trip.startedAt)} · {fmtDuration(now - new Date(trip.startedAt))}</small>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1 }}>
                {t.total} <span style={{ fontSize: '1rem', fontWeight: 600 }}>caught</span>
              </div>
              <small>
                {t.released} released · {t.kept} kept
              </small>
            </div>
            <div style={{ fontSize: '2.6rem' }}>{spot?.water === 'salt' ? '🌊' : '🏞️'}</div>
          </div>
        </div>

        <div className="chips">
          {party.map((a) => (
            <AnglerChip key={a.id} angler={a} count={t.byAngler[a.id] || 0} onClick={() => go(`/log/${trip.id}?angler=${a.id}`)} />
          ))}
        </div>

        {day && (
          <div className="card">
            <div className="grid3">
              <div className="stat">
                <small>Light</small>
                <b style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{light}</b>
              </div>
              <div className="stat">
                <small>Tide</small>
                <b style={{ fontSize: '1rem' }}>
                  {spot.water !== 'salt' ? 'n/a' : tideNow ? STAGE_LABEL[tideNow.stage].split(' ')[0] : 'no data'}
                </b>
              </div>
              <div className="stat">
                <small>Sunset</small>
                <b style={{ fontSize: '1rem' }}>{fmtTime(day.sunset)}</b>
              </div>
            </div>
            {nextPeriod && (
              <p className="muted" style={{ marginTop: 8 }}>
                {nextPeriod.start.getTime() <= now ? 'Now in' : 'Next'}: solunar {nextPeriod.kind} ({nextPeriod.label.toLowerCase()}) {fmtTime(nextPeriod.start)}–{fmtTime(nextPeriod.end)}
              </p>
            )}
            {tideNow && (
              <p className="muted">
                Next {tideNow.next.type === 'H' ? 'high' : 'low'} {fmtTime(tideNow.next.t)} ({tideNow.next.v.toFixed(1)} ft)
              </p>
            )}
            <a href={`#/times?spot=${spot.id}`}>Full times for today →</a>
          </div>
        )}

        <div className="card">
          <h2>Catches</h2>
          {!catches.length ? (
            <Empty>Nothing yet. Tap “Log catch” when someone lands one.</Empty>
          ) : (
            <div className="list">
              {catches.map((c) => (
                <a key={c.id} className="item chev" href={`#/catch/${c.id}`}>
                  <Thumb photoId={c.photoId} />
                  <div className="grow">
                    <b>{speciesName(c)}</b>{' '}
                    {c.kept ? <span className="badge warn">kept</span> : <span className="badge good">released</span>}
                    <div className="muted">
                      {A[c.anglerId]?.name} · {fmtTime(c.caughtAt)}
                      {c.lengthIn ? ` · ${fmtLength(c.lengthIn)}` : ''}
                      {c.weightLb ? ` · ${fmtWeight(c.weightLb)}` : ''}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <button className="btn-danger" onClick={endTrip}>
          End trip
        </button>
      </div>
      <button className="fab" onClick={() => go(`/log/${trip.id}`)}>
        ＋ Log catch
      </button>
    </>
  )
}
