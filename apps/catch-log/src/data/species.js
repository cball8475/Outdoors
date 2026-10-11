// ---------------------------------------------------------------------------
// SPECIES DATA: the single source of truth for the in-app guide, the ID
// helper, the size/creel checker, and the generated markdown docs
// (scripts/gen-docs.mjs → fishing/species-lures-baits.md + regulations.md).
//
// Regs verified against SCDNR eRegulations 2026–27 on 10/11/2026 unless the
// `note` says otherwise. When two official sources conflict, the STRICTER
// rule is entered and the note says so.
//
// Field guide:
//   water      'salt' | 'fresh' | 'both'
//   group      aggregate limit group: per-person limit counts the whole group
//   marks      ID-helper tags (see MARKS below)
//   regs       { min, max, measure 'TL'|'FL', perPerson, perBoat,
//                perPersonSpecies (species cap inside a group limit),
//                closed:[{from:'MM-DD',to:'MM-DD'}],
//                minSeason:{from,to} (min size only applies in this window),
//                bigFish:{over, max} (max fish over `over` inches per day),
//                noPossession, note, special:[{water, ...overrides}] }
//   special.water keys: santee-cooper | murray | wateree | pee-dee-upper |
//                       pee-dee-rivers | ashwood | sc-salt
//   rigs       keyed by rod: salt | fresh | kids (see rods.js)
// ---------------------------------------------------------------------------

export const REGS_SOURCE = 'SCDNR eRegulations 2026–27, checked 10/11/2026'
export const REGS_URL = 'https://www.eregulations.com/southcarolina/fishing'

export const MARKS = {
  'tail-spot': 'Black spot(s) near the tail',
  'shoulder-spot': 'Dark spot just behind the gill',
  barbels: 'Whiskers / barbels under the chin',
  flat: 'Flat, both eyes on one side',
  'vertical-bars': 'Dark vertical bars',
  'horizontal-stripes': 'Dark horizontal stripe(s)',
  speckled: 'Spots or speckles on back / fins',
  teeth: 'Sharp teeth or fangs',
  'human-teeth': 'Human-like teeth',
  'forked-tail': 'Deeply forked tail',
  'ear-flap': 'Dark "ear flap" on gill cover',
  'long-dorsal': 'Back fin runs most of the body',
  'duck-bill': 'Long duck-bill snout',
  'colored-belly': 'Yellow / orange / red throat or belly',
  'big-mouth': 'Big mouth (jaw reaches past the eye)',
  'plain-silver': 'Plain silver, few markings',
  catfish: 'Catfish shape (slick skin, no scales)',
  'wavy-lines': 'Wavy or diagonal lines',
}

const SALT_STRIPER = { water: 'sc-salt', min: 26, perPerson: 3, closed: [{ from: '06-16', to: '09-30' }] }

