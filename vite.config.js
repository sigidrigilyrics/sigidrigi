import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The song catalogue/images/favorites already have their own offline
      // fallbacks (localStorage) — this service worker's only job is making
      // the APP SHELL (JS/CSS/HTML) boot with zero connectivity so that
      // existing fallback logic gets a chance to run at all. Without it, a
      // reload with no signal fails before any of that code executes.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico}'],
        runtimeCaching: [
          {
            // Google Fonts: cache after first fetch so typography survives offline too
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Supabase (song data) and YouTube (playback) are deliberately left
          // uncached here — they already degrade via the app's own logic
          // (localStorage catalogue cache / "connection needed to play").
        ],
      },
      manifest: {
        name: 'Sigidrigi',
        short_name: 'Sigidrigi',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
})
