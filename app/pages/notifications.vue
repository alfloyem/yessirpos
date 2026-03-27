<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHead, useToast } from '#imports'
import { useI18n } from '#i18n'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import { useNotifications } from '~/composables/useNotifications'

const { t } = useI18n()
const toast = useToast()

useHead({ title: t('notifications.title', 'Bildirişlər') + ' | YESSIR POS' })

const { unreadCount, fetchNotifications: fetchGlobalNotifs, markAllAsRead, markAsRead } = useNotifications()

const loading = ref(false)
const localNotifications = ref<any[]>([])
const currentPage = ref(1)
const hasMore = ref(true)

const loadNotifications = async (page = 1) => {
  loading.value = true
  try {
    const data = await $fetch('/api/notifications', { params: { page, limit: 20 } }) as any
    if (page === 1) {
      localNotifications.value = data.notifications
    } else {
      localNotifications.value = [...localNotifications.value, ...data.notifications]
    }
    hasMore.value = data.notifications.length === 20
    
    // Unread count syncing if we are on page 1
    if (page === 1) unreadCount.value = data.unreadCount
  } catch (error) {
    console.error('Error loading notifications:', error)
    toast.error('Bildirişlər yüklənərkən xəta baş verdi')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNotifications(1)
})

const handleLoadMore = () => {
  if (!loading.value && hasMore.value) {
    currentPage.value++
    loadNotifications(currentPage.value)
  }
}

const handleMarkAllAsRead = async () => {
  await markAllAsRead()
  localNotifications.value = localNotifications.value.map(n => ({ ...n, isRead: true }))
}

const handleMarkAsReadClicked = async (id: number) => {
  await markAsRead(id)
  const n = localNotifications.value.find(x => x.id === id)
  if (n) n.isRead = true
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'SALE_COMPLETED': return 'lucide:shopping-bag'
    case 'CUSTOMER_ADDED': return 'lucide:user-plus'
    case 'PRODUCT_ADDED': return 'lucide:package-plus'
    case 'LOW_STOCK': return 'lucide:alert-triangle'
    case 'REFUND_PROCESSED': return 'lucide:rotate-ccw'
    case 'INTAKE_CREATED': return 'lucide:truck'
    case 'DEBT_PAYMENT': return 'lucide:banknote'
    case 'EXPENSE_ADDED': return 'lucide:receipt'
    case 'SUPPLIER_ADDED': return 'lucide:truck-point'
    default: return 'lucide:bell'
  }
}

