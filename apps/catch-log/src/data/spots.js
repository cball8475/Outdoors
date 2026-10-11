// ---------------------------------------------------------------------------
// BUILT-IN SPOTS: public places only. Your own secret spots get added in the
// app from GPS and stay on your phone (never in this public repo).
//
// Sources: SCDNR, SC State Parks, pier websites, USFWS, county parks
// (researched 10/11/2026). Coordinates from OpenStreetMap; `approx: true`
// means the point is close but not exact (fine for tides/solunar; use the
// Directions button for navigation, which searches by name).
//
// Drive = OSRM routing estimate from downtown Florence. It tends to run long
// vs. Google Maps; the Directions button gives live traffic times.
//
// tideStation = NOAA CO-OPS station id (salt spots only), verified to return
// predictions on 10/11/2026.
// waters = keys for special regs in species.js (first match wins).
// advisory = SCDES fish-consumption advisory (table dated 2020; check the live
// map: https://gis.des.sc.gov/fishadvisories). SCDES: children under 14 and
// pregnant/nursing women should NOT eat any fish from a water with an advisory.
// ---------------------------------------------------------------------------

const SALT_LICENSE = 'SC saltwater license required (16+).'
const PIER_LICENSE = 'Pier carries a blanket saltwater license; no individual license needed ON the pier (confirm at the counter).'

