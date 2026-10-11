// ---------------------------------------------------------------------------
// TIME SCHOOL: teaches kids how to pick a fishing time, using the real
// data for the spot they choose, then quizzes them on today's real times.
//   Lesson 1 🌅 Low light   Lesson 2 🌊 Moving water   Lesson 3 🌡️ Water temp
//   Quiz: "Which time would you pick?" (answers come from the app's scoring)
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting } from '../lib/db.js'
import { TopBar, back, go } from '../components/ui.jsx'
import { useSpotTides, Fish } from '../components/kid.jsx'
import { WaterTempCard } from '../components/fishing.jsx'
import { sunDay, dayBounds, dayKey } from '../lib/sun.js'
import { scoreDay } from '../lib/windows.js'
import { heightAt } from '../lib/tides.js'
import { rating, kidReasons, quizRounds } from '../lib/kidtimes.js'
import { useWaterTemp } from '../lib/watertemp.js'
import { fishForSpot } from '../lib/explore.js'
import { fmtTime } from '../lib/format.js'

export default function Learn({ spotId: spotParam }) {
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const saved = useLiveQuery(() => getSetting('timesSpotId'), [])
  const spotId = spotParam || saved || spots?.find((s) => s.key === 'mb-state-park-pier')?.id
  const spot = spots?.find((s) => s.id === spotId)
  if (!spots || !spot) return null
  return (
    <>
      <TopBar title="🧠 Time School" onBack={() => back('/times')} />
      <div className="page">
        <div className="card stack">
          <p style={{ margin: 0 }}>
            Fish don't eat all day. Three things tell you <b>when</b> they're hungry. Let's learn them using <b>{spot.name}</b>.
          </p>
          <select aria-label="Spot" value={spot.id} onChange={(e) => go(`/learn?spot=${e.target.value}`, { replace: true })}>
            {spots.map((s) => <option key={s.id} value={s.id}>{s.water === 'salt' ? '🌊' : '🏞️'} {s.name}</option>)}
          </select>
        </div>
        <Lessons spot={spot} />
      </div>
    </>
  )
}

function Lessons({ spot }) {
  const preds = useSpotTides(spot)
  const day = useMemo(() => sunDay(new Date(), spot.lat, spot.lon), [spot.lat, spot.lon])
  const scored = useMemo(() => scoreDay(day, spot.water, preds), [day, spot.water, preds])
  const wt = useWaterTemp(spot)
  const temp = wt?.best ?? null
  const happy = fishForSpot(spot, { tempF: temp }).filter((r) => r.fit?.level === 'prime').slice(0, 4)
  const salt = spot.water === 'salt' && !!preds

  return (
    <>
      <div className="card stack">
        <h2>1. 🌅 Sunrise & sunset</h2>
        <p>
          Fish see better in dim light than the little fish and shrimp they eat, and birds can't spot them as easily. So the hour
          around <b>sunrise</b> and <b>sunset</b> is usually the hungriest time of the day.
        </p>
        <div className="grid2">
          <div className="stat"><small>Sunrise today</small><b style={{ fontSize: '1.1rem' }}>{fmtTime(day.sunrise)}</b></div>
          <div className="stat"><small>Sunset today</small><b style={{ fontSize: '1.1rem' }}>{fmtTime(day.sunset)}</b></div>
        </div>
        <small className="muted">👉 Try to have your bait in the water before the sun comes up or as it goes down.</small>
      </div>

      <div className="card stack">
        <h2>2. 🌊 Moving water</h2>
        {salt ? (
          <>
            <p>
              The ocean slides in and out twice a day. That's the <b>tide</b>. When the water moves <b>fast</b> (the middle of
              the tide), it sweeps shrimp and baitfish to the big fish. When the tide <b>turns</b> around at high or low, the
              water stops and fish get lazy.
            </p>
            <TideLesson day={day} preds={preds} slots={scored.slots} />
            <small className="muted">👉 Green = water moving fast = good. Gray = tide turning = slow. Best of all: green AND sunrise/sunset.</small>
          </>
        ) : (
          <p>
            {spot.water === 'salt'
              ? 'Tide data downloads the next time you have signal. Then this lesson shows today\'s tide.'
              : 'Lakes and rivers don\'t have tides. In a river, look for current: fish wait behind rocks and logs for food to float by. In a lake, wind blowing into a bank pushes food there too.'}
          </p>
        )}
      </div>

      <div className="card stack">
        <h2>3. 🌡️ Water temperature</h2>
        <p>
          Fish are cold-blooded. Their body is the same temperature as the water. Every kind of fish has a <b>favorite</b>{' '}
          temperature where it's hungriest. Too cold or too hot and it slows down.
        </p>
        <WaterTempCard wt={wt} compact />
        {happy.length > 0 && (
          <div className="alert good">
            🐟 Fish that LOVE {Math.round(temp)}°F water: <b>{happy.map((r) => r.species.name.replace(/ \(.*\)/, '')).join(', ')}</b>
          </div>
        )}
      </div>

      <Quiz spot={spot} day={day} scored={scored} preds={salt ? preds : null} />
    </>
  )
}

