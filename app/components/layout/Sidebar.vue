<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '#i18n'
import yessirIcon from '~/assets/images/yessir_icon.svg'
import yessirTextLogo from '~/assets/images/yessir_pos_text_logo.svg'

const { t } = useI18n()
const route = useRoute()

const isSidebarCollapsed = useState<boolean>('sidebarCollapsed', () => false)
const isMobileMenuOpen = useState<boolean>('mobileMenuOpen', () => false)

// Define menu structure with translation keys
const menu = ref([
  {
    title: 'Əsas',
    titleKey: 'menu.main',
    icon: 'lucide:calendar',
    isOpen: false,
    children: [
      { title: 'Ana Səhifə', titleKey: 'menu.home', to: '/' },
      { title: 'Satışlar', titleKey: 'menu.sales', to: '/sales' },
      { title: 'Əməkdaşlar', titleKey: 'menu.employees', to: '/employees' }
    ]
  },
  {
    title: 'Müştərilər',
    titleKey: 'menu.customers',
    icon: 'lucide:users',
    isOpen: false,
    children: [
      { title: 'Müştərilər', titleKey: 'menu.customers_sub', to: '/customers' }, 
      { title: 'Hədiyyə Kartı', titleKey: 'menu.giftCard', to: '/gift-cards' }
    ]
  },
  {
    title: 'Anbar',
    titleKey: 'menu.warehouse',
    icon: 'lucide:package',
    isOpen: false,
    children: [
      { title: 'Mallar', titleKey: 'menu.products', to: '/goods' },
      { title: 'Kitlər', titleKey: 'menu.bundles', to: '/kits' }
    ]
  },
  {
    title: 'Təchizat',
    titleKey: 'menu.supply',
    icon: 'lucide:truck',
    isOpen: false,
    children: [
      { title: 'Tədarükçülər', titleKey: 'menu.suppliers', to: '/suppliers' },
      { title: 'Qəbul Edilənlər', titleKey: 'menu.intake', to: '/received' }
    ]
  },
  {
    title: 'Maliyyə',
    titleKey: 'menu.finance',
    icon: 'lucide:pie-chart',
    isOpen: false,
    children: [
      { title: 'Xərclər', titleKey: 'menu.expenses', to: '/expenses' },
      { title: 'Xərclər Bölməsi', titleKey: 'menu.expenseCategory', to: '/expense-division' },
      { title: 'Qazanclar', titleKey: 'menu.earnings', to: '/earnings' },
      { title: 'Hesabatlar', titleKey: 'menu.reports', to: '/reports' }
    ]
  }
])

const isActiveMenu = (item: any) => {
  return item.children.some((child: any) => route.path === child.to || route.path.startsWith(child.to + '/'))
}

// On mount, open the menu that contains the active route
onMounted(() => {
  const activeIndex = menu.value.findIndex(item => isActiveMenu(item))
  if (activeIndex !== -1 && !isSidebarCollapsed.value) {
    menu.value[activeIndex].isOpen = true
  }
})

// Watch route to update active states
watch(() => route.path, () => {
  if (!isSidebarCollapsed.value) {
    const activeIndex = menu.value.findIndex(item => isActiveMenu(item))
    if (activeIndex !== -1) {
      menu.value[activeIndex].isOpen = true
    }
  }
})

const toggleMenu = (index: number) => {
  if (isSidebarCollapsed.value && window.innerWidth >= 768) {
    // If we are collapsed, clicking a menu expanding it shouldn't expand the whole sidebar based on your CSS,
    // but typically to see children inline we need to expand. We'll leave it as is.
    isSidebarCollapsed.value = false;
  }
  
  const isCurrentlyOpen = menu.value[index].isOpen;
  
  // Close all submenus
  menu.value.forEach(m => m.isOpen = false);
  
  // Toggle the clicked one
  menu.value[index].isOpen = !isCurrentlyOpen;
}

const toggleSidebarMobileContext = () => {
  isMobileMenuOpen.value = false
}

const getTitle = (item: any) => {
  const translated = t(item.titleKey)
  if (translated === item.titleKey) return item.title
  return translated
}

