// ---------------------------------------------------------------------------
// Shared fishing UI used by Explore (spot + fish pages) and the live trip's
// game plan: season / kid / water-temp badges, the rod picker, the
// expandable fish card (bait, lures, rig for your rod, what to look for from
// shore, limits), and the water-temperature card.
// ---------------------------------------------------------------------------
import { useLiveQuery } from 'dexie-react-hooks'
import { getSetting, setSetting } from '../lib/db.js'
import { Toggle } from './ui.jsx'
import { SEASON_LABEL } from '../data/species.js'
import { RODS } from '../data/rods.js'
import { RELATION_LABEL } from '../data/watertemp.js'
import { rigFor } from '../lib/explore.js'
import { regsSummary } from '../lib/regs.js'
import { fmtAgo } from '../lib/watertemp.js'
import { fmtDate } from '../lib/format.js'

const SEASON_BADGE = ['', 'badge', 'badge good', 'badge warn']
export const SEASON_ICON = ['💤', '🙂', '👍', '🔥']

export function SeasonBadge({ level }) {
  return (
    <span className={SEASON_BADGE[level] || 'badge'}>
      {SEASON_ICON[level]} {SEASON_LABEL[level]}
    </span>
  )
}

export function KidEase({ n }) {
  if (!n) return <span className="badge stop">Grown-up rod</span>
  return <span className="badge info">🧒 {n >= 5 ? 'Super easy' : n >= 4 ? 'Easy' : n >= 3 ? 'Medium' : 'Hard'}</span>
}

/** Water temp vs. this species' preferred range. */
export function FitBadge({ fit, tempF }) {
  if (!fit) return null
  const cls = fit.level === 'prime' ? 'good' : fit.level === 'active' ? 'info' : 'stop'
  return <span className={`badge ${cls}`}>🌡️ {Math.round(tempF)}°F: {fit.label}</span>
}

/** Which rod's rig to show. Remembered on the phone; defaults to the kids' rod. */
export function useRod() {
  const saved = useLiveQuery(() => getSetting('rigFor', 'kids'), [])
  const rod = saved || 'kids'
  return [rod, (r) => setSetting('rigFor', r)]
}

export function RodPicker({ rod, setRod }) {
  const opts = [['kids', '🧒 Kids'], ['fresh', '🏞️ Fresh'], ['salt', '🌊 Salt']]
  return <Toggle value={rod} onChange={setRod} options={opts} />
}

/**
 * One fish: badges, and when open: what to look for from shore, bait, lure,
 * the rig for the chosen rod, ID check, limits.
 * @param row  a fishForSpot() row { species, season, kidEase, closed, fit, regs }
 */
export function FishCard({ row, rod, open, onToggle, spot, tempF, spotLink }) {
  const s = row.species
  const rig = rigFor(s, rod)
  // e.g. Lake Ashwood: no minnows as bait (SC Reg 123-210)
  const banned =
    spot?.baitBan && [...(s.baits || []), rig?.text || ''].some((b) => spot.baitBan.words.some((w) => b.toLowerCase().includes(w)))
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <button className="row between" onClick={onToggle} style={{ border: 0, padding: 0, minHeight: 0, background: 'transparent', textAlign: 'left' }}>
        <div className="grow">
          <h3 style={{ fontSize: '1.15rem' }}>{s.name}</h3>
          <div className="chips" style={{ marginTop: 6, gap: 6 }}>
            <SeasonBadge level={row.season} />
            <KidEase n={row.kidEase} />
            <FitBadge fit={row.fit} tempF={tempF} />
            {row.closed && <span className="badge stop">⛔ Closed season</span>}
          </div>
        </div>
        <span style={{ fontSize: '1.4rem' }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          {banned && <div className="alert stop">⛔ {spot.baitBan.text}</div>}
          {s.shore?.length > 0 && (
            <div>
              <b>👀 What to look for from shore</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {s.shore.map((t) => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}
              </ul>
            </div>
          )}
          {s.baits?.length > 0 && <p><b>🪱 Bait:</b> {s.baits.slice(0, 3).join(', ')}</p>}
          {s.lures?.length > 0 && s.lures[0] && !/Not a lure|^Rarely|^Pier king/.test(s.lures[0]) && (
            <p><b>✨ Lure:</b> {s.lures.slice(0, 2).join(', ')}</p>
          )}
          {rig && (
            <div className="alert good">
              <b>🎣 {RODS[rig.rod].name}{rig.fallback ? ' (use this rod)' : ''}:</b> {rig.text}
            </div>
          )}
          {s.temp && (
            <p className="muted" style={{ fontSize: '0.88rem' }}>
              🌡️ Feeds best in {s.temp.best[0]}–{s.temp.best[1]}°F water (active {s.temp.active[0]}–{s.temp.active[1]}°F).
            </p>
          )}
          <p className="muted" style={{ fontSize: '0.9rem' }}>🔍 ID: {s.idTips}</p>
          <p style={{ fontSize: '0.9rem' }}><b>📏 Keep it?</b> {regsSummary(row.regs)}</p>
          {s.eat && <div className="alert warn">🍽️ {s.eat}</div>}
          <div className="row wrap">
            <a href={`#/species/${s.id}`}>Full fish guide →</a>
            {spotLink}
          </div>
        </>
      )}
    </div>
  )
}

function sensorUrl(src) {
  return src.kind === 'coops'
    ? `https://tidesandcurrents.noaa.gov/stationhome.html?id=${src.id}`
    : `https://waterdata.usgs.gov/monitoring-location/USGS-${src.id}/`
}

/** Water temperature for a spot: live sensor (when online), the normal for the date, and a planning estimate. */
export function WaterTempCard({ wt, date = null, compact = false }) {
  if (!wt?.info) return null
  const { info, live, stale, normal, diff, isToday } = wt
  const src = info.source
  const when = date ? new Date(`${date}T12:00`) : new Date()
  const est = !isToday && live && normal != null ? Math.round((normal + diff) * 10) / 10 : null
  const head = isToday && live ? `${live.tempF.toFixed(1)}°F now` : est != null ? `≈${est.toFixed(0)}°F expected` : `${normal?.toFixed(0)}°F normal`
  return (
    <div className={compact ? 'stack' : 'card stack'} style={{ gap: 6 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>🌡️ Water {head}</h3>
        {live && diff != null && (
          <span className={`badge ${Math.abs(diff) < 2 ? '' : diff > 0 ? 'warn' : 'info'}`}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}° vs normal
          </span>
        )}
      </div>
      {live && (
        <small className="muted">
          {isToday ? '' : `Today's reading ${live.tempF.toFixed(1)}°F. `}
          {src.short} · {fmtAgo(live.at)} · <a href={sensorUrl(src)} target="_blank" rel="noreferrer">sensor</a>
        </small>
      )}
      {!live && stale && (
        <small className="muted">Last reading {stale.tempF.toFixed(1)}°F ({fmtAgo(stale.at)}); sensor may be offline.</small>
      )}
      {!live && !stale && (
        <small className="muted">{src.liveNote || 'No live reading yet. Connect to the internet to pull one.'}</small>
      )}
      <small className="muted">
        Normal for {fmtDate(when)}: <b>{normal?.toFixed(1)}°F</b> ({src.years} average){' '}
        {est != null && `· today's ${diff > 0 ? '+' : ''}${diff.toFixed(1)}° difference usually holds for a few days`}
      </small>
      <small className="muted">
        📍 {src.name}: {RELATION_LABEL[info.relation]}
        {info.miles != null && info.relation !== 'at' ? ` (~${info.miles} mi)` : ''}. {info.note || ''}
      </small>
    </div>
  )
}
