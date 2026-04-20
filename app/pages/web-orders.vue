<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead, useToast, useNuxtApp } from '#imports'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'
import Modal from '~/components/ui/Modal.vue'

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

useHead({ title: 'Veb Sifarişlər' })

// --- State ---
const orders = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const limit = 20
const searchQuery = ref('')
const statusFilter = ref('')
const selectedOrder = ref<any>(null)
const showDetailModal = ref(false)
const updatingStatus = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit))

const STATUS_OPTIONS = [
  { value: '', label: 'Hamısı' },
  { value: 'pending', label: 'Gözləyir' },
  { value: 'confirmed', label: 'Təsdiqləndi' },
  { value: 'processing', label: 'Hazırlanır' },
  { value: 'shipped', label: 'Göndərildi' },
  { value: 'delivered', label: 'Çatdırıldı' },
  { value: 'cancelled', label: 'Ləğv edildi' },
]

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s

// --- Load ---
const loadOrders = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, limit }
    if (statusFilter.value) params.status = statusFilter.value
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()

    const data = await ($api as any)('/api/web-orders', { params }) as any
    orders.value = data.orders
    total.value = data.total
  } catch (err: any) {
    toast.error(err.message || 'Sifarişlər yüklənərkən xəta baş verdi')
  } finally {
    loading.value = false
  }
}

onMounted(loadOrders)

// Debounced search
let searchTimer: any
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadOrders() }, 400)
}

const onFilterChange = () => { page.value = 1; loadOrders() }

// --- Detail ---
const openDetail = (order: any) => {
  selectedOrder.value = order
  showDetailModal.value = true
}

