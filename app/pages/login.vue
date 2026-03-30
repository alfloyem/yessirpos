<script setup lang="ts">
import { useI18n, useLocalePath } from '#i18n'
import { useAuth, navigateTo, definePageMeta, useColorMode, useToast, useRuntimeConfig } from '#imports'
import { ref, onMounted, onUnmounted, Transition } from 'vue'
import { useServerConfig } from '~/composables/useServerConfig'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAuth()
const { activeUrl, activeClientId, setConfig, isCustomConfig } = useServerConfig()
const toast = useToast()

definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const isPageLoaded = ref(false)
const currentYear = ref(new Date().getFullYear())

// Terminal Setup Modal State
const showTerminalSetup = ref(false)
const setupUrl = ref(activeUrl.value)
const setupClientId = ref(activeClientId.value)

// Keyboard Listener for Secret Combo (Ctrl+Shift+Alt+P)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    showTerminalSetup.value = !showTerminalSetup.value
  }
}

const colorMode = useColorMode()
onMounted(() => {
  colorMode.preference = 'light'
  window.addEventListener('keydown', handleKeydown)
  
  setTimeout(() => {
    isPageLoaded.value = true
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const applyTerminalSetup = () => {
  if (!setupUrl.value) return
  setConfig(setupUrl.value, setupClientId.value)
  showTerminalSetup.value = false
  toast.success('Terminal ayarları yadda saxlanıldı')
}

const handleLogin = async () => {
  if (loading.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    // Dynamic login call
    const response = await $fetch<any>(activeUrl.value + '/api/auth/login', {
      method: 'POST',
      body: { 
        username: email.value, 
        password: password.value 
      }
    })
    
    if (response?.token) {
      login(response.token, response.user)
      toast.success(t('toast.loginSuccess'))
      navigateTo(localePath('/'))
    }
  } catch (err: any) {
    const errorMsg = err.data?.statusMessage || t('toast.loginFailed')
    error.value = errorMsg
    toast.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-app)] to-[var(--input-bg)] relative overflow-hidden font-sans">
    
    <!-- Animated Decoration Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-10 w-72 h-72 bg-[var(--text-primary)] opacity-5 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-[var(--text-primary)] opacity-5 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      
      <!-- Terminal Indicator (Bottom Left) -->
      <div v-if="isCustomConfig()" class="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] font-bold text-green-600 uppercase tracking-widest opacity-60">
        <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        Xüsusi Terminal Aktivdir
      </div>
    </div>

    <!-- Terminal Setup Modal (Secret) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition-all duration-200 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showTerminalSetup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
        <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-7 transform transition-transform">
          <div class="text-center space-y-2">
            <div class="w-14 h-14 bg-[var(--text-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-[var(--text-primary)]">
               <UiIcon name="lucide:monitor-dot" size="lg" />
            </div>
            <h2 class="text-xl font-bold text-[var(--text-app)]">Terminal Qurulumu</h2>
            <p class="text-xs text-[var(--text-app)] opacity-50 px-4">Xüsusi server və müştəri ID-sini buradan təyin edin.</p>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-[11px] font-bold text-[var(--text-app)] opacity-40 uppercase tracking-widest ml-1">Server URL</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-30">
                  <UiIcon name="lucide:globe" size="sm" />
                </div>
                <input v-model="setupUrl" type="url" placeholder="https://api.yoursite.com"
                  class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 transition-all font-mono" />
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold text-[var(--text-app)] opacity-40 uppercase tracking-widest ml-1">Müştəri (Client) ID</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-30">
                  <UiIcon name="lucide:hash" size="sm" />
                </div>
                <input v-model="setupClientId" type="text" placeholder="bakustreet"
                  class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 transition-all uppercase font-mono" />
              </div>
            </div>
          </div>

          <div class="flex gap-2.5">
             <UiButton variant="outline" class="flex-1" @click="showTerminalSetup = false">Ləğv Et</UiButton>
             <UiButton variant="primary" class="flex-1" @click="applyTerminalSetup" :disabled="!setupUrl">Saxla</UiButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Login Card -->
    <Transition
      enter-active-class="transition-all duration-700 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-8"
      enter-to-class="opacity-100 scale-100 translate-y-0"
    >
      <div 
        v-if="isPageLoaded"
        class="w-full max-w-md relative z-10"
      >
        <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-2xl shadow-2xl p-8 md:p-12 space-y-8 backdrop-blur-sm">
          <!-- Logo & Title -->
          <div class="space-y-6 text-center">
            <!-- Logo -->
            <div class="flex justify-center">
              <img 
                src="~/assets/images/logo/logo.svg" 
                alt="YESSIR POS" 
                class="h-16 w-auto"
              />
            </div>

            <!-- Divider -->
            <div class="flex items-center gap-4">
              <div class="flex-1 h-px bg-[var(--border-app)]"></div>
              <span class="text-xs text-[var(--text-app)] opacity-40 font-medium">{{ t('loginPage.title') }}</span>
              <div class="flex-1 h-px bg-[var(--border-app)]"></div>
            </div>
          </div>

          <!-- Error Message -->
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 -translate-y-2"
            leave-active-class="transition-all duration-300"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div 
              v-if="error" 
              class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
            >
              <UiIcon name="lucide:alert-circle" size="lg" class="text-red-500 flex-shrink-0" />
              <p class="text-sm text-red-500 font-medium">
                {{ error }}
              </p>
            </div>
          </Transition>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- Email Input -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-[var(--text-app)] opacity-80">
                {{ t('loginPage.username') }}
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-40">
                  <UiIcon name="lucide:user" size="md" />
                </div>
                <input 
                  v-model="email"
                  type="text" 
                  class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-[var(--text-primary)] focus:ring-2 focus:ring-[var(--text-primary)]/20 transition-all placeholder:opacity-40 disabled:opacity-50 disabled:cursor-not-allowed"
                  :placeholder="t('loginPage.usernamePlaceholder')"
                  required
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-[var(--text-app)] opacity-80">
                {{ t('loginPage.password') }}
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-40">
                  <UiIcon name="lucide:lock" size="md" />
                </div>
                <input 
                  v-model="password"
                  type="password" 
                  class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-[var(--text-primary)] focus:ring-2 focus:ring-[var(--text-primary)]/20 transition-all placeholder:opacity-40 disabled:opacity-50 disabled:cursor-not-allowed"
                  :placeholder="t('loginPage.passwordPlaceholder')"
                  required
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit"
              class="w-full bg-[var(--text-primary)] text-white rounded-xl py-4 text-sm font-semibold hover:bg-[var(--text-secondary)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[var(--text-primary)]/20 flex items-center justify-center gap-2"
              :disabled="loading"
            >
              <Transition
                mode="out-in"
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 scale-50"
                leave-active-class="transition-all duration-200"
                leave-to-class="opacity-0 scale-50"
              >
                <UiIcon 
                  v-if="loading"
                  key="loading"
                  name="lucide:refresh-cw" 
                  class="animate-spin w-5 h-5"
                />
                <UiIcon 
                  v-else
                  key="login"
                  name="lucide:log-in" 
                  class="w-5 h-5"
                />
              </Transition>
              <span>{{ loading ? t('loginPage.loading') : t('loginPage.submit') }}</span>
            </button>
          </form>

          <!-- Footer Info -->
          <div class="pt-4 border-t border-[var(--border-app)]">
            <p class="text-xs text-center text-[var(--text-app)] opacity-50">
              {{ t('loginPage.copyright', { year: currentYear }) }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 0.05;
    transform: scale(1);
  }
  50% {
    opacity: 0.08;
    transform: scale(1.05);
  }
}

.animate-pulse {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
