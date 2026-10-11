// ---------------------------------------------------------------------------
// 🎯 WHERE DO I CAST?  (#/cast?spot=ID)
//   1. 📍 Where are you?   GPS (no signal needed) → the spot you're at, or the
//                          nearest one + a satellite-view link
//   2. 👀 What do you see? tap the things you can see (optionally on a photo
//                          of the water, to point at them)
//   3. 🎯 The plan         ranked cast targets: why, where, how deep, which
//                          fish, the rig for your rod, and how to reel it
//   + 🐟 Fish on! (how to reel one in)  + 📏 How deep is it?
// The app doesn't analyze the photo itself; the kid is the eyes.
// Logic: lib/castcoach.js · data: data/clues.js
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveTrip } from '../lib/db.js'
import { TopBar, back, useOnline } from '../components/ui.jsx'
import { useRod, RodPicker } from '../components/fishing.jsx'
import { useSpotTides } from '../components/kid.jsx'
import { getPosition } from '../lib/capture.js'
import { sunDay, lightPeriodAt } from '../lib/sun.js'
import { stageAt } from '../lib/tides.js'
import { useWaterTemp } from '../lib/watertemp.js'
import { whereAmI, satelliteLink, cluesFor, castPlan, depthAdvice, tideDir, shortName } from '../lib/castcoach.js'
import { LINES, FIGHT, DEPTH_TIPS, ZONE_LABEL, HANDLE } from '../data/clues.js'
import { SPOT_INFO } from '../data/spotInfo.js'

const LIGHT_LABEL = { dawn: '🌅 Sun coming up', dusk: '🌇 Sun going down', day: '☀️ Bright daylight', night: '🌙 Dark' }
const TIDE_LABEL = { rising: '🌊 Tide coming in', falling: '🌊 Tide going out', slack: '😴 Tide turning (slow)' }
const fmtMi = (mi) => (mi < 0.1 ? 'right here' : mi < 10 ? `${mi.toFixed(1)} mi away` : `${Math.round(mi)} mi away`)

export default function Cast({ spotId: spotParam }) {
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const trip = useLiveQuery(() => getActiveTrip(), [])
  const [fix, setFix] = useState(null) // { pos, where } | { error }
  const [locating, setLocating] = useState(false)
  const [pickedId, setPickedId] = useState(null)

  async function locate() {
    setLocating(true)
    const pos = await getPosition({ timeout: 20000 })
    setLocating(false)
    if (!pos) return setFix({ error: true })
    setFix({ pos, where: whereAmI(pos, spots) })
    setPickedId(null)
  }

  // No spot handed in (not from a trip or spot page)? Ask the GPS right away.
  const asked = useRef(false)
  useEffect(() => {
    if (!spotParam && spots && trip !== undefined && !trip && !asked.current) {
      asked.current = true
      locate()
    }
  }, [spotParam, spots, trip]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!spots || trip === undefined) return null
  const byId = Object.fromEntries(spots.map((s) => [s.id, s]))
  // Which spot are we coaching for? manual pick > GPS "you're at" > link/trip > GPS nearest
  const spot =
    byId[pickedId] ||
    fix?.where?.at ||
    byId[spotParam] ||
    (trip ? byId[trip.spotId] : null) ||
    fix?.where?.nearest?.spot ||
    null
  const targets = trip && spot && trip.spotId === spot.id ? trip.targetIds || [] : []

  return (
    <>
      <TopBar title="🎯 Where do I cast?" onBack={() => back('/')} />
      <div className="page">
        <WhereCard spots={spots} spot={spot} fix={fix} locating={locating} onLocate={locate} onPick={(id) => setPickedId(id)} />
        {spot && <Coach key={spot.id} spot={spot} targets={targets} pos={fix?.pos || null} />}
      </div>
    </>
  )
}

