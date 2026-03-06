<script setup lang="ts">
import { ref } from 'vue'
import type { ToastProps } from './Toast.vue'

export interface Toast extends Omit<ToastProps, 'id'> {
  id?: string
}

const toasts = ref<ToastProps[]>([])

const addToast = (toast: Toast) => {
  const id = toast.id || `toast-${Date.now()}-${Math.random()}`
  toasts.value.push({
    ...toast,
    id
  })
}

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

defineExpose({
  addToast
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[10001] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex flex-col gap-3"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto"
        >
          <Toast
            :id="toast.id"
            :type="toast.type"
            :message="toast.message"
            :duration="toast.duration"
            @remove="removeToast"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
  margin-bottom: -80px;
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