export const SPECIES = [
  // ======================== SALTWATER ========================
  {
    id: 'red-drum',
    name: 'Red Drum',
    aka: ['redfish', 'spottail bass', 'puppy drum', 'bull red'],
    water: 'salt',
    marks: ['tail-spot', 'colored-belly'],
    idTips: 'Copper-bronze body, one or more black spots at the base of the tail, NO chin whiskers.',
    lookalikes: 'Black drum has chin barbels and no tail spot. Spot (the small fish) has a shoulder spot, not a tail spot.',
    regs: {
      min: 18, max: 25, measure: 'TL', perPerson: 1, perBoat: 2,
      note: 'New July 1, 2026: 18–25″ slot, 1/person, 2/boat. Natural bait on hooks 4/0+ must be a non-offset, non-stainless CIRCLE hook. Nearly every fall bull red is over the slot: release it fast.',
    },
    fall: 'Peak season. Adults leave the inlets late Oct–Nov and run the beaches ("bull red run"). Slot reds stack in creeks and along jetties on falling tides.',
    baits: ['Cut or live finger mullet', 'Cut menhaden (pogy)', 'Blue crab (halved)', 'Live shrimp'],
    lures: ['Gold weedless spoon', '3–4″ paddletail on 1/4 oz jighead', 'Gulp! Shrimp', 'Topwater walker at dawn'],
    rigs: {
      salt: 'Fishfinder (slide) rig: 2–4 oz pyramid sinker, swivel, 24–30″ of 30–40 lb fluoro, 5/0–7/0 NON-offset, NON-stainless circle hook (required w/ natural bait), cut mullet. Rod in a holder; when it loads up, just reel.',
      fresh: 'For slot reds in creeks: 1/4 oz jighead + paddletail on 10 lb braid / 15–20 lb fluoro leader. Too light for bulls.',
      kids: 'Slot reds only: 2-hook bottom rig with shrimp. Bulls will spool an Ugly Stik, so hand off to an adult.',
    },
  },
  {
    id: 'spotted-seatrout',
    name: 'Spotted Seatrout',
    aka: ['speckled trout', 'speck', 'trout'],
    water: 'salt',
    marks: ['speckled', 'teeth', 'plain-silver'],
    idTips: 'Silvery with round black spots on the back, the dorsal fin AND the tail; 1–2 fang-like canine teeth up front; yellow-orange mouth inside.',
    lookalikes: 'Weakfish: spots in wavy diagonal rows, no spots on fins. Silver seatrout: no spots.',
    regs: { min: 14, measure: 'TL', perPerson: 10, note: 'Saltwater gamefish: circle-hook rule applies to natural bait on 4/0+ hooks. No gigging Dec 1–Feb 28.' },
    fall: 'October–November is the peak. Cold fronts kick the bite on; fish move to deeper creek bends and channels as water drops below ~60°F.',
    baits: ['Live shrimp (#1 bait by far)', 'Live finger mullet', 'Mud minnows'],
    lures: ['Popping cork + Vudu/Gulp shrimp', 'MirrOlure suspending twitchbait', '3″ paddletail on 1/8–1/4 oz jighead', 'Topwater at dawn'],
    rigs: {
      salt: 'Popping cork: 24–30″ of 20 lb fluoro under the cork, #1–1/0 kahle or circle hook through the shrimp\'s horn. Pop it every 10–15 sec.',
      fresh: 'Your freshwater rod is IDEAL for trout: 10 lb braid / 15 lb fluoro, 1/8 oz jighead + soft plastic, slow-roll near the bottom.',
      kids: 'Slip float or clip-on bobber, 18–24″ leader, #1 hook, live shrimp. Kids catch a lot of trout this way.',
    },
  },
  {
    id: 'flounder',
    name: 'Southern Flounder',
    aka: ['flounder', 'flatfish', 'doormat', 'summer flounder', 'gulf flounder'],
    water: 'salt',
    marks: ['flat', 'speckled', 'teeth'],
    idTips: 'Flat; both eyes on the LEFT side; brown with diffuse spots. SC regs treat all flounder species as one.',
    lookalikes: 'Summer flounder: 5 eye-like spots. Gulf flounder: 3 eyespots in a triangle. Same limits either way.',
    regs: { min: 16, measure: 'TL', perPerson: 5, perBoat: 10, note: '16″ TL minimum since July 1, 2021. Limits apply to hook-and-line AND gig.' },
    fall: 'Big females stage at inlets and jetties in Oct–Nov before heading offshore to spawn. Last good shot of the year.',
    baits: ['Live finger mullet', 'Live mud minnows', 'Live menhaden'],
    lures: ['Gulp! Swimming Mullet 3–4″ on 1/4 oz jighead', 'Bucktail tipped with Gulp'],
    rigs: {
      salt: 'Carolina rig: 1/2–1 oz egg sinker, bead, swivel, 18″ of 20 lb fluoro, 1/0–2/0 hook through the minnow\'s lips. Drag it SLOWLY along pilings/rocks; when you feel a thump, count to 10, then reel tight.',
      fresh: 'Same Carolina rig, lighter: 1/2 oz egg sinker, 15 lb fluoro, #1 hook. Great dock rig.',
      kids: 'Mud minnow on a #2 hook under the pier; most kid flounder are under 16″, so measure every one.',
    },
  },
  {
    id: 'sheepshead',
    name: 'Sheepshead',
    aka: ['convict fish', 'sheephead'],
    water: 'salt',
    marks: ['vertical-bars', 'human-teeth'],
    idTips: '5–6 bold black vertical bars on silver-gray; human-like front teeth; very sharp back-fin spines.',
    lookalikes: 'Juvenile black drum also have bars but have chin barbels and no human teeth.',
    regs: { min: 14, measure: 'TL', perPerson: 10, perBoat: 30 },
    fall: 'Build up on jetties, pilings and bridges through late fall into winter.',
    baits: ['Fiddler crabs', 'Barnacles / oysters scraped from pilings', 'Sand fleas'],
    lures: ['Not a lure fish. Use bait.'],
    rigs: {
      salt: 'Short fluoro leader (6–8″, 20–30 lb), 1 oz egg sinker right above, strong #1–1/0 J-hook. Drop straight down tight to the structure; set at the slightest tick.',
      fresh: 'Too light for jetty rocks; use the saltwater rod.',
      kids: 'Tough for kids (light bites). Let them scrape barnacles to chum.',
    },
  },
  {
    id: 'black-drum',
    name: 'Black Drum',
    aka: ['drum', 'puppy drum (small)'],
    water: 'salt',
    marks: ['barbels', 'vertical-bars'],
    idTips: 'High arched back; many short chin barbels; gray-black (young have 4–5 vertical bars); makes a drumming sound.',
    lookalikes: 'Sheepshead: human teeth, no barbels. Red drum: tail spot, no barbels.',
    regs: { min: 14, max: 27, measure: 'TL', perPerson: 5 },
    fall: 'Steady at piers, bridges and inlets all fall.',
    baits: ['Fresh shrimp (peeled or whole)', 'Clams', 'Cut blue crab'],
    lures: ['Rarely: Fishbites on a bottom rig'],
    rigs: {
      salt: 'Fishfinder or 2-hook bottom rig, 2–3 oz sinker, 2/0 circle hook, shrimp on the bottom.',
      fresh: '2-hook bottom rig, 1–2 oz sinker, #1 hooks, shrimp.',
      kids: '2-hook bottom rig with shrimp. Most small black drum come to kids this way.',
    },
  },
  {
    id: 'whiting',
    name: 'Whiting (Southern Kingfish)',
    aka: ['whiting', 'sea mullet', 'kingfish (small)', 'king whiting'],
    water: 'salt',
    group: 'wsc',
    marks: ['barbels', 'plain-silver'],
    idTips: 'Single short chin barbel; gray-silver; mouth underneath; long first back-fin spine.',
    lookalikes: 'Croaker has several barbels and a brassy color with wavy lines.',
    regs: { perPerson: 50, note: '50/person/day COMBINED with spot + croaker (hook & line). No size limit.' },
    fall: 'Strong fall fish in the surf troughs and around piers. The best kid fish on the coast.',
    baits: ['Fresh shrimp (small pieces)', 'Sand fleas (mole crabs)', 'Bloodworms'],
    lures: ['Fishbites (shrimp or sand flea flavor) on bottom rig'],
    rigs: {
      salt: '2-hook bottom (dropper) rig, #4–#2 hooks, 2–3 oz pyramid or bank sinker. Cast into the first trough.',
      fresh: 'Same 2-hook rig with 1–2 oz sinker; the freshwater rod works fine for whiting.',
      kids: 'Pre-tied 2-hook rig, #6 hooks, 1–2 oz sinker, small pieces of shrimp. Short casts are fine; whiting are in the first trough.',
    },
  },
  {
    id: 'spot',
    name: 'Spot',
    aka: ['spot', 'Lafayette'],
    water: 'salt',
    group: 'wsc',
    marks: ['shoulder-spot', 'wavy-lines'],
    idTips: 'Small, deep-bodied; one black spot just behind the gill; yellowish diagonal lines.',
    lookalikes: 'Pinfish: shoulder spot too, but blue/yellow stripes and spiny. Red drum: spot is on the TAIL.',
    regs: { perPerson: 50, note: '50/person/day COMBINED with whiting + croaker. No size limit.' },
    fall: 'October "spot run" along piers and in inlets (timing varies year to year).',
    baits: ['Bloodworms', 'Small shrimp pieces'],
    lures: ['Bloodworm Fishbites'],
    rigs: {
      salt: 'Double-dropper rig, #6 hooks, 1–2 oz sinker.',
      fresh: 'Double-dropper rig, #6 hooks, 1 oz sinker.',
      kids: 'Perfect kid fish: double-dropper, #6 hooks, bloodworm Fishbites. Also great live bait for big reds/flounder.',
    },
  },
  {
    id: 'croaker',
    name: 'Atlantic Croaker',
    aka: ['croaker', 'hardhead'],
    water: 'salt',
    group: 'wsc',
    marks: ['barbels', 'wavy-lines'],
    idTips: 'Several tiny chin barbels; brassy-silver with wavy diagonal lines/spots; croaks when caught.',
    lookalikes: 'Whiting: one barbel, plain silver.',
    regs: { perPerson: 50, note: '50/person/day COMBINED with whiting + spot. No size limit.' },
    fall: 'Common around piers and inlets into November.',
    baits: ['Shrimp', 'Bloodworms', 'Squid strips'],
    lures: ['Fishbites'],
    rigs: {
      salt: '2-hook bottom rig, #4 hooks, 2 oz sinker.',
      fresh: '2-hook bottom rig, #4–6 hooks, 1–2 oz sinker.',
      kids: '2-hook bottom rig, #6 hooks, shrimp.',
    },
  },
  {
    id: 'bluefish',
    name: 'Bluefish',
    aka: ['blues', 'snapper blue', 'chopper'],
    water: 'salt',
    marks: ['teeth', 'forked-tail', 'plain-silver'],
    idTips: 'Blue-green back, silver sides, forked tail, rows of razor-sharp triangular teeth. Use pliers, not fingers.',
    lookalikes: 'Spanish mackerel has gold spots; jacks have a hard scute line near the tail.',
    regs: { perPerson: 5, note: 'No size limit. 7/person on for-hire boats.' },
    fall: 'Blitz the mullet schools along the beach and piers in October.',
    baits: ['Cut mullet', 'Cut menhaden', 'Live finger mullet'],
    lures: ['Gotcha plug', 'Silver spoon (Hopkins, Clark)', 'Metal jig'],
    rigs: {
      salt: '6–12″ of light wire or 40 lb leader to a Gotcha plug; fast, jerky retrieve.',
      fresh: 'Metal spoon on a 30 lb leader; expect cut-offs without wire.',
      kids: 'Cut mullet on a bottom rig with a short wire leader; adult unhooks.',
    },
  },
  {
    id: 'spanish-mackerel',
    name: 'Spanish Mackerel',
    aka: ['spanish'],
    water: 'salt',
    marks: ['speckled', 'teeth', 'forked-tail'],
    idTips: 'Gold/yellow oval spots on silver sides; front of first back fin is BLACK; lateral line slopes gently.',
    lookalikes: 'Young king mackerel: lateral line dips sharply under the 2nd back fin; no black on the 1st back fin.',
    regs: { min: 12, measure: 'FL', perPerson: 15 },
    fall: 'Leave as water cools through October; early-October pier mornings are the last shot.',
    baits: ['Live finger mullet', 'Glass minnows'],
    lures: ['Gotcha plug', 'Clark spoon', 'Small silver metal jig'],
    rigs: {
      salt: 'Gotcha plug or 1 oz spoon on 30 lb fluoro or light wire; fast retrieve from the pier end at sunup.',
      fresh: 'Small spoon on 20–30 lb fluoro leader.',
      kids: 'Spoon on a cast-and-reel. Fun but fast. An adult should rig it.',
    },
  },
  {
    id: 'king-mackerel',
    name: 'King Mackerel',
    aka: ['king', 'kingfish', 'smoker'],
    water: 'salt',
    marks: ['teeth', 'forked-tail', 'plain-silver'],
    idTips: 'Large, silver; lateral line drops sharply under the 2nd back fin; no black on the 1st back fin.',
    lookalikes: 'Spanish mackerel (see above).',
    regs: { min: 24, measure: 'FL', perPerson: 3 },
    eat: 'FDA lists king mackerel as a "choice to avoid" (high mercury), especially for kids and pregnant women.',
    fall: 'Sept–Oct pier-end kings when bait is thick (Cherry Grove, Apache, Springmaid king passes).',
    baits: ['Live menhaden', 'Live bluefish'],
    lures: ['Pier king fishing is live bait'],
    rigs: {
      salt: 'Needs a dedicated king setup (anchor rod + trolley/stinger rig, 20–30 lb mono, wire stinger). Your saltwater spinning rod isn\'t built for it.',
    },
  },
  {
    id: 'pompano',
    name: 'Florida Pompano',
    aka: ['pompano'],
    water: 'salt',
    marks: ['colored-belly', 'plain-silver', 'forked-tail'],
    idTips: 'Deep, flat silver body; yellow throat and belly; blunt head; no teeth.',
    lookalikes: 'Permit (rare here): deeper body, no yellow.',
    regs: { note: 'No SC size or creel limit listed.' },
    fall: 'Fall run along the beach in the surf, often with whiting.',
    baits: ['Sand fleas (#1)', 'Shrimp', 'Fishbites'],
    lures: ['Small 1/4–1/2 oz pompano jig (yellow/pink)'],
    rigs: {
      salt: 'Pompano rig (2 hooks with floats/beads), #1–2 hooks, 2–3 oz pyramid sinker, sand fleas in the first trough.',
      fresh: 'Same pompano rig with 2 oz sinker.',
      kids: 'Pompano rig with Fishbites; same as whiting fishing.',
    },
  },
  {
    id: 'cobia',
    name: 'Cobia',
    aka: ['ling', 'lemonfish'],
    water: 'salt',
    marks: ['horizontal-stripes'],
    idTips: 'Long dark-brown body, broad flat head, dark stripe down the side, short back-fin spines; looks shark-like.',
    lookalikes: 'Remora (sharksucker) has a suction disk on its head.',
    regs: { min: 36, measure: 'FL', perPerson: 1, perBoat: 6, note: 'North of 32°31′N (the Grand Strand): 1/person, 6/boat. Circle-hook rule applies to natural bait 4/0+.' },
    fall: 'Mostly a spring fish here; occasional pier-end fish.',
    baits: ['Live eels', 'Live menhaden'],
    lures: ['Large bucktail jig'],
    rigs: { salt: 'Heavy gear. Not a target for this rod lineup.' },
  },
  {
    id: 'pinfish',
    name: 'Pinfish',
    aka: ['pinfish', 'sailor\'s choice'],
    water: 'salt',
    marks: ['shoulder-spot', 'horizontal-stripes'],
    idTips: 'Small, spiny; dark shoulder spot; blue and yellow horizontal stripes.',
    lookalikes: 'Spot: shoulder spot but plain yellowish diagonal lines.',
    regs: { note: 'No limit. Excellent live bait for reds and flounder.' },
    fall: 'Everywhere around docks and pilings until water cools.',
    baits: ['Tiny pieces of shrimp'],
    lures: ['Sabiki rig'],
    rigs: { salt: 'Sabiki or #8 hook with a pea of shrimp.', kids: '#8 hook, tiny shrimp piece. Endless bites.' },
  },
  {
    id: 'hardhead-catfish',
    name: 'Hardhead Catfish (saltwater)',
    aka: ['sea catfish', 'gafftopsail'],
    water: 'salt',
    marks: ['catfish', 'barbels', 'forked-tail'],
    idTips: 'Saltwater catfish: 4 chin + 2 corner barbels; VENOMOUS spines on back and side fins. Gafftopsail has long fin filaments.',
    lookalikes: 'Whiting / croaker have scales and no venomous spines.',
    regs: { noPossession: true, note: 'Hardhead & gafftopsail: possession prohibited. Release immediately. Pin spines with a towel; a spine stab is very painful.' },
    fall: 'Common bycatch on bottom rigs.',
    baits: [],
    lures: [],
    rigs: {},
  },
  {
    id: 'striped-bass',
    name: 'Striped Bass',
    aka: ['striper', 'rockfish'],
    water: 'both',
    marks: ['horizontal-stripes', 'plain-silver'],
    idTips: '7–8 unbroken dark horizontal stripes on silver; two separate back fins.',
    lookalikes: 'Hybrid: stripes broken/offset, deeper body. White perch: no stripes.',
    regs: {
      perPerson: 10,
      note: 'Statewide freshwater: 10/day, no size limit. Special rules on Santee Cooper, Lake Murray, the Pee Dee-area rivers, and salt water.',
      special: [
        { water: 'santee-cooper', min: 23, max: 25, bigFish: { over: 26, max: 1 }, perPerson: 3, closed: [{ from: '06-16', to: '09-30' }], note: 'Santee Cooper: Oct 1–Jun 15 only; 3/day, 23–25″ fish may be kept and ONE may be over 26″ (25–26″ must go back). Closed Jun 16–Sep 30.' },
        { water: 'murray', min: 21, minSeason: { from: '10-01', to: '05-31' }, perPerson: 5, note: 'Lake Murray: 5/day; 21″ min Oct 1–May 31; any length Jun 1–Sep 30.' },
        { water: 'pee-dee-rivers', min: 26, perPerson: 3, closed: [{ from: '06-16', to: '09-30' }], note: 'Pee Dee-area rivers: SOURCES CONFLICT (statewide 10/day vs 26″ min, 3/day, closed Jun 16–Sep 30). The stricter rule is applied here. Check the posted regs.' },
        { ...SALT_STRIPER, note: 'Salt water: 26″ TL min, 3/day Oct 1–Jun 15; possession prohibited Jun 16–Sep 30. Circle-hook rule applies.' },
      ],
    },
    fall: 'Santee Cooper reopens Oct 1. Stripers school under birds and chase herring/shad as water cools. Mostly a boat fishery.',
    baits: ['Live blueback herring', 'Live gizzard / threadfin shad', 'Cut herring'],
    lures: ['Bucktail jig', 'Topwater walker when schooling', '4–5″ swimbait', 'Umbrella rig (boat)'],
    rigs: {
      salt: 'Live herring on a 3/0–5/0 circle hook, 30″ of 20 lb fluoro, 1 oz egg sinker (down-line) or free-lined.',
      fresh: 'Bucktail or swimbait to breaking fish; 10 lb braid / 15 lb fluoro leader.',
    },
  },

  // ======================== FRESHWATER ========================
  {
    id: 'largemouth-bass',
    name: 'Largemouth Bass',
    aka: ['bass', 'bigmouth', 'green trout'],
    water: 'fresh',
    group: 'blackbass',
    marks: ['horizontal-stripes', 'big-mouth'],
    idTips: 'Green with a dark, blotchy horizontal stripe; upper jaw extends PAST the back of the eye.',
    lookalikes: 'Spotted bass: jaw stops at the eye, rows of small spots below the lateral line, tooth patch on tongue.',
    regs: {
      perPerson: 5,
      note: '5/day combined black bass. No statewide minimum.',
      special: [
        { water: 'santee-cooper', min: 14, note: 'Santee Cooper lakes: 14″ minimum, 5/day.' },
        { water: 'murray', min: 14, note: 'Lake Murray: 14″ minimum, 5/day.' },
        { water: 'wateree', min: 14, note: 'Lake Wateree: 14″ minimum, 5/day.' },
        { water: 'ashwood', perPerson: 3, note: 'Lake Ashwood (SC Reg 123-210): 3 bass/day. No minnows or shiners as bait.' },
      ],
    },
    fall: 'Follow shad into creek arms and shallow flats; feed hard as water cools into the 60s°F. One of the best months of the year.',
    baits: ['Live shiners', 'Nightcrawlers (small bass)'],
    lures: ['Buzzbait / walking topwater (dawn)', 'Lipless crankbait (shad color)', 'Spinnerbait', 'ChatterBait', '5″ stick worm (wacky or Texas)'],
    rigs: {
      fresh: 'Texas-rigged 5″ stick worm: 3/0 EWG hook, 1/8 oz bullet weight (or weightless). Or a 1/2 oz lipless crank burned over grass.',
      salt: 'Works for heavier cover (spinnerbait, ChatterBait) if spooled with 20 lb braid.',
      kids: 'Live shiner or nightcrawler under a bobber near cover. Kids catch plenty of bass this way.',
    },
  },
  {
    id: 'bluegill',
    name: 'Bluegill',
    aka: ['bream', 'brim', 'copperhead'],
    water: 'fresh',
    group: 'bream',
    marks: ['ear-flap', 'vertical-bars', 'colored-belly'],
    idTips: 'All-black "ear flap"; dark blotch at the back of the soft back fin; faint vertical bars; yellow-orange breast.',
    lookalikes: 'Redear: orange-red edge on ear flap, no back-fin blotch. Redbreast: long skinny ear flap, river fish.',
    regs: { perPerson: 30, note: '30/day bream aggregate (bluegill, redear, warmouth, redbreast), no size limit.', special: [{ water: 'ashwood', perPerson: 15, note: 'Lake Ashwood (SC Reg 123-210): 15 bream/day incl. redbreast.' }] },
    fall: 'Leave the shallow beds for brush piles and docks in 6–12 ft.',
    baits: ['Red wigglers', 'Crickets', 'Pieces of nightcrawler'],
    lures: ['1/32 oz tube or curly-tail jig', 'Beetle Spin', 'Small inline spinner'],
    rigs: {
      fresh: '1/32 oz jig under a small slip float, or #8 hook + split shot + worm.',
      kids: 'THE kid fish. Clip-on bobber 2–3 ft above a #8 long-shank hook, small split shot, piece of worm. Long-shank hooks are easier to unhook.',
    },
  },
  {
    id: 'redear',
    name: 'Redear Sunfish',
    aka: ['shellcracker', 'bream'],
    water: 'fresh',
    group: 'bream',
    marks: ['ear-flap', 'colored-belly'],
    idTips: 'Black ear flap with a red/orange edge; no dark blotch on the back fin; often bigger than bluegill.',
    lookalikes: 'Bluegill (all-black flap + back-fin blotch).',
    regs: { perPerson: 30, note: '30/day bream aggregate.', special: [{ water: 'ashwood', perPerson: 15 }] },
    fall: 'Bottom feeders on snails; hold deeper than bluegill in fall.',
    baits: ['Red wigglers on the bottom', 'Crickets'],
    lures: ['Small jig fished on the bottom'],
    rigs: { fresh: 'Bottom rig: 1/4 oz sinker, 12″ leader, #8 hook, worm.', kids: 'Bobber set deep (bait near the bottom), worm.' },
  },
  {
    id: 'redbreast',
    name: 'Redbreast Sunfish',
    aka: ['redbreast', 'robin', 'river bream'],
    water: 'fresh',
    group: 'bream',
    marks: ['ear-flap', 'colored-belly'],
    idTips: 'LONG narrow black ear flap; males have a bright orange-red belly; lives in rivers (Lynches, Little Pee Dee, Black).',
    lookalikes: 'Bluegill (short ear flap, lakes).',
    regs: { perPerson: 30, perPersonSpecies: 15, note: '30/day bream aggregate, but no more than 15 redbreast.', special: [{ water: 'ashwood', perPerson: 15 }] },
    fall: 'Hold in eddies behind logs and along shaded banks as rivers drop.',
    baits: ['Crickets', 'Red wigglers'],
    lures: ['Beetle Spin', 'Small Rooster Tail'],
    rigs: { fresh: 'Beetle Spin cast past a log and reeled slowly back.', kids: 'Cricket on a #8 hook under a small bobber along the bank.' },
  },
  {
    id: 'warmouth',
    name: 'Warmouth',
    aka: ['goggle-eye', 'bream'],
    water: 'fresh',
    group: 'bream',
    marks: ['big-mouth', 'wavy-lines'],
    idTips: 'Big mouth for a sunfish; red eye; dark lines radiating back from the eye; mottled brown.',
    lookalikes: 'Rock bass (not common here), small largemouth.',
    regs: { perPerson: 30, note: '30/day bream aggregate.', special: [{ water: 'ashwood', perPerson: 15 }] },
    fall: 'Around stumps and cypress knees in swamps and rivers.',
    baits: ['Worms', 'Small minnows', 'Crickets'],
    lures: ['Small jig', 'Beetle Spin'],
    rigs: { fresh: '#6 hook, split shot, worm next to wood.', kids: 'Bobber + worm tight to stumps.' },
  },
  {
    id: 'crappie',
    name: 'Crappie',
    aka: ['speckled perch', 'specks', 'papermouth', 'slab'],
    water: 'fresh',
    marks: ['speckled', 'big-mouth'],
    idTips: 'Silver with black speckles (black crappie) or faint vertical bars (white crappie); big paper-thin mouth; large back and anal fins.',
    lookalikes: 'Bluegill: small mouth, ear flap.',
    regs: { min: 8, measure: 'TL', perPerson: 20, note: '8″ minimum, 20/day statewide (incl. Santee Cooper).' },
    fall: 'Move from mid-depth brush piles to creek channels and suspend near shad. October minnow bite on Santee Cooper brush.',
    baits: ['Live crappie minnows'],
    lures: ['1/16–1/8 oz jig with 2″ tube or curly tail', 'Small hair jig'],
    rigs: {
      fresh: 'Slip float set to just above the brush, #4 light-wire gold hook, live minnow hooked through the lips.',
      kids: 'Fixed bobber, #4 gold hook, minnow. Lift gently; crappie mouths tear easily.',
    },
  },
  {
    id: 'channel-catfish',
    name: 'Channel Catfish',
    aka: ['channel cat', 'fiddler (small)'],
    water: 'fresh',
    marks: ['catfish', 'barbels', 'forked-tail', 'speckled'],
    idTips: 'Deeply forked tail; ROUNDED anal fin (24–29 rays); small dark spots on younger fish.',
    lookalikes: 'Blue catfish: straight-edged anal fin (30–36 rays), no spots.',
    regs: {
      note: 'No statewide creel listed in the 2026–27 guide (verify on posted signs).',
      special: [{ water: 'ashwood', perPerson: 5, note: 'Lake Ashwood (SC Reg 123-210, eff. 5/26/2023): 5 catfish/day. No minnows as bait.' }],
    },
    fall: 'SCDNR: "October could be a very good month for catfish." Fish move deeper as water cools.',
    baits: ['Nightcrawlers', 'Chicken liver', 'Cut shad', 'Stink bait (punch bait)'],
    lures: ['Not a lure fish'],
    rigs: {
      fresh: 'Carolina (slip-sinker) rig: 1/2–1 oz egg sinker, swivel, 18″ of 15 lb line, 2/0 circle hook. Rod in a holder; let it load up.',
      salt: 'Same slip-sinker rig for big cats.',
      kids: 'Slip-sinker rig with a #2 circle hook + nightcrawler; kid sits by the rod.',
    },
  },
  {
    id: 'blue-catfish',
    name: 'Blue Catfish',
    aka: ['blue cat', 'blue'],
    water: 'fresh',
    marks: ['catfish', 'barbels', 'forked-tail'],
    idTips: 'Slate blue-gray, no spots; anal fin has a STRAIGHT edge like a barber comb (30–36 rays). Grows huge.',
    lookalikes: 'Channel catfish (rounded anal fin, spots).',
    regs: {
      perPerson: 150,
      bigFish: { over: 32, max: 2 },
      note: 'New May 15, 2026 (Act 120): 150/day in most waters. Max 2 over 32″ in Santee Cooper, upper Pee Dee, Congaree & Wateree rivers.',
      special: [
        { water: 'santee-cooper', perPerson: 25, bigFish: { over: 32, max: 2 }, note: 'Santee Cooper: 25/day, max 2 over 32″.' },
        { water: 'pee-dee-upper', perPerson: 25, bigFish: { over: 32, max: 2 }, note: 'Pee Dee River NC line → US 301 bridge: 25/day, max 2 over 32″. (Below the bridge: 150/day.)' },
      ],
    },
    eat: 'SCDES advisories cover blue catfish on several Pee Dee-area rivers. Check the spot\'s advisory before keeping any.',
    fall: 'Drift or anchor cut bait on channel ledges; big fish start moving to deeper water for winter.',
    baits: ['Cut gizzard shad', 'Cut white perch', 'Cut herring'],
    lures: ['Not a lure fish'],
    rigs: {
      salt: 'Santee-Cooper drift rig: 1–2 oz bell sinker on a 3-way, 24″ of 40 lb leader, 5/0–7/0 circle hook, chunk of cut shad.',
      fresh: 'Slip-sinker rig with 3/0 circle hook. Big blues will test this rod.',
    },
  },
  {
    id: 'flathead-catfish',
    name: 'Flathead Catfish',
    aka: ['flathead', 'mudcat', 'yellow cat'],
    water: 'fresh',
    marks: ['catfish', 'barbels', 'big-mouth'],
    idTips: 'Wide, flat head; LOWER jaw sticks out past the upper; square/rounded tail; mottled yellow-brown.',
    lookalikes: 'Channel/blue cats have forked tails.',
    regs: { note: 'No statewide creel listed in the 2026–27 guide (verify on posted signs).' },
    fall: 'Feeds at night near deep wood in rivers (Pee Dee, Lynches).',
    baits: ['Live bream (legal; counts toward your bream limit)', 'Live shad'],
    lures: ['Not a lure fish'],
    rigs: { salt: 'Live bream on a 5/0–7/0 circle hook, 2–3 oz slip sinker, 40 lb leader, near deep logjams at night.' },
  },
  {
    id: 'white-perch',
    name: 'White Perch',
    aka: ['white perch'],
    water: 'fresh',
    marks: ['plain-silver'],
    idTips: 'Silvery, deep body, NO stripes (or very faint); usually under 12″. Big in Santee Cooper.',
    lookalikes: 'Striped/white bass have stripes.',
    regs: { note: 'No SC limit found. Verify.' },
    fall: 'Big schools on Santee Cooper. Fast action and great cut bait for blue cats.',
    baits: ['Small minnows', 'Worms'],
    lures: ['1/8 oz jigging spoon', 'Small jig'],
    rigs: { fresh: 'Jigging spoon straight down on schools seen on sonar/under birds.', kids: 'Minnow on a #4 hook under a bobber.' },
  },
  {
    id: 'bowfin',
    name: 'Bowfin',
    aka: ['mudfish', 'blackfish', 'grinnel', 'choupique'],
    water: 'fresh',
    marks: ['long-dorsal', 'tail-spot', 'teeth'],
    idTips: 'Long back fin running most of the body; rounded tail; males have a black eyespot at the tail base; mouth full of teeth.',
    lookalikes: 'Snakehead (invasive, report it!) has a long anal fin too and a pelvic fin near the head.',
    regs: { note: 'No SC limit found. Verify.' },
    eat: 'Many Pee Dee-area waters carry DO-NOT-EAT advisories for bowfin. Release.',
    fall: 'Swamps, backwaters and river oxbows; aggressive biters.',
    baits: ['Cut bait', 'Live minnows'],
    lures: ['Spinnerbait', 'Swimbait'],
    rigs: { fresh: 'Spinnerbait along cypress edges. Use pliers; they bite.' },
  },
  {
    id: 'chain-pickerel',
    name: 'Chain Pickerel',
    aka: ['jackfish', 'jack', 'pike'],
    water: 'fresh',
    marks: ['duck-bill', 'teeth'],
    idTips: 'Long, thin body; duck-bill snout; dark chain-link pattern on green-gold sides; very sharp teeth.',
    lookalikes: 'Redfin pickerel (smaller, bars instead of chains).',
    regs: { perPerson: 30, note: '30/day, no size limit.' },
    fall: 'Bites better as water cools; ambushes from weed and cypress edges.',
    baits: ['Live minnows'],
    lures: ['Inline spinner', 'Spoon', 'Jerkbait'],
    rigs: { fresh: 'Inline spinner; add 12″ of 20 lb fluoro so teeth don\'t cut you off.', kids: 'Minnow under a bobber near weeds.' },
  },
]

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]))

