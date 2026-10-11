// Trip summary: party totals, per-angler leaderboard, species breakdown,
// every catch, and a one-tap text summary to share with the family.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteTrip, getActiveTrip } from '../lib/db.js'
import { TopBar, Thumb, Empty, back, go } from '../components/ui.jsx'
import { fmtDateLong, fmtTime, fmtDuration, fmtLength, fmtWeight } from '../lib/format.js'
import { speciesName, tally } from './Home.jsx'

export default function TripDetail({ tripId }) {
  const data = useLiveQuery(async () => {
    const trip = await db.trips.get(tripId)
    if (!trip) return { trip: null }
    const [spot, anglers, catches, active] = await Promise.all([
      db.spots.get(trip.spotId),
      db.anglers.toArray(),
      db.catches.where('tripId').equals(tripId).toArray(),
      getActiveTrip(),
    ])
    return { trip, spot, anglers, catches: catches.sort((a, b) => a.caughtAt.localeCompare(b.caughtAt)), active }
  }, [tripId])
  if (!data) return null
  if (!data.trip)
    return (
      <>
        <TopBar title="Trip" onBack={() => back()} />
        <div className="page"><Empty>Trip not found.</Empty></div>
      </>
    )

  const { trip, spot, anglers, catches, active } = data
  const A = Object.fromEntries(anglers.map((a) => [a.id, a]))
  const t = tally(catches)
  const dur = new Date(trip.endedAt || Date.now()) - new Date(trip.startedAt)

  const board = (trip.anglerIds || [])
    .map((id) => {
      const mine = catches.filter((c) => c.anglerId === id)
      const biggest = [...mine].sort((a, b) => (b.lengthIn || 0) - (a.lengthIn || 0) || (b.weightLb || 0) - (a.weightLb || 0))[0]
      return { angler: A[id], count: mine.length, released: mine.filter((c) => !c.kept).length, biggest }
    })
    .filter((r) => r.angler)
    .sort((a, b) => b.count - a.count)

  const bySpecies = {}
  for (const c of catches) {
    const n = speciesName(c)
    bySpecies[n] = (bySpecies[n] || 0) + 1
  }

  function summaryText() {
    const lines = [
      `🎣 ${spot?.name || 'Fishing trip'}: ${fmtDateLong(trip.startedAt)}`,
      `${t.total} fish (${t.released} released, ${t.kept} kept) in ${fmtDuration(dur)}`,
      '',
      ...board.map(
        (r, i) =>
          `${i === 0 && r.count ? '🏆 ' : ''}${r.angler.name}: ${r.count}${r.biggest?.lengthIn ? ` (biggest ${speciesName(r.biggest)} ${fmtLength(r.biggest.lengthIn)})` : ''}`,
      ),
      '',
      Object.entries(bySpecies).map(([n, k]) => `${n} ×${k}`).join(', '),
    ]
    return lines.join('\n')
  }

  async function share() {
    const text = summaryText()
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        alert('Summary copied. Paste it in a text.')
      }
    } catch {
      /* user cancelled */
    }
  }

  async function resume() {
    if (active && active.id !== trip.id) return alert('End the current trip first.')
    await db.trips.update(trip.id, { endedAt: null })
    go('/', { replace: true })
  }

  async function remove() {
    if (!confirm(`Delete this trip and its ${catches.length} catches? This can't be undone.`)) return
    await deleteTrip(trip.id)
    go('/', { replace: true })
  }

  return (
    <>
      <TopBar title={spot?.name || 'Trip'} onBack={() => back()} />
      <div className="page">
        <div className="card hero">
          <small>{fmtDateLong(trip.startedAt)} · {fmtTime(trip.startedAt)}–{trip.endedAt ? fmtTime(trip.endedAt) : 'now'}</small>
          <div className="grid3" style={{ marginTop: 10 }}>
            <div className="stat" style={{ background: 'rgba(255,255,255,0.15)' }}><b>{t.total}</b><small>caught</small></div>
            <div className="stat" style={{ background: 'rgba(255,255,255,0.15)' }}><b>{t.released}</b><small>released</small></div>
            <div className="stat" style={{ background: 'rgba(255,255,255,0.15)' }}><b>{fmtDuration(dur)}</b><small>fished</small></div>
          </div>
          {trip.waterTempF ? <small>Water {trip.waterTempF}°F</small> : null}
          {trip.notes ? <p>{trip.notes}</p> : null}
        </div>

        <div className="card">
          <h2>Leaderboard</h2>
          <table className="table">
            <thead>
              <tr><th>Angler</th><th>Fish</th><th>Rel.</th><th>Biggest</th></tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.angler.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="dot" style={{ background: r.angler.color, display: 'inline-block', width: 10, height: 10, borderRadius: 5, marginRight: 6 }} />
                    {i === 0 && r.count ? '🏆 ' : ''}
                    {r.angler.name}
                  </td>
                  <td className="mono">{r.count}</td>
                  <td className="mono">{r.released}</td>
                  <td>{r.biggest ? `${speciesName(r.biggest)} ${fmtLength(r.biggest.lengthIn)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Object.keys(bySpecies).length > 0 && (
          <div className="card">
            <h2>Species</h2>
            <div className="chips">
              {Object.entries(bySpecies).map(([n, k]) => (
                <span key={n} className="chip">{n} <b>×{k}</b></span>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h2>All catches</h2>
          {!catches.length ? (
            <Empty>Skunked. Still worth logging: effort counts in Insights.</Empty>
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
                      {c.cond?.tide ? ` · ${c.cond.tide}` : ''}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={share}>📤 Share summary</button>
        {trip.endedAt ? (
          <button onClick={resume}>↩️ Resume this trip</button>
        ) : (
          <button onClick={() => go(`/log/${trip.id}`)}>＋ Log catch</button>
        )}
        <button className="btn-danger" onClick={remove}>Delete trip</button>
      </div>
    </>
  )
}
