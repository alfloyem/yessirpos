<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()

useHead({
  title: t('menu.employees')
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.employees') }}
      </h1>
    </div>

    <!-- Empty Main Content Area -->
    <div class="bg-[var(--bg-sidebar)] rounded-lg border border-[var(--border-app)] p-6 min-h-[500px]">
      <!-- İçerik buraya gelecek -->
      <p class="text-sm text-[var(--text-app)] opacity-60">Employees content will be here.</p>
    </div>
  </div>
</template>
