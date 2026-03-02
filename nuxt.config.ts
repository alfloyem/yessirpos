import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'tr', name: 'Türkçe', file: 'tr.json' },
    ],
    defaultLocale: 'tr',
    strategy: 'no_prefix',
    langDir: 'locales', // This will refer to the 'locales' folder inside the root 'i18n' folder
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
  },

  css: ['~/assets/css/main.css'],
})

