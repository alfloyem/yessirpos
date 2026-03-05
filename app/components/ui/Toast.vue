<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

const props = defineProps<ToastProps>()
const emit = defineEmits<{
  remove: [id: string]
}>()

const isVisible = ref(false)
const progress = ref(100)

const iconName = computed(() => {
  switch (props.type) {
    case 'success': return 'lucide:check-circle'
    case 'error': return 'lucide:x-circle'
    case 'warning': return 'lucide:alert-triangle'
    case 'info': return 'lucide:info'
    default: return 'lucide:info'
  }
})

const colorClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bg-[var(--color-brand-success)]/10 border-[var(--color-brand-success)]/30 text-[var(--color-brand-success)]'
    case 'error': return 'bg-[var(--color-brand-danger)]/10 border-[var(--color-brand-danger)]/30 text-[var(--color-brand-danger)]'
    case 'warning': return 'bg-[var(--color-brand-warning)]/10 border-[var(--color-brand-warning)]/30 text-[var(--color-brand-warning)]'
    case 'info': return 'bg-[var(--color-brand-info)]/10 border-[var(--color-brand-info)]/30 text-[var(--color-brand-info)]'
    default: return 'bg-[var(--bg-sidebar)] border-[var(--border-app)] text-[var(--text-app)]'
  }
})

const progressColorClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bg-[var(--color-brand-success)]'
    case 'error': return 'bg-[var(--color-brand-danger)]'
    case 'warning': return 'bg-[var(--color-brand-warning)]'
    case 'info': return 'bg-[var(--color-brand-info)]'
    default: return 'bg-[var(--text-primary)]'
  }
})

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 10)

  const duration = props.duration || 5000
  const interval = 50
  const decrement = (interval / duration) * 100

  const timer = setInterval(() => {
    progress.value -= decrement
    if (progress.value <= 0) {
      clearInterval(timer)
      handleClose()
    }
  }, interval)
})

const handleClose = () => {
  isVisible.value = false
  setTimeout(() => {
    emit('remove', props.id)
  }, 300)
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 min-w-[320px] max-w-[400px]"
    :class="[
      colorClass,
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    ]"
  >
    <div class="flex items-start gap-3 p-4">
      <UiIcon :name="iconName" class="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p class="flex-1 text-sm font-medium text-[var(--text-app)] leading-relaxed">
        {{ message }}
      </p>
      <button
        @click="handleClose"
        class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <UiIcon name="lucide:x" class="w-4 h-4" />
      </button>
    </div>
    
    <!-- Progress Bar -->
    <div class="h-1 bg-black/10">
      <div
        class="h-full transition-all duration-50 ease-linear"
        :class="progressColorClass"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>
