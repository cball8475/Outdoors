// ---------------------------------------------------------------------------
// The three rod setups in the family arsenal. Species rigs (species.js) are
// written for each of these keys: salt, fresh, kids.
//
// The exact models weren't given, so these describe the ASSUMED setup and the
// line to spool. Edit the text here (or in the app: Settings → Rods) once
// you know the specs printed on the rod blanks.
// ---------------------------------------------------------------------------
export const RODS = {
  salt: {
    key: 'salt',
    name: 'Saltwater rod',
    assumed: '7′ medium / medium-heavy spinning, 3000–4000 size reel',
    line: '20 lb braid main line → 24–30″ of 20–30 lb fluorocarbon leader (double uni or FG knot)',
    tips: [
      'Rinse rod + reel with fresh water after EVERY trip; back the drag off before storing.',
      'Braid has no stretch: keep drag at ~1/3 of line strength and let circle hooks set themselves (reel, don\'t jerk).',
      'Pier: bring a drop net or long-handle pier net. You can\'t lift a 5 lb fish 20 ft on 20 lb line.',
    ],
  },
  fresh: {
    key: 'fresh',
    name: 'Freshwater rod',
    assumed: '6′6″–7′ medium spinning, 2500 size reel',
    line: '10 lb braid → 6 ft of 8–10 lb fluorocarbon leader, or straight 8 lb monofilament (simplest)',
    tips: [
      'Straight mono is more forgiving for live-bait and bobber fishing; braid + leader is better for lures and casting distance.',
      'Re-tie after every big fish or every ~hour of fishing around wood and rocks.',
    ],
  },
  kids: {
    key: 'kids',
    name: 'Kids\' Ugly Stik',
    assumed: 'Ugly Stik GX2 youth combo (spincast or spinning, 4′6″–5′6″)',
    line: '8 lb monofilament for freshwater; 10–12 lb mono for pier/surf',
    tips: [
      'Pre-tie rigs at home (bobber rigs + 2-hook bottom rigs) in a labeled tray; re-rigging tangles eats the whole trip.',
      'Size 6–8 hooks for bream; size 4–6 for whiting/spot/croaker. Small hooks = more bites for kids.',
      'Not for bull reds, kings, big cats, or stripers: hand those fights to an adult rod.',
      'Spincast reels: hold the button, swing, release at the 10 o\'clock position.',
    ],
  },
}
