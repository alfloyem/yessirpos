<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-serif font-black tracking-tighter">
        {{ t('welcome') }}
      </h1>
      
      <div class="h-[1px] flex-1 mx-12 bg-app-text opacity-10"></div>
      
      <div class="flex gap-4">
        <div class="w-12 h-12 border border-app-border flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity">
          <Icon name="heroicons:plus" class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Simple placeholder content for dashboard -->
    <div class="grid grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="h-48 border border-app-border p-6 flex flex-col justify-between">
        <div class="w-8 h-8 bg-app-text opacity-5"></div>
        <div class="space-y-2">
          <div class="h-2 w-12 bg-app-text opacity-10"></div>
          <div class="h-4 w-24 bg-app-text opacity-40"></div>
        </div>
      </div>
    </div>
  </div>
</template>
