// ---------------------------------------------------------------------------
// Kid-friendly "when should we go?" logic, built on the same scoring as the
// grown-up Times screen (lib/windows.js), just explained in plain words:
//   • rating()       score → 1–3 fish + Great / Good / OK
//   • kidReasons()   why a time is good or bad, in kid language
//   • weekSummary()  best day this week + one sentence on why
//   • quizRounds()   "Which time would you pick?" pairs from real data
// Pure functions (no browser APIs) so they're unit-tested.
// ---------------------------------------------------------------------------
import { lightPeriodAt } from './sun.js'
import { stageAt } from './tides.js'

const STEP = 15 * 60e3
const BLOCK = 6 // 90-minute blocks (same as windows.js)

/** Score → kid rating. */
export function rating(score) {
  if (score >= 85) return { fish: 3, label: 'Great', color: 'good' }
  if (score >= 70) return { fish: 2, label: 'Good', color: 'info' }
  return { fish: 1, label: 'OK', color: '' }
}

/**
 * Plain-language reasons for a time block.
 * @param {number} start  ms
 * @param {number} end    ms
 * @param {object} day    sunDay()
 * @param {Array} slots   scoreDay().slots (has .tide 0–1 = how fast water moves)
 * @param {Array|null} preds  NOAA predictions (salt) or null
 * @returns {Array<{icon:string, text:string, good:boolean}>}
 */
export function kidReasons(start, end, day, slots, preds) {
  const out = []
  const mid = (start + end) / 2
  const light = lightPeriodAt(mid, day)
  if (light === 'dawn') out.push({ icon: '🌅', text: 'Sun coming up: fish feed more when the light is low', good: true })
  else if (light === 'dusk') out.push({ icon: '🌇', text: 'Sun going down: fish feed more when the light is low', good: true })
  else if (light === 'night') out.push({ icon: '🌙', text: 'Dark out: some fish feed under pier lights, but it\'s harder', good: false })
  else out.push({ icon: '☀️', text: 'Bright sun: lots of fish hide deeper and bite slower', good: false })

  if (preds) {
    const inBlock = slots.filter((s) => s.t >= start && s.t < end)
    const speed = inBlock.length ? inBlock.reduce((a, s) => a + s.tide, 0) / inBlock.length : 0
    const st = stageAt(preds, mid)
    const dir = st?.stage === 'incoming' ? 'coming in' : st?.stage === 'outgoing' ? 'going out' : 'turning around'
    if (speed >= 0.65) out.push({ icon: '🌊', text: `Tide ${dir} fast: moving water carries food to the fish`, good: true })
    else if (speed >= 0.35) out.push({ icon: '🌊', text: `Tide ${dir}: the water is moving, so food is moving`, good: true })
    else out.push({ icon: '😴', text: 'Tide is turning: the water is almost still, so fish get lazy', good: false })
  }
  return out
}

/**
 * Best day of the week + one plain sentence about why.
 * @param {Array} rows  [{ key, date, best:{score,start,end}|null, range:{pct}|null }]
 * @param {'salt'|'fresh'} water
 */
export function weekSummary(rows, water) {
  if (!rows?.length) return null
  // a day with best:null (today, after its last window) can't be the best day
  let bestIdx = null
  rows.forEach((r, i) => {
    if (r.best && (bestIdx == null || r.best.score > rows[bestIdx].best.score)) bestIdx = i
  })
  if (water !== 'salt' || rows.every((r) => !r.range)) {
    return {
      bestIdx: null,
      sentence: 'Lakes and rivers don\'t have tides, so every day is about the same. Go near sunrise or sunset, and check the water temp.',
    }
  }
  const first = rows.find((r) => r.range)?.range.pct ?? 0
  const last = [...rows].reverse().find((r) => r.range)?.range.pct ?? 0
  let trend
  if (last - first <= -15) trend = 'Tides get SMALLER each day this week, so the current is strongest early in the week.'
  else if (last - first >= 15) trend = 'Tides get BIGGER each day this week, so the current gets stronger later in the week.'
  else trend = 'Tides stay about the same size all week.'
  return { bestIdx, sentence: trend }
}

/** All 90-min blocks in family hours (5 AM–9 PM starts, every 30 min) with avg score. */
export function blocks(slots) {
  const out = []
  for (let i = 0; i + BLOCK <= slots.length; i += 2) {
    const h = new Date(slots[i].t).getHours()
    if (h < 5 || h >= 21) continue
    const avg = slots.slice(i, i + BLOCK).reduce((a, s) => a + s.score, 0) / BLOCK
    out.push({ start: slots[i].t, end: slots[i].t + BLOCK * STEP, score: Math.round(avg) })
  }
  return out
}

/** Tiny seeded RNG so a day's quiz is the same every time you open it. */
function rng(seed) {
  let s = 0
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * "Which time would you pick?" rounds from a real day.
 * Each pair differs by ≥ 15 points and the two times don't overlap.
 */
export function quizRounds(slots, seed, n = 5) {
  const all = blocks(slots)
  const rand = rng(seed)
  const rounds = []
  const used = new Set()
  for (let tries = 0; tries < 400 && rounds.length < n; tries++) {
    const a = all[Math.floor(rand() * all.length)]
    const b = all[Math.floor(rand() * all.length)]
    if (!a || !b || a === b) continue
    if (Math.abs(a.score - b.score) < 15) continue
    if (a.start < b.end && b.start < a.end) continue
    const key = [a.start, b.start].sort().join('|')
    if (used.has(key)) continue
    used.add(key)
    const [first, second] = a.start < b.start ? [a, b] : [b, a]
    rounds.push({ options: [first, second], answer: first.score > second.score ? 0 : 1 })
  }
  return rounds
}
