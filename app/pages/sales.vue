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
import { printReceipt as printReceiptGlobal, type ReceiptData } from '~/utils/receiptPrinter'

const { t } = useI18n()
const { token, user } = useAuth()
const toast = useToast()

const shiftReceiptCount = ref(0)

useHead({
  title: t('menu.sales', 'Satışlar')
})

// --- Data ---
const products = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('ALL')
const customers = ref<any[]>([])
const selectedCustomer = ref<any>(null)
const employees = ref<any[]>([])
const selectedEmployee = ref<any>(null)

// Cart state
const cart = ref<any[]>([])
const discount = ref<number | string>(0)
const discountType = ref<'amount' | 'percent'>('amount')

// DOM refs
const searchInput = ref<any>(null)

// Modal states
const showPaymentModal = ref(false)
const showGhostModal = ref(false)
const paymentMethod = ref('Cash')
const paymentDetails = ref<any>(null)
const isSaving = ref(false)

// Manage Payment Methods State (Only storage, management moved to component)
const paymentMethods = ref<any[]>([])

// --- Draft Logic ---
const drafts = ref<any[]>([])
const showDraftsModal = ref(false)

const loadShiftCount = () => {
  const today = new Date().toISOString().split('T')[0]
  // Reset for a fresh start as requested
  localStorage.removeItem(`shift_count_${today}`)
  shiftReceiptCount.value = 0
}

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
    ? t('sales.draftNameCustomer', { name: `${selectedCustomer.value.firstName} ${selectedCustomer.value.lastName}` })
    : t('sales.draftNameCart', { count: cart.value.length })

  const draft = {
    id: Date.now(),
    name: draftName,
    time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    cart: JSON.parse(JSON.stringify(cart.value)),
    discount: discount.value,
    discountType: discountType.value,
    selectedCustomer: selectedCustomer.value,
    subtotal: subtotal.value,
    finalTotal: finalTotal.value
  }

  drafts.value.push(draft)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  
  clearCart()
  selectedCustomer.value = null
  selectedEmployee.value = null
  toast.success(t('toast.draftSaved'))
}

