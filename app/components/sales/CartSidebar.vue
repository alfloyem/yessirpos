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
  images?: string[]
  [key: string]: any
}

const props = defineProps<{
  cart: CartItem[]
  discount: number | string
  subtotal: number
  finalTotal: number
}>()

const emit = defineEmits<{
  (e: 'update:discount', val: number | string): void
  (e: 'increase', item: CartItem): void
  (e: 'decrease', item: CartItem): void
  (e: 'remove', item: CartItem): void
  (e: 'clear'): void
  (e: 'checkout'): void
}>()

const { t } = useI18n()

const totalQty = computed(() => {
  return props.cart.reduce((sum, item) => sum + item.qty, 0)
})

const handleDiscountInput = (e: any) => {
  emit('update:discount', e)
}
</script>

<template>
  <div class="flex flex-col bg-[var(--input-bg)] rounded-[24px] border border-[var(--border-app)] shadow-sm overflow-hidden h-full">
    <!-- Header -->
    <div class="p-4 border-b border-[var(--border-app)] flex justify-between items-center bg-[var(--bg-app)]/40 backdrop-blur-md shrink-0">
      <h2 class="text-base font-bold text-[var(--text-app)] flex items-center gap-2">
        <UiIcon name="lucide:shopping-bag" class="w-4 h-4 text-[var(--text-primary)]" />
        {{ t('cart.title', 'Müştəri Səbəti') }}
      </h2>
      <button 
        v-if="cart.length > 0" 
        @click="emit('clear')"
        class="text-[11px] font-bold text-[var(--color-brand-danger)] hover:underline opacity-80 hover:opacity-100 transition-opacity px-2 py-1"
      >
        {{ t('cart.clear', 'Səbəti Boşalt') }}
      </button>
    </div>

    <!-- Items List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
      <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-30 text-center p-6">
        <UiIcon name="lucide:shopping-cart" class="w-12 h-12 mb-3 stroke-[1.5]" />
        <p class="font-bold text-sm">{{ t('cart.empty', 'Səbət boşdur') }}</p>
        <p class="text-[11px] mt-1">{{ t('cart.emptySubtitle', 'Məhsul əlavə etmək üçün sol tərəfdən seçim edin') }}</p>
      </div>

      <TransitionGroup name="cart-list">
        <div 
          v-for="item in cart" 
          :key="item.id"
          class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl p-2.5 flex gap-3 group relative transition-all hover:border-[var(--text-primary)]/20"
        >
          <!-- Mini Image -->
          <div class="w-12 h-12 rounded-lg bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border-app)]">
            <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
            <UiIcon v-else name="lucide:image" class="w-full h-full p-3 text-[var(--text-app)] opacity-20" />
          </div>
          
          <!-- Details -->
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div class="flex justify-between items-start gap-2">
              <h4 class="font-bold text-[13px] text-[var(--text-app)] leading-tight truncate shrink">{{ item.productName }}</h4>
              <button @click="emit('remove', item)" class="text-[var(--text-app)] opacity-40 hover:text-[var(--color-brand-danger)] hover:opacity-100 transition-all">
                <UiIcon name="lucide:x" class="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div class="flex justify-between items-center mt-1.5">
              <span class="font-black text-[13px] text-[var(--text-app)]">
                {{ (item.retailPrice * item.qty).toFixed(2) }} ₼
              </span>
              
              <!-- Qty Controls - Scaled Consistent -->
              <div class="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border-app)] overflow-hidden">
                <button @click="emit('decrease', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors">
                  <UiIcon name="lucide:minus" class="w-2.5 h-2.5" />
                </button>
                <span class="w-7 text-center text-[11px] font-bold text-[var(--text-app)]">{{ item.qty }}</span>
                <button @click="emit('increase', item)" class="w-6 h-6 flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)]/10 transition-colors">
                  <UiIcon name="lucide:plus" class="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Summary & Checkout -->
    <div class="bg-[var(--bg-app)]/60 border-t border-[var(--border-app)] p-4 space-y-4 shrink-0">
      <div class="space-y-2">
        <div class="flex justify-between text-[13px] font-bold text-[var(--text-app)] opacity-60">
          <span>{{ t('cart.subtotal', 'Alt Toplam') }}:</span>
          <span class="tabular-nums">{{ subtotal.toFixed(2) }} ₼</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-bold text-[var(--text-app)] opacity-60">{{ t('cart.discount', 'Endirim') }} (₼):</span>
          <div class="w-20">
            <UiInput 
              :model-value="discount" 
              @update:model-value="handleDiscountInput"
              type="number" 
              placeholder="0.00" 
              class="!py-1 !text-right font-black !text-[12px] !rounded-lg" 
            />
          </div>
        </div>
      </div>
      
      <div class="border-t border-[var(--border-app)] border-dashed pt-4 flex justify-between items-end">
        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-black tracking-widest text-[var(--text-app)] opacity-40 mb-1">
            {{ t('cart.toPay', 'Yekun Ödəniş') }}
          </span>
          <span class="text-2xl font-black text-[var(--text-primary)] tabular-nums">
            {{ finalTotal.toFixed(2) }} ₼
          </span>
        </div>
        <div class="text-[9px] font-black px-2 py-1 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-md border border-[var(--text-primary)]/10">
          {{ totalQty }} ƏDƏD
        </div>
      </div>

      <UiButton 
        size="lg" 
        block 
        variant="primary" 
        @click="emit('checkout')" 
        :disabled="cart.length === 0"
        class="!rounded-xl !h-12 shadow-lg shadow-[var(--text-primary)]/20 active:scale-[0.98] transition-all"
      >
        <span class="flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide">
          {{ t('cart.proceed', 'Ödənişi Tamamla') }}
          <UiIcon name="lucide:chevron-right" class="w-4 h-4" />
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
