<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useColorMode } from '#imports'
import { useI18n } from '#i18n'
import Toaster from '~/components/ui/Toaster.vue'

const colorMode = useColorMode()
const { locales, locale, setLocale } = useI18n()

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
  </div>
</template>