<script setup lang="ts">
const props = defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
  icon?: string
  disabled?: boolean
  clearable?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'clear'])

const handleInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="relative group w-full">
    <!-- Left Icon -->
    <UiIcon 
      v-if="icon" 
      :name="icon" 
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-app)] opacity-40 group-focus-within:text-[var(--text-primary)] group-focus-within:opacity-100 transition-colors pointer-events-none" 
    />
    
    <!-- Input Element -->
    <input 
      :type="type || 'text'" 
      :value="modelValue"
      @input="handleInput"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :class="[icon ? 'pl-10' : 'pl-4', clearable ? 'pr-10' : 'pr-4']"
    />
    
    <!-- Clear Button -->
    <button 
      v-if="clearable && modelValue"
      @click="clear"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all flex items-center justify-center w-5 h-5 rounded-full"
    >
      <UiIcon name="solar:close-circle-bold" class="w-4 h-4" />
    </button>
  </div>
</template>
