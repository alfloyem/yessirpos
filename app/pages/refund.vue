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
    if (receiptInput.value) {
      if (typeof receiptInput.value.focus === 'function') {
        receiptInput.value.focus()
      } else {
        receiptInput.value.$el?.querySelector('input')?.focus()
      }
    }
  }, 500)
})
const loading = ref(false)
const processing = ref(false)
const originalSale = ref<any>(null)
const refundItems = ref<any[]>([])

// Logic for finding the sale
const searchReceipt = async () => {
  if (!receiptQuery.value) return
  
  loading.value = true
  originalSale.value = null
  refundItems.value = []
  
  try {
    const data = await $fetch<any>(`/api/sales/search?receiptNo=${receiptQuery.value}`)
    originalSale.value = data
    
    // Initialize refund items
    // By default, 0 items are selected for refund
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

// Watch for search query change to auto-search for long receipt numbers
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

// Computed totals for refund
const refundTotals = computed(() => {
  const selected = refundItems.value.filter(i => i.selected && i.refundQty > 0)
  
  let subtotal = 0
  let finalTotal = 0
  let cashbackToSubtract = 0
  
  // Ratio calculation: we need to handle split discounts
  // If the original sale had a global discount, we should apply it proportionally to refunds
  const originalFinalTotal = originalSale.value?.finalTotal || 0
  const originalSubtotal = originalSale.value?.subtotal || 0
  const globalDiscountRatio = originalSubtotal > 0 ? originalFinalTotal / originalSubtotal : 1

  selected.forEach(item => {
    // lineSubtotal is price * refundQty
    const lineSubtotal = item.price * item.refundQty
    subtotal += lineSubtotal
    
    // lineTotal in SaleItem is (price - lineDiscount) * qty
    // So refund unit price (with line discount) is item.total / item.qty? No, item.total is total for all qty.
    const unitPriceWithLineDiscount = item.total / item.qty
    const lineRefundBeforeGlobal = unitPriceWithLineDiscount * item.refundQty
    
    // Apply global discount ratio if any
    finalTotal += lineRefundBeforeGlobal * globalDiscountRatio
  })

  // Calculate cashback to subtract
  // originalSale.cashbackEarned / originalSale.finalTotal
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
        total: (i.total / i.qty) * i.refundQty, // Portion of line total (before global discount)
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
    
    // Print logic for refund receipt
    printRefundReceipt(savedRefund)

    // Reset page
    originalSale.value = null
    refundItems.value = []
    receiptQuery.value = ''
  } catch (err: any) {
    toast.error(err.statusMessage || t('refund.error', 'Xəta baş verdi'))
  } finally {
    processing.value = false
  }
}

const printRefundReceipt = (refundSale: any) => {
  // Map refundSale back to ReceiptData format for the printer
  const receiptData: ReceiptData = {
    receiptNo: refundSale.receiptNo,
    cashierName: refundSale.cashierName || '---',
    currentDate: new Date(refundSale.createdAt).toLocaleString('az-AZ'),
    subtotal: -refundSale.subtotal, // Display as positive in refund receipt? Or marked as REFUND
    finalTotal: -refundSale.finalTotal,
    discountTotal: -refundSale.discountTotal,
    isArchive: false,
    items: refundSale.items.map((i: any) => ({
      productName: `(GERİ) ${i.productName}`,
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
      method: "GERİ ÖDƏNİŞ"
    }
  }
  
  printReceiptGlobal(receiptData)
}

</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black text-[var(--text-app)] tracking-tight">
          {{ t('menu.refund', 'Geri Ödəniş') }}
        </h1>
        <p class="text-sm opacity-50 mt-1">Sistemdəki mövcud satış çekləri üzrə geri qaytarma əməliyyatı.</p>
      </div>
    </div>

    <!-- Search Section -->
    <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] p-6 rounded-3xl shadow-sm">
      <div class="relative max-w-xl mx-auto">
        <UiInput 
          ref="receiptInput"
          v-model="receiptQuery"
          :placeholder="t('refund.scanReceipt', 'Çeki skan edin və ya nömrəsini yazın')"
          class="!h-16 !text-lg !pl-14 !rounded-2xl shadow-xl border-2 focus:border-[var(--text-primary)] transition-all"
          @keyup.enter="searchReceipt"
          :disabled="loading"
        />
        <div class="absolute left-5 top-1/2 -translate-y-1/2 opacity-30">
          <UiIcon name="lucide:scan-barcode" class="w-7 h-7" />
        </div>
        <div 
          v-if="loading" 
          class="absolute right-5 top-1/2 -translate-y-1/2"
        >
          <UiIcon name="lucide:loader-2" class="w-6 h-6 animate-spin text-[var(--text-primary)]" />
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="originalSale" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Results Column -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-3xl overflow-hidden shadow-sm">
            <div class="px-6 py-4 border-b border-[var(--border-app)] bg-[var(--bg-app)]/50 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-[var(--text-primary)]/10 rounded-xl">
                  <UiIcon name="lucide:receipt" class="w-5 h-5 text-[var(--text-primary)]" />
                </div>
                <div>
                  <div class="text-xs font-bold opacity-40 uppercase tracking-widest">Çek No</div>
                  <div class="font-mono font-black text-[var(--text-primary)]">{{ originalSale.receiptNo }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-bold opacity-40 uppercase tracking-widest">Tarix</div>
                <div class="font-bold">{{ new Date(originalSale.createdAt).toLocaleString('az-AZ') }}</div>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[10px] font-black uppercase tracking-widest opacity-40 border-b border-[var(--border-app)]">
                    <th class="px-6 py-4 w-12"></th>
                    <th class="px-6 py-4">Məhsul</th>
                    <th class="px-6 py-4 text-center">Orijinal Say</th>
                    <th class="px-6 py-4 text-center">Geri Qaytarmalı</th>
                    <th class="px-6 py-4 text-right">Məbləğ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-app)]">
                  <tr 
                    v-for="item in refundItems" 
                    :key="item.id"
                    class="group transition-colors"
                    :class="item.selected ? 'bg-[var(--text-primary)]/[0.03]' : 'hover:bg-[var(--text-primary)]/[0.01]'"
                  >
                    <td class="px-6 py-4">
                      <div 
                        @click="toggleItem(item)"
                        class="w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all"
                        :class="item.selected ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/50 text-transparent'"
                      >
                        <UiIcon name="lucide:check" class="w-4 h-4 text-white" />
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-bold text-sm">{{ item.productName }}</div>
                      <div class="text-[10px] opacity-40 font-mono">{{ item.barcode }}</div>
                      <div v-if="item.attribute" class="mt-1">
                         <span class="text-[9px] px-1.5 py-0.5 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-md font-bold opacity-70">
                           {{ item.attribute }}
                         </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-[var(--bg-app)] rounded-lg text-xs font-bold">{{ item.qty }} əd.</span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-center gap-3">
                        <button 
                          @click="updateRefundQty(item, -1)"
                          class="w-7 h-7 rounded-lg bg-[var(--bg-app)] border border-[var(--border-app)] flex items-center justify-center hover:bg-[var(--text-primary)] hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                          :disabled="item.refundQty === 0"
                        >
                          <UiIcon name="lucide:minus" class="w-3.5 h-3.5" />
                        </button>
                        <span class="w-6 text-center font-black">{{ item.refundQty }}</span>
                        <button 
                          @click="updateRefundQty(item, 1)"
                          class="w-7 h-7 rounded-lg bg-[var(--bg-app)] border border-[var(--border-app)] flex items-center justify-center hover:bg-[var(--text-primary)] hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                          :disabled="item.refundQty >= item.qty"
                        >
                          <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="font-black text-sm">
                        {{ ((item.total / item.qty) * item.refundQty).toFixed(2) }} ₼
                      </div>
                      <div v-if="item.refundQty > 0" class="text-[9px] opacity-40">
                        {{ (item.total / item.qty).toFixed(2) }} ₼ / əd.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Summary Column -->
        <div class="space-y-6">
          <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] p-6 rounded-3xl shadow-sm sticky top-6">
            <h3 class="text-sm font-black uppercase tracking-widest opacity-40 mb-6">Maliyyə İcmalı</h3>
            
            <div class="space-y-4">
              <div class="flex justify-between items-center text-sm">
                <span class="opacity-50">Ara Cəmi:</span>
                <span class="font-bold">{{ refundTotals.subtotal }} ₼</span>
              </div>
              <div v-if="Number(refundTotals.discountTotal) > 0" class="flex justify-between items-center text-sm text-green-600">
                <span class="opacity-70">Geri Alınan Endirim:</span>
                <span class="font-bold">-{{ refundTotals.discountTotal }} ₼</span>
              </div>
              <div v-if="Number(refundTotals.cashbackToSubtract) > 0" class="flex justify-between items-center text-sm text-red-500">
                <span class="opacity-70">Ləğv edilən Keşbek:</span>
                <span class="font-bold">-{{ refundTotals.cashbackToSubtract }} ₼</span>
              </div>

              <div class="pt-4 mt-2 border-t border-[var(--border-app)]">
                <div class="flex justify-between items-end">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Geri Ödəniləcək</div>
                    <div class="text-3xl font-black text-[var(--text-primary)]">
                    {{ refundTotals.finalTotal }} ₼
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-6">
                <UiButton 
                  @click="processRefund"
                  variant="primary"
                  class="w-full !h-14 !text-lg !rounded-2xl shadow-lg shadow-[var(--text-primary)]/20"
                  :disabled="Number(refundTotals.finalTotal) <= 0 || processing"
                  :loading="processing"
                >
                  <div class="flex items-center gap-2">
                    <UiIcon name="lucide:check-circle" class="w-5 h-5" />
                    {{ t('confirmRefund', 'Geri Ödənişi Təsdiqlə') }}
                  </div>
                </UiButton>
                
                <p class="text-[10px] text-center opacity-40 mt-4 leading-relaxed px-4">
                  {{ t('refund.stockWarning', 'Təsdiqlədikdə stok sayı və müştəri balansı avtomatik yenilənəcək.') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Placeholder State -->
    <div 
      v-if="!originalSale && !loading" 
      class="flex flex-col items-center justify-center py-24 opacity-20"
    >
      <UiIcon name="lucide:receipt" class="w-32 h-32 mb-6" />
      <h2 class="text-2xl font-black">Çek Gözlənilir</h2>
      <p class="font-medium">Məlumatları görmək üçün çeki skan edin</p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
