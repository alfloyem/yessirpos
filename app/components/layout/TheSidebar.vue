<script setup>
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { logout } = useAuth()
const isSidebarCollapsed = useState('sidebarCollapsed', () => false)

// Using Solar Duotone icons which match the professional look
const menuItems = computed(() => [
  { label: t('menu.home'), icon: 'solar:home-2-bold-duotone', to: '/' },
  { label: t('menu.customers'), icon: 'solar:users-group-rounded-bold-duotone', to: '/customers' },
  { label: t('menu.products'), icon: 'solar:box-bold-duotone', to: '/products' },
  { label: t('menu.bundles'), icon: 'solar:box-minimalistic-bold-duotone', to: '/bundles' },
  { label: t('menu.suppliers'), icon: 'solar:buildings-2-bold-duotone', to: '/suppliers' },
  { label: t('menu.reports'), icon: 'solar:chart-2-bold-duotone', to: '/reports' },
  { label: t('menu.intake'), icon: 'solar:delivery-bold-duotone', to: '/intake' },
  { label: t('menu.sales'), icon: 'solar:cart-large-2-bold-duotone', to: '/sales' },
  { label: t('menu.employees'), icon: 'solar:user-id-bold-duotone', to: '/employees' },
  { label: t('menu.giftCard'), icon: 'solar:gift-bold-duotone', to: '/gift-card' },
  { label: t('menu.messages'), icon: 'solar:letter-bold-duotone', to: '/messages' },
  { label: t('menu.tax'), icon: 'solar:bill-bold-duotone', to: '/tax' },
  { label: t('menu.attributes'), icon: 'solar:checklist-bold-duotone', to: '/attributes' },
  { label: t('menu.expenses'), icon: 'solar:wallet-money-bold-duotone', to: '/expenses' },
  { label: t('menu.expenseCategory'), icon: 'solar:notes-bold-duotone', to: '/expense-category' },
  { label: t('menu.earnings'), icon: 'solar:banknote-bold-duotone', to: '/earnings' },
  { label: t('menu.office'), icon: 'solar:buildings-bold-duotone', to: '/office' },
  { label: t('menu.settings'), icon: 'solar:settings-bold-duotone', to: '/settings' },
])
</script>

<template>
  <aside 
    class="h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-app)] flex flex-col z-50 transition-all duration-300 ease-in-out overflow-hidden"
    :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Logo Section -->
    <div class="h-20 px-4 flex items-center flex-shrink-0">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-3 w-full px-1">
        <img 
          src="~/assets/images/yessir_icon.svg" 
          alt="Y" 
          class="h-10 w-10 flex-shrink-0 transition-transform duration-300 ease-in-out"
          :class="isSidebarCollapsed ? 'scale-90' : 'scale-100'"
        />
        <div 
          class="flex items-center overflow-hidden transition-all duration-300 ease-in-out"
          :class="isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'"
        >
          <img 
            src="~/assets/images/yessir_pos_text_logo.svg" 
            alt="YESSIR POS" 
            class="h-6 w-auto flex-shrink-0" 
          />
        </div>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
      <NuxtLink 
        v-for="item in menuItems" 
        :key="item.label"
        :to="localePath(item.to)"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-300 group relative"
        :class="[
          $route.path === localePath(item.to) 
            ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' 
            : 'text-[var(--text-app)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]'
        ]"
      >
        <!-- Left vertical bar for active item -->
        <span 
          class="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 rounded-r-full transition-transform duration-300 ease-out origin-center"
          :class="$route.path === localePath(item.to) ? 'bg-[var(--text-primary)] scale-y-100' : 'bg-transparent scale-y-0'"
        ></span>
        
        <!-- Icon -->
        <div class="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-transform duration-300 group-hover:scale-110">
          <UiIcon :name="item.icon" size="sidebar" />
        </div>
        
        <!-- Text -->
        <div 
          class="flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
          :class="isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'"
        >
          {{ item.label }}
        </div>

        <!-- Tooltip when collapsed -->
        <div 
          v-if="isSidebarCollapsed"
          class="absolute left-full ml-2 px-3 py-1.5 bg-[var(--text-primary)] text-white text-sm font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-md"
        >
          {{ item.label }}
          <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--text-primary)]"></div>
        </div>
      </NuxtLink>
    </nav>

    <!-- Footer of Sidebar -->
    <div class="p-4 border-t border-[var(--border-app)] flex-shrink-0">
      <button 
        @click="logout"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 transition-all duration-300 group relative"
      >
        <div class="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-transform duration-300 group-hover:scale-110">
          <UiIcon name="solar:logout-bold-duotone" size="lg" />
        </div>
        
        <!-- Text -->
        <div 
          class="flex-1 text-left whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
          :class="isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'"
        >
          {{ t('logout') }}
        </div>

        <!-- Tooltip when collapsed -->
        <div 
          v-if="isSidebarCollapsed"
          class="absolute left-full ml-2 px-3 py-1.5 bg-[var(--color-brand-danger)] text-white text-sm font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-md"
        >
          {{ t('logout') }}
          <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--color-brand-danger)]"></div>
        </div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Hidden scrollbar but keeps functionality */
.no-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}
.no-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>