export const SPOTS = [
  // =============================== SALTWATER ===============================
  {
    key: 'cherry-grove-pier', name: 'Cherry Grove Pier', area: 'North Myrtle Beach', water: 'salt',
    lat: 33.8287, lon: -78.6327, tideStation: '8660266', miles: 82, driveMin: 108,
    access: 'Pier (985 ft)', cost: '$3 walk-on + $10/rod; $30 king pass (3 rods); rod rental $26',
    targets: ['red-drum', 'black-drum', 'flounder', 'whiting', 'croaker', 'bluefish', 'king-mackerel'],
    kids: 4, license: PIER_LICENSE,
    tip: 'SCDNR fall pier report: October excellent here for reds, flounder, black drum and whiting. Rebuilt after Ian, reopened March 2024. Open 6am–11pm.',
  },
  {
    key: 'apache-pier', name: 'Apache Pier', area: 'Myrtle Beach (Apache Campground)', water: 'salt',
    lat: 33.7614, lon: -78.7797, approx: true, tideStation: '8661070', miles: 75, driveMin: 98,
    access: 'Pier (1,206 ft, longest wooden pier on the East Coast)', cost: '2024 prices: $12 adult, $10 ages 6–10, under 6 free (verify)',
    targets: ['whiting', 'spot', 'croaker', 'bluefish', 'red-drum', 'king-mackerel'],
    kids: 4, license: PIER_LICENSE,
    tip: 'Long walk to the end: bring a pier cart. Kings off the end in Sept–Oct.',
  },
  {
    key: 'pier-14', name: 'Pier 14', area: 'Myrtle Beach Boardwalk', water: 'salt',
    lat: 33.6943, lon: -78.8748, tideStation: '8661070', miles: 68, driveMin: 94,
    access: 'Pier', cost: '~$7–10 (verify)', targets: ['whiting', 'croaker', 'bluefish'],
    kids: 3, license: PIER_LICENSE, tip: 'Busy boardwalk crowd; better on weekday mornings. Fishing hours unverified.',
  },
  {
    key: 'second-ave-pier', name: 'Second Avenue Pier', area: 'Myrtle Beach', water: 'salt',
    lat: 33.6833, lon: -78.8851, tideStation: '8661070', miles: 68, driveMin: 95,
    access: 'Pier (905 ft)', cost: '~$8–10 (verify)', targets: ['whiting', 'croaker', 'flounder'],
    kids: 4, license: PIER_LICENSE, tip: 'Next to Family Kingdom. Drop a mud minnow straight down along the pilings for flounder.',
  },
  {
    key: 'springmaid-pier', name: 'Springmaid Pier', area: 'Myrtle Beach (South)', water: 'salt',
    lat: 33.656, lon: -78.917, tideStation: '8661070', miles: 69, driveMin: 100,
    access: 'Pier (1,060 ft)', cost: '~$10–12 (official site down; verify)',
    targets: ['red-drum', 'bluefish', 'whiting', 'spanish-mackerel', 'king-mackerel'],
    kids: 4, license: PIER_LICENSE, tip: 'NOAA tide station sits on this pier, so tide times here are exact.',
  },
  {
    key: 'mb-state-park-pier', name: 'Myrtle Beach State Park Pier', area: 'Myrtle Beach', water: 'salt',
    lat: 33.6479, lon: -78.9278, tideStation: '8661070', miles: 71, driveMin: 104,
    access: 'Pier (750 ft)', cost: 'Park entry $8 adult / $4 ages 6–15 + pier pass $8 adult / $3 ages 6–15; under 6 free',
    targets: ['whiting', 'spot', 'croaker', 'red-drum', 'flounder'],
    kids: 5, license: 'Blanket pier license: NO saltwater license needed on this pier (SC State Parks).',
    tip: 'Best kid pier. Annual "Take a Kid Fishing" event (2026: Sat Oct 17, 6–11:30am, PRE-REGISTRATION required; most of the pier is closed to others that morning).',
  },
  {
    key: 'surfside-pier', name: 'Surfside Pier', area: 'Surfside Beach', water: 'salt',
    lat: 33.605, lon: -78.9718, tideStation: '8661437', miles: 72, driveMin: 103,
    access: 'Pier (830 ft), rebuilt, reopened March 2024', cost: '$14 adult, $2 per child (verify)',
    targets: ['bluefish', 'whiting', 'red-drum', 'spanish-mackerel'],
    kids: 5, license: PIER_LICENSE, tip: 'Check in at Perry\'s Bait & Tackle at the pier.',
  },
  {
    key: 'garden-city-pier', name: 'Garden City Pier', area: 'Garden City Beach', water: 'salt',
    lat: 33.5761, lon: -78.9974, tideStation: '8661437', miles: 74, driveMin: 107,
    access: 'Pier (~660 ft)', cost: '~$8–12 (verify)', targets: ['red-drum', 'flounder', 'black-drum'],
    kids: 4, license: PIER_LICENSE, tip: 'Listed for sale in Feb 2026. Call 843-651-9700 to confirm it\'s open before driving.',
  },
  {
    key: 'murrells-marshwalk', name: 'Murrells Inlet MarshWalk / Morse Park Landing', area: 'Murrells Inlet', water: 'salt',
    lat: 33.5579, lon: -79.0318, tideStation: '8661529', miles: 75, driveMin: 106,
    access: 'Docks + boardwalk', cost: 'Free (parking may cost)',
    targets: ['spotted-seatrout', 'red-drum', 'flounder', 'sheepshead'],
    kids: 5, license: `${SALT_LICENSE} No pier exemption here. Crabbing with ≤3 drop nets/handlines needs no license.`,
    tip: 'Fish the falling tide near creek mouths. Tide here runs ~1 hr behind the ocean piers (station: Parsonage Creek). Great crabbing for kids.',
  },
  {
    key: 'huntington-jetty', name: 'Huntington Beach SP: Murrells Inlet South Jetty', area: 'Murrells Inlet', water: 'salt',
    lat: 33.5132, lon: -79.0623, approx: true, tideStation: '8661437', miles: 79, driveMin: 114,
    access: 'Jetty + surf (~1 mile beach walk from the north lot)', cost: 'Park entry $8 adult / $4 ages 6–15',
    targets: ['red-drum', 'flounder', 'sheepshead', 'spotted-seatrout', 'black-drum'],
    kids: 2, license: SALT_LICENSE,
    tip: 'Rocks are slick: life jackets for little ones. Flounder: drag finger mullet on a Carolina rig parallel to the rocks. North End Road can close on very high tides.',
  },
  {
    key: 'pawleys-surf', name: 'Pawleys Island (surf & creek)', area: 'Pawleys Island', water: 'salt',
    lat: 33.4323, lon: -79.1182, tideStation: '8662006', miles: 85, driveMin: 119,
    access: 'Surf + creek (PIER CLOSED: rebuild ~14–18 months from ~Sept 2026)', cost: 'Free; very limited parking',
    targets: ['whiting', 'pompano', 'red-drum', 'spotted-seatrout', 'flounder'],
    kids: 4, license: SALT_LICENSE, tip: 'South-end inlet and creek for trout/flounder; surf troughs for whiting and pompano on sand fleas.',
  },
  {
    key: 'georgetown-east-bay', name: 'Georgetown: East Bay Park / Winyah Bay', area: 'Georgetown', water: 'salt',
    lat: 33.3574, lon: -79.2785, tideStation: '8662926', miles: 72, driveMin: 111,
    access: '2 boat ramps + floating docks', cost: 'Free',
    targets: ['red-drum', 'spotted-seatrout', 'flounder', 'black-drum', 'striped-bass'],
    kids: 4, license: SALT_LICENSE, tip: 'Playground on site. Launch point for Winyah Bay jetties and creeks if you rent a skiff.',
  },
  {
    key: 'garris-landing', name: 'Garris Landing (Cape Romain NWR)', area: 'Awendaw', water: 'salt',
    lat: 32.9378, lon: -79.6548, tideStation: '8664442', miles: 111, driveMin: 164, edge: true,
    access: '1,000-ft fishing pier on the ICW + ramp', cost: 'Free',
    targets: ['red-drum', 'spotted-seatrout', 'flounder', 'sheepshead'],
    kids: 3, license: SALT_LICENSE, tip: 'Remote, no services. Call the refuge first (843-928-3264): the ramp has closed for dredging before. Edge of the 2-hour range.',
  },
  {
    key: 'mt-pleasant-pier', name: 'Mount Pleasant Pier', area: 'Mount Pleasant (Charleston)', water: 'salt',
    lat: 32.8024, lon: -79.908, tideStation: '8665530', miles: 136, driveMin: 157, edge: true,
    access: 'Harbor pier under the Ravenel Bridge', cost: '$7 adult / $4 ages 12 & under; free limited parking',
    targets: ['red-drum', 'spotted-seatrout', 'flounder', 'sheepshead'],
    kids: 5, license: 'Ask at the pier whether it carries a blanket license (unverified).', tip: 'Edge of range (~2 hrs+). Great family day with Memorial Waterfront Park.',
  },
  {
    key: 'folly-pier', name: 'Folly Beach Pier', area: 'Folly Beach', water: 'salt',
    lat: 32.655, lon: -79.9396, tideStation: 'TEC3127', miles: 144, driveMin: 174, edge: true,
    access: 'Ocean pier (~1,049 ft)', cost: '$7 adult / $4 ages 12 & under; parking $15–25 in season',
    targets: ['red-drum', 'whiting', 'bluefish', 'pompano', 'king-mackerel'],
    kids: 4, license: 'Ask at the pier whether it carries a blanket license (unverified).', tip: 'Over 2 hours. Save it for a Charleston weekend.',
  },

  // =============================== FRESHWATER ==============================
  {
    key: 'pee-dee-us76', name: 'Great Pee Dee River: US 76/301 Bridge Landing', area: 'East of Florence', water: 'fresh',
    lat: 34.205, lon: -79.63, approx: true, miles: 8, driveMin: 15, waters: ['pee-dee-upper', 'pee-dee-rivers'],
    access: 'Limited bank near landing; ramp (paved, unverified)', cost: 'Free',
    targets: ['blue-catfish', 'flathead-catfish', 'channel-catfish', 'bluegill', 'largemouth-bass', 'bowfin', 'striped-bass'],
    kids: 2,
    advisory: 'Great Pee Dee (check which segment): NC line→I-95 (PCB+mercury) blue cat 1/month; bowfin, largemouth, redear 1/week. I-95→Winyah Bay: bowfin & largemouth 1/month, redear 1/week. Kids under 14: don\'t eat.',
    tip: 'This bridge is the blue catfish line: 25/day upstream, 150/day downstream. The app applies the stricter rule. Strong current; not for little kids.',
  },
  {
    key: 'lynches-river-cp', name: 'Lynches River County Park', area: 'Coward', water: 'fresh',
    lat: 34.0393, lon: -79.7906, miles: 14, driveMin: 27, waters: ['pee-dee-rivers'],
    access: 'River bank; ADA paddle launch; canoe/kayak rentals', cost: 'Free',
    targets: ['redbreast', 'bluegill', 'channel-catfish', 'bowfin'],
    kids: 5,
    advisory: 'Lynches (US 15→Pee Dee): DO NOT EAT bowfin or channel catfish; pickerel & largemouth 1/month; redear 1/week; bluegill & redbreast OK. Kids under 14: don\'t eat.',
    tip: 'Closest family spot. Nature center + canopy walk. Park open 9am–sunset; nature center Tue–Sat.',
  },
  {
    key: 'prestwood-lake', name: 'Prestwood Lake (Lawton Park)', area: 'Hartsville', water: 'fresh',
    lat: 34.3825, lon: -80.0792, miles: 24, driveMin: 37,
    access: 'Shoreline at Lawton Park; kayak dock (unverified); 1-lane ramp at Sonovista Park', cost: 'Free',
    targets: ['largemouth-bass', 'bluegill', 'redear'], kids: 5,
    advisory: 'Largemouth 1 meal/week (SCDES). Kids under 14: don\'t eat.',
    tip: 'Playground + easy bank access. Bobber + worm for bream right off the Lawton Park shoreline.',
  },
  {
    key: 'lake-robinson', name: 'Lake Robinson', area: 'Hartsville (Darlington Co.)', water: 'fresh',
    lat: 34.44, lon: -80.16, approx: true, miles: 33, driveMin: 54,
    access: 'Public ramp; fishing pier near the plant (current status unverified)', cost: 'Free',
    targets: ['largemouth-bass', 'bluegill', 'channel-catfish'], kids: 3,
    advisory: 'DO NOT EAT bowfin; largemouth 1/month; bluegill, pickerel, warmouth 1/week. Kids under 14: don\'t eat.',
    tip: 'Not the Greenville "Lake Robinson": its 12″ bass rule does NOT apply here. Statewide bass rules.',
  },
  {
    key: 'lee-state-park', name: 'Lee State Park', area: 'Bishopville', water: 'fresh',
    lat: 34.2117, lon: -80.1989, miles: 28, driveMin: 44, waters: ['pee-dee-rivers'],
    access: 'Artesian Lake banks + Lynches River banks; ramp 4 mi north at US 15', cost: 'Park entry (see SC Parks)',
    targets: ['channel-catfish', 'redbreast', 'bluegill'], kids: 5,
    advisory: 'Lynches River (US 15→Pee Dee): DO NOT EAT bowfin or channel catfish. Artesian Lake not separately listed. Kids under 14: don\'t eat river fish.',
    tip: 'Park LENDS rods (tackle loaner). Worms on Artesian Lake = easy stocked catfish for kids.',
  },
  {
    key: 'lake-ashwood', name: 'Lake Ashwood (SCDNR)', area: 'Lee County', water: 'fresh',
    lat: 34.1119, lon: -80.3306, approx: true, miles: 39, driveMin: 54, waters: ['ashwood'],
    access: 'Fishing pier (ADA); ramp, 10 hp max', cost: 'Free',
    targets: ['channel-catfish', 'largemouth-bass', 'bluegill', 'redear'], kids: 5,
    advisory: 'Largemouth 1 meal/week. Kids under 14: don\'t eat.',
    tip: 'CLOSED TUESDAYS, daylight only. Special state-lake limits (sources conflict; the app uses the stricter: 3 bass, 3 catfish, 15 bream). Follow posted signs.',
  },
  {
    key: 'little-pee-dee-sp', name: 'Little Pee Dee State Park', area: 'Dillon', water: 'fresh',
    lat: 34.3251, lon: -79.2818, miles: 40, driveMin: 53,
    access: '75-ft dock on 54-acre Lake Norton; ramp (electric only)', cost: 'Park entry; jon boat rental',
    targets: ['largemouth-bass', 'bluegill', 'channel-catfish'], kids: 5,
    advisory: 'Park lake not listed. The Little Pee Dee RIVER: DO NOT EAT blue/flathead cat, bowfin, pickerel, largemouth; others 1/week.',
    tip: 'Playground; rent a jon boat for the bream beds along the lake edges.',
  },
  {
    key: 'cheraw-sp', name: 'Cheraw State Park (Lake Juniper)', area: 'Cheraw', water: 'fresh',
    lat: 34.625, lon: -79.9169, miles: 39, driveMin: 56,
    access: 'Banks; BOARDWALK CLOSED (tree damage); ramp 10 hp max', cost: 'Canoe/kayak/jon boat $15/hr',
    targets: ['largemouth-bass', 'bluegill', 'channel-catfish'], kids: 4,
    advisory: 'Lake Juniper not in the SCDES table.',
    tip: 'Jon boats seat 4 MAX, so a family of 6 needs two boats. Adult required in canoes/kayaks. Tackle loaner available.',
  },
  {
    key: 'sandhills-nwr', name: 'Carolina Sandhills NWR', area: 'McBee', water: 'fresh',
    lat: 34.5791, lon: -80.211, miles: 46, driveMin: 77,
    access: 'Bank fishing on open lakes; electric-only ramps on larger lakes', cost: 'Free',
    targets: ['largemouth-bass', 'bluegill', 'channel-catfish'], kids: 5,
    tip: 'OXPEN LAKE IS YOUTH-ADULT ONLY: a kid under 16 must be fishing (up to 2 adults). Martins Lake closes Nov 1. Check USFWS rules.',
  },
  {
    key: 'black-river-sp', name: 'Black River State Park (The Meadows)', area: 'Salters', water: 'fresh',
    lat: 33.59, lon: -79.85, approx: true, miles: 47, driveMin: 74, waters: ['pee-dee-rivers'],
    access: 'Riverbank (unverified); kayak/canoe launch', cost: '$3 adult / $1 ages 6–15',
    targets: ['largemouth-bass', 'bluegill', 'redbreast', 'channel-catfish', 'bowfin'], kids: 3,
    advisory: 'Black River: DO NOT EAT largemouth; bowfin & pickerel 1/month; crappie, blue cat, bream, warmouth 1/week. Kids under 14: don\'t eat.',
    tip: 'New park, soft opening: Tue/Thu/Sat 8am–5pm only.',
  },
  {
    key: 'santee-sp', name: 'Santee State Park (Lake Marion)', area: 'Santee', water: 'fresh',
    lat: 33.5214, lon: -80.4911, miles: 72, driveMin: 89, waters: ['santee-cooper'],
    access: 'ADA fishing pier next to the park store; 2 ramps', cost: 'Park entry',
    targets: ['crappie', 'largemouth-bass', 'striped-bass', 'bluegill', 'blue-catfish', 'white-perch'], kids: 5,
    advisory: 'Lake Marion: bowfin & largemouth 1/week; others unrestricted.',
    tip: 'October crappie on minnows near brush from the pier. Santee Cooper striper season opens Oct 1. 3 playgrounds.',
  },
  {
    key: 'santee-nwr', name: 'Santee NWR (Lake Marion)', area: 'Summerton', water: 'fresh',
    lat: 33.51, lon: -80.2585, miles: 68, driveMin: 141, waters: ['santee-cooper'],
    access: 'Ponds and impoundments; lake access', cost: 'Free signed refuge permit required',
    targets: ['largemouth-bass', 'bluegill', 'crappie'], kids: 3,
    advisory: 'Lake Marion: bowfin & largemouth 1/week.',
    tip: 'Cantey Bay + refuge ponds CLOSED Nov 1–Feb 28. Go in October or wait for March.',
  },
  {
    key: 'lake-moultrie-pier', name: 'Lake Moultrie: Fred L. Day Pier', area: 'Cross', water: 'fresh',
    lat: 33.3274, lon: -80.1484, approx: true, miles: 76, driveMin: 122, waters: ['santee-cooper'],
    access: 'Fishing pier (SCDNR bank-fishing list); ramp', cost: 'Free',
    targets: ['blue-catfish', 'channel-catfish', 'crappie', 'bluegill'], kids: 3,
    advisory: 'Lake Moultrie: bowfin 1/week; others unrestricted.',
    tip: 'Cut shad on the bottom for fall catfish. No restrooms (unverified).',
  },
  {
    key: 'lake-wateree-sp', name: 'Lake Wateree State Park', area: 'Winnsboro', water: 'fresh',
    lat: 34.4327, lon: -80.8614, miles: 76, driveMin: 126, waters: ['wateree'], edge: true,
    access: 'Park banks; 2-lane ramp; kayaks $40/half day', cost: 'Park entry',
    targets: ['striped-bass', 'crappie', 'largemouth-bass', 'channel-catfish'], kids: 4,
    advisory: 'PCB advisory: catfish, largemouth, striper, white bass 1/month; crappie 1/week. Kids under 14: don\'t eat.',
    tip: 'Park store sells tackle and licenses.',
  },
  {
    key: 'lake-murray-dam', name: 'Lake Murray: Saluda Dam North Rec Area pier', area: 'Lexington/Irmo', water: 'fresh',
    lat: 34.051, lon: -81.216, approx: true, miles: 92, driveMin: 111, waters: ['murray'],
    access: 'Fishing pier at the dam', cost: 'Free',
    targets: ['striped-bass', 'largemouth-bass', 'crappie', 'channel-catfish'], kids: 4,
    advisory: 'Lake Murray not in the SCDES table.',
    tip: 'Lake Murray striper rule: 21″ min Oct 1–May 31, 5/day.',
  },
  {
    key: 'poinsett-sp', name: 'Poinsett State Park', area: 'Wedgefield', water: 'fresh',
    lat: 33.805, lon: -80.5391, miles: 64, driveMin: 98,
    access: '10-acre lake; jon boats $10/hr', cost: 'Park entry',
    targets: ['bluegill', 'largemouth-bass', 'channel-catfish'], kids: 4,
    tip: 'Small, quiet lake. Good backup when the coast is blown out.',
  },
]

export const SPOT_CLOSED = [
  { name: 'Lake Wallace (Bennettsville)', why: 'Dam breached May & July 2024; lake drained. $25M allocated, rebuild expected to start 2027.' },
  { name: 'Dargan\'s Pond (SCDNR, Darlington Co.)', why: 'Closed.' },
  { name: 'Pawleys Island Pier', why: 'Destroyed by Hurricane Ian (2022). Rebuild ~14–18 months from ~Sept 2026.' },
]

export function directionsUrl(spot) {
  const q = spot.builtIn === false || spot.custom
    ? `${spot.lat},${spot.lon}`
    : `${spot.name}, ${spot.area}, SC`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function fmtDrive(spot) {
  if (!spot.driveMin) return ''
  const h = Math.floor(spot.driveMin / 60)
  const m = spot.driveMin % 60
  return `${spot.miles} mi · ~${h ? `${h}h ` : ''}${String(m).padStart(h ? 2 : 1, '0')}m`
}
