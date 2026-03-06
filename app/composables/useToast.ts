import { computed } from 'vue'
import { useState } from '#imports'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  createdAt: number
}

export const useToast = () => {
  // SSR-safe shared state using Nuxt useState
  const toasts = useState<Toast[]>('global_toasts', () => [])

  const addToast = (type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now()
    }
    
    // Add to list
    toasts.value.unshift(toast)

    // Auto remove (only on client)
    if (duration > 0 && process.client) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t: Toast) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts: computed(() => toasts.value),
    removeToast,
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur),
    warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur)
  }
}
