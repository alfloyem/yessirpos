<script setup>
import { useI18n } from '#i18n'
const { t, locales, locale, setLocale } = useI18n()
const colorMode = useColorMode()

const now = ref(new Date())
const isLangDropdownOpen = ref(false)

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

const languageFlags = {
  az: '/images/flags/azerbaijan.png',
  en: '/images/flags/england.png',
  ru: '/images/flags/russia.png'
}

const currentFlag = computed(() => languageFlags[locale.value])

const selectLanguage = (code) => {
  setLocale(code)
  isLangDropdownOpen.value = false
}

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-dropdown')) {
      isLangDropdownOpen.value = false
    }
  })
})
</script>

<template>
  <header class="h-16 w-full flex items-center justify-between px-8 bg-[var(--bg-app)] border-b border-[var(--border-app)] sticky top-0 z-40">
    <!-- Navbar Left (Context specific) -->
    <div class="flex items-center gap-4">
      <button class="text-[var(--text-app)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] transition-all">
        <Icon name="solar:hamburger-menu-bold-duotone" class="w-6 h-6" />
      </button>
      <h2 class="text-base font-bold text-[var(--text-app)] truncate">
        {{ t('dashboard') }}
      </h2>
    </div>

    <!-- Navbar Right (Actions) -->
    <div class="flex items-center gap-6">
      <!-- Digital Clock -->
      <div class="hidden md:flex items-center gap-2 text-[var(--text-app)] opacity-80 text-xs font-medium bg-[var(--input-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] transition-all">
        <Icon name="solar:clock-circle-bold-duotone" class="w-4 h-4 text-[var(--text-primary)]" />
        <span>{{ formattedTime }}</span>
      </div>

      <!-- Language Switcher & Theme Toggle -->
      <div class="flex items-center gap-3 pl-6 border-l border-[var(--border-app)]">
        <!-- Language Dropdown -->
        <div class="relative lang-dropdown">
          <button 
            @click="isLangDropdownOpen = !isLangDropdownOpen"
            class="w-10 h-10 flex items-center justify-center bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg hover:border-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer overflow-hidden"
          >
            <img :src="currentFlag" :alt="locale" class="w-6 h-6 object-cover rounded" />
          </button>

          <!-- Dropdown Menu -->
          <Transition name="dropdown">
            <div 
              v-if="isLangDropdownOpen"
              class="absolute top-12 right-0 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]"
            >
              <button
                v-for="l in locales"
                :key="l.code"
                @click="selectLanguage(l.code)"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                :class="locale === l.code ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-app)]'"
              >
                <img :src="languageFlags[l.code]" :alt="l.name" class="w-5 h-5 object-cover rounded" />
                <span>{{ l.name }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Theme Toggle -->
        <button 
          @click="toggleTheme"
          class="w-10 h-10 flex items-center justify-center bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg hover:border-[var(--text-primary)] hover:scale-105 transition-all group cursor-pointer"
        >
          <Transition name="theme-switch" mode="out-in">
            <Icon 
              v-if="colorMode.value === 'dark'"
              key="moon"
              name="solar:moon-bold-duotone" 
              class="w-5 h-5 text-[var(--text-primary)]"
            />
            <Icon 
              v-else
              key="sun"
              name="solar:sun-bold-duotone" 
              class="w-5 h-5 text-[var(--text-primary)]"
            />
          </Transition>
        </button>
      </div>

      <!-- User Info -->
      <div class="flex items-center gap-3 pl-4 border-l border-[var(--border-app)]">
        <div class="flex flex-col text-right">
          <span class="text-xs font-bold text-[var(--text-app)]">{{ t('user.name') }}</span>
          <span class="text-[10px] text-[var(--text-app)] opacity-60">{{ t('user.role') }}</span>
        </div>
        <div class="w-10 h-10 rounded-lg bg-[var(--text-primary)] text-white flex items-center justify-center font-bold text-sm border hover:opacity-80 transition-all cursor-pointer">
          {{ t('user.initials') }}
        </div>
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
</style>
