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
    class="h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-app)] flex flex-col fixed left-0 top-0 z-50 transition-all duration-300"
    :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Logo Section -->
    <div class="px-6 py-6 h-20 flex items-center justify-center overflow-hidden">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2">
        <Transition name="logo-fade" mode="out-in">
          <img 
            v-if="!isSidebarCollapsed"
            key="full"
            src="~/assets/images/yessir_pos_logo_purple.svg" 
            alt="Yessir POS" 
            class="h-10 w-auto" 
          />
          <img 
            v-else
            key="icon"
            src="~/assets/images/yessir_icon.svg" 
            alt="Y" 
            class="h-10 w-10" 
          />
        </Transition>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <NuxtLink 
        v-for="item in menuItems" 
        :key="item.label"
        :to="localePath(item.to)"
        class="flex items-center gap-3 px-3 py-2.5 text-[16px] font-medium transition-all rounded-lg group relative"
        active-class="bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
        :class="[
          $route.path === localePath(item.to) 
            ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' 
            : 'text-[var(--text-app)] hover:opacity-80 hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]',
          isSidebarCollapsed ? 'justify-center' : ''
        ]"
      >
        <!-- Left vertical bar for active item -->
        <span 
          v-if="$route.path === localePath(item.to)"
          class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--text-primary)] rounded-r-full"
        ></span>
        
        <UiIcon :name="item.icon" size="sidebar" class="flex-shrink-0" />
        
        <!-- Text with transition -->
        <Transition name="text-fade">
          <span v-if="!isSidebarCollapsed" class="truncate">{{ item.label }}</span>
        </Transition>

        <!-- Tooltip on hover when collapsed -->
        <Transition name="tooltip-fade">
          <div 
            v-if="isSidebarCollapsed"
            class="absolute left-full ml-2 px-3 py-2 bg-[var(--text-primary)] text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50"
          >
            {{ item.label }}
          </div>
        </Transition>
      </NuxtLink>
    </nav>

    <!-- Footer of Sidebar -->
    <div class="px-4 py-4 border-t border-[var(--border-app)]">
      <button 
        @click="logout"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--color-brand-danger)] hover:bg-[var(--bg-app)] rounded-lg transition-all relative group"
        :class="isSidebarCollapsed ? 'justify-center' : ''"
      >
        <UiIcon name="solar:logout-bold-duotone" size="lg" class="flex-shrink-0" />
        <Transition name="text-fade">
          <span v-if="!isSidebarCollapsed">{{ t('logout') }}</span>
        </Transition>

        <!-- Tooltip for logout when collapsed -->
        <Transition name="tooltip-fade">
          <div 
            v-if="isSidebarCollapsed"
            class="absolute left-full ml-2 px-3 py-2 bg-[var(--color-brand-danger)] text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50"
          >
            {{ t('logout') }}
          </div>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Hidden scrollbar */
::-webkit-scrollbar {
  width: 0px;
}

/* Text fade animation */
.text-fade-enter-active,
.text-fade-leave-active {
  transition: all 0.2s ease;
}

.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Logo fade animation */
.logo-fade-enter-active,
.logo-fade-leave-active {
  transition: all 0.3s ease;
}

.logo-fade-enter-from,
.logo-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Tooltip fade animation */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: all 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-5px);
}
</style>
