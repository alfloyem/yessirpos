<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import SalesProductSaleCard from '~/components/sales/ProductSaleCard.vue'
import { printIntakeReceipt } from '~/utils/receiptPrinter'

const { t } = useI18n()
const { user } = useAuth()
const toast = useToast()
const { $api } = useNuxtApp()

useHead({
  title: t('intake.title', 'Mal Qəbulu')
})

// --- Data ---
const suppliers = useState<any[]>('received_suppliers', () => [])
const products = useState<any[]>('received_products', () => [])
const staticPaymentMethods = computed(() => [
  { id: 'static-cash', name: t('sales.cash'), icon: 'lucide:banknote' },
  { id: 'static-card', name: t('sales.card'), icon: 'lucide:credit-card' }
])
const dbPaymentMethods = useState<any[]>('received_db_payment_methods', () => [])
const paymentMethods = computed(() => [...staticPaymentMethods.value, ...dbPaymentMethods.value])
const loading = ref(false)
const saving = ref(false)

// --- Selections ---
const selectedSupplier = ref<any>(null)
const searchQuery = ref('')
const selectedCategory = ref('ALL')
const cart = useState<any[]>('received_cart', () => [])
const notes = ref('')
const selectedPaymentMethod = ref<any>(null)

watch(paymentMethods, (newMethods) => {
  if (!selectedPaymentMethod.value && newMethods.length > 0) {
    selectedPaymentMethod.value = newMethods[0]
  }
}, { immediate: true })
const showPaymentModal = ref(false)
const paidAmount = ref<number>(0)

// DOM refs
const searchInput = ref<any>(null)

const focusSearch = () => {
  if (searchInput.value) {
    if (typeof searchInput.value.focus === 'function') {
      searchInput.value.focus()
    } else {
      searchInput.value.$el?.querySelector('input')?.focus()
    }
  }
}

onMounted(async () => {
  await fetchSuppliers()
  await fetchProducts()
  await loadPaymentMethods()
  setTimeout(focusSearch, 500)
})

const fetchSuppliers = async () => {
  try {
    const data = await $api<any[]>('/api/suppliers')
    suppliers.value = data.map((s: any) => ({
      ...s,
      companyName: s.companyName ? (String(s.companyName).startsWith('[') ? JSON.parse(s.companyName) : [s.companyName]) : [],
      voen: s.voen ? (String(s.voen).startsWith('[') ? JSON.parse(s.voen) : [s.voen]) : [],
      city: s.city ? (String(s.city).startsWith('[') ? JSON.parse(s.city) : [s.city]) : []
    }))
  } catch (err) {
    console.error('Fetch suppliers error:', err)
  }
}

const fetchProducts = async () => {
  if (products.value.length === 0) loading.value = true
  try {
    products.value = await $api<any[]>('/api/products')
  } catch (err) {
    console.error('Fetch products error:', err)
  } finally {
    loading.value = false
  }
}

const loadPaymentMethods = async () => {
  try {
    const data = await $api<any[]>('/api/payment-methods')
    if (data && data.length > 0) {
      // Keep static ones, add DB ones if they are different names
      const dbMethods = data.filter(dm => !['Nəğd', 'Kart'].includes(dm.name))
      dbPaymentMethods.value = dbMethods
    }
  } catch (err) {
    console.error('Failed to load payment methods:', err)
  }
}

// --- Product grouping (same as sales.vue) ---
const groupProducts = (list: any[]) => {
  const roots = list.filter((p: any) => !p.parentProductId)
  const variants = list.filter((p: any) => p.parentProductId)
  
  return roots.map(root => ({
    ...root,
    variants: variants.filter((v: any) => v.parentProductId === root.id)
  }))
}

