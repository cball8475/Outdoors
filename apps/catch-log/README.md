# Catch Log

Offline-first family fishing tracker. It's a web app you install to your phone's home screen (a PWA). After the first load it runs with **zero signal**.

| Feature | How it works |
|---|---|
| **Explore (kid mode)** | **📍 Pick a place** → best fish there *this month* (ranked for kids), bait, lure and the rig for the rod you pick (kids' Ugly Stik / fresh / salt), a big "best time to go" card + the 7-day strip, and everything researched about the spot (where to stand, hours, cost, restrooms, bait shop, kid notes, rules, tips from online reports, website, phone). **🐟 Pick a fish** (or type one: "bream", "trout") → where to catch it, ranked by kid-friendliness, drive time or distance from you → same spot page. |
| **Water temp** | Live reading from the nearest NOAA pier sensor or USGS gauge whenever you have signal (check it **from home** before a trip), the normal for any date (2021–2025 averages, offline), how far off normal the water is running, and which fish are in their prime temperature range. Proxy sensors are labeled when a lake/river has none. |
| **Trip game plan** | Pick what you're fishing for (at trip start or anytime) → for each fish: what to look for from shore, bait, lures, the rig for your rod, water-temp fit, and limits. "Pick today's best bets" does it in one tap. |
| **Trips** | Pick a spot, tick who's fishing (you're the default), go. Live party tally + per-angler counts. |
| **Catches** | Photo (camera or gallery), **GPS + date/time captured automatically**, species, length, weight (lb/oz), released vs kept, bait, notes. |
| **Trip totals** | Total caught for the whole party, released/kept, leaderboard with each angler's biggest fish, species breakdown, one-tap text summary to share. |
| **SC limit checker** | Warns *before* you keep an undersize, over-slot, closed-season or over-limit fish (incl. the July 2026 red drum rules and Santee Cooper striper slot). |
| **Best time to go (kid-obvious)** | One big card on the **Trip home screen**, the **top of Times**, and **every spot page**: "Best time to go today: 6:15–7:45 AM 🐟🐟🐟 Great" + the reasons in kid words ("Sun coming up", "Tide coming in fast"). Shows 🎯 RIGHT NOW when you're in a window and rolls to tomorrow once today's are over. Under it, **📅 This week**: 7 day tiles, the best day outlined, and one sentence on why (e.g. "Tides get SMALLER each day this week, so the current is strongest early in the week"). |
| **🎯 Where do I cast?** | Trip tab (during a trip and before), every spot page, Guide tab. **GPS** finds the spot you're standing at (no signal needed) or the nearest one, plus a satellite-view link and where people fish there. Kids **tap what they see** (18 choices: birds diving, a darker trough, a gap in the waves, pier legs, creek mouths, fallen trees, lily pads, shade, points, drop-offs…), optionally pointing at each on a **photo** of the water. The app ranks them for the tide, light and water temp right now and the trip's target fish, then gives each one: why fish are there, where to cast, how deep (top / middle / bottom), what you might catch, the setup + a bait or lure that matches it, handling warnings (teeth, spines), and step-by-step how to fish it. Plus **🐟 Fish on! How to reel it in** and **📏 How deep is it?** (count-down and reel-turn methods). The app doesn't analyze the photo itself; see "Photo AI" below. |
| **🧠 Time School** | "How did we pick this?" on the card → 3 short lessons on the spot's real data (sunrise/sunset, a tide chart with the fast water in green, water temp + which fish love it), then a 5-question "which time would you pick?" quiz built from today's actual scores. |
| **Best times (details)** | **NOAA tides** (salt spots) + dawn/dusk light → top fishing windows with reasons, tide size vs average (the moon's real effect), sun times, a 24-hr timeline. No solunar periods: the evidence doesn't support them. |
| **Guide** | 28 local species: ID marks, look-alikes, SC limits, fall pattern, bait, lures, and a rig for each of your rods (salt rod, fresh rod, kids' Ugly Stiks). |
| **ID helper** | Tap what you see (tail spot, chin whiskers, flat body…) → ranked matches. Fully offline. |
| **Stats & Insights** | Personal bests per angler per species; **catch-per-hour by tide stage and light** from your own trips. |
| **Backup** | Export everything (with photos) to one file; CSV export for spreadsheets; restore. |

## Photo AI (not built: needs a decision)

"Point the camera at the water and the app tells you where to cast" would need an online vision model (e.g. the Claude API)
behind a small server function. That function holds the API key so it never ships in this public code. It only works with signal,
costs a few cents per photo, and needs a passcode so strangers can't run up the bill. The 🎯 screen is built so an AI answer
would just fill in the same "what do you see" choices; everything downstream stays the same.

## Privacy (this repo is public)

The **code** is public. **Your data is not.** Names, catches, photos, GPS and your own spots live only in the phone's browser storage
(IndexedDB). Nothing is uploaded anywhere. No account, no server.

The flip side: **if you clear Chrome's site data or lose the phone, the log is gone.** Settings → *Export backup* once a month
and drop the file in Drive/Dropbox.

## Why not build our own photo fish-identifier?

Not worth it. A reliable photo-ID model needs tens of thousands of labeled photos per species and ongoing tuning. That's a research
project, not a weekend build. Use these instead:

- **Seek by iNaturalist** (free): the ID model runs on the phone, so it can work without signal. Test it on a few local fish
  before relying on it; fish accuracy depends on how many fish photos iNaturalist has.
- **This app's ID helper**: works offline and covers the 28 species you'll actually catch around Florence and the Grand Strand.

## Install on your phone (Android / Chrome)

1. Open **https://catch-log-sc.netlify.app** in Chrome.
2. Chrome menu ⋮ → **Add to Home screen** → Install.
3. Open it once **with signal** at home: it caches itself and downloads a year of tides for every saltwater spot.
4. From then on it works on the pier with no bars. Allow **Location** and **Camera** when asked.

## Develop

```bash
cd apps/catch-log
npm install
npm run dev        # local dev server (phone on same Wi-Fi: use the "Network" URL)
npm test           # unit tests: sun times, tides, best-window scoring, kid ratings + quiz, cast coach, SC limit checker, data integrity
npm run build      # production build → dist/
npm run docs       # regenerate ../../fishing/*.md from src/data (single source of truth)
```

## Deploy (static hosting, HTTPS required for GPS/camera)

**Live:** https://catch-log-sc.netlify.app (Netlify project `catch-log-sc`, built from `netlify.toml` at the repo root).
To ship an update: ask Claude to redeploy with the Netlify MCP `deploy-site` operation, or run `npx netlify deploy --prod`
from the repo root. Phones pick up the new version the next time the app is opened with signal.

Other hosts work too:

`dist/` is plain static files:

- **Netlify:** drag-and-drop `dist/` at app.netlify.com/drop, or `npx netlify deploy --prod --dir=dist`
- **Cloudflare Pages:** `npx wrangler pages deploy dist --project-name catch-log`
- **GitHub Pages:** publish `dist/` from a Pages workflow

## Where things live

```
src/
  data/       clues.js (what you can see from shore, how to fish + reel, depth tips, handle-with-care)
              species.js (ID, regs, baits, rigs, season, kid ease, water temp range, shore cues) · spots.js · spotInfo.js
              watertemp.js (sensors, 2021–2025 normals, spot → sensor)
              rods.js · science.js  ← edit these
  lib/        sun.js · tides.js (NOAA cache + tide range) · windows.js (scoring) · regs.js (limit checker) · explore.js (rankings) · watertemp(-core).js (live + normals)
              kidtimes.js (1–3 fish rating, kid reasons, best day of week, quiz)
              castcoach.js (GPS → spot, rank what you see, matching bait/lure, depth advice)
              capture.js (photo + GPS) · conditions.js (per-catch snapshot + effort) · backup.js · db.js
  components/ kid.jsx (BestTimeHero card + WeekStrip) · fishing.jsx (fish cards, rod picker, water temp card)
  screens/    Home (live trip) · Explore (place→fish, fish→places, spot guide) · StartTrip · CatchForm · TripDetail
              Times · Learn (Time School) · Cast (Where do I cast?) · Spots (add your own) · Guide · Stats · Settings
scripts/gen-docs.mjs   writes fishing/*.md from src/data
```

## Updating regulations

1. Edit the species' `regs` block in `src/data/species.js` (source + date in the comment).
2. `npm test` (the checker has tests for the tricky rules).
3. `npm run docs` and commit both the data and the regenerated markdown.

## Ideas for v2

- Sync between family phones with Cloudflare D1 + R2.
- Live water temp from USGS gauges and wind/pressure from NWS when online.
- Map view of catches (needs online map tiles).
