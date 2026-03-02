<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  maxWidth?: string // e.g. 'sm', 'md', 'lg', 'xl', '2xl'
}>()

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

// Close on Escape key
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))

// Prevent scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm': return 'max-w-sm'
    case 'md': return 'max-w-md'
    case 'lg': return 'max-w-lg'
    case 'xl': return 'max-w-xl'
    case '2xl': return 'max-w-2xl'
    case '3xl': return 'max-w-3xl'
    case '4xl': return 'max-w-4xl'
    case 'full': return 'max-w-full m-4'
    default: return 'max-w-lg'
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-show="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style="margin: 0;">
        
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-[#25293c]/50 backdrop-blur-sm transition-opacity"
          @click="close"
        ></div>

        <!-- Dialog -->
        <div 
          class="relative w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] transition-all"
          :class="maxWidthClass"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-app)]">
            <h3 class="text-lg font-bold text-[var(--text-app)]">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button 
              @click="close" 
              class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-app)] opacity-50 hover:opacity-100 hover:bg-[var(--border-app)] transition-all"
            >
              <Icon name="solar:close-circle-bold-duotone" class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto flex-1">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-[var(--border-app)] bg-[var(--bg-app)] rounded-b-xl flex items-center justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
