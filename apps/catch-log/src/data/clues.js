// ---------------------------------------------------------------------------
// CAST COACH DATA: "What do you see?" → where to cast, how deep, how to reel.
//
// CLUES are things a kid can spot from the bank, pier or beach. Each one says
// why fish are there (in kid words), where to put the bait, which part of the
// water to fish (top / middle / bottom), and which fish usually use it.
// The fish lists are filtered by the spot's water type and the month in
// lib/castcoach.js, so a clue can list salt AND fresh species.
//
// Sources: SCDNR life-history pages + angler education material (structure,
// current seams, troughs, tide flow), NOAA rip-current guidance, and the
// species shore cues already in species.js. General patterns, not guarantees.
//
//   zone   'top' | 'middle' | 'bottom'  where in the water to fish
//   line   preferred ways to fish it, best first (see LINES below)
//   base   0–100 how reliably it holds fish (birds diving = fish eating NOW)
//   tide   'falling' | 'rising'  the tide that turns it on (salt only)
//   shade  true = gets better in bright sun (fish hide from light)
//   night  true = only matters after dark
//   months [first, last] (0 = Jan) when it exists, e.g. bream beds
//   safety shown in red with the result
// ---------------------------------------------------------------------------

export const CLUES = [
  {
    id: 'birds', icon: '🐦', water: 'both', zone: 'top', line: ['spoon', 'float', 'jig'], base: 95,
    label: 'Birds diving / fish splashing',
    see: 'Birds diving into the water, or little fish jumping and spraying out of it.',
    why: 'Big fish are chasing little fish up to the top. The birds are grabbing the leftovers. Fish are eating RIGHT NOW.',
    cast: 'Cast PAST the splashing and reel back along the edge of it. Casting into the middle scares them.',
    fish: ['bluefish', 'spanish-mackerel', 'red-drum', 'spotted-seatrout', 'striped-bass', 'largemouth-bass', 'white-perch'],
  },
  {
    id: 'trough', icon: '🟦', water: 'salt', zone: 'bottom', line: ['bottom'], base: 70, tide: 'rising',
    label: 'Darker water strip by the beach',
    see: 'A darker green strip of calmer water between the beach and where the waves break farther out.',
    why: 'That\'s a trough, a ditch in the sand. Waves knock sand fleas, crabs and shrimp into it, and fish cruise it like a hallway.',
    cast: 'Cast into the darker strip. It\'s often only 15–40 yards out, so a short cast is fine.',
    fish: ['whiting', 'pompano', 'red-drum', 'flounder', 'croaker', 'spot'],
  },
  {
    id: 'cut', icon: '↔️', water: 'salt', zone: 'bottom', line: ['bottom'], base: 75, tide: 'falling',
    label: 'Gap in the breaking waves',
    see: 'A spot where waves DON\'T break across the sandbar, often with foamy or sandy water moving out to sea.',
    why: 'Water rushing back out funnels through the gap and carries food with it. Fish wait along the edges.',
    cast: 'Cast to the EDGES of the gap, not the middle, and let the bait sit.',
    safety: 'A gap like this is a rip current. Never swim or wade in it.',
    fish: ['red-drum', 'bluefish', 'pompano', 'whiting', 'flounder'],
  },
  {
    id: 'pilings', icon: '🪵', water: 'salt', zone: 'bottom', line: ['bottom', 'float'], base: 65, shade: true,
    label: 'Pier legs (pilings)',
    see: 'The posts holding up the pier or dock, covered in barnacles.',
    why: 'Barnacles and little crabs grow on the posts, so it\'s a food buffet. The posts also make shade and slow the current.',
    cast: 'Drop straight down next to a piling, or cast just past the end of the pier. Keep the bait close to the posts.',
    fish: ['sheepshead', 'black-drum', 'spot', 'croaker', 'pinfish', 'flounder', 'whiting'],
  },
  {
    id: 'creek', icon: '💧', water: 'both', zone: 'bottom', line: ['float', 'bottom', 'jig'], base: 70, tide: 'falling',
    label: 'Creek or ditch running in',
    see: 'Where a creek, ditch or drain pipe runs into the bigger water.',
    why: 'When the tide drops (or after rain), the creek flushes shrimp and minnows out. Fish line up at the mouth like kids at a snack table.',
    cast: 'Cast to the edge where the creek water meets the big water and let the current carry your bait along.',
    fish: ['red-drum', 'spotted-seatrout', 'flounder', 'largemouth-bass', 'channel-catfish', 'crappie', 'white-perch', 'bluegill'],
  },
  {
    id: 'rocks', icon: '🪨', water: 'both', zone: 'bottom', line: ['float', 'bottom', 'jig'], base: 65,
    label: 'Rocks, jetty or oyster beds',
    see: 'Rocks, a jetty, riprap by a bridge, or bumpy gray oyster beds (watch your feet, shells cut).',
    why: 'Crabs, shrimp and little fish hide in the cracks, and big fish come to hunt them.',
    cast: 'Cast just past the rocks and bring the bait along the edge. A bobber keeps you above the snags.',
    fish: ['sheepshead', 'black-drum', 'red-drum', 'flounder', 'spotted-seatrout', 'largemouth-bass', 'channel-catfish', 'crappie', 'striped-bass', 'redbreast'],
  },
  {
    id: 'grass', icon: '🌾', water: 'salt', zone: 'middle', line: ['float', 'jig'], base: 60, tide: 'rising',
    label: 'Marsh grass edge',
    see: 'Where tall marsh grass meets the water.',
    why: 'On a rising tide, shrimp and minnows hide in the flooded grass. Trout and reds patrol the edge to grab them.',
    cast: 'Cast a popping cork or bobber 2–3 feet off the grass edge, along it if you can.',
    fish: ['spotted-seatrout', 'red-drum', 'flounder'],
  },
  {
    id: 'seam', icon: '🌀', water: 'both', zone: 'middle', line: ['float', 'jig', 'bottom'], base: 70,
    label: 'Fast water next to slow water',
    see: 'A line of foam, bubbles or swirls where moving water rubs against calm water.',
    why: 'Fish rest in the calm side and dart out to grab food the fast water carries past. A free meal with less work.',
    cast: 'Cast into the fast water a little upstream and let the bait drift along the line into the calm side.',
    fish: ['spotted-seatrout', 'red-drum', 'bluefish', 'flounder', 'redbreast', 'largemouth-bass', 'channel-catfish', 'striped-bass'],
  },
  {
    id: 'eddy', icon: '🔄', water: 'fresh', zone: 'bottom', line: ['bottom', 'float'], base: 65,
    label: 'Calm pocket in a river',
    see: 'Behind a rock or log, or on the inside of a bend, where the water swirls slowly.',
    why: 'River fish rest out of the current in calm pockets and wait for food to wash by.',
    cast: 'Cast upstream of the calm spot and let the current swing your bait into it.',
    fish: ['redbreast', 'channel-catfish', 'flathead-catfish', 'blue-catfish', 'largemouth-bass'],
  },
  {
    id: 'color', icon: '🎨', water: 'both', zone: 'middle', line: ['spoon', 'float', 'jig'], base: 55,
    label: 'Muddy water meets clear water',
    see: 'A line where brown, muddy water meets greener, clearer water.',
    why: 'Little fish hide in the murky side; big fish wait on the clear side where they can see them.',
    cast: 'Cast along the line, right where the two colors meet.',
    fish: ['bluefish', 'red-drum', 'spotted-seatrout', 'spanish-mackerel', 'largemouth-bass', 'striped-bass'],
  },
  {
    id: 'wood', icon: '🌳', water: 'fresh', zone: 'middle', line: ['float', 'jig', 'bottom'], base: 70, shade: true,
    label: 'Fallen tree, stumps or logs',
    see: 'A tree that fell in, stumps, or brush sticking out of the water.',
    why: 'Wood is a fish house: shade, a place to hide, and bugs and minnows to eat.',
    cast: 'Cast past the wood and let your bobber drift right next to it. Casting INTO the branches gets you snagged.',
    fish: ['largemouth-bass', 'bluegill', 'crappie', 'warmouth', 'redbreast', 'channel-catfish', 'flathead-catfish'],
  },
  {
    id: 'weeds', icon: '🌿', water: 'fresh', zone: 'top', line: ['float', 'topwater', 'jig'], base: 65,
    label: 'Lily pads or weeds',
    see: 'Lily pads, grass or weeds growing in or on the water.',
    why: 'Weeds make oxygen and hide bugs and baby fish. Bream live there; bass and pickerel hunt the edges.',
    cast: 'Drop your bobber in an opening or right along the outside edge of the weeds.',
    fish: ['largemouth-bass', 'bluegill', 'redear', 'chain-pickerel', 'bowfin', 'warmouth'],
  },
  {
    id: 'dock', icon: '🛖', water: 'fresh', zone: 'middle', line: ['float', 'jig'], base: 60, shade: true,
    label: 'Dock or anything making shade',
    see: 'A dock, boardwalk or overhanging tree throwing shade on the water.',
    why: 'Fish can\'t close their eyes or wear sunglasses. On sunny days they hang in the shade.',
    cast: 'Drop your bobber on the shady edge, as close to the posts as you can.',
    fish: ['bluegill', 'crappie', 'largemouth-bass', 'channel-catfish', 'redear'],
  },
  {
    id: 'point', icon: '🔺', water: 'both', zone: 'bottom', line: ['bottom', 'jig', 'float'], base: 55,
    label: 'Point of land sticking out',
    see: 'A piece of land poking out into the water.',
    why: 'Fish swim along the shore and pass right by the tip, and deep water is close by. It\'s a fish highway.',
    cast: 'Stand near the tip and fan-cast: left, middle, right. Try the deeper-looking side first.',
    fish: ['largemouth-bass', 'crappie', 'channel-catfish', 'striped-bass', 'red-drum', 'spotted-seatrout'],
  },
  {
    id: 'drop', icon: '⬛', water: 'both', zone: 'bottom', line: ['bottom', 'jig', 'float'], base: 55, shade: true,
    label: 'Water turns dark fast',
    see: 'Shallow water that suddenly turns dark green, blue or black. That means it gets deep quickly.',
    why: 'Fish slide up shallow to eat and back down deep to rest or escape heat and cold. The edge is their road.',
    cast: 'Cast out to the dark water and bring your bait up the slope toward you.',
    fish: ['largemouth-bass', 'crappie', 'channel-catfish', 'blue-catfish', 'flounder', 'red-drum', 'spotted-seatrout'],
  },
  {
    id: 'wind', icon: '💨', water: 'fresh', zone: 'middle', line: ['float', 'bottom', 'spoon'], base: 55,
    label: 'Wind blowing at your bank',
    see: 'Wind and little waves blowing toward the shore you\'re standing on.',
    why: 'Wind pushes tiny plankton to that shore, minnows follow it, and bigger fish follow the minnows.',
    cast: 'Cast out into the wavy water and let your bait drift back toward you.',
    fish: ['largemouth-bass', 'bluegill', 'crappie', 'white-perch', 'striped-bass', 'channel-catfish'],
  },
  {
    id: 'beds', icon: '⚪', water: 'fresh', zone: 'bottom', line: ['float'], base: 75, months: [3, 7],
    label: 'Round light spots in shallow water',
    see: 'Plate-size round light patches on the bottom in shallow water, usually in a group.',
    why: 'Those are bream nests. Bream guard them and bite anything that comes close.',
    cast: 'Set the bobber so the worm hangs just above the bottom and cast to the edge of the nests.',
    fish: ['bluegill', 'redear', 'warmouth'],
  },
  {
    id: 'lights', icon: '💡', water: 'both', zone: 'top', line: ['float', 'jig', 'spoon'], base: 60, night: true,
    label: 'Lights on the water (after dark)',
    see: 'A pier or dock light shining on the water at night.',
    why: 'Lights pull in bugs and tiny shrimp, then baitfish, then the fish that eat them.',
    cast: 'Cast into the dark just past the edge of the light and reel back into it. Fish wait in the shadow to ambush.',
    fish: ['spotted-seatrout', 'bluefish', 'crappie', 'white-perch', 'striped-bass'],
  },
]

