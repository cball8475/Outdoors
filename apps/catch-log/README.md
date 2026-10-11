# Catch Log

Offline-first family fishing tracker. It's a web app you install to your phone's home screen (a PWA). After the first load it runs with **zero signal**.

| Feature | How it works |
|---|---|
| **Explore (kid mode)** | **📍 Pick a place** → best fish there *this month* (ranked for kids), bait, lure and the rig for the rod you pick (kids' Ugly Stik / fresh / salt), today's best times + next 2 days, and everything researched about the spot (where to stand, hours, cost, restrooms, bait shop, kid notes, rules, tips from online reports, website, phone). **🐟 Pick a fish** (or type one: "bream", "trout") → where to catch it, ranked by kid-friendliness, drive time or distance from you → same spot page. |
| **Trips** | Pick a spot, tick who's fishing (you're the default), go. Live party tally + per-angler counts. |
| **Catches** | Photo (camera or gallery), **GPS + date/time captured automatically**, species, length, weight (lb/oz), released vs kept, bait, notes. |
| **Trip totals** | Total caught for the whole party, released/kept, leaderboard with each angler's biggest fish, species breakdown, one-tap text summary to share. |
| **SC limit checker** | Warns *before* you keep an undersize, over-slot, closed-season or over-limit fish (incl. the July 2026 red drum rules and Santee Cooper striper slot). |
| **Best times** | **NOAA tides** (salt spots) + dawn/dusk light → top fishing windows with reasons, tide size vs average (the moon's real effect), sun times, a 24-hr timeline, and a 7-day planner. No solunar periods: the evidence doesn't support them. |
| **Guide** | 28 local species: ID marks, look-alikes, SC limits, fall pattern, bait, lures, and a rig for each of your rods (salt rod, fresh rod, kids' Ugly Stiks). |
| **ID helper** | Tap what you see (tail spot, chin whiskers, flat body…) → ranked matches. Fully offline. |
| **Stats & Insights** | Personal bests per angler per species; **catch-per-hour by tide stage and light** from your own trips. |
| **Backup** | Export everything (with photos) to one file; CSV export for spreadsheets; restore. |

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
npm test           # unit tests: sun times, tides, best-window scoring, SC limit checker, data integrity
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
  data/       species.js (ID, regs, baits, rigs, season by month, kid ease) · spots.js · spotInfo.js (online research)
              rods.js · science.js  ← edit these
  lib/        sunmoon.js · tides.js (NOAA cache + tide range) · windows.js (scoring) · regs.js (limit checker) · explore.js (rankings)
              capture.js (photo + GPS) · conditions.js (per-catch snapshot + effort) · backup.js · db.js
  screens/    Home (live trip) · Explore (place→fish, fish→places, spot guide) · StartTrip · CatchForm · TripDetail
              Times · Spots (add your own) · Guide · Stats · Settings
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
