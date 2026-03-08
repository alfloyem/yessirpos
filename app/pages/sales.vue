<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import Modal from '~/components/ui/Modal.vue'

import ProductSaleCard from '~/components/sales/ProductSaleCard.vue'

const { t } = useI18n()
const { token } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.sales', 'Satışlar')
})

// --- Data ---
const products = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('Bütün Mallar')

// Cart state
const cart = ref<any[]>([])
const discount = ref<number | string>(0)
const discountType = ref<'amount' | 'percent'>('amount')
const mode = ref<'sale' | 'refund'>('sale')

// Modal states
const showPaymentModal = ref(false)
const paymentMethod = ref('cash')
const isSaving = ref(false)

// --- Load Products ---
const loadProducts = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/products', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    products.value = data as any[]
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Mallar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})

// --- Computed ---
const groupProducts = (list: any[]) => {
  const roots = list.filter(p => !p.parentProductId)
  const variants = list.filter(p => p.parentProductId)
  
  return roots.map(root => ({
    ...root,
    variants: variants.filter((v: any) => v.parentProductId === root.id)
  }))
}

const categories = computed(() => {
  const cats = new Set<string>()
  products.value.forEach(p => {
    if (Array.isArray(p.category)) {
      p.category.forEach((c: string) => cats.add(c))
    } else if (p.category) {
      cats.add(p.category)
    }
  })
  return ['Bütün Mallar', ...Array.from(cats)]
})

const filteredProductGroups = computed(() => {
  let list = products.value
  
  // Category filter
  if (selectedCategory.value !== 'Bütün Mallar') {
    list = list.filter(p => {
      const cat = p.category
      if (Array.isArray(cat)) return cat.includes(selectedCategory.value)
      return cat === selectedCategory.value
    })
  }

  // Group everything initially
  const grouped = groupProducts(list)
  
  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    return grouped.filter(group => {
      // Matches parent name/barcode
      const parentMatch = 
        (group.productName && group.productName.toLowerCase().includes(q)) || 
        (group.barcode && String(group.barcode).toLowerCase().includes(q))
      
      // OR matches any variant name/barcode
      const variantMatch = group.variants.some((v: any) => 
        (v.productName && v.productName.toLowerCase().includes(q)) || 
        (v.barcode && String(v.barcode).toLowerCase().includes(q))
      )
      
      return parentMatch || variantMatch
    })
  }

  // Default: showing grouped products
  return grouped
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (Number(item.retailPrice) * item.qty), 0)
})

const finalTotal = computed(() => {
  const d = Number(discount.value) || 0
  if (discountType.value === 'percent') {
    return Math.max(0, subtotal.value * (1 - d / 100))
  }
  return Math.max(0, subtotal.value - d)
})

// --- Cart Handlers ---
const addToCart = (product: any) => {
  if (!product.retailPrice && !product.wholesalePrice) {
    toast.error('Bu məhsulun qiyməti yoxdur.')
    return
  }
  
  const existing = cart.value.find(item => item.id === product.id)
  if (existing) {
    existing.qty++
  } else {
    cart.value.push({ ...product, qty: 1 })
  }
}

const increaseQty = (item: any) => {
  item.qty++
}

const decreaseQty = (item: any) => {
  if (item.qty > 1) {
    item.qty--
  } else {
    removeFromCart(item)
  }
}

const removeFromCart = (item: any) => {
  const idx = cart.value.findIndex(i => i.id === item.id)
  if (idx !== -1) cart.value.splice(idx, 1)
}

const clearCart = () => {
  cart.value = []
  discount.value = 0
}

const handlePayment = () => {
  if (cart.value.length === 0) {
    toast.error('Səbət boşdur!')
    return
  }
  showPaymentModal.value = true
}

