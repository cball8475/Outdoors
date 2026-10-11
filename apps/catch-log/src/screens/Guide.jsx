// Guide: species cards (ID, SC limits, baits, lures, rigs per rod), the
// offline ID helper, rod setups, and the science behind "best times".
import { useState } from 'react'
import { TopBar, Toggle, back, go } from '../components/ui.jsx'
import { SPECIES, SPECIES_BY_ID, MARKS, REGS_SOURCE, REGS_URL } from '../data/species.js'
import { RODS } from '../data/rods.js'
import { SCIENCE, SCIENCE_SOURCES, EVIDENCE_LABEL } from '../data/science.js'
import { regsSummary } from '../lib/regs.js'

export function Guide({ tab, water: waterParam }) {
  const setTab = (t) => go(`/guide?tab=${t}`, { replace: true })
  return (
    <>
      <TopBar title="Guide" />
      <div className="page">
        <a className="card" href="#/learn" style={{ textDecoration: 'none', color: 'inherit' }}>
          <b>🧠 Time School</b>
          <div className="muted" style={{ fontSize: '0.9rem' }}>Learn when fish bite (sun, tide, water temp) + a quiz with today's real times</div>
        </a>
        <a className="card" href="#/cast" style={{ textDecoration: 'none', color: 'inherit' }}>
          <b>🎯 Where do I cast?</b>
          <div className="muted" style={{ fontSize: '0.9rem' }}>GPS finds your spot, you tap what you see → where to cast, how deep, the rig, and how to reel</div>
        </a>
        <Toggle value={tab} onChange={setTab} options={[['species', 'Species'], ['id', 'ID help'], ['rods', 'Rods'], ['science', 'Science']]} />
        {tab === 'species' && <SpeciesList />}
        {tab === 'id' && <IdHelper initialWater={waterParam} />}
        {tab === 'rods' && <Rods />}
        {tab === 'science' && <Science />}
      </div>
    </>
  )
}

