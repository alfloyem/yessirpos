<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '#i18n'
import { useState } from '#imports'
// @ts-ignore
import yessirIcon from '~/assets/images/yessir_icon.svg'
// @ts-ignore
import yessirTextLogo from '~/assets/images/yessir_pos_text_logo.svg'

const { t } = useI18n()
const { logout, user } = useAuth()
const route = useRoute()

const isSidebarCollapsed = useState<boolean>('sidebarCollapsed', () => false)
const isMobileMenuOpen = useState<boolean>('mobileMenuOpen', () => false)

// Define menu structure with translation keys
const menu = ref([
  {
    title: 'Əsas',
    titleKey: 'menu.main_category',
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
    titleKey: 'menu.customers_category',
    icon: 'lucide:users',
    isOpen: false,
    children: [
      { title: 'Müştərilər', titleKey: 'menu.customers', to: '/customers' }, 
      { title: 'Hədiyyə Kartı', titleKey: 'menu.giftCard', to: '/gift-cards' }
    ]
  },
  {
    title: 'Anbar',
    titleKey: 'menu.inventory_category',
    icon: 'lucide:package',
    isOpen: false,
    children: [
      { title: 'Mallar', titleKey: 'menu.products', to: '/products' },
      { title: 'Atributlar', titleKey: 'menu.attributes', to: '/attributes' }
    ]
  },
  {
    title: 'Təchizat',
    titleKey: 'menu.suppliers_category',
    icon: 'lucide:truck',
    isOpen: false,
    children: [
      { title: 'Tədarükçülər', titleKey: 'menu.suppliers', to: '/suppliers' },
      { title: 'Qəbul Edilənlər', titleKey: 'menu.intake', to: '/received' }
    ]
  },
  {
    title: 'Maliyyə',
    titleKey: 'menu.finance_category',
    icon: 'lucide:pie-chart',
    isOpen: false,
    children: [
      { title: 'Xərclər', titleKey: 'menu.expenses', to: '/expenses' },
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
    const activeMenu = menu.value[activeIndex]
    if (activeMenu) {
      activeMenu.isOpen = true
    }
  }
})

// Auto-close categories when sidebar collapses for smooth animation
watch(isSidebarCollapsed, (collapsed) => {
  if (collapsed) {
    menu.value.forEach(m => m.isOpen = false)
  }
})

// Watch route to update active states
watch(() => route.path, () => {
  if (!isSidebarCollapsed.value) {
    const activeIndex = menu.value.findIndex(item => isActiveMenu(item))
    if (activeIndex !== -1) {
      const activeMenu = menu.value[activeIndex]
      if (activeMenu) {
        activeMenu.isOpen = true
      }
    }
  }
})

const toggleMenu = (index: number) => {
  if (isSidebarCollapsed.value && window.innerWidth >= 768) {
    // If we are collapsed, clicking a menu expanding it shouldn't expand the whole sidebar based on your CSS,
    // but typically to see children inline we need to expand. We'll leave it as is.
    isSidebarCollapsed.value = false;
  }
  
  const targetMenu = menu.value[index];
  if (!targetMenu) return; // Fix TS undefined error
  
  const isCurrentlyOpen = targetMenu.isOpen;
  
  // Close all submenus
  menu.value.forEach(m => m.isOpen = false);
  
  // Toggle the clicked one
  targetMenu.isOpen = !isCurrentlyOpen;
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

// Easter egg: Triple click on logo to play music
const clickCount = ref(0)
let clickTimer: NodeJS.Timeout | null = null
const audio = ref<HTMLAudioElement | null>(null)

const handleLogoClick = () => {
  clickCount.value++
  
  // Reset click count after 1 second
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickCount.value = 0
  }, 1000)
  
  // If triple clicked
  if (clickCount.value === 3) {
    clickCount.value = 0
    playEasterEgg()
  }
}

const playEasterEgg = () => {
  try {
    if (!audio.value) {
      audio.value = new Audio('/nefes_easter_egg.mp3')
    }
    
    if (audio.value.paused) {
      audio.value.play()
    } else {
      audio.value.pause()
      audio.value.currentTime = 0
    }
  } catch (error) {
    console.error('Easter egg audio error:', error)
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (clickTimer) clearTimeout(clickTimer)
  if (audio.value) {
    audio.value.pause()
    audio.value = null
  }
})

