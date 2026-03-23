<script setup>
import { useI18n } from '#i18n'
const { t, locales, locale, setLocale } = useI18n()
const colorMode = useColorMode()

const now = ref(new Date())
const isSidebarCollapsed = useState('sidebarCollapsed', () => false)
const isMobileMenuOpen = useState('mobileMenuOpen', () => false)

onMounted(() => {
  setInterval(() => {
    now.value = new Date()
  }, 1000)
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

const languageFlags = {
  az: azFlag,
  en: enFlag,
  ru: ruFlag
}

const currentFlag = computed(() => languageFlags[locale.value])

const selectLanguage = (code) => {
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

    <!-- Digital Clock -->
    <div class="hidden md:flex items-center gap-2 text-[var(--text-app)] opacity-70 text-[13px] font-medium tracking-wide">
      <Icon name="lucide:clock" class="w-4 h-4 text-[var(--text-primary)] opacity-80" />
      <span>{{ formattedTime }}</span>
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
