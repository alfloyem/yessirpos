<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'

const { t } = useI18n()

interface ProductVariant {
  id: string
  productName: string
  barcode: string
  retailPrice: number | string
  stock: number
  images?: string[]
  [key: string]: any
}

interface ProductGroup {
  id: string
  productName: string
  images?: string[]
  variants: ProductVariant[]
  [key: string]: any
}

const props = defineProps<{
  product: ProductGroup
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', variant: ProductVariant): void
}>()

const isExpanded = ref(false)

const toggleExpand = () => {
  if (props.product.variants && props.product.variants.length > 0) {
    isExpanded.value = !isExpanded.value
  } else {
    // If no variants, add the product itself
    emit('add-to-cart', { 
      ...props.product, 
      parentName: props.product.productName,
      retailPrice: props.product.retailPrice || 0
    } as any)
  }
}

const addVariantToCart = (variant: ProductVariant) => {
  emit('add-to-cart', { ...variant, parentName: props.product.productName })
}

const getVariantName = (variant: ProductVariant) => {
  if (variant.attribute && Array.isArray(variant.attribute) && variant.attribute.length > 0) {
    const attrNames = variant.attribute.map(attr => {
      const parts = attr.split(':')
      return parts.length > 1 ? parts[1].trim() : attr
    }).join(', ')
    return attrNames || variant.productName
  }
  return variant.productName || 'N/A'
}

const formatPrice = (price: number | string) => {
  return Number(price || 0).toFixed(2)
}

const getDiscountedPrice = (p: any) => {
  const price = Number(p.retailPrice || 0)
  if (!p.isSaleActive) return price
  
  const d = Number(p.discountValue || 0)
  if (p.discountType === 'percent') {
    return price * (1 - d / 100)
  }
  return price - d
}
</script>

<template>
  <div 
    class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl overflow-hidden transition-all duration-200 group select-none"
    :class="[
      isExpanded ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/10' : 'hover:border-[var(--text-primary)]/40 shadow-sm hover:shadow-md'
    ]"
  >
    <!-- Main Product Section - Compact & Elegant -->
    <div 
      @click="toggleExpand"
      class="p-2.5 cursor-pointer flex items-center gap-3 relative transition-all duration-150 active:bg-[var(--text-primary)]/5 active:scale-[0.98]"
    >
      <!-- Image - Balanced & Premium -->
      <div class="w-14 h-14 bg-[var(--text-primary)]/5 rounded-[18px] flex items-center justify-center p-1.5 relative overflow-hidden group-hover:bg-[var(--text-primary)]/10 transition-colors shrink-0 border border-[var(--border-app)]/50">
        <img 
          v-if="product.images && product.images.length > 0" 
          :src="product.images[0]" 
          class="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" 
          alt="Product" 
        />
        <UiIcon v-else name="lucide:package" class="w-6 h-6 text-[var(--text-app)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
        
        <!-- Sale Badge -->
        <div v-if="product.isSaleActive" class="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-md shadow-sm z-10 animate-pulse">
          %
        </div>
      </div>

      <!-- Info Area -->
      <div class="flex-1 min-w-0 pr-8">
        <h3 class="font-black text-[var(--text-app)] text-[13px] mb-0.5 leading-tight truncate tracking-tight group-hover:text-[var(--text-primary)] transition-colors">
          {{ product.productName }}
        </h3>
        
        <div class="flex items-center gap-2">
          <div v-if="!product.variants || product.variants.length === 0" class="flex items-center gap-1.5">
            <span v-if="product.isSaleActive" class="text-[10px] line-through opacity-40 font-bold tabular-nums">
              {{ formatPrice(product.retailPrice || 0) }} ₼
            </span>
            <span class="text-sm font-black text-[var(--text-primary)] tabular-nums">
              {{ formatPrice(getDiscountedPrice(product)) }} ₼
            </span>
          </div>
          <span v-else class="text-[9px] font-black tracking-widest bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-2 py-0.5 rounded-lg">
            {{ t('sales.variantCount', { count: product.variants.length }) }}
          </span>
        </div>
      </div>

      <!-- Arrow Indicator - Minimal -->
      <div 
        v-if="product.variants && product.variants.length > 0"
        class="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
        :class="isExpanded ? 'bg-[var(--text-primary)] text-white rotate-180 shadow-lg shadow-[var(--text-primary)]/20' : 'bg-[var(--bg-app)] text-[var(--text-app)] opacity-20 hover:opacity-100'"
      >
        <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5" />
      </div>
    </div>

    <!-- Variants Section - Minimal & Fast -->
    <div 
      v-if="isExpanded && product.variants && product.variants.length > 0"
      class="border-t border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-md max-h-[280px] overflow-y-auto custom-scrollbar"
    >
      <div class="p-1.5 space-y-0.5">
        <div 
          v-for="variant in product.variants" 
          :key="variant.id"
          @click="addVariantToCart(variant)"
          class="p-2 flex items-center gap-3 rounded-xl hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 active:scale-[0.98] cursor-pointer border border-transparent hover:border-[var(--text-primary)]/15 active:border-[var(--text-primary)]/20 transition-all duration-150 group/v select-none"
        >
          <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-[12px] font-black text-[var(--text-app)] group-hover/v:text-[var(--text-primary)] transition-colors line-clamp-2">
                {{ getVariantName(variant) }}
              </span>
              
              <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[var(--bg-app)]/10 border border-[var(--border-app)]/5" :class="Number(variant.stock || 0) > 0 ? 'text-[var(--text-primary)]' : 'text-red-500'">
                <UiIcon name="lucide:package" class="w-3 h-3" />
                <span>{{ variant.stock || 0 }}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-2 shrink-0 flex-wrap">
              <span class="text-[11px] font-mono text-[var(--text-app)] opacity-60">
                {{ variant.barcode || 'N/A' }}
              </span>
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="variant.isSaleActive" class="text-[10px] line-through opacity-30 font-bold tabular-nums">
                  {{ formatPrice(variant.retailPrice || 0) }} ₼
                </span>
                <span class="text-[14px] font-black text-[var(--text-primary)] tabular-nums">
                  {{ formatPrice(getDiscountedPrice(variant)) }} ₼
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
</style>