// --- Print Receipt Feature ---
const printReceipt = () => {
  const currentDate = new Date().toLocaleString('az-AZ')
  const isRefund = mode.value === 'refund'
  const itemsHtml = cart.value.map(item => `
    <tr>
      <td style="padding: 6px 0; border-bottom: 1px dashed #ccc;">${item.productName}</td>
      <td style="text-align: center; border-bottom: 1px dashed #ccc;">${item.qty}</td>
      <td style="text-align: right; border-bottom: 1px dashed #ccc;">${isRefund ? '-' : ''}${(item.retailPrice * item.qty).toFixed(2)} ₼</td>
    </tr>
  `).join('')

  const printContent = `
    <html>
      <head>
        <title>Qəbz</title>
        <style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 4px; }
          .mb-4 { margin-bottom: 16px; }
          .header-title { margin: 0; font-size: 22px; font-weight: 900; }
          .mode-badge { display: inline-block; padding: 4px 12px; border: 2px solid #000; font-weight: bold; margin: 10px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-top: 8px; border-top: 1px solid #000; padding-top: 8px; }
          .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px; }
          .divider { border-top: 2px dashed #000; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="text-center mb-4">
          <h2 class="header-title">YESSIR POS</h2>
          <p style="margin: 4px 0; font-size: 12px;">Salash Giyim Mağazası</p>
          <div class="mode-badge">${isRefund ? 'GERİ ÖDƏNİŞ (REFUND)' : 'SATIŞ QƏBZİ'}</div>
          <p style="margin: 4px 0; font-size: 12px;">Tarix: ${currentDate}</p>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 8px;">Ad</th>
              <th style="padding-bottom: 8px;">Say</th>
              <th style="text-align: right; padding-bottom: 8px;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="summary-row">
          <span>Alt Toplam:</span>
          <span>${isRefund ? '-' : ''}${subtotal.value.toFixed(2)} ₼</span>
        </div>
        ${discount.value ? `
        <div class="summary-row">
          <span>Endirim (${discountType.value === 'percent' ? discount.value + '%' : discount.value + ' ₼'}):</span>
          <span>-${(subtotal.value - finalTotal.value).toFixed(2)} ₼</span>
        </div>
        ` : ''}
        
        <div class="total-row">
          <span>${isRefund ? 'ÖDƏNİLMƏLİ:' : 'YEKUN ÖDƏNİŞ:'}</span>
          <span>${isRefund ? '-' : ''}${finalTotal.value.toFixed(2)} ₼</span>
        </div>
        <div class="summary-row" style="margin-top: 8px;">
          <span>Ödəniş Növü:</span>
          <span>${paymentMethod.value === 'cash' ? 'Nəğd' : 'Kart'}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center" style="margin-top: 20px;">
          <p class="font-bold">${isRefund ? 'Qəbul edildi.' : 'Bizi seçdiyiniz üçün təşəkkürlər!'}</p>
          <p style="font-size: 11px; margin-top: 8px;">${isRefund ? 'Geri qaytarılan məhsullar yoxlanıldı.' : 'Məhsulu dəyişmək üçün qəbzi saxlayın (14 gün).'}</p>
        </div>
      </body>
    </html>
  `

  const printWin = window.open('', '', 'width=400,height=600')
  if (printWin) {
    printWin.document.write(printContent)
    printWin.document.close()
    printWin.focus()
    // A timeout is sometimes needed to allow rendering before print dialog opens
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 250)
  }
}

const completeOrder = async () => {
  isSaving.value = true
  const isRefund = mode.value === 'refund'
  // Mock API call for completing order
  // In a real app we would await $fetch('/api/sales', {...})
  setTimeout(() => {
    toast.success(isRefund ? 'Geri ödəniş uğurla tamamlandı!' : 'Satış uğurla tamamlandı və qeydə alındı!')
    printReceipt()
    clearCart()
    showPaymentModal.value = false
    isSaving.value = false
  }, 800)
}

