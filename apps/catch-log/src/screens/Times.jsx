// ---------------------------------------------------------------------------
// Times: best windows for a spot + day: tide movement + dawn/dusk light,
// water temperature (live sensor + normal for the date), sun times, tide
// range vs average (salt), a 24-hour timeline, and a 7-day planner.
// Everything here works offline (tides once downloaded).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, setSetting } from '../lib/db.js'
import { TopBar, useOnline, go } from '../components/ui.jsx'
import { sunDay, dayKey, dayBounds } from '../lib/sun.js'
import { scoreDay, WEIGHTS } from '../lib/windows.js'
import { getCachedTides, downloadTides, extremesBetween, heightAt, tideRangeForDay } from '../lib/tides.js'
import { fmtTime, fmtRange, fmtDate, fmtDateLong, todayKey } from '../lib/format.js'
import { useWaterTemp } from '../lib/watertemp.js'
import { WaterTempCard } from '../components/fishing.jsx'
import { BestTimeHero, WeekStrip } from '../components/kid.jsx'

function shiftDay(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n, 12))
}

export default function Times({ spotId: spotParam, date: dateParam }) {
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const saved = useLiveQuery(() => getSetting('timesSpotId'), [])
  const [date, setDate] = useState(dateParam || todayKey())
  const spotId = spotParam || saved || spots?.find((s) => s.key === 'springmaid-pier')?.id
  const spot = spots?.find((s) => s.id === spotId)

  useEffect(() => {
    if (spotParam) setSetting('timesSpotId', spotParam)
  }, [spotParam])

  const tides = useLiveQuery(() => (spot?.tideStation ? getCachedTides(spot.tideStation) : null), [spot?.tideStation])

  if (!spots) return null
  return (
    <>
      <TopBar title="Best times" />
      <div className="page">
        <div className="card stack">
          <select
            aria-label="Spot"
            value={spotId || ''}
            onChange={(e) => go(`/times?spot=${e.target.value}&date=${date}`, { replace: true })}
          >
            <optgroup label="🌊 Saltwater">
              {spots.filter((s) => s.water === 'salt').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
            <optgroup label="🏞️ Freshwater">
              {spots.filter((s) => s.water === 'fresh').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          </select>
          <div className="row between">
            <button className="btn-small" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">‹</button>
            <button className="btn-small btn-ghost" onClick={() => setDate(todayKey())}>
              <b>{date === todayKey() ? 'Today' : fmtDate(`${date}T12:00`)}</b>
            </button>
            <button className="btn-small" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
          </div>
        </div>
        {spot && <DayView spot={spot} date={date} tides={tides} onPickDay={setDate} />}
      </div>
    </>
  )
}

function TideStatus({ spot, tides, date }) {
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (spot.water !== 'salt') return null
  const { start } = dayBounds(new Date(`${date}T12:00`))
  const covered = tides && start.getTime() >= tides.from && start.getTime() + 864e5 <= tides.to
  if (covered) return null
  async function get() {
    setBusy(true)
    setErr('')
    try {
      await downloadTides(spot.tideStation)
    } catch (e) {
      setErr(String(e.message || e))
    }
    setBusy(false)
  }
  return (
    <div className="alert warn stack">
      <div>
        {tides ? 'Tide data doesn\'t cover this date.' : 'No tide data saved for this spot yet.'} One download (needs
        signal) saves a full year for offline use.
      </div>
      <button className="btn-small btn-primary" onClick={get} disabled={busy || !online}>
        {busy ? 'Downloading…' : online ? '⬇️ Download tides' : 'Offline: connect to download'}
      </button>
      {err && <small>Error: {err}</small>}
    </div>
  )
}

/** Badge for tide size vs this station's yearly average (from NOAA data). */
function TideSize({ range }) {
  const info = range
  if (!info) return null
  const cls = info.size === 'big' ? 'good' : info.size === 'small' ? '' : 'info'
  return <span className={`badge ${cls}`}>🌊 {info.label}</span>
}

function DayView({ spot, date, tides, onPickDay }) {
  const preds = tides?.predictions || null
  const salt = spot.water === 'salt'
  const day = useMemo(() => sunDay(date, spot.lat, spot.lon), [date, spot.lat, spot.lon])
  const scored = useMemo(() => scoreDay(day, spot.water, preds), [day, spot.water, preds])
  const { start, end } = dayBounds(day.date)
  const hilo = preds ? extremesBetween(preds, start, end) : []
  const range = salt ? tideRangeForDay(preds, start, end) : null
  const w = scored.usedTides ? WEIGHTS.salt : WEIGHTS.fresh
  const wt = useWaterTemp(spot, date)

  return (
    <>
      <TideStatus spot={spot} tides={tides} date={date} />

      <BestTimeHero spot={spot} date={date} preds={preds} />
      <WeekStrip spot={spot} preds={preds} selectedKey={date} onPickDay={onPickDay} />

      <h2 style={{ marginTop: 8 }}>🔎 The details</h2>

      <div className="card stack" style={{ gap: 6 }}>
        <h2>{fmtDateLong(day.date)}</h2>
        <div className="muted">
          🌅 First light {fmtTime(day.firstLight)} · Sunrise {fmtTime(day.sunrise)}
          <br />
          🌇 Sunset {fmtTime(day.sunset)} · Last light {fmtTime(day.lastLight)}
        </div>
        {salt && range && <div><TideSize range={range} /></div>}
      </div>

      <WaterTempCard wt={wt} date={date} />

      <div className="card stack">
        <h2>All good windows</h2>
        {scored.windows.map((win, i) => (
          <div className="window" key={i}>
            <div className={`score ${i === 0 ? 'hi' : ''}`}>{win.score}</div>
            <div>
              <b>{fmtRange(win.start, win.end)}</b>
              <div className="muted" style={{ fontSize: '0.9rem' }}>{win.reasons.join(' · ') || 'Steady'}</div>
            </div>
          </div>
        ))}
        <small className="muted">
          {scored.usedTides
            ? `Score = moving water ${Math.round(w.tide * 100)}% + dawn/dusk light ${Math.round(w.light * 100)}%. `
            : 'Lakes and rivers have no tides, so dawn and dusk are the windows. Check water temp on site. '}
          <a href="#/guide?tab=science">Why?</a>
        </small>
      </div>

      <div className="card">
        <Timeline day={day} scored={scored} preds={preds} />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--accent)' }} />Score</span>
          {scored.usedTides && <span><i style={{ background: 'var(--tide)' }} />Tide</span>}
          <span><i style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }} />Dark</span>
        </div>
      </div>

      {salt && (
        <div className="card">
          <h3>Tides</h3>
          {hilo.length ? (
            <div className="grid2" style={{ fontSize: '0.92rem' }}>
              {hilo.map((h) => (
                <div key={h.t}>
                  <b>{h.type === 'H' ? '▲ High' : '▼ Low'}</b> {fmtTime(h.t)}
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{h.v.toFixed(1)} ft</div>
                </div>
              ))}
            </div>
          ) : (
            <small className="muted">No tide data</small>
          )}
          <small className="muted">NOAA station {spot.tideStation}</small>
        </div>
      )}

    </>
  )
}

