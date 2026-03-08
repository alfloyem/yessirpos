<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'

interface CartItem {
  id: string
  productName: string
  retailPrice: number
  qty: number
  itemDiscount: number | string
  itemDiscountType: 'amount' | 'percent'
  images?: string[]
  [key: string]: any
}

const props = defineProps<{
  cart: CartItem[]
  discount: number | string
  discountType: 'amount' | 'percent'
  mode: 'sale' | 'refund'
  subtotal: number
  finalTotal: number
  customers: any[]
  selectedCustomer: any
  cashbackAmount: string | number
}>()

const emit = defineEmits<{
  'update:discount': [val: number | string]
  'update:discountType': [val: 'amount' | 'percent']
  'update:mode': [val: 'sale' | 'refund']
  'update:selectedCustomer': [val: any]
  'update-item-discount': [item: CartItem, val: number | string]
  'update-item-discount-type': [item: CartItem, val: 'amount' | 'percent']
  'increase': [item: CartItem]
  'decrease': [item: CartItem]
  'remove': [item: CartItem]
  'clear': []
  'checkout': []
  'save-draft': []
}>()

const { t } = useI18n()

const customerSearch = ref('')
const showCustomerResults = ref(false)

const filteredCustomers = computed(() => {
  if (!customerSearch.value) return []
  const q = customerSearch.value.toLowerCase()
  return props.customers.filter(c => 
    (c.firstName && c.firstName.toLowerCase().includes(q)) || 
    (c.lastName && c.lastName.toLowerCase().includes(q)) || 
    (c.phone && String(c.phone).includes(q)) ||
    (c.barcode && String(c.barcode).toLowerCase().includes(q))
  ).slice(0, 5)
})

const selectCustomer = (customer: any) => {
  emit('update:selectedCustomer', customer)
  customerSearch.value = ''
  showCustomerResults.value = false
}

const totalQty = computed(() => {
  return props.cart.reduce((sum, item) => sum + item.qty, 0)
})

const handleDiscountInput = (e: any) => {
  emit('update:discount', e)
}

const toggleMode = (newMode: 'sale' | 'refund') => {
  emit('update:mode', newMode)
}

const setDiscountType = (type: 'amount' | 'percent') => {
  emit('update:discountType', type)
}

const getItemTotal = (item: CartItem) => {
  const price = Number(item.retailPrice)
  const d = Number(item.itemDiscount) || 0
  let lineTotal = price
  if (item.itemDiscountType === 'percent') {
    lineTotal = price * (1 - d / 100)
  } else {
    lineTotal = price - d
  }
  return Math.max(0, lineTotal * item.qty)
}
</script>

