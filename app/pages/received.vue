<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import SalesProductSaleCard from '~/components/sales/ProductSaleCard.vue'

const { t } = useI18n()
const { user } = useAuth()
const toast = useToast()

useHead({
  title: t('intake.title', 'Mal Qəbulu')
})

// --- Data ---
const suppliers = ref<any[]>([])
const products = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)

// --- Selections ---
const selectedSupplier = ref<any>(null)
const searchQuery = ref('')
const selectedCategory = ref('Bütün Mallar')
const cart = ref<any[]>([])
const notes = ref('')
const paymentMethod = ref('Nəğd')
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
  setTimeout(focusSearch, 500)
})

const fetchSuppliers = async () => {
  try {
    suppliers.value = await $fetch<any[]>('/api/suppliers')
  } catch (err) {
    console.error('Fetch suppliers error:', err)
  }
}

const fetchProducts = async () => {
  loading.value = true
  try {
    products.value = await $fetch<any[]>('/api/products')
  } catch (err) {
    console.error('Fetch products error:', err)
  } finally {
    loading.value = false
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

const categories = computed(() => {
  const cats = new Set<string>()
  products.value.forEach((p: any) => {
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
  cart.value.push({
    productId: product.id,
    productName: product.parentName || product.productName,
    barcode: product.barcode,
    attribute: product.attribute,
    qty: 1,
    costPrice: product.wholesalePrice || 0,
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
      paymentMethod: paymentMethod.value,
      notes: notes.value,
      createdBy: user.value?.name,
      items: cart.value.map(item => ({
        ...item,
        total: calculateItemTotal(item)
      }))
    }

    await $fetch('/api/intake', {
      method: 'POST',
      body: payload
    })

    toast.success(t('intake.success', 'Məhsul qəbulu uğurla tamamlandı!'))
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
  <div>
    <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">

      <!-- Left Section: Search & Products (same as sales.vue) -->
      <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">

        <!-- Top Action Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 shrink-0">
          <h1 class="text-xl md:text-2xl font-black text-[var(--text-app)] tracking-tight leading-none mb-1">
            {{ t('intake.title', 'Mal Qəbulu') }}
          </h1>

          <div class="flex items-center gap-2">
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

      <!-- Right Section: Sidebar (CartSidebar structure) -->
      <div class="w-full lg:w-[400px] shrink-0 h-full">
        <div class="flex flex-col bg-[var(--input-bg)] rounded-[28px] border border-[var(--border-app)] h-full overflow-hidden">
          
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
                      extra: s.companyName || s.phone
                    }))"
                    placeholder="Tədarükçü axtar..." 
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

            <!-- Payment Method -->
            <div class="relative m-0">
              <UiAutocomplete
                :modelValue="paymentMethod"
                @update:modelValue="(val: any) => { paymentMethod = val }"
                :options="[
                  { label: 'Nəğd', value: 'Nəğd' },
                  { label: 'Bank Kartı', value: 'Bank Kartı' },
                  { label: 'Köçürmə', value: 'Köçürmə' }
                ]"
                placeholder="Ödəniş üsulu seçin..." 
                icon="lucide:wallet" 
                class="!rounded-xl"
                size="sm"
              />
            </div>
          </div>

          <!-- Middle: Cart Items (like CartSidebar items list) -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6">
              <div class="w-16 h-16 rounded-full bg-[var(--border-app)]/20 flex items-center justify-center mb-4">
                <UiIcon name="lucide:shopping-cart" class="w-8 h-8 stroke-[1.5]" />
              </div>
              <p class="font-black text-base tracking-wider mb-1">Səbət boşdur</p>
              <p class="text-[10px] font-bold opacity-60">Məhsul əlavə etmək üçün seçim edin</p>
            </div>

            <TransitionGroup name="cart-list">
              <div 
                v-for="(item, index) in cart" 
                :key="index"
                class="relative bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-3 flex flex-col gap-3 transition-all duration-300 hover:border-[var(--text-primary)]/30 hover:shadow-lg group/item"
              >
                <!-- Top Row: Img, Name, Delete -->
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]/50 flex items-center justify-center shadow-sm">
                    <UiIcon name="lucide:package" class="w-5 h-5 text-[var(--text-app)] opacity-10" />
                  </div>

                  <div class="flex-1 min-w-0 pr-6">
                    <h4 class="font-black text-[12px] text-[var(--text-app)] truncate tracking-tight leading-tight group-hover:text-[var(--text-primary)] transition-colors">
                      {{ item.productName }}
                    </h4>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-[12px] font-black text-[var(--text-app)]/60 tabular-nums">
                        {{ Number(item.costPrice).toFixed(2) }} ₼
                      </span>
                      <span class="text-[9px] font-bold tracking-widest bg-[var(--border-app)] px-1.5 py-0.5 rounded-md opacity-60">X {{ item.qty }}</span>
                    </div>
                  </div>

                  <!-- Delete Button -->
                  <button 
                    @click="removeItem(index)" 
                    class="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-300 text-red-500 hover:text-white hover:bg-red-500 opacity-20 group-hover/item:opacity-100"
                  >
                    <UiIcon name="lucide:trash-2" class="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <!-- Bottom Row: Controls & Total -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <!-- Qty Input -->
                    <div class="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] h-8 px-0.5 transition-all focus-within:border-[var(--text-primary)]/40">
                      <button @click="item.qty = Math.max(1, item.qty - 1)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)]/40 hover:text-red-500 hover:bg-red-500/5 rounded transition-all">
                        <UiIcon name="lucide:minus" class="w-3 h-3" />
                      </button>
                      <input 
                        type="number"
                        v-model="item.qty"
                        class="w-7 text-center text-[12px] font-black bg-transparent border-none p-0 focus:ring-0 tabular-nums no-spinners"
                        min="1"
                      />
                      <button @click="item.qty++" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded transition-all">
                        <UiIcon name="lucide:plus" class="w-3 h-3" />
                      </button>
                    </div>

                    <!-- Cost Price Input -->
                    <div class="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] h-8 px-0.5 transition-all focus-within:border-[var(--text-primary)]/40">
                      <span class="text-[9px] font-black opacity-30 px-1">₼</span>
                      <input 
                        type="number"
                        v-model="item.costPrice"
                        class="w-14 text-center text-[12px] font-black bg-transparent border-none p-0 focus:ring-0 no-spinners"
                      />
                    </div>

                    <!-- Discount Toggle & Input -->
                    <div class="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] h-8 px-0.5 transition-all focus-within:border-[var(--text-primary)]/40">
                      <button 
                        @click="item.discountType = item.discountType === 'amount' ? 'percent' : 'amount'"
                        class="w-6 h-6 flex items-center justify-center font-black rounded transition-all active:scale-90"
                        :class="item.discountType === 'percent' ? 'bg-[var(--text-primary)] text-white shadow-sm' : 'text-[var(--text-app)]/40 hover:text-[var(--text-app)]'"
                      >
                        <span class="text-[11px]">{{ item.discountType === 'percent' ? '%' : '₼' }}</span>
                      </button>
                      <input 
                        type="number"
                        v-model="item.discount"
                        class="bg-transparent border-none text-[12px] w-8 font-black text-center p-0 focus:ring-0 no-spinners"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <!-- Total -->
                  <span class="text-[16px] font-black text-[var(--text-app)] tabular-nums tracking-tighter">
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
                <span class="text-sm">{{ totalQty }} məhsul</span>
                <span class="text-sm font-black text-[var(--text-app)]">{{ subtotal.toFixed(2) }} ₼</span>
              </div>

              <!-- Paid Amount row (like Endirim row in CartSidebar) -->
              <div class="flex items-center justify-between gap-1">
                <span class="text-sm flex-1 font-bold text-[var(--text-app)]">Ödənilən</span>
                
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
                <span class="text-sm font-black text-orange-500 leading-none">Qalıq Borc</span>
                <span class="text-sm font-black text-orange-500 tabular-nums">{{ balanceDue.toFixed(2) }} ₼</span>
              </div>
            </div>

            <div class="border-t border-[var(--border-app)] border-dashed pt-2 flex justify-between items-end px-0.5">
              <div class="flex items-center justify-between flex-1">
                <span class="text-x font-bold text-[var(--text-app)] mb-0">
                  Yekun məbləğ
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
              size="sm" 
              block 
              variant="primary"
              @click="submitIntake" 
              :disabled="cart.length === 0 || !selectedSupplier"
              :loading="saving"
              class="!h-10.5 !rounded-xl !text-[12px] font-black shadow-lg shadow-[var(--text-primary)]/10 transition-all active:scale-[0.98]"
              icon-right="lucide:arrow-right"
            >
              {{ t('intake.complete', 'Qəbulu Tamamla') }}
            </UiButton>
          </div>
        </div>
      </div>

    </div>
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