const userRoles = computed(() => {
  if (!user.value?.role) return []
  try {
    const roles = typeof user.value.role === 'string' && user.value.role.startsWith('[') 
      ? JSON.parse(user.value.role) 
      : user.value.role
    return Array.isArray(roles) ? roles : [roles]
  } catch (e) {
    return [user.value.role]
  }
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
      class="bg-[var(--bg-app)] flex flex-col h-full border-r border-[var(--border-app)] transition-all duration-300 ease-in-out fixed md:relative z-50 top-0 left-0 font-sans"
      :class="[
        isSidebarCollapsed ? 'md:w-[92px]' : 'md:w-[282px]',
        isMobileMenuOpen ? 'w-[282px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden md:overflow-visible'
      ]"
    >
      <!-- Logo Area -->
      <div 
        class="flex items-center shrink-0 border-b border-[var(--border-app)] h-[64px] py-3 w-full transition-all duration-300 px-5"
      >
        <div 
          class="h-full flex items-center overflow-hidden h-full transition-all duration-300 px-4"
        >
          <!-- Emblem Always Visible -->
          <img 
            :src="yessirIcon" 
            alt="Logo Icon" 
            class="h-full w-fit object-contain transition-all duration-300 cursor-pointer select-none !h-[42px] !w-[42px] flex-shrink-0"
            @click="handleLogoClick"
          />
          <!-- Text Smoothly Hides without Scale -->
          <img 
            :src="yessirTextLogo" 
            alt="Logo Text" 
            class="h-full flex-shrink-0 transition-all duration-300 ease-in-out object-contain"
            :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0 invisible ml-0' : 'w-[120px] opacity-100 visible'"
          />
        </div>

        <!-- Mobile X Close Button -->
        <button 
          v-if="isMobileMenuOpen" 
          @click="toggleSidebarMobileContext"
          class="md:hidden flex items-center justify-center p-1 text-[var(--text-app)] hover:text-[var(--text-primary)] transition-colors duration-300 shrink-0 absolute right-3"
        >
          <Icon name="lucide:x" class="w-6 h-6" />
        </button>
      </div>

      <!-- Navigation List Container -->
      <div 
        class="flex-1 flex flex-col p-3 custom-scrollbar"
        :class="isSidebarCollapsed && !isMobileMenuOpen ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'"
      >
        <div class="flex flex-col gap-2">
          
          <div v-for="(item, index) in menu" :key="index" class="relative group/sidebaritem">
            <!-- Parent Category Button -->
            <button 
              @click="toggleMenu(index)"
              class="flex items-center rounded-[12px] text-[var(--text-app)] bg-transparent hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-all duration-300 ease-in-out cursor-pointer outline-none overflow-hidden font-sans px-6 w-full"
              :class="[
                (item.isOpen || isActiveMenu(item)) && !isSidebarCollapsed ? 'text-[var(--text-primary)] font-medium' : 'opacity-80',
                'h-[48px]'
              ]"
            >
              <div 
                class="flex items-center overflow-visible flex-1" 
                :class="(isSidebarCollapsed && !isMobileMenuOpen) ? 'justify-center' : ''"
              >
                <Icon 
                  :name="item.icon" 
                  class="flex-shrink-0 transition-all duration-300 group-hover/sidebaritem:scale-110 mx-auto"
                  :class="[
                    isSidebarCollapsed && !isMobileMenuOpen ? 'w-[26px] h-[26px]' : 'w-6 h-6',
                    (item.isOpen || isActiveMenu(item)) && !isSidebarCollapsed ? 'text-[var(--text-primary)]' : 'opacity-80 group-hover/sidebaritem:opacity-100'
                  ]"
                />
                <span 
                  class="font-semibold text-[15px] text-left whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out flex-grow"
                  :style="{ transitionProperty: 'width, opacity, margin, transform' }"
                  :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-[124px] opacity-100 ml-3 translate-x-0'"
                >
                  {{ getTitle(item) }}
                </span>
              </div>
              
              <!-- Arrow Icon -->
              <div 
                class="transition-all duration-300 ease-in-out flex items-center justify-center overflow-hidden"
                :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0 -translate-x-4' : 'w-4 opacity-100'"
              >
                <Icon 
                  name="lucide:chevron-down" 
                  class="flex-shrink-0 transition-transform duration-300 ease-in-out w-4 h-4"
                  :class="[
                    !isSidebarCollapsed && !isMobileMenuOpen ? 'opacity-60' : 'opacity-0',
                    item.isOpen ? 'rotate-180 text-[var(--text-primary)] opacity-100' : 'rotate-0'
                  ]"
                />
              </div>
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
              :class="item.isOpen ? 'grid-rows-[1fr] opacity-100 h-fit' : 'h-1 grid-rows-[0fr] opacity-0 pointer-events-none'"
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
      
      <!-- User Info Area -->
      <div 
        v-if="user" 
        class="px-3 pb-2 shrink-0 overflow-hidden transition-all duration-300"
        :class="isSidebarCollapsed && !isMobileMenuOpen ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100 h-auto mt-auto py-3 border-t border-[var(--border-app)]'"
      >
        <div class="flex items-center gap-3 px-3">
          <!-- Avatar Placeholder -->
          <div class="w-10 h-10 rounded-full bg-[var(--text-primary)]/10 flex items-center justify-center shrink-0 border border-[var(--text-primary)]/20 shadow-sm">
            <span class="text-[var(--text-primary)] font-bold text-sm">
              {{ (user.firstName?.[0] || '') + (user.lastName?.[0] || '') }}
            </span>
          </div>
          
          <div class="flex flex-col min-w-0 pr-2">
            <span class="text-[14px] font-bold text-[var(--text-app)] truncate">
              {{ user.firstName }} {{ user.lastName }}
            </span>
            <div class="flex items-center flex-wrap gap-1 mt-0.5 opacity-60">
              <span 
                v-for="(role, idx) in userRoles" 
                :key="role"
                class="text-[11px] font-medium text-[var(--text-app)] whitespace-nowrap"
              >
                {{ role }}{{ idx < userRoles.length - 1 ? ' • ' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Exit Account -->
      <div class="p-3 shrink-0">
        <button 
          @click="logout"
          draggable="false"
          class="flex items-center rounded-[12px] text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-all duration-300 cursor-pointer mx-auto w-full h-[48px] border-none outline-none"
          :class="isSidebarCollapsed && !isMobileMenuOpen ? 'justify-center px-4' : 'justify-start gap-[10px] px-3'"
        >
          <Icon 
            name="material-symbols:logout-rounded" 
            class="transition-transform duration-300 flex-shrink-0 hover:scale-110"
            :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-6 h-6' : 'w-5 h-5'"
          />
          <span 
            class="font-medium text-[14px] transition-all duration-300 ease-in-out"
            :class="isSidebarCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0 -translate-x-2 hidden md:block' : 'w-auto opacity-100 translate-x-0 truncate'"
          >
            {{ t('logout') || 'Hesabdan Çıx' }}
          </span>
        </button>
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

/* Ensure ultra-smooth grid expansion */
.grid {
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
