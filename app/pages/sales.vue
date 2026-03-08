<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import Modal from '~/components/ui/Modal.vue'

import SalesProductSaleCard from '~/components/sales/ProductSaleCard.vue'
import SalesCartSidebar from '~/components/sales/CartSidebar.vue'

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
const customers = ref<any[]>([])
const selectedCustomer = ref<any>(null)

// Cart state
const cart = ref<any[]>([])
const discount = ref<number | string>(0)
const discountType = ref<'amount' | 'percent'>('amount')
const mode = ref<'sale' | 'refund'>('sale')

// DOM refs
const searchInput = ref<any>(null)

// Modal states
const showPaymentModal = ref(false)
const showGhostModal = ref(false)
const paymentMethod = ref('Nəğd')
const isSaving = ref(false)

// Manage Payment Methods State (Only storage, management moved to component)
const paymentMethods = ref<any[]>([])

// --- Draft Logic ---
const drafts = ref<any[]>([])
const showDraftsModal = ref(false)

const loadDrafts = () => {
  const saved = localStorage.getItem('yessir_pos_drafts')
  if (saved) {
    try {
      drafts.value = JSON.parse(saved)
    } catch (e) {
      drafts.value = []
    }
  }
}

const saveDraft = () => {
  if (cart.value.length === 0) return
  
  const draftName = selectedCustomer.value 
    ? `Müştəri: ${selectedCustomer.value.firstName} ${selectedCustomer.value.lastName}`
    : `Səbət (${cart.value.length} məhsul)`

  const draft = {
    id: Date.now(),
    name: draftName,
    time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    cart: JSON.parse(JSON.stringify(cart.value)),
    discount: discount.value,
    discountType: discountType.value,
    mode: mode.value,
    selectedCustomer: selectedCustomer.value,
    subtotal: subtotal.value,
    finalTotal: finalTotal.value
  }

  drafts.value.push(draft)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  
  clearCart()
  selectedCustomer.value = null
  toast.success('Satış müvəqqəti yadda saxlanıldı!')
}

const restoreDraft = (index: number) => {
  const draft = drafts.value[index]
  cart.value = draft.cart
  discount.value = draft.discount
  discountType.value = draft.discountType
  mode.value = draft.mode
  selectedCustomer.value = draft.selectedCustomer
  
  drafts.value.splice(index, 1)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  showDraftsModal.value = false
  toast.success('Müvəqqəti satış geri qaytarıldı')
}

const deleteDraft = (index: number) => {
  drafts.value.splice(index, 1)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
}

// --- Ghost Product Logic ---

const ghostProduct = ref({
  productName: '',
  retailPrice: ''
})

const addGhostProduct = () => {
  if (!ghostProduct.value.productName || !ghostProduct.value.retailPrice) {
    toast.error('Ad və qiymət daxil edilməlidir')
    return
  }

  const id = `ghost-${Date.now()}`
  const product = {
    id,
    productName: ghostProduct.value.productName,
    retailPrice: Number(ghostProduct.value.retailPrice),
    barcode: 'GHOST',
    qty: 1,
    itemDiscount: 0,
    itemDiscountType: 'amount'
  }

  addToCart(product)
  showGhostModal.value = false
  ghostProduct.value = { productName: '', retailPrice: '' }
  nextTick(() => {
    focusSearch()
  })
}

const focusSearch = () => {
  if (searchInput.value) {
    // If it's a component, try focus method or $el
    if (typeof searchInput.value.focus === 'function') {
      searchInput.value.focus()
    } else {
      searchInput.value.$el?.querySelector('input')?.focus()
    }
  }
}

