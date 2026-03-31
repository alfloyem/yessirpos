```
<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  menuClass: {
    type: String,
    default: 'absolute top-full right-0 mt-2'
  },
  teleport: {
    type: Boolean,
    default: false
  }
})

const isOpen = ref(false)
const dropdownRef = ref(null)
const triggerRef = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

const toggle = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && props.teleport && triggerRef.value) {
    updateMenuPosition()
  }
}

const close = () => {
  isOpen.value = false
}

const updateMenuPosition = () => {
  if (triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    menuPosition.value = {
      top: rect.bottom + window.scrollY + 8,
      left: rect.right + window.scrollX - 224 // 224px = w-56
    }
  }
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (props.teleport) {
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (props.teleport) {
    window.removeEventListener('scroll', updateMenuPosition, true)
    window.removeEventListener('resize', updateMenuPosition)
  }
})

const menuStyle = computed(() => {
  if (!props.teleport) return {}
  return {
    position: 'fixed',
    top: `${menuPosition.value.top}px`,
    left: `${menuPosition.value.left}px`,
    zIndex: 9999
  }
})

defineExpose({ toggle, close, isOpen })
</script>

<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <!-- Trigger -->
    <div @click="toggle" class="cursor-pointer" ref="triggerRef">
      <slot name="trigger" :isOpen="isOpen" :toggle="toggle"></slot>
    </div>

    <!-- Dropdown Menu -->
    <Teleport to="body" :disabled="!teleport">
      <Transition name="dropdown">
        <div 
          v-show="isOpen" 
          :class="['bg-[var(--bg-app)] md:bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl shadow-xl', teleport ? '' : menuClass]"
          :style="menuStyle"
        >
          <slot name="menu" :close="close"></slot>
        </div>
      </Transition>
    </Teleport>
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
