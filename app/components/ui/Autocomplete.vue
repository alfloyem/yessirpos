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
const dropdownRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const searchTerm = ref('')
const dropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

// Normalize function for Turkish/Azeri support
const normalizeText = (text: any) => {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
}

const updateDropdownPosition = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      top: `${rect.bottom + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`
    }
  }
}

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

// Filter logic
const filteredOptions = computed(() => {
  const q = normalizeText(searchTerm.value)
  if (!q) return (props.options || []).sort((a, b) => a.label.localeCompare(b.label))
  
  return (props.options || [])
    .filter(opt => {
      const matchLabel = normalizeText(opt.label).includes(q)
      const matchExtra = normalizeText(opt.extra).includes(q)
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
  // Auto-select for barcodes or full matches
  if (val.length >= 7) {
    const isBarcode = /^C\d+$/i.test(val) || val.startsWith('C') || val.startsWith('c')
    
    const exactMatch = (props.options || []).find(opt => {
      const labelStr = String(opt.label || '')
      const extraStr = String(opt.extra || '')
      
      // Direct match on label or extra
      if (normalizeText(labelStr) === normalizeText(val)) return true
      if (normalizeText(extraStr) === normalizeText(val)) return true
      
      // Numeric match for barcodes
      if (isBarcode && numericVal.length >= 4) {
        if (labelStr.replace(/\D/g, '').endsWith(numericVal)) return true
        if (extraStr.replace(/\D/g, '').endsWith(numericVal)) return true
      }
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

const handleFocus = () => {
  isOpen.value = true
  updateDropdownPosition()
}

// Update position on scroll/resize if open
onMounted(() => {
  window.addEventListener('scroll', updateDropdownPosition, true)
  window.addEventListener('resize', updateDropdownPosition)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
})

watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(updateDropdownPosition)
  }
})

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
  const query = searchTerm.value.trim()
  if (!query) return String(text)
  
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const buildCharRegex = (char: string) => {
    switch (char.toLowerCase()) {
      case 'i': case 'ı': return '[iıİI]'
      case 'g': case 'ğ': return '[gğGĞ]'
      case 's': case 'ş': return '[sşSŞ]'
      case 'c': case 'ç': return '[cçCÇ]'
      case 'o': case 'ö': return '[oöOÖ]'
      case 'u': case 'ü': return '[uüUÜ]'
      default: return escapeRegExp(char)
    }
  }

  const regexStr = Array.from(query).map(buildCharRegex).join('')
  try {
    const regex = new RegExp(`(${regexStr})`, 'gi')
    return String(text).replace(regex, '<span class="text-[var(--text-primary)] font-bold bg-[var(--text-primary)]/10 px-0.5 rounded">$1</span>')
  } catch (e) {
    return String(text)
  }
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

    <!-- Dropdown Options - Teleported to Body to fix z-index issues -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-2"
      >
        <div 
          v-if="isOpen && (filteredOptions.length > 0 || (searchTerm && filteredOptions.length === 0))"
          ref="dropdownRef"
          class="absolute z-[999999] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-[14px] shadow-2xl overflow-hidden pointer-events-auto"
          :style="dropdownStyle"
        >
          <div v-if="filteredOptions.length > 0" class="max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <button
              v-for="opt in filteredOptions"
              :key="opt.value"
              type="button"
              @click.prevent="selectOption(opt)"
              class="w-full px-5 py-2 text-[15px] font-medium text-left hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer flex items-center gap-3"
              :class="modelValue === opt.value ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold' : 'text-[var(--text-app)]'"
            >
            <div class="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 flex items-center justify-center shrink-0" :class="modelValue === opt.value ? 'ring-2 ring-[var(--text-primary)] ring-offset-2' : ''">
              <span v-if="opt.label" class="text-[11px] font-black text-[var(--text-primary)]">
                {{ opt.label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
              </span>
              <UiIcon v-else name="lucide:user" class="w-4 h-4 text-[var(--text-primary)]" />
            </div>
            <div class="flex-1 min-w-0">
              <div 
                class="text-[14px] font-bold truncate transition-colors" 
                :class="modelValue === opt.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-app)]'"
                v-html="highlightMatch(opt.label)"
              ></div>
              <div v-if="opt.extra" class="flex items-center gap-1.5 opacity-40 text-[11px] font-medium" v-html="highlightMatch(opt.extra)"></div>
            </div>
            <!-- Icon for selected item -->
            <UiIcon 
              v-if="modelValue === opt.value"
              name="lucide:check-circle-2" 
              class="w-4 h-4 text-[var(--text-primary)] flex-shrink-0"
            />
          </button>
          </div>
          <div 
            v-else-if="searchTerm && filteredOptions.length === 0"
            class="px-5 py-4 text-center text-sm text-[var(--text-app)] opacity-60"
          >
            {{ t('common.noDataFound', 'Məlumat tapılmadı') }}
          </div>
        </div>
      </Transition>
    </Teleport>
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
