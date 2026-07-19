import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  envDir: '../',
  plugins: [
    react(),
    VitePWA({
      // We surface our own "new version available" toast (see usePwa.ts), so use
      // the prompt strategy rather than silently auto-updating mid-session.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons.svg'],
      manifest: {
        name: 'Absolute Travel — Відкрий Україну',
        short_name: 'Absolute',
        description:
          'Соціальна платформа для дослідження України: знаходь місця, проходь маршрути та відкривай карту разом із друзями — навіть без інтернету.',
        lang: 'uk',
        dir: 'ltr',
        theme_color: '#071F16',
        background_color: '#071F16',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['travel', 'navigation', 'social'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Pull in our Web Push handlers (push / notificationclick) — see
        // public/push-sw.js. importScripts runs them inside the generated SW.
        importScripts: ['push-sw.js'],
        // Precache the app shell so it opens instantly and works fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The bundled Leaflet/map chunks are large; lift the default 2 MiB cap.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // OpenStreetMap raster tiles — the map itself. CacheFirst so tiles the
            // traveller has already loaded stay visible deep in the Carpathians.
            urlPattern: ({ url }) =>
              /(^|\.)(tile\.openstreetmap\.org|basemaps\.cartocdn\.com|tile\.opentopomap\.org)$/.test(
                url.hostname,
              ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheet + font files.
            urlPattern: ({ url }) =>
              url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Backend API — always try the network first, fall back to the last
            // known-good response when offline so lists/places still render.
            urlPattern: ({ url }) => /\/(api|places|users|explore|feed)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Let us exercise the SW during `vite dev` without a production build.
        enabled: false,
      },
    }),
  ],
})
