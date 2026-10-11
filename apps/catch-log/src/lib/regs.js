// ---------------------------------------------------------------------------
// Size / creel / season checks run when you log a KEPT fish.
//
// Regulation numbers live in src/data/species.js (each species has a `regs`
// block with its source + "verified" date). This file only applies them.
//
// THE APP IS A REMINDER, NOT THE LAW. SCDNR changes rules (red drum changed
// July 1, 2026), and some waters have special limits. When in doubt, release
// the fish and check eregulations.com/southcarolina.
// ---------------------------------------------------------------------------
import { SPECIES } from '../data/species.js'

/** group key → species ids (e.g. 'wsc' → whiting, spot, croaker). */
export const SPECIES_GROUPS = SPECIES.reduce((acc, s) => {
  if (s.group) (acc[s.group] ||= []).push(s.id)
  return acc
}, {})

/** 'MM-DD' within an inclusive season range that may wrap the new year. */
function inRange(mmdd, from, to) {
  return from <= to ? mmdd >= from && mmdd <= to : mmdd >= from || mmdd <= to
}

function mmdd(date) {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * @param {object} species   entry from SPECIES
 * @param {object} c         { lengthIn, kept, caughtAt }
 * @param {object} counts    fish ALREADY kept today (not counting this one):
 *     anglerKept      – this angler, this species (or its whole `group`)
 *     anglerSpecies   – this angler, this exact species (for perPersonSpecies)
 *     partyKept       – whole party, species/group (for perBoat)
 *     anglerBig       – this angler, this species, over regs.bigFish.over
 * @param {object} opts      { waterBody: string|null }
 * @returns {Array<{level:'stop'|'warn'|'info', text:string}>}
 */
export function checkCatch(species, c, counts = {}, opts = {}) {
  const out = []
  if (!species) return out
  const r = pickRegs(species, opts.waterBody)
  if (!r) return out

  if (r.noPossession) {
    out.push({ level: 'stop', text: `${species.name}: possession prohibited. Release immediately.` })
    return out
  }
  if (!c.kept) {
    if (r.note) out.push({ level: 'info', text: r.note })
    return out
  }

  const day = mmdd(c.caughtAt || Date.now())
  const len = Number(c.lengthIn) || 0
  const how = r.measure === 'FL' ? 'fork length' : 'total length'
  const minApplies = r.min && (!r.minSeason || inRange(day, r.minSeason.from, r.minSeason.to))
  const big = r.bigFish && len > r.bigFish.over

  if ((minApplies || r.max) && !len) out.push({ level: 'warn', text: `Measure it before keeping (${how}).` })
  if (len && minApplies && len < r.min) {
    out.push({ level: 'stop', text: `Undersize: ${len}" is under the ${r.min}" minimum (${how}). Must release.` })
  }
  // Over a slot max is illegal UNLESS this rule allows a limited number of "big fish".
  if (len && r.max && len > r.max && !big) {
    out.push({ level: 'stop', text: `Over slot: ${len}" is over the ${r.max}" maximum (${how}). Must release.` })
  }
  if (big && (counts.anglerBig || 0) + 1 > r.bigFish.max) {
    out.push({ level: 'stop', text: `Only ${r.bigFish.max} fish over ${r.bigFish.over}" allowed per day. Must release.` })
  }
  for (const s of r.closed || []) {
    if (inRange(day, s.from, s.to)) out.push({ level: 'stop', text: `Closed season (${s.from} → ${s.to}). Must release.` })
  }
  if (r.perPerson && (counts.anglerKept || 0) + 1 > r.perPerson) {
    const what = species.group ? 'combined' : ''
    out.push({ level: 'stop', text: `Over the ${r.perPerson}/person daily ${what} limit for this angler.`.replace('  ', ' ') })
  }
  if (r.perPersonSpecies && (counts.anglerSpecies || 0) + 1 > r.perPersonSpecies) {
    out.push({ level: 'stop', text: `Over the ${r.perPersonSpecies}/person limit for ${species.name}.` })
  }
  if (r.perBoat && (counts.partyKept || 0) + 1 > r.perBoat) {
    out.push({ level: 'warn', text: `Party would exceed the ${r.perBoat}/boat limit (applies when you're all in one boat).` })
  }
  if (r.note) out.push({ level: 'info', text: r.note })
  return out
}

/**
 * Count fish already kept today for the checker. `catches` = this trip's catches
 * (or all of today's), each { id, anglerId, speciesId, kept, lengthIn, caughtAt }.
 */
export function keptCounts(catches, { species, anglerId, excludeId, when, regs }) {
  const sameDay = (t) => new Date(t).toDateString() === new Date(when || Date.now()).toDateString()
  const inGroup = (c) =>
    species.group ? (SPECIES_GROUPS[species.group] || []).includes(c.speciesId) : c.speciesId === species.id
  const kept = catches.filter((c) => c.kept && c.id !== excludeId && sameDay(c.caughtAt))
  const over = regs?.bigFish?.over
  return {
    anglerKept: kept.filter((c) => c.anglerId === anglerId && inGroup(c)).length,
    anglerSpecies: kept.filter((c) => c.anglerId === anglerId && c.speciesId === species.id).length,
    partyKept: kept.filter(inGroup).length,
    anglerBig: over
      ? kept.filter((c) => c.anglerId === anglerId && c.speciesId === species.id && Number(c.lengthIn) > over).length
      : 0,
  }
}

/**
 * Special-water override (e.g. Santee Cooper) if one matches, else statewide.
 * @param {string|string[]|null} waterBody  one key or a spot's `waters` list
 */
export function pickRegs(species, waterBody) {
  if (!species?.regs) return null
  const keys = Array.isArray(waterBody) ? waterBody : waterBody ? [waterBody] : []
  for (const key of keys) {
    const hit = species.regs.special?.find((s) => s.water === key)
    if (hit) {
      // eslint-disable-next-line no-unused-vars
      const { special, ...base } = species.regs
      return { ...base, ...hit }
    }
  }
  return species.regs
}

/** Regs keys for a spot: its explicit `waters`, plus 'sc-salt' for salt spots. */
export function spotWaters(spot) {
  if (!spot) return []
  const list = [...(spot.waters || [])]
  if (spot.water === 'salt' && !list.includes('sc-salt')) list.push('sc-salt')
  return list
}

/** One-line summary for cards: e.g. `18–25" TL · 1/person · 2/boat`. */
export function regsSummary(regs) {
  if (!regs) return 'No SC size/creel limit listed'
  if (regs.noPossession) return 'Possession prohibited: release'
  const parts = []
  const unit = regs.measure === 'FL' ? 'FL' : 'TL'
  if (regs.min && regs.max) parts.push(`${regs.min}–${regs.max}" ${unit}`)
  else if (regs.min) parts.push(`${regs.min}" min ${unit}${regs.minSeason ? ` (${regs.minSeason.from}→${regs.minSeason.to})` : ''}`)
  if (regs.bigFish) parts.push(`max ${regs.bigFish.max} over ${regs.bigFish.over}"`)
  if (regs.perPerson) parts.push(`${regs.perPerson}/person/day`)
  if (regs.perPersonSpecies) parts.push(`(≤${regs.perPersonSpecies} of this species)`)
  if (regs.perBoat) parts.push(`${regs.perBoat}/boat`)
  if (regs.closed?.length) parts.push(`closed ${regs.closed.map((c) => `${c.from}→${c.to}`).join(', ')}`)
  return parts.join(' · ') || 'No size limit'
}
