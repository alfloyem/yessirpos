<script setup>
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAuth()

definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')

const handleLogin = () => {
  login('mock-jwt-token')
  navigateTo(localePath('/'))
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8 bg-app-bg text-app-text">
    <div class="w-full max-w-[320px] space-y-12">
      <!-- Minimalist Brand -->
      <div class="space-y-2">
        <h1 class="text-2xl font-serif font-black tracking-tight">
          YESSIR<span class="opacity-40">POS</span>
        </h1>
        <div class="h-[1px] w-8 bg-current opacity-20"></div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <input 
            v-model="email"
            type="email" 
            class="w-full bg-app-input border border-app-border px-4 py-3 text-sm outline-none focus:border-[#8745f3] focus:ring-1 focus:ring-[#8745f3]/20 transition-all placeholder:opacity-30"
            :placeholder="t('email')"
            required
          />
          <input 
            v-model="password"
            type="password" 
            class="w-full bg-app-input border border-app-border px-4 py-3 text-sm outline-none focus:border-[#8745f3] focus:ring-1 focus:ring-[#8745f3]/20 transition-all placeholder:opacity-30"
            :placeholder="t('password')"
            required
          />
        </div>

        <button 
          type="submit"
          class="w-full bg-[#8745f3] text-white py-4 text-[10px] font-black tracking-[0.3em] uppercase hover:bg-[#6b2dd9] hover:shadow-lg hover:shadow-[#8745f3]/30 active:scale-[0.98] transition-all"
        >
          {{ t('submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