const getItemDisplayName = (item: any) => {
  const baseName = item.productName
  if (item.attribute) {
    let attrStr = ''
    if (Array.isArray(item.attribute)) {
      attrStr = item.attribute.map((attr: string) => {
        const parts = attr.split(':')
        return parts.length > 1 ? parts[1]!.trim() : attr
      }).join(', ')
    } else if (typeof item.attribute === 'string') {
      try {
        const parsed = JSON.parse(item.attribute)
        if (Array.isArray(parsed)) {
          attrStr = parsed.map((attr: string) => {
            const parts = attr.split(':')
            return parts.length > 1 ? parts[1]!.trim() : attr
          }).join(', ')
        } else {
          const parts = item.attribute.split(':')
          attrStr = parts.length > 1 ? parts[1]!.trim() : item.attribute
        }
      } catch (e) {
        const parts = item.attribute.split(':')
        attrStr = parts.length > 1 ? parts[1]!.trim() : item.attribute
      }
    }
    return attrStr ? `${baseName} | ${attrStr}` : baseName
  }
  return baseName
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
      const parentMatch = 
        (group.productName && group.productName.toLowerCase().includes(q)) || 
        (group.barcode && String(group.barcode).toLowerCase().includes(q))
      
      const variantMatch = group.variants.some((v: any) => 
        (v.productName && v.productName.toLowerCase().includes(q)) || 
        (v.barcode && String(v.barcode).toLowerCase().includes(q))
      )
      
      return parentMatch || variantMatch
    })
  }

  return grouped
})

// --- Barcode Auto-Add Logic ---
watch(searchQuery, (newVal: string) => {
  if (!newVal || newVal.length < 3) return
  const matched = products.value.find((p: any) => String(p.barcode) === newVal)
  if (matched) {
    addToCart(matched)
    searchQuery.value = ''
    nextTick(focusSearch)
  }
})

// --- Cart Logic ---
const addToCart = (product: any) => {
  const wholesale = Number(product.wholesalePrice) || 0
  cart.value.push({
    productId: product.id,
    productName: product.parentName || product.productName,
    barcode: product.barcode,
    attribute: product.attribute,
    images: product.images,
    retailPrice: Number(product.retailPrice) || 0,
    qty: 1,
    costPrice: wholesale,
    discount: 0,
    discountType: 'amount' as 'amount' | 'percent'
  })
}

const removeItem = (index: number) => {
  cart.value.splice(index, 1)
}

const clearCart = () => {
  cart.value = []
}

const calculateItemTotal = (item: any) => {
  const qty = Number(item.qty) || 0
  const cost = Number(item.costPrice) || 0
  const disc = Number(item.discount) || 0
  
  let discountAmount = 0
  if (item.discountType === 'percent') {
    discountAmount = (cost * disc) / 100
  } else {
    discountAmount = disc
  }
  
  return (cost - discountAmount) * qty
}

const subtotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + calculateItemTotal(item), 0)
})

const totalQty = computed(() => {
  return cart.value.reduce((acc, i) => acc + (Number(i.qty) || 0), 0)
})

const balanceDue = computed(() => {
  return Math.max(0, subtotal.value - (Number(paidAmount.value) || 0))
})

