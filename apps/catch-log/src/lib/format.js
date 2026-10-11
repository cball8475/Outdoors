// Small display helpers shared across screens.

export function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function fmtDateLong(d) {
  return new Date(d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function fmtRange(a, b) {
  return `${fmtTime(a)}–${fmtTime(b)}`
}

export function fmtDuration(ms) {
  if (!ms || ms < 0) return '0m'
  const m = Math.round(ms / 60000)
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}

/** 2.5 → "2 lb 8 oz" */
export function fmtWeight(lb) {
  if (lb == null || lb === '' || isNaN(lb)) return ''
  const total = Math.round(Number(lb) * 16)
  const l = Math.floor(total / 16)
  const o = total % 16
  if (!l) return `${o} oz`
  return o ? `${l} lb ${o} oz` : `${l} lb`
}

export function fmtLength(inches) {
  if (inches == null || inches === '' || isNaN(inches)) return ''
  return `${Number(inches)}″`
}

export function toLb(lb, oz) {
  const L = Number(lb) || 0
  const O = Number(oz) || 0
  const v = L + O / 16
  return v > 0 ? Math.round(v * 1000) / 1000 : null
}

export function splitLb(v) {
  if (v == null || isNaN(v)) return { lb: '', oz: '' }
  const total = Math.round(Number(v) * 16)
  return { lb: String(Math.floor(total / 16)), oz: String(total % 16) }
}

export function todayKey() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function mapsLink(lat, lon) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

export const ANGLER_COLORS = ['#f2b84b', '#5ec4c9', '#e8737a', '#8fd16a', '#b48cf2', '#f29b5e', '#6a9cf2', '#d1c86a']
