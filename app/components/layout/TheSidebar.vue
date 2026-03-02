<script setup>
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { logout } = useAuth()

// Using Solar Duotone icons which match the professional look
const menuItems = [
  { label: 'Ana səhifə', icon: 'solar:home-2-bold-duotone', to: '/' },
  { label: 'Müştərilər', icon: 'solar:users-group-two-rounded-bold-duotone', to: '/customers' },
  { label: 'Mallar', icon: 'solar:box-bold-duotone', to: '/products' },
  { label: 'Mal Dəstləri', icon: 'solar:layers-minimalistic-bold-duotone', to: '/bundles' },
  { label: 'Təchizatçılar', icon: 'solar:user-id-bold-duotone', to: '/suppliers' },
  { label: 'Hesabatlar', icon: 'solar:chart-square-bold-duotone', to: '/reports' },
  { label: 'Qəbul Edilənlər', icon: 'solar:document-add-bold-duotone', to: '/intake' },
  { label: 'Satışlar', icon: 'solar:cart-large-bold-duotone', to: '/sales' },
  { label: 'Əməkdaşlar', icon: 'solar:user-speak-bold-duotone', to: '/employees' },
]
</script>

<template>
  <aside class="w-64 h-screen bg-[#ffffff] border-r border-[#dbdade] flex flex-col fixed left-0 top-0 z-50">
    <!-- Logo Section -->
    <div class="px-6 py-6 h-20 flex items-center justify-start border-b border-[#dbdade]/30">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2">
        <img src="~/assets/images/yessir_pos_logo_purple.svg" alt="Yessir POS" class="h-10 w-auto" />
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
      <NuxtLink 
        v-for="item in menuItems" 
        :key="item.label"
        :to="localePath(item.to)"
        class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-lg group"
        active-class="bg-[#7367f0] text-white shadow-md shadow-[#7367f0]/30"
        :class="[
          $route.path === localePath(item.to) 
            ? 'bg-[#7367f0] text-white' 
            : 'text-[#6f6b7d] hover:bg-[#7367f0]/5'
        ]"
      >
        <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Footer of Sidebar -->
    <div class="px-4 py-4 border-t border-[#dbdade]">
      <button 
        @click="logout"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#ea5455] hover:bg-[#ea5455]/5 rounded-lg transition-all"
      >
        <Icon name="solar:logout-bold-duotone" class="w-5 h-5" />
        <span>{{ t('logout') }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Hidden scrollbar */
::-webkit-scrollbar {
  width: 0px;
}
.router-link-active :deep(svg) {
  filter: brightness(0) invert(1);
}
</style>
