<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead, useToast, useAuth } from '#imports'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import { printReceipt as printReceiptGlobal, printIntakeReceipt, type ReceiptData } from '~/utils/receiptPrinter'

const { t } = useI18n()
const toast = useToast()
const { token } = useAuth()

useHead({
  title: t('menu.orders', 'Fiş Arşivi')
})

// --- Schema ---
const orderSchema = computed(() => [
  { key: 'type', label: t('common.type', 'Növ'), inTable: true, sortable: true },
  { key: 'receiptNo', label: t('sales.receiptNo', 'Çek No'), inTable: true, sortable: true },
  { key: 'createdAtFormatted', label: t('common.date', 'Tarix'), inTable: true, sortable: true },
  { key: 'operator', label: t('common.operator', 'Məsul Şəxs'), inTable: true, sortable: true },
  { key: 'counterparty', label: t('common.counterparty', 'Tərəfdaş'), inTable: true, sortable: true },
  { key: 'paymentMethod', label: t('sales.paymentMethod', 'Ödəniş Üsulu'), inTable: true, sortable: false },
  { key: 'total', label: t('sales.total', 'Yekun'), inTable: true, sortable: true },
])

const columns = computed(() => 
  orderSchema.value
    .filter((f: any) => f.inTable)
    .map((f: any) => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const orders = ref<any[]>([])
const loading = ref(false)
const showDetailsModal = ref(false)
const selectedOrder = ref<any>(null)

const loadOrders = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/receipts', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    orders.value = (data as any[]).map(o => ({
      ...o,
      _date: new Date(o.createdAt),
      createdAtFormatted: new Date(o.createdAt).toLocaleString('az-AZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (err) {
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrders()
})

const handleViewDetails = (row: any) => {
  selectedOrder.value = row
  showDetailsModal.value = true
}

const getPaymentMethodLabel = (order: any) => {
  if (order.type === 'INTAKE') return order.paymentDetails?.method || '---'
  if (!order.paymentDetails) return '---'
  if (order.paymentDetails.isMulti) {
    const methods = Object.entries(order.paymentDetails.payments)
      .filter(([_, amt]) => (amt as number) > 0)
      .map(([name]) => name)
    return methods.join(' + ')
  }
  return order.paymentDetails.method || '---'
}

const printOrder = (order: any) => {
  if (order.type === 'INTAKE') {
    printIntakeReceipt({
      receiptNo: order.receiptNo,
      supplierName: order.counterparty,
      createdBy: order.operator,
      date: new Date(order.createdAt).toLocaleString('az-AZ'),
      items: order.items.map((it: any) => ({
        ...it,
        costPrice: it.price, // In Intake API, costPrice is mapped to price
        discount: it.discount || 0,
        discountType: it.discountType || 'amount'
      })),
      totalAmount: order.total,
      paidAmount: order.paymentDetails?.paidAmount || order.total,
      balanceDue: order.paymentDetails?.balanceDue || 0,
      paymentMethod: order.paymentDetails?.method || t('sales.cash'),
      notes: order.paymentDetails?.notes || ''
    })
  } else {
    // Sale or Refund
    const isRefund = order.type === 'REFUND'
    const receiptData: ReceiptData = {
      receiptNo: order.receiptNo,
      cashierName: order.operator || t('sales.unknown'),
      currentDate: order.createdAtFormatted,
      subtotal: Number(order.subtotal) || 0,
      finalTotal: Number(order.total) || 0,
      discountTotal: Number(order.discountTotal) || 0,
      isArchive: true,
      items: order.items.map((item: any) => ({
        productName: isRefund && !item.productName.includes(t('orders.refundLabel')) ? `${t('orders.refundLabel')} ${item.productName}` : item.productName,
        barcode: item.barcode,
        qty: Math.abs(Number(item.qty)),
        price: Number(item.price),
        finalPrice: Math.abs(Number(item.total / item.qty)),
        discount: Math.abs(Number(item.discount)) || 0,
        discountType: 'amount',
        discountValue: Math.abs(Number(item.discount / item.qty)) || 0,
        total: Math.abs(Number(item.total)),
        attribute: item.attribute
      })),
      customer: order.counterparty !== t('orders.anonymousCustomer') ? {
        name: order.counterparty,
        barcode: order.paymentDetails?.customerBarcode
      } : undefined,
      paymentDetails: {
        isMulti: order.paymentDetails?.isMulti || false,
        method: isRefund ? t('orders.refundPayment') : (order.paymentDetails?.method || t('sales.cash')),
        payments: order.paymentDetails?.payments,
        received: order.paymentDetails?.received,
        change: order.paymentDetails?.change
      }
    }
    printReceiptGlobal(receiptData)
  }
}

const getProfit = (order: any) => {
  if (order.type === 'INTAKE' || !order.items) return 0
  return order.items.reduce((sum: number, item: any) => {
    const wholesale = Number(item.wholesalePrice) || 0
    const price = Number(item.price) || 0
    const qty = Number(item.qty) || 0
    const discount = Number(item.discount) || 0
    // If qty is negative (refund), profit is also effectively reversed
    return sum + ((price - wholesale) * qty - discount)
  }, 0)
}

const customSearch = (item: any, query: string) => {
  const q = query.toLowerCase()
  return (
    item.receiptNo.toLowerCase().includes(q) ||
    item.counterparty.toLowerCase().includes(q) ||
    item.operator.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q) ||
    getPaymentMethodLabel(item).toLowerCase().includes(q)
  )
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'SALE': return 'text-blue-500 bg-blue-500/10'
    case 'REFUND': return 'text-red-500 bg-red-500/10'
    case 'INTAKE': return 'text-green-500 bg-green-500/10'
    default: return 'text-gray-500 bg-gray-500/10'
  }
}

