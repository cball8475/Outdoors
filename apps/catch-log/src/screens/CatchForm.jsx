// ---------------------------------------------------------------------------
// Log a catch (new) or edit one (existing).
//   • Photo: camera or gallery; resized + thumbnail; EXIF GPS/time used if present
//   • GPS + time captured automatically (works offline)
//   • Angler defaults to "me" (or whoever's chip you tapped on the trip screen)
//   • Species: quick picks from this spot + search
//   • Length / weight / released, with live SC size & creel warnings
//   • Conditions snapshot (light, solunar, tide) saved for Stats → Insights
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteCatch } from '../lib/db.js'
import { TopBar, Toggle, Stepper, AnglerChip, Alerts, back, usePhotoUrl } from '../components/ui.jsx'
import { getPosition, processPhoto } from '../lib/capture.js'
import { conditionsAt } from '../lib/conditions.js'
import { getCachedTides } from '../lib/tides.js'
import { checkCatch, keptCounts, pickRegs, spotWaters } from '../lib/regs.js'
import { SPECIES, SPECIES_BY_ID, speciesForWater } from '../data/species.js'
import { toLb, splitLb, fmtTime, mapsLink } from '../lib/format.js'

function useQueryParam(name) {
  const qs = location.hash.split('?')[1] || ''
  return new URLSearchParams(qs).get(name)
}

export default function CatchForm({ tripId: tripIdProp, catchId }) {
  const isEdit = !!catchId
  const anglerParam = useQueryParam('angler')
  const existing = useLiveQuery(() => (catchId ? db.catches.get(catchId) : null), [catchId])
  const tripId = isEdit ? existing?.tripId : tripIdProp
  const ctx = useLiveQuery(async () => {
    if (!tripId) return null
    const trip = await db.trips.get(tripId)
    if (!trip) return null
    const [spot, anglers, catches] = await Promise.all([
      db.spots.get(trip.spotId),
      db.anglers.toArray(),
      db.catches.where('tripId').equals(tripId).toArray(),
    ])
    return { trip, spot, anglers, catches }
  }, [tripId])

  if (isEdit && existing === undefined) return null
  if (isEdit && existing === null) return <Missing />
  if (!ctx) return null
  return <Form key={catchId || 'new'} ctx={ctx} existing={existing} anglerParam={anglerParam} />
}

function Missing() {
  return (
    <>
      <TopBar title="Catch" onBack={() => back()} />
      <div className="page"><div className="empty">That catch was deleted.</div></div>
    </>
  )
}

