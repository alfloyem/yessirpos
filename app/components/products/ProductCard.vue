<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#i18n'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiDropdown from '~/components/ui/Dropdown.vue'

const { t } = useI18n()

const props = defineProps<{
  product: any
  selected?: boolean
  selectionMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-select'): void
  (e: 'edit', product: any): void
  (e: 'add-variant', product: any): void
  (e: 'duplicate', product: any): void
  (e: 'print-barcode', product: any): void
  (e: 'delete', product: any): void
  (e: 'quick-view', product: any): void
  (e: 'sale', product: any): void
}>()

const formatPrice = (val: any) => Number(val || 0).toFixed(2)

const hasVariants = computed(() => {
  return props.product.variants && props.product.variants.length > 0
})

const getMinPrice = (variants: any[]) => Math.min(...variants.map(v => Number(v.retailPrice || 0)))
const getMaxPrice = (variants: any[]) => Math.max(...variants.map(v => Number(v.retailPrice || 0)))

const getStockColor = (stock: number, reorderLevel: number) => {
  const s = Number(stock || 0)
  const r = Number(reorderLevel || 0)
  if (s <= 0) return 'text-[var(--color-brand-danger)]'
  if (s <= r) return 'text-[var(--color-brand-warning)]'
  return 'text-[var(--text-app)]'
}

const formatVariantAttr = (attr: any) => {
  if (!attr) return ''
  if (Array.isArray(attr)) return attr.join(', ')
  try {
    const parsed = JSON.parse(attr)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return String(parsed)
  } catch {
    return String(attr)
  }
}
const calculateDiscountedPrice = (originalPrice: number | string, discountValue: number | string, discountType: string, isSaleActive: boolean) => {
  const price = Number(originalPrice) || 0
  if (!isSaleActive) return price
  const val = Number(discountValue) || 0
  if (discountType === 'percent') {
    return price * (1 - val / 100)
  }
  return price - val
}

const hasError = ref(false)
</script>

