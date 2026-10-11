// ---------------------------------------------------------------------------
// WATER TEMPERATURE SOURCES + NORMALS
//
// Live readings come from public sensors (no key, browser-friendly):
//   • NOAA CO-OPS tide stations with a water-temp sensor (6-minute data)
//   • USGS stream/lake gauges (parameter 00010, 15-minute data)
// Normals = average water temp for each month, 2021–2025, computed from
// those same sensors' history (NOAA hourly, USGS daily means), baked in so
// they work offline. Computed 10/11/2026.
//
// Most Pee Dee-area lakes and rivers have NO sensor. Those spots use the
// nearest similar water as a regional guide ("proxy"); the app says so.
// Small ponds warm and cool faster than big lakes or rivers, so bring a
// thermometer and log the real number on the trip.
// ---------------------------------------------------------------------------

export const WT_COMPUTED = '2026-10-11'

//                    Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
export const WT_SOURCES = {
  'coops:8661070': {
    name: 'Springmaid Pier sensor (NOAA)', short: 'Springmaid Pier', kind: 'coops', id: '8661070',
    lat: 33.655, lon: -78.9183, water: 'Atlantic, Grand Strand',
    normals: [50.1, 51.9, 59.3, 67.0, 73.6, 79.2, 84.1, 83.7, 79.5, 71.9, 63.8, 54.4], years: '2021–2025',
  },
  'coops:8665530': {
    name: 'Charleston Harbor sensor (NOAA)', short: 'Charleston Harbor', kind: 'coops', id: '8665530',
    lat: 32.7808, lon: -79.9236, water: 'Charleston Harbor',
    normals: [53.5, 53.7, 60.8, 68.4, 76.0, 81.8, 85.6, 84.5, 80.9, 72.7, 64.5, 56.8], years: '2021–2025',
  },
  'usgs:02136371': {
    name: 'Sampit River at US 17, Georgetown (USGS)', short: 'Sampit River gauge', kind: 'usgs', id: '02136371',
    lat: 33.3599, lon: -79.288, water: 'Sampit River / Winyah Bay',
    normals: [44.5, 53.1, 60.0, 71.1, 76.7, 82.2, 86.6, 82.8, 78.7, 69.9, 61.2, 52.3], years: '~1 year of data',
  },
  'usgs:021720709': {
    name: 'Cooper River at US 17, Charleston (USGS)', short: 'Cooper River gauge', kind: 'usgs', id: '021720709',
    lat: 32.8024, lon: -79.9101, water: 'Cooper River / Charleston Harbor',
    normals: [53.3, 54.3, 61.3, 68.4, 75.6, 81.2, 85.2, 84.6, 80.9, 72.7, 64.3, 56.9], years: '2021–2025',
  },
  'usgs:02171000': {
    name: 'Lake Marion near Pineville (USGS)', short: 'Lake Marion gauge', kind: 'usgs', id: '02171000',
    lat: 33.4495, lon: -80.1644, water: 'Lake Marion',
    normals: [49.6, 51.8, 59.5, 67.1, 74.4, 81.0, 85.6, 84.1, 79.9, 71.1, 62.2, 54.1], years: '2021–2025',
  },
  'usgs:02168500': {
    name: 'Lake Murray near Columbia (USGS, surface)', short: 'Lake Murray gauge', kind: 'usgs', id: '02168500',
    lat: 34.0521, lon: -81.2207, water: 'Lake Murray',
    normals: [53.2, 51.4, 56.0, 63.0, 70.4, 77.9, 83.6, 83.7, 80.1, 72.1, 64.5, 58.2], years: '2021–2024',
    liveNote: 'Surface sensor has reported nothing since Feb 2024: normals only.',
  },
  'usgs:02172002': {
    name: 'Lake Moultrie tailrace canal, Moncks Corner (USGS)', short: 'Moultrie tailrace gauge', kind: 'usgs', id: '02172002',
    lat: 33.2149, lon: -79.975, water: 'Lake Moultrie outflow',
    normals: [50.1, 51.3, 58.5, 65.6, 73.1, 79.3, 84.0, 83.6, 79.5, 71.2, 62.3, 54.4], years: '2021–2025',
  },
  'usgs:02147801': {
    name: 'Lake Wateree tailrace above Camden (USGS)', short: 'Wateree tailrace gauge', kind: 'usgs', id: '02147801',
    lat: 34.3321, lon: -80.6984, water: 'Lake Wateree outflow',
    // sensor runs Apr–Nov only; winter months fall back to Lake Marion
    normals: [null, null, null, 64.4, 71.5, 78.3, 84.0, 84.0, 81.1, 71.7, 62.6, null], years: '2021–2025 (Apr–Nov)',
  },
  'usgs:02135000': {
    name: 'Little Pee Dee River at Galivants Ferry (USGS)', short: 'Little Pee Dee gauge', kind: 'usgs', id: '02135000',
    lat: 34.0568, lon: -79.2477, water: 'Little Pee Dee River (blackwater)',
    normals: [46.8, 52.2, 60.6, 67.0, 74.4, 80.9, 83.4, 81.0, 77.2, 67.3, 58.4, 49.9], years: '2021–2025',
  },
}

