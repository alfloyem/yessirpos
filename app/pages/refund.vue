<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import { printReceipt as printReceiptGlobal, type ReceiptData } from '~/utils/receiptPrinter'

const { t } = useI18n()
const { token } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.refund', 'Geri Ödəniş')
})

const receiptInput = ref<any>(null)
const receiptQuery = ref('')

onMounted(() => {
  setTimeout(() => {
    focusInput()
  }, 500)
})

const loading = ref(false)
const processing = ref(false)
const originalSale = ref<any>(null)
const refundItems = ref<any[]>([])

const searchReceipt = async () => {
  if (!receiptQuery.value) return
  
  loading.value = true
  originalSale.value = null
  refundItems.value = []
  
  try {
    const data = await $fetch<any>(`/api/sales/search?receiptNo=${receiptQuery.value}`)
    originalSale.value = data
    
    refundItems.value = data.items.map((item: any) => ({
      ...item,
      refundQty: 0,
      selected: false
    }))
    
    receiptQuery.value = ''
  } catch (err: any) {
    toast.error(err.statusMessage || t('refund.notFound', 'Çek tapılmadı'))
  } finally {
    loading.value = false
  }
}

watch(receiptQuery, (newVal) => {
  if (newVal.length === 13) {
    searchReceipt()
  }
})

const toggleItem = (item: any) => {
  item.selected = !item.selected
  if (item.selected && item.refundQty === 0) {
    item.refundQty = 1
  } else if (!item.selected) {
    item.refundQty = 0
  }
}

const updateRefundQty = (item: any, delta: number) => {
  const newQty = item.refundQty + delta
  if (newQty >= 0 && newQty <= item.qty) {
    item.refundQty = newQty
    item.selected = newQty > 0
  }
}

const refundTotals = computed(() => {
  const selected = refundItems.value.filter(i => i.selected && i.refundQty > 0)
  
  let subtotal = 0
  let finalTotal = 0
  let cashbackToSubtract = 0
  
  const originalFinalTotal = originalSale.value?.finalTotal || 0
  const originalSubtotal = originalSale.value?.subtotal || 0
  const globalDiscountRatio = originalSubtotal > 0 ? originalFinalTotal / originalSubtotal : 1

  selected.forEach(item => {
    subtotal += item.price * item.refundQty
    const unitPriceWithLineDiscount = item.total / item.qty
    finalTotal += (unitPriceWithLineDiscount * item.refundQty) * globalDiscountRatio
  })

  if (originalSale.value?.cashbackEarned > 0 && originalFinalTotal > 0) {
    const cashbackRatio = originalSale.value.cashbackEarned / originalFinalTotal
    cashbackToSubtract = finalTotal * cashbackRatio
  }

  return {
    subtotal: subtotal.toFixed(2),
    discountTotal: (subtotal - finalTotal).toFixed(2),
    finalTotal: finalTotal.toFixed(2),
    cashbackToSubtract: cashbackToSubtract.toFixed(2)
  }
})

const processRefund = async () => {
  const selected = refundItems.value.filter(i => i.selected && i.refundQty > 0)
  if (selected.length === 0) {
    toast.error(t('refund.noItems', 'Heç bir məhsul seçilməyib'))
    return
  }

  processing.value = true
  try {
    const refundData = {
      originalSaleId: originalSale.value.id,
      refundItems: selected.map(i => ({
        id: i.id,
        productId: i.productId,
        qty: i.refundQty,
        total: (i.total / i.qty) * i.refundQty,
        lineDiscountToRefund: (i.discount / i.qty) * i.refundQty
      })),
      refundTotals: {
        subtotal: refundTotals.value.subtotal,
        discountTotal: refundTotals.value.discountTotal,
        finalTotal: refundTotals.value.finalTotal,
        cashbackToSubtract: refundTotals.value.cashbackToSubtract
      }
    }

    const savedRefund = await $fetch<any>('/api/sales/refund', {
      method: 'POST',
      body: refundData,
      headers: { Authorization: `Bearer ${token.value}` }
    })

    toast.success(t('refund.refundSuccess', 'Geri ödəniş uğurla tamamlandı!'))
    printRefundReceipt(savedRefund)
    clearSearch()
  } catch (err: any) {
    toast.error(err.statusMessage || t('refund.error', 'Xəta baş verdi'))
  } finally {
    processing.value = false
  }
}

