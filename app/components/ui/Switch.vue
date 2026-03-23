<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <button 
    type="button"
    @click="toggle"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    :class="modelValue ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-app)]'"
  >
    <span 
      aria-hidden="true" 
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out"
      :class="modelValue ? 'translate-x-[20px]' : 'translate-x-0'"
    ></span>
  </button>
</template>
