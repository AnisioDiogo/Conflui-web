import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      // Registra o SW automaticamente + notifica quando há update
      registerType: 'prompt',

      // Inclui assets adicionais no precache
      includeAssets: ['favicon.svg', 'offline.html', 'icons/*.svg'],

      // Ativa o DevTools do Workbox em modo dev
      devOptions: {
        enabled: true,
        type: 'module',
      },

      // ── Web App Manifest ──────────────────────────────────────────────────
      manifest: {
        name: 'Conflui',
        short_name: 'Conflui',
        description: 'Seu workspace pessoal inteligente — rotina, finanças, estudos e mais.',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/dashboard',
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['productivity', 'lifestyle', 'education'],

        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: '/icons/apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
          },
        ],

        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Início',
            description: 'Abre o dashboard',
            url: '/dashboard',
            icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
          },
          {
            name: 'Rotina',
            short_name: 'Rotina',
            description: 'Tarefas do dia',
            url: '/rotina',
            icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
          },
          {
            name: 'Financeiro',
            short_name: 'Finanças',
            description: 'Entradas e saídas',
            url: '/financeiro',
            icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
          },
        ],

        screenshots: [],
      },

      // ── Workbox (cache strategy) ──────────────────────────────────────────
      workbox: {
        // Precache tudo o que o Vite gerar
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,ttf}'],

        // FIX P0: SPA precisa de /index.html como navigateFallback.
        // '/offline.html' causava "tela sem conexão" no Android PWA:
        // o SW interceptava /dashboard, não achava no cache e servia a página de erro.
        // Com '/index.html', o React Router resolve todas as rotas client-side.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/__/, /\.(?:js|css|png|jpg|svg|ico|woff2?)$/],

        runtimeCaching: [
          // Firebase Auth
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Firestore REST API
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 dia
              },
            },
          },

          // Firebase Storage
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },

          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
            },
          },

          // Avatares / imagens externas
          {
            urlPattern: /\.(png|jpg|jpeg|webp|gif|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
            },
          },
        ],
      },
    }),
  ],
})
