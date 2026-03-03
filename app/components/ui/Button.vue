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

const baseClasses = "inline-flex items-center justify-center font-medium transition-colors duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-primary)]/20"

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-8 px-3 text-xs rounded-md gap-1.5'
    case 'lg': return 'h-11 px-8 text-base rounded-xl gap-2.5'
    case 'icon': return 'h-10 w-10 rounded-lg'
    case 'md':
    default: return 'h-10 px-4 text-sm rounded-lg gap-2'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary': 
      return 'text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] border border-transparent'
    case 'danger': 
      return 'text-white bg-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/80 border border-transparent'
    case 'warning': 
      return 'text-white bg-[var(--color-brand-warning)] hover:bg-[var(--color-brand-warning)]/80 border border-transparent'
    case 'success': 
      return 'text-white bg-[var(--color-brand-success)] hover:bg-[var(--color-brand-success)]/80 border border-transparent'
    
    case 'soft-primary':
      return 'text-[var(--text-primary)] bg-[var(--text-primary)]/10 hover:bg-[var(--text-primary)]/20 border border-transparent'
    case 'soft-danger':
      return 'text-[var(--color-brand-danger)] bg-[var(--color-brand-danger)]/10 hover:bg-[var(--color-brand-danger)]/20 border border-transparent'
    
    case 'outline':
      return 'text-[var(--text-app)] bg-transparent border border-[var(--border-app)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)] hover:border-[var(--border-app)]'
    
    case 'ghost':
      return 'text-[var(--text-app)] bg-transparent border border-transparent hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]'
      
    default: 
      return 'text-[var(--text-app)] bg-[var(--input-bg)] border border-[var(--border-app)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]'
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
    <UiIcon v-if="loading" name="lucide:loader-2" :size="size === 'sm' ? 'xs' : (size === 'lg' ? 'md' : 'sm')" class="animate-spin" />
    
    <!-- Left UiIcon -->
    <UiIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 'xs' : (size === 'lg' ? 'md' : 'sm')" />
    
    <!-- Slot Content -->
    <span v-if="$slots.default && size !== 'icon'" class="truncate">
      <slot />
    </span>

    <!-- Right Icon -->
    <UiIcon v-if="iconRight && !loading" :name="iconRight" :size="size === 'sm' ? 'xs' : (size === 'lg' ? 'md' : 'sm')" />
  </button>
</template>