/** Step 1: where are you? */
function WhereCard({ spots, spot, fix, locating, onLocate, onPick }) {
  const online = useOnline()
  const w = fix?.where
  const info = spot ? SPOT_INFO[spot.key] : null
  return (
    <div className="card stack">
      <h2>📍 Where are you?</h2>
      {locating && <p>Finding you with GPS… (works without signal, can take 10–30 seconds)</p>}
      {fix?.error && <div className="alert warn">Couldn't get a GPS fix. Turn on Location, step into the open, or pick your spot below.</div>}
      {w?.at && (
        <div className="alert good" style={{ fontSize: '1.05rem' }}>
          ✅ You're at <b>{w.at.name}</b>
        </div>
      )}
      {w && !w.at && (
        <div className="alert info">
          You're not at a spot in the app. The closest is <b>{w.nearest.spot.name}</b> ({fmtMi(w.nearest.mi)}), so tide and water
          temp come from there. <a href="#/spot-new">Save where you're standing as a spot</a>.
        </div>
      )}
      {!w && spot && !locating && (
        <p style={{ margin: 0 }}>
          Fishing at <b>{spot.name}</b>.
        </p>
      )}
      <div className="row wrap">
        <button className="btn-small" onClick={onLocate} disabled={locating}>📍 {fix ? 'Find me again' : 'Use my GPS'}</button>
        {fix?.pos && online && (
          <a className="btn btn-small" href={satelliteLink(fix.pos.lat, fix.pos.lon)} target="_blank" rel="noreferrer">🛰️ Satellite view</a>
        )}
      </div>
      {fix?.pos && online && (
        <small className="muted">
          🛰️ Tip: from above you can see sandbars (light), troughs and drop-offs (dark), points, creek mouths and oyster beds.
        </small>
      )}
      <select aria-label="Spot" value={spot?.id ?? ''} onChange={(e) => onPick(Number(e.target.value))}>
        {!spot && <option value="">Pick your spot…</option>}
        {spots.map((s) => (
          <option key={s.id} value={s.id}>{s.water === 'salt' ? '🌊' : '🏞️'} {s.name}</option>
        ))}
      </select>
      {info?.whereToFish && (
        <small>
          📌 <b>Where people fish here:</b> {info.whereToFish}
        </small>
      )}
    </div>
  )
}

/** Steps 2 + 3: what do you see → the plan. */
function Coach({ spot, targets, pos }) {
  const [rod, setRod] = useRod()
  const [picked, setPicked] = useState([])
  const [marks, setMarks] = useState({}) // clueId → { x, y } in % of the photo
  const [armed, setArmed] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [show, setShow] = useState(false)
  const planRef = useRef(null)
  const preds = useSpotTides(spot)
  const wt = useWaterTemp(spot)

  useEffect(() => () => photo && URL.revokeObjectURL(photo), [photo])

  // right-now conditions
  const now = Date.now()
  const here = pos || spot
  const light = lightPeriodAt(now, sunDay(new Date(now), here.lat, here.lon))
  const tide = spot.water === 'salt' && preds ? tideDir(stageAt(preds, now)?.stage) : null
  const tempF = wt?.best ?? null
  const month = new Date(now).getMonth()
  const clues = cluesFor(spot.water, month)

  // nothing picked → start with the "always there" spots for this water
  const fallback = spot.water === 'salt' ? ['pilings', 'trough'] : ['drop', 'point']
  const ids = picked.length ? picked : fallback
  const plan = useMemo(
    () => castPlan({ clueIds: ids, water: spot.water, month, light, tide, targets, rod }),
    [ids.join(), spot.water, month, light, tide, targets.join(), rod], // eslint-disable-line react-hooks/exhaustive-deps
  )

  function toggle(id) {
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id))
      const { [id]: _, ...rest } = marks
      setMarks(rest)
      if (armed === id) setArmed(null)
    } else {
      setPicked([...picked, id])
      if (photo) setArmed(id)
    }
  }

  function onPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(URL.createObjectURL(f))
    setMarks({})
    setArmed(picked.at(-1) || null)
  }

  function tapPhoto(e) {
    if (!armed) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setMarks({ ...marks, [armed]: { x, y } })
    setArmed(null)
  }

  function go() {
    setShow(true)
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const rankOf = Object.fromEntries(plan.map((p, i) => [p.clue.id, i + 1]))
  const armedClue = clues.find((c) => c.id === armed)

  return (
    <>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="badge info">{LIGHT_LABEL[light]}</span>
        {tide && <span className="badge info">{TIDE_LABEL[tide]}</span>}
        {tempF != null && <span className="badge info">🌡️ Water {Math.round(tempF)}°F</span>}
      </div>

      <div className="card stack">
        <h2>👀 What do you see?</h2>
        <p className="muted" style={{ margin: 0 }}>Look at the water and tap everything you can spot. Fish hang out where something is different.</p>

        <label className="btn btn-small" style={{ alignSelf: 'flex-start' }}>
          📸 {photo ? 'New photo' : 'Snap the water (optional)'}
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: 'none' }} aria-label="Photo of the water" />
        </label>
        {photo && (
          <>
            <div onClick={tapPhoto} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: armed ? 'crosshair' : 'default' }}>
              <img src={photo} alt="The water" style={{ width: '100%', display: 'block' }} />
              {Object.entries(marks).map(([id, m]) => {
                const c = clues.find((x) => x.id === id)
                const n = show ? rankOf[id] : null
                return (
                  <div key={id} aria-label={`marker ${c?.label}`}
                    style={{
                      position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)',
                      background: n === 1 ? 'var(--good)' : 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 999,
                      padding: '4px 8px', fontWeight: 800, fontSize: '0.95rem', border: '2px solid #fff', whiteSpace: 'nowrap',
                    }}>
                    {n ? `🎯 ${n}` : c?.icon}
                  </div>
                )
              })}
            </div>
            <small className={armed ? '' : 'muted'}>
              {armedClue
                ? <>👉 Now tap the photo where you see: <b>{armedClue.icon} {armedClue.label}</b></>
                : 'Pick something below, then tap the photo to point at it. (The photo isn\'t saved.)'}
            </small>
          </>
        )}

        <div className="grid2" style={{ gap: 8 }}>
          {clues.map((c) => {
            const on = picked.includes(c.id)
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} title={c.see}
                style={{
                  flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', minHeight: 64, gap: 2, padding: '8px 10px',
                  border: on ? '3px solid var(--brand)' : '1px solid var(--line)',
                  background: on ? 'color-mix(in srgb, var(--brand) 12%, var(--surface))' : 'var(--surface)',
                }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{c.icon}{on ? ' ✓' : ''}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.label}</span>
              </button>
            )
          })}
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <small className="muted">Which rod?</small>
          <RodPicker rod={rod} setRod={setRod} />
        </div>
        <button className="btn-primary btn-big" onClick={go}>
          🎯 {picked.length ? 'Show me where to cast' : 'I don\'t see anything special'}
        </button>
      </div>

      {show && (
        <div ref={planRef} className="stack">
          {!picked.length && (
            <div className="alert info">
              Nothing stands out? Start here. Fish the bottom close to anything that's different: a post, a dip, a drop-off.
            </div>
          )}
          {plan.slice(0, 3).map((p, i) => (
            <PlanCard key={p.clue.id} n={i + 1} p={p} light={light} tempF={tempF} />
          ))}
          <FishOn />
          <DepthCard />
        </div>
      )}
    </>
  )
}

