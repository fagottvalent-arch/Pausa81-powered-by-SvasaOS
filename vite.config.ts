import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        id: '/?v=pausa81-3.2',
        name: 'Pausa81 by SvasaOS — Presidio D.Lgs. 81/2008',
        short_name: 'Pausa81',
        description: 'Presidio Neuro-Ergonomico B2B da 60 secondi (D.Lgs. 81/2008)',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/?v=3.2',
        scope: '/',
        icons: [
          {
            src: '/icon.svg?v=3.2',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