const handleResize = () => {
  if (window.innerWidth >= 768) {
    isMobileMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

</script>

<template>
  <div class="h-full relative flex-shrink-0 z-[500]">
    <!-- Mobile Overlay -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
      @click="toggleSidebarMobileContext"
    ></div>

    <aside 
      class="bg-[var(--bg-app)] flex flex-col h-full border-r border-[var(--border-app)] transition-all duration-300 ease-in-out fixed md:relative z-50 top-0 left-0"
      :class="[
        isSidebarCollapsed ? 'md:w-[92px]' : 'md:w-[282px]',
        isMobileMenuOpen ? 'w-[282px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden md:overflow-visible'
      ]"
      style="font-family: 'Inter', sans-serif;"
    >
      <!-- Logo Area -->
      <div class="h-16 flex items-center justify-center shrink-0 transition-opacity duration-300 relative mx-4 border-b border-[var(--border-app)] mb-4">
        <img 
          v-if="!isSidebarCollapsed || isMobileMenuOpen"
          :src="yessirTextLogo" 
          alt="Logo Text" 
          class="h-6 w-auto transition-all duration-300 filter dark:invert"
        />
        <img 
          v-else
          :src="yessirIcon" 
          alt="Logo Icon" 
          class="h-10 w-10 transition-all duration-300"
        />
      </div>

      <!-- Navigation List Container -->
      <div 
        class="flex-1 flex flex-col pb-4 px-3 custom-scrollbar"
        :class="isSidebarCollapsed && !isMobileMenuOpen ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'"
      >
        <div class="flex flex-col gap-2">
          
          <div v-for="(item, index) in menu" :key="index" class="relative group/sidebaritem">
            <!-- Parent Category Button -->
            <button 
              @click="toggleMenu(index)"
              class="w-full flex items-center px-4 py-3 gap-3 rounded-[12px] text-[var(--text-app)] bg-transparent hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-all duration-300 cursor-pointer outline-none"
              :class="[
                (item.isOpen || isActiveMenu(item)) && !isSidebarCollapsed ? 'text-[var(--text-primary)] font-medium' : 'opacity-80',
                isSidebarCollapsed && !isMobileMenuOpen ? 'justify-center !px-0' : 'justify-between'
              ]"
            >
              <div 
                class="flex items-center" 
                :class="(isSidebarCollapsed && !isMobileMenuOpen) ? 'justify-center w-full' : 'gap-[10px] overflow-hidden'"
              >
                <Icon 
                  :name="item.icon" 
                  class="flex-shrink-0 transition-transform duration-300 group-hover/sidebaritem:scale-110"
                  :class="[
                    isSidebarCollapsed && !isMobileMenuOpen ? 'w-6 h-6' : 'w-5 h-5',
                    (item.isOpen || isActiveMenu(item)) && !isSidebarCollapsed ? 'text-[var(--text-primary)]' : 'opacity-80 group-hover/sidebaritem:opacity-100'
                  ]"
                />
                <span 
                  v-if="!isSidebarCollapsed || isMobileMenuOpen"
                  class="text-[14px] text-left truncate block flex-grow"
                >
                  {{ getTitle(item) }}
                </span>
              </div>
              
              <!-- Arrow Icon -->
              <Icon 
                v-if="!isSidebarCollapsed || isMobileMenuOpen"
                name="lucide:chevron-down" 
                class="w-4 h-4 flex-shrink-0 transition-transform duration-300 ease-in-out opacity-60"
                :class="item.isOpen ? 'rotate-180 text-[var(--text-primary)] opacity-100' : 'rotate-0'"
              />
            </button>

            <!-- Floating Submenu Hitbox (Just to keep hover active) -->
            <div 
              v-if="isSidebarCollapsed && !isMobileMenuOpen"
              class="hidden md:block absolute right-[-20px] top-0 w-[40px] h-[60px] z-[40]"
            ></div>

            <!-- Floating Absolute Tooltip/Dropdown Menu for Collapsed State -->
            <div 
              v-if="isSidebarCollapsed && !isMobileMenuOpen"
              class="absolute left-[70px] top-0 w-[240px] z-[999] bg-[var(--bg-app)] border border-[var(--border-app)] drop-shadow-xl rounded-[16px] py-2 invisible opacity-0 translate-y-2 group-hover/sidebaritem:visible group-hover/sidebaritem:opacity-100 group-hover/sidebaritem:translate-y-0 transition-all duration-300"
            >
              <!-- Title Header on Hover -->
              <div class="px-4 py-2 font-bold flex items-center gap-2 border-b border-[var(--border-app)] mb-2">
                <Icon :name="item.icon" class="w-4 h-4 text-[var(--text-primary)]" />
                <span class="text-sm text-[var(--text-primary)]">
                  {{ getTitle(item) }}
                </span>
              </div>
              
              <div class="flex flex-col px-2 gap-1">
                <NuxtLink 
                  v-for="(child, childIndex) in item.children" 
                  :key="'float-'+childIndex"
                  :to="child.to"
                  class="block w-full px-3 py-2 text-[13px] rounded-lg text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-colors duration-200"
                  active-class="!bg-[var(--text-primary)] !text-white font-medium shadow-sm shadow-[#3b82f6]/30"
                >
                  {{ getTitle(child) }}
                </NuxtLink>
              </div>
            </div>

            <!-- Inline Accordion (Expanded State) -->
            <div 
              v-else
              class="grid overflow-hidden transition-all duration-300 ease-in-out"
              :class="item.isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
            >
              <!-- Inner wrapper for smooth grid transition (needs min-h-0) -->
              <div class="min-h-0 flex flex-col items-end w-full pt-1">
                
                <!-- Links Wrapper -->
                <div class="flex flex-col gap-1 w-[82%]">
                  <NuxtLink 
                    v-for="(child, childIndex) in item.children" 
                    :key="childIndex"
                    :to="child.to"
                    class="relative flex px-4 py-[10px] w-full rounded-[10px] text-[13px] text-[var(--text-app)] opacity-80 hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] hover:opacity-100 transition-all duration-300 group/sublink"
                    active-class="!bg-[var(--text-primary)] !text-white !opacity-100 font-medium active-link"
                  >
                    <!-- Exact L Connector from User CSS -->
                    <div 
                      class="absolute border-l border-b border-[var(--border-app)] rounded-bl-[8px] pointer-events-none transition-all duration-300 group-hover/sublink:border-[var(--text-primary)] group-[.active-link]/sublink:border-[var(--text-primary)] group-[.active-link]/sublink:border-l-[2px] group-[.active-link]/sublink:border-b-[2px] group-[.active-link]/sublink:opacity-100"
                      style="height: 120px; width: 24px; top: -104px; left: -29px; z-index: 1;"
                    ></div>
                    
                    <span class="truncate block transition-transform duration-300 group-[.active-link]/sublink:translate-x-1 group-hover/sublink:translate-x-1">
                      {{ getTitle(child) }}
                    </span>
                  </NuxtLink>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="h-[2px] mx-4 rounded-full bg-[var(--border-app)] shrink-0 my-2"></div>
      
      <!-- Exit Account -->
      <div class="px-4 pb-4 shrink-0">
        <NuxtLink 
          to="/login"
          draggable="false"
          class="flex items-center w-full rounded-[12px] text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-all duration-300 cursor-pointer p-3"
          :class="isSidebarCollapsed && !isMobileMenuOpen ? 'justify-center' : 'justify-start gap-[10px]'"
        >
          <Icon 
            name="material-symbols:logout-rounded" 
            class="transition-transform duration-300 flex-shrink-0 hover:scale-110"
            :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-6 h-6' : 'w-5 h-5'"
          />
          <span 
            v-if="!isSidebarCollapsed || isMobileMenuOpen"
            class="truncate font-medium text-[14px] block"
          >
            {{ t('logout') || 'Hesabdan Çıx' }}
          </span>
        </NuxtLink>
      </div>

    </aside>
  </div>
</template>

<style scoped>
/* Hidden scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}
.custom-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* Ensure smooth grid expansion */
.grid {
  transition: grid-template-rows 0.3s ease-in-out;
}
</style>
