// ---------------------------------------------------------------------------
// Kid-first "when should we go?" UI:
//   <BestTimeHero>  big "Go fishing at 6:15 AM" card with 1–3 fish + reasons
//   <WeekStrip>     7 day tiles, best day circled, one sentence on why
// Both use the same scoring as the grown-up details (lib/windows.js).
// ---------------------------------------------------------------------------
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { sunDay, dayBounds, dayKey } from '../lib/sun.js'
import { scoreDay } from '../lib/windows.js'
import { getCachedTides, tideRangeForDay } from '../lib/tides.js'
import { rating, kidReasons, weekSummary } from '../lib/kidtimes.js'
import { fmtTime } from '../lib/format.js'

/** Cached NOAA predictions for a spot (null for freshwater / not downloaded). */
export function useSpotTides(spot) {
  const row = useLiveQuery(() => (spot?.tideStation ? getCachedTides(spot.tideStation) : null), [spot?.tideStation])
  return row?.predictions || null
}

function noonFor(date) {
  if (!date) return new Date()
  return typeof date === 'string' ? new Date(`${date}T12:00`) : new Date(date)
}

/** 6:15 AM → "6:15a" so 7 tiles fit across a phone. */
function shortTime(d) {
  return fmtTime(d).replace(':00', '').replace(/\s?([AP])M/i, (_, x) => x.toLowerCase())
}

export function Fish({ n }) {
  return (
    <span aria-label={`${n} of 3 fish`} style={{ letterSpacing: 2 }}>
      {'🐟'.repeat(n)}
      <span style={{ opacity: 0.2 }}>{'🐟'.repeat(3 - n)}</span>
    </span>
  )
}

/**
 * The obvious answer: when to go today (or on `date`), how good, and why.
 * For today, a window that already ended is skipped in favor of the next one.
 */
/** Windows for a day, best first; for today, only ones that haven't ended. */
function upcomingWindows(spot, preds, when) {
  const day = sunDay(when, spot.lat, spot.lon)
  const scored = scoreDay(day, spot.water, preds)
  const isToday = dayKey(day.date) === dayKey(new Date())
  const now = Date.now()
  const windows = scored.windows.filter((w) => !isToday || w.end.getTime() > now).sort((a, b) => b.score - a.score)
  return { day, scored, isToday, windows }
}

export function BestTimeHero({ spot, date = null, preds, compact = false, children }) {
  // If today's windows are all over, roll forward to tomorrow so there's always an answer.
  const plan = useMemo(() => {
    const p = upcomingWindows(spot, preds, noonFor(date))
    if (p.windows.length || !p.isToday) return { ...p, rolled: false }
    const t = noonFor(date)
    t.setDate(t.getDate() + 1)
    return { ...upcomingWindows(spot, preds, t), rolled: true }
  }, [date, spot, preds])
  const { day, scored, isToday, windows: upcoming, rolled } = plan
  const now = Date.now()
  const best = upcoming[0]
  const next = upcoming[1]

  if (!best) {
    return (
      <div className="card hero stack">
        <h2>🎣 No good times found</h2>
        <p>Try another day.</p>
      </div>
    )
  }
  const r = rating(best.score)
  const reasons = kidReasons(best.start.getTime(), best.end.getTime(), day, scored.slots, scored.usedTides ? preds : null)
  const happeningNow = isToday && best.start.getTime() <= now && best.end.getTime() > now
  const weekday = day.date.toLocaleDateString([], { weekday: 'long' })

  return (
    <div className="card hero stack" style={{ gap: 8 }}>
      <small style={{ opacity: 0.85 }}>
        {happeningNow
          ? '🎯 RIGHT NOW is a good time!'
          : isToday
            ? 'Best time to go today'
            : rolled
              ? `Today's good times are over. Best time tomorrow (${weekday}):`
              : `Best time on ${weekday}`}
      </small>
      <div style={{ fontSize: compact ? '1.7rem' : '2.1rem', fontWeight: 800, lineHeight: 1.1 }}>
        {fmtTime(best.start)}–{fmtTime(best.end)}
      </div>
      <div style={{ fontSize: '1.3rem' }}>
        <Fish n={r.fish} /> <b>{r.label}</b>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        {reasons.map((x) => (
          <div key={x.text} style={{ fontSize: '0.98rem' }}>
            {x.icon} {x.text}
          </div>
        ))}
      </div>
      {next && (
        <small style={{ opacity: 0.85 }}>
          Can't make it? Next best: {fmtTime(next.start)}–{fmtTime(next.end)} ({rating(next.score).label})
        </small>
      )}
      <div className="row wrap">
        <a className="btn btn-small" href={`#/learn?spot=${spot.id}`} style={{ background: 'rgba(255,255,255,0.15)', color: 'inherit', borderColor: 'transparent' }}>
          🧠 How did we pick this?
        </a>
        {children}
      </div>
    </div>
  )
}

