<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead, useToast, useAuth } from '#imports'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiInput from '~/components/ui/Input.vue'
import { printReceipt as printReceiptGlobal, printIntakeReceipt, printDebtPaymentReceipt, type ReceiptData } from '~/utils/receiptPrinter'

const { t } = useI18n()
const toast = useToast()
const { token } = useAuth()
const { $api } = useNuxtApp()

useHead({ title: t('menu.orders') })

const orderSchema = computed(() => [
  { key: 'type', label: t('common.type'), inTable: true, sortable: true },
  { key: 'receiptNo', label: t('sales.receiptNo'), inTable: true, sortable: true },
  { key: 'createdAtFormatted', label: t('common.date'), inTable: true, sortable: true },
  { key: 'operator', label: t('common.operator'), inTable: true, sortable: true },
  { key: 'counterparty', label: t('common.counterparty'), inTable: true, sortable: true },
  { key: 'paymentMethod', label: t('sales.paymentMethod'), inTable: true, sortable: false },
  { key: 'total', label: t('sales.total'), inTable: true, sortable: true },
])

const columns = computed(() =>
  orderSchema.value.filter((f: any) => f.inTable).map((f: any) => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

const orders = ref<any[]>([])
const loading = ref(false)
const showDetailsModal = ref(false)
const selectedOrder = ref<any>(null)
const activeFilter = ref<'ALL' | 'DEBT'>('ALL')
const loadLimit = ref(200)

const filteredOrders = computed(() => {
  if (activeFilter.value === 'DEBT') {
    return orders.value.filter(o => o.type === 'INTAKE' && o.paymentDetails?.balanceDue > 0)
  }
  return orders.value
})

const loadOrders = async () => {
  loading.value = true
  try {
    const data = await $api(`/api/receipts?limit=${loadLimit.value}`)
    orders.value = (data as any[]).map(o => ({
      ...o,
      _date: new Date(o.createdAt),
      createdAtFormatted: new Date(o.createdAt).toLocaleString('az-AZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (error: any) {
    console.error('Archive load error:', error)
    toast.error(error?.data?.statusMessage || t('toast.loadingError'))
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadOrders() })

const loadMore = () => {
  loadLimit.value += 200
  loadOrders()
}

const handleViewDetails = (row: any) => {
  selectedOrder.value = row
  showDetailsModal.value = true
}

const getPaymentMethodLabel = (order: any) => {
  if (order.type === 'INTAKE' || order.type === 'DEBT_PAYMENT') return order.paymentDetails?.method || '---'
  if (!order.paymentDetails) return '---'
  if (order.paymentDetails.isMulti) {
    return Object.entries(order.paymentDetails.payments)
      .filter(([_, amt]) => (amt as number) > 0)
      .map(([name]) => name).join(' + ')
  }
  return order.paymentDetails.method || '---'
}

const printOrder = (order: any) => {
  if (order.type === 'DEBT_PAYMENT') {
    printDebtPaymentReceipt({
      receiptNo: order.receiptNo,
      relatedIntakeNo: order.paymentDetails?.relatedIntakeNo,
      counterpartyName: order.counterparty,
      amount: order.total,
      paymentMethod: order.paymentDetails?.method || t('sales.cash'),
      paidBy: order.operator !== 'Sistem' ? order.operator : undefined,
      notes: order.paymentDetails?.notes,
      date: order.createdAtFormatted,
      remainingBalance: order.paymentDetails?.remainingDebt || 0,
      isCustomer: order.paymentDetails?.isCustomer || false
    })
    return
  }
  if (order.type === 'INTAKE') {
    printIntakeReceipt({
      receiptNo: order.receiptNo,
      supplierName: order.counterparty,
      createdBy: order.operator,
      date: new Date(order.createdAt).toLocaleString('az-AZ'),
      items: order.items.map((it: any) => ({ ...it, costPrice: it.price, discount: it.discount || 0, discountType: it.discountType || 'amount' })),
      totalAmount: order.total,
      paidAmount: order.paymentDetails?.paidAmount || order.total,
      balanceDue: order.paymentDetails?.balanceDue || 0,
      paymentMethod: order.paymentDetails?.method || t('sales.cash'),
      notes: order.paymentDetails?.notes || ''
    })
    return
  }
  const isRefund = order.type === 'REFUND'
  const receiptData: ReceiptData = {
    receiptNo: order.receiptNo,
    cashierName: order.operator || t('sales.unknown'),
    currentDate: order.createdAtFormatted,
    subtotal: Number(order.subtotal) || 0,
    finalTotal: Number(order.total) || 0,
    discountTotal: Number(order.discountTotal) || 0,
    discountVal: order.paymentDetails?.discountVal || 0,
    discountType: order.paymentDetails?.discountType || 'amount',
    isArchive: true,
    items: order.items.map((item: any) => {
      const originalPrice = Number(item.price) || 0;
      const finalPrice = Math.abs(Number(item.total / item.qty)) || 0;
      const discountPerUnit = originalPrice - finalPrice;

      return {
        productName: isRefund && !item.productName.includes(t('orders.refundLabel')) ? `${t('orders.refundLabel')} ${item.productName}` : item.productName,
        barcode: item.barcode,
        qty: Math.abs(Number(item.qty)),
        price: originalPrice,
        finalPrice: finalPrice,
        discount: discountPerUnit > 0 ? discountPerUnit : 0,
        discountType: 'amount', // Historics are calculated in amounts
        discountValue: discountPerUnit > 0 ? discountPerUnit : 0,
        total: Math.abs(Number(item.total)),
        attribute: item.attribute
      }
    }),
    customer: order.counterparty !== t('orders.anonymousCustomer') ? { name: order.counterparty, barcode: order.paymentDetails?.customerBarcode } : undefined,
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

const getProfit = (order: any) => {
  if (order.type === 'INTAKE' || order.type === 'DEBT_PAYMENT' || !order.items) return 0
  return order.items.reduce((sum: number, item: any) => {
    return sum + ((Number(item.price) - Number(item.wholesalePrice)) * Number(item.qty) - Number(item.discount))
  }, 0)
}

const customSearch = (item: any, query: string) => {
  const q = query.toLowerCase()
  return item.receiptNo.toLowerCase().includes(q) || item.counterparty.toLowerCase().includes(q) ||
    item.operator.toLowerCase().includes(q) || item.type.toLowerCase().includes(q) ||
    getPaymentMethodLabel(item).toLowerCase().includes(q)
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'SALE': return 'text-blue-600 bg-blue-500/10'
    case 'REFUND': return 'text-rose-600 bg-rose-500/10'
    case 'INTAKE': return 'text-emerald-600 bg-emerald-500/10'
    case 'DEBT_PAYMENT': return 'text-amber-600 bg-amber-500/10'
    default: return 'text-gray-500 bg-gray-500/10'
  }
}

const getTypeText = (type: string) => {
  switch (type) {
    case 'SALE': return t('orders.sale')
    case 'REFUND': return t('orders.refund')
    case 'INTAKE': return t('orders.intake')
    case 'DEBT_PAYMENT': return t('orders.debtPayment')
    default: return type
  }
}

// --- Debt Payment ---
const showPayDebtModal = ref(false)
const payDebtAmount = ref<number>(0)
const payDebtMethod = ref('Nəğd')
const payingDebt = ref(false)

const openPayDebt = (order: any) => {
  payDebtAmount.value = order.paymentDetails?.balanceDue || 0
  payDebtMethod.value = 'Nəğd'
  showPayDebtModal.value = true
}

const submitPayDebt = async () => {
  if (!selectedOrder.value || payDebtAmount.value <= 0) return
  payingDebt.value = true
  try {
    const result = await $api(`/api/intake/${selectedOrder.value.dbId}/pay`, {
      method: 'POST',
      body: { amount: payDebtAmount.value, paymentMethod: payDebtMethod.value }
    }) as any

    // Print receipt immediately
    printDebtPaymentReceipt({
      receiptNo: result.payment.receiptNo,
      relatedIntakeNo: result.intake.receiptNo,
      counterpartyName: result.intake.supplierName,
      amount: result.payment.amount,
      paymentMethod: result.payment.paymentMethod,
      date: new Date().toLocaleString('az-AZ'),
      remainingBalance: result.balanceDue,
    })

    // Update local state
    selectedOrder.value.paymentDetails.paidAmount = result.paidAmount
    selectedOrder.value.paymentDetails.balanceDue = result.balanceDue
    const idx = orders.value.findIndex(o => o.dbId === selectedOrder.value.dbId)
    if (idx !== -1) {
      orders.value[idx].paymentDetails.paidAmount = result.paidAmount
      orders.value[idx].paymentDetails.balanceDue = result.balanceDue
    }

    // Add debt payment record to local list
    orders.value.unshift({
      id: `debtpay-${result.payment.id}`,
      dbId: result.payment.id,
      receiptNo: result.payment.receiptNo,
      createdAt: result.payment.createdAt,
      type: 'DEBT_PAYMENT',
      counterparty: result.intake.supplierName,
      operator: 'Sistem',
      total: result.payment.amount,
      subtotal: result.payment.amount,
      discountTotal: 0,
      paymentDetails: {
        method: result.payment.paymentMethod,
        paidAmount: result.payment.amount,
        balanceDue: 0,
        relatedIntakeNo: result.intake.receiptNo,
      },
      items: selectedOrder.value.items,
      _date: new Date(result.payment.createdAt),
      createdAtFormatted: new Date(result.payment.createdAt).toLocaleString('az-AZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    })

    showPayDebtModal.value = false
    toast.success(t('orders.debtPaid'))
  } catch {
    toast.error(t('toast.operationFailed'))
  } finally {
    payingDebt.value = false
  }
}
const formatAttribute = (attr: any) => {
  if (!attr) return ''
  try {
    // Əgər JSON stringidirsə
    if (typeof attr === 'string' && (attr.startsWith('{') || attr.startsWith('['))) {
      const parsed = JSON.parse(attr)
      if (Array.isArray(parsed)) return parsed.join(', ')
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      }
    }
  } catch (e) {
    // Parse xətası olarsa olduğu kimi saxla
  }
  return String(attr)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">{{ t('orders.title') }}</h1>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Debt filter toggle -->
        <div class="flex items-center gap-1 p-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-app)] w-full sm:w-auto">
          <button
            @click="activeFilter = 'ALL'"
            class="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            :class="activeFilter === 'ALL' ? 'bg-[var(--text-primary)] text-[var(--bg-app)]' : 'opacity-50 hover:opacity-80'"
          >{{ t('orders.filterAll') }}</button>
          <button
            @click="activeFilter = 'DEBT'"
            class="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
            :class="activeFilter === 'DEBT' ? 'bg-rose-500 text-white' : 'opacity-50 hover:opacity-80'"
          >
            <UiIcon name="lucide:alert-circle" class="w-3 h-3" />
            {{ t('orders.filterDebts') }}
            <span v-if="orders.filter(o => o.type === 'INTAKE' && o.paymentDetails?.balanceDue > 0).length > 0"
              class="bg-white/20 rounded-full px-1.5 text-[10px]">
              {{ orders.filter(o => o.type === 'INTAKE' && o.paymentDetails?.balanceDue > 0).length }}
            </span>
          </button>
        </div>
        <!-- Stats -->
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <div class="flex-1 sm:flex-none px-4 py-2 bg-[var(--text-primary)]/5 rounded-xl border border-[var(--text-primary)]/10 text-center sm:text-left">
            <span class="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1 whitespace-nowrap">{{ t('orders.totalRevenue') }}</span>
            <span class="text-base sm:text-lg font-black text-[var(--text-primary)] font-mono whitespace-nowrap">
              {{ orders.reduce((sum: number, o: any) => sum + Math.abs(Number(o.total)), 0).toFixed(2) }} ₼
            </span>
          </div>
          <div class="flex-1 sm:flex-none px-4 py-2 bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)] text-center sm:text-left">
            <span class="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1 whitespace-nowrap">{{ t('orders.transactionCount') }}</span>
            <span class="text-base sm:text-lg font-black font-mono">{{ orders.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <DataTable
      :title="t('orders.title')"
      :data="filteredOrders"
      :columns="columns"
      :actions="true"
      :show-add="false"
      :show-default-actions="false"
      :loading="loading"
      :custom-search="customSearch"
      @refresh="loadOrders"
    >
      <template v-if="!loading && orders.length === 0" #empty>
        <div class="text-center py-12">
          <UiIcon name="lucide:inbox" class="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p class="text-lg font-bold opacity-60">{{ t('orders.noData') }}</p>
          <p class="text-sm opacity-40 mt-2">{{ t('orders.noDataDescription') }}</p>
        </div>
      </template>
      <template #cell-type="{ value }">
        <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" :class="getTypeColor(value)">
          {{ getTypeText(value) }}
        </span>
      </template>
      <template #cell-receiptNo="{ value, highlight }">
        <div class="font-mono font-bold text-[var(--text-app)] opacity-80" v-html="highlight(value)"></div>
      </template>
      <template #cell-counterparty="{ value, row, highlight }">
        <div class="flex items-center gap-2">
          <span class="font-black text-sm" v-html="highlight(value)"></span>
          <span v-if="row.type === 'INTAKE' && row.paymentDetails?.balanceDue > 0"
            class="text-[9px] font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-600 rounded-md border border-rose-500/20">
            {{ row.paymentDetails.balanceDue.toFixed(2) }} ₼ borc
          </span>
        </div>
      </template>
      <template #cell-paymentMethod="{ row }">
        <span class="text-[11px] font-bold opacity-60">{{ getPaymentMethodLabel(row) }}</span>
      </template>
      <template #cell-total="{ row }">
        <span class="font-black tabular-nums font-mono" :class="row.total < 0 ? 'text-rose-600' : 'text-[var(--text-app)]'">
          {{ row.total.toFixed(2) }} ₼
        </span>
      </template>
      <template #row-actions="{ row }">
        <UiButton variant="ghost" size="icon" icon="lucide:eye" @click="handleViewDetails(row)" class="hover:text-[var(--text-primary)]" />
      </template>

      <template #context-menu="{ row }">
        <button 
          @click="handleViewDetails(row)" 
          class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-all group"
        >
          <UiIcon name="lucide:eye" class="w-4 h-4 opacity-50 group-hover:opacity-100" />
          <span>{{ t('common.show', 'Göstər') }}</span>
        </button>
        <button 
          @click="printOrder(row)" 
          class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-all group"
        >
          <UiIcon name="lucide:printer" class="w-4 h-4 opacity-50 group-hover:opacity-100" />
          <span>{{ t('orders.print', 'Çap et') }}</span>
        </button>
        <template v-if="row.type === 'INTAKE' && row.paymentDetails?.balanceDue > 0">
          <div class="my-1 h-px bg-[var(--border-app)]"></div>
          <button 
            @click="selectedOrder = row; openPayDebt(row)" 
            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-rose-500/10 text-rose-600 transition-all group"
          >
            <UiIcon name="lucide:wallet" class="w-4 h-4 opacity-70 group-hover:opacity-100" />
            <span>{{ t('orders.payDebt', 'Borcu ödə') }}</span>
          </button>
        </template>
      </template>
    </DataTable>

    <div class="flex justify-center my-4 pb-8" v-if="orders.length >= loadLimit">
      <UiButton 
        variant="outline" 
        icon="lucide:chevron-down" 
        :loading="loading" 
        @click="loadMore"
        class="bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-app)] px-8 font-black rounded-full"
      >
        {{ t('reports.loadMore', 'Daha Çox Yüklə') }}
      </UiButton>
    </div>

    <!-- Details Modal -->
    <Modal v-model="showDetailsModal" :title="`${getTypeText(selectedOrder?.type)} — ${selectedOrder?.receiptNo}`" max-width="3xl">
      <div v-if="selectedOrder" class="space-y-6">
        <!-- DEBT_PAYMENT banner -->
        <div v-if="selectedOrder.type === 'DEBT_PAYMENT'" class="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <UiIcon name="lucide:wallet" class="w-5 h-5 text-amber-600 shrink-0" />
          <div class="text-sm">
            <span class="font-black text-amber-600">{{ t('orders.debtPayment') }}</span>
            <span class="opacity-60 ml-2">{{ t('orders.relatedIntake') }}: </span>
            <span class="font-mono font-black">{{ selectedOrder.paymentDetails?.relatedIntakeNo }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div class="p-3 md:p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)] flex flex-col justify-center">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.operator') }}</span>
            <span class="font-black text-sm">{{ selectedOrder.operator }}</span>
          </div>
          <div class="p-3 md:p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)] flex flex-col justify-center">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.date') }}</span>
            <span class="font-black text-sm">{{ selectedOrder.createdAtFormatted }}</span>
          </div>
          <div class="p-3 md:p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)] flex flex-col justify-center sm:col-span-2 lg:col-span-1">
            <span class="text-[9px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('common.counterparty') }}</span>
            <span class="font-black text-sm truncate">{{ selectedOrder.counterparty }}</span>
          </div>
        </div>

        <!-- Items table (hidden for DEBT_PAYMENT if no items) -->
        <div v-if="selectedOrder.items?.length" class="rounded-2xl border border-[var(--border-app)] overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse min-w-[600px] lg:min-w-full">
            <thead>
              <tr class="bg-[var(--input-bg)]">
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">{{ t('orders.product') }}</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">{{ t('orders.qtyPrice') }}</th>
                <th v-if="selectedOrder.type === 'SALE' || selectedOrder.type === 'REFUND'" class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">{{ t('orders.profit') }}</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right whitespace-nowrap">{{ t('intake.lineTotal') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-app)]">
              <tr v-for="item in selectedOrder.items" :key="item.id" class="hover:bg-[var(--text-primary)]/[0.02]">
                <td class="px-4 py-3">
                  <div class="font-black text-sm">{{ item.productName }}</div>
                  <div class="text-[10px] opacity-40 font-mono">{{ item.barcode }}</div>
                  <div v-if="item.attribute" class="mt-1">
                    <span class="text-[9px] px-1.5 py-0.5 bg-[var(--input-bg)] rounded font-black opacity-60">{{ formatAttribute(item.attribute) }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm font-black tabular-nums whitespace-nowrap">{{ item.qty }} x {{ item.price.toFixed(2) }} ₼</div>
                  <div v-if="item.discount > 0" class="text-[10px] text-rose-600 font-bold whitespace-nowrap">{{ t('sales.discount') }}: -{{ item.discount.toFixed(2) }} ₼</div>
                </td>
                <td v-if="selectedOrder.type === 'SALE' || selectedOrder.type === 'REFUND'" class="px-4 py-3">
                  <div class="text-sm font-black font-mono whitespace-nowrap" :class="item.qty < 0 ? 'text-rose-500' : 'text-emerald-600'">
                    {{ ((item.price - item.wholesalePrice) * item.qty - item.discount).toFixed(2) }} ₼
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="font-black text-sm tabular-nums font-mono whitespace-nowrap">{{ item.total.toFixed(2) }} ₼</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div class="text-[11px] font-bold opacity-40 w-full lg:max-w-md bg-[var(--input-bg)]/50 p-4 rounded-2xl border border-[var(--border-app)] order-2 lg:order-1">
            <div class="flex items-start gap-2">
              <UiIcon name="lucide:info" class="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
              <span>{{ t('orders.archiveNotice', { method: getPaymentMethodLabel(selectedOrder) }) }}</span>
            </div>
            <div v-if="selectedOrder.paymentDetails?.notes" class="mt-3 pt-3 border-t border-[var(--border-app)] border-dashed">
              <span class="text-[9px] uppercase tracking-widest opacity-60 block mb-1">{{ t('orders.note') }}</span>
              <p class="text-amber-600 italic font-medium">{{ selectedOrder.paymentDetails.notes }}</p>
            </div>
          </div>
          
          <div class="space-y-2 w-full lg:min-w-[280px] lg:w-auto order-1 lg:order-2">
            <div v-if="selectedOrder.type !== 'DEBT_PAYMENT'" class="flex justify-between text-xs font-bold px-1">
              <span class="opacity-50">{{ t('sales.subtotal') }}:</span>
              <span class="font-mono">{{ selectedOrder.subtotal.toFixed(2) }} ₼</span>
            </div>
            <div v-if="selectedOrder.discountTotal > 0" class="flex justify-between text-xs font-bold text-rose-600 px-1">
              <span>{{ t('orders.totalDiscount') }}:</span>
              <span class="font-mono">-{{ selectedOrder.discountTotal.toFixed(2) }} ₼</span>
            </div>
            <div v-if="selectedOrder.type === 'SALE' || selectedOrder.type === 'REFUND'" class="flex justify-between text-xs font-black text-emerald-600 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <span>{{ t('orders.approxProfit') }}:</span>
              <span class="font-mono">{{ getProfit(selectedOrder).toFixed(2) }} ₼</span>
            </div>
            <template v-if="selectedOrder.type === 'INTAKE'">
              <div class="flex justify-between text-xs font-bold text-emerald-600 px-1">
                <span>{{ t('orders.paid') }}:</span>
                <span class="font-mono">{{ (selectedOrder.paymentDetails?.paidAmount || 0).toFixed(2) }} ₼</span>
              </div>
              <div v-if="selectedOrder.paymentDetails?.balanceDue > 0" class="flex justify-between text-xs font-black text-rose-600 p-2 bg-rose-500/8 rounded-xl border border-rose-500/20">
                <span>{{ t('orders.remainingDebt') }}:</span>
                <span class="font-mono">{{ selectedOrder.paymentDetails.balanceDue.toFixed(2) }} ₼</span>
              </div>
              <div v-else class="flex justify-between text-xs font-black text-emerald-600 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <span>{{ t('orders.noDebt') }}</span>
              </div>
            </template>
            <div class="flex justify-between items-center pt-3 border-t border-[var(--border-app)] px-1">
              <span class="text-xs font-black uppercase tracking-widest">{{ t('sales.total') }}:</span>
              <span class="text-2xl font-black text-[var(--text-primary)] font-mono">{{ selectedOrder.total.toFixed(2) }} ₼</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
          <UiButton variant="ghost" @click="showDetailsModal = false" class="w-full sm:w-auto px-6">{{ t('orders.close') }}</UiButton>
          <UiButton
            v-if="selectedOrder?.type === 'INTAKE' && selectedOrder?.paymentDetails?.balanceDue > 0"
            variant="outline"
            icon="lucide:wallet"
            @click="openPayDebt(selectedOrder)"
            class="w-full sm:w-auto px-6 text-rose-600 border-rose-500/25 hover:bg-rose-500/5 font-black"
          >
            {{ t('orders.payDebt') }} ({{ selectedOrder.paymentDetails.balanceDue.toFixed(2) }} ₼)
          </UiButton>
          <UiButton variant="primary" icon="lucide:printer" @click="printOrder(selectedOrder)" class="w-full sm:w-auto px-8">{{ t('orders.print') }}</UiButton>
        </div>
      </template>
    </Modal>

    <!-- Pay Debt Modal -->
    <Modal v-model="showPayDebtModal" :title="t('orders.payDebtTitle')" max-width="sm">
      <div v-if="selectedOrder" class="space-y-4">
        <div class="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-center">
          <span class="text-[10px] font-black opacity-50 uppercase tracking-widest block mb-1">{{ t('orders.remainingDebt') }}</span>
          <span class="text-2xl font-black text-rose-600 font-mono">{{ selectedOrder.paymentDetails?.balanceDue?.toFixed(2) }} ₼</span>
          <div class="text-[11px] opacity-50 mt-1 font-mono">{{ selectedOrder.receiptNo }}</div>
        </div>
        <UiInput
          v-model="payDebtAmount"
          type="number"
          :label="t('orders.paymentAmount')"
          icon="lucide:banknote"
          :placeholder="selectedOrder.paymentDetails?.balanceDue?.toFixed(2)"
        />
        <UiInput
          v-model="payDebtMethod"
          type="text"
          :label="t('sales.paymentMethod')"
          icon="lucide:credit-card"
          placeholder="Nəğd"
        />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showPayDebtModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" :loading="payingDebt" @click="submitPayDebt">{{ t('orders.confirmPayment') }}</UiButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
</style>
