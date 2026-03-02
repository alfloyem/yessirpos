<script setup lang="ts">
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
  xs: 'w-4 h-4',      // 16px
  sm: 'w-5 h-5',      // 20px
  md: 'w-6 h-6',      // 24px
  lg: 'w-8 h-8',      // 32px
  xl: 'w-10 h-10',    // 40px
  sidebar: 'w-[43px] h-[43px]' // 43px - sidebar menu icon size
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