const restoreDraft = (index: number) => {
  const draft = drafts.value[index]
  cart.value = draft.cart
  discount.value = draft.discount
  discountType.value = draft.discountType
  discountType.value = draft.discountType
  
  drafts.value.splice(index, 1)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  showDraftsModal.value = false
  toast.success(t('toast.draftRestored'))
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
    toast.error(t('toast.ghostProductError'))
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

const loadEmployees = async () => {
  try {
    const data = await $fetch<any[]>('/api/employees', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    employees.value = data || []
    
    // Restore last selected cashier
    const lastCashierId = localStorage.getItem('yessir_pos_last_cashier_id')
    if (lastCashierId && employees.value.length > 0) {
      const found = employees.value.find(e => String(e.id) === lastCashierId)
      if (found) selectedEmployee.value = found
    }
  } catch (err) {
    console.error('Failed to load employees')
  }
}

// Watcher to save last selected cashier
watch(selectedEmployee, (newVal) => {
  if (newVal?.id) {
    localStorage.setItem('yessir_pos_last_cashier_id', String(newVal.id))
  }
})

onMounted(() => {
  loadProducts()
  loadCustomers()
  loadEmployees()
  loadPaymentMethods()
  loadDrafts()
  loadShiftCount()
  // Ensure focus on load
  setTimeout(focusSearch, 500)
})

// --- Barcode Auto-Add Logic ---
watch(searchQuery, (newVal: string) => {
  if (!newVal || newVal.length < 3) return // Barcodes are usually longer

  // Check if it's an exact match in the raw products list
  const matched = products.value.find((p: any) => String(p.barcode) === newVal)
  
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
  const roots = list.filter((p: any) => !p.parentProductId)
  const variants = list.filter((p: any) => p.parentProductId)
  
  return roots.map(root => ({
    ...root,
    variants: variants.filter((v: any) => v.parentProductId === root.id)
  }))
}

const categories = computed(() => {
  const cats = new Set<string>()
  products.value.forEach((p: any) => {
    if (Array.isArray(p.category)) {
      p.category.forEach((c: string) => cats.add(c))
    } else if (p.category) {
      cats.add(p.category)
    }
  })
  return ['ALL', ...Array.from(cats)]
})

const filteredProductGroups = computed(() => {
  let list = products.value
  
  // Category filter
  if (selectedCategory.value !== 'ALL') {
    list = list.filter((p: any) => {
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
  return cart.value.reduce((sum: number, item: any) => {
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
  return (finalTotal.value * 0.05).toFixed(2)
})

// --- Cart Handlers ---
const addToCart = (product: any) => {
  if (!product.retailPrice && !product.wholesalePrice) {
    toast.error(t('toast.noPriceError'))
    return
  }
  
  const existing = cart.value.find((item: any) => item.id === product.id)
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
  const idx = cart.value.findIndex((i: any) => i.id === item.id)
  if (idx !== -1) cart.value.splice(idx, 1)
}

const clearCart = () => {
  cart.value = []
  discount.value = 0
}

const handlePayment = () => {
  if (cart.value.length === 0) {
    toast.error(t('toast.cartEmptyError'))
    return
  }
  showPaymentModal.value = true
}

const printReceipt = (manualReceiptNo?: string, details?: any) => {
  const currentDate = new Date().toLocaleString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  
  const receiptNo = manualReceiptNo || `S${Date.now().toString().slice(-8)}`
  const cashierName = selectedEmployee.value 
    ? `${selectedEmployee.value.firstName} ${selectedEmployee.value.lastName}` 
    : (user.value?.firstName ? `${user.value.firstName} ${user.value.lastName}` : t('sales.unknown'))

  const bonusSpentArr = paymentDetails.value?.isMulti 
    ? (paymentDetails.value.payments['Bonus'] || 0) 
    : (paymentMethod.value === 'Bonus' ? finalTotal.value : 0)

  const receiptData: ReceiptData = {
    receiptNo,
    cashierName,
    currentDate,
    subtotal: subtotal.value,
    finalTotal: finalTotal.value,
    discountTotal: subtotal.value - finalTotal.value,
    discountVal: Number(discount.value) || 0,
    discountType: discountType.value,
    shiftReceiptCount: shiftReceiptCount.value,
    items: cart.value.map((item: any) => {
      const price = Number(item.retailPrice) || 0
      const d = Number(item.itemDiscount) || 0
      let finalPrice = price
      if (item.itemDiscountType === 'percent') finalPrice = price * (1 - d / 100)
      else finalPrice = price - d
      
      return {
        productName: item.parentName || item.productName,
        barcode: item.barcode,
        qty: item.qty,
        price,
        finalPrice: Math.max(0, finalPrice),
        discount: d,
        discountType: item.itemDiscountType,
        discountValue: d,
        total: Math.max(0, finalPrice) * item.qty,
        attribute: item.attribute
      }
    }),
    customer: selectedCustomer.value ? {
      name: `${selectedCustomer.value.firstName} ${selectedCustomer.value.lastName}`,
      barcode: selectedCustomer.value.barcode,
      newBalance: (Number(selectedCustomer.value.bonus) || 0) - bonusSpentArr + Number(cashbackAmount.value),
      earned: Number(cashbackAmount.value),
      spent: bonusSpentArr
    } : undefined,
    paymentDetails: {
      isMulti: paymentDetails.value?.isMulti || (details?.payments && Object.keys(details.payments).length > 1) || false,
      method: paymentMethod.value,
      payments: details?.payments || paymentDetails.value?.payments,
      received: details?.received || paymentDetails.value?.received,
      change: details?.change || paymentDetails.value?.change,
      giftCard: paymentDetails.value?.giftCard ? {
        barcode: paymentDetails.value.giftCard.barcode,
        remaining: Math.max(0, paymentDetails.value.giftCard.value - (paymentDetails.value.payments?.['Gift Card'] || (paymentMethod.value === 'Gift Card' ? finalTotal.value : 0)))
      } : undefined
    }
  }

  printReceiptGlobal(receiptData)
}

const showGiftCardModal = ref(false)
const giftCardBarcode = ref('')

const completeOrder = async (details?: any) => {
  const total = finalTotal.value
  const customer = selectedCustomer.value
  
  // Store details for receipt
  paymentDetails.value = details || { isMulti: false, method: paymentMethod.value }
  
  // 1. Validate Payments
  const payments = details?.isMulti ? details.payments : { [paymentMethod.value]: total }
  
  for (const [method, amount] of Object.entries(payments)) {
    const amt = Number(amount)
    if (amt <= 0) continue

    if (method === 'Bonus') {
      if (!customer) {
        toast.error(t('toast.bonusCustomerRequired'))
        return
      }
      if ((Number(customer.bonus) || 0) < amt) {
        toast.error(t('toast.insufficientBonus'))
        return
      }
    }

    if (method === 'Gift Card') {
      const barcodeToUse = details?.giftCardBarcode || giftCardBarcode.value
      if (!barcodeToUse) {
        toast.error(t('toast.giftCardBarcodeRequired'))
        return
      }
      try {
        const cards = await $fetch<any[]>('/api/gift-cards')
        const card = (cards || []).find(c => c.barcode === barcodeToUse)
        if (!card) {
          toast.error(t('toast.giftCardNotFound'))
          return
        }
        if (card.value < amt) {
          toast.error(t('toast.insufficientGiftCardBalance', { amount: card.value.toFixed(2) }))
          return
        }
        
        // Store card object for receipt before modifying balance
        paymentDetails.value.giftCard = { ...card }

        // Deduct from gift card
        await $fetch<any>(`/api/gift-cards/${card.id}`, {
          method: 'PUT',
          body: { value: Number((card.value - amt).toFixed(2)) }
        })
      } catch (err) {
        toast.error(t('toast.giftCardCheckError'))
        return
      }
    }
  }

  isSaving.value = true
  const currentCashback = Number(cashbackAmount.value)
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : null

  try {
    // 2. Bonus/Loyalty Update
    if (customer) {
      let finalBonusUpdate = Number(customer.bonus) || 0
      const bonusSpent = payments['Bonus'] ? Number(payments['Bonus']) : 0
      if (bonusSpent > 0) finalBonusUpdate -= bonusSpent
      finalBonusUpdate += currentCashback

      const debtToAdd = Number(details?.debtAmount) || 0
      const newDebt = (Number(customer.debt) || 0) + debtToAdd

      await $fetch<any>(`/api/customers/${customer.id}`, {
        method: 'PUT',
        body: { 
          bonus: Number(finalBonusUpdate.toFixed(2)),
          debt: Number(newDebt.toFixed(2))
        },
        headers: { Authorization: `Bearer ${token.value}` }
      })
    }

    // 3. Save detailed Sale to DB
    const saleData = {
      subtotal: subtotal.value,
      discountTotal: subtotal.value - finalTotal.value,
      finalTotal: finalTotal.value,
      cashbackEarned: currentCashback,
      paymentDetails: {
        isMulti: paymentDetails.value?.isMulti,
        method: paymentDetails.value?.method || paymentMethod.value,
        payments: payments,
        received: paymentDetails.value?.received,
        change: paymentDetails.value?.change,
        giftCardBarcode: details?.giftCardBarcode || giftCardBarcode.value,
        bonusBarcode: customer?.barcode,
        debtAmount: details?.debtAmount || 0
      },
      cashierId: selectedEmployee.value?.id,
      cashierName: selectedEmployee.value ? `${selectedEmployee.value.firstName} ${selectedEmployee.value.lastName}` : null,
      customerId: customer?.id,
      customerName: customerName,
      customerBarcode: customer?.barcode,
      items: cart.value.map((item: any) => {
        const price = Number(item.retailPrice) || 0
        const d = Number(item.itemDiscount) || 0
        let finalP = price
        if (item.itemDiscountType === 'percent') finalP = price * (1 - d / 100)
        else finalP = price - d
        
        return {
          productId: item.id,
          productName: item.parentName || item.productName,
          barcode: item.barcode,
          qty: item.qty,
          retailPrice: price,
          wholesalePrice: Number(item.wholesalePrice) || 0,
          itemDiscount: d,
          itemDiscountType: item.itemDiscountType,
          finalPrice: Math.max(0, finalP),
          attribute: item.attribute
        }
      })
    }

    const savedSale = await $fetch<any>('/api/sales', {
      method: 'POST',
      body: saleData
    })

    // 4. Complete and Reset
    let msg = t('toast.saleSuccess')
    if (customerName) {
      const bonusSpent = payments['Bonus'] ? Number(payments['Bonus']) : 0
      if (bonusSpent > 0) {
        msg += `\n${t('toast.bonusDeducted', { amount: bonusSpent.toFixed(2) })}`
      }
      msg += `\n${t('toast.cashbackAdded', { name: customerName, amount: currentCashback.toFixed(2) })}`
      
      const debtAmount = Number(details?.debtAmount) || 0
      if (debtAmount > 0) {
        msg += `\n${t('toast.debtAdded')} (${debtAmount.toFixed(2)} ₼)`
      }
    }
    
    toast.success(msg)
    printReceipt(savedSale.receiptNo, details) // Pass details to ensure final payment state is printed
    
    // Anlıq stok yenilənməsi
    cart.value.forEach((item: any) => {
      const p = products.value.find((prov: any) => prov.id === item.id)
      if (p && typeof p.stock === 'number') {
        p.stock -= item.qty
      }
    })
    
    clearCart()
    selectedCustomer.value = null
    giftCardBarcode.value = ''
    showPaymentModal.value = false
    showGiftCardModal.value = false
    isSaving.value = false
    shiftReceiptCount.value++
    const todayShift = new Date().toISOString().split('T')[0]
    localStorage.setItem(`shift_count_${todayShift}`, String(shiftReceiptCount.value))

    loadCustomers()
  } catch (err: any) {
    console.error('Finalizing sale error:', err)
    toast.error(t('toast.saleError', { error: err.message || '' }))
    isSaving.value = false
  }
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
            {{ t('sales.salesTerminal') }}
        </h1>
        
        <div class="flex items-center gap-2">
          <UiButton 
            v-if="drafts.length > 0"
            variant="soft-primary" 
            size="sm" 
            icon="lucide:bookmark"
            @click="showDraftsModal = true"
            class="!px-3"
          >
            {{ drafts.length }}
          </UiButton>

          <UiButton 
            variant="soft-primary" 
            size="sm" 
            icon="lucide:plus-circle"
            @click="showGhostModal = true"
          >
            {{ t('sales.ghostProduct') }}
          </UiButton>

          <UiInput 
            ref="searchInput"
            v-model="searchQuery" 
            :placeholder="t('sales.searchHint')" 
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
            {{ cat === 'ALL' ? t('sales.allProducts') : cat }}
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
          <p class="font-bold text-lg">{{ t('sales.noProductsFound') }}</p>
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
    <div class="w-full lg:w-[400px] shrink-0 h-full">
      <SalesCartSidebar 
        v-model:discount="discount"
        v-model:discountType="discountType"
        v-model:selectedCustomer="selectedCustomer"
        v-model:selectedEmployee="selectedEmployee"
        :cart="cart"
        :subtotal="subtotal"
        :finalTotal="finalTotal"
        :customers="customers"
        :employees="employees"
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
    v-model:customer="selectedCustomer"
    :total="finalTotal"
    :dbMethods="paymentMethods"
    :isSaving="isSaving"
    @confirm="completeOrder"
    @refresh-methods="loadPaymentMethods"
  />
  
  <!-- Drafts Modal -->
  <Modal
    v-model="showDraftsModal"
    :title="t('sales.temporarySaved')"
    max-width="md"
  >
    <div class="space-y-3">
      <div v-if="drafts.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50">
        <UiIcon name="lucide:inbox" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p class="font-bold">{{ t('sales.noDrafts') }}</p>
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
            {{ t('sales.load') }}
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
    :title="t('sales.addGhost')"
    max-width="md"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">{{ t('products.name') }}</label>
        <UiInput 
          v-model="ghostProduct.productName" 
          :placeholder="t('sales.ghostProductNameHint')" 
          autofocus
        />
      </div>
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">{{ t('sales.price') }} (₼)</label>
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
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton 
          variant="primary" 
          block 
          @click="addGhostProduct"
        >
          {{ t('sales.addToCart') }}
        </UiButton>
      </div>
    </template>
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
