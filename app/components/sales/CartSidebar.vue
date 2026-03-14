<script setup lang="ts">
import { computed, ref } from 'vue'
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
  subtotal: number
  finalTotal: number
  customers: any[]
  selectedCustomer: any
  employees: any[]
  selectedEmployee: any
  cashbackAmount: string | number
}>()

const emit = defineEmits<{
  'update:discount': [val: number | string]
  'update:discountType': [val: 'amount' | 'percent']
  'update:selectedCustomer': [val: any]
  'update:selectedEmployee': [val: any]
  'update-item-discount': [item: CartItem, val: number | string]
  'update-item-discount-type': [item: CartItem, val: 'amount' | 'percent']
  'increase': [item: CartItem]
  'decrease': [item: CartItem]
  'update-qty': [item: CartItem, val: number]
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

const getItemDisplayName = (item: CartItem) => {
  const baseName = item.parentName || item.productName
  if (item.attribute && Array.isArray(item.attribute) && item.attribute.length > 0) {
    const attrs = item.attribute.map(attr => {
      const parts = attr.split(':')
      return parts.length > 1 ? parts[1].trim() : attr
    }).join(', ')
    return `${baseName} | ${attrs}`
  }
  return baseName
}
</script>

<template>
  <div class="flex flex-col bg-[var(--input-bg)] rounded-[28px] border border-[var(--border-app)] h-full overflow-hidden">
    <div class="p-4 border-b border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-xl shrink-0 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <!-- Customer Search/Selection -->
        <div class="relative m-0 flex-1">
          <div v-if="selectedCustomer" class="flex items-center gap-2.5 pl-4 p-2 border border-[var(--text-primary)]/10 rounded-xl transition-all hover:bg-[var(--text-primary)]/10">
            <span class="text-xs font-black text-[var(--text-app)] truncate leading-tight">{{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }}</span>
            <span class="text-xs font-bold text-[var(--text-primary)] tabular-nums opacity-80 flex-1">{{ selectedCustomer.bonus || 0 }} ₼</span>
            <button @click="emit('update:selectedCustomer', null)" class="w-6 h-6 flex items-center justify-center hover:bg-red-500/10 rounded-lg transition-all text-red-500/40 hover:text-red-500 group/btn">
              <UiIcon name="lucide:x" class="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
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
                extra: c.phone || c.barcode
              }))"
              placeholder="Müştəri axtar..." 
              icon="lucide:user-search" 
              class="!rounded-xl"
              size="sm"
            />
          </div>       
        </div>

        <div v-if="cart.length > 0"  class="flex items-center gap-1.5 self-center">
            <UiButton 
              v-if="cart.length > 0" 
              variant="outline"
              size="sm"
              class="!w-9 !h-9 !px-0 !rounded-xl text-[var(--text-primary)] border-[var(--text-primary)]/10 hover:bg-[var(--text-primary)]/5 bg-[var(--bg-app)]"
              @click="emit('save-draft')"
            >
              <UiIcon name="lucide:bookmark" class="w-4 h-4" />
            </UiButton>
            <UiButton 
              v-if="cart.length > 0" 
              variant="outline"
              size="sm"
              class="!w-9 !h-9 !px-0 !rounded-xl text-red-500 border-red-500/10 hover:bg-red-500/5 bg-[var(--bg-app)]"
              @click="emit('clear')"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4 !hover:text-red-500" />
            </UiButton>
        </div>
      </div>

      <!-- Employee Search/Selection -->
      <div class="relative m-0">
        <div v-if="selectedEmployee" class="flex items-center gap-2.5 pl-4 p-2 border border-[var(--text-primary)]/10 rounded-xl transition-all hover:bg-[var(--text-primary)]/10 w-full">
          <span class="text-xs font-black text-[var(--text-app)] truncate leading-tight">{{ selectedEmployee.firstName }} {{ selectedEmployee.lastName }}</span>
          <span class="text-[10px] font-bold text-[var(--text-primary)] opacity-50 flex-1 italic">{{ t("sales.cashier", "Kassir") }}</span>
          <button @click="emit('update:selectedEmployee', null)" class="w-6 h-6 flex items-center justify-center hover:bg-red-500/10 rounded-lg transition-all text-red-500/40 hover:text-red-500 group/btn">
            <UiIcon name="lucide:x" class="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
          </button>
        </div>
        
        <div v-else class="relative">
          <UiAutocomplete
            :modelValue="selectedEmployee?.id"
            @update:modelValue="(val: any) => {
              const emp = employees.find(e => e.id === val)
              emit('update:selectedEmployee', emp)
            }"
            :options="employees.map(e => ({
              label: `${e.firstName} ${e.lastName}`,
              value: e.id,
              extra: e.phone || e.position
            }))"
            placeholder="Kassir seçin..." 
            icon="lucide:briefcase" 
            class="!rounded-xl"
            size="sm"
          />
        </div>       
      </div>
    </div>

    <!-- Items List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
      <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6">
        <div class="w-16 h-16 rounded-full bg-[var(--border-app)]/20 flex items-center justify-center mb-4">
          <UiIcon name="lucide:shopping-cart" class="w-8 h-8 stroke-[1.5]" />
        </div>
        <p class="font-black text-base tracking-wider mb-1">{{ t('cart.empty', 'Səbət boşdur') }}</p>
        <p class="text-[10px] font-bold opacity-60">{{ t('cart.emptySubtitle', 'Məhsul əlavə etmək üçün seçim edin') }}</p>
      </div>

      <TransitionGroup name="cart-list">
        <div 
          v-for="item in cart" 
          :key="item.id"
          class="relative bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-3 flex flex-col gap-3 transition-all duration-300 hover:border-[var(--text-primary)]/30 hover:shadow-lg group/item"
        >
          <!-- Top Row: Img, Name, Delete -->
          <div class="flex items-center gap-2.5">
            <!-- Mini Image -->
            <div class="w-10 h-10 rounded-xl bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]/50 flex items-center justify-center shadow-sm">
              <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
              <UiIcon v-else name="lucide:package" class="w-5 h-5 text-[var(--text-app)] opacity-10" />
            </div>

            <div class="flex-1 min-w-0 pr-6">
              <h4 class="font-black text-[12px] text-[var(--text-app)] truncate tracking-tight leading-tight group-hover:text-[var(--text-primary)] transition-colors">
                {{ getItemDisplayName(item) }}
              </h4>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[12px] font-black text-[var(--text-app)]/60 tabular-nums">
                  {{ item.retailPrice.toFixed(2) }} ₼
                </span>
                <span class="text-[9px] font-bold tracking-widest bg-[var(--border-app)] px-1.5 py-0.5 rounded-md opacity-60">X {{ item.qty }}</span>
              </div>
            </div>

            <!-- Delete Button -->
            <button 
              @click="emit('remove', item)" 
              class="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-300 text-red-500 hover:text-white hover:bg-red-500 opacity-20 group-hover/item:opacity-100"
            >
              <UiIcon name="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
          
          <!-- Bottom Row: Controls & Total -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <!-- Qty Input with Buttons -->
              <div class="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] h-8 px-0.5 transition-all focus-within:border-[var(--text-primary)]/40">
                <button @click="emit('decrease', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)]/40 hover:text-red-500 hover:bg-red-500/5 rounded transition-all">
                  <UiIcon name="lucide:minus" class="w-3 h-3" />
                </button>
                <input 
                  type="number"
                  :value="item.qty"
                  @input="(e: any) => emit('update-qty', item, parseInt(e.target.value) || 1)"
                  class="w-7 text-center text-[12px] font-black bg-transparent border-none p-0 focus:ring-0 tabular-nums no-spinners"
                  min="1"
                />
                <button @click="emit('increase', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded transition-all">
                  <UiIcon name="lucide:plus" class="w-3 h-3" />
                </button>
              </div>

              <!-- Discount Toggle & Input -->
              <div class="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] h-8 px-0.5 transition-all focus-within:border-[var(--text-primary)]/40">
                <button 
                  @click="emit('update-item-discount-type', item, item.itemDiscountType === 'amount' ? 'percent' : 'amount')"
                  class="w-6 h-6 flex items-center justify-center font-black rounded transition-all active:scale-90"
                  :class="item.itemDiscountType === 'percent' ? 'bg-[var(--text-primary)] text-white shadow-sm' : 'text-[var(--text-app)]/40 hover:text-[var(--text-app)]'"
                >
                  <span class="text-[11px]">{{ item.itemDiscountType === 'percent' ? '%' : '₼' }}</span>
                </button>
                <input 
                  type="number"
                  :value="item.itemDiscount"
                  @input="(e: any) => emit('update-item-discount', item, e.target.value)"
                  class="bg-transparent border-none text-[12px] w-8 font-black text-center p-0 focus:ring-0 no-spinners"
                  placeholder="0"
                />
              </div>
            </div>

            <!-- Total -->
            <span class="text-[16px] font-black text-[var(--text-app)] tabular-nums tracking-tighter">
              {{ getItemTotal(item).toFixed(2) }} ₼
            </span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Summary & Checkout -->
    <div class="bg-[var(--bg-app)]/80 backdrop-blur-2xl border-t border-[var(--border-app)] p-2.5 space-y-2 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
      <div class="space-y-1.5 px-0.5">
        <div class="flex justify-between items-center text-xs font-bold text-[var(--text-app)]">
          <span class="text-sm">{{ totalQty }} məhsul</span>
          <span class="text-sm font-black text-[var(--text-app)]">{{ subtotal.toFixed(2) }} ₼</span>
        </div>

        <div v-if="selectedCustomer" class="flex justify-between items-center rounded-lg">
          <span class="text-sm font-black text-[var(--text-primary)] leading-none">{{ t('cart.cashbackEarned', 'Qazanılacaq keşbek') }}</span>
          <span class="text-sm font-black text-[var(--text-primary)] tabular-nums">+{{ cashbackAmount }} ₼</span>
        </div>
        
        <!-- Discount Section -->
        <div class="flex items-center justify-between gap-1">
          <span class="text-sm flex-1 font-bold text-[var(--text-app)]">{{ t('cart.discount', 'Endirim') }}</span>
          
          <button 
            @click="setDiscountType(discountType === 'amount' ? 'percent' : 'amount')"
            class="w-6.5 h-6.5 flex items-center justify-center bg-[var(--text-primary)] text-white rounded-lg shadow-md active:scale-90 transition-all font-black text-xs"
          >
            {{ discountType === 'amount' ? '₼' : '%' }}
          </button>

          <div class="relative flex-1 max-w-[60px]">
            <input 
              type="number" 
              :value="discount" 
              @input="(e: any) => handleDiscountInput(e.target.value)"
              placeholder="0"
              class="w-full h-7.5 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl px-3 text-center text-[12px] font-black focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/5 no-spinners transition-all"
            />
          </div>
        </div>
      </div>
      
      <div class="border-t border-[var(--border-app)] border-dashed pt-2 flex justify-between items-end px-0.5">
          <div class="flex items-center justify-between flex-1">
            <span class="text-x font-bold text-[var(--text-app)] mb-0">
              {{ t('cart.toPay', 'Yekun məbləğ') }}
            </span>
            <div class="flex items-baseline gap-1">
              <span class="text-[20px] font-black tabular-nums tracking-tighter text-[var(--text-primary)]">
                {{ finalTotal.toFixed(2) }}
              </span>
              <span class="text-[12px] font-black text-[var(--text-primary)]">₼</span>
            </div>
          </div>
      </div>

      <UiButton 
        size="sm" 
        block 
        variant="primary"
        @click="emit('checkout')" 
        :disabled="cart.length === 0"
        class="!h-10.5 !rounded-xl !text-[12px] font-black shadow-lg shadow-[var(--text-primary)]/10 transition-all active:scale-[0.98]"
        icon-right="lucide:arrow-right"
      >
        {{ t('cart.proceed', 'Ödənişi tamamla') }}
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
</style>
