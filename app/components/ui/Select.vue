<script setup lang="ts">
const props = defineProps<{
  modelValue: any
  options: { label: string, value: any }[]
  disabled?: boolean
  icon?: string
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectedLabel = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : 'Seç'
})

const selectOption = (value: any) => {
  emit('update:modelValue', value)
  isOpen.value = false
}
</script>

<template>
  <div class="relative w-full">
    <!-- Custom Select Button -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-3 text-[15px] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/50 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
      :class="[icon ? 'pl-11' : 'pl-5', 'pr-11']"
    >
      <!-- Left Icon (Optional) -->
      <UiIcon 
        v-if="icon" 
        :name="icon" 
        class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-40 transition-colors pointer-events-none" 
        :class="isOpen ? 'text-[var(--text-primary)] opacity-100' : ''"
      />

      <span class="truncate" :class="modelValue ? 'text-[var(--text-app)]' : 'text-[var(--text-app)] opacity-40 font-normal'">
        {{ selectedLabel }}
      </span>

      <!-- Right Caret Icon -->
      <UiIcon 
        name="lucide:chevron-down" 
        class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] pointer-events-none opacity-50 transition-transform duration-200" 
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <!-- Dropdown Options -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-2"
    >
      <div 
        v-if="isOpen"
        v-click-outside="() => isOpen = false"
        class="absolute z-50 w-full mt-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[14px] shadow-xl overflow-hidden"
      >
        <div class="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            @click="selectOption(opt.value)"
            class="w-full px-5 py-3.5 text-[15px] font-medium text-left hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer flex items-center gap-3"
            :class="modelValue === opt.value ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold' : 'text-[var(--text-app)]'"
          >
            <!-- Icon for selected item -->
            <UiIcon 
              v-if="modelValue === opt.value"
              name="lucide:check" 
              class="w-4 h-4 text-[var(--text-primary)] flex-shrink-0"
            />
            <span class="flex-1 truncate" :class="modelValue === opt.value ? '' : 'ml-7'">{{ opt.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