/** Species that make sense for a spot's water type. */
export function speciesForWater(water) {
  return SPECIES.filter((s) => s.water === water || s.water === 'both')
}

// ---------------------------------------------------------------------------
// SEASON + KID EASE: used by the Explore screens to rank "best fish here now".
//   season[0..11] = Jan..Dec: 0 = rare/absent, 1 = fair, 2 = good, 3 = peak.
//     General Grand Strand / Pee Dee patterns (SCDNR life-history pages +
//     seasonal reports), not survey data. Tweak freely as your own log grows.
//   kidEase 1–5 = how likely a 5–11-year-old on an Ugly Stik lands one
//     (0 = not a kid fish; adult gear only).
//   common = shows up almost anywhere in its water type, so it's suggested
//     even at spots whose research didn't list it.
//   bycatch = you'll catch it, but nobody targets it.
// ---------------------------------------------------------------------------
//                      J  F  M  A  M  J  J  A  S  O  N  D
const EXTRA = {
  'red-drum':         { kidEase: 2, season: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2] },
  'spotted-seatrout': { kidEase: 3, season: [1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2] },
  flounder:           { kidEase: 2, season: [0, 0, 1, 2, 2, 2, 2, 2, 3, 3, 2, 1] },
  sheepshead:         { kidEase: 1, season: [2, 2, 3, 3, 2, 1, 1, 1, 2, 2, 2, 2] },
  'black-drum':       { kidEase: 4, season: [2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 3, 2] },
  whiting:            { kidEase: 5, season: [1, 1, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2] },
  spot:               { kidEase: 5, season: [0, 0, 1, 2, 2, 1, 1, 2, 3, 3, 2, 0] },
  croaker:            { kidEase: 5, season: [0, 0, 1, 2, 2, 2, 2, 3, 3, 2, 1, 0], common: true },
  bluefish:           { kidEase: 3, season: [0, 0, 1, 3, 3, 2, 1, 1, 2, 3, 3, 1] },
  'spanish-mackerel': { kidEase: 2, season: [0, 0, 0, 1, 3, 3, 3, 3, 3, 2, 0, 0] },
  'king-mackerel':    { kidEase: 0, season: [0, 0, 0, 1, 2, 2, 2, 2, 3, 2, 1, 0] },
  pompano:            { kidEase: 3, season: [0, 0, 1, 3, 3, 2, 2, 2, 2, 3, 2, 0] },
  cobia:              { kidEase: 0, season: [0, 0, 0, 1, 3, 2, 1, 0, 0, 0, 0, 0] },
  pinfish:            { kidEase: 5, season: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0], common: true },
  'hardhead-catfish': { kidEase: 0, season: [0, 0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0], bycatch: true },
  'striped-bass':     { kidEase: 1, season: [2, 2, 3, 3, 2, 1, 0, 0, 0, 2, 3, 3] },
  'largemouth-bass':  { kidEase: 3, season: [1, 2, 3, 3, 3, 2, 2, 1, 2, 3, 2, 1] },
  bluegill:           { kidEase: 5, season: [0, 1, 1, 2, 3, 3, 3, 2, 2, 2, 1, 0], common: true },
  redear:             { kidEase: 4, season: [0, 1, 2, 3, 3, 2, 2, 1, 1, 1, 1, 0] },
  redbreast:          { kidEase: 4, season: [0, 0, 1, 2, 3, 3, 3, 2, 2, 2, 1, 0] },
  warmouth:           { kidEase: 4, season: [0, 0, 1, 2, 3, 3, 3, 2, 2, 1, 1, 0] },
  crappie:            { kidEase: 3, season: [2, 3, 3, 3, 2, 1, 1, 1, 1, 2, 3, 2] },
  'channel-catfish':  { kidEase: 4, season: [1, 1, 2, 3, 3, 3, 3, 2, 2, 3, 2, 1], common: true },
  'blue-catfish':     { kidEase: 2, season: [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3] },
  'flathead-catfish': { kidEase: 1, season: [0, 0, 1, 2, 3, 3, 3, 2, 2, 1, 0, 0] },
  'white-perch':      { kidEase: 4, season: [1, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1] },
  bowfin:             { kidEase: 2, season: [1, 1, 2, 3, 3, 2, 2, 2, 2, 2, 1, 1] },
  'chain-pickerel':   { kidEase: 3, season: [3, 3, 2, 1, 1, 1, 1, 1, 1, 2, 3, 3] },
}
for (const s of SPECIES) Object.assign(s, EXTRA[s.id] || { kidEase: 0, season: new Array(12).fill(1) })

