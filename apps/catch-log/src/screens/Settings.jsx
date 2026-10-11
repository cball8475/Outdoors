// Settings: crew, backups, tide downloads, storage.
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setDefaultAngler, getSetting } from '../lib/db.js'
import { TopBar, useOnline, back } from '../components/ui.jsx'
import { exportBackup, importBackup, exportCsv } from '../lib/backup.js'
import { refreshStations } from '../lib/tides.js'
import { allTideStations } from '../lib/seed.js'
import { ANGLER_COLORS, fmtDate } from '../lib/format.js'

export default function Settings() {
  return (
    <>
      <TopBar title="Settings" onBack={() => back()} />
      <div className="page">
        <Crew />
        <Backup />
        <Tides />
        <Storage />
        <small className="muted" style={{ textAlign: 'center' }}>
          Catch Log v{__APP_VERSION__} · all data stays on this device
        </small>
      </div>
    </>
  )
}

function Crew() {
  const anglers = useLiveQuery(() => db.anglers.toArray(), [])
  const [name, setName] = useState('')
  if (!anglers) return null
  async function add() {
    if (!name.trim()) return
    await db.anglers.add({
      name: name.trim(),
      isDefault: false,
      archived: false,
      color: ANGLER_COLORS[anglers.length % ANGLER_COLORS.length],
      createdAt: new Date().toISOString(),
    })
    setName('')
  }
  async function rename(a) {
    const n = prompt('Name', a.name)
    if (n && n.trim()) await db.anglers.update(a.id, { name: n.trim() })
  }
  async function recolor(a) {
    const i = (ANGLER_COLORS.indexOf(a.color) + 1) % ANGLER_COLORS.length
    await db.anglers.update(a.id, { color: ANGLER_COLORS[i] })
  }
  return (
    <div className="card stack">
      <h2>Crew</h2>
      <div className="list">
        {anglers.map((a) => (
          <div key={a.id} className="item" style={{ opacity: a.archived ? 0.5 : 1 }}>
            <button className="btn-small" aria-label="Change color" onClick={() => recolor(a)} style={{ minHeight: 36, width: 36, padding: 0 }}>
              <span className="dot" style={{ background: a.color, width: 16, height: 16, borderRadius: 8, display: 'inline-block' }} />
            </button>
            <div className="grow" onClick={() => rename(a)}>
              <b>{a.name}</b> {a.isDefault && <span className="badge good">me / default</span>}
              {a.archived && <span className="badge">hidden</span>}
            </div>
            {!a.isDefault && !a.archived && (
              <button className="btn-small" onClick={() => setDefaultAngler(a.id)}>Make default</button>
            )}
            {!a.isDefault && (
              <button className="btn-small" onClick={() => db.anglers.update(a.id, { archived: !a.archived })}>
                {a.archived ? 'Show' : 'Hide'}
              </button>
            )}
          </div>
        ))}
      </div>
      <small className="muted">Tap a name to rename. Hiding keeps their history.</small>
      <div className="row">
        <input placeholder="Add someone" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn-primary" onClick={add}>Add</button>
      </div>
    </div>
  )
}

function Backup() {
  const fileRef = useRef()
  const last = useLiveQuery(() => getSetting('lastBackupAt'), [])
  const [msg, setMsg] = useState('')
  const stale = !last || Date.now() - new Date(last) > 30 * 864e5
  async function doExport() {
    setMsg('Building backup…')
    const r = await exportBackup()
    setMsg(`Saved: ${r.trips} trips, ${r.catches} catches, ${r.photos} photos (${(r.bytes / 1e6).toFixed(1)} MB). Put the file in Drive/Dropbox.`)
  }
  async function doImport(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!confirm('Restoring REPLACES everything on this phone with the backup. Continue?')) return
    try {
      const r = await importBackup(f)
      setMsg(`Restored ${r.trips} trips and ${r.catches} catches.`)
    } catch (err) {
      setMsg(`Restore failed: ${err.message}`)
    }
  }
  return (
    <div className="card stack">
      <h2>Backup</h2>
      <div className={`alert ${stale ? 'warn' : 'good'}`}>
        {last ? `Last backup ${fmtDate(last)}.` : 'Never backed up.'} Your log only exists on this phone. Clearing Chrome's
        site data or losing the phone erases it.
      </div>
      <button className="btn-primary" onClick={doExport}>⬇️ Export backup (with photos)</button>
      <button onClick={() => exportCsv().then((n) => setMsg(`Exported ${n} catches to CSV.`))}>📊 Export catches as CSV (spreadsheet)</button>
      <button onClick={() => fileRef.current.click()}>⬆️ Restore from backup…</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
      {msg && <small>{msg}</small>}
    </div>
  )
}

function Tides() {
  const online = useOnline()
  const rows = useLiveQuery(() => db.tides.toArray(), [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function refresh() {
    setBusy(true)
    const r = await refreshStations(await allTideStations(), { force: true })
    setMsg(r.offline ? 'Offline.' : `Updated ${r.updated.length} stations${r.failed.length ? `, ${r.failed.length} failed` : ''}.`)
    setBusy(false)
  }
  return (
    <div className="card stack">
      <h2>Tide data (offline)</h2>
      <small className="muted">NOAA predictions are saved for a year at a time and refresh automatically when you have signal.</small>
      {rows?.length ? (
        <table className="table">
          <thead><tr><th>Station</th><th>Good through</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stationId}><td className="mono">{r.stationId}</td><td>{fmtDate(r.to)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <small>No tide data saved yet.</small>
      )}
      <button onClick={refresh} disabled={busy || !online}>{busy ? 'Downloading…' : online ? '🔄 Download / refresh all' : 'Offline'}</button>
      {msg && <small>{msg}</small>}
    </div>
  )
}

function Storage() {
  const [est, setEst] = useState(null)
  const [persisted, setPersisted] = useState(null)
  useEffect(() => {
    navigator.storage?.estimate?.().then(setEst).catch(() => {})
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {})
  }, [])
  return (
    <div className="card stack">
      <h2>Storage</h2>
      {est && <small>Using {(est.usage / 1e6).toFixed(1)} MB of {(est.quota / 1e9).toFixed(1)} GB available.</small>}
      <small className={persisted ? '' : 'muted'}>
        {persisted ? '✅ Protected storage (Chrome won\'t auto-clear it).' : 'Tip: install the app (Chrome menu → Add to Home screen) so Chrome protects its storage.'}
      </small>
    </div>
  )
}
