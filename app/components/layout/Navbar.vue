<script setup lang="ts">
import { useI18n } from '#i18n'
import { useNotifications } from '~/composables/useNotifications'
import { useRouter } from 'vue-router'

const { t, locales, locale, setLocale } = useI18n()
const colorMode = useColorMode()
const router = useRouter()

const now = ref(new Date())
const isSidebarCollapsed = useState('sidebarCollapsed', () => false)
const isMobileMenuOpen = useState('mobileMenuOpen', () => false)

// Notifications
const { unreadCount, notifications, loading, fetchNotifications, markAllAsRead, markAsRead } = useNotifications()
const isNotifOpen = ref(false)
const notifDropdownRef = ref<HTMLElement | null>(null)

const toggleNotifications = () => {
  isNotifOpen.value = !isNotifOpen.value
  if (isNotifOpen.value) {
    fetchNotifications()
  }
}

const handleNotificationClick = async (notif: any) => {
  if (!notif.isRead) {
    await markAsRead(notif.id)
  }
  isNotifOpen.value = false
  // Eventually we can route to specific objects here based on notif.type
  router.push('/notifications')
}

// Click outside to close notification dropdown
onMounted(() => {
  setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  // Set up polling for new notifications every minute
  fetchNotifications()
  setInterval(() => {
    if (!isNotifOpen.value) {
      fetchNotifications()
    }
  }, 60000)
  
  document.addEventListener('click', (e) => {
    if (notifDropdownRef.value && !notifDropdownRef.value.contains(e.target as Node)) {
      isNotifOpen.value = false
    }
  })
})

const formattedTime = computed(() => {
  return now.value.toLocaleDateString('az-AZ') + ' ' + now.value.toLocaleTimeString('az-AZ')
})

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}



import azFlag from '~/assets/images/flags/az.png'
import enFlag from '~/assets/images/flags/gb.png'
import ruFlag from '~/assets/images/flags/ru.png'

const languageFlags: Record<string, string> = {
  az: azFlag,
  en: enFlag,
  ru: ruFlag
}

const currentFlag = computed(() => languageFlags[locale.value])

const selectLanguage = (code: 'az' | 'en' | 'ru') => {
  setLocale(code)
}

</script>

<template>
  <header class="h-16 w-full flex items-center justify-between px-4 md:px-8 bg-[var(--bg-app)] border-b border-[var(--border-app)] sticky top-0 z-40">
    <!-- Navbar Left (Context specific) -->
    <div class="flex items-center gap-4">
      <!-- Desktop Toggle Button -->
      <button 
        @click="toggleSidebar"
        class="hidden md:block text-[var(--text-app)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] hover:scale-105 transition-all duration-300 cursor-pointer p-1"
      >
        <Icon name="lucide:align-left" class="w-7 h-7" />
      </button>

      <!-- Mobile Toggle Button -->
      <button 
        @click="toggleMobileMenu"
        class="md:hidden text-[var(--text-app)] hover:text-[var(--text-primary)] transition-all cursor-pointer p-1"
      >
        <Icon name="lucide:menu" class="w-7 h-7" />
      </button>

      <!-- Mobile Logo Placeholder (Only visible on mobile) -->
      <img src="~/assets/images/logo/typography.svg" alt="YESSIR POS" class="h-4 w-auto md:hidden ml-2" />
    </div>

    <!-- Right side items (Notifications, Time) -->
    <div class="flex items-center gap-4">
      <!-- Notification Dropdown -->
      <div ref="notifDropdownRef" class="relative">
        <button 
          @click="toggleNotifications"
          class="relative p-2 rounded-full text-[var(--text-app)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors"
        >
          <Icon name="lucide:bell" class="w-5 h-5" />
          <span 
            v-if="unreadCount > 0"
            class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <Transition name="dropdown">
          <div 
            v-if="isNotifOpen" 
            class="absolute right-0 mt-2 w-80 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-[14px] shadow-2xl z-50 overflow-hidden"
          >
            <div class="flex items-center justify-between p-3 border-b border-[var(--border-app)]">
              <h3 class="font-bold text-[14px] text-[var(--text-primary)]">{{ t('notifications.title', 'Bildirişlər') }}</h3>
              <button 
                v-if="unreadCount > 0"
                @click="markAllAsRead" 
                class="text-[11px] text-[var(--text-app)] opacity-60 hover:opacity-100 transition-opacity"
              >
                {{ t('notifications.markAllRead', 'Hamısını oxunmuş et') }}
              </button>
            </div>
            
            <div class="max-h-80 overflow-y-auto">
              <div v-if="loading && notifications.length === 0" class="p-4 text-center text-sm opacity-50">Yüklənir...</div>
              <div v-else-if="notifications.length === 0" class="p-8 text-center text-sm opacity-50">
                <Icon name="lucide:bell-off" class="w-8 h-8 mx-auto mb-2 opacity-30" />
                {{ t('notifications.empty', 'Hazırda heç bir bildiriş yoxdur') }}
              </div>
              <div 
                v-else
                v-for="notif in notifications" 
                :key="notif.id"
                class="relative p-3 border-b border-[var(--border-app)] last:border-0 hover:bg-[var(--text-primary)]/5 transition-colors cursor-pointer"
                :class="!notif.isRead ? 'bg-[var(--text-primary)]/[0.03]' : ''"
                @click="handleNotificationClick(notif)"
              >
                <div class="flex justify-between items-start mb-1">
                  <span class="font-semibold text-[13px]" :class="!notif.isRead ? 'text-[var(--text-primary)]' : 'text-[var(--text-app)]'">
                    {{ notif.title }}
                  </span>
                  <span class="text-[10px] opacity-50 whitespace-nowrap ml-2">
                    {{ new Date(notif.createdAt).toLocaleDateString('az-AZ') }} {{ new Date(notif.createdAt).toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'}) }}
                  </span>
                </div>
                <p class="text-[12px] opacity-70 leading-relaxed">{{ notif.message }}</p>
                <div v-if="!notif.isRead" class="absolute left-0 top-0 bottom-0 w-[3px] bg-red-400"></div>
              </div>
            </div>
            
            <div class="p-2 border-t border-[var(--border-app)] bg-[var(--bg-app)]">
              <NuxtLink 
                to="/notifications" 
                @click="isNotifOpen = false"
                class="block w-full text-center py-2 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 rounded-lg transition-colors"
              >
                {{ t('common.showAll', 'Hamısına bax') }}
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Digital Clock -->
      <div class="hidden md:flex items-center gap-2 text-[var(--text-app)] opacity-70 text-[13px] font-medium tracking-wide">
        <Icon name="lucide:clock" class="w-4 h-4 text-[var(--text-primary)] opacity-80" />
        <span>{{ formattedTime }}</span>
      </div>
    </div>
  </header>
</template>


<style scoped>
/* Theme switch animation */
.theme-switch-enter-active,
.theme-switch-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-switch-enter-from {
  opacity: 0;
  transform: rotate(-180deg) scale(0.3);
}

.theme-switch-leave-to {
  opacity: 0;
  transform: rotate(180deg) scale(0.3);
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Menu icon animation */
.menu-icon-enter-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.menu-icon-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.menu-icon-enter-from {
  opacity: 0;
  transform: rotate(-180deg) scale(0.3);
}

.menu-icon-leave-to {
  opacity: 0;
  transform: rotate(180deg) scale(0.3);
}
</style>
