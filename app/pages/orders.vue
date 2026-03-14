<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead, useToast, useAuth } from '#imports'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'

const { t } = useI18n()
const toast = useToast()
const { token } = useAuth()

useHead({
  title: t('menu.orders', 'Satış Arşivi')
})

// --- Schema ---
const orderSchema = computed(() => [
  { key: 'receiptNo', label: t('sales.receiptNo', 'Çek No'), inTable: true, sortable: true },
  { key: 'createdAt', label: t('common.date', 'Tarix'), inTable: true, sortable: true },
  { key: 'cashierName', label: t('sales.cashier', 'Kassir'), inTable: true, sortable: true },
  { key: 'customerName', label: t('menu.customers', 'Müştəri'), inTable: true, sortable: true },
  { key: 'paymentMethod', label: t('sales.paymentMethod', 'Ödəniş Üsulu'), inTable: true, sortable: false },
  { key: 'finalTotal', label: t('sales.total', 'Yekun'), inTable: true, sortable: true },
])

const columns = computed(() => 
  orderSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const orders = ref<any[]>([])
const loading = ref(false)
const showDetailsModal = ref(false)
const selectedOrder = ref<any>(null)

const loadOrders = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/sales', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    orders.value = (data as any[]).map(o => ({
      ...o,
      _date: new Date(o.createdAt),
      createdAt: new Date(o.createdAt).toLocaleString('az-AZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
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
  if (!order.paymentDetails) return '---'
  if (order.paymentDetails.isMulti) {
    const methods = Object.entries(order.paymentDetails.payments)
      .filter(([_, amt]) => (amt as number) > 0)
      .map(([name]) => name)
    return methods.join(' + ')
  }
  return order.paymentDetails.method || '---'
}

// --- Printing Logic (Mirrored from sales.vue but fixed for archive data) ---
const printOrder = (order: any) => {
  const receiptNo = order.receiptNo
  const cashierName = order.cashierName || 'Məlum deyil'
  const currentDate = order.createdAt
  
  const customerInfoHtml = order.customerName ? `
    <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; font-size: 11px;">
      <div style="font-weight: bold;">MÜŞTƏRİ: ${order.customerName}</div>
    </div>
  ` : ''

  const itemsHtml = order.items.map((item: any) => {
    const price = Number(item.price) || 0
    const d = Number(item.discount) || 0
    const qty = Number(item.qty) || 0
    const total = Number(item.total) || 0
    const cleanName = item.productName.replace(/\s+\d+$/, '')
    
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) {
        attrStr = item.attribute.map((a: string) => a.split(':').pop()?.trim()).join(', ')
      } else if (typeof item.attribute === 'string') {
        attrStr = item.attribute
      }
    }

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dotted #eee; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 13px;">${cleanName}</div>
        <div style="font-size: 10px; color: #555;">${item.barcode || ''} ${attrStr ? ` | ${attrStr}` : ''}</div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px; font-family: monospace; font-size: 12px;">
          <span>${qty.toFixed(2)} x ${price.toFixed(2)}</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    `
  }).join('')

  const details = order.paymentDetails || {}
  let paymentHtml = ''
  if (details.isMulti) {
    paymentHtml = Object.entries(details.payments)
      .filter(([_, amt]) => (amt as number) > 0)
      .map(([name, amt]) => {
        let extra = ''
        if (name === 'Bonus') extra = `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${order.customerBarcode || '---'}</div>`
        if (name === 'Hədiyyə Kartı' && details.giftCardBarcode) {
           extra = `<div style="font-size: 9px; opacity: 0.7;">Kart: ${details.giftCardBarcode}</div>`
        }
        return `
          <div style="margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="text-transform: capitalize; font-weight: bold;">${name}:</span>
              <span>${(amt as number).toFixed(2)} ₼</span>
            </div>
            ${extra}
          </div>
        `
      }).join('')
  } else {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Ödəniş Üsulu:</span>
        <span style="font-weight: bold;">${details.method}</span>
      </div>
      ${details.method === 'Bonus' ? `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${order.customerBarcode || '---'}</div>` : ''}
      ${details.method === 'Hədiyyə Kartı' ? `<div style="font-size: 9px; opacity: 0.7;">Kart: ${details.giftCardBarcode || '---'}</div>` : ''}
    `
  }

  const printContent = `
    <html>
      <head>
        <title>Satış Çeki #${receiptNo}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 16px; font-weight: bold; text-decoration: underline; margin: 15px 0; }
          .info-block { font-size: 12px; text-align: left; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .yekun { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-bottom: 10px; }
        </style>
        <${'script'} src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></${'script'}>
      </head>
      <body>
        <div class="center">
          <div class="title">ARAZ MARKET - SATIŞ ÇEKİ</div>
          <div class="info-block">
            <div>Çek no: ${receiptNo}</div>
            <div>Kassir: ${cashierName}</div>
            <div>Tarix: ${currentDate}</div>
          </div>
          <div class="items">
            ${customerInfoHtml}
            ${itemsHtml}
          </div>
          <div style="margin-top: 10px; border-top: 2px solid #000; padding-top: 5px;">
            <div class="yekun">
              <span>YEKUN:</span>
              <span>${Number(order.finalTotal).toFixed(2)} ₼</span>
            </div>
          </div>
          <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; text-align: left;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">ÖDƏNİŞ DETALLARI:</div>
            ${paymentHtml}
          </div>
          <div style="margin-top: 20px;">
            <svg id="barcode-receipt"></svg>
          </div>
          <div style="margin-top: 10px; font-size: 10px;">* ARXİV SURƏTİ *</div>
        </div>
        <${'script'}>
          window.onload = function() {
            if (typeof JsBarcode === 'function') {
              JsBarcode("#barcode-receipt", "${receiptNo}", {
                format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 12, margin: 0
              });
            }
          };
        </${'script'}>
      </body>
    </html>
  `
  const printWin = window.open('', '', 'width=400,height=600')
  if (printWin) {
    printWin.document.write(printContent)
    printWin.document.close()
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 300)
  }
}

