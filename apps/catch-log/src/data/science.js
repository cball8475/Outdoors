// ---------------------------------------------------------------------------
// What actually moves catch rates, ranked by strength of evidence.
// Shown in the app (Guide → Science) and in fishing/science.md.
//
// Evidence levels:
//   strong   – physical mechanism + consistent field data / peer review
//   moderate – solid mechanism, field data mostly agrees
//   mixed    – studies disagree or effects are species-specific
//   weak     – best-controlled tests mostly find no effect
// ---------------------------------------------------------------------------
export const SCIENCE = [
  {
    factor: 'Water temperature',
    evidence: 'strong',
    what: 'Fish are cold-blooded: metabolism, feeding and location all track water temp. A 5°F change matters more than any moon table.',
    use: 'The app shows the live reading from the nearest NOAA/USGS sensor (check it from home before a trip), the normal for the date, and whether each fish is in its prime range. Log the real number on the trip with a $10 thermometer. In fall, the first cool fronts that drop water into the 60s°F turn on trout, reds and bass.',
  },
  {
    factor: 'Moving water (tide current)',
    evidence: 'strong',
    what: 'Current moves bait; predators set up where current delivers it (points, creek mouths, jetty tips, pier pilings). Slack water is usually the slowest bite.',
    use: 'The app\'s tide factor scores mid-tide (fastest flow) highest, and the Times screen flags big-tide days from NOAA data (bigger range = faster current). Plan to be fishing during the middle 2–4 hours of a rising or falling tide. Inside creeks/the MarshWalk, the last half of the falling tide pulls bait out of the marsh.',
  },
  {
    factor: 'Low light (dawn & dusk)',
    evidence: 'moderate',
    what: 'Many predators (bass, trout, reds, bluefish) feed hardest in low light, when they have the visual edge over bait.',
    use: 'Be lines-in at sunrise. When a moving tide lines up with dawn or dusk, that\'s the best window of the day.',
  },
  {
    factor: 'Finding bait',
    evidence: 'strong',
    what: 'No bait, no fish. Diving birds, nervous water, and mullet schools along the beach are where the bite is.',
    use: 'In October, follow the mullet run: blues, reds and flounder sit right under the schools.',
  },
  {
    factor: 'Weather fronts / barometric pressure',
    evidence: 'mixed',
    what: 'Fishing often improves ahead of a front and slows for 1–2 days after a hard cold front (bluebird skies). Controlled studies on pressure itself are inconsistent.',
    use: 'SCDNR notes cold fronts trigger the fall trout bite. Fish the day before a front; slow down and fish deeper right after.',
  },
  {
    factor: 'Solunar majors/minors & moon phase',
    evidence: 'weak',
    what: 'Popular since 1926 but poorly supported: a 2023 peer-reviewed trout study found NO relationship between catch rate and solunar periods, moon phase, or illumination (air temp predicted better). Bass research (Univ. of Florida) found no new/full moon boost. Some reef fish show species-specific lunar effects.',
    use: 'NOT used in this app (removed Oct 2026). The moon\'s one real effect on inshore fishing is through TIDES: new/full moons make bigger tides and faster current. The Times screen shows that directly as "Big tides / Small tides vs average" from NOAA data.',
  },
  {
    factor: 'Circle hooks & quick releases',
    evidence: 'strong',
    what: 'Circle hooks greatly reduce deep-hooking and post-release death for bait fishing (Cooke & Suski 2004 review). Air exposure and rough handling raise release mortality.',
    use: 'Circle hooks are now REQUIRED in SC for natural bait on 4/0+ hooks for saltwater gamefish. Don\'t "set" a circle hook, just reel tight. Wet hands, horizontal support for big fish, photo fast, back in the water.',
  },
  {
    factor: 'Your own logbook',
    evidence: 'strong',
    what: 'Local patterns beat generic tables. Catch-per-hour by tide stage, light and spot, from YOUR trips, is the same method fisheries scientists use (CPUE).',
    use: 'Log every trip, even skunks (effort counts). After ~10 trips, Stats → Insights shows catch-per-hour by tide stage and light period. Trust that over any app\'s prediction, including this one.',
  },
]

export const SCIENCE_SOURCES = [
  { label: 'Solunar & CPUE in a recreational trout fishery (SN Applied Sciences, 2023)', url: 'https://link.springer.com/article/10.1007/s42452-023-05379-8' },
  { label: 'Does the lunar cycle affect reef fish catch rates?', url: 'https://www.researchgate.net/publication/316057354_Does_the_Lunar_Cycle_Affect_Reef_Fish_Catch_Rates' },
  { label: 'Solunar theory overview (Texas Saltwater Fishing)', url: 'https://www.texassaltwaterfishingmagazine.com/fishing/education/fishy-facts/solunar-theory' },
  { label: 'Cooke & Suski (2004), circle hooks in catch-and-release fisheries, Aquatic Conservation 14:299–326', url: 'https://doi.org/10.1002/aqc.614' },
  { label: 'SC red drum + circle hook law S.961 (effective 7/1/2026)', url: 'https://www.scstatehouse.gov/sess126_2025-2026/bills/961.htm' },
  { label: 'SCDNR spotted seatrout life history', url: 'https://www.dnr.sc.gov/marine/species/spottedseatrout.html' },
]

export const EVIDENCE_LABEL = {
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
  mixed: 'Mixed evidence',
  weak: 'Weak evidence',
}
