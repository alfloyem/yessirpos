<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '#i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string[]
  historyKey: string
  placeholder?: string
  icon?: string
  mode?: 'numeric' | 'text'
}>()

const emit = defineEmits(['update:modelValue'])

const inputValue = ref('')
const isFocused = ref(false)
const history = ref<string[]>([])
const selectedIndex = ref(-1)

onMounted(() => {
  const saved = localStorage.getItem(`tags_history_${props.historyKey}`)
  if (saved) {
    try {
      history.value = JSON.parse(saved)
    } catch (e) {
      // Ignore
    }
  }
})

const filteredHistory = computed(() => {
  const query = inputValue.value.toLowerCase().trim()
  const available = history.value.filter(h => !props.modelValue.includes(h))
  if (!query) return available
  return available.filter(h => h.toLowerCase().includes(query))
})

const dropdownItems = computed(() => {
  const items: { type: 'new' | 'history', value: string }[] = []
  
  // Add "create new" option if input has value and not in history
  if (inputValue.value.trim() && !history.value.some(h => h.toLowerCase() === inputValue.value.trim().toLowerCase())) {
    items.push({ type: 'new', value: inputValue.value.trim() })
  }
  
  // Add filtered history
  filteredHistory.value.forEach(item => {
    items.push({ type: 'history', value: item })
  })
  
  return items
})

// Reset selected index when dropdown items change
watch(dropdownItems, () => {
  selectedIndex.value = -1
})

const addTag = (tag: string) => {
  const t = tag.trim()
  if (!t) return
  if (!props.modelValue.includes(t)) {
    const newValue = [...props.modelValue, t]
    emit('update:modelValue', newValue)
    
    // Save to history
    if (!history.value.includes(t)) {
      history.value.push(t)
      localStorage.setItem(`tags_history_${props.historyKey}`, JSON.stringify(history.value))
    }
  }
  inputValue.value = ''
  selectedIndex.value = -1
}

const removeTag = (index: number) => {
  const newValue = [...props.modelValue]
  newValue.splice(index, 1)
  emit('update:modelValue', newValue)
}

const handleKeydown = (e: KeyboardEvent) => {
  const hasDropdown = isFocused.value && dropdownItems.value.length > 0
  
  if (props.mode === 'numeric') {
    // Only allow digits and control keys
    if (!/^[0-9]$/.test(e.key) && ![
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'
    ].includes(e.key)) {
      e.preventDefault()
      return
    }
  }

  if (e.key === 'ArrowDown' && hasDropdown) {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, dropdownItems.value.length - 1)
    scrollToSelected()
  } else if (e.key === 'ArrowUp' && hasDropdown) {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
    scrollToSelected()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (hasDropdown && selectedIndex.value >= 0) {
      // Select from dropdown
      const item = dropdownItems.value[selectedIndex.value]
      if (item) addTag(item.value)
    } else {
      // Add current input
      addTag(inputValue.value)
    }
  } else if (e.key === 'Escape' && hasDropdown) {
    e.preventDefault()
    isFocused.value = false
    selectedIndex.value = -1
  } else if (e.key === 'Backspace' && inputValue.value === '' && props.modelValue.length > 0) {
    removeTag(props.modelValue.length - 1)
  }
}

const scrollToSelected = () => {
  setTimeout(() => {
    const dropdown = document.querySelector('.tags-dropdown')
    const selectedItem = dropdown?.querySelector(`[data-index="${selectedIndex.value}"]`)
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, 0)
}

// Timeout to allow clicking on dropdown items before blur hides it
const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
    selectedIndex.value = -1
  }, 200)
}
</script>

<template>
  <div class="relative w-full">
    <div 
      class="min-h-[48px] w-full bg-[var(--input-bg)] border rounded-[14px] transition-all flex flex-wrap gap-2 p-2 items-center"
      :class="isFocused ? 'border-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]'"
    >
      <UiIcon v-if="icon" :name="icon" class="w-4 h-4 text-[var(--text-app)] opacity-50 ml-2 mr-1" />
      
      <div 
        v-for="(tag, index) in modelValue" 
        :key="index"
        class="flex items-center gap-1.5 bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-[14px] font-semibold tracking-wide"
      >
        {{ tag }}
        <UiIcon 
          name="lucide:x" 
          class="w-3.5 h-3.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" 
          @click.stop="removeTag(index)" 
        />
      </div>

      <input
        type="text"
        v-model="inputValue"
        @focus="isFocused = true"
        @blur="handleBlur"
        @keydown="handleKeydown"
        :placeholder="modelValue.length === 0 ? (placeholder || t('common.typeAndPressEnter', 'Yazın və Enter basın...')) : ''"
        class="flex-1 min-w-[120px] ml-1 bg-transparent outline-none text-[15px] font-medium text-[var(--text-app)] placeholder:text-[var(--text-app)] placeholder:opacity-40 placeholder:font-normal"
      />
    </div>

    <!-- Dropdown / History -->
    <Transition name="fade-slide">
      <div 
        v-if="isFocused && dropdownItems.length > 0"
        class="tags-dropdown absolute left-0 right-0 top-full mt-2 bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-[100] max-h-64 overflow-y-auto custom-scrollbar"
      >
        <!-- Suggest to add what's typed if not in history -->
        <div 
          v-for="(item, index) in dropdownItems"
          :key="index"
          :data-index="index"
          @click="addTag(item.value)"
          @mouseenter="selectedIndex = index"
          class="px-4 py-3 text-sm font-medium cursor-pointer transition-colors flex items-center gap-2"
          :class="[
            selectedIndex === index 
              ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' 
              : 'text-[var(--text-app)] hover:bg-[var(--text-primary)]/5',
            item.type === 'new' ? 'border-b border-[var(--border-app)] bg-[var(--text-primary)]/5' : ''
          ]"
        >
          <UiIcon 
            :name="item.type === 'new' ? 'lucide:plus-circle' : 'lucide:history'" 
            class="w-4 h-4"
            :class="selectedIndex === index ? 'opacity-100' : 'opacity-40'"
          />
          <span class="flex-1">
            <template v-if="item.type === 'new'">
              "{{ item.value }}" {{ t('common.add', 'əlavə et') }}
            </template>
            <template v-else>
              {{ item.value }}
            </template>
          </span>
          <UiIcon 
            v-if="selectedIndex === index"
            name="lucide:corner-down-left" 
            class="w-4 h-4 opacity-60"
          />
        </div>

        <div v-if="dropdownItems.length === 0 && inputValue.trim()" class="px-4 py-3 text-sm text-[var(--text-app)] opacity-60 text-center">
          {{ t('common.noResultsFound', 'Nəticə tapılmadı') }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

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
