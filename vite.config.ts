import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
  plugins: [
    react(),
    obfuscatorPlugin({
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 6,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['rc4'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.85,
        unicodeEscapeSequence: false,
        // DOMAIN-LOCK: Il codice compilato funziona SOLO sui tuoi domini autorizzati
        domainLock: [
          'localhost',
          '127.0.0.1',
          '.vercel.app',
          'pausa81.it',
          '.pausa81.it',
          'pausa81.com',
          '.pausa81.com',
          'svasaos.com',
          '.svasaos.com',
        ],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        id: '/?v=pausa81-3.5',
        name: 'Pausa81 by SvasaOS — Presidio D.Lgs. 81/2008',
        short_name: 'Pausa81',
        description: 'Presidio Neuro-Ergonomico B2B da 60 secondi (D.Lgs. 81/2008)',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/?v=3.5',
        scope: '/',
        icons: [
          {
            src: '/icon.svg?v=3.5',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