</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">
    
    <!-- Left Section: Search & Products -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
      
      <!-- Top Action Bar - Compact -->
      <div class="flex items-center justify-between gap-4 mb-3 shrink-0">
        <h1 class="text-xl md:text-2xl font-bold text-[var(--text-app)] tracking-tight">
          {{ t('menu.salesTerminal', 'Satış Terminalı') }}
        </h1>
        
        <div class="w-64 relative">
          <UiInput 
            v-model="searchQuery" 
            placeholder="Axtar..." 
            icon="lucide:search" 
            clearable
            class="!py-1.5"
          />
        </div>
      </div>

      <!-- Categories Filter - Compact -->
      <div class="flex gap-1.5 mb-3 overflow-x-auto custom-scrollbar pb-1 shrink-0">
        <button 
          v-for="cat in categories" 
          :key="cat"
          @click="selectedCategory = cat"
          class="px-3 py-1.5 font-bold text-[12px] rounded-lg whitespace-nowrap transition-all border border-[var(--border-app)] hover:shadow-sm cursor-pointer"
          :class="selectedCategory === cat 
            ? 'bg-[var(--text-primary)] text-white border-transparent' 
            : 'bg-[var(--input-bg)] text-[var(--text-app)] opacity-70 hover:opacity-100'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <UiIcon name="lucide:loader-2" class="w-10 h-10 animate-spin text-[var(--text-primary)] opacity-50" />
        </div>
        
        <div v-else-if="filteredProductGroups.length === 0" class="flex flex-col items-center justify-center h-full text-[var(--text-app)] opacity-50">
          <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4" />
          <p class="font-bold text-lg">Məhsul tapılmadı.</p>
        </div>

        <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          <SalesProductSaleCard 
            v-for="root in filteredProductGroups" 
            :key="root.id"
            :product="root"
            @add-to-cart="addToCart"
          />
        </div>
      </div>
    </div>

    <!-- Right Section: Cart / Checkout -->
    <div class="w-full lg:w-[380px] shrink-0 h-full border-l border-[var(--border-app)] pl-4">
      <SalesCartSidebar 
        v-model:discount="discount"
        v-model:discountType="discountType"
        v-model:mode="mode"
        :cart="cart"
        :subtotal="subtotal"
        :finalTotal="finalTotal"
        @increase="increaseQty"
        @decrease="decreaseQty"
        @remove="removeFromCart"
        @clear="clearCart"
        @checkout="handlePayment"
      />
    </div>
    
  </div>

  <!-- Payment Modal -->
  <Modal v-model="showPaymentModal" title="Ödəniş Təsdiqi və Çap" max-width="md">
    <div class="p-4 space-y-6">
      
      <div class="bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/20 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
        <UiIcon name="lucide:banknote" class="w-24 h-24 absolute right-[-10px] bottom-[-10px] opacity-[0.03] text-[var(--text-primary)]" />
        <span class="text-[var(--text-app)] font-bold opacity-80 tracking-widest text-xs mb-2">Yekun Məbləğ</span>
        <span class="text-4xl font-black text-[var(--text-primary)] drop-shadow-sm">{{ finalTotal.toFixed(2) }} ₼</span>
      </div>

      <div>
        <h4 class="font-bold text-[var(--text-app)] mb-3 text-sm">Ödəniş Metodunu Seçin</h4>
        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="paymentMethod = 'cash'"
            class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 font-bold tracking-wide"
            :class="paymentMethod === 'cash' ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/30 text-[var(--text-app)] opacity-70 hover:opacity-100 bg-[var(--bg-app)]'"
          >
            <UiIcon name="lucide:coins" class="w-8 h-8 mb-2" />
            Nəğd
          </button>
          <button 
            @click="paymentMethod = 'card'"
            class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 font-bold tracking-wide"
            :class="paymentMethod === 'card' ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/30 text-[var(--text-app)] opacity-70 hover:opacity-100 bg-[var(--bg-app)]'"
          >
            <UiIcon name="lucide:credit-card" class="w-8 h-8 mb-2" />
            Bank Kartı
          </button>
        </div>
      </div>

      <div class="flex gap-3 pt-4 border-t border-[var(--border-app)]">
        <UiButton 
          variant="outline" 
          block 
          @click="showPaymentModal = false"
          class="flex-1"
        >
          Ləğv Et
        </UiButton>
        <UiButton 
          variant="success" 
          block 
          class="flex-1 shadow-lg shadow-[var(--color-brand-success)]/20 relative group text-white"
          @click="completeOrder"
          :loading="isSaving"
        >
          <span class="flex items-center gap-2">
            <UiIcon name="lucide:printer" class="w-5 h-5 group-hover:animate-bounce" />
            Təsdiqlə və Çap Et
          </span>
        </UiButton>
      </div>

    </div>
  </Modal>

</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}
</style>
