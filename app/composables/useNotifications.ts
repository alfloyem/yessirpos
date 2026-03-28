import { ref } from 'vue'

const unreadCount = ref(0)
const notifications = ref<any[]>([])
const loading = ref(false)

export const useNotifications = () => {
  const fetchNotifications = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/notifications', {
        params: { page: 1, limit: 10 } // recent 10 for dropdown
      }) as any
      
      notifications.value = data.notifications || []
      unreadCount.value = data.unreadCount || 0
    } catch (e) {
      console.error('Bildirişlər yüklənərkən xəta:', e)
    } finally {
      loading.value = false
    }
  }

  const markAllAsRead = async () => {
    try {
      await $fetch('/api/notifications/read', { method: 'PATCH' })
      unreadCount.value = 0
      // Update local state isRead to true
      notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    } catch (e) {
      console.error('Bildirişlər oxunmuş edilərkən xəta:', e)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await $fetch('/api/notifications/read', { 
        method: 'PATCH',
        body: { id }
      })
      
      const note = notifications.value.find(n => n.id === id)
      if (note) {
        note.isRead = true
      }
      
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) {
      console.error('Bildiriş oxunmuş edilərkən xəta:', e)
    }
  }

  return {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAllAsRead,
    markAsRead
  }
}
