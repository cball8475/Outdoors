// Trip tab: the live trip (big "Log catch" button) or Start + recent trips.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveTrip } from '../lib/db.js'
import { TopBar, AnglerChip, Thumb, Empty, go } from '../components/ui.jsx'
import { fmtTime, fmtDate, fmtDuration, fmtLength, fmtWeight } from '../lib/format.js'
import { SPECIES_BY_ID } from '../data/species.js'
import { sunDay, lightPeriodAt, dayBounds } from '../lib/sun.js'
import { getCachedTides, stageAt, STAGE_LABEL, tideRangeForDay } from '../lib/tides.js'
import { useWaterTemp } from '../lib/watertemp.js'
import { fishForSpot } from '../lib/explore.js'
import { SPOT_INFO } from '../data/spotInfo.js'
import { useRod, RodPicker, FishCard, WaterTempCard } from '../components/fishing.jsx'
import { BestTimeHero, useSpotTides } from '../components/kid.jsx'
import { getSetting } from '../lib/db.js'

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
        <button className="btn-big" onClick={() => go('/cast')} style={{ fontWeight: 700 }}>
          🎯 Where do I cast? (at the water)
        </button>
        <TodayAtMySpot />
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
  const wt = useWaterTemp(data?.spot)
  if (!data) return null
  const { spot, catches, anglers, tides } = data
  const A = Object.fromEntries(anglers.map((a) => [a.id, a]))
  const party = (trip.anglerIds || []).map((id) => A[id]).filter(Boolean)
  const t = tally(catches)

  // "Right now" conditions
  let day = null
  let light = null
  let tideNow = null
  let range = null
  if (spot) {
    day = sunDay(new Date(now), spot.lat, spot.lon)
    light = lightPeriodAt(now, day)
    tideNow = tides ? stageAt(tides.predictions, now) : null
    if (tides) {
      const b = dayBounds(day.date)
      range = tideRangeForDay(tides.predictions, b.start, b.end)
    }
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

        {spot && (
          <button className="btn-big" onClick={() => go(`/cast?spot=${spot.id}`)} style={{ fontWeight: 700 }}>
            🎯 Where do I cast?
          </button>
        )}

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
            {range && <p className="muted" style={{ marginTop: 8 }}>🌊 {range.label}</p>}
            {tideNow && (
              <p className="muted">
                Next {tideNow.next.type === 'H' ? 'high' : 'low'} {fmtTime(tideNow.next.t)} ({tideNow.next.v.toFixed(1)} ft)
              </p>
            )}
            <a href={`#/times?spot=${spot.id}`}>Full times for today →</a>
          </div>
        )}

        {spot && <TripWater trip={trip} wt={wt} />}
        {spot && <GamePlan trip={trip} spot={spot} tempF={trip.waterTempF ?? wt?.best ?? null} />}

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

/** Water temp on the trip: sensor reading + your own thermometer reading. */
function TripWater({ trip, wt }) {
  async function useSensor() {
    if (wt?.live) await db.trips.update(trip.id, { waterTempF: wt.live.tempF })
  }
  async function enter() {
    const v = prompt('Water temp from your thermometer (°F)', trip.waterTempF ?? '')
    if (v != null && v !== '' && !isNaN(Number(v))) await db.trips.update(trip.id, { waterTempF: Number(v) })
  }
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <WaterTempCard wt={wt} compact />
      <div className="row wrap">
        {trip.waterTempF != null ? (
          <span className="badge good">📝 Logged for this trip: {trip.waterTempF}°F</span>
        ) : (
          <span className="badge">Not logged yet</span>
        )}
        {wt?.live && <button className="btn-small" onClick={useSensor}>Use sensor ({wt.live.tempF.toFixed(1)}°F)</button>}
        <button className="btn-small" onClick={enter}>🌡️ Enter my reading</button>
      </div>
    </div>
  )
}

/**
 * "What are you fishing for?" → for each target fish: what to look for from
 * shore, bait, lures, the rig for the rod you pick, and whether today's water
 * temp suits it. Targets are saved on the trip (trip.targetIds).
 */
function GamePlan({ trip, spot, tempF }) {
  const [rod, setRod] = useRod()
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(0)
  const targets = trip.targetIds || []
  const rows = fishForSpot(spot, { forKids: rod === 'kids', tempF })
  const byId = Object.fromEntries(rows.map((r) => [r.species.id, r]))
  const chosen = targets.map((id) => byId[id]).filter(Boolean)
  const info = SPOT_INFO[spot.key]

  async function toggle(id) {
    const next = targets.includes(id) ? targets.filter((x) => x !== id) : [...targets, id]
    await db.trips.update(trip.id, { targetIds: next })
  }
  async function bestBets() {
    await db.trips.update(trip.id, { targetIds: rows.filter((r) => !r.closed).slice(0, 3).map((r) => r.species.id) })
  }

  const picker = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="chips">
        {rows.map((r) => (
          <button key={r.species.id} type="button" className={`chip ${targets.includes(r.species.id) ? 'on' : ''}`} onClick={() => toggle(r.species.id)}>
            {r.species.name.replace(/ \(.*\)/, '')}
            {r.fit?.level === 'prime' ? ' 🔥' : ''}
            {r.closed ? ' ⛔' : ''}
          </button>
        ))}
      </div>
      <small className="muted">🔥 = water temp is prime for it right now. ⛔ = closed season here.</small>
    </div>
  )

  if (!chosen.length) {
    return (
      <div className="card stack">
        <h2>🎯 What are you fishing for?</h2>
        <p className="muted">Pick one or more and you'll get the rig, bait, and what to look for from shore.</p>
        <button className="btn-primary" onClick={bestBets}>✨ Pick today's best bets for me</button>
        {picker}
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between">
        <h2>🎯 Game plan</h2>
        <button className="btn-small" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Change fish'}</button>
      </div>
      {editing && <div className="card">{picker}</div>}
      {info?.whereToFish && (
        <div className="alert info">📍 <b>At this spot:</b> {info.whereToFish}</div>
      )}
      <RodPicker rod={rod} setRod={setRod} />
      {chosen.map((row, i) => (
        <FishCard key={row.species.id} row={row} rod={rod} spot={spot} tempF={tempF} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
      ))}
    </div>
  )
}

/** "Best time today" for the spot you used last (or looked at last on Times). */
function TodayAtMySpot() {
  const spot = useLiveQuery(async () => {
    const last = await db.trips.orderBy('startedAt').last()
    const id = last?.spotId || (await getSetting('timesSpotId'))
    return id ? db.spots.get(id) : db.spots.where('key').equals('mb-state-park-pier').first()
  }, [])
  const preds = useSpotTides(spot)
  if (!spot) return null
  return (
    <>
      <small className="muted">At {spot.name} (<a href="#/explore">pick another spot</a>)</small>
      <BestTimeHero spot={spot} preds={preds} compact>
        <a className="btn btn-small" href={`#/start?spot=${spot.id}`} style={{ background: 'rgba(255,255,255,0.15)', color: 'inherit', borderColor: 'transparent' }}>
          🎣 Fish here
        </a>
      </BestTimeHero>
    </>
  )
}