const submitIntake = async () => {
  if (!selectedSupplier.value) {
    toast.error(t('intake.noSupplier', 'Tədarükçü seçilməyib'))
    return
  }
  if (cart.value.length === 0) {
    toast.error(t('intake.noItems', 'Heç bir məhsul əlavə edilməyib'))
    return
  }

  saving.value = true
  try {
    const payload = {
      supplierId: selectedSupplier.value.id,
      supplierName: selectedSupplier.value.brandName,
      totalAmount: subtotal.value,
      paidAmount: Number(paidAmount.value) || 0,
      balanceDue: balanceDue.value,
      paymentMethod: selectedPaymentMethod.value?.name || t('sales.cash'),
      notes: notes.value,
      createdBy: user.value?.name,
      items: cart.value.map(item => ({
        productId: item.productId,
        productName: item.productName,
        barcode: item.barcode,
        qty: Number(item.qty) || 0,
        costPrice: Number(item.costPrice) || 0,
        discount: Number(item.discount) || 0,
        discountType: item.discountType || 'amount',
        total: calculateItemTotal(item),
        attribute: item.attribute
      }))
    }

    const res: any = await $api('/api/intake', {
      method: 'POST',
      body: payload
    })

    toast.success(t('intake.success', 'Məhsul qəbulu uğurla tamamlandı!'))
    
    // Print Receipt
    if (res && res.receiptNo) {
      printIntakeReceipt({
        receiptNo: res.receiptNo,
        supplierName: selectedSupplier.value.brandName,
        createdBy: user.value?.name || '---',
        date: new Date().toLocaleString(),
        items: payload.items,
        totalAmount: payload.totalAmount,
        paidAmount: payload.paidAmount,
        balanceDue: payload.balanceDue,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes
      })
    }

    cart.value = []
    selectedSupplier.value = null
    notes.value = ''
    paidAmount.value = 0
  } catch (err: any) {
    toast.error(err.statusMessage || 'Xəta baş verdi')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 font-sans lg:h-[calc(100vh-120px)] pb-4">

      <!-- Left Section: Search & Products (same as sales.vue) -->
      <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">

        <!-- Top Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 shrink-0">
          <h1 class="text-xl md:text-2xl font-black text-[var(--text-app)] tracking-tight leading-none">
            {{ t('intake.title', 'Mal Qəbulu') }}
          </h1>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <UiInput 
              ref="searchInput"
              v-model="searchQuery" 
              :placeholder="t('sales.searchHint')" 
              icon="lucide:search" 
              clearable
              class="w-full"
              @keyup.enter="focusSearch"
            />
          </div>
        </div>

        <!-- Categories Filter -->
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
            <p class="font-bold text-lg">{{ t('sales.noProductsFound', 'Məhsul tapılmadı.') }}</p>
          </div>

          <div v-else class="pt-2 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
            <SalesProductSaleCard 
              v-for="root in filteredProductGroups" 
              :key="root.id"
              :product="root"
              @add-to-cart="addToCart"
            />
          </div>
        </div>
      </div>

      <!-- Right Section: Sidebar (CartSidebar structure) -->
      <div class="w-full lg:w-[400px] shrink-0 h-auto lg:h-full">
        <div class="flex flex-col bg-[var(--input-bg)] rounded-[28px] border border-[var(--border-app)] h-full min-h-[500px] lg:min-h-0 overflow-hidden shadow-2xl lg:shadow-none">
          
          <!-- Top: Supplier & Payment Method -->
          <div class="p-4 border-b border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-xl shrink-0 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <!-- Supplier Autocomplete -->
              <div class="relative m-0 flex-1">
                <div v-if="selectedSupplier" class="flex items-center gap-2.5 pl-4 p-2 border border-[var(--text-primary)]/10 rounded-xl transition-all hover:bg-[var(--text-primary)]/10">
                  <span class="text-xs font-black text-[var(--text-app)] truncate leading-tight flex-1">{{ selectedSupplier.brandName }}</span>
                  <button @click="selectedSupplier = null" class="w-6 h-6 flex items-center justify-center hover:bg-red-500/10 rounded-lg transition-all text-red-500/40 hover:text-red-500 group/btn">
                    <UiIcon name="lucide:x" class="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                  </button>
                </div>
                
                <div v-else class="relative">
                  <UiAutocomplete
                    :modelValue="selectedSupplier?.id"
                    @update:modelValue="(val: any) => {
                      const supplier = suppliers.find(s => s.id === val)
                      selectedSupplier = supplier
                    }"
                    :options="suppliers.map(s => ({
                      label: s.brandName,
                      value: s.id,
                      extra: (Array.isArray(s.companyName) ? s.companyName.join(', ') : s.companyName) || s.phone
                    }))"
                    :placeholder="t('intake.selectSupplier', 'Tədarükçü Seçin')" 
                    icon="lucide:truck" 
                    class="!rounded-xl"
                    size="sm"
                  />
                </div>
              </div>

              <div v-if="cart.length > 0" class="flex items-center gap-1.5 self-center">
                <UiButton 
                  variant="outline"
                  size="sm"
                  class="!w-9 !h-9 !px-0 !rounded-xl text-red-500 border-red-500/10 hover:bg-red-500/5 bg-[var(--bg-app)]"
                  @click="clearCart"
                >
                  <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                </UiButton>
              </div>
            </div>

            <!-- Payment Method: Modal Trigger Button -->
            <div class="relative m-0">
              <button 
                @click="showPaymentModal = true"
                class="w-full flex items-center justify-between gap-3 p-3 bg-[var(--bg-app)]/50 border border-[var(--border-app)] rounded-xl hover:border-[var(--text-primary)]/30 transition-all group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[var(--text-primary)]/10 flex items-center justify-center shrink-0">
                    <UiIcon :name="selectedPaymentMethod?.icon || 'lucide:wallet'" class="w-4 h-4 text-[var(--text-primary)]" />
                  </div>
                  <div class="text-left min-w-0">
                    <div class="text-xs font-black text-[var(--text-app)] truncate">{{ selectedPaymentMethod?.name || t('common.notSelected') }}</div>
                  </div>
                </div>
                <UiIcon name="lucide:chevron-right" class="w-3.5 h-3.5 opacity-20 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <!-- Middle: Cart Items (like CartSidebar items list) -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-[300px] lg:min-h-0">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6">
              <div class="w-16 h-16 rounded-full bg-[var(--border-app)]/20 flex items-center justify-center mb-4">
                <UiIcon name="lucide:shopping-cart" class="w-8 h-8 stroke-[1.5]" />
              </div>
              <p class="font-black text-base tracking-wider mb-1">{{ t('cart.empty') }}</p>
              <p class="text-[10px] font-bold opacity-60">{{ t('cart.emptySubtitle') }}</p>
            </div>

            <TransitionGroup name="cart-list">
              <div 
                v-for="(item, index) in cart" 
                :key="index"
                class="relative bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-3 flex flex-col gap-2.5 transition-all duration-300 hover:border-[var(--text-primary)]/30 hover:shadow-lg group/item"
              >
                <!-- Top Row: Img, Name, Delete -->
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]/50 flex items-center justify-center shadow-sm">
                    <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
                    <UiIcon v-else name="lucide:package" class="w-5 h-5 text-[var(--text-app)] opacity-10" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <h4 class="font-black text-[13px] text-[var(--text-app)] truncate tracking-tight leading-tight">
                      {{ getItemDisplayName(item) }}
                    </h4>
                    <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span class="text-[11px] font-black text-[var(--text-app)]/60 tabular-nums">
                        {{ Number(item.costPrice).toFixed(2) }} ₼
                      </span>
                      <span class="text-[9px] font-bold tracking-widest bg-[var(--border-app)] px-1.5 py-0.5 rounded-md opacity-60">× {{ item.qty }}</span>
                      <span v-if="item.retailPrice && Number(item.retailPrice) !== Number(item.costPrice)" class="text-[9px] font-bold text-green-500/70 italic">
                        {{ t('intake.retailLabel', 'satış') }}: {{ Number(item.retailPrice).toFixed(2) }}
                      </span>
                    </div>
                  </div>

                  <!-- Delete Button: Always visible on touch, subtle on desktop -->
                  <button 
                    @click="removeItem(index)" 
                    class="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white shrink-0 lg:opacity-30 lg:group-hover/item:opacity-100"
                  >
                    <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </div>

                <!-- Controls Row: Qty + Price + Discount + Total -->
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <!-- Left: Controls -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Qty Stepper -->
                    <div class="flex items-center bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)] h-9 px-0.5">
                      <button 
                        @click="item.qty = Math.max(1, item.qty - 1)" 
                        class="w-7 h-7 flex items-center justify-center text-[var(--text-app)]/40 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all active:scale-90"
                      >
                        <UiIcon name="lucide:minus" class="w-3.5 h-3.5" />
                      </button>
                      <input 
                        type="number"
                        v-model="item.qty"
                        class="w-8 text-center text-[13px] font-black bg-transparent border-none p-0 focus:ring-0 tabular-nums no-spinners"
                        min="1"
                      />
                      <button 
                        @click="item.qty++" 
                        class="w-7 h-7 flex items-center justify-center text-[var(--text-app)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-lg transition-all active:scale-90"
                      >
                        <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <!-- Cost Price -->
                    <div class="flex items-center bg-[var(--input-bg)] rounded-xl h-9 px-2 border border-transparent focus-within:border-green-500/30">
                      <span class="text-[9px] font-black text-green-600/50 mr-1">{{ t('intake.wholesaleShort', 'Tdn.') }}</span>
                      <input 
                        type="number"
                        v-model="item.costPrice"
                        class="w-14 text-center text-[12px] font-black bg-transparent border-none p-0 focus:ring-0 no-spinners text-green-600"
                      />
                    </div>

                    <!-- Discount -->
                    <div class="flex items-center bg-[var(--input-bg)] rounded-xl h-9 px-2 border border-transparent focus-within:border-red-500/20">
                      <button 
                        @click="item.discountType = item.discountType === 'amount' ? 'percent' : 'amount'"
                        class="text-[10px] font-black mr-1 w-5 h-5 rounded flex items-center justify-center bg-white shadow-sm border border-[var(--border-app)] transition-colors"
                        :class="item.discountType === 'percent' ? 'text-red-500' : 'text-[var(--text-app)]/40'"
                      >
                        {{ item.discountType === 'percent' ? '%' : '₼' }}
                      </button>
                      <input 
                        type="number"
                        v-model="item.discount"
                        class="w-10 bg-transparent border-none text-[12px] font-black text-center p-0 focus:ring-0 no-spinners text-red-500/80"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <!-- Right: Line Total -->
                  <span class="text-[15px] font-black text-[var(--text-app)] tabular-nums tracking-tight ml-auto">
                    {{ calculateItemTotal(item).toFixed(2) }} ₼
                  </span>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <!-- Bottom: Summary & Submit -->
          <div class="bg-[var(--bg-app)]/80 backdrop-blur-2xl border-t border-[var(--border-app)] p-2.5 space-y-2 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
            <div class="space-y-1.5 px-0.5">
              <div class="flex justify-between items-center text-xs font-bold text-[var(--text-app)]">
                <span class="text-sm">{{ t('sales.draftNameCart', { count: totalQty }) }}</span>
                <span class="text-sm font-black text-[var(--text-app)]">{{ subtotal.toFixed(2) }} ₼</span>
              </div>

              <!-- Paid Amount row (like Endirim row in CartSidebar) -->
              <div class="flex items-center justify-between gap-1">
                <span class="text-sm flex-1 font-bold text-[var(--text-app)]">{{ t('intake.paidAmount') }}</span>
                
                <div class="relative flex-1 max-w-[100px]">
                  <input 
                    type="number" 
                    :value="paidAmount" 
                    @input="(e: any) => paidAmount = Number(e.target.value) || 0"
                    placeholder="0"
                    class="w-full h-7.5 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl px-3 text-center text-[12px] font-black focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/5 no-spinners transition-all"
                  />
                </div>
              </div>

              <!-- Balance Due row -->
              <div v-if="balanceDue > 0" class="flex justify-between items-center rounded-lg">
                <span class="text-sm font-black text-orange-500 leading-none">{{ t('intake.balanceDue') }}</span>
                <span class="text-sm font-black text-orange-500 tabular-nums">{{ balanceDue.toFixed(2) }} ₼</span>
              </div>
            </div>

            <div class="border-t border-[var(--border-app)] border-dashed pt-2 flex justify-between items-end px-0.5">
              <div class="flex items-center justify-between flex-1">
                <span class="text-x font-bold text-[var(--text-app)] mb-0">
                  {{ t('cart.toPay') }}
                </span>
                <div class="flex items-baseline gap-1">
                  <span class="text-[20px] font-black tabular-nums tracking-tighter text-[var(--text-primary)]">
                    {{ subtotal.toFixed(2) }}
                  </span>
                  <span class="text-[12px] font-black text-[var(--text-primary)]">₼</span>
                </div>
              </div>
            </div>

            <UiButton 
              block 
              variant="primary"
              @click="submitIntake" 
              :disabled="cart.length === 0 || !selectedSupplier"
              :loading="saving"
              class="!h-12 sm:!h-14 !rounded-2xl !text-sm sm:!text-base font-black shadow-xl shadow-[var(--text-primary)]/15 transition-all active:scale-[0.98]"
              icon-right="lucide:arrow-right"
            >
              {{ t('intake.complete', 'Qəbulu Tamamla') }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Method Selection Modal -->
    <UiModal 
      v-model="showPaymentModal" 
      :title="t('intake.selectPaymentMethod', 'Ödəniş Üsulunu Seçin')"
      maxWidth="sm"
    >
      <div class="flex flex-col gap-2">
        <button 
          v-for="pm in paymentMethods" 
          :key="pm.id"
          @click="selectedPaymentMethod = pm; showPaymentModal = false"
          class="flex items-center gap-4 p-4 rounded-2xl border transition-all group"
          :class="selectedPaymentMethod?.id === pm.id 
            ? 'bg-[var(--text-primary)]/10 border-[var(--text-primary)] shadow-sm' 
            : 'bg-[var(--bg-app)] border-[var(--border-app)] hover:border-[var(--text-primary)]/40'"
        >
          <UiIcon :name="pm.icon || 'lucide:credit-card'" class="w-6 h-6" />
          <div class="flex-1 text-left">
            <div class="font-black text-[var(--text-app)] text-sm">{{ pm.name }}</div>
          </div>
          <UiIcon v-if="selectedPaymentMethod?.id === pm.id" name="lucide:check" class="w-3.5 h-3.5" />
        </button>
      </div>
    </UiModal>
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

.cart-list-enter-active,
.cart-list-leave-active {
  transition: all 0.3s ease;
}
.cart-list-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.cart-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
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

/* Hide spin buttons */
.no-spinners::-webkit-inner-spin-button, 
.no-spinners::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  appearance: none;
  margin: 0; 
}
.no-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

button:not(:disabled) {
  cursor: pointer;
}
</style>