export const CLUES_BY_ID = Object.fromEntries(CLUES.map((c) => [c.id, c]))

/** Kids' Ugly Stiks: stick to rigs that work without a "feel" for the jig. */
export const KID_LINES = ['bottom', 'float', 'spoon']

// ---------------------------------------------------------------------------
// LINES: how to fish (and reel) each kind of setup.
// ---------------------------------------------------------------------------
export const LINES = {
  bottom: {
    icon: '⚓', name: 'Bait on the bottom',
    rigHint: 'Sinker rig (2-hook bottom rig or fishfinder)',
    steps: [
      'Cast, then let the sinker hit the bottom. The line goes loose when it lands.',
      'Reel just until the line is tight. Hold the rod tip up a little (10 o\'clock), or set it in a holder.',
      'Wait and watch the rod tip. Every couple of minutes, reel 2–3 turns to move the bait and check it.',
      'Tap-tap? Let it bite once more, then reel steadily (see "Fish on!").',
    ],
  },
  float: {
    icon: '🔴', name: 'Bait under a bobber or cork',
    rigHint: 'Bobber/slip float, or a popping cork in salt water',
    steps: [
      'Set the bobber so the bait hangs 1–2 feet above the bottom (find the depth first). Bream in shallow water: 2–3 feet under.',
      'Cast past your spot, then reel back until the bobber sits right where you want it.',
      'Reel up the loose line so it\'s almost tight, then watch the bobber.',
      'Bobber goes under or zooms sideways? Reel fast until the line is tight, then lift.',
      'Popping cork: give it a sharp twitch every 10–15 seconds so it goes "pop", then wait. The pop sounds like fish eating.',
    ],
  },
  spoon: {
    icon: '🥄', name: 'Spoon or spinner',
    rigHint: 'Spoon, Gotcha plug or inline spinner',
    steps: [
      'Cast as far as you can and count while it sinks: "one-thousand, two-thousand…". Short count = near the top, longer = deeper.',
      'Reel at a steady speed: fast enough that you feel it wiggle, slow enough that it doesn\'t skip on top.',
      'Birds diving or fish splashing? Reel FAST.',
      'A hit feels like a hard bump. Keep reeling. Don\'t stop!',
    ],
  },
  jig: {
    icon: '🪝', name: 'Soft plastic on a jighead',
    rigHint: '1/8–1/4 oz jighead + paddletail, shrimp or grub',
    steps: [
      'Cast, then let it sink to the bottom. Watch the line: it goes loose when the jig lands.',
      'Lift the rod tip from 9 to 11 o\'clock to hop the jig, then lower it and reel up the loose line.',
      'Most bites come while it\'s falling: a tap, or the line twitching sideways. Reel and lift right away.',
      'Cold water: small, slow hops along the bottom. Warm water: bigger, faster hops.',
    ],
  },
  topwater: {
    icon: '💥', name: 'Topwater lure',
    rigHint: 'Popper or walking bait',
    steps: [
      'Only at sunrise or sunset, on calm water.',
      'Twitch-twitch-pause: snap the rod tip down twice, then let it sit.',
      'When a fish blows up on it, DON\'T jerk yet. Wait until you feel the weight, then reel and lift.',
    ],
  },
}

