<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '~/components/ui/Icon.vue'

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
  if (props.product.variants.length > 0) {
    isExpanded.value = !isExpanded.value
  } else {
    // If no variants, add the product itself if it's actionable
    // But usually in this schema, root products without variants act as single products
    emit('add-to-cart', props.product as any)
  }
}

const getVariantName = (variant: ProductVariant) => {
  if (variant.attribute && Array.isArray(variant.attribute) && variant.attribute.length > 0) {
    // attributes are like ["Color: Red", "Size: XL"]
    // we want to show "Red, XL"
    return variant.attribute.map(attr => {
      const parts = attr.split(':')
      return parts.length > 1 ? parts[1].trim() : attr
    }).join(', ')
  }
  return variant.productName
}

const formatPrice = (price: number | string) => {
  return Number(price || 0).toFixed(2)
}
</script>

<template>
  <div 
    class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl group"
    :class="[
      isExpanded ? 'border-[var(--text-primary)] shadow-2xl ring-2 ring-[var(--text-primary)]/10' : 'hover:border-[var(--text-primary)]/40 hover:-translate-y-1'
    ]"
  >
    <!-- Main Product Section - Refined Proportions -->
    <div 
      @click="toggleExpand"
      class="p-3.5 cursor-pointer flex items-center gap-3.5 relative"
    >
      <!-- Image Area - Balanced Size -->
      <div class="w-16 h-16 bg-[var(--text-primary)]/5 rounded-2xl flex items-center justify-center p-1.5 relative overflow-hidden group-hover:bg-[var(--text-primary)]/10 transition-colors shrink-0 border border-[var(--border-app)]/50">
        <img 
          v-if="product.images && product.images.length > 0" 
          :src="product.images[0]" 
          class="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" 
          alt="Product" 
        />
        <UiIcon v-else name="lucide:shirt" class="w-6 h-6 text-[var(--text-app)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
      </div>

      <!-- Info Area -->
      <div class="flex-1 min-w-0 pr-8">
        <h3 class="font-bold text-[var(--text-app)] text-[14px] mb-1 leading-snug line-clamp-2 group-hover:text-[var(--text-primary)] transition-colors tracking-tight">
          {{ product.productName }}
        </h3>
        
        <div class="flex items-center gap-2">
          <span v-if="product.retailPrice" class="text-base font-black text-[var(--text-primary)] tabular-nums">
            {{ formatPrice(product.retailPrice) }} ₼
          </span>
          <span v-if="product.variants.length > 0" class="text-[9px] font-black uppercase tracking-wider bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-2 py-0.5 rounded-[6px] whitespace-nowrap">
            {{ product.variants.length }} Variant
          </span>
        </div>
      </div>

      <!-- Arrow Indicator -->
      <div 
        v-if="product.variants.length > 0"
        class="absolute top-1/2 -translate-y-1/2 right-3.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 border border-[var(--border-app)]/50"
        :class="isExpanded ? 'bg-[var(--text-primary)] text-white rotate-180 border-transparent shadow-lg shadow-[var(--text-primary)]/20' : 'bg-[var(--bg-app)] text-[var(--text-app)] opacity-40'"
      >
        <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5" />
      </div>
    </div>

    <!-- Variants Section -->
    <div 
      v-if="isExpanded && product.variants.length > 0"
      class="border-t border-[var(--border-app)] bg-[var(--bg-app)]/30 backdrop-blur-sm max-h-[350px] overflow-y-auto custom-scrollbar"
    >
      <div class="py-2 px-3 space-y-1">
        <div 
          v-for="variant in product.variants" 
          :key="variant.id"
          @click="emit('add-to-cart', variant)"
          class="p-3 flex items-center gap-4 rounded-xl hover:bg-[var(--text-primary)]/5 cursor-pointer border border-transparent hover:border-[var(--text-primary)]/15 transition-all group/v"
        >
          <!-- Variant Detail -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-bold text-[var(--text-app)] truncate pr-4 group-hover/v:text-[var(--text-primary)] transition-colors">
                {{ getVariantName(variant) }}
              </span>
              <span class="text-base font-black text-[var(--text-primary)] tabular-nums">
                {{ formatPrice(variant.retailPrice) }} ₼
              </span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-[10px] font-mono font-bold text-[var(--text-app)] opacity-40 flex items-center gap-2">
                <UiIcon name="lucide:hash" class="w-3.5 h-3.5" />
                {{ variant.barcode }}
              </span>
              <div 
                class="px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest bg-[var(--text-app)]/5 text-[var(--text-app)] border border-[var(--text-app)]/5"
              >
                <span class="opacity-50">Stok:</span> 
                <span :class="Number(variant.stock || 0) > 5 ? 'text-[var(--text-primary)]' : 'text-[var(--text-app)]'">{{ variant.stock || 0 }}</span>
              </div>
            </div>
          </div>
          
          <!-- Add Button Icon - Proportional -->
          <div class="w-12 h-12 rounded-xl bg-[var(--bg-app)] border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] opacity-70 group-hover/v:bg-[var(--text-primary)] group-hover/v:text-white group-hover/v:border-transparent group-hover/v:opacity-100 transition-all shadow-sm">
            <UiIcon name="lucide:plus" class="w-6 h-6 stroke-[2]" />
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
