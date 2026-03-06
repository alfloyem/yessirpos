<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'sidebar'
  color?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'currentColor',
  class: ''
})

const sizeClasses = {
  xs: 'w-3.5 h-3.5',  // 14px
  sm: 'w-4 h-4',      // 16px
  md: 'w-5 h-5',      // 20px
  lg: 'w-6 h-6',      // 24px
  xl: 'w-8 h-8',      // 32px
  sidebar: 'w-5 h-5'  // 20px
}

const iconClass = computed(() => {
  return `${sizeClasses[props.size]} ${props.class} flex-shrink-0 transition-all duration-200`
})
</script>

<template>
  <Icon 
    :name="name" 
    :class="iconClass"
    :style="{ color: color }"
    mode="svg"
  />
</template>