function Form({ ctx, existing, anglerParam }) {
  const { trip, spot, anglers, catches } = ctx
  const isEdit = !!existing
  const party = anglers.filter((a) => (trip.anglerIds || []).includes(a.id) || a.id === existing?.anglerId)
  const me = anglers.find((a) => a.isDefault) || party[0]

  const [anglerId, setAnglerId] = useState(existing?.anglerId ?? (anglerParam ? Number(anglerParam) : me?.id))
  const [speciesId, setSpeciesId] = useState(existing?.speciesId ?? '')
  const [speciesOther, setSpeciesOther] = useState(existing?.speciesOther ?? '')
  const [lengthIn, setLengthIn] = useState(existing?.lengthIn != null ? String(existing.lengthIn) : '')
  const w0 = splitLb(existing?.weightLb)
  const [lb, setLb] = useState(w0.lb)
  const [oz, setOz] = useState(w0.oz)
  const [kept, setKept] = useState(existing?.kept ?? false)
  const [bait, setBait] = useState(existing?.bait ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photo, setPhoto] = useState(null) // newly picked { blob, thumb, exif, url }
  const [busyPhoto, setBusyPhoto] = useState(false)
  const [pos, setPos] = useState(
    existing?.lat != null ? { lat: existing.lat, lon: existing.lon, accuracy: existing.accuracy, source: existing.gpsSource } : null,
  )
  const [locating, setLocating] = useState(false)
  const [caughtAt, setCaughtAt] = useState(existing?.caughtAt ?? new Date().toISOString())
  const [saving, setSaving] = useState(false)
  const camRef = useRef()
  const galRef = useRef()
  const oldPhotoUrl = usePhotoUrl(existing?.photoId, 'blob')

  // New catch: grab GPS right away (works without signal).
  useEffect(() => {
    if (isEdit) return
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function locate() {
    setLocating(true)
    const p = await getPosition()
    setLocating(false)
    if (p) setPos({ ...p, source: 'gps' })
    else if (!pos && spot) setPos({ lat: spot.lat, lon: spot.lon, accuracy: null, source: 'spot' })
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusyPhoto(true)
    try {
      const p = await processPhoto(file)
      if (photo?.url) URL.revokeObjectURL(photo.url)
      setPhoto({ ...p, url: URL.createObjectURL(p.blob) })
      // A gallery photo with its own GPS/time beats "where the phone is now".
      if (p.exif?.lat != null) setPos({ lat: p.exif.lat, lon: p.exif.lon, accuracy: null, source: 'photo' })
      if (p.exif?.takenAt && !isEdit && Math.abs(new Date(p.exif.takenAt) - Date.now()) > 10 * 60e3) setCaughtAt(p.exif.takenAt)
    } catch (err) {
      alert(`Couldn't read that photo: ${err.message}`)
    } finally {
      setBusyPhoto(false)
    }
  }

  // Species lists: what's been caught this trip, then this spot's targets, then search.
  const water = spot?.water || 'fresh'
  const pool = speciesForWater(water)
  const quick = useMemo(() => {
    const ids = [...new Set([...catches.map((c) => c.speciesId), ...(spot?.targets || [])])].filter((id) => SPECIES_BY_ID[id])
    return ids.slice(0, 8)
  }, [catches, spot])
  const [search, setSearch] = useState('')
  const matches = search
    ? SPECIES.filter((s) => [s.name, ...(s.aka || [])].some((n) => n.toLowerCase().includes(search.toLowerCase()))).slice(0, 8)
    : []

  const species = SPECIES_BY_ID[speciesId]
  const waters = spotWaters(spot)
  const regs = species ? pickRegs(species, waters) : null
  const counts = species
    ? keptCounts(catches, { species, anglerId, excludeId: existing?.id, when: caughtAt, regs })
    : {}
  const warnings = species ? checkCatch(species, { kept, lengthIn, caughtAt }, counts, { waterBody: waters }) : []
  const mustRelease = warnings.some((w) => w.level === 'stop')

  async function save() {
    setSaving(true)
    try {
      let photoId = existing?.photoId ?? null
      if (photo) {
        if (photoId) await db.photos.put({ id: photoId, blob: photo.blob, thumb: photo.thumb })
        else photoId = await db.photos.add({ blob: photo.blob, thumb: photo.thumb })
      }
      const where = pos || (spot ? { lat: spot.lat, lon: spot.lon, source: 'spot' } : null)
      const tides = spot?.tideStation ? await getCachedTides(spot.tideStation) : null
      const row = {
        tripId: trip.id,
        anglerId,
        speciesId: speciesId || null,
        speciesOther: speciesId ? '' : speciesOther.trim(),
        lengthIn: lengthIn ? Number(lengthIn) : null,
        weightLb: toLb(lb, oz),
        kept,
        bait: bait.trim(),
        notes: notes.trim(),
        caughtAt,
        lat: where?.lat ?? null,
        lon: where?.lon ?? null,
        accuracy: where?.accuracy ?? null,
        gpsSource: where?.source ?? null,
        photoId,
        cond: where ? conditionsAt(caughtAt, where, tides?.predictions || null) : null,
        updatedAt: new Date().toISOString(),
      }
      if (isEdit) await db.catches.update(existing.id, row)
      else await db.catches.add({ ...row, createdAt: row.updatedAt })
      back()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this catch?')) return
    await deleteCatch(existing.id)
    back()
  }

  const preview = photo?.url || oldPhotoUrl
  const baitSuggestions = species ? [...(species.baits || []), ...(species.lures || [])] : []

  return (
    <>
      <TopBar title={isEdit ? 'Edit catch' : 'Log a catch'} onBack={() => back()} />
      <div className="page">
        {/* PHOTO */}
        <div className="card stack">
          {preview && <img className="photo-preview" src={preview} alt="catch" />}
          <div className="photo-pick">
            <button onClick={() => camRef.current.click()} disabled={busyPhoto}>📷 {preview ? 'Retake' : 'Camera'}</button>
            <button onClick={() => galRef.current.click()} disabled={busyPhoto}>🖼️ Gallery</button>
          </div>
          {busyPhoto && <small className="muted">Processing photo…</small>}
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
          <input ref={galRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>

        {/* WHO */}
        <div className="card stack">
          <h3>Who caught it?</h3>
          <div className="chips">
            {party.map((a) => (
              <AnglerChip key={a.id} angler={a} on={a.id === anglerId} onClick={() => setAnglerId(a.id)} />
            ))}
          </div>
        </div>

        {/* SPECIES */}
        <div className="card stack">
          <div className="row between">
            <h3>Species</h3>
            <a href={`#/guide?tab=id&water=${water}`}>Not sure? ID helper</a>
          </div>
          <div className="chips">
            {quick.map((id) => (
              <button key={id} type="button" className={`chip ${speciesId === id ? 'on' : ''}`} onClick={() => setSpeciesId(id)}>
                {SPECIES_BY_ID[id].name}
              </button>
            ))}
            <button type="button" className={`chip ${speciesId === '' ? 'on' : ''}`} onClick={() => setSpeciesId('')}>
              Other / unsure
            </button>
          </div>
          <input placeholder="Search all species (e.g. trout, bream, whiting)" value={search} onChange={(e) => setSearch(e.target.value)} />
          {matches.length > 0 && (
            <div className="chips">
              {matches.map((s) => (
                <button key={s.id} type="button" className={`chip ${speciesId === s.id ? 'on' : ''}`} onClick={() => { setSpeciesId(s.id); setSearch('') }}>
                  {s.name}
                  {!pool.includes(s) && <small>({s.water})</small>}
                </button>
              ))}
            </div>
          )}
          {speciesId === '' && (
            <input placeholder="Type what you think it is (fix later)" value={speciesOther} onChange={(e) => setSpeciesOther(e.target.value)} />
          )}
          {species && <small className="muted">ID check: {species.idTips}</small>}
        </div>

        {/* SIZE */}
        <div className="card stack">
          <h3>Size</h3>
          <label className="field">
            Length (inches, nose to tail tip)
            <Stepper label="length" value={lengthIn} onChange={setLengthIn} step={0.5} placeholder="e.g. 16.5" />
          </label>
          <div className="grid2">
            <label className="field">
              Weight lb
              <Stepper label="pounds" value={lb} onChange={setLb} step={1} inputMode="numeric" />
            </label>
            <label className="field">
              oz
              <Stepper label="ounces" value={oz} onChange={(v) => setOz(String(Math.min(15, Number(v) || 0)))} step={1} inputMode="numeric" />
            </label>
          </div>
        </div>

        {/* RELEASED? */}
        <div className="card stack">
          <h3>Released?</h3>
          <Toggle value={kept} onChange={setKept} options={[[false, '🔄 Released'], [true, '🧺 Kept']]} />
          <Alerts items={warnings} />
          {kept && mustRelease && <div className="alert stop"><b>This fish can't be kept.</b> Switch to Released.</div>}
          {kept && spot?.advisory && <div className="alert warn">Eating advisory here: {spot.advisory}</div>}
          {kept && species?.eat && <div className="alert warn">{species.eat}</div>}
        </div>

        {/* DETAILS */}
        <div className="card stack">
          <label className="field">
            Bait / lure
            <input list="bait-list" value={bait} onChange={(e) => setBait(e.target.value)} placeholder="e.g. live shrimp, gold spoon" />
            <datalist id="bait-list">
              {baitSuggestions.map((b) => <option key={b} value={b} />)}
            </datalist>
          </label>
          <label className="field">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            🕒 {fmtTime(caughtAt)}{' '}
            {caughtAt.slice(0, 10) !== new Date().toISOString().slice(0, 10) && `(${new Date(caughtAt).toLocaleDateString()})`}
            <br />
            📍{' '}
            {locating
              ? 'Getting GPS fix…'
              : pos
                ? (
                  <>
                    <a href={mapsLink(pos.lat, pos.lon)} target="_blank" rel="noreferrer">
                      {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
                    </a>{' '}
                    ({pos.source === 'gps' ? `phone GPS${pos.accuracy ? ` ±${pos.accuracy} m` : ''}` : pos.source === 'photo' ? 'from photo' : 'spot location (no GPS fix)'})
                  </>
                  )
                : 'No location yet'}{' '}
            <button className="btn-small btn-ghost" onClick={locate} disabled={locating}>Update</button>
          </div>
        </div>

        <button className="btn-primary btn-big" onClick={save} disabled={saving || busyPhoto}>
          {isEdit ? 'Save changes' : 'Save catch'}
        </button>
        {isEdit && (
          <button className="btn-danger" onClick={remove}>
            Delete catch
          </button>
        )}
      </div>
    </>
  )
}
