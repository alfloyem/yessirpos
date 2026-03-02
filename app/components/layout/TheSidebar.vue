<script setup>
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { logout } = useAuth()

// Using Solar Duotone icons which match the professional look
const menuItems = computed(() => [
  { label: t('menu.home'), icon: 'solar:home-2-bold-duotone', to: '/' },
  { label: t('menu.customers'), icon: 'solar:users-group-two-rounded-bold-duotone', to: '/customers' },
  { label: t('menu.products'), icon: 'solar:box-bold-duotone', to: '/products' },
  { label: t('menu.bundles'), icon: 'solar:layers-minimalistic-bold-duotone', to: '/bundles' },
  { label: t('menu.suppliers'), icon: 'solar:user-id-bold-duotone', to: '/suppliers' },
  { label: t('menu.reports'), icon: 'solar:chart-square-bold-duotone', to: '/reports' },
  { label: t('menu.intake'), icon: 'solar:document-add-bold-duotone', to: '/intake' },
  { label: t('menu.sales'), icon: 'solar:cart-large-bold-duotone', to: '/sales' },
  { label: t('menu.employees'), icon: 'solar:user-speak-bold-duotone', to: '/employees' },
  { label: t('menu.giftCard'), icon: 'solar:card-bold-duotone', to: '/gift-card' },
  { label: t('menu.messages'), icon: 'solar:chat-round-dots-bold-duotone', to: '/messages' },
  { label: t('menu.tax'), icon: 'solar:calculator-bold-duotone', to: '/tax' },
  { label: t('menu.attributes'), icon: 'solar:tag-bold-duotone', to: '/attributes' },
  { label: t('menu.expenses'), icon: 'solar:wallet-money-bold-duotone', to: '/expenses' },
  { label: t('menu.expenseCategory'), icon: 'solar:folder-with-files-bold-duotone', to: '/expense-category' },
  { label: t('menu.earnings'), icon: 'solar:graph-up-bold-duotone', to: '/earnings' },
  { label: t('menu.office'), icon: 'solar:buildings-2-bold-duotone', to: '/office' },
  { label: t('menu.settings'), icon: 'solar:settings-bold-duotone', to: '/settings' },
])
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
        active-class="bg-[#8745f3] text-white shadow-md shadow-[#8745f3]/30"
        :class="[
          $route.path === localePath(item.to) 
            ? 'bg-[#8745f3] text-white' 
            : 'text-[#6f6b7d] hover:bg-[#8745f3]/5 hover:text-[#8745f3]'
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
