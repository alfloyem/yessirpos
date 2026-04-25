<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '#i18n'
import countryList from '~/utils/countries.json'

const props = defineProps<{
  modelValue: any
  options?: { label: string, value: any, flag?: string, image?: string }[]
  disabled?: boolean
  icon?: string
  isCountry?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const selectRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
let searchTimeout: any = null
let searchTerm = ''

const handleClickOutside = (e: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const isOpen = ref(false)

const currentOptions = computed(() => {
  return props.isCountry ? countryList : (props.options || [])
})

const selectedLabel = computed(() => {
  const selected = currentOptions.value.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : t('common.select', 'Seç')
})

const selectedFlag = computed(() => {
  const selected = currentOptions.value.find(opt => opt.value === props.modelValue)
  return selected ? (selected as any).flag : null
})

const selectedImage = computed(() => {
  const selected = currentOptions.value.find(opt => opt.value === props.modelValue)
  return selected ? (selected as any).image : null
})

const selectOption = (value: any) => {
  emit('update:modelValue', value)
  isOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  
  if (e.key === 'Escape') {
    isOpen.value = false
    return
  }

  if (e.key.length === 1) {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTerm += e.key.toLowerCase()
    
    searchTimeout = setTimeout(() => {
      searchTerm = ''
    }, 600)
    
    const matches = currentOptions.value.filter(opt => opt.label.toLowerCase().startsWith(searchTerm))
    
    if (matches.length > 0) {
      const currentIndex = matches.findIndex(opt => opt.value === props.modelValue)
      let nextMatch: any = matches[0]
      
      if (searchTerm.length === 1 && currentIndex !== -1 && currentIndex + 1 < matches.length) {
        nextMatch = matches[currentIndex + 1]
      } else if (searchTerm.length === 1 && currentIndex === matches.length - 1) {
        nextMatch = matches[0] 
      }
      
      if (nextMatch) {
        emit('update:modelValue', nextMatch.value)
        
        if (isOpen.value) {
          setTimeout(() => {
            if (listRef.value) {
              const el = listRef.value.querySelector(`[data-value="${nextMatch.value}"]`) as HTMLElement
              if (el) el.scrollIntoView({ block: 'nearest' })
            }
          }, 50)
        }
      }
    }
  }
}
</script>

<template>
  <div class="relative w-full" ref="selectRef" @keydown="handleKeydown">
    <!-- Custom Select Button -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      @keydown.down.prevent="isOpen = true"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-2 text-[15px] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
      :class="[(icon || isCountry || selectedImage) ? 'pl-11' : 'pl-5', 'pr-11']"
    >
      <!-- Left Icon (Optional) -->
      <UiIcon 
        v-if="icon && !isCountry" 
        :name="icon" 
        class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-40 transition-colors pointer-events-none" 
        :class="isOpen ? 'text-[var(--text-primary)] opacity-100' : ''"
      />
      <span 
        v-else-if="isCountry && selectedFlag" 
        class="absolute left-[15px] top-1/2 -translate-y-[55%] emoji-flag text-[17px] pointer-events-none"
      >
        {{ selectedFlag }}
      </span>
      <img
        v-else-if="selectedImage"
        :src="selectedImage"
        class="absolute left-[15px] top-1/2 -translate-y-1/2 w-5 h-5 object-cover pointer-events-none"
      />

      <span class="truncate block" :class="modelValue ? 'text-[var(--text-app)]' : 'text-[var(--text-app)] opacity-40 font-normal'">
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
        class="absolute z-50 w-full mt-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[14px] shadow-xl overflow-hidden"
      >
        <div class="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar" ref="listRef">
          <button
            v-for="opt in currentOptions"
            :key="opt.value"
            :data-value="opt.value"
            type="button"
            @click="selectOption(opt.value)"
            class="w-full px-5 py-2 text-[15px] font-medium text-left hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer flex items-center gap-3"

            :class="modelValue === opt.value ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold' : 'text-[var(--text-app)]'"
          >
            <!-- Icon for selected item -->
            <UiIcon 
              v-if="modelValue === opt.value"
              name="lucide:check" 
              class="w-4 h-4 text-[var(--text-primary)] flex-shrink-0"
            />
            <span class="flex-1 truncate" :class="modelValue === opt.value ? '' : 'ml-7'">
              <span v-if="(opt as any).flag" class="mr-2 emoji-flag text-[17px] -mt-0.5">{{ (opt as any).flag }}</span>
              <img v-else-if="(opt as any).image" :src="(opt as any).image" class="inline-block mr-2 w-5 h-5 object-cover align-middle -mt-0.5" />
              {{ opt.label }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
@font-face {
  font-family: 'Twemoji Country Flags';
  unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
  src: url('https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2') format('woff2');
  font-display: swap;
}

.emoji-flag {
  font-family: 'Twemoji Country Flags', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
}
</style>

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
