import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    public: {
      clientId: process.env.CLIENT_ID ?? 'bakustreet',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_URL ?? '',
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        vapidKey: process.env.FIREBASE_VAPID_KEY,
      }
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode',
    '@nuxt/icon',
  ],

  i18n: {
    locales: [
      { code: 'az', name: 'Azərbaycan', file: 'az.json' },
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' },
    ],
    defaultLocale: 'az',
    strategy: 'no_prefix',
    langDir: 'locales',
  },

  colorMode: {
    classSuffix: '',
  },

  vite: {
    plugins: [
      tailwindcss() as any,
    ],
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      meta: [
        { name: 'theme-color', content: '#5020DF' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'YesSir POS' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ]
    }
  },

  css: ['~/assets/css/main.css'],
})

 