// --- Load Products ---
const loadProducts = async () => {
  loading.value = true
  try {
    const data = await $fetch<any[]>('/api/products', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    products.value = data || []
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Mallar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const loadPaymentMethods = async () => {
  try {
    const data = await $fetch<any[]>('/api/payment-methods')
    paymentMethods.value = data || []
    
    // System methods that are always required and protected in DB
    const systemDefaults = [
      { name: 'Nəğd', icon: 'lucide:coins', color: 'green', isSystem: true },
      { name: 'Bank Kartı', icon: 'lucide:credit-card', color: 'blue', isSystem: true }
    ]

    let needsReload = false
    for (const d of systemDefaults) {
      const exists = paymentMethods.value.find(m => m.name === d.name)
      if (!exists) {
        await $fetch<any>('/api/payment-methods', { method: 'POST', body: d })
        needsReload = true
      } else if (!exists.isSystem) {
        // Force upgrade to system status if it's a default name
        await $fetch<any>(`/api/payment-methods/${exists.id}`, { 
          method: 'PUT', 
          body: { ...exists, isSystem: true } 
        })
        needsReload = true
      }
    }

    if (needsReload) {
      const updated = await $fetch<any[]>('/api/payment-methods')
      paymentMethods.value = updated || []
    }
  } catch (err) {
    console.error('Failed to load payment methods:', err)
  }
}

const loadCustomers = async () => {
  try {
    const data = await $fetch<any[]>('/api/customers', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    customers.value = data || []
  } catch (err) {
    console.error('Failed to load customers')
  }
}

onMounted(() => {
  loadProducts()
  loadCustomers()
  loadPaymentMethods()
  loadDrafts()
  // Ensure focus on load
  setTimeout(focusSearch, 500)
})

// --- Barcode Auto-Add Logic ---
watch(searchQuery, (newVal) => {
  if (!newVal || newVal.length < 3) return // Barcodes are usually longer

  // Check if it's an exact match in the raw products list
  const matched = products.value.find(p => String(p.barcode) === newVal)
  
  if (matched) {
    addToCart(matched)
    searchQuery.value = ''
    nextTick(() => {
      focusSearch()
    })
  }
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
  return cart.value.reduce((sum, item) => {
    const price = Number(item.retailPrice) || 0
    const d = Number(item.itemDiscount) || 0
    let linePrice = price
    if (item.itemDiscountType === 'percent') {
      linePrice = price * (1 - d / 100)
    } else {
      linePrice = price - d
    }
    return sum + (Math.max(0, linePrice) * item.qty)
  }, 0)
})

const finalTotal = computed(() => {
  const d = Number(discount.value) || 0
  if (discountType.value === 'percent') {
    return Math.max(0, subtotal.value * (1 - d / 100))
  }
  return Math.max(0, subtotal.value - d)
})

const cashbackAmount = computed(() => {
  if (mode.value === 'refund') return 0
  return (finalTotal.value * 0.05).toFixed(2)
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
    cart.value.push({ 
      ...product, 
      qty: 1,
      itemDiscount: 0,
      itemDiscountType: 'amount'
    })
  }
}

const updateItemDiscount = (item: any, val: number | string) => {
  item.itemDiscount = val
}

const updateItemDiscountType = (item: any, val: 'amount' | 'percent') => {
  item.itemDiscountType = val
}

const increaseQty = (item: any) => {
  item.qty++
}

const updateQty = (item: any, val: number) => {
  item.qty = Math.max(1, val)
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
          <p style="margin: 4px 0; font-size: 12px;">BakuStreet</p>
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

const showGiftCardModal = ref(false)
const giftCardBarcode = ref('')

const completeOrder = async () => {
  const isRefund = mode.value === 'refund'
  const total = finalTotal.value
  const customer = selectedCustomer.value
  
  // 1. Payment Method Specific Logic
  if (paymentMethod.value === 'Bonus') {
    if (!customer) {
      toast.error('Bonus ilə ödəniş üçün müştəri seçilməlidir')
      return
    }
    if ((Number(customer.bonus) || 0) < total) {
      toast.error('Müştərinin balansında kifayət qədər bonus yoxdur')
      return
    }
  }

  if (paymentMethod.value === 'Hədiyyə Kartı' && !isRefund) {
    if (!giftCardBarcode.value) {
      showGiftCardModal.value = true
      return
    }
    try {
      const cards = await $fetch<any[]>('/api/gift-cards')
      const card = (cards || []).find(c => c.barcode === giftCardBarcode.value)
      if (!card) {
        toast.error('Hədiyyə kartı tapılmadı')
        giftCardBarcode.value = ''
        return
      }
      if (card.value < total) {
        toast.error(`Kartda kifayət qədər balans yoxdur (Mövcud: ${card.value.toFixed(2)} ₼)`)
        return
      }
      // Deduct from gift card
      await $fetch<any>(`/api/gift-cards/${card.id}`, {
        method: 'PUT',
        body: { value: Number((card.value - total).toFixed(2)) }
      })
    } catch (err) {
      toast.error('Hədiyyə kartı yoxlanılarkən xəta oldu')
      return
    }
  }

  isSaving.value = true
  const currentCashback = Number(cashbackAmount.value)
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : null

  // 2. Bonus/Loyalty Update
  if (!isRefund && customer) {
    try {
      let finalBonusUpdate = Number(customer.bonus) || 0
      
      if (paymentMethod.value === 'Bonus') {
        finalBonusUpdate -= total // Spend bonus
      } else {
        finalBonusUpdate += currentCashback // Earn bonus
      }

      await $fetch<any>(`/api/customers/${customer.id}`, {
        method: 'PUT',
        body: { bonus: Number(finalBonusUpdate.toFixed(2)) },
        headers: { Authorization: `Bearer ${token.value}` }
      })
    } catch (err: any) {
      console.error('Failed to update customer bonus:', err)
      toast.error('Bonus yenilənərkən xəta baş verdi')
    }
  }

  // 3. Complete and Reset
  setTimeout(() => {
    let msg = isRefund ? 'Geri ödəniş uğurla tamamlandı!' : 'Satış uğurla tamamlandı!'
    if (!isRefund && customerName) {
      if (paymentMethod.value === 'Bonus') {
        msg += `\n${total.toFixed(2)} ₼ bonus balansından çıxıldı.`
      } else {
        msg += `\n${customerName} hesabına ${currentCashback.toFixed(2)} ₼ keşbek əlavə edildi.`
      }
    }
    toast.success(msg)
    printReceipt()
    clearCart()
    selectedCustomer.value = null
    giftCardBarcode.value = ''
    showPaymentModal.value = false
    showGiftCardModal.value = false
    isSaving.value = false
    loadCustomers()
  }, 800)
}

</script>

<template>
  <div>
  <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">
    
    <!-- Left Section: Search & Products -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
      
      <!-- Top Action Bar - Compact -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 shrink-0">
        <h1 class="text-xl md:text-2xl font-black text-[var(--text-app)] tracking-tight leading-none mb-1">
            {{ t('menu.salesTerminal', 'Satış Terminalı') }}
        </h1>
        
        <div class="flex items-center gap-2">
          <UiButton 
            v-if="drafts.length > 0"
            variant="soft-primary" 
            size="sm" 
            icon="lucide:bookmark"
            @click="showDraftsModal = true"
          >
            Draftlar ({{ drafts.length }})
          </UiButton>

          <UiButton 
            variant="soft-primary" 
            size="sm" 
            icon="lucide:plus-circle"
            @click="showGhostModal = true"
          >
            Keçici Məhsul
          </UiButton>

          <UiInput 
            ref="searchInput"
            v-model="searchQuery" 
            placeholder="Barkod və ya ad..." 
            icon="lucide:search" 
            clearable
            @keyup.enter="focusSearch"
          />
        </div>
      </div>

      <!-- Categories Filter - Compact -->
      <div class="flex items-center gap-2 mb-4 shrink-0">
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide pb-1 -mx-2 px-2">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="selectedCategory = cat"
            class="px-3.5 py-1.5 font-bold text-[11px] rounded-lg whitespace-nowrap transition-all border cursor-pointer hover:shadow-sm"
            :class="selectedCategory === cat 
              ? 'bg-[var(--text-primary)] text-white border-transparent' 
              : 'bg-[var(--bg-app)] text-[var(--text-app)] opacity-50 border-[var(--border-app)] hover:opacity-100 hover:border-[var(--text-primary)]/40'"
          >
            {{ cat }}
          </button>
        </div>
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

        <div v-else class="pt-2 grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
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
    <div class="w-full lg:w-[400px] shrink-0 h-full border-l border-[var(--border-app)] pl-4">
      <SalesCartSidebar 
        v-model:discount="discount"
        v-model:discountType="discountType"
        v-model:mode="mode"
        v-model:selectedCustomer="selectedCustomer"
        :cart="cart"
        :subtotal="subtotal"
        :finalTotal="finalTotal"
        :customers="customers"
        :cashbackAmount="cashbackAmount"
        @increase="increaseQty"
        @update-qty="updateQty"
        @decrease="decreaseQty"
        @remove="removeFromCart"
        @clear="clearCart"
        @checkout="handlePayment"
        @save-draft="saveDraft"
        @update-item-discount="updateItemDiscount"
        @update-item-discount-type="updateItemDiscountType"
      />
    </div>
    
  </div>

  <SalesPaymentModal
    v-model="showPaymentModal"
    v-model:selectedMethod="paymentMethod"
    :total="finalTotal"
    :dbMethods="paymentMethods"
    :isSaving="isSaving"
    @confirm="completeOrder"
    @refresh-methods="loadPaymentMethods"
  />
  
  <!-- Drafts Modal -->
  <Modal
    v-model="showDraftsModal"
    title="Müvəqqəti Saxlanılanlar"
    max-width="md"
  >
    <div class="space-y-3">
      <div v-if="drafts.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50">
        <UiIcon name="lucide:inbox" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p class="font-bold">Müvəqqəti yadda saxlanılan satış yoxdur</p>
      </div>

      <div 
        v-for="(draft, idx) in drafts" 
        :key="draft.id"
        class="flex items-center justify-between p-3 rounded-xl border border-[var(--border-app)] hover:border-[var(--text-primary)]/30 transition-all bg-[var(--bg-app)]"
      >
        <div class="flex flex-col">
          <span class="font-bold text-[13px] text-[var(--text-app)]">{{ draft.name }}</span>
          <div class="flex gap-3 text-[10px] font-bold opacity-50 mt-1">
            <span class="flex items-center gap-1"><UiIcon name="lucide:clock" class="w-3 h-3" /> {{ draft.time }}</span>
            <span class="flex items-center gap-1"><UiIcon name="lucide:credit-card" class="w-3 h-3" /> {{ draft.finalTotal }} ₼</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="restoreDraft(idx)" 
            class="h-8 px-3 text-[11px] font-bold bg-[var(--text-primary)] text-white rounded-lg hover:shadow-md hover:shadow-[var(--text-primary)]/20 transition-all"
          >
            Yüklə
          </button>
          <button 
            @click="deleteDraft(idx)" 
            class="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <UiIcon name="lucide:trash-2" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Ghost Product Modal -->
  <Modal
    v-model="showGhostModal"
    :title="t('sales.addGhost', 'Keçici Məhsul Əlavə Et')"
    max-width="md"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">Məhsulun adı</label>
        <UiInput 
          v-model="ghostProduct.productName" 
          placeholder="Məs: Paket, Xidmət və s." 
          autofocus
        />
      </div>
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">Qiymət (₼)</label>
        <UiInput 
          v-model="ghostProduct.retailPrice" 
          type="number"
          placeholder="0.00" 
        />
      </div>
    </div>
    <template #footer>
      <div class="flex gap-3 w-full">
        <UiButton 
          variant="outline" 
          block 
          @click="showGhostModal = false"
        >
          Ləğv Et
        </UiButton>
        <UiButton 
          variant="primary" 
          block 
          @click="addGhostProduct"
        >
          Səbətə Əlavə Et
        </UiButton>
      </div>
    </template>
  </Modal>


  <!-- Gift Card Input Modal -->
  <Modal v-model="showGiftCardModal" title="Hədiyyə Kartı Məlumatı" max-width="sm">
    <div class="p-6 space-y-4">
      <div class="text-center">
        <div class="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <UiIcon name="lucide:gift" class="w-8 h-8 text-purple-500" />
        </div>
        <h4 class="font-bold text-[var(--text-app)]">Kartın Barkodunu Daxil Edin</h4>
        <p class="text-xs opacity-50 mt-1">Ödənişi tamamlamaq üçün kart skan edilməlidir</p>
      </div>

      <UiInput 
        v-model="giftCardBarcode" 
        placeholder="GXXXXXXX" 
        class="!bg-[var(--bg-app)] !text-center !text-lg !font-mono"
        autofocus
        @keyup.enter="completeOrder"
      />

      <div class="flex gap-3 pt-4">
        <UiButton variant="outline" block @click="showGiftCardModal = false" class="flex-1">Ləğv Et</UiButton>
        <UiButton variant="primary" block @click="completeOrder" class="flex-1" :disabled="!giftCardBarcode">Davam Et</UiButton>
      </div>
    </div>
  </Modal>
  </div>
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

.custom-scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.custom-scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
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
