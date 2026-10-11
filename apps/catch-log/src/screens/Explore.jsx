// ---------------------------------------------------------------------------
// EXPLORE: built so the kids can drive it.
//   📍 Pick a place → best fish there right now, how to rig for each one,
//                     best times, and everything researched about the spot
//   🐟 Pick a fish  → the places to catch it (ranked), then the same spot page
// Big buttons, short words, kids' Ugly Stik rig shown first.
// ---------------------------------------------------------------------------
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { TopBar, Toggle, Stars, Empty, back, go } from '../components/ui.jsx'
import { SeasonBadge, KidEase, FitBadge, useRod, RodPicker, FishCard, WaterTempCard, SEASON_ICON } from '../components/fishing.jsx'
import { BestTimeHero, WeekStrip, useSpotTides } from '../components/kid.jsx'
import { SPECIES_BY_ID, SEASON_LABEL } from '../data/species.js'
import { SPOT_CLOSED, directionsUrl, fmtDrive } from '../data/spots.js'
import { SPOT_INFO, SPOT_INFO_DATE } from '../data/spotInfo.js'
import { RODS } from '../data/rods.js'
import { useWaterTemp, sourceForSpot, normalFor, tempFit } from '../lib/watertemp.js'
import { fishForSpot, spotsForFish, fishInSeason, rigFor } from '../lib/explore.js'
import { regsSummary } from '../lib/regs.js'
import { getPosition } from '../lib/capture.js'
import { fmtDate } from '../lib/format.js'