<template>
  <div 
    class="group relative flex flex-col h-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl transition-colors duration-300 hover:border-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.02] cursor-pointer"
    @click="emit('edit', product)"
  >
    <!-- ── Image ── -->
    <div class="relative w-full aspect-[4/3] bg-[var(--input-bg)] overflow-hidden rounded-t-xl">
      <img 
        v-if="product.images?.length && !hasError" 
        :src="product.images[0]" 
        class="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-90" 
        @error="hasError = true"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-[var(--text-primary)]/[0.02]">
        <UiIcon :name="hasError ? 'lucide:image-off' : 'lucide:image'" class="w-12 h-12 text-[var(--text-app)] opacity-10" stroke-width="1" />
      </div>

      <!-- Sale Badge -->
      <div v-if="product.isSaleActive || product.variants?.some((v: any) => v.isSaleActive)" class="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-lg animate-pulse">
        {{ product.variants?.filter((v: any) => v.isSaleActive).length || '' }} SALE
      </div>



      <!-- Actions (top-right) -->
      <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2" @click.stop>
        <!-- Barcode Print Button -->
        <UiDropdown v-if="hasVariants" :teleport="true" menuClass="w-56 overflow-hidden">
          <template #trigger>
            <button class="w-8 h-8 rounded-md bg-[var(--bg-app)]/90 backdrop-blur-sm border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-app)] hover:border-[var(--text-primary)] transition-colors">
              <UiIcon name="lucide:printer" class="w-4 h-4" />
            </button>
          </template>
          <template #menu="{ close }">
            <div class="flex flex-col">
              <!-- Scrollable content -->
              <div class="overflow-y-auto custom-scrollbar" style="max-height: 300px;">
                <!-- Əsas məhsulun barkodu (əgər varsa) -->
                <button 
                  v-if="product.barcode"
                  @click="emit('print-barcode', { ...product, variants: undefined }); close()" 
                  class="w-full px-4 py-2 text-sm font-semibold text-left hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors border-b border-[var(--border-app)]"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs opacity-50">{{ t('products.mainProduct', 'Əsas Məhsul') }}</span>
                    <span class="font-mono text-xs opacity-70">{{ product.barcode }}</span>
                  </div>
                </button>
                <!-- Variantlar -->
                <button 
                  v-for="variant in product.variants" 
                  :key="variant.id"
                  @click="emit('print-barcode', variant); close()" 
                  class="w-full px-4 py-2 text-sm font-semibold text-left hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs opacity-50">{{ formatVariantAttr(variant.attribute) }}</span>
                    <span class="font-mono text-xs opacity-70">{{ variant.barcode }}</span>
                  </div>
                </button>
              </div>
              
              <!-- Fixed footer -->
              <div class="border-t border-[var(--border-app)] bg-[var(--bg-app)] md:bg-[var(--bg-sidebar)]">
                <button @click="emit('print-barcode', product); close()" class="w-full px-4 py-2.5 text-sm font-semibold text-left flex items-center gap-3 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                  <UiIcon name="lucide:printer" class="w-4 h-4 opacity-50" /> {{ t('common.printAll', 'Hamısını Çap Et') }}
                </button>
              </div>
            </div>
          </template>
        </UiDropdown>
        <button 
          v-else
          @click="emit('print-barcode', product)"
          class="w-8 h-8 rounded-md bg-[var(--bg-app)]/90 backdrop-blur-sm border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-app)] hover:border-[var(--text-primary)] transition-colors"
        >
          <UiIcon name="lucide:printer" class="w-4 h-4" />
        </button>

        <!-- More Actions Menu -->
        <UiDropdown menuClass="absolute top-full right-0 mt-2 w-48 z-[60]">
          <template #trigger>
            <button class="w-8 h-8 rounded-md bg-[var(--bg-app)]/90 backdrop-blur-sm border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-app)] hover:border-[var(--text-primary)] transition-colors">
              <UiIcon name="lucide:more-vertical" class="w-4 h-4" />
            </button>
          </template>
          <template #menu="{ close }">
            <div class="py-1">
              <button @click="emit('duplicate', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                <UiIcon name="lucide:copy" class="w-4 h-4 opacity-50" /> {{ t('common.duplicate') }}
              </button>
              <button @click="emit('sale', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                <UiIcon name="lucide:tag" class="w-4 h-4 opacity-50" /> {{ t('products.sale', 'Endirim') }}
              </button>
              <div class="h-px bg-[var(--border-app)] my-1.5 opacity-50"></div>
              <button @click="emit('delete', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/5 transition-colors">
                <UiIcon name="lucide:trash-2" class="w-4 h-4 opacity-50" /> {{ t('common.delete') }}
              </button>
            </div>
          </template>
        </UiDropdown>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="flex flex-col flex-1 p-4 pt-3 pb-4">
      <div class="grid grid-cols-[1fr_auto] items-end gap-x-4 gap-y-1 mt-auto">
        <!-- Top Left: Category & Brand -->
        <div class="text-xs font-semibold opacity-30 truncate tracking-wide flex items-center gap-1.5 min-w-0">
          <span v-if="product.category?.length">{{ Array.isArray(product.category) ? product.category[0] : product.category }}</span>
          <span v-if="product.brandName">{{ Array.isArray(product.brandName) ? product.brandName[0] : product.brandName }}</span>
        </div>

        <!-- Top Right: Variant Count / Stock Status -->
        <div class="text-xs font-semibold opacity-30 text-right whitespace-nowrap">
          <span v-if="hasVariants" class="text-[var(--text-primary)]">{{ product.variants.length }} variant</span>
          <span v-else :class="getStockColor(product.stock, product.reorderLevel)">
            {{ product.stock || 0 }} {{ t('products.stock') }}
          </span>
        </div>

        <!-- Bottom Left: Title -->
        <h3 
          class="text-sm font-bold text-[var(--text-app)] leading-none truncate group-hover:text-[var(--text-primary)] transition-colors min-w-0" 
          :title="product.productName"
        >
          {{ product.productName }}
        </h3>

        <!-- Bottom Right: Price -->
        <div class="text-base font-bold tabular-nums whitespace-nowrap leading-none text-right">
          <div v-if="!hasVariants" class="flex items-center justify-end gap-1.5">
            <span v-if="product.isSaleActive" class="text-[10px] line-through opacity-30 font-bold">
              {{ formatPrice(product.retailPrice) }}₼
            </span>
            <span :class="product.isSaleActive ? 'text-green-500' : 'text-[var(--text-app)]'">
              {{ formatPrice(calculateDiscountedPrice(product.retailPrice, product.discountValue, product.discountType, product.isSaleActive)) }}<span class="text-xs font-semibold opacity-30">₼</span>
            </span>
          </div>
          <div v-else class="flex items-center justify-end gap-1.5">
            <!-- Original Range (Strikethrough) -->
            <div v-if="product.variants?.some((v: any) => v.isSaleActive)" class="text-[10px] line-through opacity-20 font-bold flex items-baseline gap-0.5">
              <span>{{ formatPrice(getMinPrice(product.variants)) }}</span>
              <span v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)" class="text-[8px] mx-0.5">–</span>
              <span v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)">{{ formatPrice(getMaxPrice(product.variants)) }}</span>
              <span class="text-[8px] opacity-50">₼</span>
            </div>
            <!-- Discounted Range -->
            <div :class="product.variants?.some((v: any) => v.isSaleActive) ? 'text-green-500' : 'text-[var(--text-primary)]'" class="flex items-baseline gap-0.5">
              <span>{{ formatPrice(Math.min(...product.variants.map((v: any) => calculateDiscountedPrice(v.retailPrice, v.discountValue, v.discountType, v.isSaleActive)))) }}</span>
              <span v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)" class="text-xs opacity-20 mx-0.5">–</span>
              <span v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)">{{ formatPrice(Math.max(...product.variants.map((v: any) => calculateDiscountedPrice(v.retailPrice, v.discountValue, v.discountType, v.isSaleActive)))) }}</span>
              <span class="text-xs font-semibold opacity-30">₼</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
