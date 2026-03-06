<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'

const props = defineProps<{
  modelValue: any
  options?: { label: string, value: any, extra?: string }[]
  disabled?: boolean
  icon?: string
  placeholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchTerm = ref('')

// Initialize searchTerm if modelValue exists
watch(() => props.modelValue, (newVal) => {
  const selected = (props.options || []).find(opt => opt.value === newVal)
  if (selected && !isOpen.value) {
    searchTerm.value = selected.label
  } else if (!newVal) {
    searchTerm.value = ''
  }
}, { immediate: true })

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
    // Restore label if closed without selecting
    const selected = (props.options || []).find(opt => opt.value === props.modelValue)
    if (selected) {
      searchTerm.value = selected.label
    } else {
      searchTerm.value = ''
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (props.autofocus) {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 150)
  }
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// Filter logic: lazy load visually means only show matches alphabetically
const filteredOptions = computed(() => {
  const q = searchTerm.value.toLowerCase()
  return (props.options || [])
    .filter(opt => {
      const matchLabel = opt.label.toLowerCase().includes(q)
      const matchExtra = (opt.extra || '').toLowerCase().includes(q)
      return matchLabel || matchExtra
    })
    .sort((a, b) => a.label.localeCompare(b.label))
})

const handleInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  searchTerm.value = val
  isOpen.value = true
  
  if (val === '') {
    emit('update:modelValue', '')
    return
  }

  const numericVal = val.replace(/\D/g, '')
  if (val.length >= 7) {
    const exactMatch = (props.options || []).find(opt => {
      if (!opt.extra) return false
      const extStr = String(opt.extra).toLowerCase()
      const searchStr = val.toLowerCase()
      
      if (extStr === searchStr) return true
      
      const numericExt = extStr.replace(/\D/g, '')
      if (numericVal.length >= 7 && numericExt === numericVal) return true
      return false
    })

    if (exactMatch) {
      selectOption(exactMatch)
    }
  }
}

const selectOption = (opt: { label: string, value: any, extra?: string }) => {
  searchTerm.value = opt.label
  emit('update:modelValue', opt.value)
  isOpen.value = false
}

// Focus handling
const handleFocus = () => {
  isOpen.value = true
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isOpen.value = false
    searchTerm.value = ''
    emit('update:modelValue', '')
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (isOpen.value && filteredOptions.value.length === 1) {
      const match = filteredOptions.value[0]
      if (match) selectOption(match)
    }
  }
}

const highlightMatch = (text: string | undefined | null) => {
  if (!text || !searchTerm.value || !isOpen.value) return text || ''
  const regex = new RegExp(`(${searchTerm.value})`, 'gi')
  return String(text).replace(regex, '<span class="text-[var(--text-primary)] font-bold bg-[var(--text-primary)]/10 px-0.5 rounded">$1</span>')
}

</script>

<template>
  <div class="relative w-full" ref="containerRef" @keydown="handleKeydown">
    <!-- Left Icon -->
    <UiIcon 
      v-if="icon" 
      :name="icon" 
      class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-40 transition-colors pointer-events-none z-10" 
      :class="isOpen ? 'text-[var(--text-primary)] opacity-100' : ''"
    />
    
    <input
      ref="inputRef"
      type="text"
      :value="searchTerm"
      @input="handleInput"
      @focus="handleFocus"
      :disabled="disabled"
      :placeholder="placeholder || t('common.search', 'Axtar...')"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-2 text-[15px] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/50 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder:font-normal"
      :class="icon ? 'pl-11 pr-11' : 'px-5 pr-11'"
    />
    
    <!-- Right Caret Icon -->
    <UiIcon 
      name="lucide:chevron-down" 
      class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] pointer-events-none opacity-50 transition-transform duration-200" 
      :class="isOpen ? 'rotate-180' : ''"
    />

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
        v-if="isOpen && filteredOptions.length > 0"
        class="absolute z-50 w-full mt-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[14px] shadow-xl overflow-hidden"
      >
        <div class="max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <button
            v-for="opt in filteredOptions"
            :key="opt.value"
            type="button"
            @click.prevent="selectOption(opt)"
            class="w-full px-5 py-2 text-[15px] font-medium text-left hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer flex items-center gap-3"
            :class="modelValue === opt.value ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold' : 'text-[var(--text-app)]'"
          >
            <!-- Icon for selected item -->
            <UiIcon 
              v-if="modelValue === opt.value"
              name="lucide:check" 
              class="w-4 h-4 text-[var(--text-primary)] flex-shrink-0"
            />
            <span 
              class="flex-1 truncate" 
              :class="modelValue === opt.value ? '' : 'ml-7'"
              v-html="highlightMatch(opt.label)"
            ></span>
            <div v-if="opt.extra" class="flex items-center gap-1.5 opacity-60">
              <UiIcon name="lucide:barcode" class="w-3.5 h-3.5" />
              <span class="text-[13px] font-mono tracking-wider" v-html="highlightMatch(opt.extra)"></span>
            </div>
          </button>
        </div>
      </div>
      <div 
        v-else-if="isOpen && searchTerm && filteredOptions.length === 0"
        class="absolute z-50 w-full mt-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[14px] shadow-xl overflow-hidden px-5 py-2 text-center text-sm text-[var(--text-app)] opacity-60"
      >
        {{ t('common.noDataFound', 'Məlumat tapılmadı') }}
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