/** "About this spot": researched info baked in for offline use. */
function SpotAbout({ spot }) {
  const info = SPOT_INFO[spot.key]
  const fac = info?.facilities || {}
  const facChips = [
    fac.restrooms === true && '🚻 Restrooms',
    fac.restrooms === false && '🚫 No restrooms',
    fac.baitShop && `🪱 Bait: ${fac.baitShop}`,
    fac.rentals && `🎣 ${fac.rentals}`,
    fac.food && `🍔 ${fac.food}`,
    fac.parking && `🅿️ ${fac.parking}`,
    fac.ada === true && '♿ ADA access',
  ].filter(Boolean)
  return (
    <div className="card stack">
      <h2>ℹ️ About this spot</h2>
      {info?.status && <div className="alert info">📣 {info.status}</div>}
      {(info?.whereToFish || spot.tip) && <p><b>📍 Where to fish:</b> {info?.whereToFish || spot.tip}</p>}
      {info?.kidNotes && <p><b>🧒 For kids:</b> {info.kidNotes}</p>}
      {(info?.hours) && <p><b>🕒 Hours:</b> {info.hours}</p>}
      {(info?.cost || spot.cost) && <p><b>💲 Cost:</b> {info?.cost || spot.cost}</p>}
      {spot.access && <p><b>🚶 Access:</b> {spot.access}</p>}
      {facChips.length > 0 && (
        <div className="chips">{facChips.map((c) => <span key={c} className="chip" style={{ minHeight: 32, fontSize: '0.85rem' }}>{c}</span>)}</div>
      )}
      {spot.license && <div className="alert warn">🪪 {spot.license}</div>}
      {info?.rules && <p><b>📋 Rules:</b> {info.rules}</p>}
      {spot.advisory && <div className="alert stop">🍽️ Eating advisory: {spot.advisory}</div>}
      {spot.tip && info?.whereToFish && <p>💡 {spot.tip}</p>}
      {info?.extra?.length > 0 && (
        <details>
          <summary>🔎 More from online reports ({info.extra.length})</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {info.extra.map((x, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {x.tip} {x.source && <a href={x.source} target="_blank" rel="noreferrer">source</a>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="row wrap">
        {info?.website && <a className="btn btn-small" href={info.website} target="_blank" rel="noreferrer">🌐 Website</a>}
        {info?.phone && <a className="btn btn-small" href={`tel:${info.phone.replace(/[^0-9+]/g, '')}`}>📞 Call</a>}
        <a className="btn btn-small" href={directionsUrl(spot)} target="_blank" rel="noreferrer">🧭 Directions</a>
      </div>
      <small className="muted">
        {spot.builtIn ? `Researched ${fmtDate(`${SPOT_INFO_DATE}T12:00`)}. Hours and prices change, so check the website before driving.` : 'Your own spot.'}
      </small>
    </div>
  )
}

// =============================== SCREENS ===================================

export function Explore({ mode = 'place' }) {
  const setMode = (m) => go(`/explore?mode=${m}`, { replace: true })
  return (
    <>
      <TopBar title="🧭 Explore" right={<button aria-label="Add spot" onClick={() => go('/spot-new')}>＋</button>} />
      <div className="page">
        <div className="toggle" role="group" style={{ fontSize: '1.1rem' }}>
          <button className={mode === 'place' ? 'on' : ''} style={{ minHeight: 64 }} onClick={() => setMode('place')}>📍 Pick a place</button>
          <button className={mode === 'fish' ? 'on' : ''} style={{ minHeight: 64 }} onClick={() => setMode('fish')}>🐟 Pick a fish</button>
        </div>
        {mode === 'fish' ? <PickFish /> : <PickPlace />}
      </div>
    </>
  )
}

function PickPlace() {
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const [filter, setFilter] = useState('all')
  const [here, setHere] = useState(null)
  const [locating, setLocating] = useState(false)
  if (!spots) return null
  const dist = (s) => (here ? Math.hypot(s.lat - here.lat, (s.lon - here.lon) * Math.cos((here.lat * Math.PI) / 180)) : 0)
  const list = spots
    .filter((s) => filter === 'all' || (filter === 'mine' ? !s.builtIn : s.water === filter))
    .sort((a, b) => (here ? dist(a) - dist(b) : (a.driveMin ?? 0) - (b.driveMin ?? 0)))
  return (
    <>
      <Toggle value={filter} onChange={setFilter} options={[['all', 'All'], ['fresh', '🏞️ Lake/River'], ['salt', '🌊 Beach'], ['mine', '⭐ Mine']]} />
      <button className="btn-small" onClick={async () => { setLocating(true); setHere(await getPosition()); setLocating(false) }} disabled={locating}>
        {locating ? 'Finding you…' : here ? '📡 Sorted by nearest' : '📡 Sort by nearest'}
      </button>
      <div className="card">
        {!list.length ? (
          <Empty>No spots here yet. Tap ＋ at a spot to save it.</Empty>
        ) : (
          <div className="list">
            {list.map((s) => {
              const src = sourceForSpot(s)
              const tempF = src ? normalFor(src.key) : null
              const top = fishForSpot(s, { forKids: true, tempF }).filter((r) => !r.closed).slice(0, 3)
              return (
                <a key={s.id} className="item chev" href={`#/spot/${s.id}`}>
                  <div className="thumb" style={{ width: 48, height: 48, fontSize: '1.5rem' }}>{!s.builtIn ? '⭐' : s.water === 'salt' ? '🌊' : '🏞️'}</div>
                  <div className="grow">
                    <b>{s.name}</b> {s.edge && <span className="badge warn">2 hr+</span>}
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {s.builtIn ? fmtDrive(s) : 'My spot'}{s.kids ? ` · 🧒 ${s.kids}/5` : ''}
                    </div>
                    {top.length > 0 && <div style={{ fontSize: '0.85rem' }}>🐟 {top.map((r) => r.species.name.replace(/ \(.*\)/, '')).join(', ')}</div>}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
      <details className="card">
        <summary>Closed / skip for now</summary>
        {SPOT_CLOSED.map((c) => <p key={c.name}><b>{c.name}</b>: <span className="muted">{c.why}</span></p>)}
      </details>
    </>
  )
}

function PickFish() {
  const [water, setWater] = useState('salt')
  const [q, setQ] = useState('')
  const month = new Date().getMonth()
  const list = fishInSeason(water).filter((s) =>
    !q || [s.name, ...(s.aka || [])].some((n) => n.toLowerCase().includes(q.toLowerCase())),
  )
  return (
    <>
      <Toggle value={water} onChange={setWater} options={[['salt', '🌊 Beach & pier'], ['fresh', '🏞️ Lake & river']]} />
      <input placeholder="Type a fish (bream, trout, catfish…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid2">
        {list.map((s) => (
          <a key={s.id} className="card" href={`#/fish/${s.id}`} style={{ textDecoration: 'none', color: 'inherit', padding: 12 }}>
            <div style={{ fontSize: '1.6rem' }}>{SEASON_ICON[s.season[month]]}</div>
            <b>{s.name.replace(/ \(.*\)/, '')}</b>
            <div className="muted" style={{ fontSize: '0.8rem' }}>{SEASON_LABEL[s.season[month]]}{s.kidEase >= 4 ? ' · 🧒 easy' : s.kidEase === 0 ? ' · grown-up' : ''}</div>
          </a>
        ))}
      </div>
      {!list.length && <Empty>No fish matches “{q}”.</Empty>}
    </>
  )
}

export function SpotGuide({ spotId }) {
  const spot = useLiveQuery(() => db.spots.get(spotId), [spotId])
  const stats = useLiveQuery(async () => {
    const trips = await db.trips.where('spotId').equals(spotId).toArray()
    let fish = 0
    for (const t of trips) fish += await db.catches.where('tripId').equals(t.id).count()
    return { trips: trips.length, fish }
  }, [spotId])
  const [rod, setRod] = useRod()
  const [open, setOpen] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const wt = useWaterTemp(spot)
  const preds = useSpotTides(spot)
  if (!spot) return null
  const tempF = wt?.best ?? null
  const fish = fishForSpot(spot, { forKids: rod === 'kids', tempF })
  const shown = showAll ? fish : fish.slice(0, 5)

  async function remove() {
    if (stats?.trips) return alert('This spot has trips logged. Delete those trips first.')
    if (!confirm('Delete this spot?')) return
    await db.spots.delete(spot.id)
    go('/explore', { replace: true })
  }

  return (
    <>
      <TopBar title={spot.name} onBack={() => back('/explore')} />
      <div className="page">
        <div className="card hero">
          <div style={{ fontSize: '0.95rem' }}>
            {spot.water === 'salt' ? '🌊 Saltwater' : '🏞️ Freshwater'} · {spot.area || 'My spot'}
            {spot.builtIn ? ` · ${fmtDrive(spot)}` : ''}
          </div>
          {spot.kids ? <div style={{ marginTop: 4 }}>Kid-friendly: <Stars n={spot.kids} max={5} /></div> : null}
          {stats?.trips ? <small>Your log here: {stats.trips} trips · {stats.fish} fish</small> : null}
        </div>

        <button className="btn-primary btn-big" onClick={() => go(`/start?spot=${spot.id}`)}>🎣 Fish here now</button>

        <BestTimeHero spot={spot} preds={preds} compact />
        <WeekStrip spot={spot} preds={preds} onPickDay={(k) => go(`/times?spot=${spot.id}&date=${k}`)} />
        <WaterTempCard wt={wt} />

        <div className="stack" style={{ gap: 8 }}>
          <h2>🐟 Best fish here right now</h2>
          <RodPicker rod={rod} setRod={setRod} />
          {shown.map((row, i) => (
            <FishCard key={row.species.id} row={row} rod={rod} spot={spot} tempF={tempF} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
          {fish.length > 5 && (
            <button className="btn-small btn-ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${fish.length} fish`}
            </button>
          )}
        </div>

        <SpotAbout spot={spot} />

        {!spot.builtIn && <button className="btn-danger" onClick={remove}>Delete spot</button>}
      </div>
    </>
  )
}

export function FishPlaces({ id }) {
  const s = SPECIES_BY_ID[id]
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const [rod, setRod] = useRod()
  const [sort, setSort] = useState('kids')
  const [here, setHere] = useState(null)
  if (!s || !spots) return null
  const month = new Date().getMonth()
  const rows = spotsForFish(id, spots, { sort, here })
  const rig = rigFor(s, rod)

  async function near() {
    setSort('near')
    if (!here) setHere(await getPosition())
  }

  return (
    <>
      <TopBar title={s.name} onBack={() => back('/explore?mode=fish')} />
      <div className="page">
        <div className="card stack">
          <div className="chips">
            <SeasonBadge level={s.season[month]} />
            <KidEase n={s.kidEase} />
          </div>
          <p className="muted">👀 {s.idTips}</p>
          {s.fall && <p><b>This time of year:</b> {s.fall}</p>}
        </div>

        <div className="card stack">
          <h2>🎣 How to catch it</h2>
          <RodPicker rod={rod} setRod={setRod} />
          {s.shore?.length > 0 && (
            <div>
              <b>👀 What to look for from shore</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{s.shore.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}
          {s.temp && <p className="muted" style={{ fontSize: '0.9rem' }}>🌡️ Feeds best in {s.temp.best[0]}–{s.temp.best[1]}°F water.</p>}
          {s.baits?.length > 0 && <p><b>🪱 Bait:</b> {s.baits.join(', ')}</p>}
          {s.lures?.length > 0 && <p><b>✨ Lures:</b> {s.lures.join(', ')}</p>}
          {rig && <div className="alert good"><b>{RODS[rig.rod].name}{rig.fallback ? ' (use this rod)' : ''}:</b> {rig.text}</div>}
          <p style={{ fontSize: '0.9rem' }}><b>📏 Keep it?</b> {regsSummary(s.regs)}</p>
          <a href={`#/species/${s.id}`}>Full fish guide →</a>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <h2>📍 Where to catch it</h2>
          <Toggle value={sort === 'near' ? 'near' : sort} onChange={(v) => (v === 'near' ? near() : setSort(v))} options={[['kids', '🧒 Kid-friendly'], ['close', '🚗 Closest'], ['near', '📡 Near me']]} />
          <div className="card">
            {!rows.length ? (
              <Empty>No researched spots list this fish yet.</Empty>
            ) : (
              <div className="list">
                {rows.map((r) => (
                  <a key={r.spot.id} className="item chev" href={`#/spot/${r.spot.id}`}>
                    <div className="thumb" style={{ width: 44, height: 44, fontSize: '1.3rem' }}>{r.spot.water === 'salt' ? '🌊' : '🏞️'}</div>
                    <div className="grow">
                      <b>{r.spot.name}</b>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {r.dist != null ? `${r.dist.toFixed(0)} mi away` : r.spot.builtIn ? fmtDrive(r.spot) : 'My spot'}
                        {r.spot.kids ? ` · 🧒 ${r.spot.kids}/5` : ''}
                        {!r.listed ? ' · common everywhere' : ''}
                      </div>
                      {(() => {
                        const src = sourceForSpot(r.spot)
                        const t = src ? normalFor(src.key) : null
                        const fit = tempFit(s, t)
                        return fit ? <FitBadge fit={{ ...fit, label: `${fit.label} (normal)` }} tempF={t} /> : null
                      })()}
                      {r.closed && <span className="badge stop">⛔ Closed season here</span>}
                      {r.spot.advisory && <span className="badge warn">🍽️ Eating advisory</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
