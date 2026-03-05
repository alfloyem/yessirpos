```
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  menuClass: {
    type: String,
    default: 'absolute top-full right-0 mt-2'
  }
})

const isOpen = ref(false)
const dropdownRef = ref(null)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineExpose({ toggle, close, isOpen })
</script>

<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <!-- Trigger -->
    <div @click="toggle" class="cursor-pointer">
      <slot name="trigger" :isOpen="isOpen" :toggle="toggle"></slot>
    </div>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div 
        v-show="isOpen" 
        :class="['z-50 bg-[var(--bg-app)] md:bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden', menuClass]"
      >
        <slot name="menu" :close="close"></slot>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