// --- Status Update ---
const updateStatus = async (orderId: number, status: string) => {
  updatingStatus.value = true
  try {
    const updated = await ($api as any)(`/api/web-orders/${orderId}`, {
      method: 'PATCH',
      body: { status },
    }) as any
    // Update in list
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) orders.value[idx] = updated
    if (selectedOrder.value?.id === orderId) selectedOrder.value = updated
    toast.success('Status yeniləndi')
  } catch (err: any) {
    toast.error(err.message || 'Xəta baş verdi')
  } finally {
    updatingStatus.value = false
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">Veb Sifarişlər</h1>
      <div class="flex items-center gap-2 text-sm text-[var(--text-app)] opacity-50">
        <UiIcon name="lucide:globe" class="w-4 h-4" />
        bakustreet.az üzərindən gələn sifarişlər
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px]">
        <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
        <input
          v-model="searchQuery"
          @input="onSearch"
          placeholder="Sifariş №, ad, telefon..."
          class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-app)] bg-[var(--input-bg)] text-sm text-[var(--text-app)] outline-none focus:border-[var(--text-primary)]/40 transition-colors"
        />
      </div>

      <!-- Status filter -->
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="opt.value"
          @click="statusFilter = opt.value; onFilterChange()"
          :class="[
            'px-3 py-2 rounded-xl text-xs font-semibold border transition-colors',
            statusFilter === opt.value
              ? 'bg-[var(--text-primary)] text-[var(--bg-app)] border-[var(--text-primary)]'
              : 'border-[var(--border-app)] text-[var(--text-app)] hover:border-[var(--text-primary)]/30'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16 opacity-40">
        <UiIcon name="lucide:loader-2" class="w-6 h-6 animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
        <UiIcon name="lucide:package-open" class="w-10 h-10" />
        <p class="text-sm">Sifariş tapılmadı</p>
      </div>

      <!-- Orders -->
      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--border-app)] text-[var(--text-app)] opacity-50">
                <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Sifariş №</th>
                <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Müştəri</th>
                <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Telefon</th>
                <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Şəhər</th>
                <th class="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Məbləğ</th>
                <th class="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Tarix</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-app)]">
              <tr
                v-for="order in orders"
                :key="order.id"
                class="hover:bg-[var(--text-primary)]/[0.02] transition-colors cursor-pointer"
                @click="openDetail(order)"
              >
                <td class="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">#{{ order.orderNo }}</td>
                <td class="px-4 py-3 font-medium text-[var(--text-app)]">{{ order.customerName }}</td>
                <td class="px-4 py-3 text-[var(--text-app)] opacity-70">{{ order.customerPhone }}</td>
                <td class="px-4 py-3 text-[var(--text-app)] opacity-70">{{ order.city }}</td>
                <td class="px-4 py-3 text-right font-bold text-[var(--text-app)]">{{ Number(order.totalPrice).toFixed(2) }} ₼</td>
                <td class="px-4 py-3 text-center">
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600']">
                    {{ statusLabel(order.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-[var(--text-app)] opacity-60 text-xs">{{ formatDate(order.createdAt) }}</td>
                <td class="px-4 py-3" @click.stop>
                  <button
                    @click="openDetail(order)"
                    class="p-1.5 rounded-lg hover:bg-[var(--text-primary)]/10 text-[var(--text-app)] opacity-50 hover:opacity-100 transition-all"
                  >
                    <UiIcon name="lucide:eye" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-[var(--border-app)]">
          <span class="text-xs text-[var(--text-app)] opacity-50">
            {{ total }} sifarişdən {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }} göstərilir
          </span>
          <div class="flex gap-1">
            <button
              :disabled="page <= 1"
              @click="page--; loadOrders()"
              class="px-3 py-1.5 rounded-lg border border-[var(--border-app)] text-xs disabled:opacity-30 hover:bg-[var(--text-primary)]/5 transition-colors"
            >
              ←
            </button>
            <span class="px-3 py-1.5 text-xs font-medium">{{ page }} / {{ totalPages }}</span>
            <button
              :disabled="page >= totalPages"
              @click="page++; loadOrders()"
              class="px-3 py-1.5 rounded-lg border border-[var(--border-app)] text-xs disabled:opacity-30 hover:bg-[var(--text-primary)]/5 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Detail Modal -->
    <Modal v-model="showDetailModal" :title="`Sifariş #${selectedOrder?.orderNo}`" max-width="2xl">
      <div v-if="selectedOrder" class="space-y-5">

        <!-- Status + Actions -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <span :class="['px-3 py-1.5 rounded-full text-sm font-semibold', STATUS_STYLES[selectedOrder.status] || 'bg-gray-100 text-gray-600']">
            {{ statusLabel(selectedOrder.status) }}
          </span>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in STATUS_OPTIONS.filter(o => o.value && o.value !== selectedOrder.status)"
              :key="opt.value"
              @click="updateStatus(selectedOrder.id, opt.value)"
              :disabled="updatingStatus"
              class="px-3 py-1.5 rounded-xl border border-[var(--border-app)] text-xs font-medium hover:bg-[var(--text-primary)]/5 transition-colors disabled:opacity-40"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <p class="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">Müştəri</p>
            <p class="text-sm font-semibold">{{ selectedOrder.customerName }}</p>
            <p class="text-xs opacity-60 mt-0.5">{{ selectedOrder.customerPhone }}</p>
            <p v-if="selectedOrder.customerEmail" class="text-xs opacity-60">{{ selectedOrder.customerEmail }}</p>
          </div>
          <div class="p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <p class="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">Çatdırılma</p>
            <p class="text-sm font-semibold">{{ selectedOrder.address }}</p>
            <p class="text-xs opacity-60 mt-0.5">{{ selectedOrder.city }}, {{ selectedOrder.country }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="selectedOrder.notes" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span class="font-semibold">Qeyd: </span>{{ selectedOrder.notes }}
        </div>

        <!-- Items -->
        <div>
          <p class="text-xs font-bold uppercase tracking-wider opacity-40 mb-2">Məhsullar</p>
          <div class="space-y-2">
            <div
              v-for="item in selectedOrder.items"
              :key="item.id"
              class="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-app)] bg-[var(--bg-app)]"
            >
              <div v-if="item.image" class="w-12 h-12 rounded-lg overflow-hidden bg-[var(--input-bg)] shrink-0">
                <img :src="item.image" :alt="item.productName" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ item.productName }}</p>
                <p v-if="item.attributes" class="text-xs opacity-50">
                  {{ Object.values(JSON.parse(item.attributes || '{}')).join(', ') }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold">{{ Number(item.total).toFixed(2) }} ₼</p>
                <p class="text-xs opacity-50">{{ item.qty }} × {{ Number(item.price).toFixed(2) }} ₼</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Totals -->
        <div class="border-t border-[var(--border-app)] pt-3 space-y-1.5 text-sm">
          <div class="flex justify-between text-[var(--text-app)] opacity-60">
            <span>Məhsullar</span>
            <span>{{ Number(selectedOrder.subtotal).toFixed(2) }} ₼</span>
          </div>
          <div class="flex justify-between text-[var(--text-app)] opacity-60">
            <span>Çatdırılma</span>
            <span>{{ Number(selectedOrder.deliveryFee) === 0 ? 'Pulsuz' : Number(selectedOrder.deliveryFee).toFixed(2) + ' ₼' }}</span>
          </div>
          <div class="flex justify-between font-bold text-base">
            <span>Cəmi</span>
            <span>{{ Number(selectedOrder.totalPrice).toFixed(2) }} ₼</span>
          </div>
        </div>

        <p class="text-xs opacity-40 text-right">{{ formatDate(selectedOrder.createdAt) }}</p>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showDetailModal = false">Bağla</UiButton>
      </template>
    </Modal>
  </div>
</template>