function SpeciesList() {
  const [water, setWater] = useState('salt')
  const list = SPECIES.filter((s) => s.water === water || s.water === 'both')
  return (
    <>
      <Toggle value={water} onChange={setWater} options={[['salt', '🌊 Saltwater'], ['fresh', '🏞️ Freshwater']]} />
      <div className="card">
        <div className="list">
          {list.map((s) => (
            <a key={s.id} className="item chev" href={`#/species/${s.id}`}>
              <div className="grow">
                <b>{s.name}</b>
                <div className="muted" style={{ fontSize: '0.85rem' }}>{regsSummary(s.regs)}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
      <small className="muted">
        Limits: {REGS_SOURCE}. <a href={REGS_URL} target="_blank" rel="noreferrer">Official regs</a>. The app is a reminder, not the law.
      </small>
    </>
  )
}

export function SpeciesDetail({ id }) {
  const s = SPECIES_BY_ID[id]
  if (!s) return null
  return (
    <>
      <TopBar title={s.name} onBack={() => back('/guide')} />
      <div className="page">
        {s.aka?.length > 0 && <div className="muted">Also called: {s.aka.join(', ')}</div>}
        {!s.bycatch && <a className="btn btn-primary" href={`#/fish/${s.id}`}>📍 Where to catch it</a>}

        <div className="card stack">
          <h3>How to ID it</h3>
          <p>{s.idTips}</p>
          {s.lookalikes && <p className="muted"><b>Look-alikes:</b> {s.lookalikes}</p>}
        </div>

        <div className="card stack">
          <h3>SC limits</h3>
          <p><b>{regsSummary(s.regs)}</b></p>
          {s.regs?.note && <div className="alert info">{s.regs.note}</div>}
          {s.regs?.special?.map((sp, i) => (
            <div key={i} className="alert warn">
              <b>{regsSummary({ ...s.regs, ...sp })}</b>
              {sp.note && <div>{sp.note}</div>}
            </div>
          ))}
          {s.eat && <div className="alert stop">🍽️ {s.eat}</div>}
          <small className="muted">{REGS_SOURCE}</small>
        </div>

        {s.fall && (
          <div className="card">
            <h3>October–November</h3>
            <p>{s.fall}</p>
          </div>
        )}

        {(s.baits?.length > 0 || s.lures?.length > 0) && (
          <div className="grid2">
            <div className="card">
              <h3>Bait</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{s.baits.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="card">
              <h3>Lures</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{s.lures.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          </div>
        )}

        {Object.keys(s.rigs || {}).length > 0 && (
          <div className="card stack">
            <h3>Rig it on your rods</h3>
            {['salt', 'fresh', 'kids'].filter((k) => s.rigs[k]).map((k) => (
              <div key={k}>
                <b>{RODS[k].name}</b>
                <p style={{ marginTop: 2 }}>{s.rigs[k]}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/** Tap the marks you can see; species ranked by how many match. Fully offline. */
function IdHelper({ initialWater }) {
  const [water, setWater] = useState(initialWater === 'fresh' ? 'fresh' : 'salt')
  const [marks, setMarks] = useState([])
  const pool = SPECIES.filter((s) => s.water === water || s.water === 'both')
  const available = Object.keys(MARKS).filter((m) => pool.some((s) => s.marks.includes(m)))
  const ranked = pool
    .map((s) => ({ s, hits: marks.filter((m) => s.marks.includes(m)).length, miss: marks.filter((m) => !s.marks.includes(m)).length }))
    .filter((r) => !marks.length || r.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.miss - b.miss)
  const toggle = (m) => setMarks((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))
  return (
    <>
      <Toggle value={water} onChange={(w) => { setWater(w); setMarks([]) }} options={[['salt', '🌊 Saltwater'], ['fresh', '🏞️ Freshwater']]} />
      <div className="card stack">
        <h3>What do you see?</h3>
        <div className="chips">
          {available.map((m) => (
            <button key={m} type="button" className={`chip ${marks.includes(m) ? 'on' : ''}`} onClick={() => toggle(m)}>
              {MARKS[m]}
            </button>
          ))}
        </div>
        {marks.length > 0 && <button className="btn-small btn-ghost" onClick={() => setMarks([])}>Clear</button>}
      </div>
      <div className="card">
        <h3>{marks.length ? 'Best matches' : 'All species'}</h3>
        <div className="list">
          {ranked.slice(0, marks.length ? 6 : 99).map(({ s, hits }) => (
            <a key={s.id} className="item chev" href={`#/species/${s.id}`}>
              <div className="grow">
                <b>{s.name}</b> {marks.length > 0 && <span className="badge info">{hits}/{marks.length}</span>}
                <div className="muted" style={{ fontSize: '0.85rem' }}>{s.idTips}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
      <div className="alert info">
        For photo-based ID, install <b>Seek by iNaturalist</b> (free). Its ID model runs on the phone, so it can work without
        signal. Test it on a few local fish before you rely on it.
      </div>
    </>
  )
}

function Rods() {
  return (
    <>
      {Object.values(RODS).map((r) => (
        <div key={r.key} className="card stack">
          <h3>{r.name}</h3>
          <p className="muted">Assumed: {r.assumed}</p>
          <p><b>Spool:</b> {r.line}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{r.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ))}
      <small className="muted">Don't know your exact rods? Check the label printed just above the handle (length, power, line rating).</small>
    </>
  )
}

function Science() {
  const color = { strong: 'good', moderate: 'info', mixed: 'warn', weak: 'stop' }
  return (
    <>
      <div className="alert info">
        Ranked by how well each idea holds up in real studies. The app's "best times" score leans on the strong ones.
      </div>
      {SCIENCE.map((f) => (
        <div key={f.factor} className="card stack">
          <div className="row between">
            <h3>{f.factor}</h3>
            <span className={`badge ${color[f.evidence]}`}>{EVIDENCE_LABEL[f.evidence]}</span>
          </div>
          <p>{f.what}</p>
          <p><b>Use it:</b> {f.use}</p>
        </div>
      ))}
      <div className="card">
        <h3>Sources</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {SCIENCE_SOURCES.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
          ))}
        </ul>
      </div>
    </>
  )
}