function PlanCard({ n, p, light, tempF }) {
  const { clue: c, fish, line, gear, notes } = p
  const depth = depthAdvice({ zone: c.zone, light, tempF, fish })
  const L = LINES[line]
  return (
    <div className="card stack" style={{ gap: 8, ...(n === 1 ? { border: '3px solid var(--good)' } : {}) }}>
      <span className={`badge ${n === 1 ? 'good' : ''}`} style={{ alignSelf: 'flex-start', fontSize: '0.85rem' }}>
        {n === 1 ? '🎯 Cast here first' : `🎯 Then try #${n}`}
      </span>
      <h2 style={{ margin: 0 }}>{c.icon} {c.label}</h2>
      <div><b>Why:</b> {c.why}</div>
      <div><b>👉 Cast:</b> {c.cast}</div>
      <div><b>📏 Depth:</b> {ZONE_LABEL[depth.zone]}</div>
      {[...notes, ...depth.notes].map((x) => (
        <small key={x}>{x}</small>
      ))}
      {c.safety && <div className="alert stop">⚠️ {c.safety}</div>}
      {fish.length > 0 && (
        <div><b>🐟 You might catch:</b> {fish.map(shortName).join(', ')}</div>
      )}
      <div><b>🧰 Setup:</b> {L.rigHint}</div>
      {gear && (
        <div>
          <b>{gear.kind === 'bait' ? '🦐 Bait' : '✨ Lure'}:</b> {gear.text}{' '}
          <a href={`#/species/${gear.fish.id}`}>({shortName(gear.fish)} guide)</a>
        </div>
      )}
      {fish.filter((s) => HANDLE[s.id]).map((s) => (
        <small key={s.id}>✋ <b>Careful, {shortName(s)}:</b> {HANDLE[s.id]}</small>
      ))}
      <details open={n === 1}>
        <summary><b>{L.icon} How to fish it: {L.name}</b></summary>
        <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          {L.steps.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      </details>
    </div>
  )
}

function FishOn() {
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <h2>🐟 Fish on! How to reel it in</h2>
      {FIGHT.map((f) => (
        <div key={f.text}>{f.icon} {f.text}</div>
      ))}
    </div>
  )
}

function DepthCard() {
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <h2>📏 How deep is it?</h2>
      {DEPTH_TIPS.map((d) => (
        <div key={d.title}>
          {d.icon} <b>{d.title}:</b> {d.text}
        </div>
      ))}
    </div>
  )
}
