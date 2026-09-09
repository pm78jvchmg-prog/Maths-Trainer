import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Maths Trainer',
        short_name: 'Maths',
        description: 'Guided maths practice, offline.',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        // Standalone hides Safari's chrome once added to the Home Screen.
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything is precached, KaTeX fonts included, so a lesson runs with
        // no signal at all. mathjs pushes the bundle past the 2 MB default.
        globPatterns: ['**/*.{js,css,html,woff,woff2,ttf,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