// ---------------------------------------------------------------------------
// FISH ON: how to reel one in, for every kind of setup.
// ---------------------------------------------------------------------------
export const FIGHT = [
  { icon: '👀', text: 'Watch for the bite: tap-tap on the rod tip, the line twitching, or the bobber going under.' },
  { icon: '🔄', text: 'Circle hook (the point curls back in, required with natural bait on big hooks in salt water): DON\'T jerk. Just reel steadily. The hook slides into the corner of the mouth by itself.' },
  { icon: '⚡', text: 'Regular small hook: lift the rod tip quickly, like flicking a bug off it.' },
  { icon: '⬆️', text: 'Keep the rod tip UP (about 10–11 o\'clock) and the line tight. Loose line lets the fish spit the hook.' },
  { icon: '💪', text: 'Big fish? Pump and reel: lift the rod slowly, then reel while you lower it. Repeat.' },
  { icon: '🔊', text: 'Reel buzzing and line going out? That\'s the drag doing its job. Hold on and stop reeling until the fish stops pulling.' },
  { icon: '🥅', text: 'Landing it: swing small fish in. On a pier, never lift a big fish by the line. Walk it to the beach or use the pier net.' },
  { icon: '💧', text: 'Letting it go: wet your hands, keep it over the water, and back the hook out. Swallowed hook? Cut the line close to the mouth.' },
]

