// ---------------------------------------------------------------------------
// CAST COACH: "Where am I, what do I see, where do I cast, how do I reel?"
//   • whereAmI()     GPS fix → the known spot you're at (or the nearest one)
//   • cluesFor()     which "what do you see" choices fit salt/fresh + month
//   • castPlan()     rank what you see using right-now tide, light, water temp
//                    and your target fish → where to cast, which fish, rig, how to reel
//   • depthAdvice()  top / middle / bottom, nudged by sun and water temp
// Works offline: GPS needs no signal, and everything else is baked-in data.
// The app does NOT read the photo itself (that needs an online AI service);
// the kid taps what they see and the photo is just for pointing.
// Pure functions (no browser APIs) so they're unit-tested.
// ---------------------------------------------------------------------------
import { CLUES, CLUES_BY_ID, KID_LINES } from '../data/clues.js'
import { SPECIES_BY_ID } from '../data/species.js'
import { tempFit } from './watertemp-core.js'

export const AT_SPOT_MI = 0.6 // piers + parks are big; within ~1 km = "you're here"

export function milesBetween(a, b) {
  const R = 3958.8
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * @param {{lat:number, lon:number}} pos
 * @param {Array} spots
 * @returns {{ at: object|null, nearest: {spot, mi}, others: Array<{spot, mi}> } | null}
 */
export function whereAmI(pos, spots) {
  if (!pos || !spots?.length) return null
  const ranked = spots
    .filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number')
    .map((spot) => ({ spot, mi: milesBetween(pos, spot) }))
    .sort((a, b) => a.mi - b.mi)
  if (!ranked.length) return null
  const nearest = ranked[0]
  return { at: nearest.mi <= AT_SPOT_MI ? nearest.spot : null, nearest, others: ranked.slice(1, 3) }
}

/** Google Maps satellite view: troughs, sandbars, points and drop-offs show up from above. */
export function satelliteLink(lat, lon) {
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lon}&zoom=18&basemap=satellite`
}

function inMonths(c, m) {
  if (!c.months) return true
  const [a, b] = c.months
  return a <= b ? m >= a && m <= b : m >= a || m <= b
}

/** "What do you see?" choices for this water type and month. */
export function cluesFor(water, month = new Date().getMonth()) {
  return CLUES.filter((c) => (c.water === 'both' || c.water === water) && inMonths(c, month))
}

/** tides.stageAt().stage → 'rising' | 'falling' | 'slack' | null */
export function tideDir(stage) {
  if (stage === 'incoming') return 'rising'
  if (stage === 'outgoing') return 'falling'
  if (stage === 'slack-high' || stage === 'slack-low') return 'slack'
  return null
}

const fitsWater = (s, water) => s.water === water || s.water === 'both'
export const shortName = (s) => s.name.replace(/ \(.*\)/, '')

/**
 * Rank the things the kid sees, best place to cast first.
 * @param {object} o
 * @param {string[]} o.clueIds   ids from data/clues.js
 * @param {'salt'|'fresh'} o.water
 * @param {number}  [o.month]    0–11
 * @param {string}  [o.light]    'dawn' | 'day' | 'dusk' | 'night'
 * @param {string}  [o.tide]     tideDir() result
 * @param {string[]} [o.targets] species ids the party is fishing for
 * @param {'kids'|'fresh'|'salt'} [o.rod]
 * @returns {Array<{clue, score, fish, line, gear, notes}>}  gear = bait/lure that matches `line`
 */
export function castPlan({ clueIds, water, month = new Date().getMonth(), light = null, tide = null, targets = [], rod = 'kids' }) {
  const out = []
  for (const id of clueIds || []) {
    const c = CLUES_BY_ID[id]
    if (!c) continue
    let score = c.base
    const notes = []

    if (water === 'salt' && c.tide && tide) {
      if (tide === c.tide) {
        score += 15
        notes.push(c.tide === 'falling' ? '🌊 The tide is going out right now: perfect for this spot.' : '🌊 The tide is coming in right now: perfect for this spot.')
      } else if (tide === 'slack') {
        score -= 5
      } else {
        score -= 10
        notes.push(c.tide === 'falling' ? '⏳ Best when the tide is going OUT. Check back later.' : '⏳ Best when the tide is coming IN. Check back later.')
      }
    }
    if (c.night) {
      if (light === 'night') score += 25
      else {
        score -= 45
        notes.push('🌙 This one only works after dark.')
      }
    }
    if (c.shade && light === 'day') {
      score += 10
      notes.push('😎 Bright sun: fish are hiding in shade and deeper water like this.')
    }
    if (c.zone === 'top' && (light === 'dawn' || light === 'dusk')) score += 5

    const isTarget = (s) => (targets.includes(s.id) ? 1 : 0)
    const fish = c.fish
      .map((f) => SPECIES_BY_ID[f])
      .filter((s) => s && fitsWater(s, water) && (s.season?.[month] ?? 1) > 0)
      .sort(
        (a, b) =>
          isTarget(b) - isTarget(a) ||
          (b.season?.[month] ?? 0) - (a.season?.[month] ?? 0) ||
          (rod === 'kids' ? (b.kidEase || 0) - (a.kidEase || 0) : 0),
      )
    const hits = fish.filter(isTarget).length
    if (targets.length) score += hits ? Math.min(hits, 2) * 12 : -10
    else score += Math.min(fish.filter((s) => s.season?.[month] >= 2).length, 3) * 3

    // first way of fishing this spot that one of the likely fish actually bites on
    const top3 = fish.slice(0, 3)
    const allowed = rod === 'kids' ? c.line.filter((l) => KID_LINES.includes(l)) : c.line
    let line = allowed[0] || 'float'
    let gear = null
    for (const l of allowed) {
      const g = top3.map((s) => gearFor(s, l)).find(Boolean)
      if (g) {
        line = l
        gear = g
        break
      }
    }
    out.push({ clue: c, score: Math.round(score), fish: top3, line, gear, notes })
  }
  return out.sort((a, b) => b.score - a.score)
}

// which lures go with which way of fishing (matched against species.lures)
const LURE_RX = {
  spoon: /spoon|gotcha|spinner|beetle spin|rooster|metal jig/i,
  jig: /jig(?!ging)|paddletail|gulp|tube|curly|bucktail|swimbait/i,
  topwater: /topwater|walker|buzzbait|popper/i,
}

/**
 * Bait or lure for a fish that matches how you're fishing.
 * @returns {{kind:'bait'|'lure', text:string, fish:object} | null}  null = that fish doesn't bite on it
 */
export function gearFor(fish, line) {
  if (!fish) return null
  if (line === 'bottom' || line === 'float') {
    const baits = (fish.baits || []).slice(0, 2)
    return baits.length ? { kind: 'bait', text: baits.join(' or '), fish } : null
  }
  const lure = (fish.lures || []).find((l) => LURE_RX[line]?.test(l))
  return lure ? { kind: 'lure', text: lure, fish } : null
}

/**
 * Which part of the water to fish, nudged by light and water temp.
 * @returns {{ zone: 'top'|'middle'|'bottom', notes: string[] }}
 */
export function depthAdvice({ zone, light = null, tempF = null, fish = [] }) {
  const notes = []
  let z = zone
  if (light === 'day' && z === 'top') {
    z = 'middle'
    notes.push('☀️ Bright sun pushes fish a little deeper, so fish the middle instead of the top.')
  } else if ((light === 'dawn' || light === 'dusk' || light === 'night') && z !== 'top') {
    notes.push('🌅 Low light: fish come up shallower and roam more, so they\'ll find your bait.')
  }
  const s = fish[0]
  const fit = s ? tempFit(s, tempF) : null
  if (fit?.level === 'slow') {
    const cold = tempF < s.temp.active[0]
    z = z === 'top' ? 'middle' : 'bottom'
    notes.push(
      cold
        ? `🥶 ${Math.round(tempF)}°F is chilly for ${shortName(s)}: fish deeper and reel slower.`
        : `🥵 ${Math.round(tempF)}°F is hot for ${shortName(s)}: fish deeper or in shade, and go early or late.`,
    )
  } else if (fit?.level === 'prime') {
    notes.push(`🔥 ${Math.round(tempF)}°F is perfect for ${shortName(s)}: they're active, so a moving bait works.`)
  }
  return { zone: z, notes }
}
