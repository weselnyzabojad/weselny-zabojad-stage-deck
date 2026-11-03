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
      registerType: 'autoUpdate',
      // The couple-identity flags are self-hosted SVGs; precache them so the
      // header still renders offline for any cartridge.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'Universal Wedding Stage Deck',
        short_name: 'StageDeck',
        theme_color: '#070b19',
        background_color: '#070b19',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})