const getProfit = (order: any) => {
  if (!order.items) return 0
  return order.items.reduce((sum: number, item: any) => {
    const wholesale = Number(item.wholesalePrice) || 0
    const price = Number(item.price) || 0
    const qty = Number(item.qty) || 0
    const discount = Number(item.discount) || 0
    return sum + ((price - wholesale) * qty - discount)
  }, 0)
}

const customSearch = (item: any, query: string) => {
  const q = query.toLowerCase()
  return (
    item.receiptNo.toLowerCase().includes(q) ||
    (item.customerName || '').toLowerCase().includes(q) ||
    (item.cashierName || '').toLowerCase().includes(q) ||
    getPaymentMethodLabel(item).toLowerCase().includes(q)
  )
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.orders', 'Satış Arşivi') }}
      </h1>
      
      <div class="flex items-center gap-3">
        <div class="px-4 py-2 bg-[var(--text-primary)]/5 rounded-xl border border-[var(--text-primary)]/10">
          <span class="text-xs font-bold opacity-50 uppercase tracking-wider block">Ümumi Satış</span>
          <span class="text-lg font-black text-[var(--text-primary)]">
            {{ orders.reduce((sum, o) => sum + Number(o.finalTotal), 0).toFixed(2) }} ₼
          </span>
        </div>
        <div class="px-4 py-2 bg-green-500/5 rounded-xl border border-green-500/10">
          <span class="text-xs font-bold text-green-600 opacity-70 uppercase tracking-wider block">Satış Sayı</span>
          <span class="text-lg font-black text-green-600">{{ orders.length }}</span>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <DataTable 
      :title="t('menu.orders', 'Satış Arşivi')"
      :data="orders" 
      :columns="columns"
      :actions="true"
      :loading="loading"
      :custom-search="customSearch"
      @refresh="loadOrders"
    >
      <!-- Receipt No Custom Format -->
      <template #cell-receiptNo="{ value, highlight }">
        <div class="font-mono font-bold text-[var(--text-primary)]" v-html="highlight(value)"></div>
      </template>

      <!-- Customer Name -->
      <template #cell-customerName="{ value, highlight }">
        <span v-if="value" class="font-medium" v-html="highlight(value)"></span>
        <span v-else class="opacity-30">---</span>
      </template>

      <!-- Payment Method -->
      <template #cell-paymentMethod="{ row }">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 rounded-lg text-xs font-bold">
            {{ getPaymentMethodLabel(row) }}
          </span>
        </div>
      </template>

      <!-- Total -->
      <template #cell-finalTotal="{ value, highlight }">
        <span class="font-black text-[var(--text-app)]" v-html="highlight(Number(value).toFixed(2)) + ' ₼'"></span>
      </template>

      <!-- Custom Actions -->
      <template #row-actions="{ row }">
        <div class="flex items-center gap-1">
          <UiButton 
            variant="ghost" 
            size="icon" 
            icon="lucide:eye" 
            @click="handleViewDetails(row)"
            class="hover:text-[var(--text-primary)]"
          />
          <UiButton 
            variant="ghost" 
            size="icon" 
            icon="lucide:printer" 
            @click="printOrder(row)"
            class="hover:text-amber-500"
          />
        </div>
      </template>
    </DataTable>

    <!-- Details Modal -->
    <Modal v-model="showDetailsModal" :title="`Satış Detalları - ${selectedOrder?.receiptNo}`" max-width="2xl">
      <div v-if="selectedOrder" class="space-y-6">
        <!-- Header Info -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <span class="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-1">Kassir</span>
            <span class="font-bold">{{ selectedOrder.cashierName }}</span>
          </div>
          <div class="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-app)]">
            <span class="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-1">Tarix</span>
            <span class="font-bold">{{ selectedOrder.createdAt }}</span>
          </div>
        </div>

        <!-- Items Table -->
        <div class="rounded-2xl border border-[var(--border-app)] overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--text-primary)]/5">
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Məhsul</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Say/Qiymət</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Qazanc</th>
                <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Cəmi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-app)]">
              <tr v-for="item in selectedOrder.items" :key="item.id" class="hover:bg-[var(--text-primary)]/[0.02]">
                <td class="px-4 py-3">
                  <div class="font-bold text-sm">{{ item.productName }}</div>
                  <div class="text-[10px] opacity-50 font-mono">{{ item.barcode }}</div>
                  <div v-if="item.attribute" class="flex gap-1 mt-1">
                    <span class="text-[9px] px-1.5 py-0.5 bg-[var(--border-app)] rounded text-xs font-bold">{{ item.attribute }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium">{{ item.qty }} x {{ item.price.toFixed(2) }} ₼</span>
                  <div v-if="item.discount > 0" class="text-[10px] text-green-600 font-bold">Endirim: -{{ item.discount.toFixed(2) }} ₼</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm font-bold text-amber-600">
                    {{ ((item.price - item.wholesalePrice) * item.qty - item.discount).toFixed(2) }} ₼
                  </div>
                  <div class="text-[9px] opacity-40">M: {{ (item.price - item.wholesalePrice).toFixed(2) }}</div>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="font-bold text-sm">{{ item.total.toFixed(2) }} ₼</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="flex flex-col items-end gap-2 pr-4">
          <div class="flex gap-8 text-sm">
            <span class="opacity-50">Ara Cəmi:</span>
            <span class="font-bold">{{ selectedOrder.subtotal.toFixed(2) }} ₼</span>
          </div>
          <div v-if="selectedOrder.discountTotal > 0" class="flex gap-8 text-sm text-green-600">
            <span class="opacity-70 font-bold">Toplam Endirim:</span>
            <span class="font-bold">-${{ selectedOrder.discountTotal.toFixed(2) }} ₼</span>
          </div>
          <div class="flex gap-8 text-sm text-amber-600 bg-amber-500/5 px-3 py-1 rounded-md">
            <span class="opacity-70 font-bold">Toplam Qazanc (Profit):</span>
            <span class="font-bold">{{ getProfit(selectedOrder).toFixed(2) }} ₼</span>
          </div>
          <div class="flex gap-8 text-xl font-black pt-2 border-t border-[var(--border-app)] w-full justify-end">
            <span>YEKUN:</span>
            <span class="text-[var(--text-primary)]">{{ selectedOrder.finalTotal.toFixed(2) }} ₼</span>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showDetailsModal = false" class="!px-6">{{ t('common.close', 'Bağla') }}</UiButton>
        <UiButton variant="primary" icon="lucide:printer" @click="printOrder(selectedOrder)" class="!px-8">Çap Et</UiButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.custom-scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
