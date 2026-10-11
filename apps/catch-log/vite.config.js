// Vite + PWA config for Catch Log.
// - base: './' so the built app works from any sub-path (GitHub Pages /Outdoors/,
//   Netlify root, Cloudflare Pages, etc.).
// - vite-plugin-pwa precaches every built asset so the whole app opens with
//   zero signal (pier, jetty, boat ramp). Tide data is cached separately in
//   IndexedDB by the app itself (see src/lib/tides.js).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Catch Log',
        short_name: 'Catch Log',
        description: 'Family fishing tracker: trips, catches, tides, solunar times.',
        theme_color: '#0f3d3e',
        background_color: '#0b1f20',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  // ~500 KB JS (React + Dexie + data) is downloaded once and cached for offline use
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
  },
})
