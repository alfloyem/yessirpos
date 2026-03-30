<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useColorMode } from '#imports'
import { useI18n } from '#i18n'
import Toaster from '~/components/ui/Toaster.vue'
import { useUpdater } from '~/composables/useUpdater'

const colorMode = useColorMode()
const { locales, locale, setLocale } = useI18n()
const { checkForUpdates, updateAvailable, updateVersion, installUpdate, isDownloading } = useUpdater()

const handleKeydown = (e: KeyboardEvent) => {
  // Check for Ctrl + Shift + Alt
  if (e.ctrlKey && e.shiftKey && e.altKey) {
    if (e.key.toLowerCase() === 't') {
      e.preventDefault()
      // Theme Switch (Ctrl+Shift+Alt+T)
      colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault()
      // Language Switch (Ctrl+Shift+Alt+L)
      const availableLocales = locales.value as any[]
      const currentIdx = availableLocales.findIndex(l => l.code === locale.value)
      const nextIdx = (currentIdx + 1) % availableLocales.length
      setLocale(availableLocales[nextIdx].code)
    }
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
    // Auto-check for updates on startup (Tauri only)
    checkForUpdates()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>
<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster />

    <!-- Update notification banner -->
    <Transition name="slide-up">
      <div
        v-if="updateAvailable"
        class="fixed bottom-4 right-4 z-[9999] bg-primary text-white rounded-xl shadow-lg px-5 py-4 flex items-center gap-4 max-w-sm"
      >
        <div class="flex-1">
          <p class="font-semibold text-sm">Yeni versiya mövcuddur</p>
          <p class="text-xs opacity-80">v{{ updateVersion }}</p>
        </div>
        <button
          class="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          :disabled="isDownloading"
          @click="installUpdate"
        >
          {{ isDownloading ? 'Yüklənir...' : 'Yenilə' }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>