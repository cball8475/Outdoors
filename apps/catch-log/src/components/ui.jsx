// Shared UI pieces + a tiny hash router (no dependency; the phone's back
// button works because every screen is a URL hash like #/trip/3).
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'

// --- router -----------------------------------------------------------------
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  const parts = path.split('/').filter(Boolean)
  return { parts, query: Object.fromEntries(new URLSearchParams(qs || '')) }
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function go(path, { replace = false } = {}) {
  const h = `#${path}`
  if (replace) location.replace(h)
  else location.hash = h
}

export function back(fallback = '/') {
  if (history.length > 1) history.back()
  else go(fallback, { replace: true })
}

// --- layout -----------------------------------------------------------------
export function TopBar({ title, onBack, right }) {
  return (
    <header className="topbar">
      {onBack && (
        <button aria-label="Back" onClick={onBack}>
          ←
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  )
}

const TABS = [
  ['/', '🎣', 'Trip'],
  ['/explore', '🧭', 'Explore'],
  ['/times', '🌙', 'Times'],
  ['/guide', '📖', 'Guide'],
  ['/stats', '🏆', 'Stats'],
]

export function TabBar({ active }) {
  return (
    <nav className="tabbar">
      {TABS.map(([path, icon, label]) => (
        <a key={path} href={`#${path}`} className={active === path ? 'on' : ''}>
          <span aria-hidden>{icon}</span>
          {label}
        </a>
      ))}
    </nav>
  )
}

// --- controls ---------------------------------------------------------------
export function Toggle({ value, options, onChange }) {
  return (
    <div className="toggle" role="group">
      {options.map(([v, label]) => (
        <button type="button" key={String(v)} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, placeholder, label, inputMode = 'decimal' }) {
  const n = (v) => (v === '' || v == null ? 0 : Number(v))
  const bump = (d) => {
    const next = Math.max(min, Math.round((n(value) + d) * 100) / 100)
    onChange(String(next))
  }
  return (
    <div className="stepper">
      <button type="button" aria-label={`less ${label || ''}`} onClick={() => bump(-step)}>
        −
      </button>
      <input
        aria-label={label}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
      />
      <button type="button" aria-label={`more ${label || ''}`} onClick={() => bump(step)}>
        +
      </button>
    </div>
  )
}

export function AnglerChip({ angler, on, onClick, count }) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="dot" style={{ background: angler.color }} />
      {angler.name}
      {angler.isDefault ? ' (me)' : ''}
      {count != null && <b>· {count}</b>}
    </button>
  )
}

export function Alerts({ items }) {
  if (!items?.length) return null
  return (
    <div className="stack">
      {items.map((w, i) => (
        <div key={i} className={`alert ${w.level}`}>
          {w.level === 'stop' ? '⛔ ' : w.level === 'warn' ? '⚠️ ' : 'ℹ️ '}
          {w.text}
        </div>
      ))}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}

// --- photos -----------------------------------------------------------------
/** Object URL for a stored photo (thumb or full), revoked on unmount. */
export function usePhotoUrl(photoId, which = 'thumb') {
  const photo = useLiveQuery(() => (photoId ? db.photos.get(photoId) : undefined), [photoId])
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const blob = photo?.[which] || photo?.blob
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo, which])
  return url
}

export function Thumb({ photoId, fallback = '🐟' }) {
  const url = usePhotoUrl(photoId, 'thumb')
  return url ? <img className="thumb" src={url} alt="" /> : <div className="thumb">{fallback}</div>
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function Stars({ n, max = 4 }) {
  return (
    <span aria-label={`${n} of ${max}`}>
      {'🐟'.repeat(Math.round(n))}
      <span style={{ opacity: 0.25 }}>{'🐟'.repeat(Math.max(0, max - Math.round(n)))}</span>
    </span>
  )
}