// ---------------------------------------------------------------------------
// FIND THE DEPTH: no depth finder needed.
// ---------------------------------------------------------------------------
export const DEPTH_TIPS = [
  { icon: '🔢', title: 'Count it down (from shore)', text: 'Cast a jig or sinker and count "one-thousand, two-thousand…" until the line goes loose. A 1/4-oz jig sinks roughly a foot per second, so a count of 8 ≈ 8 feet deep.' },
  { icon: '🎣', title: 'Drop and reel (pier or dock)', text: 'Let the sinker drop straight down until the line goes loose, then reel it up counting turns. A grown-up spinning reel brings in about 2½ feet per turn (look for "IPT" on the reel or box); a kids\' reel about 1–1½ feet.' },
  { icon: '🔴', title: 'Set the bobber', text: 'Once you know the depth, slide the bobber so the bait hangs 1–2 feet above the bottom.' },
  { icon: '👁️', title: 'Read the color', text: 'See the bottom or light-colored water = shallow. Dark green, blue or black = deeper.' },
]

// ---------------------------------------------------------------------------
// HANDLE WITH CARE: teeth and spines that hurt small hands. Shown on the
// cast plan for any fish it says you might catch.
// ---------------------------------------------------------------------------
const CAT_SPINES = 'sharp spines on the top and side fins. Hold it from underneath, behind the side fins.'
const SPINY_BACK = 'spiny back fin. Smooth it down from front to back before you grab it.'
export const HANDLE = {
  bluefish: 'razor-sharp teeth. A grown-up unhooks it with pliers.',
  'spanish-mackerel': 'sharp teeth. Unhook it with pliers.',
  'king-mackerel': 'big sharp teeth. Grown-ups only.',
  'chain-pickerel': 'sharp teeth. Unhook it with pliers.',
  bowfin: 'sharp teeth and very strong. A grown-up unhooks it.',
  flounder: 'sharp little teeth. Hold it by the body, not the mouth.',
  'spotted-seatrout': 'two fang teeth up front. Keep fingers out of its mouth.',
  sheepshead: 'strong teeth and a spiny back. Grip it carefully.',
  'channel-catfish': CAT_SPINES,
  'blue-catfish': CAT_SPINES,
  'flathead-catfish': CAT_SPINES,
  'hardhead-catfish': 'painful spines. Don\'t touch it; a grown-up unhooks it with pliers.',
  'striped-bass': SPINY_BACK,
  'white-perch': SPINY_BACK,
  pinfish: SPINY_BACK,
}

export const ZONE_LABEL = { top: 'Near the top', middle: 'Middle of the water', bottom: 'On or near the bottom' }
