import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
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
      { code: 'az', name: 'Azərbaycanca', file: 'az.json' },
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
        { name: 'theme-color', content: '#000000' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],
})

 
