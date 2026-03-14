<template>
  <div class="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-[280px] font-sans">
    <!-- Search Bar -->
    <div class="p-3">
      <div class="relative group">
        <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="İkon ara..."
          class="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[11px] font-medium text-white/90 outline-none focus:border-[var(--text-primary)]/30 transition-all placeholder:text-white/20"
        />
        <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <UiIcon name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin text-[var(--text-primary)]" />
        </div>
      </div>
    </div>

    <div class="h-[1px] bg-white/5"></div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <div class="text-[10px] font-bold text-white/20 tracking-wide pl-1">
        {{ searchQuery.length >= 2 ? 'Axtarış nəticələri' : 'Favorit ikonlar' }}
      </div>

      <div v-if="displayIcons.length > 0" class="grid grid-cols-4 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
        <button 
          v-for="icon in displayIcons" 
          :key="icon"
          @click="selectIcon(icon)"
          class="aspect-square flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-white/60 transition-all hover:bg-[var(--text-primary)] hover:text-white hover:border-transparent active:scale-90"
          :class="modelValue === icon ? 'bg-[var(--text-primary)] text-white border-transparent shadow-lg shadow-[var(--text-primary)]/20' : ''"
        >
          <UiIcon :name="icon" class="w-5 h-5" />
        </button>
      </div>
      
      <div v-else-if="searchQuery.length >= 2 && !loading" class="text-center py-6 opacity-20 italic text-[11px]">
        İkon tapılmadı
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-white/[0.02] border-t border-white/5 p-3 flex justify-center">
      <a href="https://icon-sets.iconify.design/" target="_blank" class="flex items-center gap-2 text-[10px] font-bold text-white/10 hover:text-[var(--text-primary)] transition-colors">
        <UiIcon name="lucide:external-link" class="w-3 h-3" />
        Bütün ikonlara göz at
      </a>
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
