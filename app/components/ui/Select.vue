<script setup lang="ts">
const props = defineProps<{
  modelValue: any
  options: { label: string, value: any }[]
  disabled?: boolean
  icon?: string
}>()

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative group w-full">
    <!-- Left Icon (Optional) -->
    <UiIcon 
      v-if="icon" 
      :name="icon" 
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-app)] opacity-40 group-focus-within:text-[var(--text-primary)] group-focus-within:opacity-100 transition-colors pointer-events-none z-10" 
    />

    <select 
      :value="modelValue"
      @change="e => emit('update:modelValue', (e.target as HTMLSelectElement).value)"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      :class="[icon ? 'pl-10' : 'pl-4', 'pr-10']"
    >
      <option value="" disabled selected hidden>Seç</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- Right Caret Icon -->
    <UiIcon name="solar:alt-arrow-down-bold-duotone" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] pointer-events-none opacity-50" />
  </div>
</template>
