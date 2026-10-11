// First-run setup: you (the default angler) + your crew in one screen.
// Names are typed here and stored only on this phone (never in the repo).
import { useState } from 'react'
import { db } from '../lib/db.js'
import { ANGLER_COLORS } from '../lib/format.js'

export default function Setup() {
  const [me, setMe] = useState('Charlie')
  const [crew, setCrew] = useState('')
  const [busy, setBusy] = useState(false)

  const names = crew
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  async function save() {
    if (!me.trim()) return
    setBusy(true)
    const now = new Date().toISOString()
    await db.anglers.add({ name: me.trim(), isDefault: true, archived: false, color: ANGLER_COLORS[0], createdAt: now })
    let i = 1
    for (const n of names) {
      await db.anglers.add({ name: n, isDefault: false, archived: false, color: ANGLER_COLORS[i++ % ANGLER_COLORS.length], createdAt: now })
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>🎣 Catch Log: setup</h1>
      </header>
      <div className="page">
        <div className="card stack">
          <h2>Who's the main angler?</h2>
          <p className="muted">This person is the default on every catch (one tap to switch).</p>
          <label className="field">
            Your name
            <input value={me} onChange={(e) => setMe(e.target.value)} autoComplete="given-name" />
          </label>
        </div>
        <div className="card stack">
          <h2>Add your crew</h2>
          <p className="muted">Comma-separated. You can add, rename or hide people later in Settings.</p>
          <label className="field">
            Names
            <textarea
              value={crew}
              onChange={(e) => setCrew(e.target.value)}
              placeholder="e.g. Sam, Alex, Jordan"
            />
          </label>
          {names.length > 0 && (
            <div className="chips">
              {names.map((n, i) => (
                <span key={i} className="chip">
                  <span className="dot" style={{ background: ANGLER_COLORS[(i + 1) % ANGLER_COLORS.length] }} />
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="alert info">
          Everything you log stays <b>on this phone</b>, works with no signal, and is never uploaded. Use
          Settings → Export backup now and then so a lost phone doesn't mean a lost logbook.
        </div>
        <button className="btn-primary btn-big" disabled={!me.trim() || busy} onClick={save}>
          Start logging
        </button>
      </div>
    </div>
  )
}
