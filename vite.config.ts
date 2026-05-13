import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const DEEPSEEK_KEY = readFileSync('C:/Users/39037/Desktop/ds.txt', 'utf-8').trim()

export default defineConfig({
  base: '/daily-journal/',
  define: {
    __DEEPSEEK_KEY__: JSON.stringify(DEEPSEEK_KEY),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Daily Journal',
        short_name: 'Journal',
        description: '记录每日生活、心情与健身',
        theme_color: '#c97d6b',
        background_color: '#faf8f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/daily-journal/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
