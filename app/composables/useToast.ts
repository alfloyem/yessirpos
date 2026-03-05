import type { Toast } from '~/components/ui/ToastContainer.vue'

const toastState = reactive<{
  container: any
  queue: Toast[]
}>({
  container: null,
  queue: []
})

export const useToast = () => {
  const setContainer = (container: any) => {
    toastState.container = container
    
    // Process queued toasts
    if (toastState.queue.length > 0) {
      toastState.queue.forEach(toast => {
        if (toastState.container?.addToast) {
          toastState.container.addToast(toast)
        }
      })
      toastState.queue = []
    }
  }

  const show = (toast: Toast) => {
    if (toastState.container?.addToast) {
      toastState.container.addToast(toast)
    } else {
      // Queue the toast if container is not ready
      toastState.queue.push(toast)
    }
  }

  const success = (message: string, duration?: number) => {
    show({ type: 'success', message, duration })
  }

  const error = (message: string, duration?: number) => {
    show({ type: 'error', message, duration })
  }

  const warning = (message: string, duration?: number) => {
    show({ type: 'warning', message, duration })
  }

  const info = (message: string, duration?: number) => {
    show({ type: 'info', message, duration })
  }

  return {
    setContainer,
    show,
    success,
    error,
    warning,
    info
  }
}
