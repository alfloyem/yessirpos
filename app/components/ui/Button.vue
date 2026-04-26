<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost' | 'soft' | 'soft-danger' | 'soft-primary'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  icon?: string
  iconRight?: string
  loading?: boolean
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()

const baseClasses = "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 outline-none disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale cursor-pointer focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-primary)]/20 active:scale-[0.97] active:brightness-90"

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-10 px-5 text-[14px] rounded-2xl gap-2 font-bold tracking-wide'
    case 'lg': return 'h-14 px-10 text-[18px] rounded-[24px] gap-3 font-bold tracking-wide'
    case 'icon': return 'h-12 w-12 rounded-[20px]'
    case 'md':
    default: return 'h-12 px-7 text-[16px] rounded-[20px] gap-2.5 font-bold tracking-wide'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary': 
    case 'soft-primary':
      return 'text-[var(--text-primary)] bg-[var(--text-primary)]/10 border border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/20 hover:border-[var(--text-primary)]/30'
      
    case 'danger': 
    case 'soft-danger':
      return 'text-[var(--color-brand-danger)] bg-[var(--color-brand-danger)]/10 hover:bg-[var(--color-brand-danger)]/20 border border-[var(--color-brand-danger)]/20 hover:border-[var(--color-brand-danger)]/30'
      
    case 'warning': 
      return 'text-[var(--color-brand-warning)] bg-[var(--color-brand-warning)]/10 hover:bg-[var(--color-brand-warning)]/20 border border-[var(--color-brand-warning)]/20 hover:border-[var(--color-brand-warning)]/30'
      
    case 'success': 
      return 'text-[var(--color-brand-success)] bg-[var(--color-brand-success)]/10 hover:bg-[var(--color-brand-success)]/20 border border-[var(--color-brand-success)]/20 hover:border-[var(--color-brand-success)]/30'
    
    case 'outline':
      return 'text-[var(--text-app)] bg-transparent border border-[var(--border-app)] hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20'
    
    case 'ghost':
      return 'text-[var(--text-app)] bg-transparent border border-transparent hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]'
      
    default: 
      return 'text-[var(--text-app)] bg-[var(--input-bg)] border border-[var(--border-app)] hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20'
  }
})
</script>

<template>
  <button 
    :type="type || 'button'"
    :disabled="disabled || loading"
    :class="[baseClasses, sizeClasses, variantClasses, block ? 'w-full' : '']"
  >
    <!-- Loading Spinner -->
    <UiIcon v-if="loading" name="lucide:loader-2" :size="size === 'sm' ? 'sm' : (size === 'lg' ? 'lg' : 'md')" class="animate-spin" />
    
    <!-- Left UiIcon -->
    <UiIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 'sm' : (size === 'lg' ? 'lg' : 'md')" />
    
    <!-- Slot Content -->
    <span v-if="$slots.default && size !== 'icon'" class="truncate">
      <slot />
    </span>

    <!-- Right Icon -->
    <UiIcon v-if="iconRight && !loading" :name="iconRight" :size="size === 'sm' ? 'sm' : (size === 'lg' ? 'lg' : 'md')" />
  </button>
</template>