/** Today's tide curve with fast-moving water in green, turning water in gray, plus sunrise/sunset marks. */
function TideLesson({ day, preds, slots }) {
  const W = 600
  const H = 150
  const top = 10
  const ch = 110
  const { start } = dayBounds(day.date)
  const t0 = start.getTime()
  const x = (t) => ((t - t0) / 864e5) * W
  const pts = []
  let lo = Infinity
  let hi = -Infinity
  for (const s of slots) {
    const h = heightAt(preds, s.t)
    if (h == null) continue
    pts.push({ t: s.t, h, fast: s.tide >= 0.5 })
    lo = Math.min(lo, h)
    hi = Math.max(hi, h)
  }
  const span = hi - lo || 1
  const y = (h) => top + ch - ((h - lo) / span) * (ch - 10) - 5
  const segs = []
  for (let i = 1; i < pts.length; i++) {
    segs.push(
      <line key={i} x1={x(pts[i - 1].t)} y1={y(pts[i - 1].h)} x2={x(pts[i].t)} y2={y(pts[i].h)}
        style={{ stroke: pts[i].fast ? 'var(--good)' : 'var(--muted)', strokeWidth: pts[i].fast ? 6 : 3, strokeLinecap: 'round' }} />,
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="timeline" role="img" aria-label="Today's tide: fast water in green">
      <rect x="0" y={top} width={x(day.sunrise.getTime())} height={ch} style={{ fill: 'var(--surface-2)' }} />
      <rect x={x(day.sunset.getTime())} y={top} width={W - x(day.sunset.getTime())} height={ch} style={{ fill: 'var(--surface-2)' }} />
      {segs}
      <text x={x(day.sunrise.getTime()) - 12} y={H - 6} style={{ fontSize: 18 }}>🌅</text>
      <text x={x(day.sunset.getTime()) - 12} y={H - 6} style={{ fontSize: 18 }}>🌇</text>
      {Date.now() > t0 && Date.now() < t0 + 864e5 && (
        <line x1={x(Date.now())} x2={x(Date.now())} y1={top} y2={top + ch} style={{ stroke: 'var(--stop)', strokeWidth: 2 }} />
      )}
    </svg>
  )
}

/** "Which time would you pick?" using today's real scores. */
function Quiz({ spot, day, scored, preds }) {
  const rounds = useMemo(() => quizRounds(scored.slots, `${spot.key}|${dayKey(day.date)}`, 5), [scored, spot.key, day])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [right, setRight] = useState(0)
  if (!rounds.length) return null
  if (i >= rounds.length) {
    const r = right >= 4 ? '🏆 Fishing time expert!' : right >= 3 ? '🎣 Nice! You\'re getting it.' : '🙂 Keep practicing!'
    return (
      <div className="card stack" style={{ textAlign: 'center' }}>
        <h2>Quiz done!</h2>
        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{right} / {rounds.length}</div>
        <p>{r}</p>
        <button className="btn-primary" onClick={() => { setI(0); setPicked(null); setRight(0) }}>Play again</button>
      </div>
    )
  }
  const round = rounds[i]
  const choose = (k) => {
    if (picked != null) return
    setPicked(k)
    if (k === round.answer) setRight((n) => n + 1)
  }
  return (
    <div className="card stack">
      <h2>🎮 Quiz: which time would you pick?</h2>
      <small className="muted">Question {i + 1} of {rounds.length} · {spot.name}, today</small>
      <div className="grid2">
        {round.options.map((o, k) => {
          const isAns = k === round.answer
          const style = picked == null ? {} : isAns ? { borderColor: 'var(--good)', borderWidth: 3 } : k === picked ? { borderColor: 'var(--stop)', borderWidth: 3 } : {}
          return (
            <button key={k} className="btn-big" style={{ flexDirection: 'column', minHeight: 84, ...style }} onClick={() => choose(k)}>
              <b>{fmtTime(o.start)}</b>
              <small>to {fmtTime(o.end)}</small>
            </button>
          )
        })}
      </div>
      {picked != null && (
        <>
          <div className={`alert ${picked === round.answer ? 'good' : 'stop'}`}>
            {picked === round.answer ? '✅ Yes! ' : '❌ Not quite. '}
            <b>{fmtTime(round.options[round.answer].start)}</b> is better.
          </div>
          {round.options.map((o, k) => (
            <div key={k} className="stack" style={{ gap: 2 }}>
              <b>{fmtTime(o.start)}: <Fish n={rating(o.score).fish} /> {rating(o.score).label}</b>
              {kidReasons(o.start, o.end, day, scored.slots, preds).map((x) => (
                <small key={x.text}>{x.good ? '👍' : '👎'} {x.icon} {x.text}</small>
              ))}
            </div>
          ))}
          <button className="btn-primary" onClick={() => { setI(i + 1); setPicked(null) }}>
            {i + 1 < rounds.length ? 'Next question →' : 'See my score'}
          </button>
        </>
      )}
    </div>
  )
}
