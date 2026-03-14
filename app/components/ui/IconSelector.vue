<template>
  <div class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden w-[260px] font-sans antialiased">
    <!-- Search Bar -->
    <div class="p-2.5">
      <div class="relative group">
        <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40 group-focus-within:opacity-100 transition-opacity" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Axtar..."
          class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl py-1.5 pl-8 pr-3 text-[11px] font-medium text-[var(--text-app)] outline-none focus:border-[var(--text-primary)]/40 transition-all placeholder:text-[var(--text-app)]/20"
        />
        <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <UiIcon name="lucide:loader-2" class="w-3 h-3 animate-spin text-[var(--text-primary)]" />
        </div>
      </div>
    </div>

    <div class="h-[1px] bg-[var(--border-app)] opacity-40"></div>

    <!-- Content -->
    <div class="p-3 space-y-2">
      <div v-if="displayIcons.length > 0" class="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
        <button 
          v-for="icon in displayIcons" 
          :key="icon"
          @click="selectIcon(icon)"
          class="aspect-square flex items-center justify-center rounded-lg border border-[var(--border-app)] bg-white/[0.03] text-[var(--text-app)] transition-all hover:bg-[var(--text-primary)] hover:text-white hover:border-transparent active:scale-90"
          :class="modelValue === icon ? 'bg-[var(--text-primary)] text-white border-transparent shadow-lg shadow-[var(--text-primary)]/10 opacity-100 scale-105' : 'opacity-80 hover:opacity-100'"
          :title="icon"
        >
          <UiIcon :name="icon" class="w-4 h-4" />
        </button>
      </div>
      
      <div v-else-if="searchQuery.length >= 2 && !loading" class="text-center py-6 opacity-20 italic text-[10px]">
        İkon tapılmadı
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import UiIcon from '~/components/ui/Icon.vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const icons = ref<string[]>([])
const loading = ref(false)
let debounceTimeout: any = null

const favorites = [
  'lucide:credit-card', 'lucide:coins', 'lucide:banknote', 'lucide:wallet',
  'lucide:star', 'lucide:trophy', 'lucide:gift', 'lucide:shopping-bag',
  'lucide:user', 'lucide:users', 'lucide:clock', 'lucide:calendar',
  'lucide:map-pin', 'lucide:phone', 'lucide:mail', 'lucide:info'
]

const displayIcons = computed(() => {
  return searchQuery.value.length >= 2 ? icons.value : favorites
})

const searchIcons = async (query: string) => {
  if (!query || query.length < 2) {
    icons.value = []
    return
  }
  
  if (debounceTimeout) clearTimeout(debounceTimeout)
  
  debounceTimeout = setTimeout(async () => {
    loading.value = true
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${query}&limit=24`)
      const data = await res.json()
      icons.value = data.icons || []
    } catch (err) {
      console.error('Icon search failed:', err)
    } finally {
      loading.value = false
    }
  }, 400)
}

watch(searchQuery, (val) => {
  searchIcons(val)
})

const selectIcon = (icon: string) => {
  emit('update:modelValue', icon)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 10px;
}
</style>
