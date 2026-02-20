import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.webp', 'apple-touch-icon.png'],
      manifest: {
        name: 'Waves RSS Reader',
        short_name: 'Waves',
        description: 'A beautiful, personal space for reading the web.',
        theme_color: '#020617',
        background_color: '#020617',
        icons: [
          {
            src: 'icon-192.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: 'icon-512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
