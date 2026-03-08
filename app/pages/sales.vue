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
const showManageMethodsModal = ref(false)
const showGhostModal = ref(false)
const paymentMethod = ref('Nəğd')
const isSaving = ref(false)

// Manage Payment Methods State
const paymentMethods = ref<any[]>([])
const editingMethod = ref<any>(null)
const methodForm = ref({ name: '', icon: 'lucide:credit-card', color: 'blue' })

const savePaymentMethod = async () => {
  if (!methodForm.value.name) return
  
  try {
    if (editingMethod.value) {
      await $fetch(`/api/payment-methods/${editingMethod.value.id}`, {
        method: 'PUT',
        body: methodForm.value
      })
    } else {
      await $fetch('/api/payment-methods', {
        method: 'POST',
        body: methodForm.value
      })
    }
    await loadPaymentMethods()
    editingMethod.value = null
    methodForm.value = { name: '', icon: 'lucide:credit-card', color: 'blue' }
    toast.success('Ödəniş üsulu yadda saxlanıldı')
  } catch (err: any) {
    toast.error(err.statusMessage || 'Xəta baş verdi')
  }
}

const deletePaymentMethod = async (id: number) => {
  if (!confirm('Bu ödəniş üsulunu silmək istədiyinizə əminsiniz?')) return
  try {
    await $fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
    await loadPaymentMethods()
    toast.success('Silindi')
  } catch (err) {
    toast.error('Silinərkən xəta baş verdi')
  }
}

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
    
    // System methods that are always required and protected
    const systemDefaults = [
      { name: 'Nəğd', icon: 'lucide:coins', color: 'green', isSystem: true },
      { name: 'Bank Kartı', icon: 'lucide:credit-card', color: 'blue', isSystem: true },
      { name: 'Bonus', icon: 'lucide:sparkles', color: 'amber', isSystem: true },
      { name: 'Hədiyyə Kartı', icon: 'lucide:gift', color: 'purple', isSystem: true }
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
  <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">
    
    <!-- Left Section: Search & Products -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
      
      <!-- Top Action Bar - Compact -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 class="text-xl md:text-2xl font-black text-[var(--text-app)] tracking-tight leading-none mb-1">
            {{ t('menu.salesTerminal', 'Satış Terminalı') }}
          </h1>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Mağaza Satış Nöqtəsi</p>
        </div>
        
        <div class="flex items-center gap-3">
          <UiButton 
            variant="outline" 
            size="sm" 
            class="!rounded-2xl !h-11 border-dashed border-[var(--text-primary)]/30 hover:border-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 text-[var(--text-primary)] px-5 transition-all active:scale-95"
            @click="showGhostModal = true"
          >
            <UiIcon name="lucide:plus-circle" class="w-4 h-4 mr-2" />
            <span class="font-bold text-[13px]">Keçici Məhsul</span>
          </UiButton>

          <div class="w-full md:w-72 relative">
            <UiInput 
              ref="searchInput"
              v-model="searchQuery" 
              placeholder="Barkod və ya ad axtar..." 
              icon="lucide:search" 
              clearable
              class="!rounded-2xl !bg-[var(--input-bg)] !border-[var(--border-app)]/50 !h-11 !text-[14px] !pl-11"
              @keyup.enter="focusSearch"
            />
          </div>
        </div>
      </div>

      <!-- Categories Filter - Compact -->
      <div class="flex items-center gap-2 mb-5 shrink-0">
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide pb-1 -mx-2 px-2">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="selectedCategory = cat"
            class="px-4 py-2 font-black text-[11px] uppercase tracking-wider rounded-xl whitespace-nowrap transition-all border cursor-pointer hover:shadow-sm"
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

        <div v-else class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
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
        @decrease="decreaseQty"
        @remove="removeFromCart"
        @clear="clearCart"
        @checkout="handlePayment"
        @update-item-discount="updateItemDiscount"
        @update-item-discount-type="updateItemDiscountType"
      />
    </div>
    
  </div>

  <!-- Payment Modal -->
  <Modal v-model="showPaymentModal" title="Ödəniş Təsdiqi və Çap" max-width="md">
    <div class="p-4 space-y-6">
      
      <div class="bg-[var(--text-primary)] shadow-2xl shadow-[var(--text-primary)]/20 p-8 rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
        <UiIcon name="lucide:banknote" class="w-32 h-32 absolute right-[-20px] bottom-[-20px] opacity-[0.05] text-white group-hover:scale-110 transition-transform duration-700" />
        <span class="text-white/50 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Ödəniləcək Məbləğ</span>
        <span class="text-5xl font-black text-white drop-shadow-md tabular-nums">{{ finalTotal.toFixed(2) }} ₼</span>
      </div>

      <div class="space-y-5">
        <div class="flex items-center justify-between px-2">
          <div>
            <h4 class="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-app)]">Ödəniş Metodu</h4>
            <div class="h-1 w-6 bg-[var(--text-primary)] rounded-full mt-1"></div>
          </div>
          <button 
            @click="showManageMethodsModal = true"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-app)] hover:border-[var(--text-primary)]/40 text-[var(--text-app)] opacity-60 hover:opacity-100 transition-all group"
          >
            <UiIcon name="lucide:settings-2" class="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            <span class="text-[10px] font-black uppercase tracking-widest">İdarə Et</span>
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-3.5 max-h-[320px] overflow-y-auto p-1 custom-scrollbar">
          <button 
            v-for="method in paymentMethods"
            :key="method.id"
            @click="paymentMethod = method.name"
            class="group relative flex flex-col items-start p-5 rounded-[24px] border-2 transition-all duration-500 overflow-hidden"
            :class="paymentMethod === method.name 
              ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] shadow-xl shadow-[var(--text-primary)]/5 scale-[1.02]' 
              : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/20 text-[var(--text-app)] bg-[var(--bg-app)] opacity-60 hover:opacity-100'"
          >
            <div class="relative z-10 w-full">
              <div 
                class="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all duration-500 shadow-sm"
                :class="paymentMethod === method.name ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--input-bg)] group-hover:bg-[var(--text-primary)]/10'"
              >
                <UiIcon :name="method.icon || 'lucide:credit-card'" class="w-6 h-6" />
              </div>
              <span class="text-[15px] font-black tracking-tight leading-tight block">{{ method.name }}</span>
              <p class="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-1">Ödənişi tamamla</p>
            </div>

            <!-- Selection Indicator -->
            <div 
              v-if="paymentMethod === method.name"
              class="absolute top-4 right-4"
            >
              <div class="w-6 h-6 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                <UiIcon name="lucide:check" class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
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
  
  <!-- Ghost Product Modal -->
  <Modal
    v-model="showGhostModal"
    :title="t('sales.addGhost', 'Keçici Məhsul Əlavə Et')"
    max-width="md"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-black uppercase tracking-widest text-[var(--text-app)] opacity-40 mb-1.5">Məhsulun Adı</label>
        <UiInput 
          v-model="ghostProduct.productName" 
          placeholder="Məs: Paket, Xidmət və s." 
          class="!bg-[var(--bg-app)]"
          autofocus
        />
      </div>
      <div>
        <label class="block text-xs font-black uppercase tracking-widest text-[var(--text-app)] opacity-40 mb-1.5">Qiymət (₼)</label>
        <UiInput 
          v-model="ghostProduct.retailPrice" 
          type="number"
          placeholder="0.00" 
          class="!bg-[var(--bg-app)]"
        />
      </div>
    </div>
    <template #footer>
      <div class="flex gap-3 w-full">
        <UiButton 
          variant="outline" 
          block 
          class="!rounded-xl"
          @click="showGhostModal = false"
        >
          Ləğv Et
        </UiButton>
        <UiButton 
          variant="primary" 
          block 
          class="!rounded-xl shadow-lg shadow-[var(--text-primary)]/20"
          @click="addGhostProduct"
        >
          Səbətə Əlavə Et
        </UiButton>
      </div>
    </template>
  </Modal>

  <!-- Manage Payment Methods Modal -->
  <Modal 
    v-model="showManageMethodsModal" 
    title="Ödəniş Üsullarını İdarə Et" 
    max-width="md"
    :show-header="false"
  >
    <div class="flex flex-col h-[600px] bg-[var(--bg-app)]">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-[var(--border-app)] bg-[var(--bg-app)]/80 backdrop-blur-md shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-5">
            <button 
              @click="showManageMethodsModal = false"
              class="w-11 h-11 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all duration-300 shadow-sm group"
            >
              <UiIcon name="lucide:arrow-left" class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h3 class="text-2xl font-black text-[var(--text-app)] tracking-tight leading-none mb-1.5">Ödəniş Üsulları</h3>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Sistem Konfiqurasiyası</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-10">
        <!-- Add/Edit Section -->
        <section class="space-y-4">
          <div class="flex items-center gap-3 px-1">
            <div class="w-1.5 h-4 bg-[var(--text-primary)] rounded-full"></div>
            <h4 class="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
              {{ editingMethod ? 'Üsulu Redaktə Et' : 'Yeni Üsul Əlavə Et' }}
            </h4>
          </div>

          <div class="bg-[var(--input-bg)] border border-[var(--border-app)] p-7 rounded-[32px] shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--text-primary)]/5 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity group-hover:opacity-100 opacity-50"></div>
            
            <div class="relative space-y-6">
              <div class="flex gap-4">
                <div class="flex-1 relative">
                  <UiInput 
                    v-model="methodForm.name" 
                    placeholder="Üsulun adı (məs: MilliÖN)" 
                    class="w-full !bg-[var(--bg-app)] !rounded-[18px] !h-14 !pl-5 !text-[15px] !font-bold" 
                    :disabled="editingMethod?.isSystem"
                  />
                  <div v-if="editingMethod?.isSystem" class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--text-primary)] bg-[var(--text-primary)]/10 px-2 py-1 rounded-md">
                    SİSTEM ADI
                  </div>
                </div>
                <UiButton 
                  variant="primary" 
                  @click="savePaymentMethod"
                  class="shrink-0 !rounded-[18px] !h-14 !px-8 shadow-xl shadow-[var(--text-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <div class="flex items-center gap-2.5">
                    <UiIcon :name="editingMethod ? 'lucide:save' : 'lucide:plus'" class="w-5 h-5" />
                    <span class="font-black text-sm">{{ editingMethod ? 'Yadda Saxla' : 'Əlavə Et' }}</span>
                  </div>
                </UiButton>
              </div>

              <!-- Icon Selector -->
              <div class="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
                <button 
                  v-for="icon in ['lucide:credit-card', 'lucide:coins', 'lucide:banknote', 'lucide:wallet', 'lucide:smartphone', 'lucide:qr-code', 'lucide:sparkles', 'lucide:gift']"
                  :key="icon"
                  @click="methodForm.icon = icon"
                  class="flex-shrink-0 w-12 h-12 rounded-xl border-2 transition-all duration-300 flex items-center justify-center group/icon"
                  :class="methodForm.icon === icon 
                    ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-white shadow-lg shadow-[var(--text-primary)]/30 scale-110' 
                    : 'bg-[var(--bg-app)] border-transparent text-[var(--text-app)] opacity-40 hover:opacity-100 hover:border-[var(--border-app)] hover:bg-[var(--input-bg)]'"
                >
                  <UiIcon :name="icon" class="w-5 h-5 transition-transform group-hover/icon:scale-110" />
                </button>
              </div>

              <div v-if="editingMethod" class="flex justify-start">
                <button 
                  @click="editingMethod = null; methodForm = { name: '', icon: 'lucide:credit-card', color: 'blue' }" 
                  class="text-[10px] font-black text-[var(--text-primary)] bg-[var(--text-primary)]/10 px-4 py-2 rounded-xl hover:bg-[var(--text-primary)]/20 transition-colors uppercase tracking-widest"
                >
                  Dəyişiklikləri ləğv et
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- List Section -->
        <section class="space-y-4">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-3">
              <div class="w-1.5 h-4 bg-[var(--text-app)] opacity-20 rounded-full"></div>
              <h4 class="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Mövcud Üsullar</h4>
            </div>
            <span class="text-[10px] font-bold opacity-30">{{ paymentMethods.length }} Üsul</span>
          </div>
          
          <div class="grid gap-3">
            <div 
              v-for="(method, idx) in paymentMethods" 
              :key="method.id"
              class="flex items-center justify-between p-5 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[24px] group hover:border-[var(--text-primary)]/40 hover:bg-[var(--input-bg)]/80 transition-all duration-300"
              :style="{ transitionDelay: `${idx * 40}ms` }"
            >
              <div class="flex items-center gap-5">
                <div 
                  class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm"
                  :class="method.isSystem ? 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]' : 'bg-[var(--bg-app)] border border-[var(--border-app)] text-[var(--text-app)]'"
                >
                  <UiIcon :name="method.icon || 'lucide:credit-card'" class="w-7 h-7" />
                </div>
                <div>
                  <span class="font-bold text-[16px] text-[var(--text-app)] block mb-0.5 tracking-tight">{{ method.name }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] opacity-30 font-black uppercase tracking-widest">ID: #00{{ method.id }}</span>
                    <span v-if="method.isSystem" class="w-1 h-1 rounded-full bg-[var(--text-primary)] opacity-40"></span>
                    <span v-if="method.isSystem" class="text-[9px] text-[var(--text-primary)] font-black uppercase tracking-wider opacity-60">Sistem Üsulu</span>
                  </div>
                </div>
              </div>
              
              <div class="flex gap-2.5">
                <button 
                  v-if="!method.isSystem"
                  @click="editingMethod = method; methodForm = { ...method }"
                  class="w-10 h-10 rounded-[14px] bg-[var(--bg-app)] border border-[var(--border-app)] text-[var(--text-app)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:shadow-lg hover:shadow-[var(--text-primary)]/10 transition-all group/btn"
                >
                  <UiIcon name="lucide:edit-3" class="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                </button>
                <button 
                  v-if="!method.isSystem"
                  @click="deletePaymentMethod(method.id)"
                  class="w-10 h-10 rounded-[14px] bg-[var(--bg-app)] border border-[var(--border-app)] text-[var(--text-app)] hover:text-red-500 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all group/btn"
                >
                  <UiIcon name="lucide:trash-2" class="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                </button>
                <div v-else class="flex items-center gap-2 px-3 py-1.5 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 rounded-xl text-[9px] font-black text-[var(--text-primary)]/50 uppercase tracking-widest">
                  <UiIcon name="lucide:lock" class="w-3 h-3" />
                  QORUNUR
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="paymentMethods.length === 0" class="flex flex-col items-center justify-center py-20 opacity-20 text-center grayscale">
            <UiIcon name="lucide:layout-template" class="w-20 h-20 mb-5 stroke-[1]" />
            <p class="font-black text-sm uppercase tracking-[0.2em]">Heç bir ödəniş üsulu yoxdur</p>
          </div>
        </section>
      </div>
    </div>
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