const getColorForType = (type: string) => {
  switch (type) {
    case 'SALE_COMPLETED': return 'text-green-500 bg-green-500/10'
    case 'CUSTOMER_ADDED': return 'text-blue-500 bg-blue-500/10'
    case 'PRODUCT_ADDED': return 'text-purple-500 bg-purple-500/10'
    case 'LOW_STOCK': return 'text-orange-500 bg-orange-500/10'
    case 'REFUND_PROCESSED': return 'text-red-500 bg-red-500/10'
    case 'INTAKE_CREATED': return 'text-cyan-500 bg-cyan-500/10'
    case 'DEBT_PAYMENT': return 'text-emerald-500 bg-emerald-500/10'
    case 'EXPENSE_ADDED': return 'text-rose-500 bg-rose-500/10'
    case 'SUPPLIER_ADDED': return 'text-indigo-500 bg-indigo-500/10'
    default: return 'text-[var(--text-primary)] bg-[var(--text-primary)]/10'
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl md:text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
          <UiIcon name="lucide:bell" class="w-8 h-8 opacity-80" />
          {{ t('notifications.title', 'Bildirişlər') }}
        </h1>
        <p class="text-[var(--text-app)] opacity-60 mt-1 text-sm md:text-base">Müştəri fəaliyyətləri, anbar və satış bildirişləri</p>
      </div>

      <div class="flex gap-2">
        <UiButton 
          v-if="unreadCount > 0"
          type="button" 
          variant="outline" 
          @click="handleMarkAllAsRead"
          icon="lucide:check-check"
        >
          {{ t('notifications.markAllRead', 'Hamısını oxunmuş et') }}
        </UiButton>
        <UiButton 
          type="button" 
          variant="primary" 
          @click="loadNotifications(1)"
          icon="lucide:refresh-cw"
        >
          {{ t('common.update', 'Yenilə') }}
        </UiButton>
      </div>
    </div>


    <!-- Content -->
    <div class="bg-[var(--bg-app)] rounded-2xl border border-[var(--border-app)] shadow-sm flex-1 flex flex-col overflow-hidden">
      
      <div v-if="loading && localNotifications.length === 0" class="flex-1 flex items-center justify-center min-h-[400px]">
        <div class="text-[var(--text-app)] opacity-50 flex flex-col items-center">
          <UiIcon name="lucide:loader-2" class="w-8 h-8 animate-spin mb-4" />
          Məlumatlar yüklənir...
        </div>
      </div>

      <div v-else-if="localNotifications.length === 0" class="flex-1 flex flex-col items-center justify-center text-[var(--text-app)] opacity-50 min-h-[400px]">
        <UiIcon name="lucide:bell-off" class="w-16 h-16 mb-4 opacity-30" />
        <p class="text-xl font-medium">{{ t('notifications.empty', 'Hazırda heç bir bildiriş yoxdur') }}</p>
        <p class="text-sm mt-2 opacity-75">Sistem üzərində əməliyyatlar edildikcə burada görünəcək.</p>
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <div class="divide-y divide-[var(--border-app)]">
          <div 
            v-for="notif in localNotifications" 
            :key="notif.id"
            class="p-4 md:p-6 hover:bg-[var(--text-primary)]/[0.02] transition-colors relative"
            :class="!notif.isRead ? 'bg-[var(--text-primary)]/[0.05]' : ''"
          >
            <div class="flex gap-4">
              <!-- Icon Base -->
              <div class="hidden sm:flex shrink-0 w-12 h-12 rounded-full items-center justify-center" :class="getColorForType(notif.type)">
                <UiIcon :name="getIconForType(notif.type)" class="w-6 h-6" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-2">
                  <h3 class="font-bold text-[var(--text-primary)] md:text-lg flex items-center gap-2">
                    <div class="sm:hidden w-6 h-6 rounded-full flex items-center justify-center" :class="getColorForType(notif.type)">
                      <UiIcon :name="getIconForType(notif.type)" class="w-3.5 h-3.5" />
                    </div>
                    {{ notif.title }}
                  </h3>
                  <div class="text-xs text-[var(--text-app)] opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                    <UiIcon name="lucide:calendar" class="w-3.5 h-3.5" />
                    {{ new Date(notif.createdAt).toLocaleDateString('az-AZ') }}
                    <UiIcon name="lucide:clock" class="w-3.5 h-3.5 ml-1" />
                    {{ new Date(notif.createdAt).toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'}) }}
                  </div>
                </div>
                
                <p class="text-[var(--text-app)] opacity-80 text-sm md:text-base leading-relaxed">
                  {{ notif.message }}
                </p>

                <!-- Action / Metadata / Read Toggle -->
                <div class="mt-4 flex items-center justify-between">
                  <div class="text-xs font-mono opacity-50">
                    ID: {{ notif.id }} • {{ notif.type.replace('_', ' ') }}
                  </div>
                  <button 
                    v-if="!notif.isRead"
                    @click="handleMarkAsReadClicked(notif.id)"
                    class="text-xs font-semibold text-[var(--text-primary)] hover:underline opacity-80 hover:opacity-100 flex items-center gap-1"
                  >
                    <UiIcon name="lucide:check" class="w-3.5 h-3.5" />
                    Oxunmuş et
                  </button>
                  <span v-else class="text-xs opacity-40 flex items-center gap-1">
                    <UiIcon name="lucide:check-check" class="w-3.5 h-3.5" />
                    Oxunub
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Unread Dot Indicator -->
            <div v-if="!notif.isRead" class="absolute top-1/2 -translate-y-1/2 left-0 w-[4px] h-3/4 bg-red-500 rounded-r-md"></div>
          </div>
        </div>

        <div v-if="hasMore" class="p-6 text-center border-t border-[var(--border-app)]">
          <UiButton 
            variant="ghost" 
            @click="handleLoadMore" 
            :loading="loading"
            class="opacity-70 hover:opacity-100"
          >
            {{ t('common.showMore', 'Daha çox yüklə') }}
          </UiButton>
        </div>
      </div>

    </div>
  </div>
</template>
