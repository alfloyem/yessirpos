<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  modelValue: string[]
  historyKey: string
  placeholder?: string
  icon?: string
}>()

const emit = defineEmits(['update:modelValue'])

const inputValue = ref('')
const isFocused = ref(false)
const history = ref<string[]>([])

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
}

const removeTag = (index: number) => {
  const newValue = [...props.modelValue]
  newValue.splice(index, 1)
  emit('update:modelValue', newValue)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag(inputValue.value)
  } else if (e.key === 'Backspace' && inputValue.value === '' && props.modelValue.length > 0) {
    removeTag(props.modelValue.length - 1)
  }
}

// Timeout to allow clicking on dropdown items before blur hides it
const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}
</script>

<template>
  <div class="relative w-full">
    <div 
      class="min-h-[48px] w-full bg-[var(--input-bg)] border rounded-[14px] transition-all flex flex-wrap gap-2 p-2 items-center"
      :class="isFocused ? 'border-[var(--text-primary)] ring-4 ring-[var(--text-primary)]/10' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]'"
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
        :placeholder="modelValue.length === 0 ? (placeholder || 'Yazın və Enter basın...') : ''"
        class="flex-1 min-w-[120px] ml-1 bg-transparent outline-none text-[15px] font-medium text-[var(--text-app)] placeholder:text-[var(--text-app)] placeholder:opacity-40 placeholder:font-normal"
      />
    </div>

    <!-- Dropdown / History -->
    <Transition name="fade-slide">
      <div 
        v-if="isFocused && (filteredHistory.length > 0 || inputValue.trim())"
        class="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-[100] max-h-64 overflow-y-auto custom-scrollbar"
      >
        <!-- Suggest to add what's typed if not in history -->
        <div 
          v-if="inputValue.trim() && !history.some(h => h.toLowerCase() === inputValue.trim().toLowerCase())"
          @click="addTag(inputValue)"
          class="px-4 py-3 text-sm font-medium text-[var(--text-primary)] bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 cursor-pointer transition-colors flex items-center gap-2 border-b border-[var(--border-app)]"
        >
          <UiIcon name="lucide:plus-circle" class="w-4 h-4" />
          "{{ inputValue.trim() }}" əlavə et
        </div>

        <div v-if="filteredHistory.length > 0" class="px-3 py-2 text-[10px] font-bold text-[var(--text-app)] opacity-40 uppercase tracking-widest bg-[var(--bg-app)]/50 backdrop-blur-sm sticky top-0 border-b border-[var(--border-app)]">
          Kechmish Axtarishlar
        </div>
        
        <div 
          v-for="item in filteredHistory" 
          :key="item"
          @click="addTag(item)"
          class="px-4 py-2.5 text-sm font-medium text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] cursor-pointer transition-colors flex items-center justify-between group"
        >
          <div class="flex items-center gap-2.5">
            <UiIcon name="lucide:history" class="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            {{ item }}
          </div>
          <UiIcon name="lucide:arrow-up-left" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 !duration-300" />
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