const getTypeText = (type: string) => {
  switch (type) {
    case 'SALE': return t('orders.sale')
    case 'REFUND': return t('orders.refund')
    case 'INTAKE': return t('orders.intake')
    default: return type
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.orders', 'Fiş Arşivi') }}
      </h1>
      
      <div class="flex items-center gap-3">
        <div class="px-4 py-2 bg-[var(--text-primary)]/5 rounded-xl border border-[var(--text-primary)]/10">
          <span class="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('orders.totalRevenue') }}</span>
          <span class="text-lg font-black text-[var(--text-primary)] font-mono">
            {{ orders.reduce((sum: number, o: any) => sum + Math.abs(Number(o.total)), 0).toFixed(2) }} ₼
          </span>
        </div>
        <div class="px-4 py-2 bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)]">
          <span class="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('orders.transactionCount') }}</span>
          <span class="text-lg font-black font-mono">{{ orders.length }}</span>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <DataTable 
      :title="t('menu.orders', 'Fiş Arşivi')"
      :data="orders" 
      :columns="columns"
      :actions="true"
      :show-add="false"
      :show-default-actions="false"
      :loading="loading"
      :custom-search="customSearch"
      @refresh="loadOrders"
    >
      <!-- Type Column -->
      <template #cell-type="{ value }">
        <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" :class="getTypeColor(value)">
          {{ getTypeText(value) }}
        </span>
      </template>

      <!-- Receipt No -->
      <template #cell-receiptNo="{ value, highlight }">
        <div class="font-mono font-bold text-[var(--text-app)] opacity-80" v-html="highlight(value)"></div>
      </template>

      <!-- Counterparty -->
      <template #cell-counterparty="{ value, highlight }">
        <span class="font-black text-sm" v-html="highlight(value)"></span>
      </template>

      <!-- Payment Method -->
      <template #cell-paymentMethod="{ row }">
        <span class="text-[11px] font-bold opacity-60">
          {{ getPaymentMethodLabel(row) }}
        </span>
      </template>

      <!-- Total -->
      <template #cell-total="{ row }">
        <span class="font-black tabular-nums font-mono" :class="row.total < 0 ? 'text-red-500' : 'text-[var(--text-app)]'">
          {{ row.total.toFixed(2) }} ₼
        </span>
      </template>

      <!-- Custom Actions -->
      <template #row-actions="{ row }">
        <UiButton 
          variant="ghost" 
          size="icon" 
          icon="lucide:eye" 
          @click="handleViewDetails(row)"
          class="hover:text-[var(--text-primary)]"
        />
      </template>
    </DataTable>

    <!-- Details Modal -->
    <Modal v-model="showDetailsModal" :title="`${getTypeText(selectedOrder?.type)} - ${selectedOrder?.receiptNo}`" max-width="3xl">
      <div v-if="selectedOrder" class="space-y-6">
        <!-- Header Info -->
        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.operator') }}</span>
            <span class="font-black text-sm">{{ selectedOrder.operator }}</span>
          </div>
          <div class="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.date') }}</span>
            <span class="font-black text-sm">{{ selectedOrder.createdAtFormatted }}</span>
          </div>
          <div class="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.counterparty') }}</span>
            <span class="font-black text-sm">{{ selectedOrder.counterparty }}</span>
          </div>
        </div>

        <!-- Items Table -->
        <div class="rounded-2xl border border-[var(--border-app)] overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--input-bg)]">
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">{{ t('orders.product') }}</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">{{ t('orders.qtyPrice') }}</th>
                <th v-if="selectedOrder.type !== 'INTAKE'" class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">{{ t('orders.profit') }}</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">{{ t('intake.lineTotal') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-app)]">
              <tr v-for="item in selectedOrder.items" :key="item.id" class="hover:bg-[var(--text-primary)]/[0.02]">
                <td class="px-4 py-3">
                  <div class="font-black text-sm">{{ item.productName }}</div>
                  <div class="text-[10px] opacity-40 font-mono">{{ item.barcode }}</div>
                  <div v-if="item.attribute" class="mt-1">
                    <span class="text-[9px] px-1.5 py-0.5 bg-[var(--input-bg)] rounded font-black opacity-60">{{ item.attribute }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm font-black tabular-nums">{{ item.qty }} x {{ item.price.toFixed(2) }} ₼</div>
                  <div v-if="item.discount > 0" class="text-[10px] text-red-500 font-bold">{{ t('sales.discount') }}: -{{ item.discount.toFixed(2) }} ₼</div>
                </td>
                <td v-if="selectedOrder.type !== 'INTAKE'" class="px-4 py-3">
                  <div class="text-sm font-black font-mono" :class="item.qty < 0 ? 'text-red-400' : 'text-green-600'">
                    {{ ((item.price - item.wholesalePrice) * item.qty - item.discount).toFixed(2) }} ₼
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="font-black text-sm tabular-nums font-mono">{{ item.total.toFixed(2) }} ₼</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="flex justify-between items-start">
          <div class="text-[11px] font-bold opacity-40 max-w-[200px]">
             * {{ t('orders.archiveNotice', { method: getPaymentMethodLabel(selectedOrder) }) }}
             <p v-if="selectedOrder.paymentDetails?.notes" class="mt-2 text-orange-600 italic">{{ t('orders.note') }}: {{ selectedOrder.paymentDetails.notes }}</p>
          </div>
          
          <div class="space-y-2 min-w-[240px]">
            <div class="flex justify-between text-xs font-bold">
              <span class="opacity-50">{{ t('sales.subtotal') }}:</span>
              <span class="font-mono">{{ selectedOrder.subtotal.toFixed(2) }} ₼</span>
            </div>
            <div v-if="selectedOrder.discountTotal > 0" class="flex justify-between text-xs font-bold text-red-500">
              <span>{{ t('orders.totalDiscount') }}:</span>
              <span class="font-mono">-{{ selectedOrder.discountTotal.toFixed(2) }} ₼</span>
            </div>
            <div v-if="selectedOrder.type !== 'INTAKE'" class="flex justify-between text-xs font-black text-green-600 p-2 bg-green-500/5 rounded-xl">
              <span>{{ t('orders.approxProfit') }}:</span>
              <span class="font-mono">{{ getProfit(selectedOrder).toFixed(2) }} ₼</span>
            </div>
            <div class="flex justify-between items-end pt-3 border-t border-[var(--border-app)]">
              <span class="text-xs font-black uppercase tracking-widest">{{ t('sales.total') }}:</span>
              <span class="text-2xl font-black text-[var(--text-primary)] font-mono">{{ selectedOrder.total.toFixed(2) }} ₼</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showDetailsModal = false" class="!px-6">{{ t('orders.close') }}</UiButton>
        <UiButton variant="primary" icon="lucide:printer" @click="printOrder(selectedOrder)" class="!px-8">{{ t('orders.print') }}</UiButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
</style>
