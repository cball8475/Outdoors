// ---------------------------------------------------------------------------
// Explore: the two kid-friendly questions.
//   1) "I'm going HERE. What should I fish for?"  → fishForSpot()
//   2) "I want to catch THIS fish. Where?"        → spotsForFish()
//
// Ranking uses offline data (the researched target list for each spot, each
// species' month-by-month season rating, how kid-easy it is, closed seasons
// at that water, the spot's kid-friendliness and drive time) plus the water
// temp when known (live sensor or the monthly normal).
// ---------------------------------------------------------------------------
import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { pickRegs, spotWaters } from './regs.js'
import { tempFit } from './watertemp-core.js'

const fits = (sp, water) => sp.water === water || sp.water === 'both'

function mmdd(date) {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function inRange(md, from, to) {
  return from <= to ? md >= from && md <= to : md >= from || md <= to
}

/** Is harvest closed for this species at this spot on this date? */
export function closedAt(species, spot, date = new Date()) {
  const r = pickRegs(species, spotWaters(spot))
  if (!r) return false
  if (r.noPossession) return false // release-only, but you can still fish for it
  return (r.closed || []).some((c) => inRange(mmdd(date), c.from, c.to))
}

/**
 * Best fish to target at a spot this month.
 * @param {object} spot
 * @param {object} [opts] { date, forKids }
 * @returns {Array<{species, season, kidEase, listed, closed, score, regs}>} best first
 */
export function fishForSpot(spot, { date = new Date(), forKids = false, tempF = null } = {}) {
  if (!spot) return []
  const month = new Date(date).getMonth()
  const listed = new Set(spot.targets || [])
  const pool = SPECIES.filter(
    (s) => fits(s, spot.water) && !s.bycatch && (listed.has(s.id) || s.common || !(spot.targets || []).length),
  )
  return pool
    .map((s) => {
      const season = s.season[month]
      const closed = closedAt(s, spot, date)
      const kid = s.kidEase || 0
      // season dominates; listed-at-this-spot and kid-ease break ties
      // water temp (live or normal) nudges the order: prime +8, too cold/warm −12
      const fit = tempFit(s, tempF)
      let score = season * 10 + (listed.has(s.id) ? 6 : 0) + (forKids ? kid * 3 : 0)
      if (fit?.level === 'prime') score += 8
      if (fit?.level === 'slow') score -= 12
      if (forKids && kid === 0) score -= 40
      if (closed) score -= 50
      return { species: s, season, kidEase: kid, listed: listed.has(s.id), closed, score, fit, regs: pickRegs(s, spotWaters(spot)) }
    })
    .sort((a, b) => b.score - a.score || a.species.name.localeCompare(b.species.name))
}

/**
 * Where to catch a species.
 * @param {string} speciesId
 * @param {Array} spots   all spots (built-in + custom)
 * @param {object} [opts] { date, sort: 'kids' | 'close' | 'near', here: {lat,lon} }
 */
export function spotsForFish(speciesId, spots, { date = new Date(), sort = 'kids', here = null } = {}) {
  const s = SPECIES_BY_ID[speciesId]
  if (!s) return []
  const rows = spots
    .filter((sp) => fits(s, sp.water))
    .filter((sp) => (sp.targets || []).includes(s.id) || (s.common && sp.builtIn !== false))
    .map((sp) => ({
      spot: sp,
      listed: (sp.targets || []).includes(s.id),
      closed: closedAt(s, sp, date),
      dist: here ? miles(here, sp) : null,
      regs: pickRegs(s, spotWaters(sp)),
    }))
  const kids = (r) => r.spot.kids || 0
  const drive = (r) => r.spot.driveMin ?? 999
  rows.sort((a, b) => {
    if (a.closed !== b.closed) return a.closed ? 1 : -1
    if (a.listed !== b.listed) return a.listed ? -1 : 1
    if (sort === 'near' && a.dist != null) return a.dist - b.dist
    if (sort === 'close') return drive(a) - drive(b)
    return kids(b) - kids(a) || drive(a) - drive(b)
  })
  return rows
}

/** Species ranked by how good they are this month (for the "pick a fish" grid). */
export function fishInSeason(water, { date = new Date() } = {}) {
  const m = new Date(date).getMonth()
  return SPECIES.filter((s) => fits(s, water) && !s.bycatch).sort(
    (a, b) => b.season[m] - a.season[m] || (b.kidEase || 0) - (a.kidEase || 0) || a.name.localeCompare(b.name),
  )
}

function miles(a, b) {
  const R = 3958.8
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Pick the rig text for the chosen rod, falling back to whatever exists. */
export function rigFor(species, rod) {
  const r = species.rigs || {}
  if (r[rod]) return { rod, text: r[rod] }
  for (const k of ['kids', 'fresh', 'salt']) if (r[k]) return { rod: k, text: r[k], fallback: true }
  return null
}