const printRefundReceipt = (refundSale: any) => {
  const receiptData: ReceiptData = {
    receiptNo: refundSale.receiptNo,
    cashierName: refundSale.cashierName || '---',
    currentDate: new Date(refundSale.createdAt).toLocaleString('az-AZ'),
    subtotal: -refundSale.subtotal, 
    finalTotal: -refundSale.finalTotal,
    discountTotal: -refundSale.discountTotal,
    isArchive: false,
    items: refundSale.items.map((i: any) => ({
      productName: `${t('orders.refundLabel')} ${i.productName}`,
      qty: Math.abs(i.qty),
      price: i.price,
      finalPrice: Math.abs(i.total / i.qty),
      discount: Math.abs(i.discount),
      discountType: 'amount',
      discountValue: Math.abs(i.discount / i.qty),
      total: Math.abs(i.total),
      attribute: i.attribute
    })),
    customer: refundSale.customerName ? {
      name: refundSale.customerName,
      barcode: originalSale.value.customerBarcode
    } : undefined,
    paymentDetails: {
      isMulti: false,
      method: t('orders.refundPayment')
    }
  }
  printReceiptGlobal(receiptData)
}

const clearSearch = () => {
  originalSale.value = null
  refundItems.value = []
  receiptQuery.value = ''
  nextTick(() => focusInput())
}

