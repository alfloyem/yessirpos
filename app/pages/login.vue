<script setup lang="ts">
import { useI18n, useLocalePath } from '#i18n'
const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAuth()

definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (loading.value) return
  
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<any>('/api/auth/login', {
      method: 'POST',
      body: { 
        email: email.value, 
        password: password.value 
      }
    })
    
    if (response?.token) {
      login(response.token)
      navigateTo(localePath('/'))
    }
  } catch (err: any) {
    error.value = err.data?.statusMessage || 'Giriş Başarısız!'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8 bg-app-bg text-app-text">
    <div class="w-full max-w-[320px] space-y-12">
      <!-- Minimalist Brand -->
      <div class="space-y-4">
        <h1 class="text-2xl font-serif font-black tracking-tight">
          YESSIR<span class="opacity-40">POS</span>
        </h1>
        <div class="h-[1px] w-8 bg-current opacity-20"></div>
        <p v-if="error" class="text-[10px] text-red-500 font-bold uppercase tracking-wider">
          {{ error }}
        </p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <input 
            v-model="email"
            type="text" 
            class="w-full bg-app-input border border-app-border px-4 py-3 text-sm outline-none focus:border-app-text transition-all placeholder:opacity-30"
            placeholder="Username (admin)"
            required
            :disabled="loading"
          />
          <input 
            v-model="password"
            type="password" 
            class="w-full bg-app-input border border-app-border px-4 py-3 text-sm outline-none focus:border-app-text transition-all placeholder:opacity-30"
            placeholder="Password (admin)"
            required
            :disabled="loading"
          />
        </div>

        <button 
          type="submit"
          class="w-full bg-app-text text-app-bg py-4 text-[10px] font-black tracking-[0.3em] uppercase hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? '...' : t('submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
