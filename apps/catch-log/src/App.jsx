// ---------------------------------------------------------------------------
// App shell: first-run setup gate, background housekeeping, and the screen
// switch for the hash router (see components/ui.jsx).
// ---------------------------------------------------------------------------
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, requestPersistentStorage } from './lib/db.js'
import { syncBuiltInSpots, allTideStations } from './lib/seed.js'
import { refreshStations } from './lib/tides.js'
import { useRoute, TabBar } from './components/ui.jsx'
import Setup from './screens/Setup.jsx'
import Home from './screens/Home.jsx'
import StartTrip from './screens/StartTrip.jsx'
import CatchForm from './screens/CatchForm.jsx'
import TripDetail from './screens/TripDetail.jsx'
import Times from './screens/Times.jsx'
import { AddSpot } from './screens/Spots.jsx'
import { Explore, SpotGuide, FishPlaces } from './screens/Explore.jsx'
import { Guide, SpeciesDetail } from './screens/Guide.jsx'
import Stats from './screens/Stats.jsx'
import Settings from './screens/Settings.jsx'
import Learn from './screens/Learn.jsx'

export default function App() {
  const route = useRoute()
  const anglerCount = useLiveQuery(() => db.anglers.count(), [])

  useEffect(() => {
    // 1) keep built-in spots current  2) ask Chrome not to evict our data
    // 3) quietly top up tide predictions whenever we have signal
    ;(async () => {
      await syncBuiltInSpots()
      await requestPersistentStorage()
      refreshStations(await allTideStations()).catch(() => {})
    })()
    const onOnline = async () => refreshStations(await allTideStations()).catch(() => {})
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  if (anglerCount === undefined) return null // loading
  if (anglerCount === 0) return <Setup />

  const [a, b] = route.parts
  const q = route.query
  let screen
  let tab = null
  switch (a) {
    case undefined:
      screen = <Home />
      tab = '/'
      break
    case 'start':
      screen = <StartTrip spotId={q.spot ? Number(q.spot) : null} />
      break
    case 'log':
      screen = <CatchForm tripId={Number(b)} />
      break
    case 'catch':
      screen = <CatchForm catchId={Number(b)} />
      break
    case 'trip':
      screen = <TripDetail tripId={Number(b)} />
      break
    case 'times':
      screen = <Times spotId={q.spot ? Number(q.spot) : null} date={q.date} />
      tab = '/times'
      break
    case 'explore':
    case 'spots': // old link
      screen = <Explore mode={q.mode || 'place'} />
      tab = '/explore'
      break
    case 'spot':
      screen = <SpotGuide spotId={Number(b)} />
      tab = '/explore'
      break
    case 'fish':
      screen = <FishPlaces id={b} />
      tab = '/explore'
      break
    case 'spot-new':
      screen = <AddSpot />
      break
    case 'guide':
      screen = <Guide tab={q.tab || 'species'} water={q.water} />
      tab = '/guide'
      break
    case 'species':
      screen = <SpeciesDetail id={b} />
      tab = '/guide'
      break
    case 'stats':
      screen = <Stats />
      tab = '/stats'
      break
    case 'settings':
      screen = <Settings />
      break
    case 'learn':
      screen = <Learn spotId={q.spot ? Number(q.spot) : null} />
      tab = '/times'
      break
    default:
      screen = <Home />
      tab = '/'
  }

  return (
    <div className="app">
      {screen}
      <TabBar active={tab} />
    </div>
  )
}
