// Stats: family totals, per-angler personal bests, and Insights (catch per
// hour by light / tide / solunar, built from YOUR trips).
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { TopBar, Empty } from '../components/ui.jsx'
import { effortForTrip } from '../lib/conditions.js'
import { getCachedTides } from '../lib/tides.js'
import { fmtLength, fmtWeight, fmtDate } from '../lib/format.js'
import { speciesName } from './Home.jsx'

const LABELS = {
  light: { dawn: 'Dawn', day: 'Daytime', dusk: 'Dusk', night: 'Night' },
  tide: { incoming: 'Incoming', outgoing: 'Outgoing', slack: 'Slack' },
  solunar: { major: 'Major period', minor: 'Minor period', none: 'Outside periods' },
}

export default function Stats() {
  const data = useLiveQuery(async () => {
    const [anglers, trips, catches, spots] = await Promise.all([
      db.anglers.toArray(),
      db.trips.toArray(),
      db.catches.toArray(),
      db.spots.toArray(),
    ])
    const S = Object.fromEntries(spots.map((s) => [s.id, s]))
    // effort (hours) per condition across finished trips
    const effort = { light: {}, tide: {}, solunar: {}, hours: 0 }
    const tideCache = {}
    for (const t of trips.filter((x) => x.endedAt)) {
      const spot = S[t.spotId]
      if (!spot) continue
      let preds = null
      if (spot.tideStation) {
        tideCache[spot.tideStation] ??= (await getCachedTides(spot.tideStation))?.predictions || null
        preds = tideCache[spot.tideStation]
      }
      const e = effortForTrip(t, spot, preds)
      effort.hours += e.hours
      for (const k of ['light', 'tide', 'solunar']) for (const [c, h] of Object.entries(e[k])) effort[k][c] = (effort[k][c] || 0) + h
    }
    const endedIds = new Set(trips.filter((x) => x.endedAt).map((x) => x.id))
    return { anglers, trips, catches, effort, endedCatches: catches.filter((c) => endedIds.has(c.tripId)) }
  }, [])
  if (!data) return null
  const { anglers, trips, catches, effort, endedCatches } = data

  const released = catches.filter((c) => !c.kept).length
  const speciesCount = new Set(catches.map((c) => c.speciesId || c.speciesOther)).size

  return (
    <>
      <TopBar title="Stats" />
      <div className="page">
        <div className="card">
          <h2>Family totals</h2>
          <div className="grid3" style={{ marginTop: 8 }}>
            <div className="stat"><b>{catches.length}</b><small>fish</small></div>
            <div className="stat"><b>{trips.length}</b><small>trips</small></div>
            <div className="stat"><b>{Math.round(effort.hours)}</b><small>hours</small></div>
            <div className="stat"><b>{catches.length ? Math.round((released / catches.length) * 100) : 0}%</b><small>released</small></div>
            <div className="stat"><b>{speciesCount}</b><small>species</small></div>
            <div className="stat"><b>{effort.hours ? (endedCatches.length / effort.hours).toFixed(1) : '—'}</b><small>fish / hr</small></div>
          </div>
        </div>

        {anglers.filter((a) => !a.archived).map((a) => (
          <AnglerCard key={a.id} angler={a} catches={catches.filter((c) => c.anglerId === a.id)} />
        ))}

        <Insights effort={effort} catches={endedCatches} trips={trips.filter((t) => t.endedAt).length} />
      </div>
    </>
  )
}

function AnglerCard({ angler, catches }) {
  const best = {}
  for (const c of catches) {
    const k = speciesName(c)
    const cur = best[k]
    const score = (x) => (x.lengthIn || 0) * 1000 + (x.weightLb || 0)
    if (!cur || score(c) > score(cur)) best[k] = c
  }
  return (
    <div className="card stack">
      <div className="row between">
        <h2>
          <span className="dot" style={{ background: angler.color, display: 'inline-block', width: 12, height: 12, borderRadius: 6, marginRight: 8 }} />
          {angler.name}
        </h2>
        <b>{catches.length} fish</b>
      </div>
      {Object.keys(best).length ? (
        <table className="table">
          <thead><tr><th>Personal best</th><th>Size</th><th>When</th></tr></thead>
          <tbody>
            {Object.entries(best).map(([k, c]) => (
              <tr key={k} onClick={() => (location.hash = `#/catch/${c.id}`)} style={{ cursor: 'pointer' }}>
                <td>{k}</td>
                <td>{[fmtLength(c.lengthIn), fmtWeight(c.weightLb)].filter(Boolean).join(' · ') || '—'}</td>
                <td className="muted">{fmtDate(c.caughtAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <small className="muted">No fish yet.</small>
      )}
    </div>
  )
}

function Insights({ effort, catches, trips }) {
  const section = (key, title) => {
    const counts = {}
    for (const c of catches) {
      const v = c.cond?.[key]
      if (v) counts[v] = (counts[v] || 0) + 1
    }
    const rows = Object.keys(LABELS[key])
      .filter((k) => effort[key][k] > 0.2)
      .map((k) => ({ k, hours: effort[key][k], fish: counts[k] || 0, cpue: (counts[k] || 0) / effort[key][k] }))
    if (!rows.length) return null
    const max = Math.max(...rows.map((r) => r.cpue), 0.01)
    return (
      <div className="stack" style={{ gap: 6 }}>
        <h3>{title}</h3>
        {rows.map((r) => (
          <div key={r.k}>
            <div className="row between" style={{ fontSize: '0.9rem' }}>
              <span>{LABELS[key][r.k]}</span>
              <span className="mono muted">{r.cpue.toFixed(2)} fish/hr · {r.fish} in {r.hours.toFixed(1)} h</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
              <div style={{ height: 8, width: `${(r.cpue / max) * 100}%`, background: 'var(--accent)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="card stack">
      <h2>Insights: catch per hour</h2>
      <small className="muted">
        Fish caught ÷ hours you were actually fishing in each condition, from finished trips. This is your own answer to
        "do tides/solunar times really matter?" Treat it as noise until you have ~10 trips ({trips} so far).
      </small>
      {trips === 0 ? (
        <Empty>Finish a trip to start building insights.</Empty>
      ) : (
        <>
          {section('light', 'Light')}
          {section('tide', 'Tide (salt trips)')}
          {section('solunar', 'Solunar')}
        </>
      )}
    </div>
  )
}