const focusInput = () => {
  if (receiptInput.value) {
    if (typeof receiptInput.value.focus === 'function') {
      receiptInput.value.focus()
    } else {
      receiptInput.value.$el?.querySelector('input')?.focus()
    }
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-app)] overflow-hidden">
    <!-- Header: Simplified -->
    <header class="h-16 shrink-0 bg-[var(--bg-app)] border-b border-[var(--border-app)] flex items-center justify-between px-6 z-20">
      <div class="flex items-center gap-3">
        <UiIcon name="lucide:rotate-ccw" class="w-5 h-5 text-[var(--text-primary)]" />
        <h1 class="text-lg font-black text-[var(--text-app)] tracking-tight">
          {{ t('menu.refund', 'Geri Ödəniş') }}
        </h1>
      </div>
      
      <!-- Integrated Search Tool -->
      <div v-if="originalSale" class="flex items-center gap-2">
        <button 
          @click="clearSearch"
          class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all"
        >
          <UiIcon name="lucide:trash-2" class="w-3.5 h-3.5" />
          {{ t('refund.newSearch') }}
        </button>
      </div>
    </header>

    <main class="flex-1 flex overflow-hidden">
      <!-- Left Content: Cleaner & More Minimal -->
      <div class="flex-1 flex flex-col min-w-0 relative">
        <div v-if="!originalSale" class="h-full flex flex-col items-center justify-center p-6 text-center">
          <div class="max-w-md w-full space-y-8">
            <div class="w-20 h-20 rounded-full bg-[var(--border-app)]/20 flex items-center justify-center mx-auto mb-2 text-[var(--border-app)]">
              <UiIcon name="lucide:scan-barcode" class="w-10 h-10" />
            </div>
            <div>
              <h2 class="text-2xl font-black tracking-tight mb-2">{{ t('refund.awaitingReceipt') }}</h2>
              <p class="text-sm opacity-40">{{ t('refund.scanReceiptDescription') }}</p>
            </div>
            
            <div class="relative group">
              <UiInput 
                ref="receiptInput"
                v-model="receiptQuery"
                :placeholder="t('refund.scanReceiptPlaceholder')"
                class="!h-16 !text-lg !pl-14 !rounded-2xl border-2 focus:border-[var(--text-primary)]/50 shadow-sm"
                @keyup.enter="searchReceipt"
                :disabled="loading"
              />
              <UiIcon name="lucide:search" class="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-20 group-focus-within:opacity-100 transition-opacity" />
              <div v-if="loading" class="absolute right-5 top-1/2 -translate-y-1/2">
                <UiIcon name="lucide:loader-2" class="w-5 h-5 animate-spin text-[var(--text-primary)]" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div class="max-w-4xl mx-auto space-y-6">
            <!-- Summary Info Bar -->
            <div class="flex items-center justify-between p-4 bg-[var(--input-bg)]/40 rounded-2xl border border-[var(--border-app)]">
              <div class="flex items-center gap-6">
                <div>
                  <div class="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{{ t('refund.receipt') }}</div>
                  <div class="text-sm font-black font-mono text-[var(--text-primary)]">{{ originalSale.receiptNo }}</div>
                </div>
                <div class="w-px h-8 bg-[var(--border-app)]"></div>
                <div>
                  <div class="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{{ t('common.counterparty') }}</div>
                  <div class="text-sm font-bold">{{ originalSale.customerName || t('orders.anonymousCustomer') }}</div>
                </div>
                <div class="w-px h-8 bg-[var(--border-app)]"></div>
                <div>
                  <div class="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{{ t('sales.saleDate') }}</div>
                  <div class="text-sm font-bold opacity-60">{{ new Date(originalSale.createdAt).toLocaleDateString('az-AZ') }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{{ t('sales.originalTotal') }}</div>
                <div class="text-sm font-black">{{ originalSale.finalTotal.toFixed(2) }} ₼</div>
              </div>
            </div>

            <!-- Items List: Compact Cards -->
            <div class="space-y-3">
              <div 
                v-for="item in refundItems" 
                :key="item.id"
                class="bg-[var(--bg-app)] border rounded-2xl p-4 flex items-center gap-4 transition-all"
                :class="item.selected ? 'border-[var(--text-primary)] shadow-sm bg-[var(--text-primary)]/[0.02]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/20'"
              >
                <!-- Toggle -->
                <div 
                  @click="toggleItem(item)"
                  class="w-10 h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all shrink-0"
                  :class="item.selected ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-white' : 'border-[var(--border-app)] bg-[var(--input-bg)]/50'"
                >
                  <UiIcon :name="item.selected ? 'lucide:check' : 'lucide:plus'" :class="item.selected ? 'w-5 h-5' : 'w-4 h-4 opacity-20'" />
                </div>

                <!-- Product Info -->
                <div class="flex-1 min-w-0">
                  <h4 class="font-black text-[14px] text-[var(--text-app)] truncate leading-tight">{{ item.productName }}</h4>
                  <div class="flex items-center gap-2 mt-1 opacity-40 font-bold text-[10px]">
                    <span class="font-mono">{{ item.barcode }}</span>
                    <span v-if="item.attribute" class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded">{{ item.attribute }}</span>
                  </div>
                </div>

                <!-- Controls -->
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <div class="text-[9px] font-black opacity-30 uppercase tracking-tighter mb-0.5">{{ t('common.qty') }}</div>
                    <div class="flex items-center bg-[var(--input-bg)] rounded-lg h-9 px-1">
                      <button @click="updateRefundQty(item, -1)" class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-all" :disabled="item.refundQty === 0">
                        <UiIcon name="lucide:minus" class="w-3 h-3" />
                      </button>
                      <span class="w-8 text-center font-black text-xs tabular-nums">{{ item.refundQty }}</span>
                      <button @click="updateRefundQty(item, 1)" class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-all" :disabled="item.refundQty >= item.qty">
                        <UiIcon name="lucide:plus" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div class="text-right min-w-[80px]">
                    <div class="text-[9px] font-black opacity-30 uppercase tracking-tighter mb-0.5">{{ t('sales.amount') }}</div>
                    <div class="text-sm font-black tabular-nums font-mono">
                      {{ ((item.total / item.qty) * item.refundQty).toFixed(2) }} ₼
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar: Minimal & Integrated -->
      <aside v-if="originalSale" class="w-[340px] shrink-0 bg-[var(--bg-app)] border-l border-[var(--border-app)] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.01)]">
        <div class="p-6 flex-1 space-y-8 overflow-y-auto custom-scrollbar">
          <div>
            <h3 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">{{ t('refund.summary') }}</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center text-xs">
                <span class="opacity-50">{{ t('sales.subtotal') }}:</span>
                <span class="font-bold tabular-nums">{{ refundTotals.subtotal }} ₼</span>
              </div>
              <div v-if="Number(refundTotals.discountTotal) > 0" class="flex justify-between items-center text-xs text-green-600 font-bold italic">
                <span>{{ t('refund.proportionalDiscount') }}</span>
                <span class="tabular-nums">-{{ refundTotals.discountTotal }} ₼</span>
              </div>
              <div v-if="Number(refundTotals.cashbackToSubtract) > 0" class="flex justify-between items-center text-xs text-red-500 font-bold italic">
                <span>{{ t('refund.cashbackCancellation') }}</span>
                <span class="tabular-nums">-{{ refundTotals.cashbackToSubtract }} ₼</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-orange-500/[0.03] border border-orange-500/10 rounded-2xl flex gap-3">
            <UiIcon name="lucide:alert-circle" class="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p class="text-[9px] font-bold text-orange-700/70 uppercase tracking-tight leading-relaxed">
              {{ t('refund.stockBonusNotice') }}
            </p>
          </div>
        </div>

        <div class="p-6 border-t border-[var(--border-app)] space-y-4 bg-[var(--bg-app)]/50 backdrop-blur-sm">
          <div>
            <div class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{{ t('refund.refundAmount') }}</div>
            <div class="text-4xl font-black text-[var(--text-primary)] font-mono tracking-tighter">
              {{ refundTotals.finalTotal }} <span class="text-lg">₼</span>
            </div>
          </div>

          <UiButton 
            @click="processRefund"
            variant="primary"
            class="w-full !h-16 !text-lg !rounded-2xl shadow-xl shadow-[var(--text-primary)]/10"
            :disabled="Number(refundTotals.finalTotal) <= 0 || processing"
            :loading="processing"
          >
            {{ t('refund.confirmRefund') }}
          </UiButton>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
</style>
