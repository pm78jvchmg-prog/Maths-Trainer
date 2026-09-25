/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  test: {
    // Vitest's 5 s default is shorter than several property tests take once
    // the workers share the CPU: tests that take 2.6 to 4.1 s alone ran 5.7 to
    // 7.5 s in a full run and failed it. A budget rather than fewer samples, as
    // CLAUDE.md asks; a test that needs longer still says so itself.
    testTimeout: 30_000,
  },
  build: {
    rolldownOptions: {
      output: {
        // mathjs and KaTeX each get a chunk of their own. Their bytes change
        // only when the dependency does, so their hashed names survive a
        // content or app deploy and the service worker keeps them rather than
        // downloading the whole bundle again. Content stays eager in the app
        // chunk on purpose. A group also takes the modules its matches import,
        // so mathjs's own dependencies (decimal.js, fraction.js, ...) go with it.
        //
        // KaTeX's group is its JavaScript only. Its stylesheet stays in the app
        // CSS, after index.css as before; a CSS chunk of its own is linked
        // ahead of index.css, which would flip which rule wins a tie.
        codeSplitting: {
          groups: [
            { name: 'mathjs', test: /[\\/]node_modules[\\/]mathjs[\\/]/ },
            { name: 'katex', test: /[\\/]node_modules[\\/]katex[\\/].*\.m?js$/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Maths Trainer',
        short_name: 'Maths',
        description: 'Guided maths practice, offline.',
        theme_color: '#11121a',
        background_color: '#11121a',
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
        // no signal at all. mathjs pushes the bundle past the 2 MB default, and
        // the content library has since passed 6 MB. A file over this cap is
        // not merely left uncached: the build fails, so nothing deploys.
        //
        // Fonts are woff2 only. Every KaTeX @font-face lists woff2 first, and a
        // browser takes the first source whose format it supports, so iOS
        // Safari never asks for the woff or ttf copies; precaching them cost
        // about 800 KB per install for nothing. They are still emitted, so an
        // older browser online can fetch them.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      },
    }),
  ],
});