/** 24-hour SVG: night shading, score area, tide curve, best-window outlines. */
function Timeline({ day, scored, preds }) {
  const W = 600
  const H = 160
  const top = 8
  const chartH = 120
  const { start } = dayBounds(day.date)
  const t0 = start.getTime()
  const x = (t) => ((new Date(t).getTime() - t0) / 864e5) * W
  const yScore = (s) => top + chartH - (s / 100) * chartH

  const scorePath =
    `M0,${top + chartH} ` +
    scored.slots.map((s) => `L${x(s.t).toFixed(1)},${yScore(s.score).toFixed(1)}`).join(' ') +
    ` L${W},${top + chartH} Z`

  let tidePath = null
  if (scored.usedTides) {
    const pts = []
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i <= 96; i++) {
      const t = t0 + i * 15 * 60e3
      const h = heightAt(preds, t)
      if (h != null) {
        pts.push([t, h])
        lo = Math.min(lo, h)
        hi = Math.max(hi, h)
      }
    }
    const span = hi - lo || 1
    tidePath = pts
      .map(([t, h], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${(top + chartH - ((h - lo) / span) * (chartH - 10) - 5).toFixed(1)}`)
      .join(' ')
  }

  const hours = [0, 3, 6, 9, 12, 15, 18, 21]
  return (
    <svg className="timeline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="24-hour fishing timeline">
      {/* night shading */}
      <rect x="0" y={top} width={x(day.sunrise)} height={chartH} style={{ fill: 'var(--surface-2)' }} />
      <rect x={x(day.sunset)} y={top} width={W - x(day.sunset)} height={chartH} style={{ fill: 'var(--surface-2)' }} />
      {/* score */}
      <path d={scorePath} style={{ fill: 'var(--accent)', opacity: 0.35 }} />
      {/* best windows outline */}
      {scored.windows.map((w, i) => (
        <rect key={i} x={x(w.start)} y={top} width={x(w.end) - x(w.start)} height={chartH} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: i === 0 ? 3 : 1.5 }} rx="4" />
      ))}
      {tidePath && <path d={tidePath} style={{ fill: 'none', stroke: 'var(--tide)', strokeWidth: 2.5 }} />}
      {/* now marker */}
      {Date.now() > t0 && Date.now() < t0 + 864e5 && (
        <line x1={x(Date.now())} x2={x(Date.now())} y1={top} y2={top + chartH} style={{ stroke: 'var(--stop)', strokeWidth: 2 }} />
      )}
      {/* hour ticks */}
      {hours.map((h) => (
        <g key={h}>
          <line x1={(h / 24) * W} x2={(h / 24) * W} y1={top} y2={top + chartH} style={{ stroke: 'var(--line)', strokeWidth: 1 }} />
          <text x={(h / 24) * W + 3} y={H - 8} style={{ fill: 'var(--muted)', fontSize: 13 }}>
            {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
          </text>
        </g>
      ))}
    </svg>
  )
}
