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
}>()

const emit = defineEmits<{
  'update:discount': [val: number | string]
  'update:discountType': [val: 'amount' | 'percent']
  'update:mode': [val: 'sale' | 'refund']
  'update-item-discount': [item: CartItem, val: number | string]
  'update-item-discount-type': [item: CartItem, val: 'amount' | 'percent']
  'increase': [item: CartItem]
  'decrease': [item: CartItem]
  'remove': [item: CartItem]
  'clear': []
  'checkout': []
}>()

const { t } = useI18n()

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
  <div class="flex flex-col bg-[var(--input-bg)] rounded-[24px] border border-[var(--border-app)] shadow-sm overflow-hidden h-full">
    <!-- Header with Mode Toggle -->
    <div class="p-4 border-b border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-md shrink-0">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-base font-bold text-[var(--text-app)] flex items-center gap-2">
          <UiIcon :name="mode === 'sale' ? 'lucide:shopping-bag' : 'lucide:rotate-ccw'" class="w-4 h-4 text-[var(--text-primary)]" />
          {{ mode === 'sale' ? t('cart.title', 'Müştəri Səbəti') : t('cart.refund', 'Geri Ödəniş') }}
        </h2>
        <button 
          v-if="cart.length > 0" 
          @click="emit('clear')"
          class="text-[11px] font-bold text-[var(--color-brand-danger)] hover:underline opacity-80 hover:opacity-100 transition-opacity px-2 py-1"
        >
          {{ t('cart.clear', 'Səbəti Boşalt') }}
        </button>
      </div>

      <!-- Mode Selector -->
      <div class="flex p-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-app)] shadow-inner">
        <button 
          @click="toggleMode('sale')"
          class="flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-2"
          :class="mode === 'sale' ? 'bg-[var(--bg-app)] text-[var(--text-primary)] shadow-sm border border-[var(--border-app)]' : 'text-[var(--text-app)] opacity-60 hover:opacity-100'"
        >
          <UiIcon name="lucide:shopping-cart" class="w-3.5 h-3.5" />
          {{ t('cart.modeSale', 'Satış') }}
        </button>
        <button 
          @click="toggleMode('refund')"
          class="flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-2"
          :class="mode === 'refund' ? 'bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] shadow-sm border border-[var(--color-brand-danger)]/20' : 'text-[var(--text-app)] opacity-60 hover:opacity-100'"
        >
          <UiIcon name="lucide:rotate-ccw" class="w-3.5 h-3.5" />
          {{ t('cart.modeRefund', 'Refund') }}
        </button>
      </div>
    </div>

    <!-- Items List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
      <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6">
        <UiIcon :name="mode === 'sale' ? 'lucide:shopping-cart' : 'lucide:package-x'" class="w-12 h-12 mb-3 stroke-[1.5]" />
        <p class="font-bold text-sm">{{ mode === 'sale' ? t('cart.empty', 'Səbət boşdur') : t('cart.refundEmpty', 'Refund siyahısı boşdur') }}</p>
        <p class="text-[11px] mt-1">{{ t('cart.emptySubtitle', 'Məhsul əlavə etmək üçün sol tərəfdən seçim edin') }}</p>
      </div>

      <TransitionGroup name="cart-list">
        <div 
          v-for="item in cart" 
          :key="item.id"
          class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl p-2.5 flex flex-col gap-2 group relative transition-all hover:border-[var(--text-primary)]/20 shadow-sm"
        >
          <!-- Top Row: Image & Title & Remove -->
          <div class="flex gap-3">
            <!-- Mini Image -->
            <div class="w-12 h-12 rounded-lg bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]">
              <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
              <UiIcon v-else name="lucide:image" class="w-full h-full p-3 text-[var(--text-app)] opacity-20" />
            </div>
            
            <!-- Details -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start gap-2">
                <h4 class="font-bold text-[13px] text-[var(--text-app)] leading-tight truncate shrink">{{ item.productName }}</h4>
                <button @click="emit('remove', item)" class="text-[var(--text-app)] opacity-40 hover:text-[var(--color-brand-danger)] hover:opacity-100 transition-all">
                  <UiIcon name="lucide:x" class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="text-[10px] font-bold text-[var(--text-app)] opacity-40 mt-0.5">
                {{ item.retailPrice }} ₼ / ədəd
              </div>
            </div>
          </div>

          <!-- Bottom Row: Qty & Price & Discount -->
          <div class="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-app)] border-dashed mt-1">
            <!-- Qty Controls -->
            <div class="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border-app)] overflow-hidden shrink-0">
              <button @click="emit('decrease', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors">
                <UiIcon name="lucide:minus" class="w-2.5 h-2.5" />
              </button>
              <span class="w-7 text-center text-[11px] font-bold text-[var(--text-app)]">{{ item.qty }}</span>
              <button @click="emit('increase', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors">
                <UiIcon name="lucide:plus" class="w-2.5 h-2.5" />
              </button>
            </div>

            <!-- Individual Item Discount -->
            <div class="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border-app)] p-0.5 shrink-0">
              <button 
                @click="emit('update-item-discount-type', item, item.itemDiscountType === 'amount' ? 'percent' : 'amount')"
                class="w-5 h-5 flex items-center justify-center text-[9px] font-black rounded hover:bg-[var(--text-primary)]/10 transition-colors"
                :class="item.itemDiscountType === 'percent' ? 'text-[var(--text-primary)]' : 'text-[var(--text-app)] opacity-40'"
              >
                {{ item.itemDiscountType === 'percent' ? '%' : '₼' }}
              </button>
              <input 
                type="number" 
                :value="item.itemDiscount"
                @input="(e: any) => emit('update-item-discount', item, e.target.value)"
                placeholder="0"
                class="w-10 bg-transparent border-none text-[11px] font-black text-right focus:ring-0 p-0 text-[var(--text-app)]"
              />
            </div>

            <!-- Line Total -->
            <div class="flex-1 text-right">
              <span class="font-black text-[13px]" :class="mode === 'sale' ? 'text-[var(--text-app)]' : 'text-[var(--color-brand-danger)]'">
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
          <span>{{ mode === 'sale' ? t('cart.subtotal', 'Alt Toplam') : t('cart.refundSubtotal', 'Refund Alt Toplam') }}:</span>
          <span class="tabular-nums font-black">{{ mode === 'refund' ? '-' : '' }}{{ subtotal.toFixed(2) }} ₼</span>
        </div>
        
        <!-- Discount Section - More Compact & Smart -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] font-bold text-[var(--text-app)] opacity-50">{{ t('cart.discount', 'Endirim') }}:</span>
            <!-- Discount Type Toggle -->
            <div class="flex bg-[var(--input-bg)] border border-[var(--border-app)] rounded-md overflow-hidden p-0.5">
              <button 
                @click="setDiscountType('amount')"
                class="px-1.5 py-0.5 text-[10px] font-black rounded transition-all"
                :class="discountType === 'amount' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
              >
                ₼
              </button>
              <button 
                @click="setDiscountType('percent')"
                class="px-1.5 py-0.5 text-[10px] font-black rounded transition-all"
                :class="discountType === 'percent' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
              >
                %
              </button>
            </div>
          </div>
          
          <div class="w-24">
            <UiInput 
              :model-value="discount" 
              @update:model-value="handleDiscountInput"
              type="number" 
              placeholder="0.00" 
              class="!py-1.5 !text-right font-black !text-[13px] !rounded-xl !bg-[var(--bg-app)]" 
            />
          </div>
        </div>
      </div>
      
      <div class="border-t border-[var(--border-app)] border-dashed pt-3 flex justify-between items-end">
        <div class="flex flex-col">
          <span class="text-[9px] font-black tracking-widest text-[var(--text-app)] opacity-40 mb-1 uppercase">
            {{ mode === 'sale' ? t('cart.toPay', 'Yekun Ödəniş') : t('cart.toRefund', 'Geri Ödəniləcək') }}
          </span>
          <span class="text-2xl font-black tabular-nums transition-colors" :class="mode === 'sale' ? 'text-[var(--text-primary)]' : 'text-[var(--color-brand-danger)]'">
            {{ mode === 'refund' ? '-' : '' }}{{ finalTotal.toFixed(2) }} ₼
          </span>
        </div>
        <div class="text-[9px] font-black px-2 py-1 bg-[var(--text-app)]/5 text-[var(--text-app)] rounded-md border border-[var(--text-app)]/10">
          {{ totalQty }} ƏDƏD
        </div>
      </div>

      <UiButton 
        size="lg" 
        block 
        :variant="mode === 'sale' ? 'primary' : 'danger'"
        @click="emit('checkout')" 
        :disabled="cart.length === 0"
        class="!rounded-xl !h-12 shadow-lg active:scale-[0.98] transition-all"
        :class="mode === 'sale' ? 'shadow-[var(--text-primary)]/20' : 'shadow-[var(--color-brand-danger)]/20'"
      >
        <span class="flex items-center justify-center gap-2 font-bold text-sm tracking-wide">
          {{ mode === 'sale' ? t('cart.proceed', 'Ödənişi Tamamla') : t('cart.refundSubmit', 'Refund Tamamla') }}
          <UiIcon :name="mode === 'sale' ? 'lucide:chevron-right' : 'lucide:rotate-ccw'" class="w-4 h-4" />
        </span>
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