export const SEASON_LABEL = ['Rare now', 'Fair now', 'Good now', 'Peak now']

// ---------------------------------------------------------------------------
// WATER TEMP RANGES + SHORE CUES (used by the trip game plan + Explore)
//   temp.active = °F range where the species feeds normally
//   temp.best   = °F range where it's most aggressive
//   General guideline values from fisheries / state-agency life-history
//   literature; fish don't read charts, so treat edges as fuzzy.
//   shore = what to look for when fishing from the bank, pier, dock or surf.
// ---------------------------------------------------------------------------
const SHORE = {
  'red-drum': {
    temp: { active: [60, 85], best: [68, 80] },
    shore: [
      'Surf: the first trough/slough between the beach and the sandbar (darker green water = deeper).',
      'Creek mouths, points and oyster bars on a FALLING tide, where bait gets flushed out.',
      'Grass edges at high tide: watch for tails, wakes or "nervous" water.',
      'Diving birds or mullet schools getting pushed along the beach.',
    ],
  },
  'spotted-seatrout': {
    temp: { active: [58, 82], best: [65, 78] },
    shore: [
      'Moving water at creek mouths and deep bends, where current rips past a point.',
      'Grass lines and oyster rakes; work a popping cork just off the edge.',
      'Dock and pier lights at night: trout sit on the shadow line.',
      'After a cool front in fall, try deeper holes in the creeks.',
    ],
  },
  flounder: {
    temp: { active: [58, 82], best: [65, 78] },
    shore: [
      'Tight to pilings, dock posts and jetty rocks: flounder lie flat right against structure.',
      'Sandy bottom beside structure where current sweeps bait past.',
      'Drop-offs and inlet edges on a falling tide.',
      'Drag bait SLOWLY on the bottom; a thump = flounder. Count to 10 before reeling.',
    ],
  },
  sheepshead: {
    temp: { active: [55, 80], best: [60, 72] },
    shore: [
      'Barnacle-crusted pilings, jetty rocks and bridge supports.',
      'Drop straight down tight to the structure (no casting).',
      'Bites are tiny taps; set the hook on the first feel.',
    ],
  },
  'black-drum': {
    temp: { active: [55, 82], best: [62, 75] },
    shore: [
      'Deeper holes around pier and bridge pilings.',
      'Oyster bars and channel edges; they root on the bottom for crabs and clams.',
      'Bottom rig with shrimp; let them chew before reeling.',
    ],
  },
  whiting: {
    temp: { active: [55, 80], best: [60, 72] },
    shore: [
      'The FIRST trough just past the shore break, so short casts work.',
      'Sandy bottom with some wave action; find sand fleas in the wash and fish there.',
      'Moving tide (either direction) beats slack.',
    ],
  },
  spot: {
    temp: { active: [60, 82], best: [65, 75] },
    shore: [
      'Around pier pilings over sandy bottom.',
      'Fall "spot run": when people around you are catching them, stay put; they travel in schools.',
      'Small #6 hooks + bloodworm bits.',
    ],
  },
  croaker: {
    temp: { active: [60, 85], best: [68, 80] },
    shore: [
      'Sandy/muddy bottom near piers and inlets; deeper troughs.',
      'Evenings and night are best.',
    ],
  },
  bluefish: {
    temp: { active: [60, 80], best: [64, 72] },
    shore: [
      'Bait getting busted: splashing, diving birds, mullet jumping.',
      'October mullet schools along the beach; blues follow them.',
      'Pier ends and inlet mouths. Use a short wire or heavy leader.',
    ],
  },
  'spanish-mackerel': {
    temp: { active: [68, 85], best: [72, 82] },
    shore: [
      'Clear green water off pier ends at sunrise.',
      'Birds diving on tiny glass minnows.',
      'Retrieve FAST; Spanish chase speed.',
    ],
  },
  'king-mackerel': {
    temp: { active: [68, 85], best: [70, 78] },
    shore: ['Pier ends only: clean green water with menhaden (pogies) around. Specialized anchor-rig gear.'],
  },
  pompano: {
    temp: { active: [68, 85], best: [70, 80] },
    shore: [
      'Steeper beaches with a defined trough and sand fleas in the wash.',
      'Clear water; often right after a front passes.',
    ],
  },
  cobia: {
    temp: { active: [68, 85], best: [70, 78] },
    shore: ['Sight fishing: big brown fish cruising near the surface around pier ends, buoys or rays.'],
  },
  pinfish: {
    temp: { active: [60, 88], best: [70, 85] },
    shore: ['Around any dock, piling or grass edge, usually the first thing to bite. Great live bait.'],
  },
  'striped-bass': {
    temp: { active: [50, 72], best: [55, 68] },
    shore: [
      'Below dams and in tailraces where current pushes bait.',
      'Diving birds over open water = schooling stripers.',
      'Points and humps at dawn in cool weather.',
    ],
  },
  'largemouth-bass': {
    temp: { active: [55, 85], best: [65, 78] },
    shore: [
      'Cover: docks, fallen trees, grass edges, lily pads.',
      'Fall: points and creek mouths where shad gather.',
      'Shallow at dawn/dusk; shade lines and deeper edges at midday.',
    ],
  },
  bluegill: {
    temp: { active: [62, 85], best: [68, 80] },
    shore: [
      'Docks, brush piles, overhanging trees: 2–6 ft deep just off the bank.',
      'Spring: pale circles in shallow sand = spawning beds.',
      'If the bobber doesn\'t move in 5 minutes, move 20 feet.',
    ],
  },
  redear: {
    temp: { active: [62, 82], best: [66, 78] },
    shore: ['On the bottom near shell beds, a little deeper than bluegill.'],
  },
  redbreast: {
    temp: { active: [60, 82], best: [66, 78] },
    shore: [
      'River eddies behind logs, undercut banks, slow water right next to current.',
      'Shaded banks on sunny days.',
    ],
  },
  warmouth: {
    temp: { active: [62, 85], best: [68, 80] },
    shore: ['Stumps, cypress knees and thick wood in dark swampy water.'],
  },
  crappie: {
    temp: { active: [50, 75], best: [58, 70] },
    shore: [
      'Brush piles, docks and bridge pilings; crappie suspend at mid-depth, so set the bobber to match.',
      'Fall: creek channels and wherever shad are flickering.',
      'Lift gently; their mouths tear.',
    ],
  },
  'channel-catfish': {
    temp: { active: [62, 88], best: [70, 84] },
    shore: [
      'Deeper holes, outside river bends, below spillways.',
      'Evening and night; rod in a holder, bait on the bottom.',
    ],
  },
  'blue-catfish': {
    temp: { active: [45, 85], best: [55, 75] },
    shore: ['Deep channel ledges and river bends; cut shad on the bottom. Bites well in cool water.'],
  },
  'flathead-catfish': {
    temp: { active: [65, 88], best: [72, 84] },
    shore: ['Deep woody holes and logjams at night with live bream.'],
  },
  'white-perch': {
    temp: { active: [50, 78], best: [58, 72] },
    shore: ['Schools in open water near the bottom; when you catch one, keep fishing that exact spot.'],
  },
  bowfin: {
    temp: { active: [58, 88], best: [65, 82] },
    shore: ['Weedy shallow backwaters and swamp edges.'],
  },
  'chain-pickerel': {
    temp: { active: [42, 72], best: [48, 65] },
    shore: ['Weed edges, lily pads and cypress: ambush points. Best in cool months.'],
  },
}
for (const s of SPECIES) Object.assign(s, SHORE[s.id] || {})
