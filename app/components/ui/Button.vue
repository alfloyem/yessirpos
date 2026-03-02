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

const baseClasses = "inline-flex items-center justify-center gap-2 font-bold transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'px-3 py-1.5 text-xs rounded-md'
    case 'lg': return 'px-6 py-3 text-base rounded-xl'
    case 'icon': return 'w-8 h-8 rounded-lg'
    case 'md':
    default: return 'px-4 py-2 text-sm rounded-lg'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary': 
      return 'text-white bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] shadow-md shadow-[var(--text-primary)]/30'
    case 'danger': 
      return 'text-white bg-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/90 shadow-md shadow-[var(--color-brand-danger)]/30'
    case 'warning': 
      return 'text-white bg-[var(--color-brand-warning)] hover:bg-[var(--color-brand-warning)]/90 shadow-md shadow-[var(--color-brand-warning)]/30'
    case 'success': 
      return 'text-white bg-[var(--color-brand-success)] hover:bg-[var(--color-brand-success)]/90 shadow-md shadow-[var(--color-brand-success)]/30'
    
    case 'soft-primary':
      return 'text-[var(--text-primary)] bg-[var(--text-primary)]/10 border border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)] hover:text-white shadow-sm'
    case 'soft-danger':
      return 'text-[var(--color-brand-danger)] bg-[var(--color-brand-danger)]/10 border border-[var(--color-brand-danger)]/20 hover:bg-[var(--color-brand-danger)] hover:text-white shadow-sm'
    
    case 'outline':
      return 'text-[var(--text-app)] bg-[var(--input-bg)] border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
    
    case 'ghost':
      return 'text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] border border-transparent'
      
    default: 
      return 'text-[var(--text-app)] bg-[var(--input-bg)] border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
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
    <Icon v-if="loading" name="solar:spinner-bold-duotone" class="w-4 h-4 animate-spin" />
    
    <!-- Left Icon -->
    <Icon v-else-if="icon" :name="icon" :class="size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'" />
    
    <!-- Slot Content -->
    <span v-if="$slots.default && size !== 'icon'">
      <slot />
    </span>

    <!-- Right Icon -->
    <Icon v-if="iconRight && !loading" :name="iconRight" :class="size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'" />
  </button>
</template>
