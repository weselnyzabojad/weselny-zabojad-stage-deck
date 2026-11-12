import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // The PWA precaches the whole deck for offline use, so one ~0.5 MB bundle is
  // expected. Raise the advisory limit instead of splitting a cached payload.
  build: {
    chunkSizeWarningLimit: 600,
    // Keep the self-hosted flag SVGs as separate cacheable files instead of
    // inlining hundreds of data URIs into the main bundle.
    assetsInlineLimit: (filePath) => (filePath.endsWith('.svg') ? false : undefined)
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Issue #81: never reload the live stage silently. A new service worker
      // waits until the user accepts the deferred "Update available" prompt.
      registerType: 'prompt',
      injectRegister: null,
      // The couple-identity flags are self-hosted SVGs; precache them so the
      // header still renders offline for any cartridge.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Self-hosted assets are precached above. The Montserrat/Lora families
        // still come from Google Fonts, so cache the stylesheet and font files
        // at runtime; the installed PWA then keeps the intended typography
        // offline instead of falling back to system fonts.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Universal Wedding Stage Deck',
        short_name: 'StageDeck',
        description: 'Offline-first wedding stage deck for the MC, DJ and crew.',
        lang: 'en',
        theme_color: '#070b19',
        background_color: '#070b19',
        display: 'standalone',
        orientation: 'any',
        // Relative URLs make the manifest install from whatever directory serves
        // it: `/` in local/demo mode and `/deck/` in the production deployment.
        // This keeps a single build valid for both without hard-coding a scope.
        id: './',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})