/** Next 7 days as big tiles; the best day is circled with a one-line "why". */
export function WeekStrip({ spot, preds, selectedKey = null, onPickDay }) {
  const rows = useMemo(() => {
    const out = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const day = sunDay(d, spot.lat, spot.lon)
      const b = dayBounds(day.date)
      const s = scoreDay(day, spot.water, preds)
      // today: only windows that haven't ended yet (null = today's are over)
      const live = i === 0 ? s.windows.filter((w) => w.end.getTime() > Date.now()) : s.windows
      out.push({
        key: dayKey(day.date),
        date: day.date,
        best: live[0] || null, // windows come sorted best-first
        range: spot.water === 'salt' ? tideRangeForDay(preds, b.start, b.end) : null,
      })
    }
    return out
  }, [spot.lat, spot.lon, spot.water, preds])
  const sum = weekSummary(rows, spot.water)

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <h2>📅 This week</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3 }}>
        {rows.map((r, i) => {
          const rt = r.best ? rating(r.best.score) : { fish: 0, label: 'over for today' }
          const isBest = sum.bestIdx === i
          const sel = selectedKey === r.key
          return (
            <button
              key={r.key}
              onClick={() => onPickDay?.(r.key)}
              aria-label={`${r.date.toLocaleDateString([], { weekday: 'long' })}: ${rt.label}`}
              style={{
                minHeight: 0, minWidth: 0, padding: '6px 1px', flexDirection: 'column', gap: 2, borderRadius: 10, overflow: 'hidden',
                border: isBest ? '3px solid var(--accent)' : sel ? '2px solid var(--brand)' : '1px solid var(--line)',
                background: isBest ? 'color-mix(in srgb, var(--accent) 15%, var(--surface))' : 'var(--surface)',
              }}
            >
              <b style={{ fontSize: '0.8rem' }}>{i === 0 ? 'Today' : r.date.toLocaleDateString([], { weekday: 'short' })}</b>
              <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>{r.best ? '🐟'.repeat(rt.fish) : '✓'}</span>
              <span style={{ fontSize: '0.68rem' }} className="muted">{r.best ? shortTime(r.best.start) : 'done'}</span>
              {r.range && (
                <span style={{ fontSize: '0.62rem' }} title="tide size">{r.range.size === 'big' ? '🌊🌊' : r.range.size === 'small' ? '🌊' : '🌊·'}</span>
              )}
            </button>
          )
        })}
      </div>
      {sum.bestIdx != null && (
        <div style={{ fontSize: '1rem' }}>
          ⭐ <b>Best day: {sum.bestIdx === 0 ? 'Today' : rows[sum.bestIdx].date.toLocaleDateString([], { weekday: 'long' })}</b> at{' '}
          {fmtTime(rows[sum.bestIdx].best.start)}
        </div>
      )}
      <small className="muted">💡 {sum.sentence}</small>
    </div>
  )
}
