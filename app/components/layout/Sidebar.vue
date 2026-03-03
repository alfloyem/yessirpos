<script setup>
import { ref } from 'vue'

const isSidebarCollapsed = useState('sidebarCollapsed', () => false)

// Menu items according to the requested structure
const menu = ref([
  {
    title: 'Əsas',
    icon: 'lucide:calendar',
    isOpen: true,
    children: [
      { title: 'Ana Səhifə', to: '/' },
      { title: 'Satışlar', to: '/sales' },
      { title: 'Əməkdaşlar', to: '/employees' }
    ]
  },
  {
    title: 'Müştərilər',
    icon: 'lucide:users',
    isOpen: false,
    children: [
      { title: 'Müştərilər', to: '/customers' },
      { title: 'Hədiyyə Kartı', to: '/gift-cards' }
    ]
  },
  {
    title: 'Anbar',
    icon: 'lucide:package',
    isOpen: false,
    children: [
      { title: 'Mallar', to: '/goods' },
      { title: 'Kitlər', to: '/kits' }
    ]
  },
  {
    title: 'Təchizat',
    icon: 'lucide:truck',
    isOpen: false,
    children: [
      { title: 'Tədarükçülər', to: '/suppliers' },
      { title: 'Qəbul Edilənlər', to: '/received' }
    ]
  },
  {
    title: 'Maliyyə',
    icon: 'lucide:pie-chart',
    isOpen: false,
    children: [
      { title: 'Xərclər', to: '/expenses' },
      { title: 'Xərclər Bölməsi', to: '/expense-division' },
      { title: 'Qazanclar', to: '/earnings' },
      { title: 'Hesabatlar', to: '/reports' }
    ]
  }
])

const toggleMenu = (index) => {
  menu.value[index].isOpen = !menu.value[index].isOpen
}
</script>

<template>
  <aside 
    class="bg-white border-r border-[#eaeff4] flex flex-col h-full transition-all duration-300 ease-in-out shrink-0"
    :class="isSidebarCollapsed ? 'w[80px]' : 'w-[260px]'"
    style="font-family: 'Inter', sans-serif;"
  >
    <!-- Logo placeholder -->
    <div class="h-[73px] flex items-center px-6 border-b border-[#eaeff4] shrink-0">
      <span v-if="!isSidebarCollapsed" class="font-bold text-[18px] text-[#425b76]">Logo</span>
      <span v-else class="font-bold text-[18px] text-[#425b76] mx-auto">L</span>
    </div>

    <!-- Navigation List -->
    <div class="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
      <div v-for="(item, index) in menu" :key="index" class="mb-2">
        
        <!-- Parent Category -->
        <button 
          @click="toggleMenu(index)"
          class="w-full flex items-center justify-between px-3 py-[10px] rounded-lg text-[#6085a6] hover:bg-[#f8fafd] hover:text-[#425b76] transition-all duration-200 group"
        >
          <div class="flex items-center gap-[14px]">
            <Icon 
              :name="item.icon" 
              class="w-[22px] h-[22px] text-[#8eaecf] group-hover:text-[#6a90b8] transition-colors" 
            />
            <span v-if="!isSidebarCollapsed" class="font-medium text-[15px] tracking-wide">{{ item.title }}</span>
          </div>
          <Icon 
            v-if="!isSidebarCollapsed"
            :name="item.isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" 
            class="w-4 h-4 text-[#aebdd0] group-hover:text-[#8eaecf] transition-transform" 
          />
        </button>

        <!-- Children Tree Wrapper -->
        <div v-show="item.isOpen && !isSidebarCollapsed" class="mt-[2px] relative flex flex-col">
          <NuxtLink 
            v-for="(child, childIndex) in item.children" 
            :key="childIndex"
            :to="child.to"
            class="relative flex items-center group py-[11px] pl-[52px]"
            active-class="!text-[#3b82f6] font-medium"
          >
            <!-- L-shape connector (Top to Middle -> Right) -->
            <div 
              class="absolute left-[23px] top-[-11px] bottom-1/2 w-[16px] border-l border-b border-[#c8d6e5] rounded-bl-[10px]"
              style="border-width: 0px 0px 1px 1px"
            ></div>
            
            <!-- Straight connector line (Middle to Bottom), omitting for last child so it doesn't continue down -->
            <div 
              v-if="childIndex !== item.children.length - 1" 
              class="absolute left-[23px] top-1/2 bottom-[-11px] border-l border-[#c8d6e5]"
              style="border-width: 0px 0px 0px 1px"
            ></div>

            <span class="text-[14px] text-[#7fa1cc] group-hover:text-[#557ba8] transition-colors whitespace-nowrap">{{ child.title }}</span>
          </NuxtLink>
        </div>

      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Scoped minimal scrollbar to keep it clean */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d1d9e2;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #b0c4d9;
}
</style>
