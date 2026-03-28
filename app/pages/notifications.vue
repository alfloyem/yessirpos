<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useHead, useToast } from '#imports'
import { useI18n } from '#i18n'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import { useNotifications } from '~/composables/useNotifications'
import { useFCM } from '~/composables/useFCM'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const { permissionStatus, requestPermission, isSupported } = useFCM()

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

watch(() => unreadCount.value, (newVal, oldVal) => {
  if (newVal > oldVal) {
    loadNotifications(1)
  }
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

const parseData = (dataStr: any) => {
  if (!dataStr) return {}
  if (typeof dataStr === 'object') return dataStr
  try { return JSON.parse(dataStr) } catch(e) { return {} }
}

const renderMessage = (notif: any) => {
  const data = parseData(notif.data)
  
  switch (notif.type) {
    case 'SALE_COMPLETED':
      return { main: `${Number(data.amount || 0).toFixed(2)} ₼ satış edildi.`, sub: `${data.receiptNo || ''} nömrəli çek` }
    case 'REFUND_PROCESSED':
      return { main: `${Number(data.amount || 0).toFixed(2)} ₼ geri qaytarıldı.`, sub: `${data.originalReceiptNo || ''} nömrəli çek üzrə` }
    case 'DEBT_PAYMENT':
      return { main: `${Number(data.amount || 0).toFixed(2)} ₼ borc ödənildi.`, sub: `${data.receiptNo || ''} nömrəli çek` }
    case 'INTAKE_CREATED':
      return { main: `Yeni mal qəbul edildi.`, sub: `${data.receiptNo || ''} nömrəli qaimə` }
    case 'LOW_STOCK':
      return { main: `${notif.message.split(' (')[0]}`, sub: `Barkod: ${data.barcode || 'Yoxdur'}` }
    case 'CUSTOMER_ADDED':
      return { main: `${data.name || ''} sistemə əlavə edildi.`, sub: `Yeni müştəri profili` }
    case 'PRODUCT_ADDED':
      return { main: `${data.name || ''} siyahıya əlavə edildi.`, sub: `Yeni məhsul` }
    case 'EXPENSE_ADDED':
      return { main: `${Number(data.amount || 0).toFixed(2)} ₼ xərc yazıldı.`, sub: `Məxaric qeydi` }
    case 'SUPPLIER_ADDED':
      return { main: `${data.brandName || ''} təchizatçısı əlavə edildi.`, sub: `Yeni təchizatçı` }
    default:
      return { main: notif.message, sub: null }
  }
}

const handleNotificationClick = async (notif: any) => {
  // Auto read
  if (!notif.isRead) {
    await markAsRead(notif.id)
    notif.isRead = true
  }
  
  // Parse routing data
  const data = parseData(notif.data)
  
  // Navigate
  switch (notif.type) {
    case 'SALE_COMPLETED':
    case 'REFUND_PROCESSED':
      router.push({ path: '/archive', query: { search: data.receiptNo || data.originalReceiptNo } })
      break;
    case 'CUSTOMER_ADDED':
    case 'DEBT_PAYMENT':
      router.push('/customers')
      break;
    case 'PRODUCT_ADDED':
    case 'LOW_STOCK':
      // If we have barcode, we can search for it in products
      router.push(data.barcode ? { path: '/products', query: { search: data.barcode } } : '/products')
      break;
    case 'INTAKE_CREATED':
    case 'SUPPLIER_ADDED':
      router.push('/intake')
      break;
    case 'EXPENSE_ADDED':
      router.push('/expenses')
      break;
  }
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
          v-if="isSupported && permissionStatus === 'default'"
          type="button" 
          variant="outline" 
          @click="requestPermission"
          icon="lucide:bell-ring"
          class="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
        >
          Bildirişlərə İcazə Ver
        </UiButton>
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
            @click="handleNotificationClick(notif)"
            class="p-4 md:p-5 hover:bg-[var(--text-primary)]/[0.04] cursor-pointer transition-colors relative flex flex-col justify-center min-h-[80px]"
            :class="!notif.isRead ? 'bg-[var(--text-primary)]/[0.02]' : ''"
          >
            <div class="flex gap-4">
              <!-- Icon Base -->
              <div class="hidden sm:flex shrink-0 w-12 h-12 rounded-full items-center justify-center" :class="getColorForType(notif.type)">
                <UiIcon :name="getIconForType(notif.type)" class="w-6 h-6" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h3 class="font-bold text-[var(--text-primary)] md:text-[15px] flex items-center gap-2">
                    <div class="sm:hidden w-6 h-6 rounded-full flex items-center justify-center bg-opacity-20" :class="getColorForType(notif.type)">
                      <UiIcon :name="getIconForType(notif.type)" class="w-3.5 h-3.5" />
                    </div>
                    <span>{{ renderMessage(notif).main }}</span>
                    <span v-if="renderMessage(notif).sub" class="text-[var(--text-app)] opacity-40 font-normal text-sm ml-1 hidden md:inline">
                      ({{ renderMessage(notif).sub }})
                    </span>
                  </h3>
                  <div class="text-[11px] text-[var(--text-app)] opacity-40 flex items-center gap-1.5 whitespace-nowrap">
                    {{ new Date(notif.createdAt).toLocaleDateString('az-AZ') }}
                    <span class="opacity-30">•</span>
                    {{ new Date(notif.createdAt).toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'}) }}
                  </div>
                </div>
                
                <!-- Display Sub on mobile since it's hidden on the main line -->
                <p v-if="renderMessage(notif).sub" class="md:hidden text-[var(--text-app)] opacity-50 text-[13px] leading-relaxed mb-1">
                  {{ renderMessage(notif).sub }}
                </p>
              </div>
            </div>
            
            <!-- Unread Line Indicator (instead of dot) -->
            <div v-if="!notif.isRead" class="absolute top-1/2 -translate-y-1/2 left-0 w-[3px] h-1/2 bg-[var(--text-primary)] rounded-r-md opacity-80"></div>
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
