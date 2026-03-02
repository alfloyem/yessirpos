<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()
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
  <header class="h-16 w-full flex items-center justify-between px-8 bg-[#f8f7fa] border-b border-[#dbdade] sticky top-0 z-40">
    <!-- Navbar Left (Context specific) -->
    <div class="flex items-center gap-4">
      <button class="text-neutral-500 hover:text-black transition-colors">
        <Icon name="solar:hamburger-menu-bold-duotone" class="w-6 h-6" />
      </button>
      <h2 class="text-base font-bold text-[#5d596c] truncate">
        {{ t('dashboard') }}
      </h2>
    </div>

    <!-- Navbar Right (Actions) -->
    <div class="flex items-center gap-6">
      <!-- Digital Clock -->
      <div class="hidden md:flex items-center gap-2 text-[#6f6b7d] text-xs font-medium bg-white px-3 py-1.5 rounded-lg border border-[#dbdade]/50">
        <Icon name="solar:clock-circle-bold-duotone" class="w-4 h-4 text-[#7367f0]" />
        <span>{{ formattedTime }}</span>
      </div>

      <!-- User Info -->
      <div class="flex items-center gap-3 pl-6 border-l border-[#dbdade]">
        <div class="flex flex-col text-right">
          <span class="text-xs font-bold text-[#5d596c]">MR Musa</span>
          <span class="text-[10px] text-[#6f6b7d] opacity-60">Admin</span>
        </div>
        <div class="w-10 h-10 rounded-lg bg-[#7367f0]/10 text-[#7367f0] flex items-center justify-center font-bold text-sm border border-[#7367f0]/20">
          MR
        </div>
      </div>
    </div>
  </header>
</template>
