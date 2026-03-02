<script setup>
import { useI18n } from '#i18n'
const { t, locales, locale, setLocale } = useI18n()
const colorMode = useColorMode()

const now = ref(new Date())

onMounted(() => {
  setInterval(() => {
    now.value = new Date()
  }, 1000)
})

const formattedTime = computed(() => {
  return now.value.toLocaleDateString('tr-TR') + ' ' + now.value.toLocaleTimeString('tr-TR')
})
</script>

<template>
  <header class="h-16 w-full flex items-center justify-between px-8 bg-[var(--bg-app)] border-b border-[var(--border-app)] sticky top-0 z-40">
    <!-- Navbar Left (Context specific) -->
    <div class="flex items-center gap-4">
      <button class="text-[var(--text-app)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] transition-all">
        <Icon name="solar:hamburger-menu-bold-duotone" class="w-6 h-6" />
      </button>
      <h2 class="text-base font-bold text-[var(--text-app)] truncate">
        {{ t('dashboard') }}
      </h2>
    </div>

    <!-- Navbar Right (Actions) -->
    <div class="flex items-center gap-6">
      <!-- Digital Clock -->
      <div class="hidden md:flex items-center gap-2 text-[var(--text-app)] opacity-80 text-xs font-medium bg-[var(--input-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] transition-all">
        <Icon name="solar:clock-circle-bold-duotone" class="w-4 h-4 text-[var(--text-primary)]" />
        <span>{{ formattedTime }}</span>
      </div>

      <!-- Language Switcher -->
      <div class="flex items-center gap-1 pl-4 border-l border-[var(--border-app)]">
        <button 
          v-for="l in locales" 
          :key="l.code"
          @click="setLocale(l.code)"
          class="text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase"
          :class="locale === l.code ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] hover:bg-[var(--text-primary)] hover:text-white'"
        >
          {{ l.code }}
        </button>
      </div>

      <!-- User Info -->
      <div class="flex items-center gap-3 pl-4 border-l border-[var(--border-app)]">
        <div class="flex flex-col text-right">
          <span class="text-xs font-bold text-[var(--text-app)]">{{ t('user.name') }}</span>
          <span class="text-[10px] text-[var(--text-app)] opacity-60">{{ t('user.role') }}</span>
        </div>
        <div class="w-10 h-10 rounded-lg bg-[var(--text-primary)] text-white flex items-center justify-center font-bold text-sm border hover:opacity-80 transition-all cursor-pointer">
          {{ t('user.initials') }}
        </div>
      </div>
    </div>
  </header>
</template>
