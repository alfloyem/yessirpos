<script setup>
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { logout } = useAuth()
const isSidebarCollapsed = useState('sidebarCollapsed', () => false)
const isMobileMenuOpen = useState('mobileMenuOpen', () => false)

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  closeMobileMenu()
})

const activeTooltip = ref({ label: '', type: 'default' })
const isTooltipVisible = ref(false)
const tooltipStyles = ref({})

const showTooltip = (event, label, type = 'default') => {
  if (!isSidebarCollapsed.value) return
  const rect = event.currentTarget.getBoundingClientRect()
  activeTooltip.value = { label, type }
  isTooltipVisible.value = true
  tooltipStyles.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 12}px`
  }
}

const hideTooltip = () => {
  isTooltipVisible.value = false
}

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
  <!-- Backdrop for Mobile -->
  <div 
    v-if="isMobileMenuOpen"
    @click="closeMobileMenu"
    class="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] transition-opacity duration-300"
  ></div>

  <aside 
    class="h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-app)] flex flex-col z-50 transition-all duration-300 ease-in-out overflow-hidden fixed md:relative top-0 left-0"
    :class="[
      isSidebarCollapsed ? 'md:w-20' : 'md:w-64',
      isMobileMenuOpen ? 'w-64 translate-x-0 shadow-2xl' : 'w-64 -translate-x-full md:translate-x-0'
    ]"
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
      <!-- Mobile Close Button -->
      <button 
        @click="closeMobileMenu"
        class="md:hidden ml-auto p-1 text-[var(--text-app)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
      >
        <UiIcon name="solar:close-circle-bold-duotone" size="lg" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
      <NuxtLink 
        v-for="item in menuItems" 
        :key="item.label"
        :to="localePath(item.to)"
        @mouseenter="showTooltip($event, item.label)"
        @mouseleave="hideTooltip"
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

      </NuxtLink>
    </nav>

    <!-- Footer of Sidebar -->
    <div class="p-4 border-t border-[var(--border-app)] flex-shrink-0">
      <button 
        @click="logout"
        @mouseenter="showTooltip($event, t('logout'), 'danger')"
        @mouseleave="hideTooltip"
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

      </button>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div 
            v-if="isTooltipVisible"
            class="fixed px-3 py-1.5 text-white text-sm font-medium rounded-lg whitespace-nowrap z-[100000] shadow-md pointer-events-none"
            :class="activeTooltip.type === 'danger' ? 'bg-[var(--color-brand-danger)]' : 'bg-[var(--text-primary)]'"
            :style="{
              top: tooltipStyles.top,
              left: tooltipStyles.left,
              transform: 'translateY(-50%)'
            }"
          >
            {{ activeTooltip.label }}
            <div 
              class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
              :class="activeTooltip.type === 'danger' ? 'border-r-[var(--color-brand-danger)]' : 'border-r-[var(--text-primary)]'"
            ></div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
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