/** Used for months a source has no history (e.g. the Wateree sensor's winter gap). */
export const WT_FALLBACK = 'usgs:02171000'

/**
 * Spot → sensor. relation:
 *   'at'    sensor is at/next to the spot (same water)
 *   'same'  same body of water, a few miles away
 *   'proxy' different water nearby: a regional guide only
 */
export const SPOT_WT = {
  // --- salt ---
  'cherry-grove-pier': { src: 'coops:8661070', relation: 'same' },
  'apache-pier': { src: 'coops:8661070', relation: 'same' },
  'pier-14': { src: 'coops:8661070', relation: 'same' },
  'second-ave-pier': { src: 'coops:8661070', relation: 'same' },
  'springmaid-pier': { src: 'coops:8661070', relation: 'at' },
  'mb-state-park-pier': { src: 'coops:8661070', relation: 'at' },
  'surfside-pier': { src: 'coops:8661070', relation: 'same' },
  'garden-city-pier': { src: 'coops:8661070', relation: 'same' },
  'huntington-jetty': { src: 'coops:8661070', relation: 'same' },
  'pawleys-surf': { src: 'coops:8661070', relation: 'same' },
  'murrells-marshwalk': { src: 'coops:8661070', relation: 'proxy', note: 'Marsh creeks warm faster on sunny afternoons and chill faster on cold nights than the ocean.' },
  'georgetown-east-bay': { src: 'usgs:02136371', relation: 'at' },
  'garris-landing': { src: 'coops:8665530', relation: 'proxy' },
  'mt-pleasant-pier': { src: 'usgs:021720709', relation: 'at' },
  'folly-pier': { src: 'coops:8665530', relation: 'same' },
  // --- fresh ---
  'pee-dee-us76': { src: 'usgs:02135000', relation: 'proxy', note: 'Great Pee Dee has no temp sensor; the Little Pee Dee is the closest similar river.' },
  'lynches-river-cp': { src: 'usgs:02135000', relation: 'proxy' },
  'black-river-sp': { src: 'usgs:02135000', relation: 'proxy' },
  'lee-state-park': { src: 'usgs:02135000', relation: 'proxy' },
  'prestwood-lake': { src: 'usgs:02171000', relation: 'proxy', note: 'Small lakes warm and cool faster than Lake Marion.' },
  'lake-ashwood': { src: 'usgs:02171000', relation: 'proxy', note: 'Small lakes warm and cool faster than Lake Marion.' },
  'little-pee-dee-sp': { src: 'usgs:02171000', relation: 'proxy', note: 'Small lakes warm and cool faster than Lake Marion.' },
  'cheraw-sp': { src: 'usgs:02171000', relation: 'proxy', note: 'Small lakes warm and cool faster than Lake Marion.' },
  'sandhills-nwr': { src: 'usgs:02171000', relation: 'proxy', note: 'Small ponds warm and cool faster than Lake Marion.' },
  'poinsett-sp': { src: 'usgs:02171000', relation: 'proxy', note: 'Small lakes warm and cool faster than Lake Marion.' },
  'lake-robinson': { src: 'usgs:02171000', relation: 'proxy', note: 'The power plant\'s warm-water discharge heats the upper lake, so expect it WARMER than this, especially in winter.' },
  'santee-sp': { src: 'usgs:02171000', relation: 'same' },
  'santee-nwr': { src: 'usgs:02171000', relation: 'same' },
  'lake-moultrie-pier': { src: 'usgs:02172002', relation: 'same' },
  'lake-wateree-sp': { src: 'usgs:02147801', relation: 'same' },
  'lake-murray-dam': { src: 'usgs:02168500', relation: 'at' },
}

export const RELATION_LABEL = {
  at: 'sensor at this spot',
  same: 'same water',
  proxy: 'nearest sensor: different water, use as a guide',
}
