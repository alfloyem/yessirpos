<script setup>
import { useI18n } from '#i18n'
const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const localePath = useLocalePath()
const { isAuthenticated, logout } = useAuth()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen transition-colors duration-200">
    <header class="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-[var(--bg-app)] border-b border-[var(--border-app)]">
      <NuxtLink :to="localePath('/')" class="text-xl font-serif font-black tracking-tighter hover:opacity-70 transition-opacity">
        YESSIR<span class="opacity-30">POS</span>
      </NuxtLink>

      <nav class="flex items-center gap-8">
        <!-- Locale Switcher -->
        <div class="flex gap-4">
          <button 
            v-for="loc in locales" 
            :key="loc.code"
            @click="setLocale(loc.code)"
            class="text-[9px] font-black uppercase tracking-[.3em] transition-all"
            :class="locale === loc.code ? 'text-[var(--text-app)]' : 'text-[var(--text-app)] opacity-20 hover:opacity-50'"
          >
            {{ loc.code }}
          </button>
        </div>

        <!-- Color Mode Toggle -->
        <button @click="toggleColorMode" class="text-[var(--text-app)] opacity-60 hover:opacity-100 transition-opacity active:scale-90">
          <Icon :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'" class="w-5 h-5" />
        </button>

        <button 
          v-if="isAuthenticated"
          @click="logout"
          class="text-[9px] font-black uppercase tracking-[.3em] text-[var(--text-app)] hover:opacity-50 transition-all flex items-center gap-2"
        >
          <Icon name="heroicons:arrow-left-on-rectangle" class="w-4 h-4" />
          {{ t('logout') }}
        </button>
        <NuxtLink 
          v-else
          :to="localePath('/login')"
          class="text-[9px] font-black uppercase tracking-[.3em] border border-[var(--text-app)] px-6 py-2 hover:bg-[var(--text-app)] hover:text-[var(--bg-app)] transition-all"
        >
          {{ t('login') }}
        </NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer class="p-12 text-center border-t border-[var(--border-app)] bg-[var(--bg-app)]">
      <p class="text-[8px] text-[var(--text-app)] opacity-20 uppercase tracking-[.5em] font-black">
        &copy; {{ new Date().getFullYear() }} YESSIRPOS
      </p>
    </footer>
  </div>
</template>


<style>
/* Nuxt Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