<template>
  <div class="flex flex-col bg-[var(--input-bg)] rounded-[24px] border border-[var(--border-app)] shadow-sm h-full">
    <!-- Header with Mode Toggle -->
    <div class="p-5 border-b border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-md shrink-0">
      <div class="flex justify-between items-center mb-5">
        <div>
          <h2 class="text-[13px] font-bold text-[var(--text-app)] flex items-center gap-2 mb-0.5">
            <UiIcon :name="mode === 'sale' ? 'lucide:shopping-bag' : 'lucide:rotate-ccw'" class="w-4 h-4 text-[var(--text-primary)]" />
            {{ mode === 'sale' ? t('cart.title', 'Səbət') : t('cart.refund', 'Refund') }}
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <button 
            v-if="cart.length > 0" 
            @click="emit('save-draft')"
            class="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors px-2.5 py-1.5 bg-orange-500/5 rounded-lg border border-orange-500/10"
          >
            Müvəqqəti Saxla
          </button>
          <button 
            v-if="cart.length > 0" 
            @click="emit('clear')"
            class="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors px-2.5 py-1.5 bg-red-500/5 rounded-lg border border-red-500/10"
          >
            {{ t('cart.clear', 'Təmizlə') }}
          </button>
        </div>
      </div>

      <!-- Mode Selector -->
      <div class="flex p-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)]/50 shadow-sm mb-4">
        <button 
          @click="toggleMode('sale')"
          class="flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2"
          :class="mode === 'sale' ? 'bg-[var(--text-primary)] text-white shadow-md shadow-[var(--text-primary)]/20' : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
        >
          <UiIcon name="lucide:shopping-cart" class="w-3.5 h-3.5" />
          {{ t('cart.modeSale', 'Satış') }}
        </button>
        <button 
          @click="toggleMode('refund')"
          class="flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2"
          :class="mode === 'refund' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
        >
          <UiIcon name="lucide:rotate-ccw" class="w-3.5 h-3.5" />
          {{ t('cart.modeRefund', 'Refund') }}
        </button>
      </div>

      <!-- Customer Search/Selection -->
      <div class="relative">
        <div v-if="selectedCustomer" class="flex items-center justify-between p-4 bg-[var(--text-primary)]/[0.03] border border-[var(--text-primary)]/10 rounded-2xl relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-r from-[var(--text-primary)]/[0.02] to-transparent pointer-events-none"></div>
          <div class="flex items-center gap-3.5 overflow-hidden relative z-10">
            <div class="w-10 h-10 rounded-xl bg-[var(--text-primary)]/10 flex items-center justify-center shrink-0 border border-[var(--text-primary)]/10 group-hover:scale-105 transition-transform duration-500">
              <UiIcon name="lucide:user" class="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[13px] font-bold text-[var(--text-app)] truncate leading-tight tracking-tight">{{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[9px] font-bold text-[var(--text-primary)] flex items-center gap-1 bg-[var(--text-primary)]/10 px-1.5 py-0.5 rounded-md">
                  <UiIcon name="lucide:coins" class="w-3 h-3" />
                  {{ selectedCustomer.bonus || 0 }} ₼
                </span>
                <span v-if="selectedCustomer.phone" class="text-[9px] font-medium opacity-30">{{ selectedCustomer.phone }}</span>
              </div>
            </div>
          </div>
          <button @click="emit('update:selectedCustomer', null)" class="relative z-10 w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-xl transition-colors text-[var(--text-app)] opacity-20 hover:opacity-100 group/btn">
            <UiIcon name="lucide:x" class="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
          </button>
        </div>
        
        <div v-else class="relative">
          <UiAutocomplete
            :modelValue="selectedCustomer?.id"
            @update:modelValue="(val: any) => {
              const customer = customers.find(c => c.id === val)
              emit('update:selectedCustomer', customer)
            }"
            :options="customers.map(c => ({
              label: `${c.firstName} ${c.lastName}`,
              value: c.id,
              extra: c.phone ? `${c.phone}${c.barcode ? ' • ' + c.barcode : ''}` : c.barcode
            }))"
            placeholder="Müştəri axtar (...)" 
            icon="lucide:user-search" 
          />
        </div>
      </div>
    </div>

    <!-- Items List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
      <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6 grayscale">
        <UiIcon :name="mode === 'sale' ? 'lucide:shopping-cart' : 'lucide:package-x'" class="w-9 h-9 mb-2 stroke-[1]" />
        <p class="font-bold text-[12px]">{{ mode === 'sale' ? t('cart.empty', 'Səbət boşdur') : t('cart.refundEmpty', 'Refund siyahısı boşdur') }}</p>
        <p class="text-[10px] mt-1 opacity-60">{{ t('cart.emptySubtitle', 'Məhsul əlavə etmək üçün seçim edin') }}</p>
      </div>

      <TransitionGroup name="cart-list">
        <div 
          v-for="item in cart" 
          :key="item.id"
          class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-2 flex flex-col gap-2 group relative transition-all hover:border-[var(--text-primary)]/30 hover:shadow-md"
        >
          <!-- Top Row: Image & Title & Remove -->
          <div class="flex gap-2.5">
            <!-- Mini Image -->
            <div class="w-10 h-10 rounded-xl bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]/50">
              <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
              <UiIcon v-else name="lucide:image" class="w-full h-full p-2.5 text-[var(--text-app)] opacity-10" />
            </div>
            
            <!-- Details -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start gap-2">
                <h4 class="font-bold text-[12px] text-[var(--text-app)] leading-tight truncate shrink tracking-tight">{{ item.productName }}</h4>
                <button @click="emit('remove', item)" class="w-5 h-5 flex items-center justify-center rounded-lg text-[var(--text-app)] opacity-20 hover:text-white hover:bg-red-500 hover:opacity-100 transition-all">
                  <UiIcon name="lucide:x" class="w-3 h-3" />
                </button>
              </div>
              <div class="text-[9px] font-bold text-[var(--text-app)] opacity-30 mt-0.5">
                {{ item.retailPrice }} ₼ / vahid
              </div>
            </div>
          </div>

          <!-- Bottom Row: Qty & Price & Discount -->
          <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--border-app)] border-dashed mt-0.5">
            <!-- Qty Controls -->
            <div class="flex items-center bg-[var(--input-bg)] rounded-xl border border-[var(--border-app)]/50 overflow-hidden shrink-0">
              <button @click="emit('decrease', item)" class="w-7 h-7 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors">
                <UiIcon name="lucide:minus" class="w-2.5 h-2.5" />
              </button>
              <span class="w-8 text-center text-[12px] font-black text-[var(--text-app)] tabular-nums">{{ item.qty }}</span>
              <button @click="emit('increase', item)" class="w-7 h-7 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors relative">
                <UiIcon name="lucide:plus" class="w-2.5 h-2.5" />
              </button>
            </div>

            <!-- Discount -->
            <div class="flex items-center bg-[var(--input-bg)] rounded-xl border border-[var(--border-app)]/50 p-0.5 shrink-0 group/disc">
              <button 
                @click="emit('update-item-discount-type', item, item.itemDiscountType === 'amount' ? 'percent' : 'amount')"
                class="w-6 h-6 flex items-center justify-center text-[9px] font-black rounded-lg transition-all"
                :class="item.itemDiscountType === 'percent' ? 'bg-[var(--text-primary)] text-white shadow-sm' : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
              >
                {{ item.itemDiscountType === 'percent' ? '%' : '₼' }}
              </button>
              <input 
                type="number" 
                :value="item.itemDiscount"
                @input="(e: any) => emit('update-item-discount', item, e.target.value)"
                placeholder="0"
                class="w-10 bg-transparent border-none text-[12px] font-black text-right focus:ring-0 p-0 text-[var(--text-app)] tabular-nums px-1"
              />
            </div>

            <!-- Line Total -->
            <div class="flex-1 text-right">
              <span class="font-black text-[14px] tracking-tight tabular-nums" :class="mode === 'sale' ? 'text-[var(--text-app)]' : 'text-[var(--color-brand-danger)]'">
                <template v-if="mode === 'refund'">-</template>{{ getItemTotal(item).toFixed(2) }} ₼
              </span>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Summary & Checkout -->
    <div class="bg-[var(--bg-app)]/60 border-t border-[var(--border-app)] p-4 pt-3 space-y-3 shrink-0">
      <div class="space-y-1.5">

        <div class="flex justify-between text-[12px] font-bold text-[var(--text-app)] opacity-50">
          <span>{{ totalQty }} ədəd</span>
          <span>{{ subtotal.toFixed(2) }} ₼</span>
        </div>

        <div v-if="selectedCustomer && mode === 'sale'" class="flex justify-between text-[12px] font-bold text-[var(--text-app)] opacity-50">
          <span class="flex items-center gap-1.5">
            {{ t('cart.cashbackEarned', 'Qazanılacaq Keşbek (5%)') }}:
          </span>
          <span class="tabular-nums font-black">+{{ cashbackAmount }} ₼</span>
        </div>
        
        <!-- Discount Section - More Compact & Smart -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] font-bold text-[var(--text-app)] opacity-50">{{ t('cart.discount', 'Endirim') }}:</span>
            <!-- Discount Type Toggle -->
            <button 
              @click="setDiscountType(discountType === 'amount' ? 'percent' : 'amount')"
              class="w-9 h-9 flex items-center justify-center bg-[var(--text-primary)] text-white rounded-xl shadow-sm active:scale-90 transition-all font-black text-[14px]"
            >
              {{ discountType === 'amount' ? '₼' : '%' }}
            </button>
          </div>
          
          <UiInput 
            :model-value="discount" 
            @update:model-value="handleDiscountInput"
            type="number" 
            placeholder="0.00"
            size="sm"
            class="!max-w-24"
          />
        </div>
      </div>
      
      <div class="border-t border-[var(--border-app)] border-dashed pt-3 flex justify-between items-center gap-2">
          <span class="text-sm font-medium text-[var(--text-app)] opacity-40 shrink-0">
            {{ mode === 'sale' ? t('cart.toPay', 'Yekun Ödəniş') : t('cart.toRefund', 'Geri Ödəniləcək') }}:
          </span>
          <span class="text-xl font-black tabular-nums transition-colors whitespace-nowrap" :class="mode === 'sale' ? 'text-[var(--text-primary)]' : 'text-[var(--color-brand-danger)]'">
            {{ mode === 'refund' ? '-' : '' }}{{ finalTotal.toFixed(2) }} ₼
          </span>
      </div>

      <UiButton 
        size="lg" 
        block 
        :variant="mode === 'sale' ? 'primary' : 'danger'"
        @click="emit('checkout')" 
        :disabled="cart.length === 0"
        :icon-right="mode === 'sale' ? 'lucide:chevron-right' : 'lucide:rotate-ccw'"
      >
        {{ mode === 'sale' ? t('cart.proceed', 'Ödənişi tamamla') : t('cart.refundSubmit', 'Refund tamamla') }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
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
</style>
