<script setup lang="ts">
import { useToast } from '~/composables/useToast'
const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return 'lucide:check-circle-2'
    case 'error': return 'lucide:alert-circle'
    case 'warning': return 'lucide:alert-triangle'
    case 'info': return 'lucide:info'
    default: return 'lucide:info'
  }
}

const getStyles = (type: string) => {
  switch (type) {
    case 'success': 
      return { 
        bg: 'bg-emerald-500', 
        border: 'border-emerald-500/20',
        glow: 'shadow-emerald-500/20',
        text: 'text-white'
      }
    case 'error': 
      return { 
        bg: 'bg-rose-500', 
        border: 'border-rose-500/20',
        glow: 'shadow-rose-500/20',
        text: 'text-white' 
      }
    case 'warning': 
      return { 
        bg: 'bg-amber-500', 
        border: 'border-amber-500/20',
        glow: 'shadow-amber-500/20',
        text: 'text-white' 
      }
    case 'info': 
      return { 
        bg: 'bg-blue-500', 
        border: 'border-blue-500/20',
        glow: 'shadow-blue-500/20', 
        text: 'text-white' 
      }
    default: 
      return { bg: 'bg-slate-700', border: 'border-white/10', glow: 'shadow-black/20', text: 'text-white' }
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-[380px] pointer-events-none">
      <TransitionGroup name="list" tag="div" class="flex flex-col gap-3">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto"
        >
          <div 
            class="flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden relative group transition-all duration-300"
            :class="[getStyles(toast.type).bg, getStyles(toast.type).border, getStyles(toast.type).glow, getStyles(toast.type).text]"
          >
            <!-- Glow effect on hover -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300 pointer-events-none"></div>

            <!-- Icon -->
            <div class="w-6 h-6 shrink-0 mt-0.5 flex items-center justify-center">
              <UiIcon :name="getIcon(toast.type)" class="w-6 h-6" />
            </div>

            <!-- Content -->
            <div class="flex-1 space-y-1 pr-4">
              <p class="text-sm font-semibold tracking-wide leading-relaxed">
                {{ toast.message }}
              </p>
            </div>

            <!-- Close Button -->
            <button 
              @click="removeToast(toast.id)"
              class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 transition-all border border-white/10 hover:scale-105 active:scale-95"
            >
              <UiIcon name="lucide:x" class="w-3.5 h-3.5" />
            </button>

            <!-- Loading bar at bottom -->
            <div 
              class="absolute bottom-0 left-0 h-1 bg-white/30 transition-all linear"
              :style="{ 
                width: '100%',
                animation: `shrinkWidth ${toast.duration || 4000}ms linear forwards`
              }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}

/* Stacking effect - toasts below the first one are slightly smaller and darker */
/* This works nicely if toasts are from top down */
.list-move {
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

@keyframes shrinkWidth {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
