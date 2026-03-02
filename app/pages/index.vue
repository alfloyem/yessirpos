<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()

definePageMeta({
  layout: false
})
</script>

<template>
  <div class="h-screen flex items-center justify-center p-8 bg-app-bg text-app-text">
    <h1 class="text-4xl font-serif font-black tracking-tighter">
      {{ t('welcome') }}
    </h1>
  </div>
</template>
